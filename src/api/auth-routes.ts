/**
 * Authentication Routes for Multi-Tenant SaaS.
 */

import { Router, Request, Response } from 'express';
import { tenantStore } from '../services/tenant-store';
import crypto from 'crypto';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export const authRouter = Router();

// Session storage with SQLite persistence and cryptographic verification
export const sessionStore = new Map<string, { userId: string; expiresAt: number }>();

const SESSION_EXPIRY_DAYS = 30; // Keep session stable for at least 30 days
const SESSION_SECRET = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'wcap_saas_secure_session_key_2026';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const sessionDb = new Database(path.join(dataDir, 'saas.db'));
sessionDb.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS revoked_sessions (
        token TEXT PRIMARY KEY,
        revoked_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS password_resets (
        email TEXT PRIMARY KEY,
        token TEXT NOT NULL,
        expires_at INTEGER NOT NULL
    );
`);

export function createSession(userId: string): string {
    const expiresAt = Date.now() + SESSION_EXPIRY_DAYS * 24 * 3600 * 1000;
    const payload = `${userId}:${expiresAt}`;
    const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
    const token = `s_${payload}_${signature}`;

    try {
        sessionDb.prepare('INSERT OR REPLACE INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expiresAt);
    } catch {}
    sessionStore.set(token, { userId, expiresAt });
    return token;
}

export function deleteSession(token: string) {
    sessionStore.delete(token);
    try {
        sessionDb.prepare('DELETE FROM sessions WHERE token = ?').run(token);
        sessionDb.prepare('INSERT OR REPLACE INTO revoked_sessions (token, revoked_at) VALUES (?, ?)').run(token, Date.now());
    } catch {}
}

export async function getSessionUser(req: Request) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return null;

    // Check if explicitly revoked
    try {
        const revoked = sessionDb.prepare('SELECT 1 FROM revoked_sessions WHERE token = ?').get(token);
        if (revoked) return null;
    } catch {}

    let session = sessionStore.get(token);
    if (!session) {
        // 1. Try checking SQLite sessions table
        try {
            const row = sessionDb.prepare('SELECT user_id, expires_at FROM sessions WHERE token = ?').get(token) as any;
            if (row) {
                session = { userId: row.user_id, expiresAt: row.expires_at };
                sessionStore.set(token, session);
            }
        } catch {}
    }

    // 2. If not found in DB/memory (e.g. server reboot or memory purge), verify cryptographically signed token
    if (!session && token.startsWith('s_')) {
        const parts = token.slice(2).split('_');
        if (parts.length === 2) {
            const [payload, sig] = parts;
            const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
            if (sig === expectedSig) {
                const [userId, expiresAtStr] = payload.split(':');
                const expiresAt = parseInt(expiresAtStr, 10);
                if (userId && !isNaN(expiresAt) && Date.now() <= expiresAt) {
                    session = { userId, expiresAt };
                    sessionStore.set(token, session);
                    try {
                        sessionDb.prepare('INSERT OR REPLACE INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expiresAt);
                    } catch {}
                }
            }
        }
    }

    if (!session || Date.now() > session.expiresAt) {
        deleteSession(token);
        return null;
    }

    return await tenantStore.getProfile(session.userId);
}

export async function requireAuth(req: Request, res: Response, next: Function) {
    const user = await getSessionUser(req);
    if (!user) {
        res.status(401).json({ error: 'unauthorized', code: 'SESSION_EXPIRED', message: 'Authentication required' });
        return;
    }
    if (user.is_suspended) {
        res.status(403).json({ error: 'suspended', message: 'Account suspended. Contact support.' });
        return;
    }
    (req as any).user = user;
    next();
}

export function requireAdmin(req: Request, res: Response, next: Function) {
    const user = (req as any).user;
    if (!user || user.role !== 'admin') {
        res.status(403).json({ error: 'forbidden', message: 'Administrator privileges required' });
        return;
    }
    next();
}

// ── ENDPOINTS ────────────────────────────────────────────────────────

authRouter.post('/register', async (req: Request, res: Response) => {
    try {
        const { email, password, full_name } = req.body;
        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }

        const existing = await tenantStore.getUserByEmail(email);
        if (existing) {
            res.status(409).json({ error: 'User with this email already exists' });
            return;
        }

        const user = await tenantStore.createUser(email, password, full_name || email.split('@')[0], 'user', 'free');
        const token = createSession(user.id);

        res.json({ user, token });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Registration failed' });
    }
});

authRouter.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }

        const user = await tenantStore.validateCredentials(email, password);
        if (!user) {
            res.status(401).json({ error: 'Invalid email or password' });
            return;
        }

        if (user.is_suspended) {
            res.status(403).json({ error: 'Account is suspended' });
            return;
        }

        const token = createSession(user.id);

        res.json({ user, token });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Login failed' });
    }
});

authRouter.get('/me', async (req: Request, res: Response) => {
    const user = await getSessionUser(req);
    if (!user) {
        res.status(401).json({ error: 'unauthorized' });
        return;
    }
    res.json({ user });
});

authRouter.post('/logout', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (token) {
        deleteSession(token);
    }
    res.json({ ok: true });
});

authRouter.post('/forgot-password', async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        if (!email || !email.trim()) {
            res.status(400).json({ error: 'Email address is required' });
            return;
        }

        const cleanEmail = email.toLowerCase().trim();
        const user = await tenantStore.getUserByEmail(cleanEmail);

        if (!user) {
            // Generic security response to prevent email enumeration
            res.json({
                ok: true,
                message: 'If an account exists with this email, password reset instructions have been generated.',
            });
            return;
        }

        // Generate a 6-digit numeric verification code
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins expiry

        sessionDb.prepare('INSERT OR REPLACE INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)')
            .run(cleanEmail, resetCode, expiresAt);

        // If Supabase is active, trigger standard Supabase password recovery email
        if (tenantStore.isSupabase && (tenantStore as any).supabase) {
            try {
                await (tenantStore as any).supabase.auth.resetPasswordForEmail(cleanEmail);
            } catch (err: any) {
                console.warn('Supabase resetPasswordForEmail skipped:', err?.message);
            }
        }

        console.log(`[PASSWORD RESET] Code for ${cleanEmail}: ${resetCode}`);

        res.json({
            ok: true,
            message: 'Reset verification code generated! Enter the 6-digit code to set a new password.',
            code: resetCode, // Returned for instant testing & display
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Failed to process password reset request' });
    }
});

authRouter.post('/reset-password', async (req: Request, res: Response) => {
    try {
        const { email, code, new_password } = req.body;
        if (!email || !code || !new_password) {
            res.status(400).json({ error: 'Email, verification code, and new password are required' });
            return;
        }

        if (new_password.length < 6) {
            res.status(400).json({ error: 'Password must be at least 6 characters long' });
            return;
        }

        const cleanEmail = email.toLowerCase().trim();
        const cleanCode = code.toString().trim();

        const record = sessionDb.prepare('SELECT token, expires_at FROM password_resets WHERE email = ?').get(cleanEmail) as any;
        if (!record || record.token !== cleanCode) {
            res.status(400).json({ error: 'Invalid or expired verification code' });
            return;
        }

        if (Date.now() > record.expires_at) {
            sessionDb.prepare('DELETE FROM password_resets WHERE email = ?').run(cleanEmail);
            res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
            return;
        }

        // Apply new password to database
        await tenantStore.updateUserPasswordByEmail(cleanEmail, new_password);

        // Invalidate used reset code
        sessionDb.prepare('DELETE FROM password_resets WHERE email = ?').run(cleanEmail);

        res.json({
            ok: true,
            message: 'Your password has been reset successfully! You can now sign in with your new password.',
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Failed to reset password' });
    }
});

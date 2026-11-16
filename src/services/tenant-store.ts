/**
 * Multi-Tenant Data Store for WP Content Autopilot SaaS.
 * 
 * Supports both:
 * 1. Supabase PostgreSQL (Production / Cloud Mode)
 * 2. SQLite (Local fallback mode)
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../logger';
import { PLANS } from '../config/subscription-plans';
import { extractSiteBranding, interpolatePromptWithSite } from './site-branding';

export interface UserProfile {
    id: string;
    email: string;
    full_name: string;
    role: 'user' | 'admin';
    subscription_tier: 'free' | 'starter' | 'pro' | 'agency' | 'custom';
    subscription_status: 'active' | 'expired' | 'pending_approval' | 'canceled';
    monthly_quota: number;
    used_this_month: number;
    quota_resets_at: string;
    is_suspended: boolean;
    created_at: string;
}

export interface UserSettings {
    id: string;
    user_id: string;
    wp_base_url: string;
    wp_api_user: string;
    wp_app_password_encrypted: string;
    ai_provider: 'gemini' | 'openai';
    ai_api_key_encrypted: string;
    publish_posture: 'always_draft' | 'auto_publish';
    daily_quota: number;
    cron_schedule: string;
    cron_timezone: string;
    is_automation_enabled: boolean;
    last_run_at: string | null;
}

export interface KeywordRecord {
    id: string;
    user_id: string;
    row_order: number;
    keyword: string;
    content_type: string;
    blogpost_subtype: string | null;
    review_subtype: string | null;
    cluster: string;
    funnel_stage: 'TOFU' | 'MOFU' | 'BOFU' | null;
    local_modifier: string | null;
    class_hint: string;
    priority: number;
    status: 'planned' | 'in_progress' | 'published' | 'drafted' | 'failed' | 'paused';
    notes: string | null;
    phase: number | null;
    planned_month: number | null;
    planned_week: string | null;
    canonical_category: string | null;
    suggested_tags: string | null;
    cannibalization_group: string | null;
    local_data_required: 'YES' | 'NO' | null;
    pass_risk: 'HIGH' | 'MED' | 'LOW' | null;
    wp_post_id: number | null;
    published_url: string | null;
    last_error: string | null;
    created_at: string;
    updated_at?: string;
    executed_at?: string;
}

export interface UserPromptRecord {
    id: string;
    user_id: string;
    stage_key: string;
    system_prompt: string;
    user_prompt: string;
    is_customized: boolean;
    updated_at: string;
}

export interface PaymentRecord {
    id: string;
    user_id: string;
    user_email?: string;
    gateway: 'payu' | 'usdt_crypto' | 'manual_admin';
    tier_requested: string;
    amount: number;
    currency: string;
    status: 'pending' | 'completed' | 'failed' | 'rejected';
    payu_txnid?: string;
    payu_mihpayid?: string;
    crypto_network?: string;
    crypto_tx_hash?: string;
    crypto_wallet_sent_from?: string;
    admin_verification_notes?: string;
    created_at: string;
    verified_at?: string;
}

export interface PipelineRunRecord {
    id: string;
    user_id: string;
    keyword_id: string | null;
    keyword_text: string;
    status: 'success' | 'published' | 'drafted' | 'failed' | 'cost_blocked';
    wp_post_id: number | null;
    wp_post_url: string | null;
    duration_seconds: number;
    fail_reasons: string | null;
    created_at: string;
}

export class TenantStore {
    public isSupabase: boolean = false;
    private supabase: SupabaseClient | null = null;
    private supabaseAnon: SupabaseClient | null = null;
    private sqliteDb: Database.Database | null = null;

    constructor() {
        // Ensure WebSocket is defined for @supabase/supabase-js realtime initialization on Node < 22
        if (typeof (globalThis as any).WebSocket === 'undefined') {
            class MockWebSocket {
                static readonly CONNECTING = 0;
                static readonly OPEN = 1;
                static readonly CLOSING = 2;
                static readonly CLOSED = 3;
                readonly readyState = 3;
                send() {}
                close() {}
                addEventListener() {}
                removeEventListener() {}
            }
            (globalThis as any).WebSocket = MockWebSocket;
        }

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseKey) {
            this.isSupabase = true;
            this.supabase = createClient(supabaseUrl, supabaseKey, {
                auth: { autoRefreshToken: false, persistSession: false },
            });
            if (process.env.SUPABASE_ANON_KEY) {
                this.supabaseAnon = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY);
            }
            logger.info('TenantStore: Initialized in Supabase Cloud mode', { host: new URL(supabaseUrl).host });
        } else {
            logger.info('TenantStore: Initialized in SQLite Local mode');
        }

        // Always init SQLite as fallback/cache
        const dataDir = path.resolve(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        const dbPath = path.join(dataDir, 'saas.db');
        this.sqliteDb = new Database(dbPath);
        this.initSqliteSchema();
    }

    private initSqliteSchema() {
        if (!this.sqliteDb) return;
        this.sqliteDb.exec(`
            CREATE TABLE IF NOT EXISTS users_auth (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS profiles (
                id TEXT PRIMARY KEY REFERENCES users_auth(id) ON DELETE CASCADE,
                email TEXT UNIQUE NOT NULL,
                full_name TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                subscription_tier TEXT NOT NULL DEFAULT 'free',
                subscription_status TEXT NOT NULL DEFAULT 'active',
                monthly_quota INTEGER NOT NULL DEFAULT 3,
                used_this_month INTEGER NOT NULL DEFAULT 0,
                quota_resets_at TEXT NOT NULL,
                is_suspended INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS user_settings (
                id TEXT PRIMARY KEY,
                user_id TEXT UNIQUE NOT NULL,
                wp_base_url TEXT DEFAULT '',
                wp_api_user TEXT DEFAULT '',
                wp_app_password_encrypted TEXT DEFAULT '',
                ai_provider TEXT NOT NULL DEFAULT 'gemini',
                ai_api_key_encrypted TEXT DEFAULT '',
                publish_posture TEXT NOT NULL DEFAULT 'always_draft',
                daily_quota INTEGER NOT NULL DEFAULT 1,
                cron_schedule TEXT NOT NULL DEFAULT '0 6 * * *',
                cron_timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
                is_automation_enabled INTEGER NOT NULL DEFAULT 0,
                last_run_at TEXT,
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS keywords (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                row_order INTEGER DEFAULT 1,
                keyword TEXT NOT NULL,
                content_type TEXT NOT NULL DEFAULT 'BlogPost',
                blogpost_subtype TEXT,
                review_subtype TEXT,
                cluster TEXT DEFAULT '',
                funnel_stage TEXT,
                local_modifier TEXT,
                class_hint TEXT DEFAULT 'B',
                priority INTEGER DEFAULT 1,
                status TEXT NOT NULL DEFAULT 'planned',
                notes TEXT,
                phase INTEGER,
                planned_month INTEGER,
                planned_week TEXT,
                canonical_category TEXT,
                suggested_tags TEXT,
                cannibalization_group TEXT,
                local_data_required TEXT,
                pass_risk TEXT,
                wp_post_id INTEGER,
                published_url TEXT,
                last_error TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS user_prompts (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                stage_key TEXT NOT NULL,
                system_prompt TEXT NOT NULL,
                user_prompt TEXT NOT NULL,
                is_customized INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                UNIQUE(user_id, stage_key)
            );

            CREATE TABLE IF NOT EXISTS global_prompt_templates (
                id TEXT PRIMARY KEY,
                template_name TEXT NOT NULL,
                stage_key TEXT NOT NULL,
                system_prompt TEXT NOT NULL,
                user_prompt TEXT NOT NULL,
                is_default INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                UNIQUE(template_name, stage_key)
            );

            CREATE TABLE IF NOT EXISTS payment_records (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                gateway TEXT NOT NULL,
                tier_requested TEXT NOT NULL,
                amount REAL NOT NULL,
                currency TEXT NOT NULL DEFAULT 'INR',
                status TEXT NOT NULL DEFAULT 'pending',
                payu_txnid TEXT UNIQUE,
                payu_mihpayid TEXT,
                crypto_network TEXT DEFAULT 'TRC20',
                crypto_tx_hash TEXT UNIQUE,
                crypto_wallet_sent_from TEXT,
                admin_verification_notes TEXT,
                verified_by_admin TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                verified_at TEXT
            );

            CREATE TABLE IF NOT EXISTS pipeline_runs (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                keyword_id TEXT,
                keyword_text TEXT NOT NULL,
                status TEXT NOT NULL,
                wp_post_id INTEGER,
                wp_post_url TEXT,
                duration_seconds INTEGER DEFAULT 0,
                fail_reasons TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
        `);

        // Migration: Ensure all rich SEO keyword columns exist in SQLite keywords table
        try {
            const existingCols = (this.sqliteDb.prepare('PRAGMA table_info(keywords)').all() as any[]).map((c) => c.name);
            const colSet = new Set(existingCols);
            const colsToAdd: Array<{ name: string; type: string }> = [
                { name: 'blogpost_subtype', type: 'TEXT' },
                { name: 'review_subtype', type: 'TEXT' },
                { name: 'funnel_stage', type: 'TEXT' },
                { name: 'local_modifier', type: 'TEXT' },
                { name: 'phase', type: 'INTEGER' },
                { name: 'planned_month', type: 'INTEGER' },
                { name: 'planned_week', type: 'TEXT' },
                { name: 'canonical_category', type: 'TEXT' },
                { name: 'suggested_tags', type: 'TEXT' },
                { name: 'cannibalization_group', type: 'TEXT' },
                { name: 'local_data_required', type: 'TEXT' },
                { name: 'pass_risk', type: 'TEXT' },
            ];
            for (const col of colsToAdd) {
                if (!colSet.has(col.name)) {
                    try {
                        this.sqliteDb.exec(`ALTER TABLE keywords ADD COLUMN ${col.name} ${col.type}`);
                    } catch {
                        // ignore column already exists
                    }
                }
            }
        } catch (migErr) {
            logger.warn('TenantStore: Keywords column migration check skipped or failed', { error: String(migErr) });
        }

        // Seed default templates in SQLite if empty
        const tmplCount = (this.sqliteDb.prepare('SELECT count(*) as count FROM global_prompt_templates').get() as any).count;
        if (tmplCount === 0) {
            const defaultTemplates = [
                { stage_key: 'stage2_research', system: 'Research Agent', user: 'Research ${keyword}' },
                { stage_key: 'stage3_draft', system: 'Writer Agent', user: 'Write ${keyword}' },
                { stage_key: 'stage3_final_edit', system: 'Final Edit Agent', user: 'Polish ${draft}' },
                { stage_key: 'stage_final_html', system: 'HTML Composer', user: 'Convert to HTML' },
                { stage_key: 'stage4_image', system: 'Image Generator', user: 'Thumbnail ${title}' },
            ];
            const insertStmt = this.sqliteDb.prepare(`
                INSERT INTO global_prompt_templates (id, template_name, stage_key, system_prompt, user_prompt, is_default)
                VALUES (?, 'Default SEO Blog', ?, ?, ?, 1)
            `);
            for (const t of defaultTemplates) {
                insertStmt.run(uuid(), t.stage_key, t.system, t.user);
            }
        }
    }

    // ── AUTH & USER METHODS ──────────────────────────────────────────

    async createUser(
        email: string,
        passwordPlain: string,
        fullName: string,
        role: 'user' | 'admin' = 'user',
        tier: 'free' | 'starter' | 'pro' | 'agency' = 'free'
    ): Promise<UserProfile> {
        const cleanEmail = email.toLowerCase().trim();
        const quota = tier === 'agency' ? 300 : tier === 'pro' ? 100 : tier === 'starter' ? 30 : 3;
        const resetDate = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

        if (this.isSupabase && this.supabase) {
            // 1. Create in Supabase Auth
            let authUserId: string;
            const { data: authData, error: authError } = await this.supabase.auth.admin.createUser({
                email: cleanEmail,
                password: passwordPlain,
                email_confirm: true,
                user_metadata: { full_name: fullName, role },
            });

            if (authError) {
                // If user already exists in auth, get ID
                if (authError.message.toLowerCase().includes('already')) {
                    const existing = await this.getUserByEmail(cleanEmail);
                    if (existing) return existing;
                }
                throw new Error(`Supabase Auth error: ${authError.message}`);
            }

            authUserId = authData.user.id;

            // 2. Ensure Profile exists in Supabase
            const { data: profile, error: profError } = await this.supabase
                .from('profiles')
                .upsert({
                    id: authUserId,
                    email: cleanEmail,
                    full_name: fullName,
                    role,
                    subscription_tier: tier,
                    subscription_status: 'active',
                    monthly_quota: quota,
                    used_this_month: 0,
                    quota_resets_at: resetDate,
                })
                .select()
                .single();

            if (profError) {
                throw new Error(`Failed to save profile in Supabase: ${profError.message}`);
            }

            // 3. Ensure User Settings exist
            await this.supabase.from('user_settings').upsert({
                user_id: authUserId,
                wp_base_url: '',
                wp_api_user: '',
                publish_posture: 'always_draft',
                daily_quota: 1,
            });

            // 4. Seed user prompts from global templates
            const { data: templates } = await this.supabase
                .from('global_prompt_templates')
                .select('*')
                .eq('is_default', true);

            if (templates && templates.length > 0) {
                const promptsToInsert = templates.map((t) => ({
                    user_id: authUserId,
                    stage_key: t.stage_key,
                    system_prompt: t.system_prompt,
                    user_prompt: t.user_prompt,
                    is_customized: false,
                }));
                await this.supabase.from('user_prompts').upsert(promptsToInsert, { onConflict: 'user_id,stage_key' });
            }

            return profile as UserProfile;
        }

        // SQLite Local fallback
        const id = uuid();
        const salt = crypto.randomBytes(16).toString('hex');
        const passwordHash = crypto.createHmac('sha256', salt).update(passwordPlain).digest('hex');

        this.sqliteDb!.transaction(() => {
            this.sqliteDb!.prepare('INSERT INTO users_auth (id, email, password_hash, salt) VALUES (?, ?, ?, ?)').run(
                id,
                cleanEmail,
                passwordHash,
                salt
            );
            this.sqliteDb!.prepare(`
                INSERT INTO profiles (id, email, full_name, role, subscription_tier, monthly_quota, used_this_month, quota_resets_at)
                VALUES (?, ?, ?, ?, ?, ?, 0, ?)
            `).run(id, cleanEmail, fullName, role, tier, quota, resetDate);
            this.sqliteDb!.prepare('INSERT INTO user_settings (id, user_id) VALUES (?, ?)').run(uuid(), id);

            // Copy templates to user_prompts
            const templates = this.sqliteDb!.prepare('SELECT stage_key, system_prompt, user_prompt FROM global_prompt_templates WHERE is_default = 1').all() as any[];
            const insertPrompt = this.sqliteDb!.prepare(`
                INSERT INTO user_prompts (id, user_id, stage_key, system_prompt, user_prompt, is_customized)
                VALUES (?, ?, ?, ?, ?, 0)
            `);
            for (const t of templates) {
                insertPrompt.run(uuid(), id, t.stage_key, t.system_prompt, t.user_prompt);
            }
        })();

        return (await this.getProfile(id))!;
    }

    async validateCredentials(email: string, passwordPlain: string): Promise<UserProfile | null> {
        const cleanEmail = email.toLowerCase().trim();

        if (this.isSupabase && (this.supabaseAnon || this.supabase)) {
            const client = this.supabaseAnon || this.supabase!;
            const { data, error } = await client.auth.signInWithPassword({
                email: cleanEmail,
                password: passwordPlain,
            });

            if (error || !data.user) {
                logger.warn('Supabase login failed', { email: cleanEmail, error: error?.message });
                return null;
            }

            return await this.getProfile(data.user.id);
        }

        // SQLite fallback
        const user = this.sqliteDb!
            .prepare('SELECT id, password_hash, salt FROM users_auth WHERE email = ?')
            .get(cleanEmail) as any;
        if (!user) return null;

        const calculated = crypto.createHmac('sha256', user.salt).update(passwordPlain).digest('hex');
        if (calculated !== user.password_hash) return null;

        return await this.getProfile(user.id);
    }

    async getUserByEmail(email: string): Promise<UserProfile | null> {
        const cleanEmail = email.toLowerCase().trim();
        if (this.isSupabase && this.supabase) {
            const { data } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('email', cleanEmail)
                .maybeSingle();
            return data ? (data as UserProfile) : null;
        }

        const row = this.sqliteDb!
            .prepare('SELECT * FROM profiles WHERE email = ?')
            .get(cleanEmail) as any;
        return row ? { ...row, is_suspended: Boolean(row.is_suspended) } : null;
    }

    async updateUserPasswordByEmail(email: string, newPasswordPlain: string): Promise<void> {
        const cleanEmail = email.toLowerCase().trim();
        if (this.isSupabase && this.supabase) {
            const user = await this.getUserByEmail(cleanEmail);
            if (user) {
                await this.supabase.auth.admin.updateUserById(user.id, { password: newPasswordPlain });
            }
            return;
        }

        const salt = crypto.randomBytes(16).toString('hex');
        const passwordHash = crypto.createHmac('sha256', salt).update(newPasswordPlain).digest('hex');
        this.sqliteDb!
            .prepare('UPDATE users_auth SET password_hash = ?, salt = ? WHERE email = ?')
            .run(passwordHash, salt, cleanEmail);
    }

    async getProfile(id: string): Promise<UserProfile | null> {
        if (this.isSupabase && this.supabase) {
            const { data } = await this.supabase.from('profiles').select('*').eq('id', id).maybeSingle();
            return data ? (data as UserProfile) : null;
        }

        const row = this.sqliteDb!.prepare('SELECT * FROM profiles WHERE id = ?').get(id) as any;
        return row ? { ...row, is_suspended: Boolean(row.is_suspended) } : null;
    }

    async getAllProfiles(): Promise<UserProfile[]> {
        if (this.isSupabase && this.supabase) {
            const { data } = await this.supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });
            return (data || []) as UserProfile[];
        }

        const rows = this.sqliteDb!
            .prepare('SELECT * FROM profiles ORDER BY created_at DESC')
            .all() as any[];
        return rows.map((r) => ({ ...r, is_suspended: Boolean(r.is_suspended) }));
    }

    async updateProfileTier(userId: string, tier: string, quota: number): Promise<void> {
        if (this.isSupabase && this.supabase) {
            await this.supabase
                .from('profiles')
                .update({ subscription_tier: tier, monthly_quota: quota, subscription_status: 'active' })
                .eq('id', userId);
            return;
        }

        this.sqliteDb!
            .prepare(
                `UPDATE profiles SET subscription_tier = ?, monthly_quota = ?, subscription_status = 'active', updated_at = datetime('now') WHERE id = ?`
            )
            .run(tier, quota, userId);
    }

    async setUserSuspended(userId: string, isSuspended: boolean): Promise<void> {
        if (this.isSupabase && this.supabase) {
            await this.supabase.from('profiles').update({ is_suspended: isSuspended }).eq('id', userId);
            return;
        }

        this.sqliteDb!
            .prepare(`UPDATE profiles SET is_suspended = ?, updated_at = datetime('now') WHERE id = ?`)
            .run(isSuspended ? 1 : 0, userId);
    }

    // ── USER SETTINGS ───────────────────────────────────────────────

    async getUserSettings(userId: string): Promise<UserSettings> {
        if (this.isSupabase && this.supabase) {
            const { data } = await this.supabase
                .from('user_settings')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();
            if (data) return data as UserSettings;

            // Create default settings if absent
            const { data: created } = await this.supabase
                .from('user_settings')
                .insert({ user_id: userId, wp_base_url: '', wp_api_user: '', publish_posture: 'always_draft', daily_quota: 1 })
                .select()
                .single();
            return created as UserSettings;
        }

        let settings = this.sqliteDb!
            .prepare('SELECT * FROM user_settings WHERE user_id = ?')
            .get(userId) as any;
        if (!settings) {
            const id = uuid();
            this.sqliteDb!.prepare('INSERT INTO user_settings (id, user_id) VALUES (?, ?)').run(id, userId);
            settings = this.sqliteDb!.prepare('SELECT * FROM user_settings WHERE id = ?').get(id) as any;
        }
        return { ...settings, is_automation_enabled: Boolean(settings.is_automation_enabled) };
    }

    // ─────────────────────────────────────────────────────────────────

    async updateUserSettings(userId: string, data: Partial<UserSettings> & Record<string, any>): Promise<void> {
        // Build clean sanitized payload with only valid schema columns
        const cleanPayload: Record<string, any> = {};
        
        if (data.wp_base_url !== undefined) cleanPayload.wp_base_url = String(data.wp_base_url).trim();
        if (data.wp_api_user !== undefined) cleanPayload.wp_api_user = String(data.wp_api_user).trim();
        
        const rawWpPass = data.wp_app_password_encrypted ?? data.wp_app_password;
        if (rawWpPass !== undefined && String(rawWpPass).trim().length > 0) {
            cleanPayload.wp_app_password_encrypted = String(rawWpPass).trim();
        }

        if (data.ai_provider !== undefined) cleanPayload.ai_provider = data.ai_provider;
        
        const rawAiKey = data.ai_api_key_encrypted ?? data.ai_api_key;
        if (rawAiKey !== undefined && String(rawAiKey).trim().length > 0) {
            cleanPayload.ai_api_key_encrypted = String(rawAiKey).trim();
        }

        if (data.publish_posture !== undefined) cleanPayload.publish_posture = data.publish_posture;
        if (data.daily_quota !== undefined) cleanPayload.daily_quota = Math.max(1, Number(data.daily_quota) || 1);
        if (data.cron_schedule !== undefined) cleanPayload.cron_schedule = String(data.cron_schedule).trim();
        if (data.cron_timezone !== undefined) cleanPayload.cron_timezone = String(data.cron_timezone).trim();
        if (data.is_automation_enabled !== undefined) cleanPayload.is_automation_enabled = Boolean(data.is_automation_enabled);
        if (data.last_run_at !== undefined) cleanPayload.last_run_at = data.last_run_at;

        if (this.isSupabase && this.supabase) {
            cleanPayload.user_id = userId;
            cleanPayload.updated_at = new Date().toISOString();

            const { error } = await this.supabase
                .from('user_settings')
                .upsert(cleanPayload, { onConflict: 'user_id' });

            if (error) {
                logger.error('updateUserSettings failed in Supabase', { userId, error: error.message });
                throw new Error(`Failed to update settings in Supabase: ${error.message}`);
            }
            return;
        }

        const current = await this.getUserSettings(userId);
        const updated = { ...current, ...cleanPayload };

        this.sqliteDb!
            .prepare(`
            UPDATE user_settings 
            SET wp_base_url = ?, wp_api_user = ?, wp_app_password_encrypted = ?, 
                ai_provider = ?, ai_api_key_encrypted = ?, publish_posture = ?, 
                daily_quota = ?, cron_schedule = ?, cron_timezone = ?, 
                is_automation_enabled = ?, last_run_at = ?, updated_at = datetime('now')
            WHERE user_id = ?
        `)
            .run(
                updated.wp_base_url,
                updated.wp_api_user,
                updated.wp_app_password_encrypted,
                updated.ai_provider,
                updated.ai_api_key_encrypted,
                updated.publish_posture,
                updated.daily_quota,
                updated.cron_schedule,
                updated.cron_timezone,
                updated.is_automation_enabled ? 1 : 0,
                updated.last_run_at ?? null,
                userId
            );
    }

    async getActiveAutomatedUserSettings(): Promise<Array<{ settings: UserSettings; profile: UserProfile }>> {
        if (this.isSupabase && this.supabase) {
            const { data: settingsList } = await this.supabase
                .from('user_settings')
                .select('*')
                .eq('is_automation_enabled', true);

            if (!settingsList || settingsList.length === 0) return [];

            const results: Array<{ settings: UserSettings; profile: UserProfile }> = [];
            for (const s of settingsList) {
                const { data: profile } = await this.supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', s.user_id)
                    .single();
                if (profile && !profile.is_suspended) {
                    results.push({
                        settings: s as UserSettings,
                        profile: profile as UserProfile,
                    });
                }
            }
            return results;
        }

        const rows = this.sqliteDb!
            .prepare(`
                SELECT 
                    s.id as s_id, s.user_id as s_user_id, s.wp_base_url, s.wp_api_user, s.wp_app_password_encrypted,
                    s.ai_provider, s.ai_api_key_encrypted, s.publish_posture, s.daily_quota, s.cron_schedule,
                    s.cron_timezone, s.is_automation_enabled, s.last_run_at,
                    p.id as p_id, p.email, p.full_name, p.role, p.subscription_tier, p.subscription_status,
                    p.monthly_quota, p.used_this_month, p.quota_resets_at, p.is_suspended, p.created_at as p_created_at
                FROM user_settings s
                JOIN profiles p ON s.user_id = p.id
                WHERE s.is_automation_enabled = 1 AND p.is_suspended = 0
            `)
            .all() as any[];

        return rows.map((r) => ({
            settings: {
                id: r.s_id,
                user_id: r.s_user_id,
                wp_base_url: r.wp_base_url || '',
                wp_api_user: r.wp_api_user || '',
                wp_app_password_encrypted: r.wp_app_password_encrypted || '',
                ai_provider: r.ai_provider || 'gemini',
                ai_api_key_encrypted: r.ai_api_key_encrypted || '',
                publish_posture: r.publish_posture || 'always_draft',
                daily_quota: r.daily_quota || 1,
                cron_schedule: r.cron_schedule || '0 6 * * *',
                cron_timezone: r.cron_timezone || 'Asia/Kolkata',
                is_automation_enabled: Boolean(r.is_automation_enabled),
                last_run_at: r.last_run_at || null,
            },
            profile: {
                id: r.p_id,
                email: r.email,
                full_name: r.full_name,
                role: r.role,
                subscription_tier: r.subscription_tier,
                subscription_status: r.subscription_status,
                monthly_quota: r.monthly_quota,
                used_this_month: r.used_this_month,
                quota_resets_at: r.quota_resets_at,
                is_suspended: Boolean(r.is_suspended),
                created_at: r.p_created_at,
            },
        }));
    }

    // ── KEYWORD OPERATIONS ──────────────────────────────────────────

    async getKeywords(
        userId: string,
        options: { status?: string; search?: string; cluster?: string; funnel_stage?: string; limit?: number; offset?: number } = {}
    ): Promise<{ items: KeywordRecord[]; total: number }> {
        if (this.isSupabase && this.supabase) {
            let query = this.supabase
                .from('keywords')
                .select('*', { count: 'exact' })
                .eq('user_id', userId);

            if (options.status && options.status !== 'all') {
                query = query.eq('status', options.status);
            }
            if (options.cluster && options.cluster !== 'all') {
                query = query.eq('cluster', options.cluster);
            }
            if (options.funnel_stage && options.funnel_stage !== 'all') {
                query = query.eq('funnel_stage', options.funnel_stage);
            }
            if (options.search) {
                query = query.ilike('keyword', `%${options.search}%`);
            }

            query = query
                .order('priority', { ascending: true })
                .order('row_order', { ascending: true })
                .order('created_at', { ascending: false });

            if (options.limit) {
                const from = options.offset || 0;
                query = query.range(from, from + options.limit - 1);
            }

            const { data, count, error } = await query;
            if (error) throw new Error(error.message);
            return { items: (data || []) as KeywordRecord[], total: count || 0 };
        }

        // SQLite fallback
        let sql = 'SELECT * FROM keywords WHERE user_id = ?';
        let countSql = 'SELECT count(*) as count FROM keywords WHERE user_id = ?';
        const params: any[] = [userId];
        const countParams: any[] = [userId];

        if (options.status && options.status !== 'all') {
            sql += ' AND status = ?';
            countSql += ' AND status = ?';
            params.push(options.status);
            countParams.push(options.status);
        }

        if (options.cluster && options.cluster !== 'all') {
            sql += ' AND cluster = ?';
            countSql += ' AND cluster = ?';
            params.push(options.cluster);
            countParams.push(options.cluster);
        }

        if (options.funnel_stage && options.funnel_stage !== 'all') {
            sql += ' AND funnel_stage = ?';
            countSql += ' AND funnel_stage = ?';
            params.push(options.funnel_stage);
            countParams.push(options.funnel_stage);
        }

        if (options.search) {
            sql += ' AND (keyword LIKE ? OR cluster LIKE ? OR notes LIKE ? OR suggested_tags LIKE ? OR cannibalization_group LIKE ?)';
            countSql += ' AND (keyword LIKE ? OR cluster LIKE ? OR notes LIKE ? OR suggested_tags LIKE ? OR cannibalization_group LIKE ?)';
            const term = `%${options.search}%`;
            params.push(term, term, term, term, term);
            countParams.push(term, term, term, term, term);
        }

        sql += ' ORDER BY priority ASC, row_order ASC, created_at DESC';
        const total = (this.sqliteDb!.prepare(countSql).get(...countParams) as any).count;

        if (options.limit) {
            sql += ' LIMIT ? OFFSET ?';
            params.push(options.limit, options.offset || 0);
        }

        const items = this.sqliteDb!.prepare(sql).all(...params) as KeywordRecord[];
        return { items, total };
    }

    async addKeyword(userId: string, item: Partial<KeywordRecord>): Promise<KeywordRecord> {
        const rowOrder = item.row_order !== undefined && item.row_order !== null ? Number(item.row_order) : 1;
        const priority = item.priority !== undefined && item.priority !== null ? Number(item.priority) : 1;
        const phase = item.phase !== undefined && item.phase !== null ? Number(item.phase) : null;
        const plannedMonth = item.planned_month !== undefined && item.planned_month !== null ? Number(item.planned_month) : null;

        if (this.isSupabase && this.supabase) {
            const fullPayload: Record<string, any> = {
                user_id: userId,
                row_order: rowOrder,
                keyword: item.keyword?.trim() || '',
                content_type: item.content_type || 'BlogPost',
                blogpost_subtype: item.blogpost_subtype || null,
                review_subtype: item.review_subtype || null,
                cluster: item.cluster || '',
                funnel_stage: item.funnel_stage || null,
                local_modifier: item.local_modifier || null,
                class_hint: item.class_hint || 'B',
                priority: priority,
                notes: item.notes || null,
                phase: phase,
                planned_month: plannedMonth,
                planned_week: item.planned_week || null,
                canonical_category: item.canonical_category || null,
                suggested_tags: item.suggested_tags || null,
                cannibalization_group: item.cannibalization_group || null,
                local_data_required: item.local_data_required || null,
                pass_risk: item.pass_risk || null,
                status: item.status || 'planned',
            };

            const { data, error } = await this.supabase
                .from('keywords')
                .insert(fullPayload)
                .select()
                .single();

            if (!error && data) {
                return data as KeywordRecord;
            }

            // Fallback for Supabase if remote schema cache is missing the new columns
            if (error && (error.message.includes('schema cache') || error.message.includes('Could not find the'))) {
                logger.warn('addKeyword: Supabase schema cache missing new columns — retrying with baseline columns', {
                    error: error.message,
                });

                const baselinePayload = {
                    user_id: userId,
                    row_order: rowOrder,
                    keyword: item.keyword?.trim() || '',
                    content_type: item.content_type || 'BlogPost',
                    blogpost_subtype: item.blogpost_subtype || null,
                    cluster: item.cluster || '',
                    class_hint: item.class_hint || 'B',
                    priority: priority,
                    notes: item.notes || null,
                    suggested_tags: item.suggested_tags || null,
                    canonical_category: item.canonical_category || null,
                    status: item.status || 'planned',
                };

                const { data: retryData, error: retryError } = await this.supabase
                    .from('keywords')
                    .insert(baselinePayload)
                    .select()
                    .single();

                if (retryError) throw new Error(retryError.message);
                return {
                    ...retryData,
                    ...fullPayload,
                } as KeywordRecord;
            }

            if (error) throw new Error(error.message);
            return data as KeywordRecord;
        }

        const id = uuid();
        this.sqliteDb!
            .prepare(`
            INSERT INTO keywords (
                id, user_id, row_order, keyword, content_type, blogpost_subtype, review_subtype,
                cluster, funnel_stage, local_modifier, class_hint, priority, notes, phase,
                planned_month, planned_week, canonical_category, suggested_tags,
                cannibalization_group, local_data_required, pass_risk, status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
            .run(
                id,
                userId,
                rowOrder,
                item.keyword?.trim() || '',
                item.content_type || 'BlogPost',
                item.blogpost_subtype || null,
                item.review_subtype || null,
                item.cluster || '',
                item.funnel_stage || null,
                item.local_modifier || null,
                item.class_hint || 'B',
                priority,
                item.notes || null,
                phase,
                plannedMonth,
                item.planned_week || null,
                item.canonical_category || null,
                item.suggested_tags || null,
                item.cannibalization_group || null,
                item.local_data_required || null,
                item.pass_risk || null,
                item.status || 'planned'
            );

        return this.sqliteDb!.prepare('SELECT * FROM keywords WHERE id = ?').get(id) as KeywordRecord;
    }

    async bulkAddKeywords(userId: string, keywords: Array<Partial<KeywordRecord>>): Promise<number> {
        if (this.isSupabase && this.supabase) {
            const rows = keywords
                .filter((k) => k.keyword && k.keyword.trim())
                .map((k, index) => ({
                    user_id: userId,
                    row_order: k.row_order !== undefined && k.row_order !== null ? Number(k.row_order) : index + 1,
                    keyword: k.keyword!.trim(),
                    content_type: k.content_type || 'BlogPost',
                    blogpost_subtype: k.blogpost_subtype || null,
                    review_subtype: k.review_subtype || null,
                    cluster: k.cluster || '',
                    funnel_stage: k.funnel_stage || null,
                    local_modifier: k.local_modifier || null,
                    class_hint: k.class_hint || 'B',
                    priority: k.priority !== undefined && k.priority !== null ? Number(k.priority) : 1,
                    notes: k.notes || null,
                    phase: k.phase !== undefined && k.phase !== null ? Number(k.phase) : null,
                    planned_month: k.planned_month !== undefined && k.planned_month !== null ? Number(k.planned_month) : null,
                    planned_week: k.planned_week || null,
                    canonical_category: k.canonical_category || null,
                    suggested_tags: k.suggested_tags || null,
                    cannibalization_group: k.cannibalization_group || null,
                    local_data_required: k.local_data_required || null,
                    pass_risk: k.pass_risk || null,
                    status: k.status || 'planned',
                }));

            const { data, error } = await this.supabase.from('keywords').insert(rows).select('id');
            if (!error) return data?.length || 0;

            // Fallback for missing schema columns in Supabase
            if (error && (error.message.includes('schema cache') || error.message.includes('Could not find the'))) {
                logger.warn('bulkAddKeywords: Supabase schema cache missing new columns — retrying with baseline columns');
                const baselineRows = rows.map((r) => ({
                    user_id: r.user_id,
                    row_order: r.row_order,
                    keyword: r.keyword,
                    content_type: r.content_type,
                    blogpost_subtype: r.blogpost_subtype,
                    cluster: r.cluster,
                    class_hint: r.class_hint,
                    priority: r.priority,
                    notes: r.notes,
                    suggested_tags: r.suggested_tags,
                    canonical_category: r.canonical_category,
                    status: r.status,
                }));
                const { data: retryData, error: retryError } = await this.supabase.from('keywords').insert(baselineRows).select('id');
                if (retryError) throw new Error(retryError.message);
                return retryData?.length || 0;
            }

            throw new Error(error.message);
        }

        const insertStmt = this.sqliteDb!.prepare(`
            INSERT INTO keywords (
                id, user_id, row_order, keyword, content_type, blogpost_subtype, review_subtype,
                cluster, funnel_stage, local_modifier, class_hint, priority, notes, phase,
                planned_month, planned_week, canonical_category, suggested_tags,
                cannibalization_group, local_data_required, pass_risk, status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        let count = 0;
        this.sqliteDb!.transaction(() => {
            for (const item of keywords) {
                if (!item.keyword || !item.keyword.trim()) continue;
                insertStmt.run(
                    uuid(),
                    userId,
                    item.row_order !== undefined && item.row_order !== null ? Number(item.row_order) : count + 1,
                    item.keyword.trim(),
                    item.content_type || 'BlogPost',
                    item.blogpost_subtype || null,
                    item.review_subtype || null,
                    item.cluster || '',
                    item.funnel_stage || null,
                    item.local_modifier || null,
                    item.class_hint || 'B',
                    item.priority !== undefined && item.priority !== null ? Number(item.priority) : 1,
                    item.notes || null,
                    item.phase !== undefined && item.phase !== null ? Number(item.phase) : null,
                    item.planned_month !== undefined && item.planned_month !== null ? Number(item.planned_month) : null,
                    item.planned_week || null,
                    item.canonical_category || null,
                    item.suggested_tags || null,
                    item.cannibalization_group || null,
                    item.local_data_required || null,
                    item.pass_risk || null,
                    item.status || 'planned'
                );
                count++;
            }
        })();
        return count;
    }

    async updateKeyword(id: string, userId: string, fields: Partial<KeywordRecord>): Promise<void> {
        const updatePayload: Record<string, any> = {
            ...fields,
            updated_at: (fields as any).updated_at || new Date().toISOString(),
        };

        if (this.isSupabase && this.supabase) {
            const { error } = await this.supabase.from('keywords').update(updatePayload).eq('id', id).eq('user_id', userId);
            if (!error) return;

            if (error && (error.message.includes('schema cache') || error.message.includes('Could not find the'))) {
                // Strip missing columns and retry with baseline fields
                const baselineKeys = ['keyword', 'content_type', 'blogpost_subtype', 'cluster', 'class_hint', 'priority', 'status', 'notes', 'suggested_tags', 'canonical_category', 'wp_post_id', 'published_url', 'last_error', 'updated_at'];
                const filtered: Record<string, any> = {};
                for (const [k, v] of Object.entries(updatePayload)) {
                    if (baselineKeys.includes(k)) filtered[k] = v;
                }
                const { error: retryError } = await this.supabase.from('keywords').update(filtered).eq('id', id).eq('user_id', userId);
                if (retryError) throw new Error(retryError.message);
                return;
            }

            throw new Error(error.message);
        }

        const allowedColumns = [
            'row_order', 'keyword', 'content_type', 'blogpost_subtype', 'review_subtype',
            'cluster', 'funnel_stage', 'local_modifier', 'class_hint', 'priority', 'status',
            'notes', 'phase', 'planned_month', 'planned_week', 'canonical_category',
            'suggested_tags', 'cannibalization_group', 'local_data_required', 'pass_risk',
            'wp_post_id', 'published_url', 'last_error', 'updated_at'
        ];

        const sets: string[] = [];
        const params: any[] = [];
        for (const [key, val] of Object.entries(updatePayload)) {
            if (allowedColumns.includes(key)) {
                sets.push(`${key} = ?`);
                params.push(val);
            }
        }
        if (sets.length === 0) return;
        sets.push("updated_at = datetime('now')");
        params.push(id, userId);

        this.sqliteDb!.prepare(`UPDATE keywords SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);
    }

    async deleteKeyword(id: string, userId: string): Promise<void> {
        if (this.isSupabase && this.supabase) {
            await this.supabase.from('keywords').delete().eq('id', id).eq('user_id', userId);
            return;
        }
        this.sqliteDb!.prepare('DELETE FROM keywords WHERE id = ? AND user_id = ?').run(id, userId);
    }

    // ── PROMPT STUDIO ───────────────────────────────────────────────

    async getUserPrompts(userId: string): Promise<UserPromptRecord[]> {
        if (this.isSupabase && this.supabase) {
            const { data } = await this.supabase
                .from('user_prompts')
                .select('*')
                .eq('user_id', userId)
                .order('stage_key', { ascending: true });
            return (data || []) as UserPromptRecord[];
        }

        const rows = this.sqliteDb!
            .prepare('SELECT * FROM user_prompts WHERE user_id = ? ORDER BY stage_key ASC')
            .all(userId) as any[];
        return rows.map((r) => ({ ...r, is_customized: Boolean(r.is_customized) }));
    }

    async getUserCustomPromptsMap(userId: string): Promise<Record<string, { system?: string; user?: string }>> {
        const userPrompts = await this.getUserPrompts(userId);
        const settings = await this.getUserSettings(userId);
        const branding = extractSiteBranding(settings?.wp_base_url);

        const promptMap: Record<string, { system?: string; user?: string }> = {};
        for (const p of userPrompts) {
            if (p.is_customized && p.system_prompt && p.system_prompt.trim().length > 0) {
                promptMap[p.stage_key] = {
                    system: interpolatePromptWithSite(p.system_prompt, branding),
                    user: p.user_prompt ? interpolatePromptWithSite(p.user_prompt, branding) : undefined,
                };
            }
        }
        return promptMap;
    }

    async updateUserPrompt(userId: string, stageKey: string, systemPrompt: string, userPrompt: string): Promise<void> {
        if (this.isSupabase && this.supabase) {
            await this.supabase
                .from('user_prompts')
                .update({ system_prompt: systemPrompt, user_prompt: userPrompt, is_customized: true })
                .eq('user_id', userId)
                .eq('stage_key', stageKey);
            return;
        }

        this.sqliteDb!
            .prepare(`
            UPDATE user_prompts 
            SET system_prompt = ?, user_prompt = ?, is_customized = 1, updated_at = datetime('now')
            WHERE user_id = ? AND stage_key = ?
        `)
            .run(systemPrompt, userPrompt, userId, stageKey);
    }

    async resetUserPromptToDefault(userId: string, stageKey: string): Promise<void> {
        if (this.isSupabase && this.supabase) {
            const { data: tmpl } = await this.supabase
                .from('global_prompt_templates')
                .select('system_prompt, user_prompt')
                .eq('stage_key', stageKey)
                .eq('is_default', true)
                .single();
            if (tmpl) {
                await this.supabase
                    .from('user_prompts')
                    .update({ system_prompt: tmpl.system_prompt, user_prompt: tmpl.user_prompt, is_customized: false })
                    .eq('user_id', userId)
                    .eq('stage_key', stageKey);
            }
            return;
        }

        const tmpl = this.sqliteDb!
            .prepare('SELECT system_prompt, user_prompt FROM global_prompt_templates WHERE stage_key = ? AND is_default = 1')
            .get(stageKey) as any;
        if (!tmpl) return;

        this.sqliteDb!
            .prepare(`
            UPDATE user_prompts 
            SET system_prompt = ?, user_prompt = ?, is_customized = 0, updated_at = datetime('now')
            WHERE user_id = ? AND stage_key = ?
        `)
            .run(tmpl.system_prompt, tmpl.user_prompt, userId, stageKey);
    }

    async getGlobalTemplates(): Promise<any[]> {
        if (this.isSupabase && this.supabase) {
            const { data } = await this.supabase.from('global_prompt_templates').select('*').order('stage_key');
            return data || [];
        }
        return this.sqliteDb!.prepare('SELECT * FROM global_prompt_templates ORDER BY stage_key ASC').all();
    }

    // ── BILLING & PAYMENTS ──────────────────────────────────────────

    async createPayment(data: {
        userId: string;
        gateway: 'payu' | 'usdt_crypto' | 'manual_admin';
        tier: string;
        amount: number;
        currency: string;
        payuTxnId?: string;
        cryptoNetwork?: string;
        cryptoTxHash?: string;
        cryptoWallet?: string;
    }): Promise<PaymentRecord> {
        if (this.isSupabase && this.supabase) {
            const { data: record, error } = await this.supabase
                .from('payment_records')
                .insert({
                    user_id: data.userId,
                    gateway: data.gateway,
                    tier_requested: data.tier,
                    amount: data.amount,
                    currency: data.currency,
                    status: 'pending',
                    payu_txnid: data.payuTxnId || null,
                    crypto_network: data.cryptoNetwork || 'TRC20',
                    crypto_tx_hash: data.cryptoTxHash || null,
                    crypto_wallet_sent_from: data.cryptoWallet || null,
                })
                .select()
                .single();

            if (error) throw new Error(error.message);
            return record as PaymentRecord;
        }

        const id = uuid();
        this.sqliteDb!
            .prepare(`
            INSERT INTO payment_records (id, user_id, gateway, tier_requested, amount, currency, status, payu_txnid, crypto_network, crypto_tx_hash, crypto_wallet_sent_from)
            VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
        `)
            .run(
                id,
                data.userId,
                data.gateway,
                data.tier,
                data.amount,
                data.currency,
                data.payuTxnId || null,
                data.cryptoNetwork || null,
                data.cryptoTxHash || null,
                data.cryptoWallet || null
            );

        return this.sqliteDb!.prepare('SELECT * FROM payment_records WHERE id = ?').get(id) as PaymentRecord;
    }

    async getUserPayments(userId: string): Promise<PaymentRecord[]> {
        if (this.isSupabase && this.supabase) {
            const { data } = await this.supabase
                .from('payment_records')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            return (data || []) as PaymentRecord[];
        }
        return this.sqliteDb!
            .prepare('SELECT * FROM payment_records WHERE user_id = ? ORDER BY created_at DESC')
            .all(userId) as PaymentRecord[];
    }

    async getPendingCryptoPayments(): Promise<PaymentRecord[]> {
        if (this.isSupabase && this.supabase) {
            // First attempt join with explicit relationship disambiguation
            const { data, error } = await this.supabase
                .from('payment_records')
                .select('*, profiles!payment_records_user_id_fkey(email)')
                .eq('gateway', 'usdt_crypto')
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (!error && data) {
                return data.map((p: any) => ({
                    ...p,
                    user_email: Array.isArray(p.profiles) ? p.profiles[0]?.email : p.profiles?.email,
                })) as PaymentRecord[];
            }

            // Fallback: fetch pending records, then query profiles for emails
            logger.warn('Supabase join failed, falling back to separate query', { error: error?.message });
            const fallback = await this.supabase
                .from('payment_records')
                .select('*')
                .eq('gateway', 'usdt_crypto')
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            const payments = (fallback.data || []) as PaymentRecord[];
            if (payments.length > 0) {
                const userIds = Array.from(new Set(payments.map((p) => p.user_id)));
                const { data: profs } = await this.supabase
                    .from('profiles')
                    .select('id, email')
                    .in('id', userIds);
                const emailMap = new Map((profs || []).map((pr: any) => [pr.id, pr.email]));
                return payments.map((p) => ({
                    ...p,
                    user_email: emailMap.get(p.user_id) || undefined,
                }));
            }
            return [];
        }

        return this.sqliteDb!
            .prepare(`
            SELECT p.*, u.email as user_email 
            FROM payment_records p
            LEFT JOIN profiles u ON p.user_id = u.id
            WHERE p.gateway = 'usdt_crypto' AND p.status = 'pending'
            ORDER BY p.created_at DESC
        `)
            .all() as PaymentRecord[];
    }

    async approveCryptoPayment(paymentId: string, adminUserId: string, notes: string = ''): Promise<void> {
        let payment: PaymentRecord;
        if (this.isSupabase && this.supabase) {
            const { data } = await this.supabase.from('payment_records').select('*').eq('id', paymentId).single();
            if (!data) throw new Error('Payment not found');
            payment = data as PaymentRecord;

            const plan = PLANS.find((p) => p.id === payment.tier_requested);
            const quota = plan ? plan.monthlyQuota : (payment.tier_requested === 'agency' ? 300 : payment.tier_requested === 'pro' ? 100 : 30);

            await this.supabase
                .from('payment_records')
                .update({ status: 'completed', verified_at: new Date().toISOString(), admin_verification_notes: notes, verified_by_admin: adminUserId })
                .eq('id', paymentId);

            const resetDate = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
            await this.supabase
                .from('profiles')
                .update({ subscription_tier: payment.tier_requested, subscription_status: 'active', monthly_quota: quota, used_this_month: 0, quota_resets_at: resetDate })
                .eq('id', payment.user_id);
            return;
        }

        payment = this.sqliteDb!.prepare('SELECT * FROM payment_records WHERE id = ?').get(paymentId) as PaymentRecord;
        if (!payment) throw new Error('Payment not found');
        const plan = PLANS.find((p) => p.id === payment.tier_requested);
        const quota = plan ? plan.monthlyQuota : (payment.tier_requested === 'agency' ? 300 : payment.tier_requested === 'pro' ? 100 : 30);
        const resetDate = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

        this.sqliteDb!.transaction(() => {
            this.sqliteDb!.prepare(`UPDATE payment_records SET status = 'completed', verified_at = datetime('now'), admin_verification_notes = ?, verified_by_admin = ? WHERE id = ?`).run(notes, adminUserId, paymentId);
            this.sqliteDb!.prepare(`UPDATE profiles SET subscription_tier = ?, subscription_status = 'active', monthly_quota = ?, used_this_month = 0, quota_resets_at = ?, updated_at = datetime('now') WHERE id = ?`).run(payment.tier_requested, quota, resetDate, payment.user_id);
        })();
    }

    async rejectCryptoPayment(paymentId: string, adminUserId: string, notes: string = ''): Promise<void> {
        if (this.isSupabase && this.supabase) {
            await this.supabase
                .from('payment_records')
                .update({ status: 'rejected', verified_at: new Date().toISOString(), admin_verification_notes: notes, verified_by_admin: adminUserId })
                .eq('id', paymentId);
            return;
        }

        this.sqliteDb!.prepare(`UPDATE payment_records SET status = 'rejected', verified_at = datetime('now'), admin_verification_notes = ?, verified_by_admin = ? WHERE id = ?`).run(notes, adminUserId, paymentId);
    }

    async completePayUPayment(txnid: string, mihpayid: string): Promise<void> {
        let payment: PaymentRecord;
        if (this.isSupabase && this.supabase) {
            const { data, error } = await this.supabase.from('payment_records').select('*').eq('payu_txnid', txnid).maybeSingle();
            if (!data) {
                logger.error('completePayUPayment: payment not found for txnid in Supabase', { txnid, error: error?.message });
                return;
            }
            payment = data as PaymentRecord;
            const plan = PLANS.find((p) => p.id === payment.tier_requested);
            const quota = plan ? plan.monthlyQuota : (payment.tier_requested === 'agency' ? 300 : payment.tier_requested === 'pro' ? 100 : 30);

            await this.supabase
                .from('payment_records')
                .update({ status: 'completed', payu_mihpayid: mihpayid, verified_at: new Date().toISOString() })
                .eq('id', payment.id);

            const resetDate = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
            await this.supabase
                .from('profiles')
                .update({ subscription_tier: payment.tier_requested, subscription_status: 'active', monthly_quota: quota, used_this_month: 0, quota_resets_at: resetDate })
                .eq('id', payment.user_id);

            logger.info('completePayUPayment: verified and upgraded user', { userId: payment.user_id, tier: payment.tier_requested, quota });
            return;
        }

        payment = this.sqliteDb!.prepare('SELECT * FROM payment_records WHERE payu_txnid = ?').get(txnid) as PaymentRecord;
        if (!payment) {
            logger.error('completePayUPayment: payment not found for txnid in SQLite', { txnid });
            return;
        }
        const plan = PLANS.find((p) => p.id === payment.tier_requested);
        const quota = plan ? plan.monthlyQuota : (payment.tier_requested === 'agency' ? 300 : payment.tier_requested === 'pro' ? 100 : 30);
        const resetDate = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

        this.sqliteDb!.transaction(() => {
            this.sqliteDb!.prepare(`UPDATE payment_records SET status = 'completed', payu_mihpayid = ?, verified_at = datetime('now') WHERE id = ?`).run(mihpayid, payment.id);
            this.sqliteDb!.prepare(`UPDATE profiles SET subscription_tier = ?, subscription_status = 'active', monthly_quota = ?, used_this_month = 0, quota_resets_at = ?, updated_at = datetime('now') WHERE id = ?`).run(payment.tier_requested, quota, resetDate, payment.user_id);
        })();
        logger.info('completePayUPayment: verified and upgraded user in SQLite', { userId: payment.user_id, tier: payment.tier_requested, quota });
    }

    // ── PIPELINE RUNS ───────────────────────────────────────────────

    async recordPipelineRun(data: {
        userId: string;
        keywordId: string | null;
        keywordText: string;
        status: 'success' | 'failed' | 'cost_blocked';
        wpPostId: number | null;
        wpPostUrl: string | null;
        durationSeconds: number;
        failReasons: string | null;
    }): Promise<void> {
        if (this.isSupabase && this.supabase) {
            await this.supabase.from('pipeline_runs').insert({
                user_id: data.userId,
                keyword_id: data.keywordId,
                keyword_text: data.keywordText,
                status: data.status,
                wp_post_id: data.wpPostId,
                wp_post_url: data.wpPostUrl,
                duration_seconds: data.durationSeconds,
                fail_reasons: data.failReasons,
            });

            if (data.status === 'success') {
                const { data: user } = await this.supabase.from('profiles').select('used_this_month').eq('id', data.userId).single();
                if (user) {
                    await this.supabase.from('profiles').update({ used_this_month: (user.used_this_month || 0) + 1 }).eq('id', data.userId);
                }
            }
            return;
        }

        const id = uuid();
        this.sqliteDb!
            .prepare(`
            INSERT INTO pipeline_runs (id, user_id, keyword_id, keyword_text, status, wp_post_id, wp_post_url, duration_seconds, fail_reasons)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
            .run(id, data.userId, data.keywordId, data.keywordText, data.status, data.wpPostId, data.wpPostUrl, data.durationSeconds, data.failReasons);

        if (data.status === 'success') {
            this.sqliteDb!.prepare('UPDATE profiles SET used_this_month = used_this_month + 1 WHERE id = ?').run(data.userId);
        }
    }

    async getUserPipelineRuns(userId: string, limit: number = 20): Promise<PipelineRunRecord[]> {
        const settings = await this.getUserSettings(userId).catch(() => null);
        const isAlwaysDraft = settings?.publish_posture === 'always_draft';

        if (this.isSupabase && this.supabase) {
            const { data } = await this.supabase
                .from('pipeline_runs')
                .select('*, keywords:keyword_id ( status )')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);

            return ((data || []) as any[]).map((r) => {
                let status = r.status;
                const kwStatus = r.keywords?.status;
                if (status === 'success') {
                    if (kwStatus === 'drafted' || kwStatus === 'published') {
                        status = kwStatus;
                    } else if (isAlwaysDraft) {
                        status = 'drafted';
                    } else {
                        status = 'published';
                    }
                }
                return {
                    id: r.id,
                    user_id: r.user_id,
                    keyword_id: r.keyword_id,
                    keyword_text: r.keyword_text,
                    status,
                    wp_post_id: r.wp_post_id,
                    wp_post_url: r.wp_post_url,
                    duration_seconds: r.duration_seconds,
                    fail_reasons: r.fail_reasons,
                    created_at: r.created_at,
                };
            }) as PipelineRunRecord[];
        }

        const rows = this.sqliteDb!
            .prepare(`
                SELECT r.*, k.status as kw_status 
                FROM pipeline_runs r 
                LEFT JOIN keywords k ON r.keyword_id = k.id 
                WHERE r.user_id = ? 
                ORDER BY r.created_at DESC 
                LIMIT ?
            `)
            .all(userId, limit) as any[];

        return rows.map((r) => {
            let status = r.status;
            if (status === 'success') {
                if (r.kw_status === 'drafted' || r.kw_status === 'published') {
                    status = r.kw_status;
                } else if (isAlwaysDraft) {
                    status = 'drafted';
                } else {
                    status = 'published';
                }
            }
            return {
                id: r.id,
                user_id: r.user_id,
                keyword_id: r.keyword_id,
                keyword_text: r.keyword_text,
                status,
                wp_post_id: r.wp_post_id,
                wp_post_url: r.wp_post_url,
                duration_seconds: r.duration_seconds,
                fail_reasons: r.fail_reasons,
                created_at: r.created_at,
            };
        }) as PipelineRunRecord[];
    }

    async getGlobalPipelineRuns(limit: number = 30): Promise<PipelineRunRecord[]> {
        if (this.isSupabase && this.supabase) {
            const { data } = await this.supabase
                .from('pipeline_runs')
                .select('*, keywords:keyword_id ( status )')
                .order('created_at', { ascending: false })
                .limit(limit);

            return ((data || []) as any[]).map((r) => {
                let status = r.status;
                const kwStatus = r.keywords?.status;
                if (status === 'success') {
                    if (kwStatus === 'drafted' || kwStatus === 'published') {
                        status = kwStatus;
                    } else {
                        status = 'published';
                    }
                }
                return {
                    id: r.id,
                    user_id: r.user_id,
                    keyword_id: r.keyword_id,
                    keyword_text: r.keyword_text,
                    status,
                    wp_post_id: r.wp_post_id,
                    wp_post_url: r.wp_post_url,
                    duration_seconds: r.duration_seconds,
                    fail_reasons: r.fail_reasons,
                    created_at: r.created_at,
                };
            }) as PipelineRunRecord[];
        }

        const rows = this.sqliteDb!
            .prepare(`
                SELECT r.*, k.status as kw_status 
                FROM pipeline_runs r 
                LEFT JOIN keywords k ON r.keyword_id = k.id 
                ORDER BY r.created_at DESC 
                LIMIT ?
            `)
            .all(limit) as any[];

        return rows.map((r) => {
            let status = r.status;
            if (status === 'success') {
                if (r.kw_status === 'drafted' || r.kw_status === 'published') {
                    status = r.kw_status;
                } else {
                    status = 'published';
                }
            }
            return {
                id: r.id,
                user_id: r.user_id,
                keyword_id: r.keyword_id,
                keyword_text: r.keyword_text,
                status,
                wp_post_id: r.wp_post_id,
                wp_post_url: r.wp_post_url,
                duration_seconds: r.duration_seconds,
                fail_reasons: r.fail_reasons,
                created_at: r.created_at,
            };
        }) as PipelineRunRecord[];
    }

    // ── ADMIN METRICS ───────────────────────────────────────────────

    async getAdminMetrics(): Promise<any> {
        if (this.isSupabase && this.supabase) {
            const [usersRes, paidRes, kwRes, publishedRes, payuRes, usdtRes, cryptoRes] = await Promise.all([
                this.supabase.from('profiles').select('*', { count: 'exact', head: true }),
                this.supabase.from('profiles').select('*', { count: 'exact', head: true }).neq('subscription_tier', 'free'),
                this.supabase.from('keywords').select('*', { count: 'exact', head: true }),
                this.supabase.from('keywords').select('*', { count: 'exact', head: true }).eq('status', 'published'),
                this.supabase.from('payment_records').select('amount').eq('status', 'completed').eq('currency', 'INR'),
                this.supabase.from('payment_records').select('amount').eq('status', 'completed').eq('currency', 'USDT'),
                this.supabase.from('payment_records').select('*', { count: 'exact', head: true }).eq('gateway', 'usdt_crypto').eq('status', 'pending'),
            ]);

            const payuRev = (payuRes.data || []).reduce((acc: number, cur: any) => acc + Number(cur.amount || 0), 0);
            const usdtRev = (usdtRes.data || []).reduce((acc: number, cur: any) => acc + Number(cur.amount || 0), 0);

            return {
                totalUsers: usersRes.count || 0,
                totalPaidUsers: paidRes.count || 0,
                totalKeywords: kwRes.count || 0,
                totalPublished: publishedRes.count || 0,
                payuRevenueINR: payuRev,
                usdtRevenueUSD: usdtRev,
                pendingCryptoApprovals: cryptoRes.count || 0,
            };
        }

        const totalUsers = (this.sqliteDb!.prepare('SELECT count(*) as count FROM profiles').get() as any).count;
        const totalPaidUsers = (this.sqliteDb!.prepare("SELECT count(*) as count FROM profiles WHERE subscription_tier != 'free'").get() as any).count;
        const totalKeywords = (this.sqliteDb!.prepare('SELECT count(*) as count FROM keywords').get() as any).count;
        const totalPublished = (this.sqliteDb!.prepare("SELECT count(*) as count FROM keywords WHERE status = 'published'").get() as any).count;
        const payuRevenue = (this.sqliteDb!.prepare("SELECT COALESCE(sum(amount), 0) as sum FROM payment_records WHERE status = 'completed' AND currency = 'INR'").get() as any).sum;
        const usdtRevenue = (this.sqliteDb!.prepare("SELECT COALESCE(sum(amount), 0) as sum FROM payment_records WHERE status = 'completed' AND currency = 'USDT'").get() as any).sum;
        const pendingCrypto = (this.sqliteDb!.prepare("SELECT count(*) as count FROM payment_records WHERE gateway = 'usdt_crypto' AND status = 'pending'").get() as any).count;

        return {
            totalUsers,
            totalPaidUsers,
            totalKeywords,
            totalPublished,
            payuRevenueINR: payuRevenue,
            usdtRevenueUSD: usdtRevenue,
            pendingCryptoApprovals: pendingCrypto,
        };
    }
}

export const tenantStore = new TenantStore();

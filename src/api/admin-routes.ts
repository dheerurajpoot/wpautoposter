/**
 * Admin Panel API Routes.
 * Protected by requireAuth + requireAdmin.
 */

import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from './auth-routes';
import { tenantStore } from '../services/tenant-store';
import { cryptoService } from '../services/crypto-service';

export const adminRouter = Router();
adminRouter.use(requireAuth);
adminRouter.use(requireAdmin);

// ── ADMIN UNIFIED COMMAND CENTER OVERVIEW ───────────────────────────

adminRouter.get(['/overview', '/dashboard-overview'], async (_req: Request, res: Response) => {
    try {
        const [metrics, allUsers, recentRuns, pendingCrypto, activeAutomated] = await Promise.all([
            tenantStore.getAdminMetrics().catch(() => ({})),
            tenantStore.getAllProfiles().catch(() => []),
            tenantStore.getGlobalPipelineRuns(20).catch(() => []),
            tenantStore.getPendingCryptoPayments().catch(() => []),
            tenantStore.getActiveAutomatedUserSettings().catch(() => []),
        ]);

        const totalUsers = allUsers.length;
        const paidUsers = allUsers.filter((u) => u.subscription_tier && u.subscription_tier !== 'free');
        const suspendedUsers = allUsers.filter((u) => u.is_suspended);
        const freeUsers = allUsers.filter((u) => !u.subscription_tier || u.subscription_tier === 'free');

        // Recent users (newest first)
        const recentUsers = [...allUsers]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 8);

        // Run health stats
        const successfulRuns = recentRuns.filter((r) => r.status === 'success').length;
        const globalSuccessRate = recentRuns.length > 0 ? Math.round((successfulRuns / recentRuns.length) * 100) : 100;

        res.json({
            metrics: {
                ...metrics,
                totalUsers,
                totalPaidUsers: paidUsers.length,
                totalFreeUsers: freeUsers.length,
                totalSuspendedUsers: suspendedUsers.length,
                activeAutomatedTenants: activeAutomated.length,
                pendingCryptoCount: pendingCrypto.length,
                globalSuccessRate,
            },
            recentUsers,
            recentRuns,
            pendingCrypto: pendingCrypto.slice(0, 5),
            systemHealth: {
                databaseMode: tenantStore.isSupabase ? 'Supabase PostgreSQL Cloud' : 'SQLite Embedded Local',
                schedulerStatus: 'Active (24/7 Automated Multi-Tenant Loop)',
                nodeVersion: process.version,
                uptimeSeconds: Math.floor(process.uptime()),
            },
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ── ADMIN METRICS ────────────────────────────────────────────────────

adminRouter.get('/metrics', async (_req: Request, res: Response) => {
    try {
        const metrics = await tenantStore.getAdminMetrics();
        res.json({ metrics });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ── USER MANAGEMENT ──────────────────────────────────────────────────

adminRouter.get('/users', async (_req: Request, res: Response) => {
    try {
        const users = await tenantStore.getAllProfiles();
        res.json({ users });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

adminRouter.put('/users/:userId/plan', async (req: Request, res: Response) => {
    try {
        const userId = req.params.userId as string;
        const { tier, quota } = req.body;
        if (!tier) {
            res.status(400).json({ error: 'Tier is required' });
            return;
        }

        const effectiveQuota =
            typeof quota === 'number'
                ? quota
                : tier === 'agency'
                ? 300
                : tier === 'pro'
                ? 100
                : tier === 'starter'
                ? 30
                : 3;

        await tenantStore.updateProfileTier(userId, tier, effectiveQuota);
        res.json({ ok: true, user: await tenantStore.getProfile(userId) });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

adminRouter.post('/users/tier', async (req: Request, res: Response) => {
    try {
        const { userId, tier, bonusQuota } = req.body;
        if (!userId || !tier) {
            res.status(400).json({ error: 'userId and tier are required' });
            return;
        }

        const baseQuota =
            tier === 'agency'
                ? 300
                : tier === 'pro'
                ? 100
                : tier === 'starter'
                ? 30
                : 3;

        const effectiveQuota = baseQuota + (Number(bonusQuota) || 0);

        await tenantStore.updateProfileTier(userId, tier, effectiveQuota);
        res.json({ ok: true, user: await tenantStore.getProfile(userId) });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

adminRouter.put('/users/:userId/suspend', async (req: Request, res: Response) => {
    try {
        const userId = req.params.userId as string;
        const { is_suspended } = req.body;
        await tenantStore.setUserSuspended(userId, Boolean(is_suspended));
        res.json({ ok: true, user: await tenantStore.getProfile(userId) });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

adminRouter.post('/users/suspend', async (req: Request, res: Response) => {
    try {
        const { userId, suspend } = req.body;
        if (!userId) {
            res.status(400).json({ error: 'userId is required' });
            return;
        }
        await tenantStore.setUserSuspended(userId, Boolean(suspend));
        res.json({ ok: true, user: await tenantStore.getProfile(userId) });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ── MANUAL USDT CRYPTO APPROVAL QUEUE ────────────────────────────────

adminRouter.get(['/crypto-approvals', '/crypto/pending'], async (_req: Request, res: Response) => {
    try {
        const pending = await tenantStore.getPendingCryptoPayments();
        const enriched = pending.map((p) => ({
            ...p,
            explorer_url: cryptoService.getExplorerUrl(p.crypto_network || 'TRC20', p.crypto_tx_hash || ''),
        }));
        res.json({ pending: enriched, payments: enriched });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

adminRouter.post('/crypto/verify', async (req: Request, res: Response) => {
    try {
        const admin = (req as any).user;
        const { paymentId, approved, notes } = req.body;
        if (!paymentId) {
            res.status(400).json({ error: 'paymentId is required' });
            return;
        }

        if (approved) {
            await tenantStore.approveCryptoPayment(paymentId, admin.id, notes || 'Verified on blockchain explorer');
            res.json({ ok: true, message: 'Crypto payment approved and subscription activated successfully' });
        } else {
            await tenantStore.rejectCryptoPayment(paymentId, admin.id, notes || 'Invalid transaction hash or receipt');
            res.json({ ok: true, message: 'Payment rejected' });
        }
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

adminRouter.post('/crypto-approvals/:paymentId/approve', async (req: Request, res: Response) => {
    try {
        const admin = (req as any).user;
        const paymentId = req.params.paymentId as string;
        const { notes } = req.body;

        await tenantStore.approveCryptoPayment(paymentId, admin.id, notes || 'Verified on blockchain explorer');
        res.json({ ok: true, message: 'Crypto payment approved and subscription activated successfully' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

adminRouter.post('/crypto-approvals/:paymentId/reject', async (req: Request, res: Response) => {
    try {
        const admin = (req as any).user;
        const paymentId = req.params.paymentId as string;
        const { notes } = req.body;

        await tenantStore.rejectCryptoPayment(paymentId, admin.id, notes || 'Invalid transaction hash or receipt');
        res.json({ ok: true, message: 'Payment rejected' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// View and update deposit wallet addresses for USDT subscriptions
adminRouter.get('/crypto/wallets', (_req: Request, res: Response) => {
    res.json(cryptoService.getDepositInfo());
});

adminRouter.post('/crypto/wallets', (req: Request, res: Response) => {
    try {
        const { trc20Address, bep20Address } = req.body;
        if (!trc20Address && !bep20Address) {
            res.status(400).json({ error: 'At least one wallet address (TRC20 or BEP20) is required' });
            return;
        }
        cryptoService.updateDepositAddresses(trc20Address, bep20Address);
        res.json({
            ok: true,
            message: 'Official deposit wallet addresses updated successfully!',
            config: cryptoService.getDepositInfo(),
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ── GLOBAL PROMPT TEMPLATES ──────────────────────────────────────────

adminRouter.get('/templates', async (_req: Request, res: Response) => {
    try {
        const templates = await tenantStore.getGlobalTemplates();
        res.json({ templates });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

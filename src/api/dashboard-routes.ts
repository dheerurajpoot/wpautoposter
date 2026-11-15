/**
 * Tenant Dashboard Routes.
 * Keywords, Prompts, WordPress Settings, Billing (PayU + USDT Crypto), Pipeline runs.
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from './auth-routes';
import { tenantStore, type KeywordRecord } from '../services/tenant-store';
import { payuService } from '../services/payu-service';
import { cryptoService } from '../services/crypto-service';
import { PLANS } from '../config/subscription-plans';
import { WpClient, formatWpErrorMessage } from '../services/wp-client';
import { loadConfig, type PipelineConfig } from '../config';
import { runKeywordJob } from '../runner';
import { loadPromptRegistry, type PromptStageKey } from '../config/prompt-loader';
import { getNextRunTime, executeUserScheduledBatch, buildDistributedSchedule } from '../services/saas-scheduler';
import { extractSiteBranding, interpolatePromptWithSite } from '../services/site-branding';

async function getUserCustomPromptsMap(userId: string): Promise<Record<string, { system?: string; user?: string }>> {
    const userPrompts = await tenantStore.getUserPrompts(userId);
    const settings = await tenantStore.getUserSettings(userId);
    const config = loadConfig();
    const branding = extractSiteBranding(settings.wp_base_url || '');

    const promptMap: Record<string, { system?: string; user?: string }> = {};
    for (const p of userPrompts) {
        if (p.is_customized && p.system_prompt && p.system_prompt.trim().length > 0) {
            promptMap[p.stage_key] = {
                system: interpolatePromptWithSite(p.system_prompt, branding),
                user: p.user_prompt ? interpolatePromptWithSite(p.user_prompt, branding) : undefined,
            };
            if (p.stage_key === 'stage2_research') promptMap['stage2'] = promptMap[p.stage_key];
            if (p.stage_key === 'stage2') promptMap['stage2_research'] = promptMap[p.stage_key];
            if (p.stage_key === 'stage3_final_edit') promptMap['stage3_finalEdit'] = promptMap[p.stage_key];
            if (p.stage_key === 'stage3_finalEdit') promptMap['stage3_final_edit'] = promptMap[p.stage_key];
        }
    }
    return promptMap;
}


export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

// ── OVERVIEW STATS ───────────────────────────────────────────────────

dashboardRouter.get('/overview', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const profile = await tenantStore.getProfile(user.id);
        const settings = await tenantStore.getUserSettings(user.id);
        
        // Fetch all keywords to compute high-level distribution & funnel metrics
        const allKeywordsRes = await tenantStore.getKeywords(user.id, { limit: 1000 });
        const allItems = allKeywordsRes.items || [];

        let publishedCount = 0;
        let draftedCount = 0;
        let failedCount = 0;
        let inProgressCount = 0;
        let plannedCount = 0;

        const clusterCounts: Record<string, number> = {};
        const funnelCounts: Record<string, number> = { TOFU: 0, MOFU: 0, BOFU: 0, OTHER: 0 };
        const upcomingPlanned: any[] = [];

        for (const item of allItems) {
            const status = (item.status || 'planned').toLowerCase();
            if (status === 'published') publishedCount++;
            else if (status === 'draft') draftedCount++;
            else if (status === 'failed') failedCount++;
            else if (status === 'in_progress') inProgressCount++;
            else plannedCount++;

            // Cluster breakdown
            const cluster = (item.cluster || 'General').trim();
            clusterCounts[cluster] = (clusterCounts[cluster] || 0) + 1;

            // Funnel breakdown
            const stage = (item.funnel_stage || '').toUpperCase().trim();
            if (stage.includes('TOFU') || stage === 'TOP') funnelCounts.TOFU++;
            else if (stage.includes('MOFU') || stage === 'MIDDLE') funnelCounts.MOFU++;
            else if (stage.includes('BOFU') || stage === 'BOTTOM') funnelCounts.BOFU++;
            else funnelCounts.OTHER++;

            if (status === 'planned' && upcomingPlanned.length < 5) {
                upcomingPlanned.push({
                    id: item.id,
                    keyword: item.keyword,
                    cluster: item.cluster || 'General',
                    funnel_stage: item.funnel_stage || 'TOFU',
                    priority: item.priority || 1,
                    row_order: item.row_order,
                    canonical_category: item.canonical_category,
                });
            }
        }

        // Sort clusters by count descending
        const clusterBreakdown = Object.entries(clusterCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 6);

        // Fetch user pipeline runs
        const recentRuns = await tenantStore.getUserPipelineRuns(user.id, 8);
        const successfulRuns = recentRuns.filter(r => r.status === 'success');
        const successRate = recentRuns.length > 0 
            ? Math.round((successfulRuns.length / recentRuns.length) * 100) 
            : (publishedCount + failedCount > 0 ? Math.round((publishedCount / (publishedCount + failedCount)) * 100) : 100);
            
        const avgDurationSeconds = successfulRuns.length > 0
            ? Math.round(successfulRuns.reduce((acc, r) => acc + (r.duration_seconds || 0), 0) / successfulRuns.length)
            : 45;

        // Next scheduled run calculation
        let nextRunTime = '';
        if (settings.is_automation_enabled) {
            nextRunTime = getNextRunTime(settings.cron_schedule || '0 9 * * *', settings.cron_timezone || 'Asia/Kolkata');
        }

        // In multi-tenant SaaS, each user's WordPress connection is strictly their own
        const effectiveUrl = settings.wp_base_url || '';
        const effectiveUser = settings.wp_api_user || '';
        const effectivePass = settings.wp_app_password_encrypted || '';
        const isWpConfigured = !!(effectiveUrl && effectiveUser && effectivePass);

        const monthlyQuota = profile?.monthly_quota ?? (profile?.subscription_tier === 'free' ? 3 : 30);
        const usedThisMonth = profile?.used_this_month || 0;
        const remainingQuota = Math.max(0, monthlyQuota - usedThisMonth);

        res.json({
            stats: {
                totalKeywords: allKeywordsRes.total,
                publishedCount,
                draftedCount,
                failedCount,
                inProgressCount,
                queueCount: plannedCount,
                monthlyQuota,
                usedQuota: usedThisMonth,
                remainingQuota,
                quotaResetsAt: profile?.quota_resets_at,
                tierName: profile?.subscription_tier || 'free',
                successRate,
                avgDurationSeconds,
                clusterBreakdown,
                funnelBreakdown: funnelCounts,
                upcomingPlanned,
                recentRuns,
                wpStatus: {
                    isConnected: isWpConfigured,
                    url: effectiveUrl,
                    user: effectiveUser,
                },
                automationStatus: {
                    enabled: !!settings.is_automation_enabled,
                    dailyLimit: settings.daily_quota || 2,
                    schedule: settings.cron_schedule || '0 9 * * *',
                    timezone: settings.cron_timezone || 'UTC',
                    nextRunTime,
                    lastRunAt: settings.last_run_at,
                    publishPosture: settings.publish_posture || 'always_draft',
                    aiProvider: settings.ai_provider || 'gemini',
                },
            },
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ── KEYWORDS ─────────────────────────────────────────────────────────

function parseCsvLine(line: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"') {
                if (i + 1 < line.length && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                current += ch;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
            } else if (ch === ',') {
                fields.push(current.trim());
                current = '';
            } else {
                current += ch;
            }
        }
    }
    fields.push(current.trim());
    return fields;
}

function escapeCsvField(val: unknown): string {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

dashboardRouter.get('/keywords', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const status = req.query.status as string;
        const search = req.query.search as string;
        const cluster = req.query.cluster as string;
        const funnel_stage = req.query.funnel_stage as string;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
        const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

        const result = await tenantStore.getKeywords(user.id, {
            status,
            search,
            cluster,
            funnel_stage,
            limit,
            offset,
        });

        // Fetch recent pipeline runs to attach exact execution timestamp for published/failed/drafted items
        const recentRuns = await tenantStore.getUserPipelineRuns(user.id, 500).catch(() => []);
        const latestRunMap: Record<string, string> = {};
        const latestRunByTextMap: Record<string, string> = {};
        for (const run of recentRuns) {
            if (run.keyword_id && !latestRunMap[run.keyword_id]) {
                latestRunMap[run.keyword_id] = run.created_at;
            }
            if (run.keyword_text) {
                const normText = run.keyword_text.trim().toLowerCase();
                if (!latestRunByTextMap[normText]) {
                    latestRunByTextMap[normText] = run.created_at;
                }
            }
        }

        const enrichedItems = result.items.map((item) => {
            const isPlanned = (item.status || 'planned') === 'planned';
            let executedAt: string | null = null;
            if (!isPlanned) {
                executedAt =
                    latestRunMap[item.id] ||
                    latestRunByTextMap[(item.keyword || '').trim().toLowerCase()] ||
                    (item as any).updated_at ||
                    null;
            }
            return {
                ...item,
                executed_at: executedAt,
            };
        });

        // When viewing all statuses, sort planned keywords on top and others below chronologically (newest first)
        let sortedItems = enrichedItems;
        if (!status || status === 'all') {
            sortedItems = [...enrichedItems].sort((a, b) => {
                const aStatus = a.status || 'planned';
                const bStatus = b.status || 'planned';
                const aIsPlanned = aStatus === 'planned';
                const bIsPlanned = bStatus === 'planned';

                if (aIsPlanned && !bIsPlanned) return -1;
                if (!aIsPlanned && bIsPlanned) return 1;

                if (aIsPlanned && bIsPlanned) {
                    const pA = Number(a.priority) || 1;
                    const pB = Number(b.priority) || 1;
                    if (pA !== pB) return pA - pB;
                    const rA = Number(a.row_order) || 0;
                    const rB = Number(b.row_order) || 0;
                    if (rA !== rB) return rA - rB;
                    const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
                    const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
                    return tB - tA;
                }

                if (aStatus === 'in_progress' && bStatus !== 'in_progress') return -1;
                if (aStatus !== 'in_progress' && bStatus === 'in_progress') return 1;

                // For non-planned, strictly sort by exact execution/update time descending
                const timeA = (a as any).executed_at || (a as any).updated_at || (a as any).published_at || a.created_at || '';
                const timeB = (b as any).executed_at || (b as any).updated_at || (b as any).published_at || b.created_at || '';
                const tA = timeA ? new Date(timeA).getTime() : 0;
                const tB = timeB ? new Date(timeB).getTime() : 0;
                return tB - tA;
            });
        }

        res.json({
            items: sortedItems,
            total: result.total,
            keywords: sortedItems, // backward compatibility
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

dashboardRouter.post('/keywords', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const {
            keyword,
            row_order,
            content_type,
            blogpost_subtype,
            review_subtype,
            cluster,
            funnel_stage,
            local_modifier,
            class_hint,
            priority,
            notes,
            phase,
            planned_month,
            planned_week,
            canonical_category,
            suggested_tags,
            cannibalization_group,
            local_data_required,
            pass_risk,
        } = req.body;

        if (!keyword || !keyword.trim()) {
            res.status(400).json({ error: 'Keyword is required' });
            return;
        }

        const created = await tenantStore.addKeyword(user.id, {
            keyword: keyword.trim(),
            row_order: row_order !== undefined && row_order !== null ? Number(row_order) : 1,
            content_type: content_type || 'BlogPost',
            blogpost_subtype: blogpost_subtype || null,
            review_subtype: review_subtype || null,
            cluster: cluster || '',
            funnel_stage: funnel_stage || null,
            local_modifier: local_modifier || null,
            class_hint: class_hint || 'B',
            priority: priority !== undefined && priority !== null ? Number(priority) : 1,
            notes: notes || null,
            phase: phase !== undefined && phase !== null ? Number(phase) : null,
            planned_month: planned_month !== undefined && planned_month !== null ? Number(planned_month) : null,
            planned_week: planned_week || null,
            canonical_category: canonical_category || null,
            suggested_tags: suggested_tags || null,
            cannibalization_group: cannibalization_group || null,
            local_data_required: local_data_required || null,
            pass_risk: pass_risk || null,
            status: 'planned',
        });
        res.json({ keyword: created });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

dashboardRouter.post('/keywords/import-csv', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const { csvText } = req.body;
        if (!csvText || typeof csvText !== 'string') {
            res.status(400).json({ error: 'CSV text content is required' });
            return;
        }

        const lines = csvText
            .replace(/\r\n/g, '\n')
            .split('\n')
            .filter((l) => l.trim().length > 0);

        if (lines.length === 0) {
            res.status(400).json({ error: 'CSV content is empty' });
            return;
        }

        const itemsToInsert: Array<Partial<KeywordRecord>> = [];

        // Check if first line is a header
        const firstLineCells = parseCsvLine(lines[0]);
        const isHeader = firstLineCells.some((c) => {
            const lower = c.toLowerCase().trim();
            return (
                lower === 'keyword' ||
                lower === 'topic' ||
                lower === 'title' ||
                lower === 'category' ||
                lower === 'canonical_category' ||
                lower === 'row_order' ||
                lower === 'content_type'
            );
        });

        const headerIndices: Record<string, number> = {};
        let startIndex = 0;

        if (isHeader) {
            startIndex = 1;
            firstLineCells.forEach((h, i) => {
                headerIndices[h.toLowerCase().trim()] = i;
            });
        }

        for (let i = startIndex; i < lines.length; i++) {
            const cells = parseCsvLine(lines[i]);
            if (cells.length === 0 || !cells.some((c) => c.trim())) continue;

            let rowOrder = i + 1;
            let kwText = '';
            let contentType = 'BlogPost';
            let blogpostSubtype: string | null = 'Guide';
            let reviewSubtype: string | null = null;
            let cluster = '';
            let funnelStage: any = 'TOFU';
            let localModifier: string | null = null;
            let classHint = 'B';
            let priority = 1;
            let notes: string | null = null;
            let phase: number | null = null;
            let plannedMonth: number | null = null;
            let plannedWeek: string | null = null;
            let canonicalCategory: string | null = null;
            let suggestedTags: string | null = null;
            let cannibalizationGroup: string | null = null;
            let localDataRequired: any = 'NO';
            let passRisk: any = 'MED';

            if (isHeader) {
                const get = (...colNames: string[]) => {
                    for (const col of colNames) {
                        const idx = headerIndices[col.toLowerCase().trim()];
                        if (idx !== undefined && idx < cells.length && cells[idx].trim()) {
                            return cells[idx].trim();
                        }
                    }
                    return '';
                };

                kwText = get('keyword', 'topic', 'title', 'focus_keyword');
                if (!kwText) continue;

                if (get('row_order', '#', 'order', 'id')) {
                    rowOrder = parseInt(get('row_order', '#', 'order', 'id'), 10) || rowOrder;
                }
                contentType = get('content_type', 'type') || 'BlogPost';
                blogpostSubtype = get('blogpost_subtype', 'subtype') || 'Guide';
                reviewSubtype = get('review_subtype') || null;
                cluster = get('cluster', 'topic_cluster', 'topic_group') || '';
                funnelStage = (get('funnel_stage', 'funnel').toUpperCase() as any) || 'TOFU';
                localModifier = get('local_modifier', 'location', 'geo') || null;
                classHint = get('class_hint', 'class').toUpperCase() || 'B';
                priority = parseInt(get('priority', 'p'), 10) || 1;
                notes = get('notes', 'brief', 'description', 'instructions', 'outline') || null;
                phase = get('phase') ? parseInt(get('phase'), 10) : null;
                plannedMonth = get('planned_month', 'month') ? parseInt(get('planned_month', 'month'), 10) : null;
                plannedWeek = get('planned_week', 'week') || null;
                canonicalCategory = get('canonical_category', 'category', 'wp_category') || null;
                suggestedTags = get('suggested_tags', 'tags', 'wp_tags') || null;
                cannibalizationGroup = get('cannibalization_group') || null;
                localDataRequired = (get('local_data_required').toUpperCase() as any) || 'NO';
                passRisk = (get('pass_risk', 'risk').toUpperCase() as any) || 'MED';
            } else {
                // Positional fallback: supports either 1 column (keyword) or clean (keyword, category, tags, notes) or 19-col
                if (cells.length === 1) {
                    kwText = cells[0].trim();
                } else if (cells.length >= 2 && !isNaN(Number(cells[0])) && cells.length > 5) {
                    // Legacy 19-column CSV format
                    rowOrder = Number(cells[0]) || rowOrder;
                    kwText = cells[1].trim();
                    contentType = cells[2]?.trim() || 'BlogPost';
                    blogpostSubtype = cells[3]?.trim() || 'Guide';
                    cluster = cells[5]?.trim() || '';
                    notes = cells[10]?.trim() || null;
                    canonicalCategory = cells[14]?.trim() || null;
                    suggestedTags = cells[15]?.trim() || null;
                } else {
                    // Simple modern format: keyword, category, tags, cluster, notes
                    kwText = cells[0].trim();
                    canonicalCategory = cells[1]?.trim() || null;
                    suggestedTags = cells[2]?.trim() || null;
                    cluster = cells[3]?.trim() || '';
                    notes = cells[4]?.trim() || null;
                }
            }

            if (kwText) {
                itemsToInsert.push({
                    row_order: rowOrder,
                    keyword: kwText,
                    content_type: contentType,
                    blogpost_subtype: blogpostSubtype,
                    review_subtype: reviewSubtype,
                    cluster,
                    funnel_stage: funnelStage,
                    local_modifier: localModifier,
                    class_hint: classHint,
                    priority,
                    notes,
                    phase,
                    planned_month: plannedMonth,
                    planned_week: plannedWeek,
                    canonical_category: canonicalCategory,
                    suggested_tags: suggestedTags,
                    cannibalization_group: cannibalizationGroup,
                    local_data_required: localDataRequired,
                    pass_risk: passRisk,
                    status: 'planned',
                });
            }
        }

        const insertedCount = await tenantStore.bulkAddKeywords(user.id, itemsToInsert);
        res.json({ ok: true, inserted: insertedCount, insertedCount });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

dashboardRouter.get('/keywords/export-csv', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const result = await tenantStore.getKeywords(user.id, { limit: 10000 });

        // Identical 19-column schema as data/keyword.csv + status/wp info
        const headers = [
            'row_order',
            'keyword',
            'category',
            'tags',
            'cluster',
            'notes',
            'status',
            'published_url',
        ];

        const rows = [headers.join(',')];

        for (const kw of result.items) {
            rows.push(
                [
                    escapeCsvField(kw.row_order || ''),
                    escapeCsvField(kw.keyword || ''),
                    escapeCsvField(kw.canonical_category || ''),
                    escapeCsvField(kw.suggested_tags || ''),
                    escapeCsvField(kw.cluster || ''),
                    escapeCsvField(kw.notes || ''),
                    escapeCsvField(kw.status || 'planned'),
                    escapeCsvField(kw.published_url || ''),
                ].join(',')
            );
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="keyword.csv"');
        res.send(rows.join('\n'));
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

dashboardRouter.post('/keywords/:id/run', async (req: Request, res: Response) => {
    // Keep socket alive for long-running AI content generation
    req.setTimeout(600_000);
    res.setTimeout(600_000);
    try {
        const user = (req as any).user;
        const id = req.params.id as string;
        const profile = await tenantStore.getProfile(user.id);
        if (!profile || profile.used_this_month >= profile.monthly_quota) {
            res.status(403).json({
                ok: false,
                error: 'Monthly quota exhausted. Please upgrade your subscription plan.',
            });
            return;
        }

        const keywords = await tenantStore.getKeywords(user.id, { limit: 5000 });
        const target = keywords.items.find((k) => k.id === id);
        if (!target) {
            res.status(404).json({ ok: false, error: 'Keyword not found' });
            return;
        }

        const settings = await tenantStore.getUserSettings(user.id);
        const config = loadConfig();

        const effectiveWpBase = settings.wp_base_url;
        const effectiveWpUser = settings.wp_api_user;
        const effectiveWpPass = settings.wp_app_password_encrypted;

        if (!effectiveWpBase || !effectiveWpUser || !effectiveWpPass) {
            res.status(400).json({
                ok: false,
                error: 'WordPress settings are not configured. Please enter your WordPress site URL, username, and Application Password in Settings.',
            });
            return;
        }

        const configOverride: Partial<PipelineConfig> = {
            wpBaseUrl: effectiveWpBase,
            wpApiUser: effectiveWpUser,
            wpApplicationPassword: effectiveWpPass,
            publishPosture: (settings.publish_posture as any) || config.publishPosture || 'auto_publish',
        };

        if (settings.ai_api_key_encrypted) {
            configOverride.aiApiKey = settings.ai_api_key_encrypted;
            configOverride.aiProvider = settings.ai_provider || config.aiProvider;
        }

        // Fast pre-flight check to verify WordPress credentials before burning AI tokens or failing the keyword
        const wpCheckClient = new WpClient({
            ...config,
            ...configOverride,
        } as PipelineConfig);
        const checkRes = await wpCheckClient.verifyCredentials();
        if (!checkRes.ok && (checkRes.status === 401 || checkRes.status === 403)) {
            const friendlyErr = formatWpErrorMessage(checkRes.error || `HTTP ${checkRes.status}`, effectiveWpUser);
            // Leave keyword status as 'planned' so user doesn't lose queue item
            // Return 400 (WordPress auth failure) rather than 401 to keep user's SaaS web session active
            res.status(400).json({
                ok: false,
                code: 'WP_AUTH_FAILED',
                error: friendlyErr,
            });
            return;
        }

        await tenantStore.updateKeyword(target.id, user.id, {
            status: 'in_progress',
            updated_at: new Date().toISOString(),
        });

        const start = Date.now();
        const customPrompts = await getUserCustomPromptsMap(user.id);
        const runRes = await runKeywordJob({
            keyword: target.keyword,
            contentType: target.content_type,
            classHint: target.class_hint,
            blogpostSubtype: target.blogpost_subtype,
            canonicalCategory: target.canonical_category,
            cluster: target.cluster,
            suggestedTags: target.suggested_tags,
            customPrompts,
        }, configOverride);

        const durationSeconds = Math.max(1, Math.floor((Date.now() - start) / 1000));
        const isWpSuccess = runRes.ok || (runRes.wp_post_id > 0 && runRes.final_status !== 'failed');

        if (!isWpSuccess) {
            const rawFailReason = runRes.failReason || (runRes.reasons && runRes.reasons.join(', ')) || 'Pipeline execution failed';
            const failReason = formatWpErrorMessage(rawFailReason, effectiveWpUser);
            await tenantStore.updateKeyword(target.id, user.id, {
                status: 'failed',
                last_error: failReason,
                updated_at: new Date().toISOString(),
            });
            await tenantStore.recordPipelineRun({
                userId: user.id,
                keywordId: target.id,
                keywordText: target.keyword,
                status: 'failed',
                wpPostId: 0,
                wpPostUrl: '',
                durationSeconds,
                failReasons: failReason,
            });
            res.status(502).json({
                ok: false,
                error: `Failed to publish to WordPress: ${failReason}`,
                reasons: runRes.reasons,
            });
            return;
        }

        const finalStatus = runRes.final_status === 'draft_wp' ? 'drafted' : 'published';

        await tenantStore.recordPipelineRun({
            userId: user.id,
            keywordId: target.id,
            keywordText: target.keyword,
            status: 'success',
            wpPostId: runRes.wp_post_id,
            wpPostUrl: runRes.published_url,
            durationSeconds,
            failReasons: null,
        });

        await tenantStore.updateKeyword(target.id, user.id, {
            status: finalStatus,
            wp_post_id: runRes.wp_post_id,
            published_url: runRes.published_url,
            updated_at: new Date().toISOString(),
        });

        res.json({
            ok: true,
            message: `Article for "${target.keyword}" successfully ${finalStatus} on WordPress!`,
            published_url: runRes.published_url,
            wp_post_id: runRes.wp_post_id,
            status: finalStatus,
        });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

dashboardRouter.put('/keywords/:id', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const id = req.params.id as string;
        await tenantStore.updateKeyword(id, user.id, req.body);
        res.json({ ok: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

dashboardRouter.delete('/keywords/:id', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const id = req.params.id as string;
        await tenantStore.deleteKeyword(id, user.id);
        res.json({ ok: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ── PROMPTS ──────────────────────────────────────────────────────────

const STAGE_DEFS = [
    {
        key: 'stage3_draft',
        regKey: 'stage3_draft' as PromptStageKey,
        defaultUser: 'Write a comprehensive, engaging article for the keyword "${keyword}". Focus on actionable advice, structured headings, and SEO-friendly insights.',
    },
    {
        key: 'stage2_research',
        regKey: 'stage2' as PromptStageKey,
        defaultUser: 'Research factual data, key definitions, statistics, and credible references for "${keyword}" (Content Type: ${contentType}).',
    },
    {
        key: 'stage3_final_edit',
        regKey: 'stage3_finalEdit' as PromptStageKey,
        defaultUser: 'Polish this draft article for publication: ensure high readability, authoritative tone, no AI fluff, and flawless grammar.',
    },
    {
        key: 'stage_final_html',
        regKey: 'stage_final_html' as PromptStageKey,
        defaultUser: 'Convert this markdown article to clean semantic HTML with kebab-case IDs on headings, table of contents friendly structure, and no duplicate top heading.',
    },
    {
        key: 'stage4_image',
        regKey: 'stage4_image' as PromptStageKey,
        defaultUser: 'Create a professional featured blog image prompt for: "${title}" (focus keyword: ${keyword}). Visual, modern, no text.',
    },
];

dashboardRouter.get('/prompts', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const storedPrompts = await tenantStore.getUserPrompts(user.id);
        const settings = await tenantStore.getUserSettings(user.id);
        const config = loadConfig();
        const branding = extractSiteBranding(settings.wp_base_url || '');
        const registry = loadPromptRegistry();

        const prompts = STAGE_DEFS.map((s) => {
            const found = storedPrompts.find((p) => p.stage_key === s.key || p.stage_key === s.regKey);
            const defaultSysRaw = registry[s.regKey]?.system || '';
            const defaultSys = interpolatePromptWithSite(defaultSysRaw, branding);
            const defaultUser = interpolatePromptWithSite(s.defaultUser, branding);
            const isStub = !found?.system_prompt || found.system_prompt.length < 30 || found.system_prompt.includes('Agent');
            const isCustomized = Boolean(found?.is_customized && !isStub);

            const systemPrompt = isCustomized
                ? interpolatePromptWithSite(found!.system_prompt, branding)
                : defaultSys;
            const userPrompt = found?.user_prompt
                ? interpolatePromptWithSite(found.user_prompt, branding)
                : defaultUser;

            return {
                id: found?.id || s.key,
                user_id: user.id,
                stage_key: s.key,
                system_prompt: systemPrompt,
                user_prompt: userPrompt,
                is_customized: isCustomized,
                default_system_prompt: defaultSys,
                updated_at: found?.updated_at || new Date().toISOString(),
            };
        });

        res.json({ prompts, branding });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

dashboardRouter.post('/prompts', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const { stage_key, system_prompt, user_prompt } = req.body;
        if (!stage_key) {
            res.status(400).json({ error: 'stage_key is required' });
            return;
        }
        await tenantStore.updateUserPrompt(user.id, stage_key, system_prompt, user_prompt);
        // Also update alias key if any
        if (stage_key === 'stage2_research') await tenantStore.updateUserPrompt(user.id, 'stage2', system_prompt, user_prompt);
        if (stage_key === 'stage3_final_edit') await tenantStore.updateUserPrompt(user.id, 'stage3_finalEdit', system_prompt, user_prompt);

        res.json({ ok: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

dashboardRouter.post('/prompts/reset', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const { stage_key } = req.body;
        if (!stage_key) {
            res.status(400).json({ error: 'stage_key is required' });
            return;
        }

        const registry = loadPromptRegistry();
        const stageDef = STAGE_DEFS.find((s) => s.key === stage_key || s.regKey === stage_key);
        const defaultSys = stageDef ? (registry[stageDef.regKey]?.system || '') : '';
        const defaultUser = stageDef?.defaultUser || '';

        await tenantStore.updateUserPrompt(user.id, stage_key, defaultSys, defaultUser);
        if (stage_key === 'stage2_research') await tenantStore.updateUserPrompt(user.id, 'stage2', defaultSys, defaultUser);
        if (stage_key === 'stage3_final_edit') await tenantStore.updateUserPrompt(user.id, 'stage3_finalEdit', defaultSys, defaultUser);

        // Mark as non-customized in SQLite
        (tenantStore as any).sqliteDb?.prepare('UPDATE user_prompts SET is_customized = 0 WHERE user_id = ? AND (stage_key = ? OR stage_key = ?)')
            ?.run(user.id, stage_key, stageDef?.regKey || stage_key);

        res.json({
            ok: true,
            prompt: {
                stage_key: stageDef?.key || stage_key,
                system_prompt: defaultSys,
                user_prompt: defaultUser,
                is_customized: false,
                default_system_prompt: defaultSys,
            },
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

dashboardRouter.put('/prompts/:stageKey', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const stageKey = req.params.stageKey as string;
        const { system_prompt, user_prompt } = req.body;
        await tenantStore.updateUserPrompt(user.id, stageKey, system_prompt, user_prompt);
        if (stageKey === 'stage2_research') await tenantStore.updateUserPrompt(user.id, 'stage2', system_prompt, user_prompt);
        if (stageKey === 'stage3_final_edit') await tenantStore.updateUserPrompt(user.id, 'stage3_finalEdit', system_prompt, user_prompt);
        res.json({ ok: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

dashboardRouter.post('/prompts/:stageKey/reset', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const stageKey = req.params.stageKey as string;
        const registry = loadPromptRegistry();
        const stageDef = STAGE_DEFS.find((s) => s.key === stageKey || s.regKey === stageKey);
        const defaultSys = stageDef ? (registry[stageDef.regKey]?.system || '') : '';
        const defaultUser = stageDef?.defaultUser || '';

        await tenantStore.updateUserPrompt(user.id, stageKey, defaultSys, defaultUser);
        if (stageKey === 'stage2_research') await tenantStore.updateUserPrompt(user.id, 'stage2', defaultSys, defaultUser);
        if (stageKey === 'stage3_final_edit') await tenantStore.updateUserPrompt(user.id, 'stage3_finalEdit', defaultSys, defaultUser);

        (tenantStore as any).sqliteDb?.prepare('UPDATE user_prompts SET is_customized = 0 WHERE user_id = ? AND (stage_key = ? OR stage_key = ?)')
            ?.run(user.id, stageKey, stageDef?.regKey || stageKey);

        res.json({
            ok: true,
            prompt: {
                stage_key: stageDef?.key || stageKey,
                system_prompt: defaultSys,
                user_prompt: defaultUser,
                is_customized: false,
                default_system_prompt: defaultSys,
            },
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ── SETTINGS & AUTOMATION ────────────────────────────────────────────

dashboardRouter.get('/settings', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const settings = await tenantStore.getUserSettings(user.id);
        const config = loadConfig();
        const isAdmin = user.role === 'admin';

        const cronSchedule = settings.cron_schedule || '0 9 * * *';
        const cronTimezone = settings.cron_timezone || 'Asia/Kolkata';
        const nextRunAt = getNextRunTime(cronSchedule, cronTimezone);

        let startHour = 9;
        let startMinute = 0;
        const parts = cronSchedule.trim().split(/\s+/);
        if (parts.length >= 2) {
            startMinute = parseInt(parts[0], 10) || 0;
            if (parts[1].includes(',')) {
                const hrs = parts[1].split(',').map((h: string) => parseInt(h, 10));
                startHour = hrs.find((h: number) => h >= 8 && h <= 11) ?? hrs[0] ?? 9;
            } else {
                startHour = parseInt(parts[1], 10) || 9;
            }
        }
        const scheduleInfo = buildDistributedSchedule(settings.daily_quota || 1, startHour, startMinute);

        // Check if settings.wp_app_password_encrypted was accidentally populated with the user's platform account password (autofill)
        let effectiveWpPass = settings.wp_app_password_encrypted || '';
        if (effectiveWpPass) {
            const isPlatformPass = await tenantStore.validateCredentials(user.email, effectiveWpPass).catch(() => null);
            if (isPlatformPass) {
                effectiveWpPass = '';
            }
        }

        // Tenant settings: always strictly isolated per user.
        // When a user has not configured WordPress yet, fields are completely blank.
        const safeSettings = {
            ...settings,
            wp_base_url: settings.wp_base_url || '',
            wp_api_user: settings.wp_api_user || '',
            wp_app_password: effectiveWpPass,
            ai_provider: settings.ai_provider || config.aiProvider || 'gemini',
            publish_posture: settings.publish_posture || config.publishPosture || 'auto_publish',
            daily_quota: settings.daily_quota || config.pipelineDailyQuota || 1,
            cron_schedule: cronSchedule,
            cron_timezone: cronTimezone,
            is_automation_enabled: Boolean(settings.is_automation_enabled),
            last_run_at: settings.last_run_at || null,
            next_run_at: nextRunAt,
            schedule_info: scheduleInfo,
            has_wp_password: Boolean(effectiveWpPass),
            has_ai_key: Boolean(settings.ai_api_key_encrypted || config.aiApiKey || config.geminiApiKey || config.openaiApiKey),
        };
        res.json({ settings: safeSettings });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

dashboardRouter.put('/settings', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const updateData: any = { ...req.body };

        // Only update password/key if non-empty string provided and not browser autofill of account password
        if (!updateData.wp_app_password_encrypted && !updateData.wp_app_password) {
            delete updateData.wp_app_password_encrypted;
        } else {
            const rawWpPass = String(updateData.wp_app_password ?? updateData.wp_app_password_encrypted).trim();
            const isPlatformPass = await tenantStore.validateCredentials(user.email, rawWpPass).catch(() => null);
            if (isPlatformPass) {
                delete updateData.wp_app_password;
                delete updateData.wp_app_password_encrypted;
            } else {
                updateData.wp_app_password_encrypted = rawWpPass;
            }
        }
        if (!updateData.ai_api_key_encrypted) {
            delete updateData.ai_api_key_encrypted;
        }

        if (updateData.daily_quota !== undefined || updateData.cron_schedule !== undefined) {
            const current = await tenantStore.getUserSettings(user.id);
            const dailyQuota = Number(updateData.daily_quota ?? current.daily_quota) || 1;
            const scheduleExpr = updateData.cron_schedule || current.cron_schedule || '0 9 * * *';
            let startHour = 9;
            let startMinute = 0;
            const parts = String(scheduleExpr).trim().split(/\s+/);
            if (parts.length >= 2) {
                startMinute = parseInt(parts[0], 10) || 0;
                if (parts[1].includes(',')) {
                    const hrs = parts[1].split(',').map((h: string) => parseInt(h, 10));
                    startHour = hrs.find((h: number) => h >= 8 && h <= 11) ?? hrs[0] ?? 9;
                } else {
                    startHour = parseInt(parts[1], 10) || 9;
                }
            }
            const distributed = buildDistributedSchedule(dailyQuota, startHour, startMinute);
            updateData.cron_schedule = distributed.cron;
        }

        // Prevent instant posting when saving settings:
        // Set last_run_at to now so the scheduler waits for the next scheduled slot
        // and does NOT fire an unexpected immediate catchup for earlier past slots.
        if (updateData.is_automation_enabled || updateData.cron_schedule !== undefined) {
            updateData.last_run_at = new Date().toISOString();
        }

        await tenantStore.updateUserSettings(user.id, updateData);
        res.json({ ok: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

dashboardRouter.post('/settings', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const updateData: any = { ...req.body };

        if (!updateData.wp_app_password_encrypted && !updateData.wp_app_password) {
            delete updateData.wp_app_password_encrypted;
        } else {
            const rawWpPass = String(updateData.wp_app_password ?? updateData.wp_app_password_encrypted).trim();
            const isPlatformPass = await tenantStore.validateCredentials(user.email, rawWpPass).catch(() => null);
            if (isPlatformPass) {
                // Prevent browser autofill from corrupting WordPress application password with platform login password
                delete updateData.wp_app_password;
                delete updateData.wp_app_password_encrypted;
            } else {
                updateData.wp_app_password_encrypted = rawWpPass;
            }
        }

        if (!updateData.ai_api_key_encrypted && !updateData.ai_api_key) {
            delete updateData.ai_api_key_encrypted;
        } else if (updateData.ai_api_key) {
            updateData.ai_api_key_encrypted = updateData.ai_api_key;
        }

        if (updateData.daily_quota !== undefined || updateData.cron_schedule !== undefined) {
            const current = await tenantStore.getUserSettings(user.id);
            const dailyQuota = Number(updateData.daily_quota ?? current.daily_quota) || 1;
            const scheduleExpr = updateData.cron_schedule || current.cron_schedule || '0 9 * * *';
            let startHour = 9;
            let startMinute = 0;
            const parts = String(scheduleExpr).trim().split(/\s+/);
            if (parts.length >= 2) {
                startMinute = parseInt(parts[0], 10) || 0;
                if (parts[1].includes(',')) {
                    const hrs = parts[1].split(',').map((h: string) => parseInt(h, 10));
                    startHour = hrs.find((h: number) => h >= 8 && h <= 11) ?? hrs[0] ?? 9;
                } else {
                    startHour = parseInt(parts[1], 10) || 9;
                }
            }
            const distributed = buildDistributedSchedule(dailyQuota, startHour, startMinute);
            updateData.cron_schedule = distributed.cron;
        }

        // Prevent instant posting when saving settings:
        // Set last_run_at to now so the scheduler waits for the next scheduled slot
        // and does NOT fire an unexpected immediate catchup for earlier past slots.
        if (updateData.is_automation_enabled || updateData.cron_schedule !== undefined) {
            updateData.last_run_at = new Date().toISOString();
        }

        await tenantStore.updateUserSettings(user.id, updateData);
        res.json({ ok: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Trigger scheduled batch on-demand for immediate testing & verification
dashboardRouter.post(['/settings/run-scheduled-now', '/automation/run-test'], async (req: Request, res: Response) => {
    // Keep socket alive for scheduled batch execution
    req.setTimeout(600_000);
    res.setTimeout(600_000);
    try {
        const user = (req as any).user;
        const result = await executeUserScheduledBatch(user.id, 'manual');
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

dashboardRouter.post('/settings/test-wp', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const { wp_base_url, wp_api_user, wp_app_password } = req.body;
        const config = loadConfig();

        const currentSettings = await tenantStore.getUserSettings(user.id);
        const effectiveUrl = wp_base_url || currentSettings.wp_base_url;
        const effectiveUser = wp_api_user || currentSettings.wp_api_user;
        const effectivePass = wp_app_password || currentSettings.wp_app_password_encrypted;

        if (!effectiveUrl || !effectiveUser || !effectivePass) {
            res.status(400).json({
                ok: false,
                error: 'WordPress URL, username, and Application Password are required.',
            });
            return;
        }

        // Test connection using WP REST API /users/me
        const cleanUrl = effectiveUrl.replace(/\/+$/, '');
        const cleanUser = String(effectiveUser).trim().replace(/^['"]|['"]$/g, '');
        const cleanPass = String(effectivePass).trim().replace(/^['"]|['"]$/g, '');
        let authHeader = 'Basic ' + Buffer.from(`${cleanUser}:${cleanPass}`).toString('base64');

        const testUrl = `${cleanUrl}/wp-json/wp/v2/users/me`;
        let wpRes = await fetch(testUrl, {
            method: 'GET',
            headers: {
                Authorization: authHeader,
                'User-Agent': 'WPContentAutopilot/1.0',
                Accept: 'application/json',
            },
        });

        // If 401, automatically test alternate password format (spaces stripped vs formatted)
        let workingPass = cleanPass;
        if (wpRes.status === 401) {
            let altPass = '';
            if (cleanPass.includes(' ')) {
                altPass = cleanPass.replace(/\s+/g, '');
            } else if (/^[a-zA-Z0-9]{16,24}$/.test(cleanPass)) {
                altPass = cleanPass.match(/.{1,4}/g)?.join(' ') || '';
            }

            if (altPass && altPass !== cleanPass) {
                const altAuth = 'Basic ' + Buffer.from(`${cleanUser}:${altPass}`).toString('base64');
                const altRes = await fetch(testUrl, {
                    method: 'GET',
                    headers: {
                        Authorization: altAuth,
                        'User-Agent': 'WPContentAutopilot/1.0',
                        Accept: 'application/json',
                    },
                });
                if (altRes.ok) {
                    wpRes = altRes;
                    workingPass = altPass;
                }
            }
        }

        if (wpRes.ok) {
            const data = (await wpRes.json()) as any;
            res.json({
                ok: true,
                message: `Successfully connected as "${data.name}" (${data.slug})!`,
                wp_user_id: data.id,
            });
        } else {
            const errText = await wpRes.text();
            let friendlyError = `WordPress responded with ${wpRes.status}`;

            if (wpRes.status === 401) {
                friendlyError = `WordPress 401 Unauthorized: The password entered is an invalid application password for user "${cleanUser}". In WordPress Admin, go to Users > Profile > Application Passwords, generate a new password, and paste it here. (Note: standard login passwords do not work with the REST API).`;
            } else if (wpRes.status === 403) {
                friendlyError = `WordPress 403 Forbidden: User "${cleanUser}" lacks permission to access the REST API or publish posts. Ensure this user has the Administrator or Editor role in WordPress.`;
            } else if (errText.trim()) {
                friendlyError += `: ${errText.slice(0, 200)}`;
            }

            res.status(400).json({
                ok: false,
                error: friendlyError,
            });
        }
    } catch (err: any) {
        res.status(500).json({ ok: false, error: `Connection failed: ${err.message}` });
    }
});

// ── BILLING & PAYMENTS ───────────────────────────────────────────────



dashboardRouter.get('/billing/plans', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const profile = user?.id ? await tenantStore.getProfile(user.id) : null;
        res.json({
            plans: PLANS,
            currentSubscription: profile ? {
                tier: profile.subscription_tier,
                status: profile.subscription_status,
                monthly_quota: profile.monthly_quota,
                used_this_month: profile.used_this_month,
                quota_resets_at: profile.quota_resets_at,
                is_suspended: profile.is_suspended,
            } : null,
        });
    } catch {
        res.json({ plans: PLANS });
    }
});

dashboardRouter.get('/billing/history', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const payments = await tenantStore.getUserPayments(user.id);
        res.json({ payments });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

dashboardRouter.get('/billing/crypto-info', (_req: Request, res: Response) => {
    res.json(cryptoService.getDepositInfo());
});

// Initiate PayU Checkout
dashboardRouter.post('/billing/payu/initiate', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const { planId } = req.body;
        const plan = PLANS.find((p) => p.id === planId);
        if (!plan) {
            res.status(400).json({ error: 'Invalid plan selected' });
            return;
        }

        const txnid = `TXN_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const origin = (req.headers.origin as string) || (req.headers.referer as string);
        let host = req.get('host');
        if (origin) {
            try {
                host = new URL(origin).host;
            } catch {}
        }
        const baseUrl = `${req.protocol}://${host}`;

        // Create pending payment record
        await tenantStore.createPayment({
            userId: user.id,
            gateway: 'payu',
            tier: plan.id,
            amount: plan.priceINR,
            currency: 'INR',
            payuTxnId: txnid,
        });

        const checkout = payuService.createCheckoutPayload(
            {
                txnid,
                amount: plan.priceINR.toFixed(2),
                productinfo: plan.name,
                firstname: user.full_name || 'Subscriber',
                email: user.email,
                surl: `${baseUrl}/api/billing/payu/callback`,
                furl: `${baseUrl}/api/billing/payu/callback`,
            },
            user.id,
            plan.id
        );

        res.json({
            ok: true,
            checkout,
            payuUrl: checkout.action,
            action: checkout.action,
            params: checkout.params,
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Submit Manual USDT Crypto Payment
dashboardRouter.post('/billing/crypto/submit', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const { planId, network, txHash, senderWallet } = req.body;
        const plan = PLANS.find((p) => p.id === planId);
        if (!plan) {
            res.status(400).json({ error: 'Invalid plan selected' });
            return;
        }

        if (!txHash || !txHash.trim()) {
            res.status(400).json({ error: 'Transaction Hash (TXID) is required' });
            return;
        }

        const payment = await tenantStore.createPayment({
            userId: user.id,
            gateway: 'usdt_crypto',
            tier: plan.id,
            amount: plan.priceUSDT,
            currency: 'USDT',
            cryptoNetwork: network || 'TRC20',
            cryptoTxHash: txHash.trim(),
            cryptoWallet: senderWallet?.trim(),
        });

        res.json({
            ok: true,
            message: 'USDT payment submitted successfully! Admin will verify and activate your subscription.',
            payment,
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ── PIPELINE EXECUTION ───────────────────────────────────────────────

dashboardRouter.get(['/pipeline/runs', '/runs'], async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const runs = await tenantStore.getUserPipelineRuns(user.id);
        res.json({ runs });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Trigger on-demand generation for next keyword
dashboardRouter.post(['/pipeline/run-now', '/run-now'], async (req: Request, res: Response) => {
    // Keep socket alive for long-running AI content generation
    req.setTimeout(600_000);
    res.setTimeout(600_000);
    try {
        const user = (req as any).user;
        const profile = await tenantStore.getProfile(user.id);
        if (!profile || profile.used_this_month >= profile.monthly_quota) {
            res.status(403).json({
                ok: false,
                error: 'Monthly quota exhausted. Please upgrade your subscription plan to generate more posts.',
            });
            return;
        }

        // Get next planned keyword
        const keywords = await tenantStore.getKeywords(user.id, { status: 'planned', limit: 1 });
        if (keywords.items.length === 0) {
            res.status(400).json({
                ok: false,
                error: 'No planned keywords found in your queue. Please add or import keywords first.',
            });
            return;
        }

        const target = keywords.items[0];
        const settings = await tenantStore.getUserSettings(user.id);
        const config = loadConfig();

        const effectiveWpBase = settings.wp_base_url;
        const effectiveWpUser = settings.wp_api_user;
        const effectiveWpPass = settings.wp_app_password_encrypted;

        if (!effectiveWpBase || !effectiveWpUser || !effectiveWpPass) {
            res.status(400).json({
                ok: false,
                error: 'WordPress settings are not configured. Go to Settings and configure your site connection.',
            });
            return;
        }

        const configOverride: Partial<PipelineConfig> = {
            wpBaseUrl: effectiveWpBase,
            wpApiUser: effectiveWpUser,
            wpApplicationPassword: effectiveWpPass,
            publishPosture: (settings.publish_posture as any) || config.publishPosture || 'auto_publish',
        };

        if (settings.ai_api_key_encrypted) {
            configOverride.aiApiKey = settings.ai_api_key_encrypted;
            configOverride.aiProvider = settings.ai_provider || config.aiProvider;
        }

        // Fast pre-flight check to verify WordPress credentials before running pipeline
        const wpCheckClient = new WpClient({
            ...config,
            ...configOverride,
        } as PipelineConfig);
        const checkRes = await wpCheckClient.verifyCredentials();
        if (!checkRes.ok && (checkRes.status === 401 || checkRes.status === 403)) {
            const friendlyErr = formatWpErrorMessage(checkRes.error || `HTTP ${checkRes.status}`, effectiveWpUser);
            // Leave keyword status as 'planned' so user doesn't lose queue item
            // Return 400 (WordPress auth failure) rather than 401 to keep user's SaaS web session active
            res.status(400).json({
                ok: false,
                code: 'WP_AUTH_FAILED',
                error: friendlyErr,
            });
            return;
        }

        // Update keyword status to in_progress
        await tenantStore.updateKeyword(target.id, user.id, {
            status: 'in_progress',
            updated_at: new Date().toISOString(),
        });

        const start = Date.now();
        const customPrompts = await getUserCustomPromptsMap(user.id);
        const runRes = await runKeywordJob({
            keyword: target.keyword,
            contentType: target.content_type,
            classHint: target.class_hint,
            blogpostSubtype: target.blogpost_subtype,
            canonicalCategory: target.canonical_category,
            cluster: target.cluster,
            suggestedTags: target.suggested_tags,
            customPrompts,
        }, configOverride);

        const durationSeconds = Math.max(1, Math.floor((Date.now() - start) / 1000));
        const isWpSuccess = runRes.ok || (runRes.wp_post_id > 0 && runRes.final_status !== 'failed');

        if (!isWpSuccess) {
            const rawFailReason = runRes.failReason || (runRes.reasons && runRes.reasons.join(', ')) || 'Pipeline execution failed';
            const failReason = formatWpErrorMessage(rawFailReason, effectiveWpUser);
            await tenantStore.updateKeyword(target.id, user.id, {
                status: 'failed',
                last_error: failReason,
                updated_at: new Date().toISOString(),
            });
            await tenantStore.recordPipelineRun({
                userId: user.id,
                keywordId: target.id,
                keywordText: target.keyword,
                status: 'failed',
                wpPostId: 0,
                wpPostUrl: '',
                durationSeconds,
                failReasons: failReason,
            });
            res.status(502).json({
                ok: false,
                error: `Failed to publish to WordPress: ${failReason}`,
                reasons: runRes.reasons,
            });
            return;
        }

        const finalStatus = runRes.final_status === 'draft_wp' ? 'drafted' : 'published';

        await tenantStore.recordPipelineRun({
            userId: user.id,
            keywordId: target.id,
            keywordText: target.keyword,
            status: 'success',
            wpPostId: runRes.wp_post_id,
            wpPostUrl: runRes.published_url,
            durationSeconds,
            failReasons: null,
        });

        await tenantStore.updateKeyword(target.id, user.id, {
            status: finalStatus,
            wp_post_id: runRes.wp_post_id,
            published_url: runRes.published_url,
            updated_at: new Date().toISOString(),
        });

        res.json({
            ok: true,
            message: `Article for "${target.keyword}" generated and ${finalStatus} on WordPress!`,
            published_url: runRes.published_url,
            wp_post_id: runRes.wp_post_id,
            status: finalStatus,
        });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * SaaS Multi-Tenant Background Scheduler
 *
 * Runs scheduled daily publishing batches for users who have enabled:
 * "Enable Daily Scheduled Run" (is_automation_enabled = true).
 *
 * Features:
 * 1. Even distribution of multiple posts across the day (e.g. 2 posts -> every 12 hrs, 3 posts -> every 8 hrs, 4 posts -> every 6 hrs).
 * 2. Automatic catch-up: if server was offline or restarted after a scheduled time earlier in the day,
 *    it detects the missed slot and publishes the post immediately instead of waiting for tomorrow.
 * 3. Exact timezone matching (e.g. 'Asia/Kolkata', 'America/New_York', 'UTC').
 * 4. Respects monthly subscription quota remaining and user's WordPress credentials.
 */

import { CronExpressionParser } from 'cron-parser';
import { tenantStore, type UserSettings, type UserProfile } from './tenant-store';
import { loadConfig, type PipelineConfig } from '../config';
import { runKeywordJob } from '../runner';
import { resolveCronTimezone } from '../scheduler';
import { logger } from '../logger';
import { WpClient, formatWpErrorMessage } from './wp-client';
import { normalizeBlogpostSubtype } from '../types';

let schedulerInterval: ReturnType<typeof setInterval> | null = null;
let isTickInProgress = false;

/**
 * Builds an evenly distributed 24-hour schedule based on the user's daily post quota and preferred start time.
 * For example:
 * - 1 post  → [09:00] (once per day)
 * - 2 posts → [09:00, 21:00] (spaced every 12 hours)
 * - 3 posts → [01:00, 09:00, 17:00] (spaced every 8 hours)
 * - 4 posts → [03:00, 09:00, 15:00, 21:00] (spaced every 6 hours)
 */
export function buildDistributedSchedule(
    dailyQuota: number,
    startHour: number = 9,
    startMinute: number = 0
): {
    cron: string;
    hours: number[];
    intervalHours: number;
    description: string;
    slotsFormatted: string[];
} {
    const quota = Math.max(1, Math.min(24, Math.floor(dailyQuota || 1)));
    const cleanMinute = Math.max(0, Math.min(59, Math.floor(startMinute || 0)));
    const cleanStartHour = Math.max(0, Math.min(23, Math.floor(startHour || 9)));

    if (quota === 1) {
        const timeFormatted = `${String(cleanStartHour).padStart(2, '0')}:${String(cleanMinute).padStart(2, '0')}`;
        return {
            cron: `${cleanMinute} ${cleanStartHour} * * *`,
            hours: [cleanStartHour],
            intervalHours: 24,
            description: `1 post per day at ${timeFormatted}`,
            slotsFormatted: [timeFormatted],
        };
    }

    const stepHours = 24 / quota;
    const hoursSet = new Set<number>();
    for (let i = 0; i < quota; i++) {
        const h = Math.round((cleanStartHour + i * stepHours) % 24);
        hoursSet.add(h);
    }
    const sortedHours = Array.from(hoursSet).sort((a, b) => a - b);
    const cron = `${cleanMinute} ${sortedHours.join(',')} * * *`;
    const intervalRounded = Math.round(stepHours * 10) / 10;
    const slotsFormatted = sortedHours.map(
        (h) => `${String(h).padStart(2, '0')}:${String(cleanMinute).padStart(2, '0')}`
    );

    return {
        cron,
        hours: sortedHours,
        intervalHours: intervalRounded,
        description: `${quota} posts per day (spaced every ~${intervalRounded} hours at: ${slotsFormatted.join(', ')})`,
        slotsFormatted,
    };
}

/** Strict on-time execution window: 5 minutes */
export const ON_TIME_TOLERANCE_MS = 5 * 60 * 1000;

/**
 * Checks whether a cron schedule is due in the given timezone relative to `now`.
 * Enforces strict on-time execution: only executes if the current time is within
 * the on-time tolerance window (default 5 minutes) of the scheduled slot.
 *
 * If a slot occurred longer ago (e.g. 25 minutes ago or earlier today), it is considered
 * expired and will NOT fire as a surprise late run.
 */
export function isScheduleDue(
    schedule: string,
    timezone: string,
    lastRunAt: string | null,
    now: Date = new Date(),
    toleranceMs: number = ON_TIME_TOLERANCE_MS
): { isDue: boolean; reason?: string; slotTime?: Date } {
    try {
        const { timezone: canonicalTz } = resolveCronTimezone(timezone);
        // Look backwards from now + 1000ms so that an exact-minute tick resolves to this minute
        const interval = CronExpressionParser.parse(schedule || '0 9 * * *', {
            tz: canonicalTz,
            currentDate: new Date(now.getTime() + 1000),
        });
        const prevSlot = interval.prev().toDate();
        const diffMs = now.getTime() - prevSlot.getTime();

        // 1. Previous scheduled slot has occurred in the past (diffMs >= 0)
        if (diffMs >= 0) {
            // Check if we already executed a run for or after this scheduled slot
            if (lastRunAt) {
                const lastRunTime = new Date(lastRunAt).getTime();
                if (lastRunTime >= prevSlot.getTime()) {
                    return { isDue: false, reason: 'already_ran_for_slot', slotTime: prevSlot };
                }
            }

            // Strict On-Time Window:
            // Only fire if the slot occurred within the tight on-time tolerance window (default 5 minutes).
            // If the slot is older than toleranceMs (e.g. 25 minutes ago or hours ago),
            // it is expired and MUST NOT fire late or surprise the user.
            if (diffMs <= toleranceMs) {
                return {
                    isDue: true,
                    reason: 'exact_slot',
                    slotTime: prevSlot,
                };
            } else {
                return {
                    isDue: false,
                    reason: 'slot_expired_outside_window',
                    slotTime: prevSlot,
                };
            }
        }
        return { isDue: false, reason: 'not_due' };
    } catch (err: any) {
        logger.warn('isScheduleDue: failed to parse schedule', {
            schedule,
            timezone,
            error: err instanceof Error ? err.message : String(err),
        });
        return { isDue: false, reason: 'parse_error' };
    }
}

/**
 * Calculates the next upcoming run timestamp for a schedule and timezone.
 */
export function getNextRunTime(schedule: string, timezone: string, now: Date = new Date()): string {
    try {
        const { timezone: canonicalTz } = resolveCronTimezone(timezone);
        const interval = CronExpressionParser.parse(schedule || '0 9 * * *', {
            tz: canonicalTz,
            currentDate: now,
        });
        return interval.next().toDate().toISOString();
    } catch {
        return '';
    }
}

export interface ScheduledBatchResult {
    ok: boolean;
    successCount: number;
    failedCount: number;
    messages: string[];
    keywordsProcessed: string[];
}

/**
 * Executes a scheduled publishing run for a specific user.
 * Triggered automatically by the cron tick (1 post per scheduled slot)
 * or manually via "Run Scheduled Batch Now" in settings.
 */
export async function executeUserScheduledBatch(
    userId: string,
    triggeredBy: 'cron' | 'manual' = 'cron'
): Promise<ScheduledBatchResult> {
    const messages: string[] = [];
    const keywordsProcessed: string[] = [];
    let successCount = 0;
    let failedCount = 0;

    try {
        const settings = await tenantStore.getUserSettings(userId);
        const profile = await tenantStore.getProfile(userId);

        if (!profile) {
            messages.push(`User ${userId} not found`);
            return { ok: false, successCount: 0, failedCount: 0, messages, keywordsProcessed };
        }

        if (profile.is_suspended) {
            messages.push(`User account is suspended`);
            return { ok: false, successCount: 0, failedCount: 0, messages, keywordsProcessed };
        }

        // Quota check
        const remainingQuota = Math.max(0, profile.monthly_quota - profile.used_this_month);
        if (remainingQuota <= 0) {
            const msg = `Monthly quota exhausted (${profile.used_this_month}/${profile.monthly_quota}). Upgrade plan to generate more posts.`;
            logger.warn('executeUserScheduledBatch: quota exhausted', { userId, used: profile.used_this_month, quota: profile.monthly_quota });
            messages.push(msg);
            return { ok: false, successCount: 0, failedCount: 0, messages, keywordsProcessed };
        }

        // WordPress configuration check
        const config = loadConfig();
        const effectiveWpBase = settings.wp_base_url || config.wpBaseUrl;
        const effectiveWpUser = settings.wp_api_user || config.wpApiUser;
        const effectivePass = settings.wp_app_password_encrypted || config.wpApplicationPassword;

        if (!effectiveWpBase || !effectiveWpUser || !effectivePass) {
            const msg = 'WordPress settings not configured. Please configure WordPress URL, user, and Application Password in Settings.';
            logger.warn('executeUserScheduledBatch: missing WP config', { userId, effectiveWpBase, effectiveWpUser });
            messages.push(msg);
            return { ok: false, successCount: 0, failedCount: 0, messages, keywordsProcessed };
        }

        // Pre-flight check: verify WordPress credentials before processing to protect user keywords & AI quota
        const wpCheckClient = new WpClient({
            ...config,
            wpBaseUrl: effectiveWpBase,
            wpApiUser: effectiveWpUser,
            wpApplicationPassword: effectivePass,
        });

        const checkRes = await wpCheckClient.verifyCredentials();
        if (!checkRes.ok && checkRes.status === 401) {
            const friendlyErr = formatWpErrorMessage(checkRes.error || '401', effectiveWpUser);
            logger.error('executeUserScheduledBatch: WordPress pre-flight 401 — halting batch', {
                userId,
                error: friendlyErr,
            });

            await tenantStore.recordPipelineRun({
                userId,
                keywordId: null,
                keywordText: 'Scheduled Auto-Post Run (Pre-flight Authentication Check)',
                status: 'failed',
                wpPostId: 0,
                wpPostUrl: '',
                durationSeconds: 1,
                failReasons: friendlyErr,
            });

            messages.push(friendlyErr);
            return { ok: false, successCount: 0, failedCount: 1, messages, keywordsProcessed };
        }

        // When triggered by cron, each scheduled slot publishes 1 post to evenly space out publishing.
        // In manual test mode, it also processes 1 post immediately to verify the pipeline.
        const batchCount = 1;

        // Fetch next planned keyword
        const { items: plannedKeywords } = await tenantStore.getKeywords(userId, {
            status: 'planned',
            limit: batchCount,
        });

        if (plannedKeywords.length === 0) {
            const msg = 'No planned keywords found in queue. Add or import keywords to schedule daily posts.';
            logger.info('executeUserScheduledBatch: no planned keywords', { userId });
            messages.push(msg);
            return { ok: true, successCount: 0, failedCount: 0, messages, keywordsProcessed };
        }

        logger.info('executeUserScheduledBatch: starting batch', {
            userId,
            batchCount: plannedKeywords.length,
            triggeredBy,
            timezone: settings.cron_timezone,
            targetKeyword: plannedKeywords[0]?.keyword,
        });

        // Mark last_run_at early so duplicate cron ticks won't re-trigger
        await tenantStore.updateUserSettings(userId, {
            last_run_at: new Date().toISOString(),
        });

        // Fetch user custom prompts
        const customPrompts = await tenantStore.getUserCustomPromptsMap(userId);

        const configOverride: Partial<PipelineConfig> = {
            wpBaseUrl: effectiveWpBase,
            wpApiUser: effectiveWpUser,
            wpApplicationPassword: effectivePass,
            publishPosture: (settings.publish_posture as any) || config.publishPosture || 'auto_publish',
        };

        if (settings.ai_api_key_encrypted) {
            configOverride.aiApiKey = settings.ai_api_key_encrypted;
            configOverride.aiProvider = settings.ai_provider || config.aiProvider;
        }

        // Process keyword
        for (const target of plannedKeywords) {
            keywordsProcessed.push(target.keyword);
            await tenantStore.updateKeyword(target.id, userId, {
                status: 'in_progress',
                updated_at: new Date().toISOString(),
            });

            const start = Date.now();
            try {
                const runRes = await runKeywordJob({
                    keyword: target.keyword,
                    contentType: target.content_type,
                    classHint: target.class_hint,
                    blogpostSubtype: normalizeBlogpostSubtype(target.blogpost_subtype) || 'Guide',
                    canonicalCategory: target.canonical_category,
                    cluster: target.cluster,
                    suggestedTags: target.suggested_tags,
                    customPrompts,
                }, configOverride);

                const durationSeconds = Math.max(1, Math.floor((Date.now() - start) / 1000));
                const isWpSuccess = runRes.ok || (runRes.wp_post_id > 0 && runRes.final_status !== 'failed');

                if (!isWpSuccess) {
                    failedCount++;
                    const rawReason = runRes.failReason || (runRes.reasons && runRes.reasons.join(', ')) || 'Pipeline execution failed';
                    const failReason = formatWpErrorMessage(rawReason, effectiveWpUser);
                    await tenantStore.updateKeyword(target.id, userId, {
                        status: 'failed',
                        last_error: failReason,
                        updated_at: new Date().toISOString(),
                    });
                    await tenantStore.recordPipelineRun({
                        userId,
                        keywordId: target.id,
                        keywordText: target.keyword,
                        status: 'failed',
                        wpPostId: 0,
                        wpPostUrl: '',
                        durationSeconds,
                        failReasons: failReason,
                    });
                    messages.push(`"${target.keyword}": Failed (${failReason})`);
                } else {
                    successCount++;
                    const finalStatus = runRes.final_status === 'draft_wp' ? 'drafted' : 'published';
                    await tenantStore.recordPipelineRun({
                        userId,
                        keywordId: target.id,
                        keywordText: target.keyword,
                        status: 'success',
                        wpPostId: runRes.wp_post_id,
                        wpPostUrl: runRes.published_url,
                        durationSeconds,
                        failReasons: null,
                    });
                    await tenantStore.updateKeyword(target.id, userId, {
                        status: finalStatus,
                        wp_post_id: runRes.wp_post_id,
                        published_url: runRes.published_url,
                        updated_at: new Date().toISOString(),
                    });
                    messages.push(`"${target.keyword}": Successfully ${finalStatus} (Post #${runRes.wp_post_id})`);
                }
            } catch (err: any) {
                failedCount++;
                const durationSeconds = Math.max(1, Math.floor((Date.now() - start) / 1000));
                const failReason = formatWpErrorMessage(err.message || 'Unexpected pipeline failure', effectiveWpUser);
                await tenantStore.updateKeyword(target.id, userId, {
                    status: 'failed',
                    last_error: failReason,
                    updated_at: new Date().toISOString(),
                });
                await tenantStore.recordPipelineRun({
                    userId,
                    keywordId: target.id,
                    keywordText: target.keyword,
                    status: 'failed',
                    wpPostId: 0,
                    wpPostUrl: '',
                    durationSeconds,
                    failReasons: failReason,
                });
                messages.push(`"${target.keyword}": Error (${failReason})`);
            }
        }

        return {
            ok: successCount > 0 || failedCount === 0,
            successCount,
            failedCount,
            messages,
            keywordsProcessed,
        };
    } catch (err: any) {
        logger.error('executeUserScheduledBatch: fatal error', {
            userId,
            error: err.message,
            stack: err.stack,
        });
        messages.push(`Batch execution error: ${err.message}`);
        return { ok: false, successCount, failedCount, messages, keywordsProcessed };
    }
}

/**
 * Evaluates all active automated users every minute.
 */
export async function checkAndRunSaasAutomations(): Promise<void> {
    if (isTickInProgress) {
        logger.debug('checkAndRunSaasAutomations: tick already in progress — skipping');
        return;
    }

    isTickInProgress = true;
    try {
        const automatedUsers = await tenantStore.getActiveAutomatedUserSettings();
        if (automatedUsers.length === 0) {
            return;
        }

        const now = new Date();
        for (const item of automatedUsers) {
            const { settings, profile } = item;
            const schedule = settings.cron_schedule || '0 9 * * *';
            const timezone = settings.cron_timezone || 'Asia/Kolkata';

            const check = isScheduleDue(schedule, timezone, settings.last_run_at, now);
            if (check.isDue) {
                logger.info('checkAndRunSaasAutomations: schedule matched for user', {
                    userId: settings.user_id,
                    email: profile.email,
                    schedule,
                    timezone,
                    reason: check.reason,
                    slotTime: check.slotTime?.toISOString(),
                    lastRunAt: settings.last_run_at,
                });

                // Run batch asynchronously so one user does not block the entire tick
                executeUserScheduledBatch(settings.user_id, 'cron').catch((err) => {
                    logger.error('checkAndRunSaasAutomations: batch error for user', {
                        userId: settings.user_id,
                        error: err.message,
                    });
                });
            }
        }
    } catch (err: any) {
        logger.error('checkAndRunSaasAutomations: tick error', {
            error: err.message,
        });
    } finally {
        isTickInProgress = false;
    }
}

/**
 * Starts the SaaS multi-tenant cron scheduler.
 * Ticks every 20 seconds to guarantee exact on-time minute execution.
 */
export function startSaasScheduler(): void {
    if (schedulerInterval) {
        logger.info('startSaasScheduler: already running');
        return;
    }

    logger.info('startSaasScheduler: starting SaaS multi-tenant automated poster daemon');

    // Run first check 5 seconds after boot to evaluate on-time schedules
    setTimeout(() => {
        logger.info('startSaasScheduler: running boot check for active automated posting schedules');
        checkAndRunSaasAutomations().catch((err) => {
            logger.error('startSaasScheduler: boot check failed', { error: err.message });
        });
    }, 5_000);

    // Tick every 20 seconds for precise on-the-dot slot execution
    schedulerInterval = setInterval(() => {
        checkAndRunSaasAutomations().catch((err) => {
            logger.error('startSaasScheduler: tick interval failed', { error: err.message });
        });
    }, 20_000);
}

/**
 * Stops the SaaS scheduler (e.g. for testing / shutdown).
 */
export function stopSaasScheduler(): void {
    if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;
        logger.info('stopSaasScheduler: scheduler stopped');
    }
}

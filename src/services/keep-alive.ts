/**
 * Keep-Alive Service
 *
 * Prevents cloud instances (e.g. Render, Railway free tiers) from spinning down
 * due to 15 minutes of HTTP inactivity.
 *
 * Automatically pings the server's /health endpoint every 9 minutes.
 */

import { logger } from '../logger';

let keepAliveTimer: NodeJS.Timeout | null = null;

export function startKeepAlive(): void {
    if (keepAliveTimer) {
        return;
    }

    // Render automatically exposes RENDER_EXTERNAL_URL (e.g. https://your-app.onrender.com)
    // Custom deployments can set APP_URL or KEEP_ALIVE_URL
    const externalUrl = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL || process.env.KEEP_ALIVE_URL;
    const isRender = Boolean(process.env.RENDER || process.env.RENDER_EXTERNAL_URL);

    // If on Render or external URL provided, run the keep-alive pinger
    const targetUrl = externalUrl
        ? `${externalUrl.replace(/\/$/, '')}/health`
        : 'http://localhost:3100/health';

    logger.info('startKeepAlive: initializing keep-alive heartbeat to prevent cloud spin-down', {
        targetUrl,
        isRender,
        intervalMinutes: 9,
    });

    // Ping every 9 minutes (Render spins down after 15 minutes of inactivity)
    const PING_INTERVAL_MS = 9 * 60 * 1000;

    // Send first ping after 1 minute to verify connectivity
    setTimeout(() => {
        pingHealth(targetUrl);
    }, 60_000);

    keepAliveTimer = setInterval(() => {
        pingHealth(targetUrl);
    }, PING_INTERVAL_MS);
}

async function pingHealth(targetUrl: string): Promise<void> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10_000);
        const res = await fetch(targetUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        logger.debug('keepAlive: health ping successful', { status: res.status, targetUrl });
    } catch (err: any) {
        logger.debug('keepAlive: health ping note', { error: err.message, targetUrl });
    }
}

export function stopKeepAlive(): void {
    if (keepAliveTimer) {
        clearInterval(keepAliveTimer);
        keepAliveTimer = null;
        logger.info('stopKeepAlive: keep-alive heartbeat stopped');
    }
}


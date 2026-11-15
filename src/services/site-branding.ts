/**
 * Site Branding & Dynamic Prompt Interpolation Service.
 *
 * Automatically extracts site brand name, domain, URL, and thumbnail watermark
 * from the user's configured WordPress base URL.
 *
 * Replaces dynamic placeholders (${siteName}, ${siteUrl}, ${watermark}, ${domain})
 * as well as legacy hardcoded site mentions across all prompt templates and image briefs.
 */

export interface SiteBranding {
    siteUrl: string;
    domain: string;
    siteName: string;
    watermarkText: string;
}

/**
 * Derives clean site branding from a WordPress URL.
 * E.g. "https://indianscope.com" -> { siteUrl: "https://indianscope.com", domain: "indianscope.com", siteName: "IndianScope.com", watermarkText: "INDIANSCOPE.COM" }
 * E.g. "https://travel-blog.in/wp" -> { siteUrl: "https://travel-blog.in/wp", domain: "travel-blog.in", siteName: "Travel-Blog.in", watermarkText: "TRAVEL-BLOG.IN" }
 */
export function extractSiteBranding(rawUrl?: string | null): SiteBranding {
    if (!rawUrl || !rawUrl.trim()) {
        return {
            siteUrl: 'https://example.com',
            domain: 'example.com',
            siteName: 'Your Website',
            watermarkText: 'YOURWEBSITE.COM',
        };
    }

    let clean = rawUrl.trim().replace(/\/+$/, '');
    try {
        if (!/^https?:\/\//i.test(clean)) {
            clean = 'https://' + clean;
        }
        const parsed = new URL(clean);
        const host = parsed.hostname.replace(/^www\./i, '');
        
        // Capitalize domain components for natural branding (e.g. indianscope.com -> IndianScope.com)
        const parts = host.split('.');
        const capitalized = parts
            .map((p) => (p.length > 0 ? p.charAt(0).toUpperCase() + p.slice(1) : p))
            .join('.');

        return {
            siteUrl: clean,
            domain: host,
            siteName: capitalized || host,
            watermarkText: host.toUpperCase(),
        };
    } catch {
        const raw = clean.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
        return {
            siteUrl: clean,
            domain: raw || 'example.com',
            siteName: raw || 'Your Website',
            watermarkText: (raw || 'YOURWEBSITE.COM').toUpperCase(),
        };
    }
}

/**
 * Replaces dynamic variables and legacy hardcoded site names in prompt text.
 *
 * Supported variables:
 * - ${siteName} or {{SITE_NAME}} -> e.g. "IndianScope.com"
 * - ${siteUrl} or {{SITE_URL}} -> e.g. "https://indianscope.com"
 * - ${domain} or {{SITE_DOMAIN}} -> e.g. "indianscope.com"
 * - ${watermark} or {{WATERMARK}} -> e.g. "INDIANSCOPE.COM"
 *
 * Also safely replaces any legacy hardcoded site mentions so old templates automatically modernize.
 */
export function interpolatePromptWithSite(promptText: string, branding: SiteBranding): string {
    if (!promptText || typeof promptText !== 'string') return '';

    return promptText
        // Modern template placeholders
        .replace(/\$\{(?:siteName|site_name)\}/gi, branding.siteName)
        .replace(/\{\{(?:SITE_NAME|site_name)\}\}/gi, branding.siteName)
        .replace(/\$\{(?:siteUrl|site_url)\}/gi, branding.siteUrl)
        .replace(/\{\{(?:SITE_URL|site_url)\}\}/gi, branding.siteUrl)
        .replace(/\$\{(?:domain|siteDomain)\}/gi, branding.domain)
        .replace(/\{\{(?:SITE_DOMAIN|domain)\}\}/gi, branding.domain)
        .replace(/\$\{(?:watermark|watermarkText)\}/gi, branding.watermarkText)
        .replace(/\{\{(?:WATERMARK|watermark_text)\}\}/gi, branding.watermarkText)
        // Auto-replace legacy hardcoded site mentions
        .replace(/INDIANSCOPE\.COM/g, branding.watermarkText)
        .replace(/IndianScope\.com/gi, branding.siteName)
        .replace(/indianscope\.com/gi, branding.domain);
}


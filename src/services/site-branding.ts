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
 * Normalizes raw WordPress site URLs:
 * - Fixes malformed protocol slashes (e.g. "https:/rtizy.com", "http:/site.org", "https:///site.com")
 * - Prepends "https://" if missing (e.g. "rtizy.com")
 * - Strips trailing slashes
 */
export function normalizeSiteUrl(rawUrl?: string | null): string {
    if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) return '';
    let clean = rawUrl.trim();

    // Fix malformed protocol slashes (e.g. https:/ -> https://, http:/ -> http://, https:/// -> https://)
    clean = clean.replace(/^(https?):\/+/i, '$1://');

    // If no protocol was provided (e.g. "rtizy.com" or "//rtizy.com"), default to https://
    if (!/^https?:\/\//i.test(clean)) {
        clean = 'https://' + clean.replace(/^\/+/, '');
    }

    // Strip trailing slashes
    return clean.replace(/\/+$/, '');
}

/**
 * Formats a hostname into a natural, professional brand display name:
 * - Capitalizes brand parts and hyphenated sub-words (e.g. "rtizy" -> "Rtizy", "travel-blog" -> "Travel-Blog")
 * - Keeps standard TLDs lowercase (e.g. ".com", ".in", ".co.uk")
 * E.g. "rtizy.com" -> "Rtizy.com"
 * E.g. "travel-blog.in" -> "Travel-Blog.in"
 * E.g. "myblog.co.uk" -> "Myblog.co.uk"
 */
export function formatBrandDomain(host: string): string {
    if (!host) return 'YourWebsite.com';
    const parts = host.split('.');
    if (parts.length <= 1) {
        return host.charAt(0).toUpperCase() + host.slice(1);
    }

    const isCcTld = parts.length > 2 && ['co', 'com', 'org', 'net', 'gov', 'edu', 'ac'].includes(parts[parts.length - 2].toLowerCase());
    const tldCount = isCcTld ? 2 : 1;
    const brandParts = parts.slice(0, parts.length - tldCount);
    const tldParts = parts.slice(parts.length - tldCount);

    const formattedBrand = brandParts.map(part => {
        return part
            .split('-')
            .map(sub => (sub.length > 0 ? sub.charAt(0).toUpperCase() + sub.slice(1) : sub))
            .join('-');
    }).join('.');

    const formattedTld = tldParts.map(p => p.toLowerCase()).join('.');
    return `${formattedBrand}.${formattedTld}`;
}

/**
 * Derives clean site branding from a WordPress URL.
 * E.g. "https:/rtizy.com" -> { siteUrl: "https://rtizy.com", domain: "rtizy.com", siteName: "Rtizy.com", watermarkText: "Rtizy.com" }
 * E.g. "https://indianscope.com" -> { siteUrl: "https://indianscope.com", domain: "indianscope.com", siteName: "IndianScope.com", watermarkText: "IndianScope.com" }
 * E.g. "https://travel-blog.in/wp" -> { siteUrl: "https://travel-blog.in/wp", domain: "travel-blog.in", siteName: "Travel-Blog.in", watermarkText: "Travel-Blog.in" }
 */
export function extractSiteBranding(rawUrl?: string | null): SiteBranding {
    const clean = normalizeSiteUrl(rawUrl);
    if (!clean) {
        return {
            siteUrl: 'https://example.com',
            domain: 'example.com',
            siteName: 'Your Website',
            watermarkText: 'YourWebsite.com',
        };
    }

    try {
        const parsed = new URL(clean);
        let host = parsed.hostname.replace(/^www\./i, '');

        // Safety fallback: if hostname is empty or erroneously "https" / "http"
        if (!host || host.toLowerCase() === 'https' || host.toLowerCase() === 'http') {
            const rawAfterProto = clean.replace(/^https?:\/*|^ftps?:\/*|^\/+/i, '').replace(/^www\./i, '');
            host = rawAfterProto.split('/')[0].split(':')[0] || 'example.com';
        }

        const formatted = formatBrandDomain(host);

        return {
            siteUrl: clean,
            domain: host,
            siteName: formatted || host,
            watermarkText: formatted || host,
        };
    } catch {
        const raw = clean.replace(/^https?:\/*|^ftps?:\/*|^\/+/i, '').replace(/^www\./i, '').split('/')[0].split(':')[0];
        const formatted = formatBrandDomain(raw || 'example.com');

        return {
            siteUrl: clean,
            domain: raw || 'example.com',
            siteName: formatted || raw || 'Your Website',
            watermarkText: formatted || raw || 'YourWebsite.com',
        };
    }
}

/**
 * Replaces dynamic variables and legacy hardcoded site names in prompt text.
 *
 * Supported variables:
 * - ${siteName} or {{SITE_NAME}} -> e.g. "Rtizy.com"
 * - ${siteUrl} or {{SITE_URL}} -> e.g. "https://rtizy.com"
 * - ${domain} or {{SITE_DOMAIN}} -> e.g. "rtizy.com"
 * - ${watermark} or {{WATERMARK}} -> e.g. "Rtizy.com"
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
        .replace(/INDIANSCOPE\.COM/g, branding.watermarkText.toUpperCase())
        .replace(/IndianScope\.com/gi, branding.siteName)
        .replace(/indianscope\.com/gi, branding.domain);
}


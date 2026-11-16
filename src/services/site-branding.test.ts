import { describe, it, expect } from 'vitest';
import { normalizeSiteUrl, extractSiteBranding, interpolatePromptWithSite } from './site-branding';

describe('site-branding service', () => {
    describe('normalizeSiteUrl', () => {
        it('fixes single-slash protocol https:/rtizy.com', () => {
            expect(normalizeSiteUrl('https:/rtizy.com')).toBe('https://rtizy.com');
        });

        it('fixes single-slash protocol http:/rtizy.com', () => {
            expect(normalizeSiteUrl('http:/rtizy.com')).toBe('http://rtizy.com');
        });

        it('fixes triple-slash protocol https:///rtizy.com', () => {
            expect(normalizeSiteUrl('https:///rtizy.com')).toBe('https://rtizy.com');
        });

        it('adds https:// if protocol is omitted', () => {
            expect(normalizeSiteUrl('rtizy.com')).toBe('https://rtizy.com');
            expect(normalizeSiteUrl('www.rtizy.com')).toBe('https://www.rtizy.com');
        });

        it('trims trailing slashes', () => {
            expect(normalizeSiteUrl('https://rtizy.com///')).toBe('https://rtizy.com');
            expect(normalizeSiteUrl('https:/rtizy.com/wp/')).toBe('https://rtizy.com/wp');
        });

        it('handles empty or null values', () => {
            expect(normalizeSiteUrl('')).toBe('');
            expect(normalizeSiteUrl(null)).toBe('');
            expect(normalizeSiteUrl(undefined)).toBe('');
        });
    });

    describe('extractSiteBranding', () => {
        it('correctly extracts Rtizy.com from https:/rtizy.com (user issue)', () => {
            const branding = extractSiteBranding('https:/rtizy.com');
            expect(branding.siteUrl).toBe('https://rtizy.com');
            expect(branding.domain).toBe('rtizy.com');
            expect(branding.siteName).toBe('Rtizy.com');
            expect(branding.watermarkText).toBe('Rtizy.com');
        });

        it('correctly extracts Rtizy.com from https://rtizy.com', () => {
            const branding = extractSiteBranding('https://rtizy.com');
            expect(branding.domain).toBe('rtizy.com');
            expect(branding.watermarkText).toBe('Rtizy.com');
        });

        it('handles subdomains and paths', () => {
            const branding = extractSiteBranding('https:/travel-blog.in/wp');
            expect(branding.domain).toBe('travel-blog.in');
            expect(branding.siteName).toBe('Travel-Blog.in');
            expect(branding.watermarkText).toBe('Travel-Blog.in');
        });

        it('handles blank/empty input safely', () => {
            const branding = extractSiteBranding('');
            expect(branding.domain).toBe('example.com');
            expect(branding.watermarkText).toBe('YourWebsite.com');
        });
    });

    describe('interpolatePromptWithSite', () => {
        it('interpolates ${watermark} and ${siteName}', () => {
            const branding = extractSiteBranding('https:/rtizy.com');
            const prompt = 'Add top-right pill watermark "${watermark}" for site ${siteName}.';
            const result = interpolatePromptWithSite(prompt, branding);
            expect(result).toBe('Add top-right pill watermark "Rtizy.com" for site Rtizy.com.');
        });

        it('interpolates legacy {{WATERMARK}} and ${watermarkText}', () => {
            const branding = extractSiteBranding('https://myblog.co.uk');
            const prompt = 'Watermark: {{WATERMARK}}, Host: ${domain}';
            const result = interpolatePromptWithSite(prompt, branding);
            expect(result).toBe('Watermark: Myblog.co.uk, Host: myblog.co.uk');
        });
    });
});

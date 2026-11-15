/**
 * WordPress REST API client.
 * Ref: 12_WORDPRESS_INTEGRATION §6.2, §6.3, §6.4, §6.7
 *
 * ALWAYS-DRAFT posture: posts created as draft only.
 * Retry: 3 retries for network/timeout (backoff 2s,4s,8s). No retry on 4xx.
 * Auth: Application Passwords (Basic Auth).
 * Secrets: never logged (14_SECURITY_PRIVACY §6.2).
 */

import { logger } from "../logger";
import type { PipelineConfig } from "../config";

export interface WpPostPayload {
	title: string;
	content: string;
	excerpt: string;
	slug: string;
	status: "draft" | "publish";
	categories: number[];
	tags?: number[];
	featured_media?: number;
	meta?: Record<string, string>;
	rank_math_seo?: Record<string, string>;
}

export interface WpPostResponse {
	id: number;
	slug: string;
	link: string;
	status: string;
	meta?: Record<string, unknown>;
}

export interface WpMediaResponse {
	id: number;
	source_url: string;
	slug: string;
}

export function formatWpErrorMessage(rawError?: string | null, username?: string): string {
	if (!rawError) return "WordPress operation failed";
	const lower = rawError.toLowerCase();
	const userMsg = username ? ` for user "${username}"` : "";

	if (
		lower.includes("401") ||
		lower.includes("incorrect_password") ||
		lower.includes("invalid application password") ||
		lower.includes("unauthorized")
	) {
		return `WordPress Authentication Failed (401): The Application Password${userMsg} is invalid, expired, or was revoked in WordPress. In WordPress Admin, go to Users > Profile > Application Passwords, generate a new password, and save it in Settings.`;
	}

	if (
		lower.includes("403") ||
		lower.includes("rest_cannot_create") ||
		lower.includes("forbidden")
	) {
		return `WordPress Permission Denied (403): User account${userMsg} does not have Editor or Administrator permission to publish articles on WordPress.`;
	}

	if (
		lower.includes("enotfound") ||
		lower.includes("econnrefused") ||
		lower.includes("timeout") ||
		lower.includes("fetch failed")
	) {
		return "WordPress Connection Error: Unable to connect to the site. Please check that your WordPress URL is correct, online, and publicly accessible.";
	}

	return rawError;
}

const RETRY_DELAYS = [2000, 4000, 8000];

export class WpClient {
	private baseUrl: string;
	private authHeader: string;
	private altAuthHeader?: string;

	constructor(config: PipelineConfig) {
		this.baseUrl = (config.wpBaseUrl || "").replace(/\/+$/, "");
		// Basic Auth with Application Password (§6.3)
		// Clean and trim user and application password to avoid header corruption
		const cleanUser = (config.wpApiUser || "").trim().replace(/^['"]|['"]$/g, "");
		const cleanPass = (config.wpApplicationPassword || "").trim().replace(/^['"]|['"]$/g, "");
		this.authHeader =
			"Basic " +
			Buffer.from(
				`${cleanUser}:${cleanPass}`,
			).toString("base64");

		// Alternate format: if password contains spaces, try without spaces.
		// If password has no spaces and is 16-24 chars, try with 4-char spaced chunks.
		if (cleanPass.includes(" ")) {
			const noSpaces = cleanPass.replace(/\s+/g, "");
			this.altAuthHeader = "Basic " + Buffer.from(`${cleanUser}:${noSpaces}`).toString("base64");
		} else if (/^[a-zA-Z0-9]{16,24}$/.test(cleanPass)) {
			const withSpaces = cleanPass.match(/.{1,4}/g)?.join(" ") || "";
			if (withSpaces && withSpaces !== cleanPass) {
				this.altAuthHeader = "Basic " + Buffer.from(`${cleanUser}:${withSpaces}`).toString("base64");
			}
		}
	}

	private async fetchWithRetry(
		url: string,
		init: RequestInit,
		retries: number = 3,
	): Promise<Response> {
		for (let attempt = 0; attempt <= retries; attempt++) {
			try {
				const response = await fetch(url, init);

				// If 401 with primary credentials and an alternate format exists (e.g. spaces vs no spaces), try alternate once
				if (response.status === 401 && this.altAuthHeader) {
					logger.info("WP API 401 — attempting alternate password format (spaces / no-spaces fallback)");
					const altInit = {
						...init,
						headers: {
							...(init.headers || {}),
							Authorization: this.altAuthHeader,
						},
					};
					try {
						const altResp = await fetch(url, altInit);
						if (altResp.ok) {
							logger.info("WP API authentication succeeded with alternate password format!");
							this.authHeader = this.altAuthHeader;
							this.altAuthHeader = undefined;
							return altResp;
						}
					} catch {
						// ignore and return original 401
					}
				}

				// 4xx: no retry, fail immediately (§6.3.7)
				if (response.status >= 400 && response.status < 500) {
					logger.warn(`WP API ${response.status} — no retry`, {
						url,
						status: response.status,
					});
					return response;
				}

				// Success
				if (response.ok) return response;

				// 5xx: retry
				if (attempt < retries) {
					const delay = RETRY_DELAYS[attempt] || 8000;
					logger.warn(
						`WP API ${response.status} — retrying in ${delay}ms`,
						{
							attempt: attempt + 1,
						},
					);
					await new Promise((r) => setTimeout(r, delay));
					continue;
				}

				return response;
			} catch (err) {
				if (attempt < retries) {
					const delay = RETRY_DELAYS[attempt] || 8000;
					logger.warn(
						`WP API network error — retrying in ${delay}ms`,
						{
							attempt: attempt + 1,
						},
					);
					await new Promise((r) => setTimeout(r, delay));
					continue;
				}
				throw err;
			}
		}

		throw new Error("WP API: max retries exceeded");
	}

	/**
	 * Generic request to any WP REST endpoint.
	 */
	async genericRequest(
		method: "GET" | "POST" | "PUT" | "DELETE",
		path: string,
		body?: any,
	): Promise<{ ok: boolean; data?: any; status: number; error?: string }> {
		const url = `${this.baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
		try {
			const resp = await this.fetchWithRetry(url, {
				method,
				headers: this.headers(),
				body: body ? JSON.stringify(body) : undefined,
			});

			if (!resp.ok) {
				const errText = await resp.text();
				return { ok: false, status: resp.status, error: errText };
			}

			const data = await resp.json();
			return { ok: true, data, status: resp.status };
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			return { ok: false, status: 0, error: msg };
		}
	}

	/**
	 * Verify that the WordPress credentials can authenticate with the REST API.
	 * Quick pre-flight check before running long LLM generation pipelines.
	 */
	async verifyCredentials(): Promise<{ ok: boolean; status: number; user?: any; error?: string }> {
		const url = `${this.baseUrl}/wp-json/wp/v2/users/me`;
		try {
			const resp = await this.fetchWithRetry(url, {
				method: "GET",
				headers: this.headers(),
			});

			if (resp.ok) {
				const user = await resp.json();
				return { ok: true, status: resp.status, user };
			}

			const errText = await resp.text();
			return { ok: false, status: resp.status, error: errText };
		} catch (err: any) {
			const msg = err instanceof Error ? err.message : String(err);
			return { ok: false, status: 0, error: msg };
		}
	}

	private headers(): Record<string, string> {
		return {
			Authorization: this.authHeader,
			"Content-Type": "application/json",
			Accept: "application/json",
			"User-Agent": "WPContentAutopilot/1.0",
		};
	}

	/**
	 * Create a post. Status is determined by the caller (Stage 6) based on
	 * PUBLISH_POSTURE. Defaults to 'draft' if status is not provided.
	 * Ref: 12_WORDPRESS_INTEGRATION §6.2(1)
	 */
	async createDraft(payload: WpPostPayload): Promise<{
		ok: boolean;
		data?: WpPostResponse;
		status: number;
		error?: string;
	}> {
		// Status comes from caller (Stage 6 posture logic). Default to 'draft' for safety.
		const body = { ...payload, status: payload.status || "draft" };

		const url = `${this.baseUrl}/wp-json/wp/v2/posts`;
		logger.info("WP: creating post", {
			slug: body.slug,
			wp_status: body.status,
		});

		try {
			const resp = await this.fetchWithRetry(url, {
				method: "POST",
				headers: this.headers(),
				body: JSON.stringify(body),
			});

			if (!resp.ok) {
				const errText = await resp.text();
				logger.error("WP: draft creation failed", {
					status: resp.status,
					error: errText.slice(0, 300),
				});
				return { ok: false, status: resp.status, error: errText };
			}

			const data = (await resp.json()) as WpPostResponse;
			logger.info("WP: draft created", {
				wp_post_id: data.id,
				slug: data.slug,
			});
			return { ok: true, data, status: resp.status };
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			logger.error("WP: draft creation network error");
			return { ok: false, status: 0, error: msg };
		}
	}

	/**
	 * Update existing post.
	 * Ref: 12_WORDPRESS_INTEGRATION §6.2(2,3)
	 */
	async updatePost(
		postId: number,
		payload: Partial<WpPostPayload>,
	): Promise<{
		ok: boolean;
		data?: WpPostResponse;
		status: number;
		error?: string;
	}> {
		const url = `${this.baseUrl}/wp-json/wp/v2/posts/${postId}`;
		logger.info("WP: updating post", { wp_post_id: postId });

		try {
			const resp = await this.fetchWithRetry(url, {
				method: "PUT",
				headers: this.headers(),
				body: JSON.stringify(payload),
			});

			if (!resp.ok) {
				const errText = await resp.text();
				logger.error("WP: update failed", { status: resp.status });
				return { ok: false, status: resp.status, error: errText };
			}

			const data = (await resp.json()) as WpPostResponse;
			return { ok: true, data, status: resp.status };
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			return { ok: false, status: 0, error: msg };
		}
	}

	/**
	 * Get post by ID (for verification).
	 * Ref: 12_WORDPRESS_INTEGRATION §6.6.1(4)
	 */
	async getPost(
		postId: number,
	): Promise<{ ok: boolean; data?: WpPostResponse; status: number }> {
		const url = `${this.baseUrl}/wp-json/wp/v2/posts/${postId}?context=edit`;

		try {
			const resp = await this.fetchWithRetry(url, {
				method: "GET",
				headers: this.headers(),
			});

			if (!resp.ok) {
				return { ok: false, status: resp.status };
			}

			const data = (await resp.json()) as WpPostResponse;
			return { ok: true, data, status: resp.status };
		} catch {
			return { ok: false, status: 0 };
		}
	}

	/**
	 * Find existing post by slug (for idempotency §6.8).
	 */
	async findBySlug(
		slug: string,
	): Promise<{ ok: boolean; data?: WpPostResponse; status: number }> {
		const url = `${this.baseUrl}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&status=draft,publish&context=edit`;

		try {
			const resp = await this.fetchWithRetry(url, {
				method: "GET",
				headers: this.headers(),
			});

			if (!resp.ok) {
				return { ok: false, status: resp.status };
			}

			const posts = (await resp.json()) as WpPostResponse[];
			if (posts.length > 0) {
				return { ok: true, data: posts[0], status: resp.status };
			}
			return { ok: true, status: resp.status };
		} catch {
			return { ok: false, status: 0 };
		}
	}

	/**
	 * Upload media. Ref: 12_WORDPRESS_INTEGRATION §6.4
	 */
	async uploadMedia(
		imageBuffer: Buffer,
		filename: string,
		altText: string,
		mimeType: string = "image/jpeg",
	): Promise<{
		ok: boolean;
		data?: WpMediaResponse;
		status: number;
		error?: string;
	}> {
		const url = `${this.baseUrl}/wp-json/wp/v2/media`;
		logger.info("WP: uploading media", { filename });

		try {
			const resp = await this.fetchWithRetry(url, {
				method: "POST",
				headers: {
					Authorization: this.authHeader,
					"Content-Type": mimeType,
					"Content-Disposition": `attachment; filename="${filename}"`,
				},
				body: imageBuffer,
			});

			if (!resp.ok) {
				const errText = await resp.text();
				logger.error("WP: media upload failed", {
					status: resp.status,
				});
				return { ok: false, status: resp.status, error: errText };
			}

			const media = (await resp.json()) as WpMediaResponse;

			// Set alt text
			await this.fetchWithRetry(`${url}/${media.id}`, {
				method: "PUT",
				headers: this.headers(),
				body: JSON.stringify({ alt_text: altText }),
			});

			return { ok: true, data: media, status: resp.status };
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			return { ok: false, status: 0, error: msg };
		}
	}

	/**
	 * Lookup category by slug. Ref: 12_WORDPRESS_INTEGRATION §6.5(1)
	 * No auto-create — if not found, return undefined.
	 */
	async findCategoryBySlug(
		slug: string,
	): Promise<{ id: number; slug: string } | undefined> {
		const url = `${this.baseUrl}/wp-json/wp/v2/categories?slug=${encodeURIComponent(slug)}`;

		try {
			const resp = await this.fetchWithRetry(url, {
				method: "GET",
				headers: this.headers(),
			});

			if (!resp.ok) return undefined;

			const cats = (await resp.json()) as Array<{
				id: number;
				slug: string;
			}>;
			return cats.length > 0 ? cats[0] : undefined;
		} catch {
			return undefined;
		}
	}

	/**
	 * Lookup tag by slug. Ref: 12_WORDPRESS_INTEGRATION §6.5(2)
	 */
	async findTagBySlug(
		slug: string,
	): Promise<{ id: number; slug: string } | undefined> {
		const url = `${this.baseUrl}/wp-json/wp/v2/tags?slug=${encodeURIComponent(slug)}`;

		try {
			const resp = await this.fetchWithRetry(url, {
				method: "GET",
				headers: this.headers(),
			});

			if (!resp.ok) return undefined;

			const tags = (await resp.json()) as Array<{
				id: number;
				slug: string;
			}>;
			return tags.length > 0 ? tags[0] : undefined;
		} catch {
			return undefined;
		}
	}

	/**
	 * List all WP categories (paginated, fetches all pages).
	 * Used by taxonomy sync to determine what already exists.
	 */
	async listAllCategories(): Promise<
		Array<{ id: number; slug: string; name: string }>
	> {
		const all: Array<{ id: number; slug: string; name: string }> = [];
		let page = 1;
		const perPage = 100;

		while (true) {
			const url = `${this.baseUrl}/wp-json/wp/v2/categories?per_page=${perPage}&page=${page}`;
			try {
				const resp = await this.fetchWithRetry(url, {
					method: "GET",
					headers: this.headers(),
				});
				if (!resp.ok) break;

				const cats = (await resp.json()) as Array<{
					id: number;
					slug: string;
					name: string;
				}>;
				all.push(...cats);
				if (cats.length < perPage) break;
				page++;
			} catch {
				break;
			}
		}
		return all;
	}

	/**
	 * List all WP tags (paginated, fetches all pages).
	 * Used by taxonomy sync to determine what already exists.
	 */
	async listAllTags(): Promise<
		Array<{ id: number; slug: string; name: string }>
	> {
		const all: Array<{ id: number; slug: string; name: string }> = [];
		let page = 1;
		const perPage = 100;

		while (true) {
			const url = `${this.baseUrl}/wp-json/wp/v2/tags?per_page=${perPage}&page=${page}`;
			try {
				const resp = await this.fetchWithRetry(url, {
					method: "GET",
					headers: this.headers(),
				});
				if (!resp.ok) break;

				const tags = (await resp.json()) as Array<{
					id: number;
					slug: string;
					name: string;
				}>;
				all.push(...tags);
				if (tags.length < perPage) break;
				page++;
			} catch {
				break;
			}
		}
		return all;
	}

	/**
	 * Create a WP category. Idempotent: first checks by slug, returns existing if found.
	 * Ref: 01_ContentSpec §2.1 — canonical categories only.
	 */
	async createCategory(
		slug: string,
		name: string,
	): Promise<{
		ok: boolean;
		id?: number;
		slug?: string;
		created: boolean;
		error?: string;
	}> {
		// Check if already exists
		const existing = await this.findCategoryBySlug(slug);
		if (existing) {
			return {
				ok: true,
				id: existing.id,
				slug: existing.slug,
				created: false,
			};
		}

		const url = `${this.baseUrl}/wp-json/wp/v2/categories`;
		logger.info("WP: creating category", { slug });

		try {
			const resp = await this.fetchWithRetry(url, {
				method: "POST",
				headers: this.headers(),
				body: JSON.stringify({ name, slug }),
			});

			if (!resp.ok) {
				const errText = await resp.text();
				logger.error("WP: category creation failed", {
					status: resp.status,
					slug,
				});
				return { ok: false, created: false, error: errText };
			}

			const data = (await resp.json()) as { id: number; slug: string };
			logger.info("WP: category created", {
				id: data.id,
				slug: data.slug,
			});
			return { ok: true, id: data.id, slug: data.slug, created: true };
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			return { ok: false, created: false, error: msg };
		}
	}

	/**
	 * Create a WP tag. Idempotent: first checks by slug, returns existing if found.
	 * Ref: 01_ContentSpec §2.2 — controlled vocabulary only.
	 */
	async createTag(
		slug: string,
		name: string,
	): Promise<{
		ok: boolean;
		id?: number;
		slug?: string;
		created: boolean;
		error?: string;
	}> {
		// Check if already exists
		const existing = await this.findTagBySlug(slug);
		if (existing) {
			return {
				ok: true,
				id: existing.id,
				slug: existing.slug,
				created: false,
			};
		}

		const url = `${this.baseUrl}/wp-json/wp/v2/tags`;
		logger.info("WP: creating tag", { slug });

		try {
			const resp = await this.fetchWithRetry(url, {
				method: "POST",
				headers: this.headers(),
				body: JSON.stringify({ name, slug }),
			});

			if (!resp.ok) {
				const errText = await resp.text();
				logger.error("WP: tag creation failed", {
					status: resp.status,
					slug,
				});
				return { ok: false, created: false, error: errText };
			}

			const data = (await resp.json()) as { id: number; slug: string };
			logger.info("WP: tag created", { id: data.id, slug: data.slug });
			return { ok: true, id: data.id, slug: data.slug, created: true };
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			return { ok: false, created: false, error: msg };
		}
	}

	/**
	 * Update tag term meta (e.g., Rank Math robots for archive pages).
	 * Uses discovered key names — never hardcode.
	 * PUT /wp-json/wp/v2/tags/{id} with { meta: { ... } }
	 * Returns true on success, false on failure.
	 */
	async updateTagMeta(
		tagId: number,
		meta: Record<string, string>,
	): Promise<boolean> {
		const url = `${this.baseUrl}/wp-json/wp/v2/tags/${tagId}`;
		logger.info("WP: updating tag meta", { tag_id: tagId });

		try {
			const resp = await this.fetchWithRetry(url, {
				method: "PUT",
				headers: this.headers(),
				body: JSON.stringify({ meta }),
			});

			if (!resp.ok) {
				logger.warn("WP: tag meta update failed", {
					tag_id: tagId,
					status: resp.status,
				});
				return false;
			}

			return true;
		} catch {
			logger.warn("WP: tag meta update network error", { tag_id: tagId });
			return false;
		}
	}
}

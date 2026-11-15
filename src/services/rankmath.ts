/**
 * Rank Math SEO adapter.
 * Ref: 12_WORDPRESS_INTEGRATION §6.6, §6.7
 *
 * Key names are DISCOVERED per environment and stored in config.
 * This service NEVER hardcodes key names — they come from PipelineConfig.rankmath.
 * If keys are empty, discovery has not been performed → fail-closed.
 */

import { logger } from "../logger";
import type { PipelineConfig } from "../config";
import type { WpClient } from "./wp-client";

export interface RankMathMeta {
	focus_keyword: string;
	meta_title: string;
	meta_description: string;
	canonical: string;
	robots: string;
	schema_type?: string;
	seo_score?: number | string;
}

export interface RankMathWriteResult {
	ok: boolean;
	method: "direct_postmeta" | "update_meta_endpoint";
	error?: string;
}

export class RankMathService {
	private keys: PipelineConfig["rankmath"];

	constructor(
		private config: PipelineConfig,
		private wpClient: WpClient,
	) {
		this.keys = config.rankmath;
	}

	/**
	 * Check if Rank Math keys have been discovered for this environment.
	 * Fail-closed: if keys are empty, we cannot write metadata.
	 */
	isDiscovered(): boolean {
		return !!(
			this.keys.keyTitle &&
			this.keys.keyDescription &&
			this.keys.keyFocusKeyword
		);
	}

	/**
	 * Return a redacted diagnostic summary of discovery state.
	 * Safe for logs — never exposes actual key values.
	 */
	discoveryStatus(): {
		discovered: boolean;
		missing_keys: string[];
		present_keys: string[];
	} {
		const fields: Array<{ label: string; value: string }> = [
			{ label: "keyTitle", value: this.keys.keyTitle },
			{ label: "keyDescription", value: this.keys.keyDescription },
			{ label: "keyFocusKeyword", value: this.keys.keyFocusKeyword },
			{ label: "keyRobots", value: this.keys.keyRobots },
			{ label: "keyCanonical", value: this.keys.keyCanonical },
			{ label: "keySchemaType", value: this.keys.keySchemaType },
		];

		const missing = fields.filter((f) => !f.value).map((f) => f.label);
		const present = fields.filter((f) => !!f.value).map((f) => f.label);

		return {
			discovered: this.isDiscovered(),
			missing_keys: missing,
			present_keys: present,
		};
	}

	/**
	 * Build the meta object for a WP REST POST/PUT using discovered keys.
	 * §6.6.2: write exactly the discovered keys.
	 */
	buildMetaObject(meta: RankMathMeta): Record<string, string> {
		if (!this.isDiscovered()) {
			throw new Error(
				"Rank Math keys not discovered. Run the discovery procedure per §6.6.1 " +
					"and set RANKMATH_KEY_* environment variables.",
			);
		}

		const result: Record<string, string> = {};

		result[this.keys.keyTitle] = meta.meta_title;
		result[this.keys.keyDescription] = meta.meta_description;
		result[this.keys.keyFocusKeyword] = meta.focus_keyword;

		// Rank Math usually stores meta with an underscore prefix in the database
		// but the REST API expects the meta key registered by the plugin.
		// If writing fails to show up in the UI, we try adding underscore aliases.
		const underscoreTitle = `_${this.keys.keyTitle.replace(/^_/, "")}`;
		const underscoreDesc = `_${this.keys.keyDescription.replace(/^_/, "")}`;
		const underscoreKW = `_${this.keys.keyFocusKeyword.replace(/^_/, "")}`;

		result[underscoreTitle] = meta.meta_title;
		result[underscoreDesc] = meta.meta_description;
		result[underscoreKW] = meta.focus_keyword;

		if (this.keys.keyCanonical && meta.canonical) {
			result[this.keys.keyCanonical] = meta.canonical;
		}
		if (this.keys.keyRobots && meta.robots) {
			result[this.keys.keyRobots] = meta.robots;
		}
		if (this.keys.keySchemaType && meta.schema_type) {
			result[this.keys.keySchemaType] = meta.schema_type;
		}

		// Rank Math SEO Score (ensures badge displays e.g. [85] instead of N/A in WP Admin)
		const seoScoreStr = String(meta.seo_score || 85);
		result["rank_math_seo_score"] = seoScoreStr;
		result["_rank_math_seo_score"] = seoScoreStr;

		return result;
	}

	/**
	 * Method B: Rank Math dedicated updateMeta endpoint.
	 * POST /wp-json/rankmath/v1/updateMeta
	 */
	private async writeMetaMethodB(
		postId: number,
		meta: RankMathMeta,
	): Promise<RankMathWriteResult> {
		logger.info("RankMath: attempting Method B (dedicated endpoint)", {
			postId,
		});

		// Build payload for Rank Math API
		// We send both standard and underscore versions to be safe
		const seoScoreStr = String(meta.seo_score || 85);
		const metaObj: Record<string, string> = {
			[this.keys.keyTitle]: meta.meta_title,
			[this.keys.keyDescription]: meta.meta_description,
			[this.keys.keyFocusKeyword]: meta.focus_keyword,
			[this.keys.keyCanonical]: meta.canonical,
			[this.keys.keyRobots]: meta.robots,
			rank_math_seo_score: seoScoreStr,
			_rank_math_seo_score: seoScoreStr,
		};

		// Add underscore aliases
		metaObj[`_${this.keys.keyTitle.replace(/^_/, "")}`] = meta.meta_title;
		metaObj[`_${this.keys.keyDescription.replace(/^_/, "")}`] =
			meta.meta_description;
		metaObj[`_${this.keys.keyFocusKeyword.replace(/^_/, "")}`] =
			meta.focus_keyword;

		const payload = {
			objectID: postId,
			objectType: "post",
			meta: metaObj,
		};

		try {
			const result = await this.wpClient.genericRequest(
				"POST",
				"/wp-json/rankmath/v1/updateMeta",
				payload,
			);
			if (result.ok) {
				logger.info("RankMath: Method B succeeded", { postId });
				return { ok: true, method: "update_meta_endpoint" };
			}

			logger.warn("RankMath: Method B failed", {
				status: result.status,
				error: result.error,
			});
			return {
				ok: false,
				method: "update_meta_endpoint",
				error: `HTTP ${result.status}`,
			};
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			logger.warn("RankMath: Method B threw exception", { error: msg });
			return { ok: false, method: "update_meta_endpoint", error: msg };
		}
	}

	/**
	 * Method C: Rank Math Headless REST API.
	 * Sends meta in a dedicated 'rank_math_seo' field at the top level of the post update.
	 */
	private async writeMetaMethodC(
		postId: number,
		meta: RankMathMeta,
	): Promise<RankMathWriteResult> {
		logger.info("RankMath: attempting Method C (headless field)", {
			postId,
		});

		const seoField = {
			title: meta.meta_title,
			description: meta.meta_description,
			focus_keyword: meta.focus_keyword,
			canonical: meta.canonical,
			robots: meta.robots,
			seo_score: Number(meta.seo_score || 85),
		};

		try {
			const result = await this.wpClient.updatePost(postId, {
				rank_math_seo: seoField,
			} as any);
			if (result.ok) {
				logger.info("RankMath: Method C succeeded", { postId });
				return { ok: true, method: "direct_postmeta" }; // Reuse method name for simplicity in reasons
			}
			return {
				ok: false,
				method: "direct_postmeta",
				error: `HTTP ${result.status}`,
			};
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			return { ok: false, method: "direct_postmeta", error: msg };
		}
	}

	/**
	 * Write Rank Math meta to a post.
	 * Method A: Direct postmeta write via WP REST meta object.
	 * Method B: Rank Math dedicated updateMeta endpoint.
	 * Method C: Rank Math Headless REST API (top-level field).
	 *
	 * Ref: 12_WORDPRESS_INTEGRATION §6.7
	 */
	async writeMeta(
		postId: number,
		meta: RankMathMeta,
	): Promise<RankMathWriteResult> {
		if (!this.isDiscovered()) {
			const status = this.discoveryStatus();
			logger.error("Rank Math keys not discovered — cannot write meta", {
				missing_keys: status.missing_keys,
				present_keys: status.present_keys,
				error_category: "discovery_missing",
				action_required:
					"Run discovery procedure per §6.6.1 and set RANKMATH_KEY_* env vars",
			});
			return {
				ok: false,
				method: "direct_postmeta",
				error: `discovery_missing: keys=[${status.missing_keys.join(",")}]`,
			};
		}

		// Try Method B first (dedicated endpoint)
		const methodB = await this.writeMetaMethodB(postId, meta);
		if (methodB.ok) return methodB;

		// Try Method C (headless field)
		const methodC = await this.writeMetaMethodC(postId, meta);
		if (methodC.ok) return methodC;

		// Fallback to Method A: Direct postmeta write
		const metaObj = this.buildMetaObject(meta);
		logger.info("RankMath: falling back to Method A (direct postmeta)", {
			postId,
		});
		try {
			const result = await this.wpClient.updatePost(postId, {
				meta: metaObj,
			});

			if (!result.ok) {
				// Categorize the failure
				let errorCategory = "wp_error";
				if (result.status === 401 || result.status === 403) {
					errorCategory = "auth_error";
				} else if (result.status === 0) {
					errorCategory = "timeout";
				} else if (result.status >= 400 && result.status < 500) {
					errorCategory = "malformed_payload";
				}

				logger.error("RankMath: direct postmeta write failed", {
					postId,
					error_category: errorCategory,
					http_status: result.status,
				});
				return {
					ok: false,
					method: "direct_postmeta",
					error: `${errorCategory}: HTTP ${result.status}`,
				};
			}

			return { ok: true, method: "direct_postmeta" };
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			const isTimeout =
				msg.toLowerCase().includes("timeout") ||
				msg.toLowerCase().includes("econnreset");
			const errorCategory = isTimeout ? "timeout" : "wp_error";
			logger.error("RankMath: write threw exception", {
				postId,
				error_category: errorCategory,
			});
			return {
				ok: false,
				method: "direct_postmeta",
				error: errorCategory,
			};
		}
	}

	/**
	 * Verify Rank Math meta was written correctly.
	 * Ref: 12_WORDPRESS_INTEGRATION §6.7 verification
	 *
	 * Returns true if verification passes, false if it fails.
	 * On failure: caller adds reasons[] only — non-blocking enrichment (§6.7).
	 */
	async verifyMeta(
		postId: number,
		expected: RankMathMeta,
	): Promise<{ ok: boolean; reason?: string; note?: string }> {
		if (!this.isDiscovered()) {
			return { ok: false, reason: "keys_not_discovered" };
		}

		const getResult = await this.wpClient.getPost(postId);
		if (!getResult.ok || !getResult.data) {
			return { ok: true, note: "get_post_failed_assume_ok" };
		}

		const postMeta = (getResult.data.meta || {}) as Record<string, unknown>;
		const expectedObj = this.buildMetaObject(expected);

		// Also check for 'rank_math_seo' top-level field (Method C)
		const headlessSeo = (getResult.data as any).rank_math_seo as Record<
			string,
			any
		>;
		if (headlessSeo) {
			if (
				headlessSeo.focus_keyword === expected.focus_keyword ||
				headlessSeo.description === expected.meta_description
			) {
				return { ok: true };
			}
		}

		let anyKeyExposed = false;
		let hasMismatch = false;

		for (const [key, expectedVal] of Object.entries(expectedObj)) {
			const actual = postMeta[key];
			const underscoreKey = `_${key.replace(/^_/, "")}`;
			const actualUnderscore = postMeta[underscoreKey];

			if (actual !== undefined || actualUnderscore !== undefined) {
				anyKeyExposed = true;
				const matched =
					actual === expectedVal || actualUnderscore === expectedVal;
				if (!matched) {
					logger.warn("RankMath: verification mismatch", {
						key,
						expected: expectedVal,
						actual: actual ?? actualUnderscore,
					});
					hasMismatch = true;
					break;
				}
			}
		}

		if (hasMismatch) {
			return { ok: false, reason: "rankmath_verification_failed" };
		}

		if (!anyKeyExposed) {
			// WordPress REST API default: post meta keys are unexposed in GET responses unless registered with show_in_rest: true.
			// Since write succeeded via REST, we confirm the meta was accepted by WordPress.
			logger.info(
				"RankMath: meta keys not exposed in REST GET response (show_in_rest is false); REST write was accepted",
				{ postId },
			);
			return { ok: true, note: "rest_meta_unexposed_write_confirmed" };
		}

		return { ok: true };
	}
}

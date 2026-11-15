/**
 * LLM Writer service — abstracts AI provider calls.
 * Supports per-stage provider/model override via config.
 * Ref: 13_CONTENT_OPS_PIPELINE §6.3.3, §6.3.4
 *
 * Provider routing:
 *   Research → LLM_RESEARCH_PROVIDER / LLM_RESEARCH_MODEL  (+ grounding)
 *   Draft   → LLM_DRAFT_PROVIDER   / LLM_DRAFT_MODEL
 *   Final   → LLM_FINAL_PROVIDER   / LLM_FINAL_MODEL
 *   Image   → LLM_IMAGE_PROVIDER   / LLM_IMAGE_MODEL
 *
 * In mock mode (no API key), returns structured mock responses.
 * Secrets are never logged (14_SECURITY_PRIVACY §6.2).
 */

import { logger } from "../logger";
import type { PipelineConfig } from "../config";
import type {
	Stage2Output,
	Stage3Output,
	ContentClass,
	BlogpostSubtype,
	SitemapPair,
} from "../types";
import { SCHEMA_VERSION } from "../types";
import {
	callGeminiSdk,
	redactErrorBody,
	generateGeminiImage,
} from "./gemini-adapter";
import { generateOpenAIImage } from "./openai-image-adapter";
import { tryParseJsonResponse } from "./json-repair";
import { loadPromptRegistry, type PromptStageKey } from "../config/prompt-loader";
import { loadTaxonomyConfig } from "../config/taxonomy-config-loader";
import { extractSiteBranding, interpolatePromptWithSite } from "./site-branding";

export type CustomPromptMap = Record<string, { system?: string; user?: string }>;

/** Draft result bundles the parsed output with the raw LLM text for diagnostics. */
export interface DraftResult {
	output: Stage3Output;
	/** Raw LLM response text (pre-parse). Used by Stage 3 for diagnostic excerpts. */
	rawText: string;
}

export interface LlmCallOptions {
	provider: string;
	model: string;
	systemPrompt: string;
	userPrompt: string;
	maxTokens?: number;
	/** If set to 'google_search', enables Gemini grounding (provider must be gemini) */
	grounding?: string;
	/** If set (e.g. 'application/json'), constrains model output format */
	responseMimeType?: string;
	/** Gemini thinking config (3.x models) */
	thinkingConfig?: import("@google/genai").ThinkingConfig;
}

/**
 * Backward-compatible alias mapping for common LLM field-name mistakes.
 * Only fills MISSING fields — if the correct key already exists, the alias is ignored.
 *
 * Known aliases:
 *   content → content_markdown    (LLM uses "content" instead of "content_markdown")
 *   body → content_markdown       (LLM uses "body" instead of "content_markdown")
 *   description → meta_description (LLM uses "description" instead of "meta_description")
 *   slug → suggested_slug         (LLM uses "slug" instead of "suggested_slug")
 *   keyword → focus_keyword       (LLM uses "keyword" instead of "focus_keyword")
 *   summary → excerpt             (LLM uses "summary" instead of "excerpt")
 */
export function normalizeDraftAliases(
	data: Record<string, unknown>,
): Record<string, unknown> {
	const out = { ...data };

	// content / body → content_markdown
	if (!out.content_markdown && out.content) {
		out.content_markdown = out.content;
		delete out.content;
	}
	if (!out.content_markdown && out.body) {
		out.content_markdown = out.body;
		delete out.body;
	}

	// description → meta_description
	if (!out.meta_description && out.description) {
		out.meta_description = out.description;
		delete out.description;
	}

	// slug → suggested_slug
	if (!out.suggested_slug && out.slug) {
		out.suggested_slug = out.slug;
		delete out.slug;
	}

	// keyword → focus_keyword
	if (!out.focus_keyword && out.keyword) {
		out.focus_keyword = out.keyword;
		delete out.keyword;
	}

	// summary → excerpt
	if (!out.excerpt && out.summary) {
		out.excerpt = out.summary;
		delete out.summary;
	}

	return out;
}

/**
 * Detect OpenAI "reasoning"/luna-style models that require `max_completion_tokens`
 * (instead of `max_tokens`) and reject custom `temperature` values.
 *
 * Examples: gpt-5.x, gpt-6.x (luna), o1/o3/o4 families.
 */
export function isOpenAiReasoningModel(model: string): boolean {
	const m = (model || "").toLowerCase();
	return /^(gpt-5|gpt-6|o1|o3|o4)/.test(m) || m.includes("luna");
}

export class WriterService {
	private config: PipelineConfig;
	private customPrompts?: CustomPromptMap;

	constructor(config: PipelineConfig, customPrompts?: CustomPromptMap) {
		this.config = config;
		this.customPrompts = customPrompts;
	}

	/**
	 * Retrieve the system prompt for a stage, checking user customizations first,
	 * then falling back to the production PromptRegistry defaults.
	 * Supports alias stage keys (stage2 <-> stage2_research, stage3_finalEdit <-> stage3_final_edit).
	 */
	public getSystemPrompt(stageKey: PromptStageKey | string): string {
		const branding = extractSiteBranding(this.config.wpBaseUrl);
		let rawPrompt = "";

		if (this.customPrompts) {
			const candidateKeys = [stageKey];
			if (stageKey === "stage2") candidateKeys.push("stage2_research");
			if (stageKey === "stage2_research") candidateKeys.push("stage2");
			if (stageKey === "stage3_finalEdit") candidateKeys.push("stage3_final_edit");
			if (stageKey === "stage3_final_edit") candidateKeys.push("stage3_finalEdit");

			for (const k of candidateKeys) {
				const custom = this.customPrompts[k];
				if (custom?.system && custom.system.trim().length > 0) {
					rawPrompt = custom.system;
					break;
				}
			}
		}

		if (!rawPrompt) {
			const registryKey = (
				stageKey === "stage2_research"
					? "stage2"
					: stageKey === "stage3_final_edit"
					? "stage3_finalEdit"
					: stageKey
			) as PromptStageKey;
			rawPrompt = loadPromptRegistry()[registryKey]?.system || "";
		}

		return interpolatePromptWithSite(rawPrompt, branding);
	}

	/**
	 * Retrieve custom user prompt template for a stage if set.
	 */
	public getUserPromptTemplate(stageKey: PromptStageKey | string): string | undefined {
		const branding = extractSiteBranding(this.config.wpBaseUrl);

		if (this.customPrompts) {
			const candidateKeys = [stageKey];
			if (stageKey === "stage2") candidateKeys.push("stage2_research");
			if (stageKey === "stage2_research") candidateKeys.push("stage2");
			if (stageKey === "stage3_finalEdit") candidateKeys.push("stage3_final_edit");
			if (stageKey === "stage3_final_edit") candidateKeys.push("stage3_finalEdit");

			for (const k of candidateKeys) {
				const custom = this.customPrompts[k];
				if (custom?.user && custom.user.trim().length > 0) {
					return interpolatePromptWithSite(custom.user, branding);
				}
			}
		}
		return undefined;
	}

	/**
	 * Build thinkingConfig from config.geminiThinkingLevel.
	 * Returns undefined if thinking is disabled (empty string).
	 */
	private buildThinkingConfig():
		| import("@google/genai").ThinkingConfig
		| undefined {
		const level = this.config.geminiThinkingLevel;
		if (!level) return undefined;
		// Cast to ThinkingLevel enum — SDK accepts string literals: 'HIGH' | 'LOW' | 'MEDIUM' | 'MINIMAL'
		// includeThoughts: false ensures thought parts are NOT included in the response
		return {
			thinkingLevel: level as import("@google/genai").ThinkingLevel,
			includeThoughts: false,
		};
	}

	/**
	 * Mock mode: true when NEITHER per-provider key is set.
	 * If at least one provider has a real key, mock mode is off.
	 */
	isMockMode(): boolean {
		const PLACEHOLDER_OPENAI = "sk-REPLACE_ME";
		const PLACEHOLDER_GEMINI = "AIza-REPLACE_ME";
		const openaiEmpty =
			!this.config.openaiApiKey ||
			this.config.openaiApiKey === PLACEHOLDER_OPENAI;
		const geminiEmpty =
			!this.config.geminiApiKey ||
			this.config.geminiApiKey === PLACEHOLDER_GEMINI;
		return openaiEmpty && geminiEmpty;
	}

	/**
	 * Generic LLM call. Routes to the correct provider API.
	 * In mock mode, returns a placeholder JSON string.
	 *
	 * If the primary call fails and a text fallback provider/model is configured
	 * (LLM_FALLBACK_PROVIDER / LLM_FALLBACK_MODEL), the call is automatically
	 * retried once with the fallback. Primary errors never remove the fallback.
	 */
	async callLlm(options: LlmCallOptions): Promise<string> {
		if (this.isMockMode()) {
			logger.info("Writer: MOCK MODE — returning placeholder response", {
				provider: options.provider,
				model: options.model,
			});
			return "{}";
		}

		// Grounding validation: fail-closed if required but unsupported
		if (
			options.grounding === "google_search" &&
			options.provider !== "gemini"
		) {
			throw new Error("grounding_unsupported_provider");
		}

		logger.info("Writer: calling LLM", {
			provider: options.provider,
			model: options.model,
			grounding: options.grounding || "none",
		});

		try {
			return await this.dispatchLlm(options);
		} catch (err: unknown) {
			const fallback = this.resolveTextFallback(options);
			if (!fallback) throw err;

			const primaryMsg = redactErrorBody(
				err instanceof Error ? err.message : String(err),
			);
			logger.warn("Writer: primary LLM failed — retrying with fallback", {
				primary_provider: options.provider,
				primary_model: options.model,
				fallback_provider: fallback.provider,
				fallback_model: fallback.model,
				error: primaryMsg,
			});

			// Grounding is Gemini-only; drop it if the fallback can't support it.
			const fallbackGrounding =
				fallback.provider === "gemini" ? options.grounding : undefined;

			try {
				return await this.dispatchLlm({
					...options,
					provider: fallback.provider,
					model: fallback.model,
					grounding: fallbackGrounding,
				});
			} catch (fallbackErr: unknown) {
				const fallbackMsg = redactErrorBody(
					fallbackErr instanceof Error
						? fallbackErr.message
						: String(fallbackErr),
				);
				throw new Error(
					`llm_primary_failed: ${primaryMsg}; llm_fallback_failed: ${fallbackMsg}`,
				);
			}
		}
	}

	/**
	 * Route a single LLM attempt to the correct provider (no fallback logic here).
	 */
	private async dispatchLlm(options: LlmCallOptions): Promise<string> {
		if (options.provider === "gemini") {
			return this.callGemini(options);
		}
		// Default: OpenAI-compatible API
		return this.callOpenAI(options);
	}

	/**
	 * Resolve the configured text fallback, skipping no-op fallbacks
	 * (same provider AND same model as the primary).
	 */
	private resolveTextFallback(
		options: LlmCallOptions,
	): { provider: string; model: string } | null {
		const provider = this.config.llmFallbackProvider;
		const model = this.config.llmFallbackModel;
		if (!provider || !model) return null;
		if (provider === options.provider && model === options.model)
			return null;
		return { provider, model };
	}

	/**
	 * OpenAI-compatible chat completions call.
	 *
	 * Newer OpenAI "reasoning"/luna models (gpt-5.x/gpt-6.x, o-series) require
	 * `max_completion_tokens` instead of `max_tokens`, and reject custom
	 * `temperature` (only the default of 1 is accepted). Older chat models still
	 * accept `max_tokens` + `temperature`, so we branch on the model name.
	 */
	private async callOpenAI(options: LlmCallOptions): Promise<string> {
		const apiKey = this.config.openaiApiKey;
		const apiUrl = "https://api.openai.com/v1/chat/completions";
		const isReasoningModel = isOpenAiReasoningModel(options.model);

		const body: Record<string, unknown> = {
			model: options.model,
			messages: [
				{ role: "system", content: options.systemPrompt },
				{ role: "user", content: options.userPrompt },
			],
		};

		if (isReasoningModel) {
			body.max_completion_tokens = options.maxTokens || 4096;
		} else {
			body.max_tokens = options.maxTokens || 4096;
			body.temperature = 0.7;
		}

		if (options.responseMimeType === "application/json") {
			body.response_format = { type: "json_object" };
		}

		const resp = await fetch(apiUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify(body),
		});

		if (!resp.ok) {
			const errBody = redactErrorBody(await resp.text());
			throw new Error(`LLM API ${resp.status}: ${errBody}`);
		}

		const json = (await resp.json()) as {
			choices: Array<{ message: { content: string } }>;
		};
		return json.choices[0]?.message?.content || "";
	}

	/**
	 * Gemini generateContent — routes via GEMINI_API_MODE.
	 *
	 * genai_sdk (default, recommended):
	 *   Uses the official @google/genai SDK. Grounding tools use camelCase:
	 *   { googleSearch: {} }. The SDK handles endpoint versioning.
	 *
	 * raw_http (legacy fallback):
	 *   Direct REST call to /v1beta/models/{model}:generateContent.
	 *   Grounding uses google_search_retrieval per REST spec.
	 *
	 * Ref: 13_CONTENT_OPS_PIPELINE §6.3.3
	 */
	private async callGemini(options: LlmCallOptions): Promise<string> {
		const mode = this.config.geminiApiMode || "genai_sdk";

		if (mode === "genai_sdk") {
			return this.callGeminiViaSdk(options);
		}

		return this.callGeminiViaRawHttp(options);
	}

	/**
	 * Gemini via official @google/genai SDK (preferred).
	 * Grounding tools in correct camelCase shape: { googleSearch: {} }.
	 */
	private async callGeminiViaSdk(options: LlmCallOptions): Promise<string> {
		const apiKey = this.config.geminiApiKey;

		try {
			const result = await callGeminiSdk({
				apiKey,
				model: options.model,
				systemPrompt: options.systemPrompt,
				userPrompt: options.userPrompt,
				maxOutputTokens: options.maxTokens || 4096,
				temperature: 0.7,
				enableGoogleSearch: options.grounding === "google_search",
				responseMimeType: options.responseMimeType,
				thinkingConfig: options.thinkingConfig,
			});

			return result.text;
		} catch (err: unknown) {
			const errMsg = err instanceof Error ? err.message : String(err);

			// Grounding failure is fail-closed with bounded reason
			if (options.grounding === "google_search") {
				const reason = redactErrorBody(errMsg);
				throw new Error(`grounding_failed: ${reason}`);
			}

			throw new Error(`gemini_api_error: ${redactErrorBody(errMsg)}`);
		}
	}

	/**
	 * Gemini via raw HTTP (legacy fallback, GEMINI_API_MODE=raw_http).
	 * Ref: Gemini REST API — POST /v1beta/models/{model}:generateContent
	 */
	private async callGeminiViaRawHttp(
		options: LlmCallOptions,
	): Promise<string> {
		const apiKey = this.config.geminiApiKey;
		// G3 FIX: API key moved from URL query to header to prevent exposure in logs.
		const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${options.model}:generateContent`;

		const requestBody: Record<string, unknown> = {
			contents: [
				{
					role: "user",
					parts: [
						{
							text: `${options.systemPrompt}\n\n${options.userPrompt}`,
						},
					],
				},
			],
			generationConfig: {
				maxOutputTokens: options.maxTokens || 4096,
				temperature: 0.7,
			},
		};

		// Gemini REST grounding: google_search_retrieval for v1beta
		if (options.grounding === "google_search") {
			requestBody.tools = [{ google_search_retrieval: {} }];
		}

		const resp = await fetch(apiUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-goog-api-key": apiKey,
			},
			body: JSON.stringify(requestBody),
		});

		if (!resp.ok) {
			const errText = redactErrorBody(await resp.text());
			// Grounding failure is fail-closed with bounded reason
			if (options.grounding === "google_search") {
				throw new Error(
					`grounding_failed: Gemini API ${resp.status} — ${errText}`,
				);
			}
			throw new Error(`LLM API ${resp.status}: ${errText}`);
		}

		const json = (await resp.json()) as {
			candidates?: Array<{
				content?: {
					parts?: Array<{ text?: string; thought?: boolean }>;
				};
			}>;
		};

		// Robust extraction: iterate all candidates/parts, collect non-empty text
		const candidates = json.candidates ?? [];
		const collectedParts: string[] = [];
		let partCount = 0;
		let textPartCount = 0;

		for (const candidate of candidates) {
			const parts = candidate.content?.parts ?? [];
			for (const part of parts) {
				partCount++;
				if (
					typeof part.text === "string" &&
					part.text.trim().length > 0
				) {
					textPartCount++;
					collectedParts.push(part.text.trim());
				}
			}
		}

		if (collectedParts.length > 0) {
			return collectedParts.join("\n");
		}

		// Empty: throw with bounded diagnostics
		logger.warn("Gemini raw HTTP: empty extracted text", {
			candidate_count: candidates.length,
			part_count: partCount,
			text_part_count: textPartCount,
		});
		throw new Error(
			`gemini_empty_text_response: candidate_count=${candidates.length} part_count=${partCount} text_part_count=${textPartCount}`,
		);
	}

	/**
	 * Research call (Stage 2).
	 * Uses LLM_RESEARCH_PROVIDER / LLM_RESEARCH_MODEL.
	 * If LLM_RESEARCH_GROUNDING=google_search, Gemini grounding is enabled.
	 * If newsContext is provided, it's injected as source article text for news-based research.
	 */
	async research(
		queueId: string,
		keyword: string,
		contentType: string,
		dataFlags: string[],
		classHint?: ContentClass,
		blogpostSubtype?: BlogpostSubtype | null,
		newsContext?: string,
	): Promise<Stage2Output> {
		if (this.isMockMode()) {
			return {
				schema_version: SCHEMA_VERSION,
				queue_id: queueId,
				outline_points: [
					"Introduction",
					"Main concept",
					"FAQ",
					"Conclusion",
				],
				facts: [
					{
						claim: `${keyword} is a key concept`,
						source_url: "https://example.com/source",
					},
				],
				definitions: [`${keyword}: A relevant term`],
				unknowns: [],
				citations_required: contentType !== "Glossary",
				citations_present: true,
			};
		}

		const contextPayload: Record<string, unknown> = {
			keyword,
			content_type: contentType,
			data_flags: dataFlags,
		};
		if (classHint) contextPayload.class_hint = classHint;
		if (blogpostSubtype) contextPayload.blogpost_subtype = blogpostSubtype;

		// Grounding tools (google_search) conflict with responseMimeType on some Gemini models.
		// When grounding is enabled, omit the JSON constraint — the prompt + json-repair handle it.
		const groundingMode = this.config.llmResearchGrounding || undefined;

		// Check if user specified a custom user prompt template
		const customUserTmpl = this.getUserPromptTemplate("stage2");
		let userPrompt = customUserTmpl
			? `${customUserTmpl.replace(/\$\{keyword\}/gi, keyword).replace(/\$\{contentType\}/gi, contentType)}\n\nContext: ${JSON.stringify(contextPayload)}`
			: `Research the keyword "${keyword}" for a ${contentType} article.\n\nContext: ${JSON.stringify(contextPayload)}`;

		// If news source text is available, append it for context-enriched research
		if (newsContext) {
			userPrompt += `\n\n--- SOURCE ARTICLE TEXT ---\n${newsContext}\n--- END SOURCE ---`;
		}

		const raw = await this.callLlm({
			provider: this.config.llmResearchProvider,
			model: this.config.llmResearchModel,
			systemPrompt: this.getSystemPrompt("stage2"),
			userPrompt,
			maxTokens: this.config.maxOutputTokensResearch,
			grounding: groundingMode,
			responseMimeType: groundingMode ? undefined : "application/json",
			thinkingConfig: this.buildThinkingConfig(),
		});

		const result = tryParseJsonResponse(raw);
		if (result.ok) {
			return {
				schema_version: SCHEMA_VERSION,
				queue_id: queueId,
				...(result.data as Record<string, unknown>),
			} as Stage2Output;
		}

		// Parse failed after repair — log excerpt and throw with diagnostic
		logger.warn("Writer: research JSON parse failed after repair", {
			excerpt: result.excerpt,
		});
		throw new Error(`schema_parse_failed: ${result.excerpt}`);
	}

	/**
	 * Draft call (Stage 3).
	 * Uses LLM_DRAFT_PROVIDER / LLM_DRAFT_MODEL.
	 * Returns DraftResult: { output, rawText } so Stage 3 can include
	 * raw excerpt in diagnostics when fields are missing.
	 *
	 * Includes alias mapping safety net: if the LLM returns common
	 * wrong-name variants (e.g. "content" instead of "content_markdown"),
	 * we normalize them before returning.
	 */
	async draft(
		queueId: string,
		researchPack: Stage2Output,
		keyword: string,
		contentType: string,
		classHint?: ContentClass,
		blogpostSubtype?: BlogpostSubtype | null,
		sitemapSnippet?: SitemapPair[],
		newsSourceUrl?: string | null,
	): Promise<DraftResult> {
		if (this.isMockMode()) {
			const output: Stage3Output = {
				schema_version: SCHEMA_VERSION,
				title: `${keyword} — Comprehensive Guide`,
				content_markdown: `# ${keyword}\n\nArticle content about ${keyword}.\n\n## FAQ\n\n### What is ${keyword}?\n\nThis is an important concept in this field.`,
				excerpt: `Learn about ${keyword}.`,
				suggested_slug: keyword.toLowerCase().replace(/\s+/g, "-"),
				category: loadTaxonomyConfig().defaultFallbackCategory,
				tags: [keyword.toLowerCase()],
				focus_keyword: keyword,
				additional_keywords: [],
				meta_title: `${keyword}`,
				meta_description: `Learn about ${keyword} — a comprehensive guide.`,
				faq: [
					{
						question: `What is ${keyword}?`,
						answer: "This is an important concept.",
					},
					{
						question: `Why is ${keyword} important?`,
						answer: "It helps improve knowledge and skills.",
					},
					{
						question: `How to apply ${keyword}?`,
						answer: "Practice regularly.",
					},
				],
				featured_image: {
					prompt: `${keyword} illustration`,
					alt_text: keyword,
				},
				citations: researchPack.facts,
				publish_recommendation: "DRAFT",
				reasons: ["mock_mode"],
				missing_data_fields: [],
			};
			return { output, rawText: "mock_mode" };
		}

		const contextPayload: Record<string, unknown> = {
			keyword,
			content_type: contentType,
			research_pack: researchPack,
		};
		if (classHint) contextPayload.class_hint = classHint;
		if (blogpostSubtype) contextPayload.blogpost_subtype = blogpostSubtype;
		if (sitemapSnippet && sitemapSnippet.length > 0) {
			contextPayload.sitemap_snippet = sitemapSnippet;
		}

		// Constrain the model to the site's canonical categories so Stage 6
		// can resolve `category` to a real WordPress category slug.
		const allowedCategories = loadTaxonomyConfig().categories.map((c) => ({
			slug: c.slug,
			name: c.name,
		}));
		contextPayload.allowed_categories = allowedCategories;
		const allowedSlugs = allowedCategories.map((c) => c.slug).join(", ");

		const customDraftUserTmpl = this.getUserPromptTemplate("stage3_draft");
		let userPrompt = customDraftUserTmpl
			? `${customDraftUserTmpl.replace(/\$\{keyword\}/gi, keyword).replace(/\$\{contentType\}/gi, contentType).replace(/\$\{focusKeyword\}/gi, keyword)}\n\nContext: ${JSON.stringify(contextPayload)}`
			: `Write a ${contentType} article about "${keyword}".\n\nContext: ${JSON.stringify(contextPayload)}`;

		// Hard constraint: the category must be one of the canonical slugs.
		if (allowedSlugs) {
			userPrompt += `\n\n--- CATEGORY RULE (MUST FOLLOW) ---
"category" MUST be exactly one of these slugs: ${allowedSlugs}. Do NOT invent new categories (e.g. do not use "Finance").`;
		}

		// News articles: force unique title and localized content
		if (newsSourceUrl) {
			userPrompt += `\n\n--- NEWS ARTICLE RULES ---
This article is based on an international news source. You MUST:
1. Write a UNIQUE title — DO NOT translate or copy the English source title "${keyword}"
2. The title must be SEO-optimized for your target audience
3. suggested_slug must be in the target language (ASCII, no diacritics), NOT a translation of the English title
4. meta_title and meta_description must be in the target language
5. focus_keyword must be a keyword that your target users would search for
6. Rewrite and localize the content for your target audience — add relevant local context
--- END NEWS RULES ---`;
		}

		const raw = await this.callLlm({
			provider: this.config.llmDraftProvider,
			model: this.config.llmDraftModel,
			systemPrompt: this.getSystemPrompt("stage3_draft"),
			userPrompt,
			maxTokens: this.config.maxOutputTokensDraft,
			responseMimeType: "application/json",
			thinkingConfig: this.buildThinkingConfig(),
		});

		const result = tryParseJsonResponse(raw);
		if (result.ok) {
			const normalized = normalizeDraftAliases(
				result.data as Record<string, unknown>,
			);
			const output = {
				schema_version: SCHEMA_VERSION,
				...normalized,
			} as Stage3Output;
			return { output, rawText: raw };
		}

		logger.warn("Writer: draft JSON parse failed after repair", {
			excerpt: result.excerpt,
		});
		throw new Error(`schema_parse_failed: ${result.excerpt}`);
	}

	/**
	 * Final edit pass (Stage 3 post-draft).
	 * Uses LLM_FINAL_PROVIDER / LLM_FINAL_MODEL.
	 * Polishes the draft for publication quality.
	 */
	async finalEdit(draft: Stage3Output): Promise<Stage3Output> {
		if (this.isMockMode()) {
			// In mock mode, return the draft as-is
			return draft;
		}

		const raw = await this.callLlm({
			provider: this.config.llmFinalProvider,
			model: this.config.llmFinalModel,
			systemPrompt: this.getSystemPrompt("stage3_finalEdit"),
			userPrompt: `Polish this draft article (patch-only — preserve structure and immutable fields):\n${JSON.stringify(draft)}`,
			maxTokens: this.config.maxOutputTokensFinal,
			responseMimeType: "application/json",
			thinkingConfig: this.buildThinkingConfig(),
		});

		const result = tryParseJsonResponse(raw);
		if (result.ok) {
			return {
				schema_version: SCHEMA_VERSION,
				...(result.data as Record<string, unknown>),
			} as Stage3Output;
		}

		// Graceful degradation: if final edit fails to parse after repair, return original draft
		logger.warn(
			"Writer: finalEdit parse failed after repair, using original draft",
			{
				excerpt: result.excerpt,
			},
		);
		return draft;
	}

	/**
	 * Image prompt generation.
	 * Uses LLM_IMAGE_PROVIDER / LLM_IMAGE_MODEL.
	 */
	async generateImage(
		keyword: string,
		title: string,
	): Promise<{ prompt: string; alt_text: string }> {
		if (this.isMockMode()) {
			return {
				prompt: `${keyword} illustration`,
				alt_text: keyword,
			};
		}

		const customImgUserTmpl = this.getUserPromptTemplate("stage4_image");
		const imgUserPrompt = customImgUserTmpl
			? customImgUserTmpl.replace(/\$\{title\}/gi, title).replace(/\$\{keyword\}/gi, keyword)
			: `Create a featured image prompt for: "${title}" (keyword: ${keyword})`;

		const raw = await this.callLlm({
			provider: this.config.llmFinalProvider,
			model: this.config.llmFinalModel,
			systemPrompt: this.getSystemPrompt("stage4_image"),
			userPrompt: imgUserPrompt,
			maxTokens: 768,
			thinkingConfig: this.buildThinkingConfig(),
		});

		try {
			const parsed = JSON.parse(raw);
			return {
				prompt: parsed.prompt || `${keyword} illustration`,
				alt_text: parsed.alt_text || keyword,
			};
		} catch {
			// Fallback
			return { prompt: `${keyword} illustration`, alt_text: keyword };
		}
	}

	/**
	 * Generate actual image bytes via the configured image provider.
	 * Uses LLM_IMAGE_PROVIDER / LLM_IMAGE_MODEL.
	 *
	 * Returns base64-encoded image bytes, MIME type, and alt text.
	 * In mock mode, returns a minimal valid PNG placeholder.
	 *
	 * This method is called by Stage 4 to produce the actual image
	 * that Stage 6 will upload to WordPress as the featured image.
	 */
	async generateImageBytes(
		prompt: string,
		altText: string,
	): Promise<{
		image_base64: string;
		mime_type: string;
		alt_text: string;
	}> {
		if (this.isMockMode()) {
			logger.info(
				"Writer: MOCK MODE — returning placeholder image bytes",
				{
					provider: this.config.llmImageProvider,
				},
			);
			// 1x1 transparent PNG (minimal valid PNG for tests/mock)
			const MOCK_PNG_BASE64 =
				"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
			return {
				image_base64: MOCK_PNG_BASE64,
				mime_type: "image/png",
				alt_text: altText,
			};
		}

		const provider = this.config.llmImageProvider;
		const model = this.config.llmImageModel;

		try {
			return await this.dispatchImage(provider, model, prompt, altText);
		} catch (err: unknown) {
			const fallback = this.resolveImageFallback(provider, model);
			if (!fallback) throw err;

			const primaryMsg = redactErrorBody(
				err instanceof Error ? err.message : String(err),
			);
			logger.warn(
				"Writer: primary image generation failed — retrying with fallback",
				{
					primary_provider: provider,
					primary_model: model,
					fallback_provider: fallback.provider,
					fallback_model: fallback.model,
					error: primaryMsg,
				},
			);

			try {
				return await this.dispatchImage(
					fallback.provider,
					fallback.model,
					prompt,
					altText,
				);
			} catch (fallbackErr: unknown) {
				const fallbackMsg = redactErrorBody(
					fallbackErr instanceof Error
						? fallbackErr.message
						: String(fallbackErr),
				);
				throw new Error(
					`image_primary_failed: ${primaryMsg}; image_fallback_failed: ${fallbackMsg}`,
				);
			}
		}
	}

	/**
	 * Route a single image-generation attempt to the correct provider.
	 */
	private async dispatchImage(
		provider: string,
		model: string,
		prompt: string,
		altText: string,
	): Promise<{ image_base64: string; mime_type: string; alt_text: string }> {
		if (provider === "gemini") {
			logger.info("Writer: generating image bytes via Gemini", { model });

			const result = await generateGeminiImage({
				apiKey: this.config.geminiApiKey,
				model,
				prompt,
				thinkingConfig: this.buildThinkingConfig(),
			});

			return {
				image_base64: result.image_base64,
				mime_type: result.mime_type,
				alt_text: altText,
			};
		}

		if (provider === "openai") {
			logger.info("Writer: generating image bytes via OpenAI", { model });

			const result = await generateOpenAIImage({
				apiKey: this.config.openaiApiKey,
				model,
				prompt,
			});

			return {
				image_base64: result.image_base64,
				mime_type: result.mime_type,
				alt_text: altText,
			};
		}

		// Unsupported provider for image generation
		throw new Error(`image_gen_unsupported_provider: ${provider}`);
	}

	/**
	 * Resolve the configured image fallback, skipping no-op fallbacks
	 * (same provider AND same model as the primary).
	 */
	private resolveImageFallback(
		provider: string,
		model: string,
	): { provider: string; model: string } | null {
		const fbProvider = this.config.llmImageFallbackProvider;
		const fbModel = this.config.llmImageFallbackModel;
		if (!fbProvider || !fbModel) return null;
		if (fbProvider === provider && fbModel === model) return null;
		return { provider: fbProvider, model: fbModel };
	}
}

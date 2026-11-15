/**
 * Taxonomy Config Loader — reads taxonomy_config.yaml at startup.
 * Ref: docs/spec/marketing/05_AgentPrompts.md §8
 * Ref: docs/spec/marketing/01_ContentSpec.md §2.2
 *
 * Loaded once per process restart. No hot-reload. No hardcoding whitelist in prompts.
 * The pipeline reads this config; it never writes to it.
 */

import fs from "fs";
import path from "path";
import { logger } from "../logger";
import { parse } from "yaml";

// ─── YAML parsing (inline, no external dependency) ──────────────
// We use a simple YAML parser for this well-known structure.
// For production robustness, this handles the specific structure of taxonomy_config.yaml.

function parseSimpleYaml(content: string): Record<string, unknown> {
	const parsed: unknown = parse(content);

	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
		throw new Error("Invalid taxonomy YAML: expected a top-level mapping");
	}

	return parsed as Record<string, unknown>;
}

// ─── Types ──────────────────────────────────────────────────────

/** Tag group names matching the YAML keys */
export type TagGroupName =
	| "brand"
	| "category"
	| "topic"
	| "city"
	| "skill"
	| "technology"
	| "format";

/** Priority order for tag cap (01_ContentSpec §2.2.4) */
export const TAG_GROUP_PRIORITY: readonly TagGroupName[] = [
	"brand",
	"category",
	"topic",
	"skill",
	"technology",
	"city",
	"format",
];

export interface CategoryEntry {
	slug: string;
	name: string;
}

export interface TaxonomyConfig {
	version: string;
	tagWhitelist: Map<TagGroupName, Set<string>>;
	flatWhitelist: Set<string>;
	cityTags: Set<string>;
	maxTagsPerPost: number;
	tagArchivePolicy: {
		default: string;
		graduated: string[];
	};
	/** Approved additions: tags to be created via taxonomy_sync_tool. */
	approvedAdditions: ApprovedAddition[];
	/** Canonical categories loaded from YAML. */
	categories: CategoryEntry[];
	/** Category slug set for quick lookup. */
	categorySlugs: Set<string>;
	/** Cluster name → category slug mapping. */
	clusterToCategory: Record<string, string>;
	/** Default category slug when cluster is unmapped. */
	defaultFallbackCategory: string;
	/** Keywords for filtering news RSS articles. Empty = accept all. */
	newsRelevanceKeywords: string[];
	/** Cluster name assigned to news articles in the publish queue. */
	newsDefaultCluster: string;
	/** Style descriptor for hero image prompts (e.g. "vibrant food photography"). */
	imageStyleHint: string;
}

export interface ApprovedAddition {
	slug: string;
	group: string;
}

// ─── Path Resolution ────────────────────────────────────────────

/**
 * Deterministic resolution chain for taxonomy_config.yaml.
 * Works in both dev (ts-node src/) and prod (node dist/) modes.
 *
 * 1. Explicit env var: TAXONOMY_CONFIG_PATH (absolute or repo-relative)
 * 2. Sibling to __dirname (works if yaml is copied into dist/config/)
 * 3. Repo-root fallback: walk up to find package.json, then src/config/
 */
export function resolveTaxonomyConfigPath(): string {
	// 1. Explicit env var
	const envPath = process.env.TAXONOMY_CONFIG_PATH;
	if (envPath) {
		const resolved = path.isAbsolute(envPath)
			? envPath
			: path.resolve(process.cwd(), envPath);
		if (fs.existsSync(resolved)) {
			return resolved;
		}
		// Env var set but file not found — log and fall through
		logger.warn(
			"TAXONOMY_CONFIG_PATH set but file not found, trying fallbacks",
			{
				env_path: envPath,
				resolved,
			},
		);
	}

	// 2. Sibling to __dirname (e.g. src/config/ in dev, dist/config/ after copy)
	const siblingPath = path.resolve(__dirname, "taxonomy_config.yaml");
	if (fs.existsSync(siblingPath)) {
		return siblingPath;
	}

	// 3. Repo-root fallback: walk up from __dirname to find package.json
	let dir = __dirname;
	for (let i = 0; i < 10; i++) {
		const candidate = path.join(dir, "package.json");
		if (fs.existsSync(candidate)) {
			const rootFallback = path.join(
				dir,
				"src",
				"config",
				"taxonomy_config.yaml",
			);
			if (fs.existsSync(rootFallback)) {
				return rootFallback;
			}
			break;
		}
		const parent = path.dirname(dir);
		if (parent === dir) break; // filesystem root
		dir = parent;
	}

	// Return the sibling path as the canonical "expected" path for the error message
	return siblingPath;
}

let _cached: TaxonomyConfig | null = null;

/**
 * Load and validate taxonomy_config.yaml.
 * Called once per process start; result is cached.
 * @param configPath Optional override for the YAML path.
 */
export function loadTaxonomyConfig(configPath?: string): TaxonomyConfig {
	if (_cached) return _cached;

	const filePath = configPath || resolveTaxonomyConfigPath();
	const exists = fs.existsSync(filePath);

	// ── Startup smoke assertion (no secrets) ──
	logger.info("Taxonomy config resolution", {
		resolved_path: filePath,
		exists,
		source: configPath
			? "explicit_arg"
			: process.env.TAXONOMY_CONFIG_PATH
				? "env_var"
				: "auto_resolve",
	});

	if (!exists) {
		throw new Error(
			`taxonomy_config_missing: ${filePath} — pipeline cannot start without tag whitelist. ` +
				`Set TAXONOMY_CONFIG_PATH env var or ensure the file is copied to dist/config/ during build.`,
		);
	}

	const raw = fs.readFileSync(filePath, "utf-8");
	const parsed = parseSimpleYaml(raw);

	// Validate required fields
	if (!parsed["version"]) {
		throw new Error('taxonomy_config_invalid: missing "version" field');
	}
	if (
		!parsed["tag_whitelist"] ||
		typeof parsed["tag_whitelist"] !== "object"
	) {
		throw new Error(
			'taxonomy_config_invalid: missing or invalid "tag_whitelist"',
		);
	}
	const maxTags = parsed["max_tags_per_post"];
	if (typeof maxTags !== "number" || maxTags < 1) {
		throw new Error(
			'taxonomy_config_invalid: missing or invalid "max_tags_per_post"',
		);
	}

	const rawWhitelist = parsed["tag_whitelist"] as Record<string, string[]>;

	// Build typed whitelist
	const tagWhitelist = new Map<TagGroupName, Set<string>>();
	const flatWhitelist = new Set<string>();

	for (const [group, slugs] of Object.entries(rawWhitelist)) {
		if (!Array.isArray(slugs)) {
			throw new Error(
				`taxonomy_config_invalid: tag_whitelist.${group} must be an array`,
			);
		}
		const normalized = slugs.map((s) => s.trim().toLowerCase());
		tagWhitelist.set(group as TagGroupName, new Set(normalized));
		for (const slug of normalized) {
			flatWhitelist.add(slug);
		}
	}

	// City tags from the config
	const cityTags = tagWhitelist.get("city") || new Set<string>();

	// Archive policy
	const rawArchive = (parsed["tag_archive_policy"] || {}) as Record<
		string,
		unknown
	>;

	// Approved additions
	const rawApproved = parsed["approved_additions"];
	let approvedAdditions: ApprovedAddition[] = [];
	if (Array.isArray(rawApproved)) {
		approvedAdditions = rawApproved
			.filter(
				(item: unknown) => typeof item === "object" && item !== null,
			)
			.map((item: unknown) => {
				const obj = item as Record<string, string>;
				return {
					slug: (obj.slug || "").trim().toLowerCase(),
					group: (obj.group || "").trim().toLowerCase(),
				};
			})
			.filter((a) => a.slug.length > 0 && a.group.length > 0);
	}

	// ── Parse categories ──
	const rawCategories = parsed["categories"];
	let categories: CategoryEntry[] = [{ slug: "general", name: "General" }];
	let categoriesFellBack = true;
	if (Array.isArray(rawCategories)) {
		const parsed_cats = rawCategories
			.filter(
				(item: unknown) => typeof item === "object" && item !== null,
			)
			.map((item: unknown) => {
				const obj = item as Record<string, string>;
				return {
					slug: (obj.slug || "").trim().toLowerCase(),
					name: (obj.name || "").trim(),
				};
			})
			.filter((c) => c.slug.length > 0 && c.name.length > 0);
		if (parsed_cats.length > 0) {
			categories = parsed_cats;
			categoriesFellBack = false;
		}
	}
	if (categoriesFellBack) {
		logger.warn(
			'taxonomy_config: "categories" missing or empty — falling back to [{slug:"general",name:"General"}]. Check your taxonomy_config.yaml.',
		);
	}
	const categorySlugs = new Set(categories.map((c) => c.slug));

	// ── Parse cluster_to_category ──
	const rawClusterMap = parsed["cluster_to_category"];
	const clusterToCategory: Record<string, string> = {};
	if (
		rawClusterMap &&
		typeof rawClusterMap === "object" &&
		!Array.isArray(rawClusterMap)
	) {
		for (const [k, v] of Object.entries(
			rawClusterMap as Record<string, string>,
		)) {
			if (typeof v === "string") {
				clusterToCategory[k.trim().toLowerCase()] = v
					.trim()
					.toLowerCase();
			}
		}
	}

	// ── Parse default_fallback_category ──
	const rawFallback = parsed["default_fallback_category"];
	let defaultFallbackCategory: string;
	if (typeof rawFallback === "string" && rawFallback.trim()) {
		defaultFallbackCategory = rawFallback.trim().toLowerCase();
	} else {
		defaultFallbackCategory = categories[0]?.slug || "general";
		logger.warn(
			'taxonomy_config: "default_fallback_category" missing — using first category slug as fallback',
			{
				fallback: defaultFallbackCategory,
			},
		);
	}

	// ── Parse news_relevance_keywords ──
	const rawNewsKw = parsed["news_relevance_keywords"];
	const newsRelevanceKeywords: string[] = Array.isArray(rawNewsKw)
		? rawNewsKw
				.filter(
					(k: unknown) =>
						typeof k === "string" && (k as string).trim(),
				)
				.map((k: unknown) => (k as string).trim().toLowerCase())
		: [];

	// ── Parse news_default_cluster ──
	const rawNewsCluster = parsed["news_default_cluster"];
	let newsDefaultCluster: string;
	if (typeof rawNewsCluster === "string" && rawNewsCluster.trim()) {
		newsDefaultCluster = rawNewsCluster.trim().toLowerCase();
	} else {
		newsDefaultCluster = "news";
		logger.warn(
			'taxonomy_config: "news_default_cluster" missing — falling back to "news". Check your taxonomy_config.yaml.',
		);
	}

	// ── Parse image_style_hint ──
	const rawImageStyle = parsed["image_style_hint"];
	let imageStyleHint: string;
	if (typeof rawImageStyle === "string" && rawImageStyle.trim()) {
		imageStyleHint = rawImageStyle.trim();
	} else {
		imageStyleHint = "vibrant professional photography";
		logger.warn(
			'taxonomy_config: "image_style_hint" missing — falling back to "vibrant professional photography". Check your taxonomy_config.yaml.',
		);
	}

	const config: TaxonomyConfig = {
		version: String(parsed["version"]),
		tagWhitelist,
		flatWhitelist,
		cityTags,
		maxTagsPerPost: maxTags,
		tagArchivePolicy: {
			default: String(rawArchive["default"] || "noindex_follow"),
			graduated: Array.isArray(rawArchive["graduated"])
				? (rawArchive["graduated"] as string[])
				: [],
		},
		approvedAdditions,
		categories,
		categorySlugs,
		clusterToCategory,
		defaultFallbackCategory,
		newsRelevanceKeywords,
		newsDefaultCluster,
		imageStyleHint,
	};

	logger.info("Taxonomy config loaded", {
		version: config.version,
		total_whitelist_tags: config.flatWhitelist.size,
		groups: [...config.tagWhitelist.keys()].join(", "),
		max_tags_per_post: config.maxTagsPerPost,
		approved_additions_count: approvedAdditions.length,
		categories_count: categories.length,
		cluster_mappings: Object.keys(clusterToCategory).length,
		default_fallback: defaultFallbackCategory,
		news_keywords_count: newsRelevanceKeywords.length,
		news_default_cluster: newsDefaultCluster,
		image_style_hint: imageStyleHint,
	});

	_cached = config;
	return config;
}

/**
 * Get the tag group a slug belongs to.
 * Used for priority-based cap logic.
 */
export function getTagGroup(
	slug: string,
	config: TaxonomyConfig,
): TagGroupName | null {
	for (const [group, tags] of config.tagWhitelist) {
		if (tags.has(slug)) return group;
	}
	return null;
}

/**
 * Reset cached config (for testing only).
 */
export function _resetTaxonomyConfigCache(): void {
	_cached = null;
}

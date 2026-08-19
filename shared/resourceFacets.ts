import { z } from "zod";

/**
 * Controlled resource facets shared by database writes, public query parsing,
 * admin curation, and the search UI.
 *
 * `unknown` is a real, filterable value. It means "not yet curated" and must
 * never be replaced by a guess derived from a URL, title, taxonomy, or tags.
 */
export const RESOURCE_FORMAT_VALUES = [
  "unknown",
  "tool",
  "library",
  "player",
  "sdk",
  "api-service",
  "platform",
  "course",
  "article",
  "video",
  "book",
  "specification",
  "dataset",
  "community",
  "other",
] as const;

export const RESOURCE_PROVIDER_VALUES = [
  "unknown",
  "self-hosted",
  "github",
  "youtube",
  "vimeo",
  "aws",
  "google-cloud",
  "azure",
  "cloudflare",
  "mux",
  "akamai",
  "wowza",
  "brightcove",
  "bitmovin",
  "other",
] as const;

export const RESOURCE_SKILL_LEVEL_VALUES = [
  "unknown",
  "beginner",
  "intermediate",
  "advanced",
  "all-levels",
] as const;

export const RESOURCE_SEARCH_SORT_VALUES = [
  "relevance",
  "name-asc",
  "name-desc",
  "newest",
  "oldest",
] as const;

export const resourceFormatSchema = z.enum(RESOURCE_FORMAT_VALUES);
export const resourceProviderSchema = z.enum(RESOURCE_PROVIDER_VALUES);
export const resourceSkillLevelSchema = z.enum(RESOURCE_SKILL_LEVEL_VALUES);
export const resourceSearchSortSchema = z.enum(RESOURCE_SEARCH_SORT_VALUES);

export type ResourceFormat = z.infer<typeof resourceFormatSchema>;
export type ResourceProvider = z.infer<typeof resourceProviderSchema>;
export type ResourceSkillLevel = z.infer<typeof resourceSkillLevelSchema>;
export type ResourceSearchSort = z.infer<typeof resourceSearchSortSchema>;

export interface ResourceFacetCount {
  value: string;
  count: number;
}

export interface ResourceSearchFacets {
  categories: ResourceFacetCount[];
  subcategories: ResourceFacetCount[];
  subSubcategories: ResourceFacetCount[];
  tags: ResourceFacetCount[];
  providers: ResourceFacetCount[];
  formats: ResourceFacetCount[];
  skillLevels: ResourceFacetCount[];
}

export const RESOURCE_FORMAT_LABELS: Record<ResourceFormat, string> = {
  unknown: "Not yet classified",
  tool: "Tool",
  library: "Library",
  player: "Player",
  sdk: "SDK",
  "api-service": "API service",
  platform: "Platform",
  course: "Course",
  article: "Article",
  video: "Video",
  book: "Book",
  specification: "Specification",
  dataset: "Dataset",
  community: "Community",
  other: "Other",
};

export const RESOURCE_PROVIDER_LABELS: Record<ResourceProvider, string> = {
  unknown: "Not yet classified",
  "self-hosted": "Self-hosted",
  github: "GitHub",
  youtube: "YouTube",
  vimeo: "Vimeo",
  aws: "AWS",
  "google-cloud": "Google Cloud",
  azure: "Azure",
  cloudflare: "Cloudflare",
  mux: "Mux",
  akamai: "Akamai",
  wowza: "Wowza",
  brightcove: "Brightcove",
  bitmovin: "Bitmovin",
  other: "Other",
};

export const RESOURCE_SKILL_LEVEL_LABELS: Record<ResourceSkillLevel, string> = {
  unknown: "Not yet classified",
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  "all-levels": "All levels",
};

export const RESOURCE_SEARCH_SORT_LABELS: Record<ResourceSearchSort, string> = {
  relevance: "Relevance",
  "name-asc": "Name A–Z",
  "name-desc": "Name Z–A",
  newest: "Newest",
  oldest: "Oldest",
};

function normalizeFacetInput(value: unknown): string {
  return typeof value === "string"
    ? value.trim().toLowerCase().replace(/[\s_]+/g, "-")
    : "";
}

const FORMAT_ALIASES: Record<string, ResourceFormat> = {
  api: "api-service",
  service: "api-service",
  "api-service": "api-service",
  spec: "specification",
  standard: "specification",
  docs: "article",
  documentation: "article",
  tutorial: "course",
};

const PROVIDER_ALIASES: Record<string, ResourceProvider> = {
  amazon: "aws",
  "amazon-web-services": "aws",
  gcp: "google-cloud",
  google: "google-cloud",
  "microsoft-azure": "azure",
  "git-hub": "github",
  "you-tube": "youtube",
  selfhosted: "self-hosted",
};

const SKILL_ALIASES: Record<string, ResourceSkillLevel> = {
  novice: "beginner",
  introductory: "beginner",
  intro: "beginner",
  expert: "advanced",
  "all": "all-levels",
  "all-level": "all-levels",
  "any-level": "all-levels",
};

/**
 * Strict normalizers for trusted write paths. Unsupported values become
 * `unknown` rather than being persisted as ad-hoc classifications.
 */
export function normalizeResourceFormat(value: unknown): ResourceFormat {
  const normalized = normalizeFacetInput(value);
  const aliased = FORMAT_ALIASES[normalized] ?? normalized;
  return resourceFormatSchema.safeParse(aliased).success
    ? (aliased as ResourceFormat)
    : "unknown";
}

export function normalizeResourceProvider(value: unknown): ResourceProvider {
  const normalized = normalizeFacetInput(value);
  const aliased = PROVIDER_ALIASES[normalized] ?? normalized;
  return resourceProviderSchema.safeParse(aliased).success
    ? (aliased as ResourceProvider)
    : "unknown";
}

export function normalizeResourceSkillLevel(value: unknown): ResourceSkillLevel {
  const normalized = normalizeFacetInput(value);
  const aliased = SKILL_ALIASES[normalized] ?? normalized;
  return resourceSkillLevelSchema.safeParse(aliased).success
    ? (aliased as ResourceSkillLevel)
    : "unknown";
}
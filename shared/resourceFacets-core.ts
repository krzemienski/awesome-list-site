/**
 * Browser-safe resource facet values, labels, and response types.
 *
 * Request/database validation schemas stay in `resourceFacets.ts`, so search
 * and other read-only UI surfaces do not pull Zod into their route graph.
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

export type ResourceFormat = (typeof RESOURCE_FORMAT_VALUES)[number];
export type ResourceProvider = (typeof RESOURCE_PROVIDER_VALUES)[number];
export type ResourceSkillLevel = (typeof RESOURCE_SKILL_LEVEL_VALUES)[number];
// No schema counterpart: sort is never parsed with Zod.
export type ResourceSearchSort = (typeof RESOURCE_SEARCH_SORT_VALUES)[number];

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

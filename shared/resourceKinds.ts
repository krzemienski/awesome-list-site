import { z } from "zod";

/**
 * Resource kinds — the coarse "what is this?" facet behind the home kind strip
 * (tools / libraries / standards / events / protocols) and the admin kind
 * select.
 *
 * Storage is a nullable `resources.kind` column. Reads never depend on a
 * backfill: `resolveResourceKindFrom` derives a kind deterministically —
 *   1. a valid STORED kind always wins (`source: "stored"`, even when it is
 *      `other`),
 *   2. otherwise the first kind, in enum order, whose configured+generic TAG
 *      mapping matches one of the resource's normalised tags
 *      (`source: "inferred"`),
 *   3. otherwise the first kind whose configured CATEGORY mapping matches the
 *      resource's category / subcategory / sub-subcategory name
 *      (`source: "inferred"`),
 *   4. otherwise `other` (`source: "default"`).
 *
 * The server mirrors the same precedence in SQL (server/lib/resourceKinds.ts)
 * so counts and the `?kind=` filter agree with the serialized `resolvedKind`.
 * Keep the two in lockstep: any change to normalisation or precedence here
 * must be reflected there (the integration test compares both over real rows).
 */
export const RESOURCE_KIND_VALUES = [
  "tools",
  "libraries",
  "standards",
  "events",
  "protocols",
  "other",
] as const;

export const resourceKindSchema = z.enum(RESOURCE_KIND_VALUES);

export type ResourceKind = z.infer<typeof resourceKindSchema>;
export type ResourceKindTagMappings = Partial<Record<ResourceKind, readonly string[]>>;
export type ResourceKindSource = "stored" | "inferred" | "default";

export interface ResolvedResourceKind {
  kind: ResourceKind;
  source: ResourceKindSource;
}

/** The `resource_kinds` block of awesome-list.config.yaml (both maps optional). */
export interface ResourceKindMappings {
  tag_mappings?: ResourceKindTagMappings;
  category_mappings?: ResourceKindTagMappings;
}

const GENERIC_KIND_TAG_MAPPINGS: Record<ResourceKind, readonly string[]> = {
  tools: ["tool", "tools", "utility", "utilities", "software", "app", "application"],
  libraries: ["library", "libraries", "framework", "frameworks", "sdk", "sdks"],
  standards: ["standard", "standards", "spec", "specification", "specifications"],
  events: ["event", "events", "conference", "conferences", "meetup", "meetups"],
  protocols: ["protocol", "protocols", "transport"],
  other: [],
};

/**
 * Canonical form used for BOTH mapping words and resource values: NFKC fold,
 * lowercase, runs of whitespace/underscores → a single hyphen, edge hyphens
 * dropped. "Video_Tools " and "video tools" both become "video-tools".
 */
export function normalizeResourceKindTag(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeMappingWords(words: readonly string[]): readonly string[] {
  return Array.from(new Set(words.map(normalizeResourceKindTag).filter(Boolean)));
}

/** Configured tag words merged with the generic defaults, normalised + deduped. */
export function buildResourceKindTagMappings(
  configured: ResourceKindTagMappings = {},
): Record<ResourceKind, readonly string[]> {
  return Object.fromEntries(
    RESOURCE_KIND_VALUES.map((kind) => [
      kind,
      normalizeMappingWords([...(configured[kind] ?? []), ...GENERIC_KIND_TAG_MAPPINGS[kind]]),
    ]),
  ) as unknown as Record<ResourceKind, readonly string[]>;
}

/**
 * Configured taxonomy-name words, normalised + deduped. There are NO generic
 * defaults here on purpose: category names are site-specific, so a category
 * only implies a kind when an operator says so in the config.
 */
export function buildResourceKindCategoryMappings(
  configured: ResourceKindTagMappings = {},
): Record<ResourceKind, readonly string[]> {
  return Object.fromEntries(
    RESOURCE_KIND_VALUES.map((kind) => [kind, normalizeMappingWords(configured[kind] ?? [])]),
  ) as unknown as Record<ResourceKind, readonly string[]>;
}

function firstMatchingKind(
  mappings: Record<ResourceKind, readonly string[]>,
  candidates: ReadonlySet<string>,
): ResourceKind | null {
  if (candidates.size === 0) return null;
  for (const kind of RESOURCE_KIND_VALUES) {
    if (kind === "other") continue;
    if (mappings[kind].some((word) => candidates.has(word))) return kind;
  }
  return null;
}

function normalizedStringSet(values: readonly unknown[] | null | undefined): Set<string> {
  return new Set(
    (values ?? [])
      .filter((value): value is string => typeof value === "string")
      .map(normalizeResourceKindTag)
      .filter(Boolean),
  );
}

export interface ResourceKindSignals {
  /** Raw stored value; anything outside the enum is treated as "not stored". */
  storedKind: unknown;
  /** `metadata.tags` (any non-string entries are ignored). */
  tags?: readonly unknown[] | null;
  /** Taxonomy names: category, subcategory, sub-subcategory (nulls ignored). */
  taxonomy?: readonly unknown[] | null;
}

export function resolveResourceKindFrom(
  signals: ResourceKindSignals,
  mappings: ResourceKindMappings = {},
): ResolvedResourceKind {
  const stored = resourceKindSchema.safeParse(signals.storedKind);
  if (stored.success) return { kind: stored.data, source: "stored" };

  const byTag = firstMatchingKind(
    buildResourceKindTagMappings(mappings.tag_mappings),
    normalizedStringSet(signals.tags),
  );
  if (byTag) return { kind: byTag, source: "inferred" };

  const byCategory = firstMatchingKind(
    buildResourceKindCategoryMappings(mappings.category_mappings),
    normalizedStringSet(signals.taxonomy),
  );
  if (byCategory) return { kind: byCategory, source: "inferred" };

  return { kind: "other", source: "default" };
}

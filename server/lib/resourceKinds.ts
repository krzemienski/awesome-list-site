/**
 * Server-side resource kind resolution.
 *
 * One module owns BOTH ways a kind is derived so they can never drift:
 *  - `resolveResourceKind(row)` — the TypeScript resolver used by the public
 *    serializer (`kind` / `resolvedKind` on every public resource payload).
 *  - `resolvedResourceKindSql()` — the identical precedence expressed as a SQL
 *    expression over the `resources` table, used by the full-set counts
 *    endpoint and the `?kind=` list filter (one grouped statement, no N+1).
 *
 * Precedence (see shared/resourceKinds.ts): stored kind → tag mapping →
 * category mapping → "other". Tag inference reads `metadata.tags` only — the
 * relational `tags` table is empty in production and consulting it would force
 * every public send site to become async (docs/parity/assumptions/kind-api.md).
 */
import { sql, type SQL } from "drizzle-orm";
import { resources } from "@shared/schema";
import {
  RESOURCE_KIND_VALUES,
  buildResourceKindCategoryMappings,
  buildResourceKindTagMappings,
  resolveResourceKindFrom,
  type ResolvedResourceKind,
  type ResourceKind,
  type ResourceKindMappings,
} from "@shared/resourceKinds";
import { config } from "../config";

export type { ResourceKind } from "@shared/resourceKinds";

/** The subset of a resource row the resolver reads (everything optional). */
export interface ResourceKindInput {
  kind?: unknown;
  metadata?: unknown;
  category?: unknown;
  subcategory?: unknown;
  subSubcategory?: unknown;
}

export type ResourceKindCounts = Record<ResourceKind, number> & { total: number };

interface CompiledKindMappings {
  tags: Record<ResourceKind, readonly string[]>;
  categories: Record<ResourceKind, readonly string[]>;
}

// Mapping lists are normalised once per config object (the serializer runs
// for every resource in the ~2k-row catalog tree on each rebuild).
const compiledMappings = new WeakMap<object, CompiledKindMappings>();

function compileMappings(mappings: ResourceKindMappings): CompiledKindMappings {
  let compiled = compiledMappings.get(mappings);
  if (!compiled) {
    compiled = {
      tags: buildResourceKindTagMappings(mappings.tag_mappings),
      categories: buildResourceKindCategoryMappings(mappings.category_mappings),
    };
    compiledMappings.set(mappings, compiled);
  }
  return compiled;
}

function metadataTags(metadata: unknown): readonly unknown[] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return [];
  const tags = (metadata as { tags?: unknown }).tags;
  return Array.isArray(tags) ? tags : [];
}

/**
 * Resolve a resource's kind: `{ kind, source }` where source is "stored"
 * (valid stored value), "inferred" (tag or category mapping) or "default"
 * ("other" because nothing matched).
 */
export function resolveResourceKind(
  resource: ResourceKindInput,
  mappings: ResourceKindMappings = config.resource_kinds,
): ResolvedResourceKind {
  const compiled = compileMappings(mappings);
  return resolveResourceKindFrom(
    {
      storedKind: resource.kind,
      tags: metadataTags(resource.metadata),
      taxonomy: [resource.category, resource.subcategory, resource.subSubcategory],
    },
    { tag_mappings: compiled.tags, category_mappings: compiled.categories },
  );
}

/**
 * Attach the public kind fields to a row: `kind` is the stored value (null
 * when unset — projections that never selected the column also read as null)
 * and `resolvedKind` is the read-time resolution. Additive only.
 */
export function withResourceKindFields<T extends Record<string, unknown>>(
  row: T,
  mappings: ResourceKindMappings = config.resource_kinds,
): T & { kind: ResourceKind | null; resolvedKind: ResourceKind } {
  const stored = typeof row.kind === "string" && (RESOURCE_KIND_VALUES as readonly string[]).includes(row.kind)
    ? (row.kind as ResourceKind)
    : null;
  return {
    ...row,
    kind: stored,
    resolvedKind: resolveResourceKind(row, mappings).kind,
  };
}

/**
 * Mirror of `normalizeResourceKindTag` in SQL. The bracket expression spells
 * out JavaScript's `\s` set explicitly (PostgreSQL's `[[:space:]]` is
 * locale-dependent and e.g. includes U+0085, which JS does not).
 */
const KIND_WORD_SEPARATOR_PATTERN =
  "[\\t\\n\\v\\f\\r \\u00A0\\u1680\\u2000-\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000\\uFEFF_]+";

function normalizedKindWordSql(value: SQL): SQL {
  return sql`btrim(regexp_replace(lower(normalize(${value}, NFKC)), ${KIND_WORD_SEPARATOR_PATTERN}, '-', 'g'), '-')`;
}

function textArraySql(words: readonly string[]): SQL {
  return sql`ARRAY[${sql.join(words.map((word) => sql`${word}`), sql`, `)}]::text[]`;
}

/**
 * SQL expression evaluating to the resolved kind of the `resources` row in
 * scope, with exactly the resolver's precedence. Safe to use in WHERE and in
 * GROUP BY (reference it by position — Drizzle re-parameterises repeated
 * fragments, so a textual repeat would not be recognised as the same
 * expression).
 */
export function resolvedResourceKindSql(
  mappings: ResourceKindMappings = config.resource_kinds,
): SQL<ResourceKind> {
  const compiled = compileMappings(mappings);
  const kindLiterals = textArraySql(RESOURCE_KIND_VALUES);

  // Same guard as ResourceRepository.listResources: metadata.tags is only an
  // array when it says so, anything else contributes no tags.
  const safeTags = sql`CASE WHEN jsonb_typeof(${resources.metadata}->'tags') = 'array' THEN ${resources.metadata}->'tags' ELSE '[]'::jsonb END`;

  const tagBranches: SQL[] = [];
  for (const kind of RESOURCE_KIND_VALUES) {
    if (kind === "other" || compiled.tags[kind].length === 0) continue;
    tagBranches.push(
      sql`WHEN bool_or(kind_tag.word = ANY(${textArraySql(compiled.tags[kind])})) THEN ${kind}::text`,
    );
  }
  // Aggregates over zero tags yield NULL for every branch → ELSE NULL.
  const tagKind = tagBranches.length
    ? sql`(SELECT CASE ${sql.join(tagBranches, sql` `)} ELSE NULL END FROM (SELECT ${normalizedKindWordSql(sql`kind_tag_source.value`)} AS word FROM jsonb_array_elements_text(${safeTags}) AS kind_tag_source(value)) AS kind_tag)`
    : sql`NULL::text`;

  const taxonomyNames = sql`ARRAY[${normalizedKindWordSql(sql`COALESCE(${resources.category}, '')`)}, ${normalizedKindWordSql(sql`COALESCE(${resources.subcategory}, '')`)}, ${normalizedKindWordSql(sql`COALESCE(${resources.subSubcategory}, '')`)}]::text[]`;
  const categoryBranches: SQL[] = [];
  for (const kind of RESOURCE_KIND_VALUES) {
    if (kind === "other" || compiled.categories[kind].length === 0) continue;
    categoryBranches.push(
      sql`WHEN ${taxonomyNames} && ${textArraySql(compiled.categories[kind])} THEN ${kind}::text`,
    );
  }
  const categoryKind = categoryBranches.length
    ? sql`CASE ${sql.join(categoryBranches, sql` `)} ELSE NULL END`
    : sql`NULL::text`;

  return sql<ResourceKind>`CASE WHEN ${resources.kind} = ANY(${kindLiterals}) THEN ${resources.kind} ELSE COALESCE(${tagKind}, ${categoryKind}, 'other') END`;
}

export function emptyResourceKindCounts(): ResourceKindCounts {
  return { tools: 0, libraries: 0, standards: 0, events: 0, protocols: 0, other: 0, total: 0 };
}

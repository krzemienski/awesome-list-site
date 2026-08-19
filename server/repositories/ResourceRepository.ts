/**
 * ============================================================================
 * RESOURCE REPOSITORY - Resource Data Access Layer
 * ============================================================================
 *
 * This module provides the data access layer for resource operations.
 * It encapsulates all database queries related to resources including
 * CRUD operations, status management, and approval workflows.
 *
 * KEY OPERATIONS:
 * - listResources: Paginated resource listing with filtering
 * - getResource: Retrieve resource by ID or URL
 * - createResource: Create new resource with audit logging
 * - updateResource: Update resource with audit logging
 * - deleteResource: Delete resource with audit logging
 * - getPendingResources: Get resources awaiting approval
 * - approveResource: Approve pending resource
 * - rejectResource: Reject pending resource with reason
 *
 * DESIGN NOTES:
 * - All modifications are logged to resource_audit_log table
 * - Status transitions: pending → approved/rejected
 * - Supports filtering by status, category, subcategory, user, and search
 * - Uses Drizzle ORM for type-safe database operations
 * ============================================================================
 */

import {
  resources,
  resourceTags,
  tags as tagTable,
  resourceAuditLog,
  resourceEdits,
  researchDiscoveries,
  users,
  type Resource,
  type InsertResource,
} from "@shared/schema";
import { db } from "../db";
import { eq, and, sql, asc, desc, like, inArray, isNull, getTableColumns } from "drizzle-orm";
import { tokenizeSearchQuery } from "@shared/searchNormalize";
import { decodeResourceTextFields } from "../github/importHygiene";
import { invalidatePublicCache } from "../cache/publicCache";
import {
  resourceFormatSchema,
  resourceProviderSchema,
  resourceSkillLevelSchema,
  type ResourceFormat,
  type ResourceProvider,
  type ResourceSearchFacets,
  type ResourceSkillLevel,
} from "@shared/resourceFacets";
import { normalizeTagFilter, TAG_PLURAL_KEEP } from "@shared/tagNormalize";

/**
 * Options for listing resources with filtering and pagination
 */
export interface ListResourceOptions {
  page?: number;
  offset?: number;
  limit?: number;
  status?: string;
  category?: string;
  subcategory?: string;
  subSubcategory?: string;
  userId?: string;
  search?: string;
  tags?: string[];
  provider?: ResourceProvider;
  resourceFormat?: ResourceFormat;
  skillLevel?: ResourceSkillLevel;
  /** Limit results to resources attached directly to this taxonomy level. */
  generalScope?: "category" | "subcategory";
  includeFacets?: boolean;
  /** R3-H08: whitelisted sort order; unknown/absent falls back to newest-first. */
  sort?: "relevance" | "name-asc" | "name-desc" | "newest" | "oldest";
}

export type ResourceSearchMetadata = {
  mode: "fts" | "fuzzy";
  suggestion?: string;
};

function damerauLevenshtein(left: string, right: string): number {
  const rows = left.length + 1;
  const cols = right.length + 1;
  const matrix = Array.from({ length: rows }, () => Array<number>(cols).fill(0));
  for (let row = 0; row < rows; row++) matrix[row][0] = row;
  for (let col = 0; col < cols; col++) matrix[0][col] = col;
  for (let row = 1; row < rows; row++) {
    for (let col = 1; col < cols; col++) {
      const cost = left[row - 1] === right[col - 1] ? 0 : 1;
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + cost,
      );
      if (
        row > 1 &&
        col > 1 &&
        left[row - 1] === right[col - 2] &&
        left[row - 2] === right[col - 1]
      ) {
        matrix[row][col] = Math.min(matrix[row][col], matrix[row - 2][col - 2] + 1);
      }
    }
  }
  return matrix[left.length][right.length];
}

function bestSearchSuggestion(query: string, titles: string[]): string | undefined {
  const needle = query.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
  if (!needle) return undefined;
  let best: { display: string; score: number; lengthDelta: number } | undefined;
  for (const title of titles) {
    const words = title.match(/[\p{L}\p{N}]+/gu) ?? [];
    const candidates: string[][] = [];
    for (let start = 0; start < words.length; start++) {
      for (let size = 1; size <= 3 && start + size <= words.length; size++) {
        candidates.push(words.slice(start, start + size));
      }
    }
    for (const parts of candidates) {
      const normalized = parts.join("").toLowerCase();
      const distance = damerauLevenshtein(needle, normalized);
      const score = distance / Math.max(needle.length, normalized.length);
      const lengthDelta = Math.abs(needle.length - normalized.length);
      if (!best || score < best.score || (score === best.score && lengthDelta < best.lengthDelta)) {
        best = { display: parts.join(" "), score, lengthDelta };
      }
    }
  }
  return best?.display;
}

/**
 * Repository class for resource-related database operations
 */
export class ResourceRepository {
  /**
   * List resources with filtering and pagination
   * @param options - Filter and pagination options
   * @returns Object containing resources array and total count
   */
  async listResources(options: ListResourceOptions): Promise<{
    resources: Resource[];
    total: number;
    facets?: ResourceSearchFacets;
    search?: ResourceSearchMetadata;
  }> {
    const {
      page = 1,
      limit = 20,
      status,
      category,
      subcategory,
      subSubcategory,
      userId,
      search,
      tags = [],
      provider,
      resourceFormat,
      skillLevel,
      generalScope,
      sort,
      includeFacets = false,
    } = options;
    const offset = options.offset ?? ((page - 1) * limit);

    let query = db.select().from(resources).$dynamic();
    let countQuery = db.select({ count: sql<number>`count(*)::int` }).from(resources).$dynamic();

    // Build an ANDed prefix tsquery once. It maps directly to the search_tsv
    // GIN index and preserves the established order-independent token policy.
    const searchTokens = tokenizeSearchQuery(search);
    const normalizedSearch = searchTokens.join(" ");
    const ftsTerms = searchTokens
      .map((token) => token.toLowerCase().replace(/[^\p{L}\p{N}_]+/gu, ""))
      .filter(Boolean);
    const tsQuery = ftsTerms.map((term) => `${term}:*`).join(" & ");
    const strictSearchCondition = tsQuery
      ? sql`${resources.searchTsv} @@ to_tsquery('english', ${tsQuery})`
      : undefined;
    const safeMetadataTags = sql`CASE
      WHEN jsonb_typeof(${resources.metadata}->'tags') = 'array'
      THEN ${resources.metadata}->'tags'
      ELSE '[]'::jsonb
    END`;
    // Both stores are supported write paths in the existing application:
    // submissions/admin resource edits persist metadata.tags, while TagRepository
    // persists resource_tags. Search must not make either path invisible.
    const resourceTagSource = sql`
      SELECT ${tagTable.name} AS value
      FROM ${resourceTags}
      INNER JOIN ${tagTable} ON ${tagTable.id} = ${resourceTags.tagId}
      WHERE ${resourceTags.resourceId} = ${resources.id}
      UNION
      SELECT metadata_tag.value
      FROM jsonb_array_elements_text(${safeMetadataTags}) AS metadata_tag(value)
    `;
    const tagExists = (predicate: ReturnType<typeof sql>) => sql`EXISTS (
      SELECT 1
      FROM (${resourceTagSource}) AS resource_tag(value)
      WHERE ${predicate}
    )`;
    const foldTagSql = sql`lower(regexp_replace(trim(resource_tag.value), '[ _]+', '-', 'g'))`;
    const canonicalTagSql = sql`CASE
      WHEN ${foldTagSql} IN (${sql.join(Array.from(TAG_PLURAL_KEEP).map((v) => sql`${v}`), sql`, `)})
        THEN ${foldTagSql}
      WHEN length(${foldTagSql}) > 4 AND right(${foldTagSql}, 3) = 'ies'
        THEN left(${foldTagSql}, length(${foldTagSql}) - 3) || 'y'
      WHEN length(${foldTagSql}) > 3 AND right(${foldTagSql}, 1) = 's'
        AND right(${foldTagSql}, 2) <> 'ss'
        THEN left(${foldTagSql}, length(${foldTagSql}) - 1)
      ELSE ${foldTagSql}
    END`;

    const buildConditions = (
      omit?: "category" | "subcategory" | "subSubcategory" | "tags" | "provider" | "resourceFormat" | "skillLevel",
      searchCondition: ReturnType<typeof sql> | undefined = strictSearchCondition,
    ) => {
      const conditions = [];
      if (status) conditions.push(eq(resources.status, status));
      if (category && omit !== "category") conditions.push(eq(resources.category, category));
      if (subcategory && omit !== "subcategory") conditions.push(eq(resources.subcategory, subcategory));
      if (subSubcategory && omit !== "subSubcategory") conditions.push(eq(resources.subSubcategory, subSubcategory));
      if (userId) conditions.push(eq(resources.submittedBy, userId));
      if (provider && omit !== "provider") conditions.push(eq(resources.provider, provider));
      if (resourceFormat && omit !== "resourceFormat") conditions.push(eq(resources.resourceFormat, resourceFormat));
      if (skillLevel && omit !== "skillLevel") conditions.push(eq(resources.skillLevel, skillLevel));
      if (generalScope === "category") conditions.push(isNull(resources.subcategory));
      if (generalScope === "subcategory") conditions.push(isNull(resources.subSubcategory));
      if (tags.length > 0 && omit !== "tags") {
        const canonicalTags = Array.from(new Set(tags.map(normalizeTagFilter)));
        conditions.push(tagExists(sql`${canonicalTagSql} IN (${sql.join(canonicalTags.map((v) => sql`${v}`), sql`, `)})`));
      }
      if (searchCondition) conditions.push(searchCondition);
      return conditions;
    };

    const strictConditions = buildConditions(undefined, strictSearchCondition);
    const strictProbe = strictSearchCondition
      ? db.select({ id: resources.id }).from(resources).where(and(...strictConditions)).limit(1)
      : undefined;
    let activeSearchCondition = strictSearchCondition;
    let extendedFuzzyCondition: ReturnType<typeof sql> | undefined;

    // The fallback decision is part of the SQL predicate instead of a serial
    // preflight round trip. Strict rows always win; fuzzy rows become eligible
    // only when the same scoped strict query has no match.
    if (strictSearchCondition && strictProbe) {
      const fuzzyNeedle = normalizedSearch.toLowerCase();
      const fuzzyCompactNeedle = fuzzyNeedle.replace(/[^\p{L}\p{N}]+/gu, "");
      // pg_trgm operators are overloaded. Bound parameters otherwise arrive as
      // `unknown`, so a true no-match fallback can fail operator resolution
      // (`text % unknown`) instead of returning an empty result set.
      const fuzzyNeedleSql = sql`${fuzzyNeedle}::text`;
      const fuzzyCompactNeedleSql = sql`${fuzzyCompactNeedle}::text`;
      const compactTitle = sql`lower(regexp_replace(${resources.title}, '[^a-zA-Z0-9]+', '', 'g'))`;
      const transpositionTsQuery = Array.from(new Set(ftsTerms.flatMap((term) => {
        const chars = Array.from(term);
        return chars.slice(0, -1).map((_, index) => {
          const variant = [...chars];
          [variant[index], variant[index + 1]] = [variant[index + 1], variant[index]];
          return `${variant.join("")}:*`;
        });
      }))).slice(0, 64).join(" | ");
      const fuzzyCandidateScope = buildConditions(undefined, sql`TRUE`);
      const nearestTitleCandidates = db
        .select({ id: resources.id })
        .from(resources)
        .where(and(...fuzzyCandidateScope))
        .orderBy(sql`${compactTitle} <-> ${fuzzyCompactNeedleSql}`)
        .limit(50);
      const indexedFuzzyCondition = sql`(
        ${resources.title} % ${fuzzyNeedleSql}
        OR ${fuzzyNeedleSql} <% ${resources.title}
        OR ${fuzzyNeedleSql} <<% ${resources.title}
        OR ${compactTitle} % ${fuzzyCompactNeedleSql}
        OR ${resources.searchTsv} @@ to_tsquery('english', ${transpositionTsQuery})
        OR ${resources.description} % ${fuzzyNeedleSql}
        OR ${fuzzyNeedleSql} <% ${resources.description}
        OR ${resources.url} % ${fuzzyNeedleSql}
        OR ${fuzzyNeedleSql} <% ${resources.url}
      )`;
      extendedFuzzyCondition = sql`(
        ${indexedFuzzyCondition}
        OR (
          similarity(${compactTitle}, ${fuzzyCompactNeedleSql}) >= 0.2
          AND ${resources.id} IN (${nearestTitleCandidates})
        )
      )`;
      activeSearchCondition = sql`(
        ${strictSearchCondition}
        OR (NOT EXISTS (${strictProbe}) AND ${indexedFuzzyCondition})
      )`;
    }
    const conditions = buildConditions(undefined, activeSearchCondition);

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
      countQuery = countQuery.where(and(...conditions));
    }

    // R3-H08: server-side sort. Title sorts are case-insensitive; id is a
    // deterministic tiebreaker (createdAt is identical for bulk-seeded rows).
    const orderBy = (() => {
      switch (sort) {
        case "name-asc":
          return [asc(sql`lower(${resources.title})`), asc(resources.id)];
        case "name-desc":
          return [desc(sql`lower(${resources.title})`), desc(resources.id)];
        case "oldest":
          return [asc(resources.createdAt), asc(resources.id)];
        case "newest":
          return [desc(resources.createdAt), desc(resources.id)];
        case "relevance":
        default:
          // NB-013 (run18): when searching without an explicit sort, rank by
          // relevance — exact title match first, then the existing full-text
          // and trigram signals. This prevents a prefix match (for example,
          // "ffmpeg-wasm") from outranking a direct "FFmpeg" lookup.
          if (strictSearchCondition) {
            const q = normalizedSearch.toLowerCase();
            return [
              asc(sql`CASE WHEN ${strictSearchCondition} THEN 0 ELSE 1 END`),
              asc(sql`CASE WHEN lower(${resources.title}) = ${q} THEN 0 ELSE 1 END`),
              desc(sql`ts_rank_cd(${resources.searchTsv}, to_tsquery('english', ${tsQuery}))`),
              desc(sql`word_similarity(${q}, lower(${resources.title}))`),
              desc(sql`similarity(lower(${resources.title}), ${q})`),
              asc(sql`length(${resources.title})`),
              asc(sql`lower(${resources.title})`),
              asc(resources.id),
            ];
          }
          return [desc(resources.createdAt), desc(resources.id)];
      }
    })();

    const getFacetPromise = (
      facetSearchCondition: ReturnType<typeof sql> | undefined,
    ): Promise<ResourceSearchFacets | undefined> => {
      if (!includeFacets) return Promise.resolve(undefined);
      const whereSql = (omit?: Parameters<typeof buildConditions>[0]) => {
        const facetConditions = buildConditions(omit, facetSearchCondition);
        return facetConditions.length > 0 ? and(...facetConditions)! : sql`true`;
      };
      return db.execute(sql`
          SELECT facet, value, count
          FROM (
            SELECT 'category'::text AS facet, ${resources.category} AS value, count(*)::int AS count
            FROM ${resources}
            WHERE ${whereSql("category")}
            GROUP BY ${resources.category}
            UNION ALL
            SELECT 'subcategory', coalesce(${resources.subcategory}, ''), count(*)::int
            FROM ${resources}
            WHERE ${whereSql("subcategory")} AND ${resources.subcategory} IS NOT NULL
            GROUP BY ${resources.subcategory}
            UNION ALL
            SELECT 'subSubcategory', coalesce(${resources.subSubcategory}, ''), count(*)::int
            FROM ${resources}
            WHERE ${whereSql("subSubcategory")} AND ${resources.subSubcategory} IS NOT NULL
            GROUP BY ${resources.subSubcategory}
            UNION ALL
            SELECT 'provider', ${resources.provider}, count(*)::int
            FROM ${resources}
            WHERE ${whereSql("provider")}
            GROUP BY ${resources.provider}
            UNION ALL
            SELECT 'resourceFormat', ${resources.resourceFormat}, count(*)::int
            FROM ${resources}
            WHERE ${whereSql("resourceFormat")}
            GROUP BY ${resources.resourceFormat}
            UNION ALL
            SELECT 'skillLevel', ${resources.skillLevel}, count(*)::int
            FROM ${resources}
            WHERE ${whereSql("skillLevel")}
            GROUP BY ${resources.skillLevel}
            UNION ALL
            SELECT 'tag', ${canonicalTagSql}, count(DISTINCT ${resources.id})::int
            FROM ${resources}
            CROSS JOIN LATERAL (${resourceTagSource}) AS resource_tag(value)
            WHERE ${whereSql("tags")} AND trim(resource_tag.value) <> ''
            -- Group by the selected value instead of repeating canonicalTagSql.
            -- Drizzle assigns fresh parameter positions to repeated SQL
            -- fragments, so PostgreSQL does not consider the two rendered CASE
            -- expressions structurally identical (42803).
            GROUP BY 2
          ) facet_counts
          WHERE value <> ''
          ORDER BY facet, count DESC, lower(value), value
        `).then((result) => {
          const facets: ResourceSearchFacets = {
            categories: [],
            subcategories: [],
            subSubcategories: [],
            tags: [],
            providers: [],
            formats: [],
            skillLevels: [],
          };
          for (const row of result.rows as Array<{ facet: string; value: string; count: number | string }>) {
            const item = { value: String(row.value), count: Number(row.count) };
            switch (row.facet) {
              case "category": facets.categories.push(item); break;
              case "subcategory": facets.subcategories.push(item); break;
              case "subSubcategory": facets.subSubcategories.push(item); break;
              case "provider": facets.providers.push(item); break;
              case "resourceFormat": facets.formats.push(item); break;
              case "skillLevel": facets.skillLevels.push(item); break;
              case "tag": facets.tags.push(item); break;
            }
          }
          return facets;
        });
    };
    const facetPromise = getFacetPromise(activeSearchCondition);

    if (strictSearchCondition) {
      // Search pages get rows + total + mode from one SQL statement. The
      // window count avoids a second network round trip to the remote Postgres
      // service, which dominates latency far more than ranking 2k local rows.
      const searchQuery = db
        .select({
          ...getTableColumns(resources),
          searchTotal: sql<number>`count(*) over()::int`,
          strictMatch: strictSearchCondition,
        })
        .from(resources)
        .where(and(...conditions))
        .orderBy(...orderBy)
        .limit(limit)
        .offset(offset);
      let [searchRows, facets] = await Promise.all([searchQuery, facetPromise]);
      let total = searchRows[0]?.searchTotal ?? 0;
      // Preserve honest pagination for a now-out-of-range offset. This rare
      // recovery query is intentionally not paid on normal page-one searches.
      if (searchRows.length === 0 && offset > 0) {
        const [totalResult] = await countQuery;
        total = totalResult.count;
      }
      let searchMetadata: ResourceSearchMetadata = {
        mode: searchRows[0]?.strictMatch ? "fts" : "fuzzy",
      };
      // The indexed operators intentionally use conservative thresholds. If
      // they find fewer than two rows, broaden only this rare miss via the
      // compact-title GiST nearest-neighbour index (e.g. obsstuido, vidoe).
      if (searchMetadata.mode === "fuzzy" && total === 0 && extendedFuzzyCondition) {
        const recoveryConditions = buildConditions(undefined, extendedFuzzyCondition);
        const recoveryCountQuery = db
          .select({ count: sql<number>`count(*)::int` })
          .from(resources)
          .where(and(...recoveryConditions));
        const recoveryQuery = db
          .select({
            ...getTableColumns(resources),
            searchTotal: sql<number>`count(*) over()::int`,
            strictMatch: sql<boolean>`false`,
          })
          .from(resources)
          .where(and(...recoveryConditions))
          .orderBy(...orderBy)
          .limit(limit)
          .offset(offset);
        [searchRows, facets] = await Promise.all([
          recoveryQuery,
          getFacetPromise(extendedFuzzyCondition),
        ]);
        total = searchRows[0]?.searchTotal ?? 0;
        if (searchRows.length === 0 && offset > 0) {
          const [totalResult] = await recoveryCountQuery;
          total = totalResult.count;
        }
        searchMetadata = { mode: "fuzzy" };
      }
      const resourceList = searchRows.map(({ searchTotal: _total, strictMatch: _strict, ...resource }) => resource);
      if (searchMetadata.mode === "fuzzy" && resourceList[0]?.title) {
        searchMetadata.suggestion = bestSearchSuggestion(
          normalizedSearch,
          resourceList.map((resource) => resource.title),
        );
      }
      return {
        resources: resourceList,
        total,
        ...(facets ? { facets } : {}),
        search: searchMetadata,
      };
    }

    const [[totalResult], resourceList, facets] = await Promise.all([
      countQuery,
      query.orderBy(...orderBy).limit(limit).offset(offset),
      facetPromise,
    ]);
    return { resources: resourceList, total: totalResult.count, ...(facets ? { facets } : {}) };
  }

  /**
   * Get a resource by its ID
   * @param id - Resource ID
   * @returns Resource object or undefined if not found
   */
  async getResource(id: number): Promise<Resource | undefined> {
    const [resource] = await db.select().from(resources).where(eq(resources.id, id));
    return resource;
  }

  /**
   * Get a resource by its URL
   * @param url - Resource URL
   * @returns Resource object or undefined if not found
   */
  async getResourceByUrl(url: string): Promise<Resource | undefined> {
    const [resource] = await db.select().from(resources).where(eq(resources.url, url));
    return resource;
  }

  /**
   * Run19 BUG-013: exact-title duplicate check for the submit pipeline.
   * Case-insensitive, live statuses only (approved/pending) — a rejected
   * resource's title may be reused.
   */
  async getLiveResourceByTitle(title: string): Promise<Resource | undefined> {
    const [resource] = await db
      .select()
      .from(resources)
      .where(
        and(
          sql`lower(${resources.title}) = lower(${title.trim()})`,
          inArray(resources.status, ['approved', 'pending']),
        ),
      )
      .limit(1);
    return resource;
  }

  /**
   * Get total count of all resources
   * @returns Total number of resources in database
   */
  async getResourceCount(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)::int` }).from(resources);
    return result.count;
  }

  /**
   * Create a new resource
   * Automatically logs the creation to audit log
   * @param resource - Resource data to create
   * @returns The created resource
   */
  async createResource(resource: InsertResource): Promise<Resource> {
    // Task #248: universal write boundary — decode HTML entities in
    // title/description/hierarchy fields (never the URL) so "&amp;" text can
    // never be persisted, whatever the caller (routes, GitHub sync, AI).
    resource = this.normalizeResourceFacets(decodeResourceTextFields({ ...resource }), true);
    let newResource: Resource;
    try {
      [newResource] = await db.insert(resources).values(resource).returning();
    } catch (error: any) {
      // Task #215: if the resources id sequence has drifted behind max(id)
      // (rows were ever inserted with explicit ids by imports/seeds), the
      // insert fails with 23505 on the PRIMARY KEY and used to surface as an
      // intermittent opaque 500. Self-heal: resync the sequence to max(id)
      // and retry once. (URL-unique 23505s are NOT retried — they rethrow so
      // routes can map them to a 409.)
      const cause = error?.cause ?? error;
      const code = error?.code ?? cause?.code;
      const constraint = String(error?.constraint ?? cause?.constraint ?? '');
      if (code === '23505' && constraint === 'resources_pkey') {
        console.warn(
          'resources_id_seq drift detected (23505 on resources_pkey); resyncing sequence and retrying insert',
        );
        await db.execute(
          sql`SELECT setval('resources_id_seq', (SELECT COALESCE(max(id), 1) FROM resources))`,
        );
        [newResource] = await db.insert(resources).values(resource).returning();
      } else {
        throw error;
      }
    }

    invalidatePublicCache('resource-mutation');

    // Log the creation
    await this.logResourceAudit(newResource.id, 'created', resource.submittedBy ?? undefined);

    return newResource;
  }

  /**
   * Update an existing resource
   * Automatically logs the update to audit log
   * @param id - Resource ID to update
   * @param resource - Partial resource data to update
   * @returns The updated resource
   */
  async updateResource(id: number, resource: Partial<InsertResource>): Promise<Resource> {
    // Task #248: same universal decode boundary as createResource.
    resource = this.normalizeResourceFacets(decodeResourceTextFields({ ...resource }), false);
    const [updatedResource] = await db
      .update(resources)
      .set({ ...resource, updatedAt: new Date() })
      .where(eq(resources.id, id))
      .returning();

    if (updatedResource) invalidatePublicCache('resource-mutation');

    // Log the update
    await this.logResourceAudit(id, 'updated', resource.submittedBy ?? undefined, resource);

    return updatedResource;
  }

  /**
   * Universal write boundary for resource facets. Route validators provide
   * friendly errors, while this layer protects direct import/enrichment writes.
   * Missing create values intentionally become `unknown`; unsupported explicit
   * values throw rather than being silently guessed or downgraded.
   */
  private normalizeResourceFacets<T extends Partial<InsertResource>>(resource: T, fillDefaults: boolean): T {
    if (resource.resourceFormat !== undefined) {
      resource.resourceFormat = resourceFormatSchema.parse(resource.resourceFormat) as T["resourceFormat"];
    } else if (fillDefaults) {
      resource.resourceFormat = "unknown" as T["resourceFormat"];
    }
    if (resource.provider !== undefined) {
      resource.provider = resourceProviderSchema.parse(resource.provider) as T["provider"];
    } else if (fillDefaults) {
      resource.provider = "unknown" as T["provider"];
    }
    if (resource.skillLevel !== undefined) {
      resource.skillLevel = resourceSkillLevelSchema.parse(resource.skillLevel) as T["skillLevel"];
    } else if (fillDefaults) {
      resource.skillLevel = "unknown" as T["skillLevel"];
    }
    return resource;
  }

  /**
   * Bulk-mark resources as synced to GitHub in a single UPDATE.
   * Replaces the previous per-resource Promise.all pattern, which opened
   * thousands of parallel connections and exhausted the pg pool
   * ("timeout exceeded when trying to connect") on large exports.
   * @param ids - Resource IDs to flag as synced
   * @param syncedAt - Timestamp to record as lastSyncedAt
   */
  async markResourcesSynced(ids: number[], syncedAt: Date = new Date()): Promise<void> {
    if (ids.length === 0) return;
    const CHUNK = 5000;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const chunk = ids.slice(i, i + CHUNK);
      await db
        .update(resources)
        // NB-029 (run18): do NOT bump updatedAt here — sync bookkeeping is not
        // a content change. The July 2026 export stamped all 2,302 resources
        // with one identical updatedAt, which the sitemap then emitted as
        // 2,506 identical <lastmod> values (meaningless to crawlers).
        .set({ githubSynced: true, lastSyncedAt: syncedAt })
        .where(inArray(resources.id, chunk));
    }
  }

  /**
   * Update resource status (pending/approved/rejected)
   * When approving, sets approvedBy and approvedAt fields
   * @param id - Resource ID to update
   * @param status - New status value
   * @param approvedBy - User ID who approved (optional)
   * @returns The updated resource
   */
  async updateResourceStatus(id: number, status: string, approvedBy?: string): Promise<Resource> {
    const now = new Date();
    const expectedCurrentStatus =
      status === 'approved' || status === 'rejected'
        ? 'pending'
        : status === 'pending'
          ? 'approved'
          : undefined;
    const updateData: Partial<typeof resources.$inferInsert> = {
      status,
      statusChangedAt: now,
      updatedAt: now,
    };

    if (status === 'approved' && approvedBy) {
      updateData.approvedBy = approvedBy;
      updateData.approvedAt = now;
      updateData.contributorRejectionReason = null;
    }

    const updatedResource = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(resources)
        .set(updateData)
        .where(
          expectedCurrentStatus
            ? and(
                eq(resources.id, id),
                eq(resources.status, expectedCurrentStatus),
              )
            : eq(resources.id, id),
        )
        .returning();
      if (!updated) return undefined;

      await tx.insert(resourceAuditLog).values({
        resourceId: id,
        originalResourceId: id,
        action: status,
        performedBy: approvedBy,
        changes: { status },
      });
      return updated;
    });

    if (!updatedResource) {
      throw new Error(
        expectedCurrentStatus === 'pending'
          ? 'Resource is not pending approval'
          : expectedCurrentStatus === 'approved'
            ? 'Resource is not approved'
            : 'Resource not found',
      );
    }
    invalidatePublicCache('resource-mutation');
    return updatedResource;
  }

  /**
   * Delete a resource
   * Logs deletion to audit log before removing the resource
   * @param id - Resource ID to delete
   * @throws Error if resource not found
   */
  async deleteResource(id: number, performedBy?: string): Promise<void> {
    // Get resource before deletion for audit log
    const resource = await this.getResource(id);
    if (!resource) {
      throw new Error('Resource not found');
    }

    // Log the deletion BEFORE deleting: the audit row's resource_id FK references
    // resources(id), so it must be written while the row still exists. This is the
    // single source of the 'deleted' audit entry — callers must NOT log it again
    // afterward, or the post-delete insert violates the FK and the delete reports a
    // false 500 despite having succeeded.
    await this.logResourceAudit(
      id,
      'deleted',
      performedBy,
      { resource: { title: resource.title, url: resource.url, category: resource.category } },
      `Deleted resource: ${resource.title}`
    );

    // resource_edits FK to resources(id) has no ON DELETE CASCADE (unlike the
    // other child tables), so any suggested/approved edit rows must be removed
    // first or the resource delete fails with a foreign-key violation (false 500).
    await db.delete(resourceEdits).where(eq(resourceEdits.resourceId, id));

    // research_discoveries.created_resource_id is a nullable FK to resources(id)
    // with no ON DELETE action, so it would also block the delete with a
    // foreign-key violation (false 500). The discovery record itself is history
    // worth keeping, so null the back-reference rather than deleting the row.
    await db
      .update(researchDiscoveries)
      .set({ createdResourceId: null })
      .where(eq(researchDiscoveries.createdResourceId, id));

    await db.delete(resources).where(eq(resources.id, id));
    invalidatePublicCache('resource-mutation');
  }

  /**
   * Get all resources with pending status
   * @returns Object containing pending resources array and total count
   */
  async getPendingResources(): Promise<{ resources: (Resource & { submittedByEmail: string | null })[]; total: number }> {
    // Join the submitter so the admin approval queue can show a human-readable
    // identity (email) instead of the raw user UUID.
    const rows = await db
      .select({ resource: resources, submittedByEmail: users.email })
      .from(resources)
      .leftJoin(users, eq(resources.submittedBy, users.id))
      .where(eq(resources.status, 'pending'))
      .orderBy(desc(resources.createdAt));

    const pendingResources = rows.map((row) => ({
      ...row.resource,
      submittedByEmail: row.submittedByEmail ?? null,
    }));

    return {
      resources: pendingResources,
      total: pendingResources.length
    };
  }

  /**
   * Get every approved resource as a flat array.
   * Used by export, link-health, and awesome-lint validation, which operate on the
   * full published set rather than a paginated page.
   */
  async getAllApprovedResources(): Promise<Resource[]> {
    return await db
      .select()
      .from(resources)
      .where(eq(resources.status, 'approved'))
      .orderBy(desc(resources.createdAt));
  }

  /**
   * Approve a pending resource
   * Sets status to 'approved' and records approver and timestamp
   * @param id - Resource ID to approve
   * @param approvedBy - User ID who is approving
   * @returns The approved resource
   * @throws Error if resource not found or not pending
   */
  async approveResource(id: number, approvedBy: string): Promise<Resource> {
    const approved = await db.transaction(async (tx) => {
      const now = new Date();
      const [updated] = await tx
        .update(resources)
        .set({
          status: 'approved',
          approvedBy,
          approvedAt: now,
          contributorRejectionReason: null,
          statusChangedAt: now,
          updatedAt: now,
        })
        .where(and(eq(resources.id, id), eq(resources.status, 'pending')))
        .returning();
      if (!updated) return undefined;

      await tx.insert(resourceAuditLog).values({
        resourceId: id,
        originalResourceId: id,
        action: 'approved',
        performedBy: approvedBy,
        changes: { previousStatus: 'pending', newStatus: 'approved' },
        notes: 'Resource approved by admin',
      });
      return updated;
    });

    if (!approved) throw new Error('Resource is not pending approval');
    invalidatePublicCache('resource-mutation');
    return approved;
  }

  /**
   * Reject a pending resource
   * Sets status to 'rejected' and logs the reason
   * @param id - Resource ID to reject
   * @param adminId - User ID who is rejecting
   * @param reason - Rejection reason (minimum 10 characters)
   * @throws Error if resource not found, not pending, or reason too short
   */
  async rejectResource(id: number, adminId: string, reason: string): Promise<void> {
    if (!reason || reason.trim().length < 10) {
      throw new Error('Rejection reason must be at least 10 characters');
    }

    const rejected = await db.transaction(async (tx) => {
      const now = new Date();
      const contributorReason = reason.trim();
      const [updated] = await tx
        .update(resources)
        .set({
          status: 'rejected',
          contributorRejectionReason: contributorReason,
          statusChangedAt: now,
          updatedAt: now,
        })
        .where(and(eq(resources.id, id), eq(resources.status, 'pending')))
        .returning();
      if (!updated) return undefined;

      await tx.insert(resourceAuditLog).values({
        resourceId: id,
        originalResourceId: id,
        action: 'rejected',
        performedBy: adminId,
        changes: {
          previousStatus: 'pending',
          newStatus: 'rejected',
          reason: contributorReason,
        },
        notes: `Resource rejected: ${contributorReason}`,
      });
      return updated;
    });
    if (!rejected) throw new Error('Resource is not pending approval');
    invalidatePublicCache('resource-mutation');
  }

  /**
   * Soft-withdraw one pending submission owned by a contributor.
   *
   * The ownership and status predicates live in the UPDATE itself so an admin
   * decision racing this request wins cleanly: PostgreSQL re-checks the
   * predicate after acquiring the row lock and returns no row on conflict.
   * The audit record is in the same transaction as the state change.
   */
  async withdrawPendingSubmission(id: number, userId: string): Promise<Resource | undefined> {
    const withdrawn = await db.transaction(async (tx) => {
      const [withdrawn] = await tx
        .update(resources)
        .set({
          status: 'withdrawn',
          statusChangedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(resources.id, id),
            eq(resources.submittedBy, userId),
            eq(resources.status, 'pending'),
          ),
        )
        .returning();

      if (!withdrawn) return undefined;

      await tx.insert(resourceAuditLog).values({
        resourceId: id,
        originalResourceId: id,
        action: 'withdrawn',
        performedBy: userId,
        changes: { previousStatus: 'pending', newStatus: 'withdrawn' },
        notes: 'Contributor withdrew pending resource submission',
      });

      return withdrawn;
    });
    if (withdrawn) invalidatePublicCache('resource-mutation');
    return withdrawn;
  }

  /**
   * Log a resource audit event
   * Private helper method for tracking all resource changes
   * @param resourceId - Resource ID (can be null for system-level events)
   * @param action - Action performed (created/updated/deleted/approved/rejected)
   * @param performedBy - User ID who performed the action
   * @param changes - Object containing the changes made
   * @param notes - Additional notes about the action
   */
  private async logResourceAudit(
    resourceId: number | null,
    action: string,
    performedBy?: string,
    changes?: Record<string, unknown>,
    notes?: string
  ): Promise<void> {
    await db.insert(resourceAuditLog).values({
      resourceId,
      originalResourceId: resourceId, // Preserve original ID even if resource is deleted later
      action,
      performedBy,
      changes,
      notes
    });
  }
}

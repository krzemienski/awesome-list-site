/**
 * Public-facing resource serialization.
 *
 * Strips internal-only columns from resource objects before they cross the
 * public API boundary. Applied at EVERY public send site that returns a
 * resource — list, search, detail, related, the awesome-list tree, and the
 * `/api/public/*` surface — so internal fields never leak and responses stay
 * lean.
 *
 * Stripped (BUG-027 run13, in addition to the original `searchTsv`):
 * - `submittedBy` / `approvedBy` — internal user ids (PII-adjacent)
 * - `githubSynced` / `lastSyncedAt` — sync-pipeline state
 * - `updatedAt` / `approvedAt` — moderation/sync bookkeeping (Audit2 BUG-013;
 *   `createdAt` stays: it powers the public "Added on …" line on detail pages)
 * - metadata AI-pipeline internals: `source`, `confidence`, `discoveryId`,
 *   `researchJobId`, `enrichmentError`, `enrichment_error`
 * - metadata import/sync bookkeeping observed live on /api/awesome-list
 *   (Audit2 BUG-013): `sourceList`, `sourceCategories`, `importedAt`,
 *   `importedFrom`, `lastUpdatedAt`, `lastUpdatedFrom`, taxonomy FK ids
 *   (`categoryId`, `subcategoryId`, `subSubcategoryId`), AI scratch fields
 *   (`aiModel`, `aiEnriched`, `aiEnrichedAt`, `suggested*`), `urlScrapedAt`
 *
 * Kept: user-facing metadata (tags, ogImage, favicon, siteName, author,
 * `urlScraped` + `scrapedTitle` — both rendered by ResourceCard/ResourceDetail
 * as the "Metadata fetched" / "Page Title" verification UI).
 * Admin surfaces read raw rows via the authed /api/admin/* endpoints, which
 * do NOT pass through this serializer.
 */
const INTERNAL_METADATA_KEYS = [
  "source",
  "confidence",
  "discoveryId",
  "researchJobId",
  "enrichmentError",
  "enrichment_error",
  // Audit2 BUG-013: import/sync bookkeeping + AI scratch fields, never
  // consumed by any client code (verified by grep + live payload scan).
  "sourceList",
  "sourceCategories",
  "importedAt",
  "importedFrom",
  "lastUpdatedAt",
  "lastUpdatedFrom",
  "categoryId",
  "subcategoryId",
  "subSubcategoryId",
  "aiModel",
  "aiEnriched",
  "aiEnrichedAt",
  "suggestedTags",
  "suggestedCategory",
  "suggestedSubcategory",
  "urlScrapedAt",
] as const;

export function stripInternalResourceFields<T extends Record<string, any>>(r: T): T {
  if (!r || typeof r !== "object") return r;
  const { searchTsv, submittedBy, approvedBy, githubSynced, lastSyncedAt, updatedAt, approvedAt, ...rest } = r as any;
  if (rest.metadata && typeof rest.metadata === "object" && !Array.isArray(rest.metadata)) {
    const meta = { ...rest.metadata };
    let changed = false;
    for (const key of INTERNAL_METADATA_KEYS) {
      if (key in meta) {
        delete meta[key];
        changed = true;
      }
    }
    if (changed) rest.metadata = meta;
  }
  return rest as T;
}

/**
 * Public-facing resource serialization.
 *
 * Allowlists public columns and metadata before resource objects cross the
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
 * - `contributorRejectionReason` / `statusChangedAt` — moderation bookkeeping;
 *   contributors read their own reasons through /api/user/contributions
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
 *
 * Added (design parity, resource kinds): `kind` (stored value or null) and
 * `resolvedKind` (read-time resolution, see server/lib/resourceKinds.ts).
 * Because this is the single choke point, every public surface — list,
 * search, detail, related, the awesome-list tree + listing pages, the
 * `/api/public/*` surface and recommendations — gains both fields at once;
 * journey step embeds must call this same projection after checking status.
 */
import { withResourceKindFields, type ResourceKind } from "./resourceKinds";

export interface PublicResourceFields {
  kind: ResourceKind | null;
  resolvedKind: ResourceKind;
}

const PUBLIC_METADATA_STRINGS = [
  "ogImage", "ogImageBlurhash", "favicon", "siteName", "author",
  "scrapedTitle", "scrapedDescription", "ogTitle", "ogDescription", "twitterCard",
] as const;

// Explicitly include user-owned bookmark annotations, not arbitrary row columns.
const PUBLIC_RESOURCE_KEYS = [
  "id", "title", "url", "description", "category", "subcategory", "subSubcategory",
  "resourceFormat", "provider", "skillLevel", "kind", "status", "createdAt",
  "resourceId", "favoritedAt", "notes", "bookmarkedAt", "queueStatus", "archivedAt",
  "personalTags", "collectionIds",
] as const;

export function stripInternalResourceFields<T extends Record<string, any>>(r: T): T & PublicResourceFields {
  if (!r || typeof r !== "object") return r;
  const rest: Record<string, any> = {};
  for (const key of PUBLIC_RESOURCE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(r, key)) rest[key] = r[key];
  }
  if (r.metadata && typeof r.metadata === "object" && !Array.isArray(r.metadata)) {
    const meta: Record<string, unknown> = {};
    for (const key of PUBLIC_METADATA_STRINGS) {
      if (typeof r.metadata[key] === "string") meta[key] = r.metadata[key];
    }
    if (Array.isArray(r.metadata.tags)) {
      meta.tags = r.metadata.tags.filter((tag: unknown) => typeof tag === "string");
    }
    for (const key of ["featured", "urlScraped"] as const) {
      if (typeof r.metadata[key] === "boolean" || r.metadata[key] === "true" || r.metadata[key] === "false") {
        meta[key] = r.metadata[key];
      }
    }
    rest.metadata = meta;
  }
  return withResourceKindFields(rest as T);
}

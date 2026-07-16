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
 * - metadata AI-pipeline internals: `source`, `confidence`, `discoveryId`,
 *   `researchJobId`, `enrichmentError`, `enrichment_error`
 *
 * Kept: user-facing metadata (tags, ogImage, favicon, siteName, etc.).
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
] as const;

export function stripInternalResourceFields<T extends Record<string, any>>(r: T): T {
  if (!r || typeof r !== "object") return r;
  const { searchTsv, submittedBy, approvedBy, githubSynced, lastSyncedAt, ...rest } = r as any;
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

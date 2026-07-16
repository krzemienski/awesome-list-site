/**
 * Public-facing resource serialization.
 *
 * Strips internal-only columns (e.g. the `searchTsv` full-text vector, an
 * implementation detail of Postgres search ranking) from resource objects
 * before they cross the public API boundary. Applied at EVERY public send site
 * that returns a resource — list, search, detail, related, the awesome-list
 * tree, and the `/api/public/*` surface — so the internal field never leaks and
 * responses stay lean.
 */
export function stripInternalResourceFields<T extends Record<string, any>>(r: T): T {
  if (!r || typeof r !== "object") return r;
  const { searchTsv, ...rest } = r as any;
  return rest as T;
}

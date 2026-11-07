// A lazy chunk or route stylesheet that failed to load: a deploy rotated the
// hashed asset names, or the browser is offline. React caches the rejected
// lazy() import, so re-rendering can never recover; only a reload can.
// C8-V2-01: Vite rejects a route import with "Unable to preload CSS for …"
// when the route's stylesheet can't load — the same failure as a missing chunk.
const CHUNK_ERROR_RE =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError|Loading chunk [\d]+ failed|Unable to preload CSS/i;

export function isChunkLoadError(error: unknown): boolean {
  return error instanceof Error && CHUNK_ERROR_RE.test(`${error.name}: ${error.message}`);
}

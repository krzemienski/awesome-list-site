// Mirrors the conservative plural fold in server/lib/tagCanonicalize.ts so
// shared/bookmarked tag URLs like /?tags=codecs still match the canonical
// "codec" tag. Keep PLURAL_KEEP in sync with the server list.
const PLURAL_KEEP = new Set([
  "hls", "obs", "oss", "os", "css", "mss", "cbcs", "cbs", "dts", "ts",
  "graphics", "analytics", "analysis", "ios", "tvos", "macos", "nas",
  "kubernetes", "less", "sass", "aws", "cors", "https", "dns", "tls",
  "sas", "saas", "paas", "iaas", "ffmpeg-libs", "canvas", "atmos",
  "axios", "redis", "postgres", "jenkins", "devops", "chaos",
]);

// BUG-064 (run27): every page that accepts a tag filter in the URL must parse
// it the same way. Before this, Home read only the FIRST ?tags= value (so
// ?tags=RTMP&tags=HLS silently applied just RTMP), Subcategory kept empty/
// whitespace chunks (so ?tags=+++ filtered everything out), and only some
// pages honored the ?tag= alias. One parser: collects every ?tags=/?tag=
// occurrence, splits on commas, trims, drops empties, and dedupes on the
// canonical form (first spelling wins).
export function parseTagsParam(params: URLSearchParams): string[] {
  const raw = [...params.getAll("tags"), ...params.getAll("tag")];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const chunk of raw) {
    for (const piece of chunk.split(",")) {
      const trimmed = piece.trim();
      if (!trimmed) continue;
      const key = normalizeTag(trimmed);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(trimmed);
    }
  }
  return out;
}

export function normalizeTag(tag: string): string {
  const folded = tag.trim().toLowerCase().replace(/[\s_]+/g, "-");
  if (PLURAL_KEEP.has(folded)) return folded;
  if (folded.length > 4 && folded.endsWith("ies")) {
    return folded.slice(0, -3) + "y";
  }
  if (folded.length > 3 && folded.endsWith("s") && !folded.endsWith("ss")) {
    return folded.slice(0, -1);
  }
  return folded;
}

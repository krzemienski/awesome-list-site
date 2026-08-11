import { normalizeTagFilter, parseTagFilterValues } from "@shared/tagNormalize";

// BUG-064 (run27): every page that accepts a tag filter in the URL must parse
// it the same way. Before this, Home read only the FIRST ?tags= value (so
// ?tags=RTMP&tags=HLS silently applied just RTMP), Subcategory kept empty/
// whitespace chunks (so ?tags=+++ filtered everything out), and only some
// pages honored the ?tag= alias. One parser: collects every ?tags=/?tag=
// occurrence, splits on commas, trims, drops empties, and dedupes on the
// canonical form (first spelling wins).
export function parseTagsParam(params: URLSearchParams): string[] {
  const raw = [...params.getAll("tags"), ...params.getAll("tag")];
  const canonical = parseTagFilterValues(raw);
  const firstSpelling = new Map<string, string>();
  for (const chunk of raw) {
    for (const piece of chunk.split(",")) {
      const trimmed = piece.trim();
      const key = normalizeTag(trimmed);
      if (key && !firstSpelling.has(key)) firstSpelling.set(key, trimmed);
    }
  }
  return canonical.map((key) => firstSpelling.get(key) ?? key);
}

export function normalizeTag(tag: string): string {
  return normalizeTagFilter(tag);
}

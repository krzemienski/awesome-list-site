/**
 * Conservative URL/filter normalization for tags.
 *
 * This is intentionally shared by the browser and server so plural deep links
 * (for example `codecs`) keep matching the canonical singular tag (`codec`).
 */
export const TAG_PLURAL_KEEP = new Set([
  "hls", "obs", "oss", "os", "css", "mss", "cbcs", "cbs", "dts", "ts",
  "graphics", "analytics", "analysis", "ios", "tvos", "macos", "nas",
  "kubernetes", "less", "sass", "aws", "cors", "https", "dns", "tls",
  "sas", "saas", "paas", "iaas", "ffmpeg-libs", "canvas", "atmos",
  "axios", "redis", "postgres", "jenkins", "devops", "chaos",
]);

export function normalizeTagFilter(tag: string): string {
  const folded = tag.trim().toLowerCase().replace(/[\s_]+/g, "-");
  if (TAG_PLURAL_KEEP.has(folded)) return folded;
  if (folded.length > 4 && folded.endsWith("ies")) {
    return folded.slice(0, -3) + "y";
  }
  if (folded.length > 3 && folded.endsWith("s") && !folded.endsWith("ss")) {
    return folded.slice(0, -1);
  }
  return folded;
}

/**
 * Parse every value from repeated `tags` / legacy `tag` query parameters.
 * Each occurrence may itself be a comma list. Values are returned in their
 * canonical filter form and deduplicated in first-seen order.
 */
export function parseTagFilterValues(values: Iterable<unknown>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (typeof value !== "string") continue;
    for (const piece of value.split(",")) {
      const tag = normalizeTagFilter(piece);
      if (!tag || seen.has(tag)) continue;
      seen.add(tag);
      out.push(tag);
    }
  }
  return out;
}
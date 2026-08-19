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

/** Minimum approved-resource count for an indexable tag landing page. */
export const TAG_LANDING_MIN_RESOURCES = 5;

const TAG_DISPLAY_ACRONYMS = new Set([
  "ai", "api", "av1", "cdn", "dash", "drm", "ffmpeg", "hls", "hdr", "hevc",
  "html5", "ios", "mpeg", "obs", "ott", "rtmp", "sdk", "srt", "ssai",
  "vmaf", "vp9", "webrtc",
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

/** Decode a route segment and return its canonical tag identity. */
export function normalizeTagPathSegment(segment: string): string {
  try {
    return normalizeTagFilter(decodeURIComponent(segment));
  } catch {
    return "";
  }
}

/** Build the one canonical, URL-segment-safe landing-page path for a tag. */
export function tagLandingPath(tag: string): string {
  return `/tag/${encodeURIComponent(normalizeTagFilter(tag))}`;
}

/** Human-readable label for a canonical tag slug. */
export function tagDisplayName(tag: string): string {
  return normalizeTagFilter(tag)
    .split("-")
    .filter(Boolean)
    .map((word) =>
      TAG_DISPLAY_ACRONYMS.has(word)
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
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
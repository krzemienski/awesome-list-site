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

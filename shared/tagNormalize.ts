/**
 * Conservative URL/filter normalization for tags.
 *
 * This is intentionally shared by the browser and server so plural deep links
 * (for example `codecs`) keep matching the canonical singular tag (`codec`).
 */
export const TAG_PLURAL_KEEP = new Set([
  "hls", "obs", "oss", "os", "css", "mss", "cbcs", "cbs", "dts", "ts",
  "graphics", "analytics", "analysis", "ios", "ipados", "tvos", "macos", "watchos",
  "visionos", "nas",
  "kubernetes", "less", "sass", "aws", "cors", "https", "dns", "tls",
  "sas", "saas", "paas", "iaas", "ffmpeg-libs", "canvas", "atmos",
  "axios", "redis", "postgres", "jenkins", "devops", "chaos",
  // Names and singular nouns that end in "s" and occur as catalog tags.
  "windows", "aaos", "kinesis", "bioinformatics", "esports", "haptics",
  "jingos", "libopus", "llhls", "lufs", "mpegts", "vorbis", "ptzoptics",
  "qualabs", "lms", "unityads", "vcms", "series", "prometheus",
]);

/**
 * Slugs the fold produced before those names joined TAG_PLURAL_KEEP. They were
 * public (/tag/window was indexed), so old links resolve to the corrected tag.
 */
const RETIRED_TAG_SLUGS: Record<string, string> = {
  window: "windows", aao: "aaos", "amazon-kinesi": "amazon-kinesis",
  bioinformatic: "bioinformatics", esport: "esports", haptic: "haptics",
  jingo: "jingos", libopu: "libopus", llhl: "llhls", luf: "lufs",
  mpegt: "mpegts", "ogg-vorbi": "ogg-vorbis", ptzoptic: "ptzoptics",
  qualab: "qualabs", "tutor-lm": "tutor-lms", unityad: "unityads",
  vcm: "vcms", "vega-sery": "vega-series", prometheu: "prometheus",
};

/** Minimum approved-resource count for an indexable tag landing page. */
export const TAG_LANDING_MIN_RESOURCES = 5;

const TAG_DISPLAY_ACRONYMS = new Set([
  "ai", "amd", "api", "av1", "cdn", "dash", "drm", "ffmpeg", "hls", "hdr", "hevc",
  "html5", "ios", "mpeg", "obs", "ott", "rtmp", "sdk", "srt", "ssai",
  "vmaf", "vp9", "webrtc", "aaos", "llhls", "lufs", "lms", "vcms", "mpegts",
  "avc", "aws", "cli", "evc", "fpga", "gpu", "gui", "http", "https", "iso", "itu",
  "mkv", "mp4", "p2p", "psnr", "qoe", "rist", "rtp", "rtsp", "smpte", "svta", "tcp",
  "udp", "uhd", "vast", "vfx", "vod", "vp8", "vpaid", "vvc", "w3c", "wcg",
  "3d", "4k", "5g", "8k", "aac", "acm", "aosp", "asc", "ass", "atsc", "av", "avi",
  "avif", "avs", "avs2", "avs3", "bbc", "bif", "cabr", "cd", "cdl", "cdm", "cea",
  "ci", "cmaf", "cms", "cncf", "cors", "cpix", "crf", "css", "cta", "ctv", "cuda", "dct",
  "dmx512", "dns", "dvb", "dvd", "dvr", "ebu", "eia", "eotf", "esp32", "flv", "ftl",
  "gan", "gfvc", "gif", "glsl", "gtk4", "hd", "hdmi", "hdr10", "hlg",
  "iab", "iec", "ietf", "ima", "ima3", "imsc", "ip", "ipmx", "iptv", "isdb",
  "jpeg", "json", "jw", "kde", "kvm", "lcevc", "llm", "lut", "m3u8", "midi", "mjpeg",
  "ml", "mp3", "mpai", "mpd", "mpegif", "mpquic", "ms", "nab", "nasa", "natpe", "nle",
  "npu", "pcc", "pcm", "pku", "pq", "pq10", "quic", "rfc", "scte", "sd", "sdr", "sfn",
  "sfu", "speke", "srtp", "ssa", "ssh", "ssim", "tt", "ttml", "ugc", "uhdtv", "ui",
  "url", "vceg", "vcl", "vesa", "vlc", "vmap", "vr", "wasm", "wav", "wpf",
  "xl", "xml", "hdr10+", "eev", "vm", "ecdn", "bavc",
]);

/**
 * Casing for names that are neither plain Title Case nor an all-caps acronym
 * (ffmpeg -> "FFmpeg", webassembly -> "WebAssembly"). Keyed by the normalized
 * tag slug. Lives here, beside tagDisplayName(), so the client h1/title, the
 * server og:title and the related-tag chips all read one display source.
 */
const TAG_BRAND_CASING = new Map<string, string>(Object.entries({
  ffmpeg: "FFmpeg",
  webassembly: "WebAssembly",
  webgl: "WebGL",
  webgpu: "WebGPU",
  webrtc: "WebRTC",
  webvtt: "WebVTT",
  javascript: "JavaScript",
  typescript: "TypeScript",
  nodejs: "Node.js",
  "node-js": "Node.js",
  graphql: "GraphQL",
  postgresql: "PostgreSQL",
  mysql: "MySQL",
  openai: "OpenAI",
  youtube: "YouTube",
  gstreamer: "GStreamer",
  libvpx: "libvpx",
  libav: "libav",
  macos: "macOS",
  ios: "iOS",
  tvos: "tvOS",
  ipados: "iPadOS",
  watchos: "watchOS",
  visionos: "visionOS",
  prometheus: "Prometheus",
  dashjs: "dash.js",
  "dash-js": "dash.js",
  hlsjs: "hls.js",
  "hls-js": "hls.js",
  videojs: "Video.js",
  "video-js": "Video.js",
  jquery: "jQuery",
  opencv: "OpenCV",
  gocv: "GoCV",
  buydrm: "BuyDRM",
  qt: "Qt",
  webm: "WebM",
  webp: "WebP",
  x264: "x264",
  x265: "x265",
  "isdb-tb": "ISDB-Tb",
  iot: "IoT",
  hbbtv: "HbbTV",
  voip: "VoIP",
  "ci-cd": "CI/CD",
  "cea-608": "CEA 608",
  "scte-35": "SCTE 35",
  "ms-ssim": "MS SSIM",
  mpv: "mpv",
  "risc-v": "RISC-V",
  "itu-r": "ITU-R",
  "dash-if": "DASH-IF",
  "cloud-tv": "CloudTV",
  "ffmpeg.wasm": "ffmpeg.wasm",
  "api.video": "api.video",
  gav1: "gav1",
}));

export function normalizeTagFilter(tag: string): string {
  const folded = tag.trim().toLowerCase().replace(/[\s_]+/g, "-");
  if (TAG_PLURAL_KEEP.has(folded)) return folded;
  // Audit cycle-01 F008: compound tags must respect the keep-list on their
  // FINAL word too — "video analysis" folds to "video-analysis", whose last
  // word "analysis" is kept, so it must not singularize to "video-analysi"
  // (broken slug + mis-titled h1 on the public tag page).
  const lastToken = folded.slice(folded.lastIndexOf("-") + 1);
  if (TAG_PLURAL_KEEP.has(lastToken)) return folded;
  // A final word after a dot is a name suffix ("video.js", "node.js"), never
  // a plural; trimming it produced /tag/video.j.
  if (folded.lastIndexOf(".") > folded.lastIndexOf("-")) return folded;
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
    const tag = normalizeTagFilter(decodeURIComponent(segment));
    return Object.hasOwn(RETIRED_TAG_SLUGS, tag) ? RETIRED_TAG_SLUGS[tag] : tag;
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
  // The raw key is tried first: some brand keys ("ipados") are not plural-safe.
  const raw = tag.trim().toLowerCase().replace(/[\s_]+/g, "-");
  const slug = normalizeTagFilter(tag);
  const branded = TAG_BRAND_CASING.get(raw) ?? TAG_BRAND_CASING.get(slug);
  if (branded) return branded;
  return slug
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
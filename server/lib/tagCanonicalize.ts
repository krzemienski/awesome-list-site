/**
 * Run24 R5-063 + NB-015 residual: canonical tag mapping shared by the
 * maintenance migration endpoint (and unit-probeable from scripts).
 *
 * Three folds, applied family-wise over the whole corpus:
 *   1. Separator fold: trim, lowercase, collapse spaces/underscores to "-"
 *      ("live streaming" / "live_streaming" / "Live-Streaming" → one family).
 *   2. Plural fold (conservative): a plural family merges into its singular
 *      ONLY when the singular family also exists in the corpus — "apis"→"api",
 *      "codecs"→"codec", "libraries"→"library". Never fires on -ss words or
 *      on the keep-list (hls, obs, graphics, …).
 *   3. Brand casing: a curated map picks the display label for known
 *      brands/acronyms; otherwise the most frequent spelling in the merged
 *      family wins (ties broken lexicographically, so reruns are stable).
 */

export const BRAND_CASING: Record<string, string> = {
  'ffmpeg': 'FFmpeg', 'nginx': 'NGINX', 'api': 'API', 'avplayer': 'AVPlayer',
  'aws': 'AWS', 'avi': 'AVI', 'cdn': 'CDN', 'c++': 'C++', 'apple': 'Apple',
  'cross-platform': 'Cross-platform', 'hls': 'HLS', 'dash': 'DASH',
  'mpeg-dash': 'MPEG-DASH', 'drm': 'DRM', 'vod': 'VOD', 'av1': 'AV1',
  'hevc': 'HEVC', 'h264': 'H.264', 'h.264': 'H.264', 'h265': 'H.265',
  'h.265': 'H.265', 'macos': 'macOS', 'ios': 'iOS', 'tvos': 'tvOS',
  'android': 'Android', 'javascript': 'JavaScript', 'typescript': 'TypeScript',
  'python': 'Python', 'rust': 'Rust', 'gpu': 'GPU', 'sdk': 'SDK',
  'cli': 'CLI', 'rtmp': 'RTMP', 'srt': 'SRT', 'rist': 'RIST',
  'webrtc': 'WebRTC', 'mp4': 'MP4', 'cmaf': 'CMAF', 'abr': 'ABR',
  'qoe': 'QoE', 'vmaf': 'VMAF', 'opencv': 'OpenCV', 'obs': 'OBS',
  'vlc': 'VLC', 'gstreamer': 'GStreamer', 'x264': 'x264', 'x265': 'x265',
  'html5': 'HTML5', 'json': 'JSON', 'xml': 'XML', 'ai': 'AI', 'ui': 'UI',
  'url': 'URL', 'http': 'HTTP', 'https': 'HTTPS', 'tcp': 'TCP', 'udp': 'UDP',
  'rtp': 'RTP', 'rtsp': 'RTSP', 'scte-35': 'SCTE-35', 'id3': 'ID3',
  'mpeg': 'MPEG', 'mpeg-ts': 'MPEG-TS', 'vp9': 'VP9', 'vvc': 'VVC',
  'linux': 'Linux', 'windows': 'Windows', 'docker': 'Docker',
  'kubernetes': 'Kubernetes', 'github': 'GitHub', 'youtube': 'YouTube',
  // Run24 NB-015 residual — brand-case stragglers called out in REPORT-R5
  // (aac, dvb, golang, nodejs, roku, mkv) + companions of already-mapped keys.
  'aac': 'AAC', 'dvb': 'DVB', 'go': 'Go', 'golang': 'Go',
  'nodejs': 'Node.js', 'node.js': 'Node.js', 'node': 'Node.js',
  'roku': 'Roku', 'mkv': 'MKV', 'webm': 'WebM', 'mp3': 'MP3',
  'hdr': 'HDR', 'sdr': 'SDR', 'hdr10': 'HDR10', 'ffprobe': 'ffprobe',
  'gif': 'GIF', 'png': 'PNG', 'svg': 'SVG', 'ts': 'MPEG-TS',
  'wasm': 'WebAssembly', 'webassembly': 'WebAssembly',
  'oss': 'OSS', 'os': 'OS', 'css': 'CSS', 'html': 'HTML',
  'react': 'React', 'vue': 'Vue', 'angular': 'Angular', 'swift': 'Swift',
  'kotlin': 'Kotlin', 'java': 'Java', 'c#': 'C#', '.net': '.NET',
  'php': 'PHP', 'ruby': 'Ruby', 'lua': 'Lua', 'perl': 'Perl',
  'gcp': 'GCP', 'azure': 'Azure', 'grafana': 'Grafana',
  'prometheus': 'Prometheus', 'redis': 'Redis', 'postgresql': 'PostgreSQL',
  'mysql': 'MySQL', 'mongodb': 'MongoDB', 'graphql': 'GraphQL',
  'rest': 'REST', 'grpc': 'gRPC', 'websocket': 'WebSocket',
  'websockets': 'WebSocket', 'twitch': 'Twitch', 'netflix': 'Netflix',
  'akamai': 'Akamai', 'cloudflare': 'Cloudflare', 'fastly': 'Fastly',
  'mux': 'Mux', 'wowza': 'Wowza', 'shaka': 'Shaka', 'exoplayer': 'ExoPlayer',
  'hls.js': 'hls.js', 'video.js': 'Video.js', 'videojs': 'Video.js',
  'dash.js': 'dash.js', 'mediasource': 'MediaSource', 'mse': 'MSE',
  'eme': 'EME', 'widevine': 'Widevine', 'fairplay': 'FairPlay',
  'playready': 'PlayReady', 'ttml': 'TTML', 'webvtt': 'WebVTT',
  'imsc': 'IMSC', 'smpte': 'SMPTE', 'atsc': 'ATSC', 'nab': 'NAB',
  'ndi': 'NDI', 'ptz': 'PTZ', 'ip': 'IP', 'p2p': 'P2P', 'iptv': 'IPTV',
  'ott': 'OTT', 'svod': 'SVOD', 'avod': 'AVOD', 'ssai': 'SSAI',
  'csai': 'CSAI', 'vast': 'VAST', 'vpaid': 'VPAID', 'vmap': 'VMAP',
  'scte': 'SCTE', 'ebu': 'EBU', 'quic': 'QUIC', 'moq': 'MoQ',
  'webgl': 'WebGL', 'webgpu': 'WebGPU', 'opengl': 'OpenGL',
  'vulkan': 'Vulkan', 'cuda': 'CUDA', 'nvenc': 'NVENC', 'vaapi': 'VA-API',
  'qsv': 'QSV', 'arm': 'ARM', 'x86': 'x86', 'risc-v': 'RISC-V',
};

/** Families that end in "s" but must never be depluralized. */
const PLURAL_KEEP = new Set([
  'hls', 'obs', 'oss', 'os', 'css', 'mss', 'cbcs', 'cbs', 'dts', 'ts',
  'graphics', 'analytics', 'analysis', 'ios', 'tvos', 'macos', 'nas',
  'kubernetes', 'less', 'sass', 'aws', 'cors', 'https', 'dns', 'tls',
  'sas', 'saas', 'paas', 'iaas', 'ffmpeg-libs', 'canvas', 'atmos',
  'axios', 'redis', 'postgres', 'jenkins', 'devops', 'chaos',
]);

/** Fold one raw tag to its separator-folded lowercase family key. */
export function foldTagFamily(tag: string): string {
  return tag.trim().toLowerCase().replace(/[\s_]+/g, '-');
}

/**
 * Given every raw tag occurrence in the corpus, produce a map from raw tag
 * string → canonical display label. Tags whose canonical form equals the raw
 * form are still present in the map (identity), so callers can just look up.
 */
export function buildCanonicalTagMap(allTags: string[]): {
  canonicalByRaw: Map<string, string>;
  variantFamilies: number;
  pluralMerges: number;
} {
  // Census: family → (raw spelling → count)
  const familyCounts = new Map<string, Map<string, number>>();
  for (const t of allTags) {
    if (typeof t !== 'string' || !t.trim()) continue;
    const fam = foldTagFamily(t);
    const spellings = familyCounts.get(fam) ?? new Map<string, number>();
    spellings.set(t, (spellings.get(t) ?? 0) + 1);
    familyCounts.set(fam, spellings);
  }

  // Plural fold: family → target family (identity unless a merge applies).
  const familyTarget = new Map<string, string>();
  let pluralMerges = 0;
  for (const fam of Array.from(familyCounts.keys())) {
    let target = fam;
    if (!PLURAL_KEEP.has(fam) && !BRAND_CASING[fam]) {
      if (fam.length > 4 && fam.endsWith('ies') && familyCounts.has(fam.slice(0, -3) + 'y')) {
        target = fam.slice(0, -3) + 'y';
      } else if (
        fam.length > 3 &&
        fam.endsWith('s') &&
        !fam.endsWith('ss') &&
        familyCounts.has(fam.slice(0, -1))
      ) {
        target = fam.slice(0, -1);
      }
    }
    if (target !== fam) pluralMerges++;
    familyTarget.set(fam, target);
  }

  // Merged census: target family → (spelling → count) across all sources.
  const merged = new Map<string, Map<string, number>>();
  for (const [fam, spellings] of Array.from(familyCounts.entries())) {
    const target = familyTarget.get(fam)!;
    const acc = merged.get(target) ?? new Map<string, number>();
    for (const [sp, c] of Array.from(spellings.entries())) {
      // When a plural family merges into a singular, its spellings would keep
      // the trailing "s" — depluralize the spelling the same way the family
      // key was, so the surviving label is singular too.
      let label = sp;
      if (target !== fam) {
        if (fam.endsWith('ies') && target === fam.slice(0, -3) + 'y') {
          label = sp.replace(/ies$/i, (m) => (m === 'IES' ? 'Y' : 'y'));
        } else if (fam.endsWith('s')) {
          label = sp.replace(/s$/i, '');
        }
      }
      acc.set(label, (acc.get(label) ?? 0) + c);
    }
    merged.set(target, acc);
  }

  // Label choice per merged family.
  const labelByFamily = new Map<string, string>();
  let variantFamilies = 0;
  for (const [fam, spellings] of Array.from(merged.entries())) {
    if (spellings.size > 1) variantFamilies++;
    if (BRAND_CASING[fam]) {
      labelByFamily.set(fam, BRAND_CASING[fam]);
      continue;
    }
    let best: string | null = null;
    let bestCount = -1;
    for (const [spelling, count] of Array.from(spellings.entries())) {
      if (count > bestCount || (count === bestCount && best !== null && spelling < best)) {
        best = spelling;
        bestCount = count;
      }
    }
    labelByFamily.set(fam, best!);
  }

  // Raw → canonical.
  const canonicalByRaw = new Map<string, string>();
  for (const [fam, spellings] of Array.from(familyCounts.entries())) {
    const target = familyTarget.get(fam)!;
    const label = labelByFamily.get(target)!;
    for (const sp of Array.from(spellings.keys())) canonicalByRaw.set(sp, label);
  }
  return { canonicalByRaw, variantFamilies, pluralMerges };
}

/** Canonicalize + dedupe one resource's tag array (order preserved). */
export function canonicalizeTagArray(
  tags: string[],
  canonicalByRaw: Map<string, string>,
): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const t of tags) {
    if (typeof t !== 'string') continue;
    const c = canonicalByRaw.get(t) ?? t;
    if (!seen.has(c)) {
      seen.add(c);
      next.push(c);
    }
  }
  return next;
}

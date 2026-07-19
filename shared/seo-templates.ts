// Keyword-optimized, GEO-friendly SEO title/description templates shared VERBATIM
// between the server SEO authority (server/og-middleware.ts) and the client
// react-helmet mirror (client/src/pages/*). Because both sides import the SAME
// pure functions and pass the SAME arguments (category name/slug from the one
// dedup tree, counts from the unified count source), the crawl-pass HTML title
// and the render-pass DOM title are guaranteed identical — the two-pass parity
// invariant a hand-duplicated string would eventually break.
//
// Counts are always PARAMETERS, never baked into a template, so text stays
// truthful as the directory grows. Titles deliberately carry NO count, so title
// parity can never drift even if the two count sources momentarily disagree.

const SITE_NAME = "Awesome Video";

// SERP display budgets (R4-025/026) ------------------------------------------
// Google truncates titles around 60 chars and descriptions around 160 chars.
// Both the server (buildMetaTags) and the client (SEOHead) clamp through these
// SAME functions at emission time, so the crawl-pass HTML and the hydrated DOM
// always show the identical, budget-fitting string (two-pass parity).
export const SEO_TITLE_MAX = 60;
export const SEO_DESCRIPTION_MAX = 160;

// Word-boundary truncation: cut at the budget, back up to the last full word,
// and append a single ellipsis. Strings already inside the budget pass through
// untouched, so existing compliant templates render byte-identically.
function clampAtWord(s: string, max: number): string {
  const t = (s || "").trim();
  if (t.length <= max) return t;
  let cut = t.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > Math.floor(max * 0.5)) cut = cut.slice(0, lastSpace);
  return cut.replace(/[\s—–\-·,;:]+$/u, "") + "…";
}

export function clampSeoTitle(title: string): string {
  return clampAtWord(title, SEO_TITLE_MAX);
}

export function clampSeoDescription(description: string): string {
  return clampAtWord(description, SEO_DESCRIPTION_MAX);
}

// Social-preview image URL (R4-024 / og-image parity) -------------------------
// ONE builder shared by server/og-middleware.ts and client SEOHead so both
// passes emit the byte-identical og:image URL. The endpoint resolves the page
// title/category server-side from the route path (never from caller-supplied
// text params).
export function ogImagePath(routePath: string): string {
  const p = routePath && routePath.startsWith("/") ? routePath : "/";
  return `/og-image.png?path=${encodeURIComponent(p)}`;
}

// Home ----------------------------------------------------------------------
// Kept ≤60 chars for a 4-digit count so the SERP shows the full title.
export function homeSeoTitle(resourceCount: number): string {
  return `${SITE_NAME} — ${resourceCount}+ Curated Video & Streaming Resources`;
}

export function homeSeoDescription(
  resourceCount: number,
  categoryCount: number,
): string {
  return `Discover ${resourceCount}+ curated video development resources — codecs, players, encoders, and streaming tools — across ${categoryCount} categories on ${SITE_NAME}.`;
}

// Categories ----------------------------------------------------------------
// Per-slug keyword title cores (the brand suffix " — Awesome Video" is added by
// the caller on the server and by SEOHead.withBrand on the client). Any slug not
// listed here falls back to the plain category name, preserving prior behaviour.
const CATEGORY_TITLE_CORES: Record<string, string> = {
  "community-events": "Video Community & Streaming Conferences",
  "encoding-codecs": "Video Encoding Tools & Codecs (AV1, HEVC, H.264)",
  "general-tools": "Video Development Tools & Utilities",
  "infrastructure-delivery": "Video Infrastructure, CDN & Delivery Tools",
  "intro-learning": "Learn Video Development: Courses & Tutorials",
  "media-tools": "Media Processing & Video Editing Tools",
  "players-clients": "Open-Source Video Players & Client SDKs",
  "protocols-transport": "Streaming Protocols: HLS, DASH, WebRTC & RTMP",
  "standards-industry": "Video Standards & Industry Specifications",
};

const CATEGORY_DESCRIPTIONS: Record<string, (count: number) => string> = {
  "community-events": (c) =>
    `Explore ${c} curated video community and streaming resources — conferences, meetups, podcasts, and industry events for video developers on ${SITE_NAME}.`,
  "encoding-codecs": (c) =>
    `Browse ${c} curated video encoding tools and codec resources — FFmpeg, AV1, HEVC/H.265, H.264, and VP9 encoders for developers on ${SITE_NAME}.`,
  "general-tools": (c) =>
    `Discover ${c} curated general-purpose video development tools and utilities for building, testing, and shipping video applications on ${SITE_NAME}.`,
  "infrastructure-delivery": (c) =>
    `Browse ${c} curated video infrastructure and delivery resources — CDNs, origin servers, packaging, and cloud media tooling on ${SITE_NAME}.`,
  "intro-learning": (c) =>
    `Learn video development with ${c} curated courses, tutorials, articles, and beginner guides to streaming, encoding, and playback on ${SITE_NAME}.`,
  "media-tools": (c) =>
    `Explore ${c} curated media processing and video editing tools for transcoding, analysis, and manipulation on ${SITE_NAME}.`,
  "players-clients": (c) =>
    `Browse ${c} curated open-source video players and client SDKs — Video.js, hls.js, dash.js, Shaka Player, and mobile players on ${SITE_NAME}.`,
  "protocols-transport": (c) =>
    `Browse ${c} curated streaming protocol resources — HLS, MPEG-DASH, CMAF, WebRTC, and RTMP specs, servers, and tools on ${SITE_NAME}.`,
  "standards-industry": (c) =>
    `Explore ${c} curated video standards and industry specifications — codecs, container formats, and streaming specs on ${SITE_NAME}.`,
};

// Title CORE (no brand). The server appends " — {SITE_NAME}" and SEOHead's
// withBrand() does the same on the client, so both yield an identical <title>.
export function categorySeoTitleCore(name: string, slug: string): string {
  return CATEGORY_TITLE_CORES[slug] ?? name;
}

export function categorySeoDescription(
  name: string,
  slug: string,
  count: number,
): string {
  const fn = CATEGORY_DESCRIPTIONS[slug];
  return fn
    ? fn(count)
    : `Browse ${count} curated ${name.toLowerCase()} resources for video development on ${SITE_NAME}.`;
}

// Static utility pages ---------------------------------------------------
// Shared verbatim between server/og-middleware.ts (crawl-time HTML) and the
// client pages' SEOHead usage (post-hydration DOM) so both passes agree.
export const advancedSeoTitle = `Advanced — ${SITE_NAME}`;
export const advancedSeoDescription =
  `Power-user tools for ${SITE_NAME}: category explorer, analytics dashboard, link health, and bulk export.`;

export const submitSeoTitle = `Submit a Resource — ${SITE_NAME}`;
export const submitSeoDescription =
  `Suggest a new video development tool, library, article, or course for inclusion in ${SITE_NAME}.`;

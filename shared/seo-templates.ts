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

import { tagDisplayName } from "./tagNormalize";

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
// R5-049: after a word-boundary cut, a trailing conjunction/preposition or an
// unclosed parenthetical fragment reads as a dangling stub ("… WebRTC &…",
// "… Tutorial (official…"). Strip such tail tokens (repeatedly, plus trailing
// punctuation) before the ellipsis is appended.
const DANGLING_TAIL_WORDS = new Set([
  "&", "and", "or", "the", "a", "an", "of", "for", "with", "in", "on", "to",
  "vs", "vs.",
]);

function stripDanglingTail(s: string): string {
  let out = s;
  for (;;) {
    const trimmed = out.replace(/[\s—–\-·,;:(&]+$/u, "");
    const m = trimmed.match(/\s(\S+)$/);
    if (
      m &&
      m.index !== undefined &&
      (DANGLING_TAIL_WORDS.has(m[1].toLowerCase()) || m[1].startsWith("("))
    ) {
      out = trimmed.slice(0, m.index);
      continue;
    }
    out = trimmed;
    break;
  }
  return out;
}

// BUG-026 (run27): a cut that lands inside a "(...)" group leaves an unclosed
// parenthetical fragment ("…Codecs (AV1, HEVC…"). Detect an unmatched "(" in
// the cut and drop the whole group — the pre-parenthetical phrase reads as a
// complete title instead of a mid-list stub.
function dropUnclosedParen(cut: string): string {
  let depth = 0;
  let openIdx = -1;
  for (let i = 0; i < cut.length; i++) {
    const ch = cut[i];
    if (ch === "(") {
      if (depth === 0) openIdx = i;
      depth++;
    } else if (ch === ")") {
      depth = Math.max(0, depth - 1);
      if (depth === 0) openIdx = -1;
    }
  }
  return depth > 0 && openIdx > 0 ? cut.slice(0, openIdx) : cut;
}

function clampAtWord(s: string, max: number): string {
  const t = (s || "").trim();
  if (t.length <= max) return t;
  let cut = t.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > Math.floor(max * 0.5)) cut = cut.slice(0, lastSpace);
  cut = dropUnclosedParen(cut);
  const cleaned = stripDanglingTail(cut);
  return (cleaned || cut.replace(/[\s—–\-·,;:]+$/u, "")) + "…";
}

// R-09 (run23): never truncate THROUGH the brand. When an over-budget title
// carries the standard " — Awesome Video" suffix, clamp the CORE to the budget
// that remains after the suffix and re-append the suffix intact — the SERP
// then shows "Long Resource Name… — Awesome Video" instead of severing the
// brand mid-word ("… — Awesome…"). Titles without the suffix (or already
// inside the budget) behave exactly as before. Both the server
// (og-middleware) and the client (SEOHead) clamp through this ONE function,
// so two-pass title parity is preserved by construction.
const BRAND_SUFFIX = ` — ${SITE_NAME}`;

// R5-049: journey titles carry the " — Learning Journey" boilerplate suffix.
// The clamp must never cut THROUGH that suffix ("— Learning… —") and must not
// ellipsize when only the boilerplate (not the visible title) was dropped:
// keep the whole suffix if it fits, otherwise drop it entirely (no ellipsis
// when the core title survives intact).
const JOURNEY_SUFFIX = " — Learning Journey";

export function clampSeoTitle(title: string): string {
  const t = (title || "").trim();
  if (t.length <= SEO_TITLE_MAX) return t;
  if (t.endsWith(BRAND_SUFFIX)) {
    const core = t.slice(0, -BRAND_SUFFIX.length);
    const budget = SEO_TITLE_MAX - BRAND_SUFFIX.length;
    if (core.endsWith(JOURNEY_SUFFIX)) {
      const bare = core.slice(0, -JOURNEY_SUFFIX.length).trim();
      if (bare.length <= budget) return bare + BRAND_SUFFIX;
      return clampAtWord(bare, budget) + BRAND_SUFFIX;
    }
    // Audit cycle-01 F004: the 43-char post-suffix core budget truncates
    // BEFORE the words that distinguish sibling resources (9 URLs collided
    // into 3 identical SERP titles, corpus-proven). When the core alone
    // overflows that budget, boilerplate yields before content: drop the
    // brand suffix entirely and give the core the full SERP budget — the
    // same philosophy as the JOURNEY_SUFFIX rule above.
    if (core.length > budget) return clampAtWord(core, SEO_TITLE_MAX);
    return clampAtWord(core, budget) + BRAND_SUFFIX;
  }
  return clampAtWord(t, SEO_TITLE_MAX);
}

// R5-049: same-named child/parent taxonomy nodes must not stutter
// ("CDN Integration – CDN Integration"). ONE shared builder used by both the
// server (og-middleware) and the client (SubSubcategory.tsx) keeps the
// two-pass titles identical while deduping the redundant-name case.
//
// The redundancy is broader than exact equality: "CDN Integration"
// (sub-subcategory) sits under "CDN Integration & Distribution" (subcategory),
// so "child – parent" reads as "CDN Integration – CDN Integration &…" once the
// SERP budget clamps it. We normalize both names (case-fold, drop separators
// and connective punctuation, collapse whitespace) and compare on WHOLE-WORD
// containment: when one name fully contains the other's words, the pair is
// redundant and we emit the single child name (what the visible <h1> shows).
// Genuinely distinct names (no whole-word overlap) keep the "child – parent"
// context suffix untouched.
function normalizeTaxonomyName(value: string): string {
  return (value || "")
    .toLowerCase()
    .replace(/[\u2013\u2014&/,.:;()\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// BUG-026 (run27): "child – parent" context is a nice-to-have; when it can't
// fit the SERP budget alongside the brand suffix it used to get ellipsized
// mid-phrase ("Origin Servers – Containerization &…"). Emit the child name
// alone instead — a complete, un-truncated title. Shared by server and client,
// so two-pass parity holds.
function withParentContext(name: string, parentName: string): string {
  const combined = `${name} – ${parentName}`;
  return combined.length <= SEO_TITLE_MAX - BRAND_SUFFIX.length
    ? combined
    : name;
}

export function subSubcategorySeoTitleCore(
  name: string,
  parentName?: string | null,
): string {
  if (!parentName) return name;
  const child = normalizeTaxonomyName(name);
  const parent = normalizeTaxonomyName(parentName);
  if (!child || !parent) return withParentContext(name, parentName);
  if (child === parent) return name;
  const wrappedChild = ` ${child} `;
  const wrappedParent = ` ${parent} `;
  if (wrappedParent.includes(wrappedChild) || wrappedChild.includes(wrappedParent)) {
    return name;
  }
  return withParentContext(name, parentName);
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
  // BUG-026 (run27): every core must fit SEO_TITLE_MAX − " — Awesome Video"
  // (44 chars) so the emitted <title> is never ellipsized mid-list.
  "community-events": "Video Community & Streaming Conferences",
  "encoding-codecs": "Video Encoding & Codecs: AV1, HEVC, H.264",
  "general-tools": "Video Development Tools & Utilities",
  "infrastructure-delivery": "Video Infrastructure, CDN & Delivery Tools",
  "intro-learning": "Learn Video Development: Courses & Tutorials",
  "media-tools": "Media Processing & Video Editing Tools",
  "players-clients": "Open-Source Video Players & Client SDKs",
  "protocols-transport": "Streaming Protocols: HLS, DASH, WebRTC, RTMP",
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

// Tag landing pages ----------------------------------------------------------
export function tagSeoTitleCore(name: string): string {
  return `${name} Video Resources & Tools`;
}

// tagDisplayName() blindly Title-Cases (or UPPER-cases known acronyms), which
// corrupts real brand capitalisation (ffmpeg -> "FFMPEG", webassembly ->
// "Webassembly"). This curated map restores the canonical casing for brands
// whose display form is neither plain Title Case nor an all-caps acronym.
// Keyed by the normalized tag slug (lowercase, hyphenated). Lives HERE — the
// shared two-pass parity home — so the client H1/title (TagLanding.tsx) and
// the server og:title (og-middleware.ts) stay byte-identical by construction.
const TAG_BRAND_CASING: Record<string, string> = {
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
  dashjs: "dash.js",
  "dash-js": "dash.js",
  hlsjs: "hls.js",
  "hls-js": "hls.js",
  videojs: "Video.js",
  "video-js": "Video.js",
};

/** Branded, casing-correct display name for a tag slug (see TAG_BRAND_CASING). */
export function tagDisplayNameBranded(slug: string): string {
  return TAG_BRAND_CASING[slug] ?? tagDisplayName(slug);
}

// The fixed "X Video Resources & Tools" template duplicated the word "Video"
// for tags that already contain it ("Video Streaming Video Resources"). Drop
// the inserted "Video" whenever the tag name already carries it.
export function tagTitleCoreDeduped(name: string): string {
  if (/\bvideo\b/i.test(name)) return `${name} Resources & Tools`;
  return tagSeoTitleCore(name);
}

export function tagSeoDescription(name: string, count: number): string {
  return `Browse ${count} curated ${name} resources, tools, libraries, and guides for video developers on ${SITE_NAME}.`;
}

// Taxonomy listings ----------------------------------------------------------
// Child listing titles need enough parent context to describe the search intent
// but must remain within the 44-char core budget left by the brand suffix.
const CATEGORY_INTENT_NOUNS: Record<string, string> = {
  "intro-learning": "courses & guides",
  "community-events": "communities & events",
  "protocols-transport": "specs & tools",
  "standards-industry": "specs & docs",
};

export function subcategorySeoTitleCore(
  name: string,
  categoryName?: string | null,
  categorySlug?: string | null,
): string {
  const intent = (categorySlug && CATEGORY_INTENT_NOUNS[categorySlug]) || "tools & guides";
  const parent = categoryName ? `${name} — ${categoryName} ${intent}` : `${name} ${intent}`;
  if (parent.length <= SEO_TITLE_MAX - BRAND_SUFFIX.length) return parent;
  const concise = `${name} ${intent}`;
  return concise.length <= SEO_TITLE_MAX - BRAND_SUFFIX.length ? concise : name;
}

export function subcategorySeoDescription(
  name: string,
  categoryName: string,
  count: number,
): string {
  return `Explore ${count} curated ${name} resources in ${categoryName} — tools, guides, and references for video developers on ${SITE_NAME}.`;
}

export function subSubcategorySeoDescription(
  name: string,
  parentName: string,
  count: number,
): string {
  return `Explore ${count} curated ${name} resources within ${parentName} — practical tools and guides for video developers on ${SITE_NAME}.`;
}

export const journeysHubDescription =
  `Guided multi-step learning paths for video development — from beginner streaming to advanced encoding pipelines.`;

export function resourceSeoDescription(title: string, description?: string | null): string {
  return (description || "").slice(0, 280) || `${title} on ${SITE_NAME} — curated video development resource.`;
}

export function journeySeoDescription(title: string, description?: string | null): string {
  return (description || "").slice(0, 280) || `Multi-step learning journey on ${SITE_NAME}: ${title}.`;
}

// Sitemap pagination URLs are individually canonical and indexable. Prefixing
// the page number makes otherwise identical listing descriptions distinct while
// retaining it if the description must be truncated at the SERP budget.
export function pagedSeoTitleCore(core: string, page: number): string {
  if (page < 2) return core;
  const pageSuffix = ` — Page ${page}`;
  const budget = SEO_TITLE_MAX - BRAND_SUFFIX.length - pageSuffix.length;
  return `${clampAtWord(core, Math.max(1, budget))}${pageSuffix}`;
}

export function pagedSeoDescription(
  description: string,
  page: number,
  totalPages: number,
): string {
  return page < 2 ? description : `Page ${page} of ${totalPages}: ${description}`;
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

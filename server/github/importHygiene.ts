/**
 * Import hygiene helpers for the GitHub / awesome-list import pipeline.
 *
 * Run3 audit remediation:
 * - R3-13: fragment-only URLs ("#readme") and nav anchors ("back to top")
 *   must never become resources.
 * - R3-24: imports must de-duplicate against existing rows by normalized
 *   URL and by normalized title + domain (short-links like link.medium.com
 *   previously slipped past exact-URL matching).
 * - R3-25: raw "owner/repo" GitHub slug titles are humanized and capped
 *   at 120 chars; README text stays out of the title.
 * - R3-26: HTML entities (&lt; &#39; ...) are decoded before storage.
 * - R3-27: email addresses are stripped from descriptions.
 * - R3-28: descriptions shorter than MIN_DESCRIPTION_LENGTH are treated
 *   as missing so enrichment/approval gates can act on them.
 */

export const MIN_DESCRIPTION_LENGTH = 20;
export const MAX_TITLE_LENGTH = 120;

const NAV_ANCHOR_TITLES = new Set([
  "back to top",
  "table of contents",
  "contents",
  "toc",
  "readme",
  "top",
  "go to top",
  "return to top",
]);

/** R3-13: true when a parsed entry is markdown navigation junk, not a resource. */
export function isJunkResource(title: string, url: string): boolean {
  const trimmedUrl = (url || "").trim();
  // Fragment-only or relative URLs can never be visited from our site.
  if (!/^https?:\/\//i.test(trimmedUrl)) return true;
  const normalizedTitle = (title || "").trim().toLowerCase().replace(/[()[\]*_`]/g, "").trim();
  if (!normalizedTitle) return true;
  if (NAV_ANCHOR_TITLES.has(normalizedTitle)) return true;
  return false;
}

/** R3-26: decode common named + numeric HTML entities (handles double-encoding once per call). */
export function decodeHtmlEntities(text: string): string {
  if (!text) return text;
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    ndash: "\u2013",
    mdash: "\u2014",
    hellip: "\u2026",
    rsquo: "\u2019",
    lsquo: "\u2018",
    rdquo: "\u201d",
    ldquo: "\u201c",
  };
  const decodeOnce = (s: string) =>
    s
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
      .replace(/&([a-zA-Z]+);/g, (m, name) => named[name.toLowerCase()] ?? m);
  // Double-encoded inputs ("&amp;lt;") need two passes; stop when stable.
  let out = decodeOnce(text);
  const second = decodeOnce(out);
  if (second !== out) out = second;
  return out;
}

const EMAIL_REGEX = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/** R3-27: remove email addresses (and dangling separators around them). */
export function stripEmails(text: string): string {
  if (!text) return text;
  return text
    .replace(new RegExp(`[,;:\\s]*\\(?${EMAIL_REGEX.source}\\)?`, "g"), "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .trim();
}

export function containsEmail(text: string): boolean {
  if (!text) return false;
  return new RegExp(EMAIL_REGEX.source).test(text);
}

/** R3-26 + R3-27: full description cleanup. Returns '' when nothing meaningful remains. */
export function sanitizeDescription(description: string): string {
  if (!description) return "";
  let out = decodeHtmlEntities(description);
  out = stripEmails(out);
  out = out.replace(/\s+/g, " ").trim();
  return out;
}

// A title is a GitHub-style slug ONLY when it is exactly "owner/repo" or
// "owner/repo: readme spill". A looser prefix match would mangle legitimate
// titles like "ISO/IEC TR 23008-14:2018" or "HEVC/H.265 Video Coding Standard".
const PURE_SLUG_REGEX = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const SLUG_WITH_SPILL_REGEX = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+):\s/;

/**
 * R3-25: humanize titles.
 * - "owner/repo: appended README text" -> "Repo" (README text belongs in the description)
 * - decodes entities, collapses whitespace, hard-caps at MAX_TITLE_LENGTH.
 */
export function humanizeTitle(rawTitle: string): string {
  let title = decodeHtmlEntities((rawTitle || "").trim()).replace(/\s+/g, " ");

  const slugMatch = PURE_SLUG_REGEX.test(title)
    ? title.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/)
    : title.match(SLUG_WITH_SPILL_REGEX);
  if (slugMatch) {
    // Anything after the slug (": description ...") is README spill — drop it.
    const repo = slugMatch[2]
      .replace(/\.git$/i, "")
      .replace(/[-_.]+/g, " ")
      .trim();
    // Title-case words that are all-lowercase; keep existing casing (FFmpeg, MP4Box).
    title = repo
      .split(" ")
      .filter(Boolean)
      .map((w) => (w === w.toLowerCase() ? w.charAt(0).toUpperCase() + w.slice(1) : w))
      .join(" ");
  }

  if (title.length > MAX_TITLE_LENGTH) {
    // Cut at a word boundary, no trailing punctuation.
    const cut = title.slice(0, MAX_TITLE_LENGTH);
    const lastSpace = cut.lastIndexOf(" ");
    title = (lastSpace > 60 ? cut.slice(0, lastSpace) : cut).replace(/[\s\-–—:,;.]+$/g, "");
  }
  return title;
}

/** True when a title still looks like a raw owner/repo slug (used by gates/backfill). */
export function isSlugTitle(title: string): boolean {
  const t = (title || "").trim();
  return PURE_SLUG_REGEX.test(t) || SLUG_WITH_SPILL_REGEX.test(t);
}

const TRACKING_PARAMS = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "gclid", "fbclid", "mc_cid", "mc_eid", "ref", "source",
]);

/**
 * R3-24: canonical URL key for de-duplication.
 * Lowercases host, strips www., trailing slash, fragments and tracking params.
 */
export function normalizeUrlForDedup(rawUrl: string): string {
  try {
    const u = new URL(rawUrl.trim());
    let host = u.hostname.toLowerCase().replace(/^www\./, "");
    // Common host aliases that serve identical content.
    if (host === "medium.com" || host === "link.medium.com") host = "medium.com";
    const params = new URLSearchParams();
    for (const [k, v] of Array.from(u.searchParams.entries())) {
      if (!TRACKING_PARAMS.has(k.toLowerCase())) params.append(k, v);
    }
    const qs = params.toString();
    let path = u.pathname.replace(/\/+$/, "");
    return `${host}${path}${qs ? `?${qs}` : ""}`.toLowerCase();
  } catch {
    return (rawUrl || "").trim().toLowerCase();
  }
}

/** R3-24: title key for duplicate-cluster detection (case/punct/entity-insensitive). */
export function normalizeTitleForDedup(rawTitle: string): string {
  return decodeHtmlEntities((rawTitle || ""))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * R3-28: sanitized description, or a clear generated fallback when the
 * original is a stub (< MIN_DESCRIPTION_LENGTH chars). Used as an approval
 * gate so no resource goes live with an empty/one-word description.
 */
export function ensureMinDescription(description: string, title: string, url: string): string {
  const clean = sanitizeDescription(description || "");
  if (clean.length >= MIN_DESCRIPTION_LENGTH) return clean;
  let host = "";
  try {
    host = new URL((url || "").trim()).hostname.replace(/^www\./, "");
  } catch {
    /* keep empty */
  }
  const name = (title || "").trim();
  const fallback = `${name ? `${name} — ` : ""}video development resource${host ? ` from ${host}` : ""}.`;
  return fallback.length >= MIN_DESCRIPTION_LENGTH ? fallback : `${fallback} See the linked site for details.`;
}

/** Root domain (eTLD+1-ish) used for the title+domain duplicate heuristic. */
export function domainOf(rawUrl: string): string {
  try {
    const host = new URL(rawUrl.trim()).hostname.toLowerCase().replace(/^www\./, "");
    // Short-link hosts count as their canonical publisher.
    if (host === "link.medium.com") return "medium.com";
    const parts = host.split(".");
    return parts.length > 2 ? parts.slice(-2).join(".") : host;
  } catch {
    return "";
  }
}

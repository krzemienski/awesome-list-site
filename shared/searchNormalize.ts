/**
 * ONE search-query normalization shared by every matcher surface — the
 * /api/resources and /api/search handlers, the repository matcher, the
 * server-rendered /search fallback, the /search page, and the search palette
 * (audit2 BUG-011/BUG-019/BUG-020/BUG-021).
 *
 * Policy:
 * - Control characters (incl. NUL — Postgres rejects NUL text params) count
 *   as whitespace, so `?search=%00` and `?search=%20%20` behave identically.
 * - Whitespace runs collapse to single spaces; leading/trailing whitespace
 *   drops ("ffmpeg  hls" ≡ "ffmpeg hls").
 * - Quote characters are stripped from token EDGES only ("ffmpeg" → ffmpeg,
 *   “ffmpeg hls” → ffmpeg hls) so in-word apostrophes (don't) keep matching.
 * - A query that normalizes to "" is treated by callers exactly like an
 *   absent query (explicit empty-state prompt / no search filter).
 */

// C0 control chars + DEL — treated as whitespace, never passed to Postgres.
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

// ASCII + typographic quotes, guillemets, backtick — stripped at token edges.
const EDGE_QUOTES =
  /^["'\u2018\u2019\u201C\u201D\u00AB\u00BB\u2039\u203A`]+|["'\u2018\u2019\u201C\u201D\u00AB\u00BB\u2039\u203A`]+$/g;

/**
 * Split a raw query into clean match tokens. Downstream matchers apply AND
 * semantics: every token must appear somewhere in the searched fields, so
 * "ffmpeg hls" and "hls ffmpeg" return the same set (audit2 BUG-011).
 */
export function tokenizeSearchQuery(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .replace(CONTROL_CHARS, " ")
    .split(/\s+/)
    .map((t) => t.replace(EDGE_QUOTES, ""))
    .filter((t) => t.length > 0);
}

/** Canonical display/fetch form of a query: tokens joined by single spaces. */
export function normalizeSearchQuery(raw: string | null | undefined): string {
  return tokenizeSearchQuery(raw).join(" ");
}

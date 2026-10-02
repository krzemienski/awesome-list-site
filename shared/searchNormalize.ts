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
 * - A token with no letter or digit ("!!", "--", "()") drops: nothing in it
 *   can match, and keeping it made "!!" an unfiltered 3,824-row "search"
 *   (C4-API-01).
 * - A query that normalizes to "" is treated by callers exactly like an
 *   absent query (explicit empty-state prompt / no search filter).
 */

/**
 * Longest `search` value the API accepts: every query param is capped at
 * MAX_PARAM_LENGTH (server/contracts/inference.ts) and longer ones get a 400.
 * Callers check the normalized query against this before fetching so an
 * over-long paste gets a clear message instead of a request that can't pass.
 */
export const SEARCH_QUERY_MAX_LENGTH = 512;

// C0 control chars + DEL — treated as whitespace, never passed to Postgres.
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

// ASCII + typographic quotes, guillemets, backtick — stripped at token edges.
const EDGE_QUOTES =
  /^["'\u2018\u2019\u201C\u201D\u00AB\u00BB\u2039\u203A`]+|["'\u2018\u2019\u201C\u201D\u00AB\u00BB\u2039\u203A`]+$/g;

const SEARCHABLE_CHAR = /[\p{L}\p{N}]/u;

/**
 * C5-API-01/02: the one minimum every search surface applies. It counts
 * letters and digits only, because that is all the matcher indexes: "c++"
 * searched as the bare prefix "c:*" and matched 2,872 rows, and the
 * server-rendered /search had no minimum at all.
 */
export const SEARCH_QUERY_MIN_CHARS = 2;

export function isSearchableQuery(normalized: string): boolean {
  return (normalized.match(/[\p{L}\p{N}]/gu)?.length ?? 0) >= SEARCH_QUERY_MIN_CHARS;
}

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
    .filter((t) => SEARCHABLE_CHAR.test(t));
}

/** Canonical display/fetch form of a query: tokens joined by single spaces. */
export function normalizeSearchQuery(raw: string | null | undefined): string {
  return tokenizeSearchQuery(raw).join(" ");
}

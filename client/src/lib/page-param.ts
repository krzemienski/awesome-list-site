/**
 * audit2 BUG-022/BUG-023 — the shared page rules (see shared/page-param.ts),
 * mapped onto client presentation. Two rules for two surfaces, each matching
 * its server counterpart exactly:
 *
 *   • parsePageParam / parsePageInput — LENIENT (Number()-based, "1e3" IS
 *     1000): every "Go to page" input, and /search's ?page= (both passes of
 *     /search clamp out-of-range instead of 404ing — it's noindex);
 *   • strictUrlPage — STRICT canonical-decimal rule for the indexable
 *     listings (/category, /subcategory, /sub-subcategory, /tag): the
 *     crawler pass 404s "1e3"/"007"/"abc"/"0", so the client renders the
 *     same not-found page, never a listing the crawler pass denies.
 */

import { parsePageNumber, parseUrlPageStrict } from "@shared/page-param";

export type PageParamKind =
  /** No ?page= present — page 1, nothing to report. */
  | "default"
  /** A whole number ≥ 1 (may still exceed the last page — clamp on data). */
  | "valid"
  /** A whole number < 1 (0, -5) — clamped up to page 1. */
  | "clamped-low"
  /** Not a finite whole number ("abc", "2.7", "1e999") — fell back to 1. */
  | "invalid";

export interface ParsedPageParam {
  page: number;
  kind: PageParamKind;
  /** The raw param text, for notices ("“abc” isn't a valid page…"). */
  raw: string | null;
}

export function parsePageParam(raw: string | null): ParsedPageParam {
  if (raw == null || raw.trim() === "") return { page: 1, kind: "default", raw };
  // Shared LENIENT rule (/search + inputs): whole numbers only, int32-capped.
  const n = parsePageNumber(raw);
  if (n == null) return { page: 1, kind: "invalid", raw };
  if (n < 1) return { page: 1, kind: "clamped-low", raw };
  return { page: n, kind: "valid", raw };
}

/** Convenience: parse the ?page= param out of a query string. */
export function parsePageFromSearch(search: string): ParsedPageParam {
  return parsePageParam(new URLSearchParams(search).get("page"));
}

/**
 * STRICT ?page= for the indexable listings: the page to fetch (1 when the
 * param is absent), or null when og-middleware 404s the spelling. The caller
 * still 404s a page past the end once it knows the last page.
 */
export function strictUrlPage(raw: string | null): number | null {
  const verdict = parseUrlPageStrict(raw);
  if (verdict.kind === "missing") return 1;
  return verdict.kind === "page" ? verdict.page : null;
}

/**
 * Same rule for free-text "Go to page" inputs. Returns the whole number the
 * user typed (still unclamped — the caller clamps into [1, totalPages]), or
 * null when the text isn't a whole number (caller shows validation feedback
 * instead of navigating).
 */
export function parsePageInput(text: string): number | null {
  return parsePageNumber(text);
}

/**
 * Notice copy for a lenient URL-sourced page correction (/search), which
 * clamps instead of 404ing.
 */
export function pageNoticeFor(parsed: ParsedPageParam): string | null {
  if (parsed.kind === "invalid") {
    return `“${parsed.raw}” isn't a valid page number, so page 1 is shown. Pages are whole numbers like 2 or 10.`;
  }
  if (parsed.kind === "clamped-low") {
    return `Page ${parsed.raw} doesn't exist, so page 1 is shown.`;
  }
  return null;
}

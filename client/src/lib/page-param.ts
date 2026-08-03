/**
 * audit2 BUG-022/BUG-023 — the shared page rules (see shared/page-param.ts),
 * mapped onto client presentation. Two rules for two surfaces, each matching
 * its server counterpart exactly:
 *
 *   • parsePageParam / parsePageInput — LENIENT (Number()-based, "1e3" IS
 *     1000): every "Go to page" input, and /search's ?page= (both passes of
 *     /search clamp out-of-range instead of 404ing — it's noindex);
 *   • parsePageParamStrict — STRICT canonical-decimal rule for the indexable
 *     taxonomy listings (/category, /subcategory, /sub-subcategory): the
 *     crawler pass soft-404s "1e3"/"007"/"abc"/"0", so the client renders the
 *     SAME verdict as page 1 plus a visible notice — never a silent rewrite,
 *     and never content the crawler pass would deny.
 */

import { MAX_PAGE, parsePageNumber, parseUrlPageStrict } from "@shared/page-param";

/** Re-exported from the shared rule (R5-043 int32 cap) for existing callers. */
export { MAX_PAGE };

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
 * STRICT variant for the indexable taxonomy listings — consumes the same
 * shared verdict og-middleware uses for its soft-404 gate, so the client can
 * never present ?page=1e3 as page 1000 while the crawler pass 404s it.
 */
export function parsePageParamStrict(raw: string | null): ParsedPageParam {
  const v = parseUrlPageStrict(raw);
  switch (v.kind) {
    case "missing":
      return { page: 1, kind: "default", raw };
    case "page":
      return { page: v.page, kind: "valid", raw };
    case "below-range":
      return { page: 1, kind: "clamped-low", raw };
    case "malformed":
      // Present-but-empty (?page=) is malformed on the server too; the notice
      // copy handles the empty raw specially.
      return { page: 1, kind: "invalid", raw };
  }
}

/** Strict convenience: parse ?page= out of a query string (taxonomy pages). */
export function parsePageFromSearchStrict(search: string): ParsedPageParam {
  return parsePageParamStrict(new URLSearchParams(search).get("page"));
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
 * Standard notice copy for a URL-sourced page correction, so every listing
 * surface words the feedback identically.
 */
export function pageNoticeFor(
  parsed: ParsedPageParam,
  totalPages?: number,
): string | null {
  if (parsed.kind === "invalid") {
    if (parsed.raw == null || parsed.raw.trim() === "") {
      return "The page number in the link is empty, so page 1 is shown.";
    }
    return `“${parsed.raw}” isn't a valid page number, so page 1 is shown. Pages are whole numbers like 2 or 10.`;
  }
  if (parsed.kind === "clamped-low") {
    return `Page ${parsed.raw} doesn't exist, so page 1 is shown.`;
  }
  if (parsed.kind === "valid" && totalPages != null && parsed.page > totalPages) {
    return `Page ${parsed.page} doesn't exist here — there ${totalPages === 1 ? "is only 1 page" : `are only ${totalPages} pages`}, so the last page is shown.`;
  }
  return null;
}

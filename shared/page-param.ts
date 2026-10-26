/**
 * THE ?page= rules, shared by the server crawler pass (server/og-middleware.ts)
 * and the hydrated client (client/src/lib/page-param.ts) so both passes always
 * make the same judgment about the same URL. There are deliberately TWO rules
 * because the site has two kinds of paginated surface:
 *
 * 1. `parsePageNumber` — free-TEXT meaning (every "Go to page" input,
 *    BUG-022), and the URL rule for /search on BOTH passes: any numeric
 *    format Number() accepts is that number — "1e3" IS 1000 — and non-whole /
 *    non-finite text is null. /search is noindex, so its SSR clamps
 *    out-of-range pages onto the last page exactly like the client UI and
 *    never 404s; lenient URL parsing there matches that surface's contract.
 *
 * 2. `parseUrlPageStrict` — URL ?page= meaning on the INDEXABLE listings
 *    (/category, /subcategory, /sub-subcategory, /tag), per the BUG-027
 *    convention: only a canonical positive decimal spelling ("2", "48") is a
 *    page reference. "1e3", "007", "+2", "2.7", "abc" are malformed, and
 *    "0"/"-5" are whole-number spellings below range. Both passes render a
 *    real 404 (noindex) for either.
 *
 * Callers own only presentation (404 page, which page to clamp onto);
 * every "what does this spelling mean?" decision lives here so the two passes
 * can never drift.
 */

/** int32 cap (R5-043) — keeps values like ?page=1e20 off the API entirely. */
export const MAX_PAGE = 2_147_483_647;

/**
 * Free-text page meaning (inputs; also /search URLs): the whole number the
 * text denotes (capped at MAX_PAGE, possibly ≤ 0 — callers clamp), or null
 * when the text is missing or not a finite whole number.
 */
export function parsePageNumber(raw: string | null | undefined): number | null {
  if (raw == null || raw.trim() === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  return Math.min(n, MAX_PAGE);
}

/** Verdict for a ?page= value on the strict (indexable taxonomy) routes. */
export type UrlPageStrict =
  /** Param absent — page 1, nothing to report on either pass. */
  | { kind: "missing" }
  /** Canonical decimal ≥ 1, int32-capped (may still exceed the last page). */
  | { kind: "page"; page: number }
  /** A whole-number spelling below 1 ("0", "-5") — a 404 on both passes. */
  | { kind: "below-range" }
  /** Anything else ("", "1e3", "007", "+2", "2.7", "abc") — a 404 on both passes. */
  | { kind: "malformed" };

/**
 * Strict URL rule for the indexable listings (BUG-027): og-middleware and
 * the hydrated client both turn anything but {kind:"page"} into the 404
 * page. Values beyond MAX_PAGE stay {kind:"page"} capped — range policy
 * belongs to the caller, exactly like any other over-range decimal.
 */
export function parseUrlPageStrict(raw: string | null | undefined): UrlPageStrict {
  if (raw == null) return { kind: "missing" };
  const t = raw.trim();
  if (/^[1-9]\d*$/.test(t)) {
    // Digit-only text: Number() is exact up to 2^53 and saturates cleanly
    // beyond it, so the int32 cap absorbs any precision loss.
    return { kind: "page", page: Math.min(Number(t), MAX_PAGE) };
  }
  if (/^-?\d+$/.test(t)) {
    const n = Number(t);
    // "0" / "-5" denote real whole numbers below the first page…
    if (Number.isFinite(n) && n < 1) return { kind: "below-range" };
    // …while "007" / huge "-9…9" strings are non-canonical spellings.
    return { kind: "malformed" };
  }
  return { kind: "malformed" };
}

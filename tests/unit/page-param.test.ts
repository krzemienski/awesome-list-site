import { describe, expect, it } from "vitest";
import {
  MAX_PAGE,
  parsePageNumber,
  parseUrlPageStrict,
} from "@shared/page-param";
import {
  pageNoticeFor,
  parsePageInput,
  parsePageParam,
  parsePageParamStrict,
} from "../../client/src/lib/page-param";

/**
 * audit2 BUG-022/BUG-023/BUG-027 — the shared ?page= rules.
 *
 * shared/page-param.ts is consumed by BOTH passes:
 *   • server/og-middleware.ts — taxonomy soft-404 gate calls
 *     `parseUrlPageStrict(rawPage).kind !== "page"`, /search's `parsePage`
 *     calls `parsePageNumber` (lenient, clamps instead of 404 — noindex);
 *   • client/src/lib/page-param.ts — taxonomy pages use parsePageParamStrict
 *     (same strict verdict, rendered as page-1 + visible notice), /search and
 *     every "Go to page" input use the lenient rule.
 * Locking the shared tables here locks server/client parity by construction.
 */

describe("shared parsePageNumber (inputs + /search rule, lenient)", () => {
  it("reads any Number()-accepted whole-number format", () => {
    expect(parsePageNumber("1000")).toBe(1000);
    expect(parsePageNumber("1e3")).toBe(1000); // BUG-022: "1e3" IS 1000
    expect(parsePageNumber(" 7 ")).toBe(7);
    expect(parsePageNumber("0x10")).toBe(16);
    expect(parsePageNumber("2")).toBe(2);
  });

  it("caps huge whole numbers at the int32 MAX_PAGE (R5-043)", () => {
    expect(parsePageNumber("1e20")).toBe(MAX_PAGE);
    expect(parsePageNumber("2147483647")).toBe(MAX_PAGE);
    expect(parsePageNumber("2147483648")).toBe(MAX_PAGE);
  });

  it("returns null for anything that is not a finite whole number", () => {
    expect(parsePageNumber("abc")).toBeNull();
    expect(parsePageNumber("2.7")).toBeNull();
    expect(parsePageNumber("1e999")).toBeNull(); // Infinity
    expect(parsePageNumber("NaN")).toBeNull();
    expect(parsePageNumber("")).toBeNull();
    expect(parsePageNumber(null)).toBeNull();
    expect(parsePageNumber(undefined)).toBeNull();
  });

  it("passes negatives/zero through for the caller to clamp", () => {
    expect(parsePageNumber("0")).toBe(0);
    expect(parsePageNumber("-5")).toBe(-5);
  });
});

describe("shared parseUrlPageStrict (indexable taxonomy URL rule)", () => {
  it("accepts only canonical positive decimal spellings", () => {
    expect(parseUrlPageStrict("1")).toEqual({ kind: "page", page: 1 });
    expect(parseUrlPageStrict("2")).toEqual({ kind: "page", page: 2 });
    expect(parseUrlPageStrict("48")).toEqual({ kind: "page", page: 48 });
    expect(parseUrlPageStrict(" 30 ")).toEqual({ kind: "page", page: 30 });
  });

  it("caps over-int32 decimals but keeps them pages (range policy is the caller's)", () => {
    expect(parseUrlPageStrict("2147483648")).toEqual({ kind: "page", page: MAX_PAGE });
    expect(parseUrlPageStrict("9".repeat(400))).toEqual({ kind: "page", page: MAX_PAGE });
  });

  it("classifies whole numbers below 1 as below-range", () => {
    expect(parseUrlPageStrict("0")).toEqual({ kind: "below-range" });
    expect(parseUrlPageStrict("-5")).toEqual({ kind: "below-range" });
  });

  it("rejects every non-canonical spelling as malformed", () => {
    for (const raw of ["1e3", "1e20", "1e999", "007", "+2", "2.7", "abc", "NaN", "", "  ", `-${"9".repeat(400)}`]) {
      expect(parseUrlPageStrict(raw), `raw=${JSON.stringify(raw)}`).toEqual({ kind: "malformed" });
    }
  });

  it("treats an absent param as missing (page 1, no feedback)", () => {
    expect(parseUrlPageStrict(null)).toEqual({ kind: "missing" });
    expect(parseUrlPageStrict(undefined)).toEqual({ kind: "missing" });
  });
});

describe("og-middleware taxonomy gate consumption (verdict.kind !== 'page' → soft-404)", () => {
  // Mirrors the exact consumption in server/og-middleware.ts: ?page=1 301s to
  // the param-less canonical first; any other spelling proceeds only when the
  // shared verdict is {kind:"page"} (the resolver then range-404s overshoot).
  const gate = (raw: string): "301" | "404" | number => {
    if (raw === "1") return "301";
    const v = parseUrlPageStrict(raw);
    return v.kind === "page" ? v.page : "404";
  };

  it("404s malformed and below-range spellings the client notices on", () => {
    for (const raw of ["1e3", "1e20", "007", "+2", "2.7", "abc", "0", "-5", ""]) {
      expect(gate(raw), `raw=${JSON.stringify(raw)}`).toBe("404");
    }
  });

  it("keeps canonical pages and the page-1 redirect", () => {
    expect(gate("1")).toBe("301");
    expect(gate("2")).toBe(2);
    expect(gate("48")).toBe(48);
    expect(gate("2147483648")).toBe(MAX_PAGE); // resolver range-404s it
  });
});

describe("client parsePageParamStrict (taxonomy pages mirror the gate)", () => {
  it("maps the four verdicts onto presentation kinds", () => {
    expect(parsePageParamStrict(null)).toEqual({ page: 1, kind: "default", raw: null });
    expect(parsePageParamStrict("2")).toEqual({ page: 2, kind: "valid", raw: "2" });
    expect(parsePageParamStrict("0")).toEqual({ page: 1, kind: "clamped-low", raw: "0" });
    expect(parsePageParamStrict("-5")).toEqual({ page: 1, kind: "clamped-low", raw: "-5" });
    for (const raw of ["1e3", "1e20", "007", "2.7", "abc", ""]) {
      expect(parsePageParamStrict(raw), `raw=${JSON.stringify(raw)}`)
        .toEqual({ page: 1, kind: "invalid", raw });
    }
  });

  it("NEVER renders a spelling as a page the crawler pass would 404 (cross-pass lockstep)", () => {
    const spellings = [
      "1", "2", "30", "48", "1000", "2147483647", "2147483648",
      "1e3", "1e20", "1e999", "007", "+2", "2.7", "abc", "NaN", "", "0", "-5",
      "9".repeat(400),
    ];
    for (const raw of spellings) {
      const server = parseUrlPageStrict(raw);
      const client = parsePageParamStrict(raw);
      if (server.kind === "page") {
        // server proceeds → client must read the SAME page number
        expect(client, `raw=${JSON.stringify(raw)}`).toEqual({ page: server.page, kind: "valid", raw });
      } else {
        // server soft-404s → client must reject too (page 1 + notice kind)
        expect(client.page, `raw=${JSON.stringify(raw)}`).toBe(1);
        expect(["invalid", "clamped-low"], `raw=${JSON.stringify(raw)}`).toContain(client.kind);
      }
    }
  });
});

describe("client parsePageParam (LENIENT /search URL rule)", () => {
  it("matches og-middleware's /search parsePage semantics (clamp, never 404)", () => {
    // og /search: parsePageNumber(raw), n > 1 ? n : 1 — then clamps to the
    // real last page server-side exactly like the client snap effect.
    const ogSearch = (raw: string | null) => {
      const n = parsePageNumber(raw);
      return n != null && n > 1 ? n : 1;
    };
    expect(ogSearch("1e3")).toBe(1000);
    expect(parsePageParam("1e3")).toEqual({ page: 1000, kind: "valid", raw: "1e3" });
    expect(ogSearch("1e20")).toBe(MAX_PAGE);
    expect(parsePageParam("1e20")).toEqual({ page: MAX_PAGE, kind: "valid", raw: "1e20" });
    expect(ogSearch("abc")).toBe(1);
    expect(parsePageParam("abc")).toEqual({ page: 1, kind: "invalid", raw: "abc" });
    expect(ogSearch("0")).toBe(1);
    expect(parsePageParam("0")).toEqual({ page: 1, kind: "clamped-low", raw: "0" });
    expect(parsePageParam(null)).toEqual({ page: 1, kind: "default", raw: null });
  });

  it("BUG-022: '1e3' and '1000' parse to the SAME page", () => {
    expect(parsePageParam("1e3").page).toBe(parsePageParam("1000").page);
  });
});

describe("client parsePageInput (go-to-page box, lenient everywhere)", () => {
  it("applies the shared lenient rule", () => {
    expect(parsePageInput("30")).toBe(30);
    expect(parsePageInput("1e3")).toBe(1000);
    expect(parsePageInput("1e20")).toBe(MAX_PAGE);
    expect(parsePageInput("xyz")).toBeNull();
    expect(parsePageInput("2.5")).toBeNull();
    expect(parsePageInput("")).toBeNull();
  });
});

describe("pageNoticeFor (visible-correction copy)", () => {
  it("says why for invalid values", () => {
    const n = pageNoticeFor(parsePageParamStrict("1e3"));
    expect(n).toContain("“1e3” isn't a valid page number");
    expect(n).toContain("page 1 is shown");
  });

  it("has non-quoting copy for a present-but-empty ?page=", () => {
    expect(pageNoticeFor(parsePageParamStrict(""))).toBe(
      "The page number in the link is empty, so page 1 is shown.",
    );
  });

  it("says why for below-range values", () => {
    expect(pageNoticeFor(parsePageParamStrict("0"))).toBe(
      "Page 0 doesn't exist, so page 1 is shown.",
    );
  });

  it("says why for over-range values once the total is known", () => {
    expect(pageNoticeFor(parsePageParamStrict("999"), 48)).toBe(
      "Page 999 doesn't exist here — there are only 48 pages, so the last page is shown.",
    );
    // zero-result listings have exactly one (empty) page — singular copy
    expect(pageNoticeFor(parsePageParamStrict("2"), 1)).toBe(
      "Page 2 doesn't exist here — there is only 1 page, so the last page is shown.",
    );
  });

  it("stays silent for in-range and default values", () => {
    expect(pageNoticeFor(parsePageParamStrict("3"), 48)).toBeNull();
    expect(pageNoticeFor(parsePageParamStrict(null), 48)).toBeNull();
  });
});

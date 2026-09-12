/**
 * Unit tests — client kind-count helpers (client/src/lib/static-data.ts,
 * next to the other catalog fetchers so the dead-file gate sees them
 * reachable from the SPA).
 *
 * The home kind strip (a later page task) is the real consumer; until it
 * lands this suite is the helpers' importer and pins their wire contract:
 * URL shape (scoped / unscoped / blank scope), same-origin credentials, and
 * ApiError propagation on non-2xx.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  KIND_COUNTS_ENDPOINT,
  STRIP_KINDS,
  fetchKindCounts,
  kindCountsUrl,
} from "../../client/src/lib/static-data";
import { ApiError } from "../../client/src/lib/queryClient";
import { RESOURCE_KIND_VALUES } from "../../shared/resourceKinds";

const SAMPLE = { tools: 23, libraries: 61, standards: 47, events: 18, protocols: 11, other: 1656, total: 1816 };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("kindCountsUrl", () => {
  it("is the bare endpoint without a scope", () => {
    expect(kindCountsUrl()).toBe(KIND_COUNTS_ENDPOINT);
    expect(kindCountsUrl(null)).toBe(KIND_COUNTS_ENDPOINT);
    expect(kindCountsUrl("   ")).toBe(KIND_COUNTS_ENDPOINT);
  });

  it("encodes a slug or exact category name as ?category=", () => {
    expect(kindCountsUrl("intro-learning")).toBe(`${KIND_COUNTS_ENDPOINT}?category=intro-learning`);
    expect(kindCountsUrl(" Intro & Learning ")).toBe(
      `${KIND_COUNTS_ENDPOINT}?category=Intro%20%26%20Learning`,
    );
  });
});

describe("STRIP_KINDS", () => {
  it("lists every kind except other, in enum order", () => {
    expect([...STRIP_KINDS]).toEqual(RESOURCE_KIND_VALUES.filter((kind) => kind !== "other"));
  });
});

describe("fetchKindCounts", () => {
  it("GETs the counts endpoint with same-origin credentials and returns the payload", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(SAMPLE));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchKindCounts()).resolves.toEqual(SAMPLE);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(KIND_COUNTS_ENDPOINT);
    expect(init.method).toBe("GET");
    expect(init.credentials).toBe("include");
  });

  it("scopes to a category when one is given", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ...SAMPLE, total: 5 }));
    vi.stubGlobal("fetch", fetchMock);

    const counts = await fetchKindCounts("encoding-codecs");
    expect(counts.total).toBe(5);
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe(
      `${KIND_COUNTS_ENDPOINT}?category=encoding-codecs`,
    );
  });

  it("throws the shared ApiError on a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ error: "invalid_category", message: "category must be a non-empty string" }, 400)),
    );

    const failure = await fetchKindCounts("x").catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).status).toBe(400);
    expect((failure as ApiError).body).toContain("invalid_category");
  });
});

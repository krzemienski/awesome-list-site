// BUG-001 (Audit 2, Aug 2026): every 429 the app emits — express-rate-limit
// instances AND manual throttles (password reset, AI daily quota) — must share
// one contract: Retry-After always present, styled HTML page for text/html
// clients, documented JSON shape ({ message, error, retryAfter }) otherwise.
import { describe, expect, it } from "vitest";
import type { Request, Response } from "express";
import { negotiated429Handler, send429 } from "../../server/middleware/rateLimit";

function mockReq(accept?: string): Request {
  return { headers: accept === undefined ? {} : { accept } } as unknown as Request;
}

interface MockRes {
  statusCode: number;
  body: unknown;
  headers: Record<string, string>;
  res: Response;
}

function mockRes(presetHeaders: Record<string, string> = {}): MockRes {
  const state: MockRes = { statusCode: 0, body: undefined, headers: {}, res: undefined as unknown as Response };
  for (const [k, v] of Object.entries(presetHeaders)) state.headers[k.toLowerCase()] = v;
  const res = {
    setHeader(k: string, v: string | number) {
      state.headers[k.toLowerCase()] = String(v);
      return res;
    },
    getHeader(k: string) {
      return state.headers[k.toLowerCase()];
    },
    status(code: number) {
      state.statusCode = code;
      return res;
    },
    type(t: string) {
      state.headers["content-type"] = t;
      return res;
    },
    json(payload: unknown) {
      state.headers["content-type"] ||= "application/json";
      state.body = payload;
      return res;
    },
    send(payload: unknown) {
      state.body = payload;
      return res;
    },
  };
  state.res = res as unknown as Response;
  return state;
}

describe("send429 / negotiated429Handler (BUG-001 contract)", () => {
  it("serves the documented JSON shape with a Retry-After fallback for API clients", () => {
    const r = mockRes();
    send429(mockReq("*/*"), r.res, "Too many requests. Please slow down and try again shortly.");
    expect(r.statusCode).toBe(429);
    expect(r.headers["retry-after"]).toBe("60"); // fallback when nothing pre-set the header
    expect(r.body).toEqual({
      message: "Too many requests. Please slow down and try again shortly.",
      error: "Rate limit exceeded",
      retryAfter: 60,
    });
  });

  it("preserves a pre-set Retry-After (password-reset's 900s) in header and JSON body", () => {
    const r = mockRes({ "Retry-After": "900" });
    send429(mockReq(), r.res, "Too many reset requests. Please try again in a little while.");
    expect(r.statusCode).toBe(429);
    expect(r.headers["retry-after"]).toBe("900");
    expect((r.body as { retryAfter: number }).retryAfter).toBe(900);
  });

  it("serves the styled HTML page (with Retry-After) to browser navigations", () => {
    const r = mockRes({ "Retry-After": "900" });
    send429(
      mockReq("text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"),
      r.res,
      "Too many reset requests. Please try again in a little while.",
    );
    expect(r.statusCode).toBe(429);
    expect(r.headers["retry-after"]).toBe("900");
    expect(r.headers["content-type"]).toContain("html");
    const html = String(r.body);
    expect(html).toContain('data-testid="rate-limit-page"');
    expect(html).toContain("Too many reset requests. Please try again in a little while.");
    expect(html).toContain('http-equiv="refresh"'); // auto-retry once the window resets
    expect(html).not.toContain("<script"); // CSP: script-src is nonce-gated
  });

  it("escapes HTML in limiter copy", () => {
    const r = mockRes();
    send429(mockReq("text/html"), r.res, 'Bad <img src=x onerror="x"> & "quotes"');
    const html = String(r.body);
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
    expect(html).toContain("&amp;");
  });

  it("negotiated429Handler is the same contract as an express-rate-limit handler", () => {
    const handler = negotiated429Handler("Too many AI requests. Please try again in a few minutes.");
    const r = mockRes({ "Retry-After": "42" }); // express-rate-limit pre-sets this
    handler(mockReq("application/json"), r.res);
    expect(r.statusCode).toBe(429);
    expect(r.body).toEqual({
      message: "Too many AI requests. Please try again in a few minutes.",
      error: "Rate limit exceeded",
      retryAfter: 42,
    });
  });
});

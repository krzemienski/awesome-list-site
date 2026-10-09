import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isSafeReturnPath, normalizeReturnPath } from "../../client/src/lib/returnUrl";

/**
 * Sign-in return paths (?redirect_url=) must stay on this origin. The browser's
 * URL parser strips TAB/LF/CR, so a decoded "/\n/evil.example" would become
 * the network-path URL "//evil.example" on navigation — the owner-password
 * sign-in assigns the accepted value to window.location.href.
 */
const ORIGIN = "http://127.0.0.1:5000";
const g = globalThis as { window?: unknown };
let savedWindow: unknown;

beforeAll(() => {
  savedWindow = g.window;
  g.window = { location: { origin: ORIGIN } };
});
afterAll(() => {
  g.window = savedWindow;
});

describe("normalizeReturnPath", () => {
  it.each([
    "/\n/evil.example",
    "/\r/evil.example",
    "/\t/evil.example",
    "/\n\\evil.example",
    "/admin\u0000",
    "/admin\u007f",
    "//evil.example",
    "/\\evil.example",
    "https://evil.example/",
    "admin",
    "",
  ])("rejects %j", (value) => {
    expect(normalizeReturnPath(value)).toBeNull();
    expect(isSafeReturnPath(value)).toBe(false);
  });

  it("rejects the decoded form of %2F%0A%2Fevil.example", () => {
    const decoded = new URLSearchParams("redirect_url=%2F%0A%2Fevil.example").get("redirect_url");
    expect(normalizeReturnPath(decoded)).toBeNull();
  });

  it.each([
    ["/admin#users", "/admin#users"],
    ["/admin?status=rejected#resources", "/admin?status=rejected#resources"],
    ["/admin#subsubcategories", "/admin#subsubcategories"],
    ["/profile?tab=security", "/profile?tab=security"],
  ])("keeps %j as %j", (value, expected) => {
    expect(normalizeReturnPath(value)).toBe(expected);
  });

  it("returns the parsed, normalized path", () => {
    expect(normalizeReturnPath("/a/../admin#users")).toBe("/admin#users");
  });
});

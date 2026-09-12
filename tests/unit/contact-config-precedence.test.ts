/**
 * Contact config precedence.
 *
 * The checked-in awesome-list.config.yaml ships a contact block with blank
 * destinations. loadConfig() merges that block AFTER the env-seeded defaults,
 * so without an explicit env-after-YAML step the environment was silently
 * discarded. These tests pin the contract:
 *   env var (non-blank) > YAML block > built-in default, for every field
 *   `enabled` is environment-only and never reads YAML
 */
import { describe, it, expect } from "vitest";
import { resolveContactConfig } from "../../server/config";

const BLANK_YAML = {
  email: "",
  issues_url: "",
  discussions_url: "",
  discussions_verified: false,
  retention_days: 180,
};

const FULL_ENV = {
  CONTACT_ENABLED: "true",
  CONTACT_EMAIL: "mailto:hello@example.com",
  CONTACT_ISSUES_URL: "https://github.com/example/repo/issues",
  CONTACT_DISCUSSIONS_URL: "https://github.com/example/repo/discussions",
  CONTACT_DISCUSSIONS_VERIFIED: "true",
};

describe("resolveContactConfig", () => {
  it("lets present env vars win over the blank checked-in YAML block", () => {
    const resolved = resolveContactConfig(BLANK_YAML, FULL_ENV);
    expect(resolved).toEqual({
      enabled: true,
      email: "mailto:hello@example.com",
      issues_url: "https://github.com/example/repo/issues",
      discussions_url: "https://github.com/example/repo/discussions",
      discussions_verified: true,
      retention_days: 180,
    });
  });

  it("falls back to YAML values when the env vars are absent", () => {
    const yaml = {
      email: "mailto:yaml@example.com",
      issues_url: "https://example.com/issues",
      discussions_url: "https://example.com/discussions",
      discussions_verified: true,
      retention_days: 30,
    };
    expect(resolveContactConfig(yaml, {})).toEqual({ ...yaml, enabled: false });
  });

  it("falls back to built-in defaults when neither env nor YAML provides a field", () => {
    expect(resolveContactConfig(undefined, {})).toEqual({
      enabled: false,
      email: "",
      issues_url: "",
      discussions_url: "",
      discussions_verified: false,
      retention_days: 180,
    });
    expect(resolveContactConfig(null, {})).toEqual(resolveContactConfig(undefined, {}));
  });

  it("treats blank env vars as absent so an empty .env line cannot erase a YAML value", () => {
    const yaml = { ...BLANK_YAML, email: "mailto:yaml@example.com", discussions_verified: true };
    const resolved = resolveContactConfig(yaml, {
      CONTACT_EMAIL: "   ",
      CONTACT_DISCUSSIONS_VERIFIED: "",
    });
    expect(resolved.email).toBe("mailto:yaml@example.com");
    expect(resolved.discussions_verified).toBe(true);
  });

  it("lets env explicitly turn discussions_verified off even when YAML says true", () => {
    const yaml = { ...BLANK_YAML, discussions_verified: true };
    expect(resolveContactConfig(yaml, { CONTACT_DISCUSSIONS_VERIFIED: "false" }).discussions_verified).toBe(false);
  });

  it("keeps `enabled` environment-only: YAML can never switch the form on", () => {
    const yaml = { ...BLANK_YAML, enabled: true } as Partial<typeof BLANK_YAML> & { enabled: boolean };
    expect(resolveContactConfig(yaml, {}).enabled).toBe(false);
    expect(resolveContactConfig(yaml, { CONTACT_ENABLED: "1" }).enabled).toBe(false);
    expect(resolveContactConfig(yaml, { CONTACT_ENABLED: "true" }).enabled).toBe(true);
  });

  it("ignores malformed YAML types and keeps the typed defaults", () => {
    const resolved = resolveContactConfig(
      { email: null as unknown as string, retention_days: -5, issues_url: 42 as unknown as string },
      {}
    );
    expect(resolved.email).toBe("");
    expect(resolved.issues_url).toBe("");
    expect(resolved.retention_days).toBe(180);
  });
});

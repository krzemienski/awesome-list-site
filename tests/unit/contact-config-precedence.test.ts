/**
 * Contact config precedence.
 *
 * The checked-in awesome-list.config.yaml ships a contact block with blank
 * destinations. loadConfig() merges that block AFTER the env-seeded defaults,
 * so without an explicit env-after-YAML step the environment was silently
 * discarded. These tests pin the contract:
 *   env var (non-blank) > YAML block > built-in default, for every field
 *   `enabled` and `ip_hash_secret` are environment-only and never read YAML
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
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
      ip_hash_secret: "",
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
    expect(resolveContactConfig(yaml, {})).toEqual({ ...yaml, enabled: false, ip_hash_secret: "" });
  });

  it("falls back to built-in defaults when neither env nor YAML provides a field", () => {
    expect(resolveContactConfig(undefined, {})).toEqual({
      enabled: false,
      email: "",
      issues_url: "",
      discussions_url: "",
      discussions_verified: false,
      retention_days: 180,
      ip_hash_secret: "",
    });
    expect(resolveContactConfig(null, {})).toEqual(resolveContactConfig(undefined, {}));
  });

  it("keeps the IP hash secret environment-only and fails closed on short values", () => {
    const yaml = { ...BLANK_YAML, ip_hash_secret: "committed-secret-must-not-count" } as Partial<typeof BLANK_YAML> & {
      ip_hash_secret: string;
    };
    expect(resolveContactConfig(yaml, {}).ip_hash_secret).toBe("");
    expect(resolveContactConfig(yaml, { CONTACT_IP_HASH_SECRET: "too-short" }).ip_hash_secret).toBe("");
    expect(resolveContactConfig(yaml, { CONTACT_IP_HASH_SECRET: "   " }).ip_hash_secret).toBe("");
    expect(
      resolveContactConfig(yaml, { CONTACT_IP_HASH_SECRET: "exactly-16-chars" }).ip_hash_secret,
    ).toBe("exactly-16-chars");
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

/**
 * The wiring test: loadConfig() runs at module load against the checked-in
 * awesome-list.config.yaml (blank contact block). Re-importing the module
 * with controlled env proves the env actually reaches `config.contact`
 * through the YAML merge — the exact path that regressed.
 */
describe("server/config contact block through loadConfig()", () => {
  const CONTACT_KEYS = [
    "CONTACT_ENABLED",
    "CONTACT_EMAIL",
    "CONTACT_ISSUES_URL",
    "CONTACT_DISCUSSIONS_URL",
    "CONTACT_DISCUSSIONS_VERIFIED",
    "CONTACT_IP_HASH_SECRET",
  ] as const;
  const saved: Partial<Record<(typeof CONTACT_KEYS)[number], string | undefined>> = {};

  beforeEach(() => {
    for (const key of CONTACT_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
    vi.resetModules();
  });

  afterEach(() => {
    for (const key of CONTACT_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    vi.resetModules();
  });

  it("the checked-in YAML still ships a blank contact block (the precondition this suite guards)", () => {
    const file = fs.readFileSync(path.join(process.cwd(), "awesome-list.config.yaml"), "utf8");
    const parsed = yaml.load(file) as { contact?: Record<string, unknown> };
    expect(parsed.contact).toMatchObject({ email: "", issues_url: "", discussions_url: "", discussions_verified: false });
    expect(parsed.contact).not.toHaveProperty("enabled");
  });

  it("env destinations survive the YAML merge in the loaded config", async () => {
    Object.assign(process.env, FULL_ENV);
    const { config } = await import("../../server/config");
    expect(config.contact).toEqual({
      enabled: true,
      email: FULL_ENV.CONTACT_EMAIL,
      issues_url: FULL_ENV.CONTACT_ISSUES_URL,
      discussions_url: FULL_ENV.CONTACT_DISCUSSIONS_URL,
      discussions_verified: true,
      retention_days: 180,
      ip_hash_secret: "",
    });
  });

  it("without env the loaded config falls back to the YAML block and stays disabled", async () => {
    const { config } = await import("../../server/config");
    expect(config.contact).toEqual({
      enabled: false,
      email: "",
      issues_url: "",
      discussions_url: "",
      discussions_verified: false,
      retention_days: 180,
      ip_hash_secret: "",
    });
  });
});

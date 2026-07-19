/**
 * Shared input-validation primitives (Run21, R4-014/015/016/047/048/049/050/076).
 *
 * ONE source of truth for both layers: the server mounts these on every write
 * endpoint (register, change-password, profile, submit, suggest-edit, admin
 * resource create/edit) and the client reuses the same schemas via zodResolver,
 * so the two layers can never drift apart again.
 *
 * Core idea: "visible length". Zero-width characters (U+200B..200D, U+2060,
 * U+FEFF, bidi marks, soft hyphen) are not matched by \s, so `.trim()`-based
 * checks pass strings a human cannot see. Every "required" rule here counts
 * VISIBLE characters instead.
 */
import { z } from "zod";

/** Zero-width / invisible format characters that survive String.trim(). */
export const ZERO_WIDTH_RE = /[\u200B-\u200F\u2060\uFEFF\u00AD]/g;

/** Strip zero-width characters, then trim ordinary whitespace. */
export function stripInvisible(value: string): string {
  return value.replace(ZERO_WIDTH_RE, "").trim();
}

/** Count characters that actually render (excludes ALL whitespace + zero-width). */
export function visibleLength(value: string): number {
  return value.replace(ZERO_WIDTH_RE, "").replace(/\s/g, "").length;
}

export function hasVisibleChars(value: string): boolean {
  return visibleLength(value) > 0;
}

/** Markup is never legitimate catalog/user content (defense-in-depth vs stored XSS). */
export const NO_HTML_RE = /<[a-z!/][^>]*>/i;

// ---------------------------------------------------------------------------
// URLs (R4-048 cap, R4-076 userinfo reject, Run16 https-only contract)
// ---------------------------------------------------------------------------

export const MAX_URL_LENGTH = 2048;
export const HTTPS_URL_RE = /^https:\/\//i;
export const WEB_URL_RE = /^https?:\/\//i;
export const URL_HOSTNAME_MESSAGE =
  "URL must have a valid hostname (e.g. https://example.com)";

/**
 * A catalog URL must parse, carry no whitespace, and have a dotted hostname
 * with a plausible TLD. Bare IPs / localhost / dotless hosts are never valid
 * catalog destinations. (BUG-018 run18, moved here from server/routes.ts.)
 */
export function isPlausiblePublicUrl(raw: string): boolean {
  if (/\s/.test(raw)) return false;
  try {
    const u = new URL(raw);
    const host = u.hostname;
    if (!host.includes(".")) return false;
    if (host.startsWith(".") || host.endsWith(".") || host.includes("..")) return false;
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(host)) return false;
    const tld = host.split(".").pop()!;
    if (tld.length < 2 || /^\d+$/.test(tld)) return false;
    return true;
  } catch {
    return false;
  }
}

/** R4-076: https://user:pass@host smuggles credentials into the catalog. */
export function urlHasUserinfo(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.username !== "" || u.password !== "";
  } catch {
    return false;
  }
}

/** Strict https-only resource URL — new resources (submit + admin create). */
export const httpsUrlSchema = z
  .string()
  .trim()
  .min(1, "URL is required")
  .max(MAX_URL_LENGTH, `URL must be at most ${MAX_URL_LENGTH} characters`)
  .url("Invalid URL format")
  .refine((v) => !/[\u0000-\u001F]/.test(v), "URL must not contain control characters")
  .refine((v) => HTTPS_URL_RE.test(v), "Must be a valid HTTPS URL")
  .refine(isPlausiblePublicUrl, URL_HOSTNAME_MESSAGE)
  .refine((v) => !urlHasUserinfo(v), "URL must not contain embedded credentials");

/** Web URL for edits — legacy http:// may be kept, but caps/userinfo still apply. */
export const webUrlSchema = z
  .string()
  .trim()
  .min(1, "URL is required")
  .max(MAX_URL_LENGTH, `URL must be at most ${MAX_URL_LENGTH} characters`)
  .refine((v) => !/[\u0000-\u001F]/.test(v), "URL must not contain control characters")
  .refine((v) => WEB_URL_RE.test(v), "URL must start with http:// or https://")
  .refine(isPlausiblePublicUrl, URL_HOSTNAME_MESSAGE)
  .refine((v) => !urlHasUserinfo(v), "URL must not contain embedded credentials");

// ---------------------------------------------------------------------------
// Resource content (R4-015 visible titles, R4-016 shared edit-path rules,
// R4-047 description bounds, R4-069 trim-on-write)
// ---------------------------------------------------------------------------

export const RESOURCE_TITLE_MAX = 200;
export const DESCRIPTION_MIN = 10;
export const DESCRIPTION_MAX = 1000;
export const TAG_MAX_LENGTH = 50;

/** Title: trimmed on write, must contain visible characters, ≤200, no markup. */
export const resourceTitleSchema = z
  .string()
  .max(RESOURCE_TITLE_MAX, `Title must be 1-${RESOURCE_TITLE_MAX} characters`)
  .refine(hasVisibleChars, "Title is required")
  .refine((v) => !NO_HTML_RE.test(v), "Title must not contain HTML tags")
  .transform((v) => stripInvisible(v));

/** Description: required on submit paths, 10–1000 visible chars, no markup. */
export const resourceDescriptionSchema = z
  .string()
  .max(DESCRIPTION_MAX, `Description must be at most ${DESCRIPTION_MAX} characters`)
  .refine((v) => !NO_HTML_RE.test(v), "Description must not contain HTML tags")
  .refine(
    (v) => visibleLength(v) >= DESCRIPTION_MIN,
    `Description must be at least ${DESCRIPTION_MIN} characters`,
  )
  .transform((v) => stripInvisible(v).replace(/\s+/g, " "));

/** Optional variant for edit paths: when present it must meet the same bounds. */
export const optionalDescriptionSchema = resourceDescriptionSchema.optional();

export const tagSchema = z
  .string()
  .max(TAG_MAX_LENGTH, `Tags must be at most ${TAG_MAX_LENGTH} characters`)
  .refine((v) => !NO_HTML_RE.test(v), "Tags must not contain HTML tags")
  .transform((v) => stripInvisible(v));

// ---------------------------------------------------------------------------
// People (R4-014 passwords, R4-049 invisible names, R4-050 unified cap)
// ---------------------------------------------------------------------------

export const DISPLAY_NAME_MAX = 50;
export const PASSWORD_MIN_VISIBLE = 8;
export const PASSWORD_MAX = 128;

/**
 * Display-name field (firstName / lastName). Empty string is allowed (clears
 * the field); anything non-empty must contain visible characters and fit the
 * ONE cap shared by register-derivation, the profile editor, and the admin
 * name endpoint.
 */
export const displayNameSchema = z
  .string()
  .max(DISPLAY_NAME_MAX, `Name must be ${DISPLAY_NAME_MAX} characters or fewer`)
  .refine((v) => !NO_HTML_RE.test(v), "Name must not contain HTML tags")
  .refine(
    (v) => v.trim() === "" || hasVisibleChars(v),
    "Name must contain visible characters",
  )
  .transform((v) => stripInvisible(v));

/**
 * R4-014: a password of zero-width spaces passes length + \s-trim checks but
 * is unusable/invisible. Require ≥8 VISIBLE characters (whitespace and
 * zero-width chars don't count toward the minimum).
 */
export function passwordVisibleCheck(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < PASSWORD_MIN_VISIBLE) {
    return { valid: false, error: "Password must be at least 8 characters long" };
  }
  if (visibleLength(password) < PASSWORD_MIN_VISIBLE) {
    return { valid: false, error: "Password must contain at least 8 visible characters" };
  }
  if (password.length > PASSWORD_MAX) {
    return { valid: false, error: "Password must be at most 128 characters long" };
  }
  return { valid: true };
}

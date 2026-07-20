/**
 * Shared input-validation primitives (Run21 R4-014/015/016/047/048/049/050/076;
 * Run24 R5-001/019/038/046/048 Unicode + URL-normalization overhaul).
 *
 * ONE source of truth for both layers: the server mounts these on every write
 * endpoint (register, change-password, profile, submit, suggest-edit, admin
 * resource create/edit, taxonomy, journeys, researcher) and the client reuses
 * the same schemas via zodResolver, so the two layers can never drift apart.
 *
 * Core idea: "visible length". The old implementation stripped a hard-coded
 * 3-range zero-width class; R5-001 proved bidi overrides (U+202A–E, U+2066–69),
 * invisible operators (U+2061–64), blank-rendering glyphs (U+2800 braille
 * blank, hangul fillers U+115F/1160/3164/FFA0, U+180E) and combining-mark-only
 * strings all passed as "visible". The new core:
 *   1. NFKC-normalizes a VALIDATION COPY (fullwidth/compat confusables fold),
 *   2. strips ALL Unicode format chars (Cf) + surrogates (Cs),
 *   3. strips blank-rendering glyphs and combining marks (Mn),
 *   4. strips whitespace, then counts what is left.
 * Stored values are NOT NFKC-normalized (ﬁ→fi / ½→1/2 would mangle legit
 * titles); storage stripping removes Cf/Cs but PRESERVES U+200D (ZWJ) so
 * emoji sequences like 👨‍👩‍👧 survive intact.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Unicode-aware invisibility core (R5-001/038)
// ---------------------------------------------------------------------------

/**
 * Legacy zero-width class — kept for backward compatibility with older call
 * sites; new code should use stripInvisible/visibleLength which cover the
 * full Cf/Cs categories.
 */
export const ZERO_WIDTH_RE = /[\u200B-\u200F\u2060\uFEFF\u00AD]/g;

/** ALL format (Cf) + surrogate (Cs) code points — used for the length check. */
const FORMAT_ALL_RE = /[\p{Cf}\p{Cs}]/gu;

/**
 * Format/surrogate chars EXCEPT U+200D (zero-width joiner). ZWJ is Cf but
 * glues emoji sequences (👨‍👩‍👧); stripping it from STORED values would
 * silently rewrite user content into different emoji.
 */
const FORMAT_STRIP_KEEP_ZWJ_RE = /\p{Cs}|(?!\u200D)\p{Cf}/gu;

/**
 * Glyphs that occupy a cell but render blank (not Cf, so category strips miss
 * them): braille blank U+2800, hangul fillers U+115F/U+1160/U+3164/U+FFA0,
 * Mongolian vowel separator U+180E (Cf in modern Unicode, listed for older
 * data). NFKC folds U+3164/U+FFA0 → U+1160, but we match all pre-fold forms.
 */
const BLANK_GLYPHS_RE = /[\u2800\u115F\u1160\u3164\uFFA0\u180E]/g;

/** Combining marks (Mn) — never count toward visible length on their own. */
const COMBINING_MARKS_RE = /\p{Mn}/gu;

/**
 * Control characters for SINGLE-LINE fields (titles, tags, names, slugs,
 * prompts): every C0 control + DEL is rejected, including \t \n \r (R5-019).
 */
export const SINGLE_LINE_CONTROL_RE = /[\u0000-\u001F\u007F]/;

/**
 * Control characters for MULTI-LINE fields (descriptions): \t \n \r are
 * tolerated (the description transform collapses them to single spaces);
 * everything else — NUL, BEL, ESC, DEL … — is rejected (R5-019).
 */
export const MULTILINE_CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

export const CONTROL_CHARS_MESSAGE = "must not contain control characters";

/**
 * Bidirectional control characters (R5-038). Unlike the zero-widths that
 * stripInvisible silently removes, these are REJECTED outright: an embedded
 * bidi override (U+202A–202E) or isolate (U+2066–2069), or a bare directional
 * mark (U+200E/200F), reorders how the rest of the string renders. Stripping
 * would change the visible content ("evil\u202Etxt.mp4" → "eviltxt.mp4" reads
 * as "evilfdp.txt" on screen), so a value that CONTAINS one is never a
 * legitimate title/name/tag/prompt — bounce it with a clear message.
 */
export const BIDI_CONTROL_RE = /[\u202A-\u202E\u2066-\u2069\u200E\u200F]/;
export const BIDI_CONTROL_MESSAGE =
  "must not contain bidirectional (right-to-left override) control characters";

/**
 * Strip invisible format characters from a value before storing it.
 * Removes all Cf/Cs EXCEPT ZWJ (emoji glue), then trims whitespace.
 * Does NOT NFKC-normalize — stored content keeps its original glyphs.
 */
export function stripInvisible(value: string): string {
  return value.replace(FORMAT_STRIP_KEEP_ZWJ_RE, "").trim();
}

/**
 * Count characters that actually render something visible.
 * NFKC-folds first (so fullwidth/compat forms are measured canonically),
 * then strips ALL Cf/Cs (including ZWJ), blank-rendering glyphs, combining
 * marks, and whitespace. A string of bidi overrides, braille blanks, hangul
 * fillers or bare combining marks measures 0.
 */
export function visibleLength(value: string): number {
  let folded: string;
  try {
    folded = value.normalize("NFKC");
  } catch {
    folded = value;
  }
  return folded
    .replace(FORMAT_ALL_RE, "")
    .replace(BLANK_GLYPHS_RE, "")
    .replace(COMBINING_MARKS_RE, "")
    .replace(/\s/g, "").length;
}

export function hasVisibleChars(value: string): boolean {
  return visibleLength(value) > 0;
}

/** UTF-8 byte length (browser + Node safe) — bcrypt truncates at 72 BYTES. */
export function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

/** Markup is never legitimate catalog/user content (defense-in-depth vs stored XSS). */
export const NO_HTML_RE = /<[a-z!/][^>]*>/i;

// ---------------------------------------------------------------------------
// URLs (R4-048 cap, R4-076 userinfo reject, Run16 https-only contract,
// R5-048 normalization: persist url.toString(), reject backslash/port-0/DEL,
// IDN hosts stored as punycode, tracking params stripped at write time)
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
 * Note: WHATWG URL converts IDN hosts to punycode in `.hostname`, so the
 * ASCII-only hostname regex doubles as the R5-048 "punycode-or-400" rule —
 * homograph hosts either become an xn-- form (stored honestly) or fail here.
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

/** R5-048: port 0 is never routable; WHATWG URL happily keeps it. */
export function urlHasPortZero(raw: string): boolean {
  try {
    return new URL(raw).port === "0";
  } catch {
    return false;
  }
}

/**
 * R5-048: tracking parameters stripped at write time so catalog rows carry
 * canonical destinations. `source` is only stripped when it carries the known
 * share-tracking value (a generic `source=` param can be meaningful).
 */
const TRACKING_PARAM_EXACT = new Set([
  "_hsenc",
  "_branch_match_id",
  "gi",
  "fbclid",
  "gclid",
]);

export function normalizeCatalogUrl(raw: string): string {
  try {
    const u = new URL(raw);
    const toDelete: string[] = [];
    for (const key of Array.from(new Set(u.searchParams.keys()))) {
      const lower = key.toLowerCase();
      if (/^utm_/i.test(key) || TRACKING_PARAM_EXACT.has(lower)) {
        toDelete.push(key);
      } else if (lower === "source" && u.searchParams.get(key) === "userActivityShare") {
        toDelete.push(key);
      }
    }
    for (const key of toDelete) u.searchParams.delete(key);
    // URL.toString() re-serializes: IDN → punycode, path percent-normalized,
    // default ports dropped — the canonical form we persist (R5-048).
    return u.toString();
  } catch {
    return raw;
  }
}

const urlCoreChecks = (schema: z.ZodString) =>
  schema
    .trim()
    .min(1, "URL is required")
    .max(MAX_URL_LENGTH, `URL must be at most ${MAX_URL_LENGTH} characters`)
    .refine((v) => !/[\u0000-\u001F\u007F]/.test(v), "URL must not contain control characters")
    .refine((v) => !v.includes("\\"), "URL must not contain backslashes");

/** Strict https-only resource URL — new resources (submit + admin create). */
export const httpsUrlSchema = urlCoreChecks(z.string())
  .url("Invalid URL format")
  .refine((v) => HTTPS_URL_RE.test(v), "Must be a valid HTTPS URL")
  .refine(isPlausiblePublicUrl, URL_HOSTNAME_MESSAGE)
  .refine((v) => !urlHasUserinfo(v), "URL must not contain embedded credentials")
  .refine((v) => !urlHasPortZero(v), "URL must not use port 0")
  .transform(normalizeCatalogUrl);

/** Web URL for edits — legacy http:// may be kept, but caps/userinfo still apply. */
export const webUrlSchema = urlCoreChecks(z.string())
  .refine((v) => WEB_URL_RE.test(v), "URL must start with http:// or https://")
  .refine(isPlausiblePublicUrl, URL_HOSTNAME_MESSAGE)
  .refine((v) => !urlHasUserinfo(v), "URL must not contain embedded credentials")
  .refine((v) => !urlHasPortZero(v), "URL must not use port 0")
  .transform(normalizeCatalogUrl);

// ---------------------------------------------------------------------------
// Resource content (R4-015 visible titles, R4-016 shared edit-path rules,
// R4-047 description bounds, R4-069 trim-on-write, R5-019 control chars)
// ---------------------------------------------------------------------------

export const RESOURCE_TITLE_MAX = 200;
export const DESCRIPTION_MIN = 10;
export const DESCRIPTION_MAX = 1000;
export const TAG_MAX_LENGTH = 50;

/** Title: trimmed on write, must contain visible characters, ≤200, no markup, single-line. */
export const resourceTitleSchema = z
  .string()
  .max(RESOURCE_TITLE_MAX, `Title must be 1-${RESOURCE_TITLE_MAX} characters`)
  .refine((v) => !SINGLE_LINE_CONTROL_RE.test(v), `Title ${CONTROL_CHARS_MESSAGE}`)
  .refine((v) => !BIDI_CONTROL_RE.test(v), `Title ${BIDI_CONTROL_MESSAGE}`)
  .refine(hasVisibleChars, "Title is required")
  .refine((v) => !NO_HTML_RE.test(v), "Title must not contain HTML tags")
  .transform((v) => stripInvisible(v));

/** Description: required on submit paths, 10–1000 visible chars, no markup. */
export const resourceDescriptionSchema = z
  .string()
  .max(DESCRIPTION_MAX, `Description must be at most ${DESCRIPTION_MAX} characters`)
  .refine((v) => !MULTILINE_CONTROL_RE.test(v), `Description ${CONTROL_CHARS_MESSAGE}`)
  .refine((v) => !BIDI_CONTROL_RE.test(v), `Description ${BIDI_CONTROL_MESSAGE}`)
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
  .refine((v) => !SINGLE_LINE_CONTROL_RE.test(v), `Tags ${CONTROL_CHARS_MESSAGE}`)
  .refine((v) => !BIDI_CONTROL_RE.test(v), `Tags ${BIDI_CONTROL_MESSAGE}`)
  .refine((v) => !NO_HTML_RE.test(v), "Tags must not contain HTML tags")
  .transform((v) => stripInvisible(v));

// ---------------------------------------------------------------------------
// Taxonomy + journeys (R5-002: names/slugs/step content had ZERO validation)
// ---------------------------------------------------------------------------

export const TAXONOMY_NAME_MAX = 100;
export const SLUG_MAX = 100;
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Category/subcategory/sub-subcategory display name. */
export const taxonomyNameSchema = z
  .string()
  .max(TAXONOMY_NAME_MAX, `Name must be at most ${TAXONOMY_NAME_MAX} characters`)
  .refine((v) => !SINGLE_LINE_CONTROL_RE.test(v), `Name ${CONTROL_CHARS_MESSAGE}`)
  .refine((v) => !BIDI_CONTROL_RE.test(v), `Name ${BIDI_CONTROL_MESSAGE}`)
  .refine(hasVisibleChars, "Name must contain visible characters")
  .refine((v) => !NO_HTML_RE.test(v), "Name must not contain HTML tags")
  .transform((v) => stripInvisible(v));

/** URL slug: lowercase alphanumerics + single hyphens only (no ../, spaces, unicode). */
export const slugSchema = z
  .string()
  .min(1, "Slug is required")
  .max(SLUG_MAX, `Slug must be at most ${SLUG_MAX} characters`)
  .refine(
    (v) => SLUG_RE.test(v),
    "Slug must contain only lowercase letters, numbers and hyphens (e.g. video-tools)",
  );

/** Journey/learning-path titles share the resource-title contract. */
export const journeyTitleSchema = resourceTitleSchema;

/** Journey step/journey descriptions: optional, bounded, visible when present. */
export const journeyDescriptionSchema = z
  .string()
  .max(DESCRIPTION_MAX, `Description must be at most ${DESCRIPTION_MAX} characters`)
  .refine((v) => !MULTILINE_CONTROL_RE.test(v), `Description ${CONTROL_CHARS_MESSAGE}`)
  .refine((v) => !BIDI_CONTROL_RE.test(v), `Description ${BIDI_CONTROL_MESSAGE}`)
  .refine((v) => !NO_HTML_RE.test(v), "Description must not contain HTML tags")
  .refine(
    (v) => v.trim() === "" || hasVisibleChars(v),
    "Description must contain visible characters",
  )
  .transform((v) => stripInvisible(v).replace(/\s+/g, " "));

// ---------------------------------------------------------------------------
// People (R4-014 passwords, R4-049 invisible names, R4-050 unified cap,
// R5-046 72-byte bcrypt cap)
// ---------------------------------------------------------------------------

export const DISPLAY_NAME_MAX = 50;
export const PASSWORD_MIN_VISIBLE = 8;
/** bcrypt silently truncates at 72 BYTES — the real ceiling (R5-046). */
export const PASSWORD_MAX_BYTES = 72;
/** @deprecated superseded by PASSWORD_MAX_BYTES; kept for older imports. */
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
  .refine((v) => !SINGLE_LINE_CONTROL_RE.test(v), `Name ${CONTROL_CHARS_MESSAGE}`)
  .refine((v) => !BIDI_CONTROL_RE.test(v), `Name ${BIDI_CONTROL_MESSAGE}`)
  .refine((v) => !NO_HTML_RE.test(v), "Name must not contain HTML tags")
  .refine(
    (v) => v.trim() === "" || hasVisibleChars(v),
    "Name must contain visible characters",
  )
  .transform((v) => stripInvisible(v));

/**
 * R4-014 + R5-001/046: rules for NEW passwords (register / change / reset).
 * - ≥8 chars AND ≥8 VISIBLE chars (bidi overrides, blank glyphs, combining
 *   marks, zero-widths don't count),
 * - ≤72 BYTES (bcrypt truncates beyond that — accepting more silently
 *   weakens the credential; multi-byte chars count their true width).
 * Login paths must NOT mount this (existing credentials predate new rules).
 */
export function passwordVisibleCheck(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < PASSWORD_MIN_VISIBLE) {
    return { valid: false, error: "Password must be at least 8 characters long" };
  }
  if (visibleLength(password) < PASSWORD_MIN_VISIBLE) {
    return { valid: false, error: "Password must contain at least 8 visible characters" };
  }
  if (utf8ByteLength(password) > PASSWORD_MAX_BYTES) {
    return {
      valid: false,
      error: "Password is too long — at most 72 bytes (accented characters and emoji count more than once)",
    };
  }
  return { valid: true };
}

// ---------------------------------------------------------------------------
// Bounded integers (R5-020: Number.isInteger(1e20) is true but overflows
// PostgreSQL int4/int8 → driver 500. Shared browser-safe helper.)
// ---------------------------------------------------------------------------

/** PostgreSQL int4 ceiling — every id / pagination param must fit. */
export const PG_INT4_MAX = 2147483647;

/**
 * Parse an integer within [min, max] (defaults: 0..PG_INT4_MAX).
 * Returns null for non-numeric, fractional, negative-zero-ish, unsafe or
 * out-of-range values — callers answer 400.
 */
export function parseIntInRange(
  value: unknown,
  opts: { min?: number; max?: number } = {},
): number | null {
  const { min = 0, max = PG_INT4_MAX } = opts;
  if (typeof value !== "string" && typeof value !== "number") return null;
  const s = String(value).trim();
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isSafeInteger(n) || n < min || n > max) return null;
  return n;
}

// Event-property hygiene for every custom analytics event (tracking plan:
// docs/ANALYTICS.md → "Tracking plan"). The shared dispatcher runs this ONCE
// per event and hands the same cleaned object to GA4, Mixpanel, PostHog and
// Amplitude, so no vendor can receive a property another vendor was spared.
//
// Rules, in order, per property:
//   1. Keys that name a secret/PII field (email, password, token, secret,
//      phone) are dropped outright, whatever their value.
//   2. null / undefined / NaN / ±Infinity / '' and nested plain objects are
//      dropped (GA4 cannot take objects; nothing in the catalog needs them).
//   3. IDs (`id` or `*_id`) are sent as strings.
//   4. Strings: every absolute URL is reduced to origin + path, every relative
//      `/path?query#hash` loses its query and fragment; then the value is
//      dropped if it still contains an email address, and finally capped.
//   5. Arrays keep only primitive items (each cleaned by rule 4), capped.
//
// This module is pure (no window/document access) and is only reached from
// the post-consent dispatcher chunk, never from the pre-consent entry bundle.

type EventProps = Record<string, unknown>;

/** Hard cap per string value (GA4 itself truncates at 100; Mixpanel at 255 bytes). */
const MAX_STRING_LENGTH = 200;
const MAX_ARRAY_ITEMS = 50;
/** Inputs are pre-trimmed to this before any regex runs (bounded work). */
const MAX_SCAN_LENGTH = 2000;

const SENSITIVE_KEY = /(^|_)(e_?mail|password|passwd|token|secret|phone)(_|$)/i;
const ID_KEY = /(^|_)id$/i;
const EMAIL_SHAPED = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const ABSOLUTE_URL = /\bhttps?:\/\/[^\s"'<>]+/gi;
// A relative path (start of value or after whitespace/quote/paren) that
// carries a query string or fragment.
const RELATIVE_PATH_WITH_QUERY = /(^|[\s("'])(\/(?!\/)[^\s?#"'<>]*)[?#][^\s"'<>)]*/g;

const stripAbsoluteUrl = (raw: string): string => {
  try {
    const url = new URL(raw);
    return url.origin + url.pathname;
  } catch {
    return raw.split(/[?#]/, 1)[0];
  }
};

const cleanString = (value: string): string | undefined => {
  const withoutQueries = value
    .slice(0, MAX_SCAN_LENGTH)
    .replace(ABSOLUTE_URL, stripAbsoluteUrl)
    .replace(RELATIVE_PATH_WITH_QUERY, '$1$2')
    .trim();
  if (!withoutQueries) return undefined;
  if (EMAIL_SHAPED.test(withoutQueries)) return undefined;
  return withoutQueries.length > MAX_STRING_LENGTH
    ? withoutQueries.slice(0, MAX_STRING_LENGTH)
    : withoutQueries;
};

type Primitive = string | number | boolean;

const cleanPrimitive = (value: unknown): Primitive | undefined => {
  if (typeof value === 'string') return cleanString(value);
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
  }
  return undefined;
};

export const sanitizeEventProps = (props: EventProps): EventProps => {
  const clean: EventProps = {};
  for (const [key, value] of Object.entries(props)) {
    if (SENSITIVE_KEY.test(key)) continue;
    if (Array.isArray(value)) {
      const items = value
        .slice(0, MAX_ARRAY_ITEMS)
        .map(cleanPrimitive)
        .filter((item): item is Primitive => item !== undefined);
      if (items.length > 0) clean[key] = items;
      continue;
    }
    if (ID_KEY.test(key) && (typeof value === 'number' || typeof value === 'bigint')) {
      if (typeof value === 'number' && !Number.isFinite(value)) continue;
      clean[key] = String(value);
      continue;
    }
    const cleaned = cleanPrimitive(value);
    if (cleaned !== undefined) clean[key] = cleaned;
  }
  return clean;
};

// ---------------------------------------------------------------------------
// GA4 page context
// ---------------------------------------------------------------------------

/**
 * Query parameters GA4 reads for acquisition (source/medium/campaign and ad
 * click attribution). Everything else in a page URL — reset/auth tokens,
 * search terms, invite codes — is dropped before GA4 sees the URL.
 */
const ATTRIBUTION_PARAM = /^(utm_[a-z_]+|gclid|gbraid|wbraid|dclid)$/i;
const MAX_ATTRIBUTION_VALUE_LENGTH = 100;

/** Origin + path + only the allowlisted attribution params (no fragment). */
const attributionSafeUrl = (href: string): string | undefined => {
  try {
    const url = new URL(href);
    const kept = new URLSearchParams();
    url.searchParams.forEach((value, key) => {
      if (!ATTRIBUTION_PARAM.test(key)) return;
      const trimmed = value.trim();
      if (!trimmed || trimmed.length > MAX_ATTRIBUTION_VALUE_LENGTH) return;
      if (EMAIL_SHAPED.test(trimmed)) return;
      kept.append(key, trimmed);
    });
    const query = kept.toString();
    return url.origin + url.pathname + (query ? `?${query}` : '');
  } catch {
    return undefined;
  }
};

/** Origin + path only: enough for GA4 referral attribution, no query/fragment. */
const originAndPath = (href: string): string | undefined => {
  try {
    const url = new URL(href);
    return url.origin + url.pathname;
  } catch {
    return undefined;
  }
};

/**
 * Standard GA4 page context for every hit, built from the live location but
 * held to the same no-token rule as event properties: page_location keeps
 * only attribution params, page_path is the path alone, and page_referrer is
 * reduced to origin + path. Keys with no value are omitted.
 */
export const gaPageContext = (page: {
  href: string;
  referrer?: string;
  title?: string;
}): EventProps => {
  const context: EventProps = {};
  const location = attributionSafeUrl(page.href);
  if (location) {
    context.page_location = location;
    context.page_path = new URL(location).pathname;
  }
  const title = page.title ? cleanString(page.title) : undefined;
  if (title) context.page_title = title;
  const referrer = page.referrer ? originAndPath(page.referrer) : undefined;
  if (referrer) context.page_referrer = referrer;
  return context;
};

// ---------------------------------------------------------------------------
// SDK-collected URL properties (PostHog, Amplitude)
// ---------------------------------------------------------------------------

const RAW_URL_PART_KEY = /^(query|search|hash)$/i;
const REFERRER_KEY = /referr/i;
const MAX_SCRUB_DEPTH = 3;

/**
 * In-place scrub for property bags the vendor SDKs build themselves (page
 * URLs, referrers, web-vitals navigation URLs, Guides-Surveys page parts):
 * absolute URLs become origin + path (referrers: origin), raw query / search /
 * hash string fields are deleted. Recurses into plain objects up to depth 3.
 * Mutates and returns `target` because both SDK hooks expect that.
 */
export const scrubSdkUrlFields = <T extends Record<string, unknown>>(target: T, depth = 0): T => {
  const bag = target as Record<string, unknown>;
  for (const key of Object.keys(bag)) {
    const value = bag[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (depth < MAX_SCRUB_DEPTH) scrubSdkUrlFields(value as Record<string, unknown>, depth + 1);
      continue;
    }
    if (typeof value !== 'string') continue;
    if (RAW_URL_PART_KEY.test(key) && value) {
      delete bag[key];
      continue;
    }
    if (!/^https?:\/\//i.test(value)) continue;
    try {
      const url = new URL(value);
      bag[key] = REFERRER_KEY.test(key) ? url.origin : url.origin + url.pathname;
    } catch {
      delete bag[key];
    }
  }
  return target;
};

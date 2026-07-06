// First-touch acquisition capture (UTM + referrer) for GA4 attribution.
//
// GA4 derives source/medium/campaign natively from the page_location URL on
// page_view, but persisting first-touch UTMs lets us attach acquisition context
// to conversion events (login / sign_up / generate_lead) for custom analysis.
//
// Privacy: only UTM values, the referrer *hostname*, and the landing *pathname*
// are stored — never full referrer URLs, query strings, or any user identifiers.

const STORAGE_KEY = 'av_acquisition';

const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const;

type UtmKey = (typeof UTM_KEYS)[number];

export interface Acquisition {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer_domain?: string;
  landing_page?: string;
  first_seen?: string;
}

function readStored(): Acquisition | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Acquisition) : null;
  } catch {
    return null;
  }
}

/**
 * Capture first-touch acquisition exactly once. Never overwrites an existing
 * record (first-touch attribution). Best-effort: silently no-ops if storage is
 * unavailable (private mode / quota).
 */
export function captureAcquisition(): void {
  if (typeof window === 'undefined') return;
  try {
    if (readStored()) return; // first-touch already recorded

    const params = new URLSearchParams(window.location.search);
    const record: Acquisition = {};

    for (const key of UTM_KEYS) {
      const value = params.get(key);
      if (value) record[key as UtmKey] = value.slice(0, 100);
    }

    // Referrer domain only — no full URL / path (avoids leaking PII in referrers).
    const ref = document.referrer;
    if (ref) {
      try {
        const host = new URL(ref).hostname;
        if (host && host !== window.location.hostname) {
          record.referrer_domain = host;
        }
      } catch {
        // malformed referrer — ignore
      }
    }

    record.landing_page = window.location.pathname; // pathname only, no query
    record.first_seen = new Date().toISOString();

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // storage unavailable — acquisition is best-effort, never throws
  }
}

/**
 * Acquisition params to attach to conversion events: first-touch utm_* plus the
 * referrer domain. Returns {} when nothing was captured (direct traffic).
 */
export function getAcquisition(): Record<string, string> {
  const record = readStored();
  if (!record) return {};

  const out: Record<string, string> = {};
  for (const key of UTM_KEYS) {
    const value = record[key as UtmKey];
    if (value) out[key] = value;
  }
  if (record.referrer_domain) out.referrer_domain = record.referrer_domain;
  return out;
}

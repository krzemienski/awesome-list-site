// Server-side Mixpanel tracking for critical conversion events (Task #233).
//
// Why: ad blockers block api-js.mixpanel.com for a large share of technical
// audiences, so client-only tracking undercounts key conversions. The two
// conversion events that matter (sign_up_completed, resource_submitted) are
// emitted HERE, from the Express handlers that already confirm them, via
// Mixpanel's HTTP ingestion API — a first-party server→Mixpanel call that ad
// blockers can't see.
//
// Dedup strategy (per Mixpanel guidance): the client NO LONGER sends these two
// events itself (client/src/lib/analytics.ts trackSignUp/trackGenerateLead now
// only fire the GA4 halves). One producer per event = no dedup problem, and
// event names/props stay exactly as documented in docs/MIXPANEL.md.
//
// Consent: tracking is gated on the client explicitly signalling consent via
// the `x-analytics-consent: granted` request header (set from the same
// localStorage gate the browser SDKs use — see serverConversionHeaders() in
// client/src/lib/mixpanel.ts). No header → no tracking. This keeps the EU/CA
// consent posture identical to the client-side pipeline.
//
// Identity: the client passes its current Mixpanel distinct_id (anonymous
// $device: id pre-login, DB user id post-identify) via
// `x-mixpanel-distinct-id` so server events land on the same profile the
// browser SDK builds. When absent (SDK blocked/not yet loaded) we fall back
// to the immutable DB user id — the same id mpIdentify() uses — so events
// still attach to the right person once identity merge runs.
//
// Privacy: no PII in event properties (same rule as the client dispatcher).
// The project token is read server-side from env and never shipped anywhere.

import { randomUUID } from "crypto";
import type { Request } from "express";

const MIXPANEL_INGEST_URL = "https://api.mixpanel.com/track?verbose=1";

// Same project token the client uses. VITE_MIXPANEL_TOKEN is a shared env var
// (present in server process env too); MIXPANEL_TOKEN allows overriding with
// a server-only secret without touching the client build.
const getToken = (): string | undefined =>
  process.env.MIXPANEL_TOKEN || process.env.VITE_MIXPANEL_TOKEN;

// The consent signal the client attaches to conversion requests. Anything
// other than the exact literal "granted" means: do not track.
export const hasAnalyticsConsent = (req: Request): boolean =>
  req.get("x-analytics-consent") === "granted";

// Mixpanel distinct ids are opaque strings; cap length defensively so a
// malicious header can't stuff megabytes into the ingest payload.
const headerDistinctId = (req: Request): string | undefined => {
  const raw = req.get("x-mixpanel-distinct-id");
  if (typeof raw === "string" && raw.length > 0 && raw.length <= 255) return raw;
  return undefined;
};

// First-touch acquisition props forwarded by the client via the
// `x-mixpanel-acquisition` JSON header (see serverConversionHeaders() in
// client/src/lib/mixpanel.ts). Strictly validated: only the documented
// property names are accepted (docs/MIXPANEL.md — same names getAcquisition()
// produces), values must be short strings, and the whole header is size-capped
// so a malicious client can't stuff arbitrary data into the ingest payload.
const ACQUISITION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "referrer_domain",
] as const;

const headerAcquisition = (req: Request): Record<string, string> => {
  const out: Record<string, string> = {};
  try {
    const raw = req.get("x-mixpanel-acquisition");
    if (typeof raw !== "string" || raw.length === 0 || raw.length > 1024) return out;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return out;
    for (const key of ACQUISITION_KEYS) {
      const value = (parsed as Record<string, unknown>)[key];
      if (typeof value === "string" && value.length > 0) {
        out[key] = value.slice(0, 100);
      }
    }
  } catch {
    // malformed header — ignore, acquisition is best-effort
  }
  return out;
};

/**
 * Fire-and-forget server-side Mixpanel event. Never throws, never blocks the
 * response — analytics must not affect request handling.
 *
 * @param req              incoming request (consent + distinct-id headers)
 * @param event            event name per docs/MIXPANEL.md (snake_case)
 * @param fallbackDistinctId immutable DB user id to use when the client
 *                           didn't/couldn't send its Mixpanel distinct id
 * @param props            event properties — NO PII
 */
export function trackServerEvent(
  req: Request,
  event: string,
  fallbackDistinctId: string | null | undefined,
  props: Record<string, unknown> = {},
): void {
  if (!hasAnalyticsConsent(req)) return; // consent gate — hard stop
  const distinctId = headerDistinctId(req) ?? fallbackDistinctId;
  // First-touch acquisition forwarded from the client (validated above).
  // Spread before caller props so explicit props always win.
  trackConsentedServerEvent(event, distinctId, { ...headerAcquisition(req), ...props });
}

/**
 * Same fire-and-forget ingest, but for callers that have ALREADY verified
 * analytics consent through a non-header channel. The Replit OIDC flow is the
 * one such caller: browser redirects carry no custom headers, so consent (and
 * the client's Mixpanel distinct_id) travel via a one-shot session flag set on
 * a Clerk-era caller with its own consent channel. Never call this without a verified
 * consent signal — the header gate in trackServerEvent() is bypassed here by
 * design, not by accident.
 */
export function trackConsentedServerEvent(
  event: string,
  distinctId: string | null | undefined,
  props: Record<string, unknown> = {},
): void {
  try {
    const token = getToken();
    if (!token) return; // Mixpanel not configured in this environment
    if (!distinctId) return; // nothing sensible to attribute the event to

    const properties: Record<string, unknown> = {
      token,
      distinct_id: String(distinctId),
      time: Math.floor(Date.now() / 1000), // /track expects Unix SECONDS (the browser SDK also divides ms by 1000)
      // Unique per emission; also the documented dedup key should Mixpanel
      // ever receive a retried duplicate of this same server call.
      $insert_id: randomUUID(),
      platform: "web",
      // Distinguish pipeline in analysis without renaming the event.
      tracked_from: "server",
      ...props,
    };
    Object.keys(properties).forEach((k) => {
      if (properties[k] === undefined || properties[k] === null) delete properties[k];
    });

    // Fire and forget: log ingestion failures (verbose=1 returns
    // {"error": ..., "status": 0|1}) but never propagate them.
    fetch(MIXPANEL_INGEST_URL, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "text/plain" },
      body: JSON.stringify([{ event, properties }]),
    })
      .then(async (r) => {
        const text = await r.text().catch(() => "");
        let ok = r.ok;
        try {
          ok = ok && JSON.parse(text)?.status === 1;
        } catch {
          ok = false;
        }
        if (!ok) {
          console.error(`[mixpanel-server] ingest rejected for "${event}": ${r.status} ${text.slice(0, 300)}`);
        }
      })
      .catch((e) => {
        console.error(`[mixpanel-server] ingest failed for "${event}":`, e?.message ?? e);
      });
  } catch (e) {
    // Analytics must never break a request path.
    console.error("[mixpanel-server] unexpected error:", e);
  }
}

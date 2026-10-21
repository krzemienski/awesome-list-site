// Shared custom-event fan-out (tracking plan: docs/ANALYTICS.md → "Tracking
// plan"). Every custom event the app emits arrives here exactly once via the
// module-private `track()` in analytics.ts, gets its properties cleaned ONCE
// (analytics-hygiene.ts), and is handed to each vendor's own dispatcher:
//
//   GA4        sendGaEvent  (analytics.ts)  — legacy GA name/params when the
//                                             event predates the catalog
//   Mixpanel   mpTrack      (mixpanel.ts)
//   PostHog    phCapture    (posthog.ts)
//   Amplitude  ampTrack     (amplitude.ts)
//   Replit     replitTrack  (replit-analytics.ts) — platform-injected Umami
//                                             tracker; page views are its own
//
// Each vendor dispatcher keeps its own consent gate, pre-SDK buffer and revoke
// kill switch, so this module adds no new queueing semantics — it only
// decides WHICH vendors get the event and guarantees they all receive the same
// cleaned properties. It is loaded with a dynamic import after consent, so
// neither the hygiene rules nor the fan-out ship in the pre-consent entry
// bundle (the vendor wrappers it calls are already there; their SDKs are not).
import { getAnalyticsConsent, sendGaEvent } from './analytics';
import { gaPageContext, sanitizeEventProps } from './analytics-hygiene';
import { mpTrack } from './mixpanel';
import { phCapture } from './posthog';
import { ampTrack } from './amplitude';
import { replitTrack } from './replit-analytics';

type EventProps = Record<string, unknown>;

export interface AnalyticsDispatchRequest {
  /** Catalog (product-analytics) name: Mixpanel, PostHog and Amplitude. */
  name: string;
  props: EventProps;
  /** GA4 half, or null when the event is not sent to GA4. */
  ga: { name: string; params: EventProps } | null;
  /** False for legacy GA4-only events (page_view, performance, ...). */
  product: boolean;
}

const EVENT_NAME = /^[a-z][a-z0-9_]*$/;

// Last sanitized page_location handed to GA4 (SPA referrer fallback below).
let lastGaLocation: string | null = null;

const safely = (send: () => void) => {
  try {
    send();
  } catch {
    // One vendor failing must never stop the others or break the app.
  }
};

export const dispatchAnalyticsEvent = (request: AnalyticsDispatchRequest) => {
  // Re-checked here as well as in track(): events queued while this chunk
  // was loading must not go out if consent was revoked in the meantime.
  if (getAnalyticsConsent() !== 'granted') return;
  if (import.meta.env.DEV && !EVENT_NAME.test(request.name)) {
    console.warn(`[analytics] event "${request.name}" is not snake_case — see docs/ANALYTICS.md`);
  }

  const props = sanitizeEventProps(request.props);
  if (request.ga) {
    const gaParams =
      request.ga.params === request.props ? props : sanitizeEventProps(request.ga.params);
    const gaName = request.ga.name;
    const context = gaPageContext({
      href: window.location.href,
      referrer: document.referrer,
      title: document.title,
    });
    // With no document.referrer, gtag fills dr on SPA navigations from the RAW
    // previous URL (query included). Supply the previous sanitized location
    // instead so that fallback never runs.
    if (context.page_referrer === undefined && lastGaLocation && context.page_location !== lastGaLocation) {
      context.page_referrer = lastGaLocation;
    }
    if (typeof context.page_location === 'string') lastGaLocation = context.page_location;
    safely(() => sendGaEvent(gaName, gaParams, context));
  }
  if (request.product) {
    safely(() => mpTrack(request.name, props));
    safely(() => phCapture(request.name, props));
    safely(() => ampTrack(request.name, props));
    safely(() => replitTrack(request.name, props));
  }
};

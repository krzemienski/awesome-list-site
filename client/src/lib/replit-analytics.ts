// Replit Analytics half of the shared dispatcher (analytics-dispatch.ts is its
// only caller). The platform injects the Umami tracker
// (https://i.replit.com/script.js, async) into the published site's HTML and
// records page views by itself; this module only forwards the catalog's
// custom events to `window.umami.track()`.
//
// - Consent: the tracker is cookie-free and carries no identifiers, so events
//   flow while the visitor has not answered the banner. An explicit Decline
//   stops them: queued events are re-checked at flush and dropped on Decline.
// - Free-form text typed by visitors (search terms) is never sent here.
// - Shape: Umami takes flat string/number/boolean values. Props arrive already
//   cleaned by analytics-hygiene; arrays become comma-separated strings (as
//   GA4 receives them) and anything else non-primitive is dropped.
// - No tracker (dev, analytics disabled in Publishing settings, blocked
//   script) is a silent no-op. While the injected script is still loading,
//   events wait in a small bounded queue and flush on its load event.

type UmamiData = Record<string, string | number | boolean>;

declare global {
  interface Window {
    umami?: { track(name: string, data?: UmamiData): void };
  }
}

const MAX_EVENT_NAME_LENGTH = 50;
const MAX_STRING_LENGTH = 200;
const MAX_QUEUED_EVENTS = 50;
const TRACKER_SELECTOR = 'script[src^="https://i.replit.com/script.js"]';

// Umami records page views itself; a custom page_viewed would double them.
const PLATFORM_TRACKED = new Set(['page_viewed']);
const FREE_FORM_KEYS = new Set(['search_term']);

interface QueuedEvent {
  name: string;
  data: UmamiData;
}

const queue: QueuedEvent[] = [];
let waitingForTracker = false;

const isDeclined = () => {
  try {
    return localStorage.getItem('analytics-consent') === 'denied';
  } catch {
    return false;
  }
};

const toUmamiData = (props: Record<string, unknown>): UmamiData => {
  const data: UmamiData = {};
  for (const [key, value] of Object.entries(props)) {
    if (FREE_FORM_KEYS.has(key)) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      data[key] = value;
    } else if (Array.isArray(value)) {
      const joined = value
        .filter((item) => ['string', 'number', 'boolean'].includes(typeof item))
        .join(',');
      if (joined) data[key] = joined.slice(0, MAX_STRING_LENGTH);
    }
  }
  return data;
};

const send = (name: string, data: UmamiData) => {
  try {
    window.umami?.track(name, data);
  } catch {
    // Analytics must never break the app or the other tools.
  }
};

const flush = () => {
  waitingForTracker = false;
  const pending = queue.splice(0);
  if (isDeclined() || !window.umami) return;
  for (const event of pending) send(event.name, event.data);
};

if (typeof window !== 'undefined') {
  window.addEventListener('analytics-consent-changed', () => {
    if (isDeclined()) queue.length = 0;
  });
}

export const replitTrack = (name: string, props: Record<string, unknown>) => {
  if (typeof window === 'undefined') return;
  if (PLATFORM_TRACKED.has(name)) return;
  if (name.length > MAX_EVENT_NAME_LENGTH) {
    if (import.meta.env.DEV) {
      console.warn(`[analytics] "${name}" exceeds Replit Analytics' ${MAX_EVENT_NAME_LENGTH}-character limit`);
    }
    return;
  }
  const data = toUmamiData(props);
  if (window.umami) {
    send(name, data);
    return;
  }
  const tracker = document.querySelector<HTMLScriptElement>(TRACKER_SELECTOR);
  if (!tracker) return;
  if (queue.length < MAX_QUEUED_EVENTS) queue.push({ name, data });
  if (!waitingForTracker) {
    waitingForTracker = true;
    tracker.addEventListener('load', flush, { once: true });
    tracker.addEventListener('error', () => { waitingForTracker = false; queue.length = 0; }, { once: true });
  }
};

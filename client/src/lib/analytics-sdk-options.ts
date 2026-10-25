// Vendor SDK configuration that only matters after consent. Loaded with a
// dynamic import next to each SDK chunk (posthog.ts, amplitude.ts), so none of
// it ships in the pre-consent initial bundle. The wrappers keep all consent,
// queueing and teardown state; this module is stateless.
import type { Config as MixpanelConfig } from 'mixpanel-browser';
import type { PostHogConfig } from 'posthog-js';
import { scrubSdkUrlFields } from './analytics-hygiene';
import { isAnalyticsSuppressed } from './analytics-suppression';

export interface IdentityUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  createdAt?: string | Date | null;
}

/** Mixpanel people properties, set deliberately on identify (profile data). */
export const mixpanelPeopleProps = (
  user: IdentityUser,
  acquisition: Record<string, string>,
): Record<string, unknown> => {
  const people: Record<string, unknown> = { role: user.role ?? 'user', ...acquisition };
  if (user.name) people.$name = user.name;
  if (user.email) people.$email = user.email;
  if (user.createdAt) people.$created = new Date(user.createdAt).toISOString();
  return people;
};

/**
 * PostHog person properties. Deliberately NO name/email: PostHog also records
 * session replays, so it stays PII-minimal — the immutable DB id is enough to
 * join against other systems when needed.
 */
export const posthogPersonProps = (
  user: IdentityUser,
  acquisition: Record<string, string>,
): Record<string, unknown> => {
  const person: Record<string, unknown> = { role: user.role ?? 'user', ...acquisition };
  if (user.createdAt) person.created_at = new Date(user.createdAt).toISOString();
  return person;
};

/** mixpanel.init() options (everything except the project token). */
export const mixpanelInitOptions: Partial<MixpanelConfig> = {
  // EU/CA compliance: nothing is tracked unless explicitly opted in afterwards.
  opt_out_tracking_by_default: true,
  // Default api host (api-js.mixpanel.com) is allowlisted in the server CSP
  // connect-src (server/index.ts).
  debug: import.meta.env.DEV,
  // Page views are fired manually from use-analytics (single source shared
  // with GA4) so SPA route changes are counted exactly once.
  track_pageview: false,
  persistence: 'localStorage',
  // The SDK persists the first full referrer URL (query included) as a super
  // property; $initial_referring_domain already carries the host.
  property_blacklist: ['$initial_referrer'],
};

/** posthog.init() options (everything except the project key). */
export const posthogInitOptions = (apiHost: string): Partial<PostHogConfig> => ({
  api_host: apiHost,
  // Modern defaults (2025-05-24): history-change pageviews for SPAs,
  // pageleave, sane autocapture config.
  defaults: '2025-05-24',
  // EU/CA compliance: nothing captured unless explicitly opted in afterwards.
  opt_out_capturing_by_default: true,
  persistence: 'localStorage+cookie',
  // Audit 2 BUG-039: the ph_* cookie half of the persistence defaults to
  // secure:false. Secure whenever the page is https (prod + replit.dev
  // preview); plain-http localhost dev keeps an unflagged cookie so
  // persistence still works there. SameSite already defaults to Lax.
  secure_cookie: window.location.protocol === 'https:',
  // Full feature set:
  autocapture: true,
  capture_pageview: 'history_change',
  capture_pageleave: true,
  capture_exceptions: true, // Error tracking
  capture_performance: true, // Web vitals / network timing
  enable_heatmaps: true,
  disable_session_recording: false, // Session replay ON post-consent
  session_recording: {
    // Privacy: never record what people type OR read. Replays show layout +
    // interactions with all text redacted — loosen deliberately (per-selector)
    // if readable replays are ever needed.
    maskAllInputs: true,
    maskTextSelector: '*',
  },
  // Privacy: automatic events ($pageview, web vitals, ...) carry full URLs,
  // also nested (web-vitals navigationURL / $current_url); query strings can
  // hold sensitive tokens (e.g. /reset-password?token=...). URLs are reduced to
  // origin + path, referrers to their origin. $snapshot (replay) bodies are
  // skipped — they are large and their inputs are already masked.
  sanitize_properties: (props: Record<string, unknown>, eventName: string) =>
    eventName === '$snapshot' ? props : scrubSdkUrlFields(props),
  // A running SDK drops its own events ($pageview, autocapture, ...) on a
  // QA path or once an admin session starts (analytics-suppression.ts).
  before_send: (event) => (isAnalyticsSuppressed() ? null : event),
  debug: import.meta.env.DEV,
});

/** amplitude.init() options (everything except the API key). */
export const amplitudeInitOptions = () => ({
  autocapture: true,
  // Audit 2 BUG-039: AMP_* / AMP_MKTG_* cookies previously shipped with
  // secure:false on an HTTPS-only site. SameSite is pinned to the Lax the SDK
  // already defaults to; Secure is set whenever the page is https (prod +
  // replit.dev preview) — plain-http localhost keeps unflagged cookies so dev
  // persistence still works. HttpOnly is impossible by construction: these
  // cookies are written and read by JavaScript (document.cookie), which is
  // also why the audit's HttpOnly ask applies only to the platform's GAESA
  // cookie.
  cookieOptions: {
    sameSite: 'Lax' as const,
    secure: window.location.protocol === 'https:',
  },
});

interface AmplitudeEnrichmentEvent {
  event_properties?: unknown;
  user_properties?: unknown;
}

/**
 * Amplitude enrichment plugin. Autocapture adds full URLs ("[Amplitude] Page
 * Location", Guides-Surveys page query/hash, referrers) to event and user
 * properties; query strings can carry reset/auth tokens. Register it AFTER
 * init so it runs after the SDK's own enrichment plugins (enrichment runs in
 * add() order).
 */
export const amplitudeUrlScrubPlugin = {
  name: 'awesome-video-url-scrub',
  type: 'enrichment' as const,
  // Also drops every event (autocapture page views included) on a QA path or
  // in an admin session, like PostHog's before_send.
  execute: <T extends AmplitudeEnrichmentEvent>(event: T): Promise<T | null> => {
    if (isAnalyticsSuppressed()) return Promise.resolve(null);
    for (const field of [event.event_properties, event.user_properties]) {
      if (field && typeof field === 'object') scrubSdkUrlFields(field as Record<string, unknown>);
    }
    return Promise.resolve(event);
  },
};

const mergeAbortSignals = (first: AbortSignal | undefined, second: AbortSignal): AbortSignal => {
  if (!first) return second;
  if (typeof AbortSignal.any === 'function') return AbortSignal.any([first, second]);
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (first.aborted || second.aborted) abort();
  else {
    first.addEventListener('abort', abort, { once: true });
    second.addEventListener('abort', abort, { once: true });
  }
  return controller.signal;
};

interface GuardedRequest {
  url: string;
  method?: string;
  headers?: HeadersInit;
  body?: unknown;
  signal?: AbortSignal;
  keepalive?: boolean;
}

/**
 * fetch() for Amplitude plugin transports (session replay, Guides & Surveys):
 * rejects with an AbortError once consent is revoked (`isBlocked()`), and ties
 * every request to the plugin's teardown `controller` so revoke cancels
 * in-flight uploads.
 */
const consentGuardedFetch =
  (isBlocked: () => boolean, controller: AbortController) =>
  (request: GuardedRequest): Promise<Response> => {
    if (isBlocked()) {
      return Promise.reject(new DOMException('Analytics consent revoked', 'AbortError'));
    }
    return fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body as BodyInit | undefined,
      signal: mergeAbortSignals(request.signal, controller.signal),
      keepalive: request.keepalive,
    });
  };

export interface ManagedPlugin {
  name?: string;
  teardown?: () => Promise<void>;
}

interface ProductSlot {
  added: boolean;
  instance: ManagedPlugin | null;
  controller: AbortController | null;
}

/** Plugin slots owned by amplitude.ts (its teardown clears them on revoke). */
export interface AmplitudeProductSlots {
  replay: ProductSlot;
  experiment: ProductSlot;
  engagement: ProductSlot;
}

/**
 * Adds Session Replay, Experiment and Guides & Surveys in Unified's initAll
 * order. Each stage imports its own SDK chunk and re-checks `revoked()` after
 * every await, so a revoke mid-setup never adds a recorder/plugin afterward.
 * Returns false as soon as consent was revoked (the caller stops there).
 */
export const addAmplitudeProducts = async (
  amplitude: typeof import('@amplitude/analytics-browser'),
  slots: AmplitudeProductSlots,
  isBlocked: () => boolean,
  revoked: () => Promise<boolean>,
): Promise<boolean> => {
  if (!slots.replay.added) {
    const { sessionReplayPlugin } = await import('@amplitude/plugin-session-replay-browser');
    if (await revoked()) return false;
    const controller = new AbortController();
    slots.replay.controller = controller;
    const guardedFetch = consentGuardedFetch(isBlocked, controller);
    const plugin = sessionReplayPlugin({
      sampleRate: 1,
      handleSendEvents: (request) => guardedFetch({ ...request, signal: undefined }),
      handleFetchConfig: (request) =>
        guardedFetch({ url: request.url, method: request.method, headers: request.headers, signal: request.signal }),
    });
    slots.replay.instance = plugin;
    await amplitude.add(plugin).promise;
    // Teardown may have cleared the slot while setup was in flight. Restore it
    // so the post-await revoke check can remove this exact plugin.
    slots.replay.instance = plugin;
    slots.replay.added = true;
  }
  if (await revoked()) return false;

  if (!slots.experiment.added) {
    const { experimentPlugin } = await import('@amplitude/plugin-experiment-browser');
    if (await revoked()) return false;
    const plugin = experimentPlugin();
    slots.experiment.instance = plugin;
    await amplitude.add(plugin).promise;
    slots.experiment.instance = plugin;
    slots.experiment.added = true;
  }
  if (await revoked()) return false;

  if (!slots.engagement.added) {
    const { plugin: engagementPlugin } = await import('@amplitude/engagement-browser');
    if (await revoked()) return false;
    const controller = new AbortController();
    slots.engagement.controller = controller;
    const plugin = engagementPlugin({
      // Keep the SDK in the consent-controlled local chunk instead of starting
      // uncancellable remote split-script downloads.
      options: { splitting: false },
      transport: { handleHttpRequest: consentGuardedFetch(isBlocked, controller) },
    });
    slots.engagement.instance = plugin;
    await amplitude.add(plugin).promise;
    slots.engagement.instance = plugin;
    slots.engagement.added = true;
  }
  return !(await revoked());
};

/**
 * Revoke teardown: removes each added product plugin through the host client,
 * falling back to the plugin's own teardown if the removal raced its setup.
 */
export const removeAmplitudePlugins = (
  client: typeof import('@amplitude/analytics-browser') | null,
  plugins: (ManagedPlugin | null)[],
): Promise<void[]> =>
  Promise.all(
    plugins.map(async (plugin) => {
      if (!plugin) return;
      if (plugin.name && client) {
        try {
          await client.remove(plugin.name).promise;
          return;
        } catch {
          // Fall through to direct teardown if the host removal raced setup.
        }
      }
      await plugin.teardown?.().catch(() => undefined);
    }),
  );

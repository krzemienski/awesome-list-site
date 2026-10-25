// Google Analytics 4 (gtag.js) integration.
//
// Design:
//  - initGA loads gtag with `send_page_view:false` so page_view is fired
//    exactly once per navigation from a single source (use-analytics), and adds
//    `debug_mode` in DEV so events surface in GA4 DebugView.
//  - Every custom event goes through the module-private `track()`, which
//    lazily loads the shared dispatcher (analytics-dispatch.ts). The
//    dispatcher cleans properties once (analytics-hygiene.ts) and fans the
//    event out to GA4, Mixpanel, PostHog and Amplitude after consent, and to
//    Replit Analytics unless the visitor declined. GA4's half lands in
//    `sendGaEvent` together with sanitized GA4 page context (page_location
//    keeps only attribution params; path-only page_path; origin+path referrer).
//  - Tracking plan + shared event catalog: docs/ANALYTICS.md. New events are
//    added there AND as a typed helper below that calls `track()`.
//  - Legacy custom event NAMES are preserved (dashboard continuity); GA4
//    recommended events (login/sign_up/select_content/generate_lead/search/
//    share) are ADDED with dedicated recommended parameters.
//  - No PII is ever sent (no email/password/token/raw copied text).

import { captureAcquisition, getAcquisition } from './acquisition';
import type { AnalyticsDispatchRequest } from './analytics-dispatch';
import { isAnalyticsSuppressed } from './analytics-suppression';

// Define the gtag function globally
declare global {
  interface Window {
    dataLayer: Array<unknown>;
    gtag: (...args: unknown[]) => void;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

const getMeasurementId = (): string | undefined =>
  import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

// F206: the consent banner must only name vendors this build can load — each
// init no-ops without its key, so an unconfigured vendor is never contacted.
export const ANALYTICS_VENDORS = [
  { name: 'Google Analytics', configured: Boolean(import.meta.env.VITE_GA_MEASUREMENT_ID) },
  { name: 'Mixpanel', configured: Boolean(import.meta.env.VITE_MIXPANEL_TOKEN) },
  { name: 'PostHog', configured: Boolean(import.meta.env.VITE_POSTHOG_KEY) },
  { name: 'Amplitude', configured: Boolean(import.meta.env.VITE_AMPLITUDE_API_KEY) },
  // Replit Analytics is not listed: the platform injects its cookie-free
  // tracker into every published page, so it is not something the banner can
  // switch on. Only an explicit Decline stops the app's custom events to it.
].filter((vendor) => vendor.configured).map((vendor) => vendor.name);

// BUG-020 (run13): analytics is consent-gated. The choice lives in
// localStorage; initGA() hard-returns until the visitor explicitly accepts,
// so gtag.js is never even downloaded pre-consent. Every tracking helper
// already no-ops while window.gtag is undefined.
const CONSENT_KEY = 'analytics-consent';
export type AnalyticsConsent = 'granted' | 'denied' | null;

export const getAnalyticsConsent = (): AnalyticsConsent => {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
};

/**
 * Gate for starting a vendor SDK (GA4, Mixpanel, PostHog, Amplitude): a
 * grant, and not an admin session or QA path. SDKs that never start cannot
 * send their own page views, autocapture or identity calls.
 */
export const vendorSdksAllowed = (): boolean =>
  getAnalyticsConsent() === 'granted' && !isAnalyticsSuppressed();

export const setAnalyticsConsent = (value: 'granted' | 'denied') => {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Storage unavailable (private mode) — treat as session-only choice.
  }
  if (typeof window !== 'undefined') {
    // Keep a tiny, non-identifying mirror for the server-rendered Home shell.
    // localStorage remains the canonical client preference; the cookie only
    // lets the next document paint the same consent state before hydration.
    document.cookie = `${CONSENT_KEY}=${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
    window.dispatchEvent(new Event('analytics-consent-changed'));
  }
};

const domainOf = (url: string): string | undefined => {
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
};

// Initialize Google Analytics. Idempotent so it can be called at module load
// (client entry, before React renders) AND from a mount effect without
// double-loading gtag or re-configuring. Initializing before render is what
// guarantees `window.gtag` exists in time for the very first page_view — React
// runs child effects (Router/useAnalytics) before parent effects (App), so a
// mount-only init would drop the initial page_view.
let gaInitialized = false;

const pendingEvents: Array<{
  name: string;
  params: Record<string, unknown>;
  context: Record<string, unknown>;
}> = [];
export const initGA = () => {
  if (!vendorSdksAllowed()) return;

  const measurementId = getMeasurementId();

  if (!measurementId) {
    console.warn('Missing required Google Analytics key: VITE_GA_MEASUREMENT_ID');
    return;
  }

  // Re-grant after an in-session revoke: gtag is already configured, so
  // restore both Google's kill switch and Consent Mode without reloading it.
  window[`ga-disable-${measurementId}`] = false;
  if (gaInitialized) {
    window.gtag?.('consent', 'update', { analytics_storage: 'granted' });
    return;
  }

  gaInitialized = true;

  // Capture first-touch acquisition (UTM + referrer) before any event fires.
  captureAcquisition();

  // Add Google Analytics script to the head
  const script1 = document.createElement('script');
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script1);

  // Initialize gtag. send_page_view:false — the initial page_view and every
  // route-change page_view are fired manually from use-analytics (single
  // source). debug_mode:true (DEV only) routes events to GA4 DebugView.
  //
  // July 2026 audit BUG-004: this used to inject an INLINE <script> for the
  // dataLayer/gtag bootstrap. Dynamically-injected inline scripts carry no CSP
  // nonce, so production's nonce-based script-src blocked it — window.gtag was
  // never defined and ALL analytics silently died in prod. Running the same
  // bootstrap as module code (covered by script-src 'self') needs no inline
  // script at all. NOTE: gtag MUST push the `arguments` object (not an array),
  // so this stays a regular function, never an arrow function.
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('consent', 'default', { analytics_storage: 'granted' });
  const configParams: Record<string, unknown> = { send_page_view: false };
  if (import.meta.env.DEV) configParams.debug_mode = true;
  // Audit 2 BUG-039: _ga* cookies default to secure:false. gtag exposes
  // cookie flags as a raw attribute string; SameSite=Lax matches the default
  // browsers already apply, Secure is added only on https pages (prod +
  // replit.dev preview) so plain-http localhost dev keeps working cookies.
  if (window.location.protocol === 'https:') {
    configParams.cookie_flags = 'SameSite=Lax;Secure';
  }
  window.gtag('config', measurementId, configParams);
  const queued = pendingEvents.splice(0);
  for (const event of queued) sendGaEvent(event.name, event.params, event.context);
};

/** Stop GA immediately after an in-session consent revoke. */
export const optOutGA = () => {
  pendingEvents.length = 0;
  // Events waiting for the dispatcher chunk were accepted under the old grant;
  // drop them too (the dispatcher also re-checks consent before sending).
  queuedDispatches.length = 0;
  const measurementId = getMeasurementId();
  if (measurementId) window[`ga-disable-${measurementId}`] = true;
  window.gtag?.('consent', 'update', { analytics_storage: 'denied' });
  clearGACookies();
};

// Withdrawing consent also withdraws the stored client id. GA writes _ga and
// _ga_<id> on the highest settable parent domain, so expire each name on the
// host and on every parent (the browser ignores a public-suffix domain).
const clearGACookies = () => {
  if (typeof document === 'undefined') return;
  const names = document.cookie
    .split(';')
    .map((part) => part.split('=')[0].trim())
    .filter((name) => name === '_ga' || name.startsWith('_ga_'));
  if (names.length === 0) return;
  const labels = window.location.hostname.split('.');
  const domains = [''];
  for (let i = 0; i < labels.length - 1; i += 1) domains.push(`; Domain=.${labels.slice(i).join('.')}`);
  for (const name of names) {
    for (const domain of domains) document.cookie = `${name}=; Path=/; Max-Age=0${domain}`;
  }
};
/**
 * GA4 half of the shared dispatcher (analytics-dispatch.ts is its only
 * caller). `params` arrive already cleaned by analytics-hygiene, and
 * `context` is the sanitized page context from `gaPageContext` (page_location
 * with only utm_* and click-id params, path-only page_path, origin+path
 * referrer), captured when the event was dispatched. The context is also
 * pinned with gtag('set') so hits gtag sends on its own (enhanced measurement)
 * reuse it instead of the raw document URL and referrer. When there is no
 * document.referrer the dispatcher supplies the previous sanitized location as
 * page_referrer, so gtag never falls back to the raw previous SPA URL.
 */
export const sendGaEvent = (
  name: string,
  params: Record<string, unknown> = {},
  context: Record<string, unknown> = {},
) => {
  if (typeof window === 'undefined') return;
  if (getAnalyticsConsent() !== 'granted') return;
  if (!window.gtag) {
    // With a persisted grant, React can emit its initial page_view before the
    // deferred post-paint SDK bootstrap. Preserve those events without ever
    // queueing anything before consent.
    pendingEvents.push({ name, params, context });
    return;
  }

  const pinned: Record<string, unknown> = {};
  for (const key of ['page_location', 'page_referrer', 'page_title'] as const) {
    if (context[key] !== undefined) pinned[key] = context[key];
  }
  if (Object.keys(pinned).length > 0) window.gtag('set', pinned);

  const merged: Record<string, unknown> = { ...context, ...params };
  Object.keys(merged).forEach((key) => {
    if (merged[key] === undefined || merged[key] === null) delete merged[key];
  });

  window.gtag('event', name, merged);
};
export const trackPageView = (_url?: string) => {
  track(
    'page_viewed',
    {
      page_title: typeof document !== 'undefined' ? document.title : undefined,
      referrer_origin: referrerOrigin(),
    },
    // Replit Analytics records page views itself.
    { ga: { name: 'page_view', params: {} }, replit: false },
  );
};

// Track engagement duration for a page (fired on route change + tab hide).
export const trackPageEngagement = (pagePath: string, engagementMs: number) => {
  const engagement_time_msec = Math.round(engagementMs);
  if (!Number.isFinite(engagement_time_msec) || engagement_time_msec <= 0) return;
  track('page_engaged', { page_path: pagePath, engagement_time_msec }, { product: false });
};

// Generic event (legacy UA-style params retained for dashboard continuity, now
// enriched with GA4 context).
export const trackEvent = (
  action: string,
  category?: string,
  label?: string,
  value?: number
) => {
  const params: Record<string, unknown> = {};
  if (category !== undefined) params.event_category = category;
  if (label !== undefined) params.event_label = label;
  if (value !== undefined) params.value = value;
  track(action, params, { product: false });
};

// ---------------------------------------------------------------------------
// GA4 recommended events (ADDED for conversion / facilitation flows)
// ---------------------------------------------------------------------------

// User signed in (method e.g. "password"). Carries first-touch acquisition.
export const trackLogin = (method: string) => {
  track(
    'logged_in',
    { login_method: method, ...getAcquisition() },
    { ga: { name: 'login', params: { method, ...getAcquisition() } } },
  );
};

// User created an account. Carries first-touch acquisition.
export const trackSignUp = (method: string) => {
  // Mixpanel's sign_up_completed is emitted SERVER-side from Clerk JIT
  // provisioning so ad blockers can't undercount it — `product` stays off or
  // that conversion double-counts. Replit Analytics has no server feed, so it
  // gets the same catalog name from here (GA4 keeps its `sign_up` name).
  track(
    'sign_up_completed',
    { signup_method: method, ...getAcquisition() },
    { ga: { name: 'sign_up', params: { method, ...getAcquisition() } }, product: false, replit: true },
  );
};

// User selected/opened a piece of content (e.g. viewed a resource detail).
export const trackSelectContent = (
  contentType: string,
  contentId: string | number,
  extra: Record<string, unknown> = {}
) => {
  const gaParams = {
    content_type: contentType,
    content_id: String(contentId),
    ...extra,
  };
  if (contentType === 'resource') {
    track(
      'resource_viewed',
      { resource_id: String(contentId), ...extra },
      { ga: { name: 'select_content', params: gaParams } },
    );
  } else {
    track('select_content', gaParams, { product: false });
  }
};

// User completed a lead-generating form (e.g. submitted a resource).
export const trackGenerateLead = (params: Record<string, unknown> = {}) => {
  // Mixpanel's resource_submitted is emitted SERVER-side from the submit
  // handler — `product` stays off or that conversion double-counts. Replit
  // Analytics has no server feed, so it gets the same catalog name from here
  // (GA4 keeps its `generate_lead` name).
  const props = { ...params, ...getAcquisition() };
  track('resource_submitted', props, {
    ga: { name: 'generate_lead', params: props },
    product: false,
    replit: true,
  });
};

// A visitor landed on a "page not found" surface. Replit Analytics gets the
// path only (a query string can carry typed search text or tokens), capped in
// length; GA4 keeps its legacy UA-style params (path + query, after consent).
export const trackPageNotFound = (pathname: string, search = '') => {
  const path = pathname.split(/[?#]/, 1)[0].slice(0, 200) || '/';
  track(
    'page_not_found',
    { page_path: path },
    {
      ga: { name: 'page_not_found', params: { event_category: 'navigation', event_label: pathname + search } },
      product: false,
      replit: true,
    },
  );
};

export type AuthPromptContext =
  | 'guest_save_toast' // shown right after a guest saves a resource
  | 'guest_save_cap' // guest hit the on-device save cap
  | 'bookmarks_page'; // guest viewing their device library
export const trackShare = (
  method: string,
  contentType: string,
  contentId: string | number
) => {
  track(
    'content_shared',
    {
      share_method: method,
      content_type: contentType,
      content_id: String(contentId),
    },
    {
      ga: {
        name: 'share',
        params: { method, content_type: contentType, content_id: String(contentId) },
      },
    },
  );
};

// ---------------------------------------------------------------------------
// Learning-journey funnel (Task #330): journey_start → journey_step_complete
// → journey_complete. Every event carries journey id + title; step events add
// the logical step position so the funnel can segment by depth. GA4 names use
// the funnel verbs from the task spec; the catalog names keep the established
// snake_case object_action convention (journey_step_completed predates this
// task — its name is preserved for dashboard continuity).
// ---------------------------------------------------------------------------

type JourneyEventInfo = {
  journeyId: string | number;
  journeyTitle: string;
  totalSteps?: number;
};

// Fired ONLY on genuinely new enrollment (listing one-click start + detail
// start button). Resume paths (Continue CTA, useResumeJourney) re-POST the
// idempotent start endpoint to bump lastAccessedAt but must NOT re-fire this.
export const trackJourneyStart = ({ journeyId, journeyTitle, totalSteps }: JourneyEventInfo) => {
  track(
    'journey_started',
    { journey_id: String(journeyId), journey_title: journeyTitle, total_steps: totalSteps },
    { ga: { name: 'journey_start' } },
  );
};

// One event per LOGICAL step (a logical step spans up to 3 DB rows; the caller
// completes all row ids together — step_row_count records how many).
export const trackJourneyStepComplete = ({
  journeyId,
  journeyTitle,
  totalSteps,
  stepNumber,
  stepPosition,
  stepRowCount,
}: JourneyEventInfo & {
  stepNumber: number;
  stepPosition?: number;
  stepRowCount?: number;
}) => {
  const funnel = {
    journey_id: String(journeyId),
    journey_title: journeyTitle,
    step_number: stepNumber,
    step_position: stepPosition,
    total_steps: totalSteps,
  };
  track(
    'journey_step_completed',
    { ...funnel, step_row_count: stepRowCount },
    { ga: { name: 'journey_step_complete', params: funnel } },
  );
};

export const trackJourneyStepUncomplete = ({
  journeyId,
  journeyTitle,
  stepNumber,
  stepRowCount,
}: {
  journeyId: string | number;
  journeyTitle?: string;
  stepNumber: number;
  stepRowCount: number;
}) => {
  track(
    'journey_step_uncompleted',
    {
      journey_id: String(journeyId),
      journey_title: journeyTitle,
      step_number: stepNumber,
      step_row_count: stepRowCount,
    },
    { ga: false },
  );
};
export const trackJourneyComplete = ({ journeyId, journeyTitle, totalSteps }: JourneyEventInfo) => {
  track(
    'journey_completed',
    { journey_id: String(journeyId), journey_title: journeyTitle, total_steps: totalSteps },
    { ga: { name: 'journey_complete' } },
  );
};

export const trackResourceSaveToggle = (
  kind: 'bookmark' | 'favorite',
  saved: boolean,
  resourceId: string | number,
) => {
  const name =
    kind === 'bookmark'
      ? saved ? 'resource_bookmarked' : 'resource_unbookmarked'
      : saved ? 'resource_favorited' : 'resource_unfavorited';
  track(name, { resource_id: String(resourceId) }, { ga: false });
};
export const trackResourceClick = (
  resourceTitle: string,
  resourceUrl: string,
  category: string,
  surface?: string,
) => {
  const linkDomain = domainOf(resourceUrl);
  track(
    'resource_link_opened',
    {
      resource_title: resourceTitle,
      link_url: resourceUrl,
      link_domain: linkDomain,
      category,
      surface,
    },
    {
      ga: {
        name: 'resource_click',
        params: {
          content_type: 'resource',
          content_name: resourceTitle,
          content_category: category,
          surface,
          value: 1,
        },
      },
    },
  );
  track(
    'outbound_link',
    { link_url: resourceUrl, link_domain: linkDomain },
    { product: false },
  );
};

// Track site search (GA4 recommended `search` with search_term).
export const trackSearch = (searchTerm: string, resultCount: number, surface = 'search_page') => {
  track(
    'search_performed',
    { search_term: searchTerm, result_count: resultCount, surface },
    { ga: { name: 'search' } },
  );
};

// Track category navigation.
export const trackCategoryView = (categoryName: string) => {
  track(
    'category_viewed',
    { category: categoryName },
    { ga: { name: 'category_view', params: { content_category: categoryName } } },
  );
};

// Track theme / appearance changes (themeType e.g. "color" | "font" | "system").
export const trackThemeChange = (themeName: string, themeType = 'color') => {
  track('theme_change', { theme_name: themeName, theme_type: themeType }, { product: false });
};

// Track resource favoriting (GA4 legacy; the catalog's resource_favorited /
// resource_unfavorited come from trackResourceSaveToggle).
export const trackResourceFavorite = (
  resourceTitle: string,
  category: string,
  action: 'add' | 'remove'
) => {
  track(
    'resource_favorite',
    {
      action,
      content_type: 'resource',
      content_name: resourceTitle,
      content_category: category,
    },
    { product: false },
  );
};

// Track API response times.
export const trackApiPerformance = (
  endpoint: string,
  responseTime: number,
  status: number
) => {
  track(
    'api_performance',
    { endpoint, status, value: Math.round(responseTime) },
    { product: false },
  );
};

// Track Core Web Vitals (LCP, INP, CLS) and the loading diagnostics FCP and
// TTFB, all from web-vitals. Times are milliseconds; CLS is a unitless score,
// so retain enough precision for the score to remain useful in GA4.
export const trackPerformance = (metric: string, value: number) => {
  if (!Number.isFinite(value)) return;
  const normalizedMetric = metric.toLowerCase();
  const reportedValue =
    normalizedMetric === 'cls' ? Number(value.toFixed(4)) : Math.round(value);
  track(
    'performance',
    { metric_name: normalizedMetric, value: reportedValue },
    { product: false, replit: true },
  );
};

// Track error events.
export const trackError = (errorType: SiteErrorType, errorMessage: string) => {
  track('error', { error_type: errorType, error_message: errorMessage }, { product: false });
  trackSiteError(errorType);
};

export type SiteErrorType =
  | 'javascript_error'
  | 'unhandled_promise_rejection'
  | 'api_error'
  | 'component_crash'
  | 'route_crash'
  | 'chunk_load_failed'
  | 'page_load_failed';

// Replit Analytics half of every site error: the error TYPE only — never the
// message, which can carry URLs, copied text or query values.
export const trackSiteError = (errorType: SiteErrorType) => {
  track('site_error', { error_type: errorType }, { ga: false, product: false, replit: true });
};

export const trackFilterUsage = (
  filterType: string,
  filterValue: string,
  resultCount: number,
  surface = 'unknown',
) => {
  track('filter_applied', {
    filter_type: filterType,
    filter_value: filterValue,
    result_count: resultCount,
    zero_results: resultCount === 0,
    surface,
  });
};

export const trackSortChange = (sortType: string, surface = 'unknown', resultCount?: number) => {
  track(
    'sort_changed',
    {
      sort_type: sortType,
      surface,
      result_count: resultCount,
      zero_results: resultCount === 0,
    },
    { ga: { name: 'sort_change' } },
  );
};

export const trackTagInteraction = (tag: string, action: string, surface = 'unknown', resultCount?: number) => {
  track('tag_interaction', {
    tag,
    action,
    surface,
    result_count: resultCount,
    zero_results: resultCount === 0,
  });
};

export const trackAuthPromptShown = (
  context: AuthPromptContext,
  guestSavedCount: number
) => {
  track('auth_prompt_shown', { prompt_context: context, guest_saved_count: guestSavedCount });
};

export const trackBookmarksMerged = (outcome: {
  merged: number;
  duplicates: number;
  failed: number;
}) => {
  track('bookmarks_merged', {
    merged_count: outcome.merged,
    duplicate_count: outcome.duplicates,
    failed_count: outcome.failed,
  });
};

export const trackGuestBookmarkRemoved = (
  resourceId: string | number,
  guestSavedCount: number
) => {
  track('guest_bookmark_removed', {
    resource_id: String(resourceId),
    guest_saved_count: guestSavedCount,
  });
};

export const trackGuestBookmarkAdded = (
  resourceId: string | number,
  guestSavedCount: number
) => {
  track('guest_bookmark_added', {
    resource_id: String(resourceId),
    guest_saved_count: guestSavedCount,
  });
};

const queuedDispatches: AnalyticsDispatchRequest[] = [];

/**
 * The single entry point for every custom event: one call reaches GA4,
 * Mixpanel, PostHog, Amplitude and Replit Analytics with identically cleaned
 * properties. The four banner-named vendors only receive events after a
 * grant; Replit Analytics (cookie-free, no identifiers) also receives them
 * while the visitor has not chosen, and nothing is sent after a Decline.
 * Nothing is sent from an admin session or a QA path.
 * Components never call it directly: they use typed helpers — the ones in
 * this file or an area module (analytics-<area>.ts) — so the catalog in
 * docs/ANALYTICS.md stays the one place event names are decided.
 */
export const track = (name: string, props: EventProps = {}, options: TrackOptions = {}) => {
  if (typeof window === 'undefined') return;
  // Admin sessions and QA paths reach no vendor (analytics-suppression.ts).
  if (isAnalyticsSuppressed()) return;
  const consent = getAnalyticsConsent();
  if (consent === 'denied') return;
  const product = options.product !== false;
  const replit = options.replit ?? product;
  if (consent !== 'granted' && !replit) return;
  const ga =
    options.ga === false
      ? null
      : { name: options.ga?.name ?? name, params: options.ga?.params ?? props };
  const request: AnalyticsDispatchRequest = {
    name,
    props,
    ga,
    product,
    replit,
  };
  if (dispatch) {
    dispatch(request);
    return;
  }
  queuedDispatches.push(request);
  if (dispatchLoad) return;
  dispatchLoad = import('./analytics-dispatch')
    .then(({ dispatchAnalyticsEvent }) => {
      dispatch = dispatchAnalyticsEvent;
      // FIFO flush keeps the order the helpers were called in.
      for (const queued of queuedDispatches.splice(0)) dispatchAnalyticsEvent(queued);
    })
    .catch(() => {
      // Transient chunk failure: drop what was queued and allow a retry.
      queuedDispatches.length = 0;
      dispatchLoad = null;
    });
};

export type CommandPaletteOpenMethod =
  | 'keyboard_shortcut'
  | 'slash_key'
  | 'header_button'
  | 'resource_page_button'
  | 'listing_page_button';
const referrerOrigin = (): string | undefined => {
  if (typeof document === 'undefined' || !document.referrer) return undefined;
  try {
    return new URL(document.referrer).origin;
  } catch {
    return undefined;
  }
};

let dispatchLoad: Promise<void> | null = null;

interface TrackOptions {
  /**
   * GA4 half. Default: the same name and properties as the catalog event.
   * `{ name, params? }` keeps a legacy GA4 name (and optionally its own
   * params) for events that predate the catalog; `false` skips GA4.
   */
  ga?: false | { name?: string; params?: EventProps };
  /**
   * Mixpanel + PostHog + Amplitude. Default true; `false` only for the legacy
   * GA4-only events (page_view, page_engaged, performance, api_performance,
   * error, theme_change, resource_favorite, outbound_link) and the client
   * halves of server-emitted conversions (sign_up_completed,
   * resource_submitted) so their vendor coverage is unchanged.
   */
  product?: boolean;
  /**
   * Replit Analytics. Default: same as `product`. `false` for page_viewed
   * (the platform records page views); `true` for non-product events that
   * should still reach Replit Analytics (performance, page_not_found,
   * site_error, sign_up_completed, resource_submitted).
   */
  replit?: boolean;
}

let dispatch: ((request: AnalyticsDispatchRequest) => void) | null = null;

type EventProps = Record<string, unknown>;

// A visitor switched tabs on a multi-tool page (e.g. Discovery tools).
export const trackToolTabOpened = (page: string, tab: string) => {
  track('tool_tab_opened', { page, tab });
};

// The contact form was accepted by the server. No properties: the form text,
// name and address are never sent, and the reply address is mandatory, so a
// "reply requested" flag would always be true.
export const trackContactMessageSent = () => {
  track('contact_message_sent');
};

export const trackCommandPaletteOpened = (method: CommandPaletteOpenMethod, surface?: string) => {
  track('command_palette_opened', { open_method: method, surface });
};

export const trackExportStarted = (info: ExportEventInfo) => {
  track('export_started', exportProps(info));
};

export const trackHomeLayoutChanged = (layout: string, previousLayout: string) => {
  track('home_layout_changed', { home_layout: layout, previous_layout: previousLayout });
};

export const trackAccountDeletionDialogOpened = () => {
  track('account_deletion_dialog_opened');
};

export const trackAccountSecurityOpened = (entryPoint: 'profile_tab' | 'manage_button') => {
  track('account_security_opened', { entry_point: entryPoint });
};

export const trackResourceCardOpened = (
  resourceId: string | number,
  surface: string,
  control: 'title' | 'view_details' | 'card',
) => {
  track('resource_card_opened', {
    resource_id: String(resourceId),
    surface,
    card_control: control,
  });
};

export const trackRelatedResourceOpened = (
  resourceId: string | number,
  fromResourceId: string | number,
  position: number,
  matchScore?: number,
  surface = 'related_list',
) => {
  track('related_resource_opened', {
    resource_id: String(resourceId),
    from_resource_id: String(fromResourceId),
    position,
    match_score: matchScore,
    surface,
  });
};

export const trackRelatedCategoryOpened = (
  fromResourceId: string | number,
  category: string,
  surface = 'related_list',
) => {
  track('related_category_opened', {
    from_resource_id: String(fromResourceId),
    category,
    surface,
  });
};

export const trackApiKeyCopied = (copyMethod: 'clipboard' | 'manual_select') => {
  track('api_key_copied', { copy_method: copyMethod });
};

const exportProps = ({ format, scope, categoryCount, resourceCount }: ExportEventInfo) => ({
  export_format: format,
  export_scope: scope,
  category_count: categoryCount,
  resource_count: resourceCount,
});

export const trackAccountDeletionWithdrawn = () => {
  track('account_deletion_withdrawn');
};

export const trackSidebarToggled = (
  state: 'expanded' | 'collapsed',
  mode: 'drawer' | 'docked',
) => {
  track('sidebar_toggled', {
    toggle_method: 'keyboard_shortcut',
    sidebar_state: state,
    sidebar_mode: mode,
  });
};

export const trackLoggedOut = (scope: 'this_device' | 'all_devices') => {
  track('logged_out', { logout_scope: scope });
};

export const trackProfileNameUpdated = () => {
  track('profile_name_updated');
};

interface ExportEventInfo {
  format: string;
  scope: 'all' | 'selected_categories';
  categoryCount: number;
  resourceCount: number;
}

export const trackExportDownloaded = (info: ExportEventInfo) => {
  track('export_downloaded', exportProps(info));
};

export const trackApiKeyCreated = (expiry: string) => {
  track('api_key_created', { expiry_option: expiry });
};

export const trackApiKeyRevoked = () => {
  track('api_key_revoked');
};

export const trackAccountDeletionRequested = () => {
  track('account_deletion_requested');
};

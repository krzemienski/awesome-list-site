// Google Analytics 4 (gtag.js) integration.
//
// Design:
//  - initGA loads gtag with `send_page_view:false` so page_view is fired
//    exactly once per navigation from a single source (use-analytics), and adds
//    `debug_mode` in DEV so events surface in GA4 DebugView.
//  - Every event routes through `sendEvent`, which enriches it with standard
//    GA4 context (page_location, page_path, page_title, page_referrer).
//  - Legacy custom event NAMES are preserved (dashboard continuity); GA4
//    recommended events (login/sign_up/select_content/generate_lead/search/
//    share) are ADDED with dedicated recommended parameters.
//  - No PII is ever sent (no email/password/token/raw copied text).

import { captureAcquisition, getAcquisition } from './acquisition';

// Define the gtag function globally
declare global {
  interface Window {
    dataLayer: Array<unknown>;
    gtag: (...args: unknown[]) => void;
  }
}

const getMeasurementId = (): string | undefined =>
  import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

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

export const setAnalyticsConsent = (value: 'granted' | 'denied') => {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Storage unavailable (private mode) — treat as session-only choice.
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
export const initGA = () => {
  if (gaInitialized) return;

  // BUG-020 (run13): never load gtag without explicit consent. The consent
  // banner calls initGA() again right after the visitor accepts.
  if (getAnalyticsConsent() !== 'granted') return;

  const measurementId = getMeasurementId();

  if (!measurementId) {
    console.warn('Missing required Google Analytics key: VITE_GA_MEASUREMENT_ID');
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
  const configParams: Record<string, unknown> = { send_page_view: false };
  if (import.meta.env.DEV) configParams.debug_mode = true;
  window.gtag('config', measurementId, configParams);
};

// Standard GA4 context attached to every event.
const baseContext = (): Record<string, unknown> => {
  if (typeof window === 'undefined') return {};
  return {
    page_location: window.location.href,
    page_path: window.location.pathname + window.location.search,
    page_title: typeof document !== 'undefined' ? document.title : undefined,
    page_referrer:
      typeof document !== 'undefined' ? document.referrer || undefined : undefined,
  };
};

/**
 * Central event dispatcher. Enriches every event with standard GA4 context and
 * strips undefined/null params so payloads stay clean. All other helpers in this
 * module funnel through here.
 */
export const sendEvent = (name: string, params: Record<string, unknown> = {}) => {
  if (typeof window === 'undefined' || !window.gtag) return;

  const merged: Record<string, unknown> = { ...baseContext(), ...params };
  Object.keys(merged).forEach((key) => {
    if (merged[key] === undefined || merged[key] === null) delete merged[key];
  });

  window.gtag('event', name, merged);
};

// Track page views — single source, called on mount + every route change.
// Relies on baseContext for page_location (carries UTMs) / page_path / title.
export const trackPageView = (_url?: string) => {
  sendEvent('page_view', {});
};

// Track engagement duration for a page (fired on route change + tab hide).
export const trackPageEngagement = (pagePath: string, engagementMs: number) => {
  const engagement_time_msec = Math.round(engagementMs);
  if (!Number.isFinite(engagement_time_msec) || engagement_time_msec <= 0) return;
  sendEvent('page_engaged', { page_path: pagePath, engagement_time_msec });
};

// Generic event (legacy UA-style params retained for dashboard continuity, now
// enriched with GA4 context via sendEvent).
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
  sendEvent(action, params);
};

// ---------------------------------------------------------------------------
// GA4 recommended events (ADDED for conversion / facilitation flows)
// ---------------------------------------------------------------------------

// User signed in (method e.g. "password"). Carries first-touch acquisition.
export const trackLogin = (method: string) => {
  sendEvent('login', { method, ...getAcquisition() });
};

// User created an account. Carries first-touch acquisition.
export const trackSignUp = (method: string) => {
  sendEvent('sign_up', { method, ...getAcquisition() });
};

// User selected/opened a piece of content (e.g. viewed a resource detail).
export const trackSelectContent = (
  contentType: string,
  contentId: string | number,
  extra: Record<string, unknown> = {}
) => {
  sendEvent('select_content', {
    content_type: contentType,
    content_id: String(contentId),
    ...extra,
  });
};

// User completed a lead-generating form (e.g. submitted a resource).
export const trackGenerateLead = (params: Record<string, unknown> = {}) => {
  sendEvent('generate_lead', { ...params, ...getAcquisition() });
};

// User shared content (GA4 recommended `share`).
export const trackShare = (
  method: string,
  contentType: string,
  contentId: string | number
) => {
  sendEvent('share', {
    method,
    content_type: contentType,
    content_id: String(contentId),
  });
};

// ---------------------------------------------------------------------------
// Retained custom events (names preserved, params enriched)
// ---------------------------------------------------------------------------

// Track resource clicks — most important for awesome lists. Intentionally emits
// two distinct named events (documented pair, not duplicates): the engagement
// signal and the outbound-navigation signal.
export const trackResourceClick = (
  resourceTitle: string,
  resourceUrl: string,
  category: string
) => {
  sendEvent('resource_click', {
    content_type: 'resource',
    content_name: resourceTitle,
    content_category: category,
    value: 1,
  });
  sendEvent('outbound_link', {
    link_url: resourceUrl,
    link_domain: domainOf(resourceUrl),
  });
};

// Track site search (GA4 recommended `search` with search_term).
export const trackSearch = (searchTerm: string, resultCount: number) => {
  sendEvent('search', { search_term: searchTerm, result_count: resultCount });
};

// Track category navigation.
export const trackCategoryView = (categoryName: string) => {
  sendEvent('category_view', { content_category: categoryName });
};

// Track theme / appearance changes (themeType e.g. "color" | "font" | "system").
export const trackThemeChange = (themeName: string, themeType = 'color') => {
  sendEvent('theme_change', { theme_name: themeName, theme_type: themeType });
};

// Track resource favoriting.
export const trackResourceFavorite = (
  resourceTitle: string,
  category: string,
  action: 'add' | 'remove'
) => {
  sendEvent('resource_favorite', {
    action,
    content_type: 'resource',
    content_name: resourceTitle,
    content_category: category,
  });
};

// Track performance metrics.
export const trackPerformance = (metric: string, value: number) => {
  sendEvent('performance', { metric_name: metric, value: Math.round(value) });
};

// Track API response times.
export const trackApiPerformance = (
  endpoint: string,
  responseTime: number,
  status: number
) => {
  sendEvent('api_performance', {
    endpoint,
    status,
    value: Math.round(responseTime),
  });
};

// Track copy actions — privacy: never send the raw copied text, only type+length.
export const trackCopyAction = (content: string, type: string) => {
  sendEvent('copy_action', { content_type: type, content_length: content.length });
};

// Track error events.
export const trackError = (errorType: string, errorMessage: string) => {
  sendEvent('error', { error_type: errorType, error_message: errorMessage });
};

// ---------------------------------------------------------------------------
// Preserved-but-unwired helpers (intentionally retained for future use; see
// docs/ANALYTICS.md). They route through the enriched pipeline via trackEvent.
// ---------------------------------------------------------------------------

export const trackListSwitch = (fromList: string, toList: string) => {
  trackEvent('list_switch', 'navigation', `${fromList} -> ${toList}`);
};

export const trackLayoutChange = (layout: string) => {
  trackEvent('layout_change', 'ui_interaction', layout);
};

export const trackFilterUsage = (
  filterType: string,
  filterValue: string,
  resultCount: number
) => {
  trackEvent('filter_applied', 'engagement', `${filterType}: ${filterValue}`, resultCount);
};

export const trackSortChange = (sortType: string) => {
  trackEvent('sort_change', 'ui_interaction', sortType);
};

export const trackPopoverView = (resourceTitle: string, category: string) => {
  trackEvent('resource_preview', 'engagement', `${category}: ${resourceTitle}`);
};

export const trackMobileInteraction = (action: string, element: string) => {
  trackEvent('mobile_interaction', 'touch', `${action}: ${element}`);
};

export const trackEngagementTime = (timeSpent: number, page: string) => {
  sendEvent('engagement_time', {
    page_path: page,
    engagement_time_msec: Math.round(timeSpent),
  });
};

export const trackScrollDepth = (percentage: number, page: string) => {
  sendEvent('scroll_depth', { page_path: page, percent_scrolled: percentage });
};

export const trackShareAction = (method: string, resource: string) => {
  trackEvent('share_action', 'engagement', `${method}: ${resource}`);
};

export const trackKeyboardShortcut = (shortcut: string, action: string) => {
  trackEvent('keyboard_shortcut', 'power_user', `${shortcut}: ${action}`);
};

export const trackExportAction = (format: string, itemCount: number) => {
  trackEvent('export_action', 'data_export', format, itemCount);
};

export const trackTagInteraction = (tag: string, action: string) => {
  trackEvent('tag_interaction', 'navigation', `${action}: ${tag}`);
};

export const trackSessionQuality = (metrics: {
  resourcesViewed: number;
  searchesPerformed: number;
  timeSpent: number;
  categoriesExplored: number;
}) => {
  sendEvent('session_quality', {
    resources_viewed: metrics.resourcesViewed,
    searches_performed: metrics.searchesPerformed,
    time_spent_sec: Math.round(metrics.timeSpent / 1000),
    categories_explored: metrics.categoriesExplored,
  });
};

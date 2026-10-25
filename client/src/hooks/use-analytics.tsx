import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';
import {
  getAnalyticsConsent,
  trackError,
  trackPageView,
  trackPageEngagement,
  trackPerformance,
} from '../lib/analytics';
import { syncReplitPageviewOptOut } from '../lib/analytics-suppression';

// Single source of GA4 page views + page-engagement duration.
// gtag is configured with send_page_view:false, so page_view is fired here on
// initial mount AND on every route change — exactly one per navigation.
export const useAnalytics = () => {
  const [location] = useLocation();
  const prevLocationRef = useRef<string | null>(null);
  const enterTimeRef = useRef<number>(Date.now());
  const vitalsStartedRef = useRef(false);

  useEffect(() => {
    if (prevLocationRef.current === location) return;

    const now = Date.now();

    // Emit engagement for the page we're leaving (skipped on initial mount).
    if (prevLocationRef.current !== null) {
      trackPageEngagement(prevLocationRef.current, now - enterTimeRef.current);
    }

    // Before the page view: Replit's tracker records soft navigations ~300 ms
    // after the URL changes, so a QA path must opt out of it right away.
    syncReplitPageviewOptOut();
    // Initial mount (prev === null) and every subsequent change fire one page_view.
    trackPageView(location);
    prevLocationRef.current = location;
    enterTimeRef.current = now;
  }, [location]);

  // Flush engagement for the active page when the tab is hidden or closed.
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === 'hidden' && prevLocationRef.current !== null) {
        const now = Date.now();
        trackPageEngagement(prevLocationRef.current, now - enterTimeRef.current);
        enterTimeRef.current = now; // avoid double-counting if the tab returns
      }
    };
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', flush);
    };
  }, []);

  // Web vitals and error capture start unless the visitor declined: they
  // reach Replit Analytics (cookie-free; errors as their type only) before a
  // choice and GA4 only after a grant. The web-vitals callbacks do not expose an
  // unsubscribe API, so their observers are started once per page; track()
  // still checks the current consent if a visitor declines later.
  useEffect(() => {
    let errorsAttached = false;

    const messageShapeOf = (message: unknown): string => {
      const text = typeof message === 'string' ? message.trim() : '';
      if (!text) return 'empty';
      const length = text.length <= 40 ? 'short' : text.length <= 160 ? 'medium' : 'long';
      const source = /https?:\/\//i.test(text) ? 'url' : 'text';
      const query = /[?&][^\s=]+=/i.test(text) ? '-query' : '';
      return `${length}-${source}${query}`;
    };

    const startCapture = () => {
      const consent = getAnalyticsConsent();
      if (consent === 'denied') return;

      if (!vitalsStartedRef.current) {
        vitalsStartedRef.current = true;
        onLCP((metric) => trackPerformance('lcp', metric.value));
        onCLS((metric) => trackPerformance('cls', metric.value));
        onINP((metric) => trackPerformance('inp', metric.value));
        onFCP((metric) => trackPerformance('fcp', metric.value));
        onTTFB((metric) => trackPerformance('ttfb', metric.value));
      }

      if (!errorsAttached) {
        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);
        errorsAttached = true;
      }
    };

    // Only send a safe message shape: raw browser messages can include copied
    // text, route/query values, or third-party URLs.
    const handleError = (event: ErrorEvent) => {
      trackError('javascript_error', messageShapeOf(event.message));
    };
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      trackError(
        'unhandled_promise_rejection',
        messageShapeOf(event.reason instanceof Error ? event.reason.message : event.reason),
      );
    };

    const handleConsentChange = () => {
      startCapture();
      if (getAnalyticsConsent() === 'denied' && errorsAttached) {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        errorsAttached = false;
      }
    };

    startCapture();
    window.addEventListener('analytics-consent-changed', handleConsentChange);
    return () => {
      window.removeEventListener('analytics-consent-changed', handleConsentChange);
      if (errorsAttached) {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      }
    };
  }, []);
};

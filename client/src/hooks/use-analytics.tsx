import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { onCLS, onLCP } from 'web-vitals';
import {
  getAnalyticsConsent,
  trackError,
  trackPageView,
  trackPageEngagement,
  trackPerformance,
} from '../lib/analytics';

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

  // Start telemetry only after the visitor grants analytics consent. The
  // web-vitals callbacks do not expose an unsubscribe API, so their observers
  // are started once per page; sendEvent still checks the current consent if a
  // visitor revokes it later in the same session.
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
      if (getAnalyticsConsent() !== 'granted') return;

      if (!vitalsStartedRef.current) {
        vitalsStartedRef.current = true;
        onLCP((metric) => trackPerformance('lcp', metric.value));
        onCLS((metric) => trackPerformance('cls', metric.value));

        // FID was the signal used by the original instrumentation. Keep
        // reporting it for dashboard continuity even though modern browsers
        // have replaced it with INP.
        if (typeof PerformanceObserver !== 'undefined') {
          try {
            const observer = new PerformanceObserver((list) => {
              const entry = list.getEntries()[0] as PerformanceEventTiming | undefined;
              if (!entry) return;
              trackPerformance('fid', entry.processingStart - entry.startTime);
              observer.disconnect();
            });
            observer.observe({ type: 'first-input', buffered: true });
          } catch {
            // Older browsers may not support the first-input observer.
          }
        }
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
      if (getAnalyticsConsent() === 'granted') {
        startCapture();
      } else if (errorsAttached) {
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

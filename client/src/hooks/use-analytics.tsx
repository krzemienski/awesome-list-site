import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { trackPageView, trackPageEngagement } from '../lib/analytics';

// Single source of GA4 page views + page-engagement duration.
// gtag is configured with send_page_view:false, so page_view is fired here on
// initial mount AND on every route change — exactly one per navigation.
export const useAnalytics = () => {
  const [location] = useLocation();
  const prevLocationRef = useRef<string | null>(null);
  const enterTimeRef = useRef<number>(Date.now());

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
};

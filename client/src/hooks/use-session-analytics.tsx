import { useEffect, useRef, useState } from 'react';
import { 
  trackEngagementTime, 
  trackScrollDepth, 
  trackSessionQuality,
  trackPerformance,
  trackError
} from '@/lib/analytics';

export function useSessionAnalytics() {
  const [sessionData, setSessionData] = useState({
    resourcesViewed: 0,
    searchesPerformed: 0,
    categoriesExplored: new Set<string>(),
    timeSpent: 0,
    maxScrollDepth: 0,
  });
  
  const sessionStartTime = useRef<number>(Date.now());
  const lastScrollTime = useRef<number>(Date.now());
  const scrollDepthReported = useRef<Set<number>>(new Set());

  // Track engagement time
  useEffect(() => {
    const interval = setInterval(() => {
      const currentTime = Date.now();
      const timeSpent = currentTime - sessionStartTime.current;
      setSessionData(prev => ({ ...prev, timeSpent }));
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Track scroll depth
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = Math.round((scrollTop / docHeight) * 100);
      
      if (scrollPercent > sessionData.maxScrollDepth) {
        setSessionData(prev => ({ ...prev, maxScrollDepth: scrollPercent }));
      }

      // Report scroll milestones
      const milestones = [25, 50, 75, 90, 100];
      milestones.forEach(milestone => {
        if (scrollPercent >= milestone && !scrollDepthReported.current.has(milestone)) {
          trackScrollDepth(milestone, window.location.pathname);
          scrollDepthReported.current.add(milestone);
        }
      });

      lastScrollTime.current = Date.now();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sessionData.maxScrollDepth]);

  // Track page visibility for accurate engagement time
  useEffect(() => {
    let hiddenTime = 0;
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenTime = Date.now();
      } else if (hiddenTime > 0) {
        const timeHidden = Date.now() - hiddenTime;
        sessionStartTime.current += timeHidden; // Adjust start time to exclude hidden time
        hiddenTime = 0;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Send session quality data on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const finalSessionData = {
        resourcesViewed: sessionData.resourcesViewed,
        searchesPerformed: sessionData.searchesPerformed,
        timeSpent: Date.now() - sessionStartTime.current,
        categoriesExplored: sessionData.categoriesExplored.size,
      };
      
      trackSessionQuality(finalSessionData);
      trackEngagementTime(finalSessionData.timeSpent, window.location.pathname);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sessionData]);

  // Track performance metrics
  useEffect(() => {
    // Track Core Web Vitals
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'largest-contentful-paint') {
            trackPerformance('lcp', entry.startTime);
          }
          if (entry.entryType === 'first-input') {
            const fidEntry = entry as any;
            trackPerformance('fid', fidEntry.processingStart - fidEntry.startTime);
          }
          if (entry.entryType === 'layout-shift') {
            const clsEntry = entry as any;
            if (!clsEntry.hadRecentInput) {
              trackPerformance('cls', clsEntry.value);
            }
          }
        }
      });

      observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
      
      return () => observer.disconnect();
    }
  }, []);

  // Track JavaScript errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      trackError('javascript_error', `${event.filename}:${event.lineno} - ${event.message}`);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      trackError('unhandled_promise_rejection', String(event.reason));
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const incrementResourcesViewed = () => {
    setSessionData(prev => ({ 
      ...prev, 
      resourcesViewed: prev.resourcesViewed + 1 
    }));
  };

  const incrementSearchesPerformed = () => {
    setSessionData(prev => ({ 
      ...prev, 
      searchesPerformed: prev.searchesPerformed + 1 
    }));
  };

  const addCategoryExplored = (category: string) => {
    setSessionData(prev => ({ 
      ...prev, 
      categoriesExplored: new Set(Array.from(prev.categoriesExplored).concat([category]))
    }));
  };

  return {
    sessionData,
    incrementResourcesViewed,
    incrementSearchesPerformed,
    addCategoryExplored,
  };
}
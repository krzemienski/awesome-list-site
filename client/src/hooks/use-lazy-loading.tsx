import { useEffect, useRef, useState } from 'react';

interface UseLazyLoadingOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export function useLazyLoading(options: UseLazyLoadingOptions = {}) {
  const { 
    threshold = 0.1, 
    rootMargin = '300px', // Increased for better pre-rendering
    triggerOnce = true 
  } = options;

  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Skip intersection observer in SSR or if not supported
    if (typeof window === 'undefined' || !window.IntersectionObserver) {
      setIsVisible(true);
      return;
    }

    // Reuse existing observer or create new one
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          const isIntersecting = entry.isIntersecting;
          
          if (isIntersecting) {
            setIsVisible(true);
            
            // Unobserve if we only want to trigger once
            if (triggerOnce && observerRef.current) {
              observerRef.current.unobserve(element);
            }
          } else if (!triggerOnce) {
            setIsVisible(false);
          }
        },
        {
          threshold,
          rootMargin,
        }
      );
    }

    observerRef.current.observe(element);

    return () => {
      // Proper cleanup
      if (observerRef.current && element) {
        observerRef.current.unobserve(element);
      }
    };
  }, [threshold, rootMargin, triggerOnce]);

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, []);

  return { ref, isVisible };
}

// Hook for batch lazy loading multiple items
export function useBatchLazyLoading(itemCount: number) {
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  const isUnmountingRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const previousItemCountRef = useRef(0);

  // Initialize observer once and keep it stable
  useEffect(() => {
    if (hasInitializedRef.current) return;
    
    isUnmountingRef.current = false;
    hasInitializedRef.current = true;
    
    // Skip in SSR or if not supported
    if (typeof window === 'undefined' || !window.IntersectionObserver) {
      // In SSR, we can't pre-populate IDs since we don't know them yet
      // Items will be made visible as they register
      return;
    }

    // Create observer with optimized settings - only once
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (isUnmountingRef.current) return;
        
        entries.forEach((entry) => {
          const id = entry.target.getAttribute('data-id');
          
          if (entry.isIntersecting && id) {
            setVisibleIds((prev) => {
              const newSet = new Set(prev);
              newSet.add(id);
              return newSet;
            });
            
            // Unobserve once visible for performance
            if (observerRef.current && !isUnmountingRef.current) {
              observerRef.current.unobserve(entry.target);
            }
          }
        });
      },
      {
        rootMargin: '500px', // Further increased for better mobile pre-rendering
        threshold: 0.01, // Low threshold for faster triggering
      }
    );
  }, []); // Empty dependency array - initialize once

  // Handle itemCount changes without recreating observer
  useEffect(() => {
    // Skip initial setup
    if (!hasInitializedRef.current) return;
    
    // Skip in SSR or if not supported
    if (typeof window === 'undefined' || !window.IntersectionObserver) {
      // In SSR, make all currently registered items visible
      if (itemCount > previousItemCountRef.current) {
        setVisibleIds((prev) => {
          const newSet = new Set(prev);
          // Add all currently registered item IDs
          itemRefs.current.forEach((_, id) => {
            newSet.add(id);
          });
          return newSet;
        });
      }
      previousItemCountRef.current = itemCount;
      return;
    }

    // If itemCount increased, observe any new elements that got registered
    // but don't touch existing visible items or the observer itself
    if (itemCount > previousItemCountRef.current && observerRef.current) {
      // Re-observe any elements that might have been added
      itemRefs.current.forEach((element, id) => {
        // Only observe elements that haven't been made visible yet
        if (!visibleIds.has(id) && observerRef.current && !isUnmountingRef.current) {
          observerRef.current.observe(element);
        }
      });
    }

    previousItemCountRef.current = itemCount;
  }, [itemCount]); // Only itemCount as dependency

  const registerItem = (id: string, element: HTMLElement | null) => {
    if (isUnmountingRef.current) return;
    
    if (!element) {
      // Unobserve before removing
      const existing = itemRefs.current.get(id);
      if (existing && observerRef.current) {
        observerRef.current.unobserve(existing);
      }
      itemRefs.current.delete(id);
      return;
    }

    element.setAttribute('data-id', id);
    itemRefs.current.set(id, element);
    
    // In SSR or if no IntersectionObserver, make item visible immediately
    if (typeof window === 'undefined' || !window.IntersectionObserver) {
      setVisibleIds((prev) => {
        const newSet = new Set(prev);
        newSet.add(id);
        return newSet;
      });
      return;
    }
    
    // Only observe if the item isn't already visible and observer exists
    if (observerRef.current && !isUnmountingRef.current && !visibleIds.has(id)) {
      observerRef.current.observe(element);
    }
  };

  // Cleanup observer on unmount only
  useEffect(() => {
    return () => {
      isUnmountingRef.current = true;
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      itemRefs.current.clear();
      hasInitializedRef.current = false;
    };
  }, []);

  return { visibleIds, registerItem };
}
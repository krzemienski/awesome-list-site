import { useEffect, useRef, useState } from 'react';

interface UseLazyLoadingOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export function useLazyLoading(options: UseLazyLoadingOptions = {}) {
  const { 
    threshold = 0.1, 
    rootMargin = '100px', 
    triggerOnce = true 
  } = options;

  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Skip intersection observer in SSR or if not supported
    if (typeof window === 'undefined' || !window.IntersectionObserver) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isIntersecting = entry.isIntersecting;
        
        if (isIntersecting) {
          setIsVisible(true);
          
          // Unobserve if we only want to trigger once
          if (triggerOnce) {
            observer.unobserve(element);
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

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, rootMargin, triggerOnce]);

  return { ref, isVisible };
}

// Hook for batch lazy loading multiple items
export function useBatchLazyLoading(itemCount: number) {
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const itemRefs = useRef<Map<number, HTMLElement>>(new Map());

  useEffect(() => {
    // Skip in SSR or if not supported
    if (typeof window === 'undefined' || !window.IntersectionObserver) {
      // Make all items visible immediately
      setVisibleItems(new Set(Array.from({ length: itemCount }, (_, i) => i)));
      return;
    }

    // Create observer with optimized settings
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = parseInt(entry.target.getAttribute('data-index') || '0');
          
          if (entry.isIntersecting) {
            setVisibleItems((prev) => {
              const newSet = new Set(prev);
              newSet.add(index);
              return newSet;
            });
            
            // Unobserve once visible for performance
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.01, // Low threshold for faster triggering
      }
    );

    // Observe all registered items
    itemRefs.current.forEach((element) => {
      observerRef.current?.observe(element);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [itemCount]);

  const registerItem = (index: number, element: HTMLElement | null) => {
    if (!element) {
      itemRefs.current.delete(index);
      return;
    }

    element.setAttribute('data-index', index.toString());
    itemRefs.current.set(index, element);
    
    // Observe the new element if observer exists
    if (observerRef.current) {
      observerRef.current.observe(element);
    }
  };

  return { visibleItems, registerItem };
}
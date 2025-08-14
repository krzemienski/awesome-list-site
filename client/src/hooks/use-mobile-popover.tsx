import { useState, useEffect, useRef } from 'react';

interface UseMobilePopoverOptions {
  /** Prevent closing on scroll events */
  preventScrollClose?: boolean;
  /** Custom close delay after touch events (ms) */
  touchCloseDelay?: number;
}

export function useMobilePopover(options: UseMobilePopoverOptions = {}) {
  const { preventScrollClose = true, touchCloseDelay = 150 } = options;
  const [isOpen, setIsOpen] = useState(false);
  const [isTouching, setIsTouching] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const touchTimeoutRef = useRef<NodeJS.Timeout>();

  // Handle touch events
  useEffect(() => {
    if (!preventScrollClose) return;

    const handleTouchStart = () => {
      setIsTouching(true);
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
      }
    };

    const handleTouchEnd = () => {
      // Delay setting isTouching to false to prevent immediate scroll closing
      touchTimeoutRef.current = setTimeout(() => {
        setIsTouching(false);
      }, touchCloseDelay);
    };

    const handleScroll = (event: Event) => {
      // Only close on scroll if we're not actively touching
      if (isTouching) {
        event.preventDefault();
        return;
      }
      
      // Check if scroll is happening inside the popover content
      const content = contentRef.current;
      if (content && content.contains(event.target as Node)) {
        // Don't close if scrolling inside the popover
        return;
      }
      
      // Close popover on external scroll
      setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('touchstart', handleTouchStart, { passive: true });
      document.addEventListener('touchend', handleTouchEnd, { passive: true });
      document.addEventListener('scroll', handleScroll, { passive: false });
    }

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('scroll', handleScroll);
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
      }
    };
  }, [isOpen, isTouching, preventScrollClose, touchCloseDelay]);

  // Prevent body scroll when modal is open on mobile
  useEffect(() => {
    if (isOpen && window.innerWidth <= 768) {
      document.body.classList.add('scroll-lock');
      return () => {
        document.body.classList.remove('scroll-lock');
      };
    }
  }, [isOpen]);

  return {
    isOpen,
    setIsOpen,
    contentRef,
    isTouching,
    // Helper props for mobile optimization
    mobileProps: {
      'data-mobile-optimized': true,
      className: 'touch-optimized',
    },
  };
}

// Hook for mobile-optimized dialog/sheet behavior
export function useMobileDialog(options: UseMobilePopoverOptions = {}) {
  const popover = useMobilePopover(options);
  
  return {
    ...popover,
    // Additional dialog-specific methods
    open: () => popover.setIsOpen(true),
    close: () => popover.setIsOpen(false),
    toggle: () => popover.setIsOpen(!popover.isOpen),
  };
}
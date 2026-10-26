import { type KeyboardEvent, useCallback, useEffect, useState } from "react";

const ARROW_SCROLL_PX = 80;

/**
 * The admin tables' sideways-scroll affordance (R4-011, R5-013, R5-058):
 * `showCue` is true while the scroller overflows and is not yet at its right
 * edge, and `onKeyDown` lets the focusable region scroll with the arrow keys.
 * Attach `ref` to the `overflow-x: auto` element that wraps the table.
 */
export function useHorizontalScrollCue() {
  const [scroller, setScroller] = useState<HTMLElement | null>(null);
  const [showCue, setShowCue] = useState(false);

  useEffect(() => {
    if (!scroller) return;
    const check = () => {
      const overflows = scroller.scrollWidth > scroller.clientWidth + 1;
      const atEnd = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 1;
      setShowCue(overflows && !atEnd);
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(scroller);
    // The table resizes when rows change; the scroller's own box may not.
    if (scroller.firstElementChild) observer.observe(scroller.firstElementChild);
    scroller.addEventListener("scroll", check, { passive: true });
    return () => {
      observer.disconnect();
      scroller.removeEventListener("scroll", check);
    };
  }, [scroller]);

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "ArrowRight") event.currentTarget.scrollBy({ left: ARROW_SCROLL_PX });
    else if (event.key === "ArrowLeft") event.currentTarget.scrollBy({ left: -ARROW_SCROLL_PX });
    else return;
    event.preventDefault();
  }, []);

  return { ref: setScroller, showCue, onKeyDown };
}

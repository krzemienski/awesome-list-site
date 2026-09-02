import { useEffect } from "react";

/**
 * App-shell contract for an app-level bottom bar (today: the analytics consent
 * banner — see components/ui/consent-banner.tsx).
 *
 * The bar reserves its own space DECLARATIVELY: it is a row of the `#root`
 * column (see the `#root` rule in index.css), in flow at the top below 640px
 * and `position: sticky; bottom: 0` from 640px up. Normal flow therefore keeps
 * page content and the footer clear of it, and nothing outside the bar has to
 * be padded — no inline styles are written onto `#root`, `body` or any other
 * element the bar does not own.
 *
 * Flow reservation cannot move viewport-FIXED UI (the toast viewport, the
 * back-to-top button, the fixed sidebar column) or the native scroll-into-view
 * algorithm, so this hook publishes the bar's height once, as the shell-level
 * `--app-bottom-inset` custom property on `<html>`. Consumers read a generic
 * "the shell has N pixels of bottom inset" value and never learn which bar is
 * showing. The property is additive (it overwrites no other element's layout)
 * and is removed again when the bar goes away.
 */
const APP_BOTTOM_INSET_VAR = "--app-bottom-inset";

/** Breakpoint at which the bar switches from in-flow-at-top to sticky-bottom.
 *  Mirrors Tailwind's `sm:` prefix used on the bar itself. */
const STICKY_BOTTOM_QUERY = "(min-width: 640px)";

export function useAppBottomInset(el: HTMLElement | null, active: boolean) {
  useEffect(() => {
    if (!active || !el) return;

    const publish = () => {
      // Below the breakpoint the bar sits in flow at the TOP of the page and
      // scrolls away, so it never overlays anything pinned to the viewport.
      const stickyBottom = window.matchMedia(STICKY_BOTTOM_QUERY).matches;
      const h = stickyBottom ? el.offsetHeight : 0;
      document.documentElement.style.setProperty(
        APP_BOTTOM_INSET_VAR,
        h > 0 ? `${h}px` : "0px",
      );
    };

    publish();
    // A ResizeObserver (not just a `resize` listener) is what keeps this
    // honest: the bar re-renders at a different height on some viewport
    // changes, and a resize handler measures BEFORE React commits that change.
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    // The breakpoint itself can flip without the element resizing (a wide but
    // very short viewport keeps the same bar height), so watch it too.
    const mq = window.matchMedia(STICKY_BOTTOM_QUERY);
    mq.addEventListener("change", publish);

    return () => {
      observer.disconnect();
      mq.removeEventListener("change", publish);
      document.documentElement.style.removeProperty(APP_BOTTOM_INSET_VAR);
    };
  }, [el, active]);
}

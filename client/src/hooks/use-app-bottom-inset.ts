import { useEffect } from "react";

/**
 * App-shell contract for an app-level bottom bar (today: the analytics consent
 * banner — see components/ui/consent-banner.tsx).
 *
 * The bar reserves its own space DECLARATIVELY: it is the last row of the
 * `#root` column (see the `#root` rule in index.css) with
 * `position: sticky; bottom: 0`. Normal flow therefore keeps page content and
 * the footer clear of it, and nothing outside the bar has to be padded — no
 * inline styles are written onto `#root`, `body` or any other element the bar
 * does not own.
 *
 * Flow reservation cannot move viewport-pinned UI (the toast viewport, the
 * sticky back-to-top slot, the fixed sidebar column) or the native scroll-into-view
 * algorithm, so this hook publishes the bar's height once, as the shell-level
 * `--app-bottom-inset` custom property on `<html>`. Consumers read a generic
 * "the shell has N pixels of bottom inset" value and never learn which bar is
 * showing. The property is additive (it overwrites no other element's layout)
 * and is removed again when the bar goes away.
 */
const APP_BOTTOM_INSET_VAR = "--app-bottom-inset";

export function useAppBottomInset(el: HTMLElement | null, active: boolean) {
  useEffect(() => {
    if (!active || !el) return;

    const publish = () => {
      document.documentElement.style.setProperty(APP_BOTTOM_INSET_VAR, `${el.offsetHeight}px`);
    };

    publish();
    // A ResizeObserver (not just a `resize` listener) is what keeps this
    // honest: the bar re-renders at a different height on some viewport
    // changes, and a resize handler measures BEFORE React commits that change.
    const observer = new ResizeObserver(publish);
    observer.observe(el);

    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty(APP_BOTTOM_INSET_VAR);
    };
  }, [el, active]);
}

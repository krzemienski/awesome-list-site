import { useEffect, useRef } from "react";

/**
 * Run22 BUG-016 — shared history integration for in-page filter/tab/sort
 * state that is mirrored into the query string.
 *
 * Before this, every page wrote its ?sort=/?tab=/?tags=/?category= sync via
 * history.replaceState, so pressing Back skipped ALL in-page changes and
 * immediately exited the page. Filter/tab/sort changes are now pushed
 * (one history entry per discrete change) and pages subscribe to popstate so
 * Back/Forward visibly reverse/restore each change.
 *
 * Rules of use:
 * - Discrete changes (tab, sort, filter selection) → mode "push" (default).
 * - Continuous input (typing in a search box) → mode "replace" so each
 *   keystroke doesn't become its own history entry.
 * - Write ONLY from user event handlers, never from effects reacting to
 *   popstate — the popstate handler must only set React state, otherwise the
 *   Back entry gets re-pushed and history loops.
 * - wouter's useLocation() is path-only, so params are read/written on
 *   window.location directly (established app pattern).
 */
export function writeFilterParams(
  updates: Record<string, string | null>,
  mode: "push" | "replace" = "push",
): void {
  const params = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(updates)) {
    if (value == null || value === "") params.delete(key);
    else params.set(key, value);
  }
  const qs = params.toString();
  const next = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
  const current = `${window.location.pathname}${window.location.search}`;
  if (next === current) return; // no-op writes must not stack history entries
  if (mode === "push") window.history.pushState(null, "", next);
  else window.history.replaceState(null, "", next);
}

/**
 * Subscribe to Back/Forward. The handler receives the (new) current query
 * params and should ONLY update React state from them.
 */
export function usePopstateParams(
  handler: (params: URLSearchParams) => void,
): void {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const onPop = () => ref.current(new URLSearchParams(window.location.search));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
}

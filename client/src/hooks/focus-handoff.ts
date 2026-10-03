// C6-SWEEP: a control that unmounts (or is replaced) because of its own
// activation must hand keyboard focus to something, or it falls to <body>.

/** Focus an element that may not be naturally focusable (headings, regions). */
export function focusElement(el: HTMLElement | null | undefined): boolean {
  if (!el || !el.isConnected) return false;
  if (
    !el.hasAttribute("tabindex") &&
    !el.matches("a[href], button, input, select, textarea, [contenteditable]")
  ) {
    el.setAttribute("tabindex", "-1");
  }
  el.focus();
  return document.activeElement === el;
}

/** The page's h1, falling back to <main id="main">. */
export function focusPageHeading(): boolean {
  const main = document.getElementById("main");
  return focusElement(main?.querySelector<HTMLElement>("h1") ?? main);
}

const SETTLE_MS = 350;
const GIVE_UP_MS = 20000;

/**
 * For a button that stays mounted until an async action succeeds (error-card
 * "Try again", "Start Journey", ...): if it had focus when clicked and later
 * disappears, wait for the DOM to settle (the page typically passes through a
 * loading state first) and, if focus has fallen to <body>, move it to
 * `resolveTarget()` (default: the page h1). Focus the user has since moved
 * elsewhere is never stolen.
 */
export function handoffFocusOnUnmount(
  trigger: HTMLElement | null,
  resolveTarget?: () => HTMLElement | null | undefined,
): void {
  if (!trigger || document.activeElement !== trigger) return;
  let settle: number | undefined;
  const finish = () => {
    observer.disconnect();
    window.clearTimeout(giveUp);
    window.clearTimeout(settle);
  };
  const giveUp = window.setTimeout(finish, GIVE_UP_MS);
  const observer = new MutationObserver(() => {
    if (trigger.isConnected) return;
    window.clearTimeout(settle);
    settle = window.setTimeout(check, SETTLE_MS);
  });
  const check = () => {
    const active = document.activeElement;
    if (active && active !== document.body && active.isConnected) return finish();
    // Still loading: look again shortly.
    if (document.querySelector('#main [aria-busy="true"]')) {
      settle = window.setTimeout(check, SETTLE_MS);
      return;
    }
    finish();
    if (!focusElement(resolveTarget?.())) focusPageHeading();
  };
  observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * C6-VX-03: a card's own "remove" button disappears with its card. Call this
 * on click (before the removal) with the button and a selector matching the
 * same control on every card: if the button vanishes and focus is lost, it
 * moves to the next card's equivalent control, else the previous one, else the
 * page heading.
 */
export function handoffFocusToSiblingControl(trigger: HTMLElement, selector: string): void {
  const peers = Array.from(
    document.querySelectorAll<HTMLElement>(`#main ${selector}`),
  ).filter((el) => el.offsetParent !== null);
  const index = peers.indexOf(trigger);
  if (index < 0) return;
  handoffFocusOnUnmount(trigger, () => {
    const live = (el: HTMLElement) => el.isConnected && el !== trigger;
    return peers.slice(index + 1).find(live) ?? peers.slice(0, index).reverse().find(live);
  });
}

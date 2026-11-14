/**
 * Vite's `__vitePreload` marks each CSS dependency as seen in a module-level map
 * the first time a route chunk imports it, then skips it on every later import.
 * A stylesheet that failed while offline therefore stays in <head> as a dead
 * link, and re-creating the lazy import never requests the file again: the page
 * renders without its stylesheet. A dead link can still report a non-null (empty)
 * `sheet`, so failures are recorded when they happen, through a capturing `error`
 * listener (link errors do not bubble). Before an in-place route retry, each
 * recorded link that is still in the document is replaced by a fresh clone so the
 * browser fetches it again.
 */
const SETTLE_TIMEOUT_MS = 8000;

const failedLinks = new Set<HTMLLinkElement>();
let inFlight: Promise<boolean> | null = null;

if (typeof document !== "undefined") {
  document.addEventListener(
    "error",
    (event) => {
      const target = event.target;
      if (target instanceof HTMLLinkElement && target.rel === "stylesheet") failedLinks.add(target);
    },
    true,
  );
}

/** Resolves true on `load`; false on `error` or timeout, and the clone stays recorded as failed. */
function replaceWithClone(link: HTMLLinkElement): Promise<boolean> {
  const clone = link.cloneNode() as HTMLLinkElement;
  return new Promise<boolean>((resolve) => {
    const finish = (loaded: boolean) => {
      window.clearTimeout(timer);
      if (!loaded) failedLinks.add(clone);
      resolve(loaded);
    };
    const timer = window.setTimeout(() => finish(false), SETTLE_TIMEOUT_MS);
    clone.addEventListener("load", () => finish(true), { once: true });
    clone.addEventListener("error", () => finish(false), { once: true });
    link.replaceWith(clone);
  });
}

/**
 * Resolves true once every re-requested stylesheet has loaded, false when any
 * errored again or timed out; never rejects. Overlapping calls (the `online`
 * event and a Retry click) share one pass so a second call cannot replace the
 * clones the first is still waiting on, nor resolve before they settle.
 */
export function reloadFailedStylesheets(): Promise<boolean> {
  if (inFlight) return inFlight;
  const links = Array.from(failedLinks).filter((link) => link.isConnected);
  const pass = Promise.all(links.map(replaceWithClone)).then((results) => {
    for (const link of links) failedLinks.delete(link);
    return results.every(Boolean);
  });
  inFlight = pass;
  void pass.finally(() => {
    if (inFlight === pass) inFlight = null;
  });
  return pass;
}

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

function replaceWithClone(link: HTMLLinkElement): Promise<void> {
  const clone = link.cloneNode() as HTMLLinkElement;
  return new Promise<void>((resolve) => {
    const timer = window.setTimeout(resolve, SETTLE_TIMEOUT_MS);
    const settle = () => {
      window.clearTimeout(timer);
      resolve();
    };
    clone.addEventListener("load", settle, { once: true });
    clone.addEventListener("error", settle, { once: true });
    link.replaceWith(clone);
  });
}

/** Resolves once every re-requested stylesheet has loaded or failed again; never rejects. */
export async function reloadFailedStylesheets(): Promise<void> {
  const links = Array.from(failedLinks).filter((link) => link.isConnected);
  failedLinks.clear();
  await Promise.all(links.map(replaceWithClone));
}

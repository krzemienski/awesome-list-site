/**
 * Vite's `__vitePreload` marks each CSS dependency as seen in a module-level map
 * the first time a route chunk imports it, then skips it on every later import.
 * A chunk that failed while offline therefore leaves its `<link rel=stylesheet>`
 * in <head> with no sheet, and re-creating the lazy import never requests the
 * file again: the page renders without its stylesheet. Before an explicit
 * in-place retry, replace each stylesheet link that never produced a sheet with
 * a fresh clone so the browser fetches it again.
 */
const SETTLE_TIMEOUT_MS = 8000;

function failedStylesheetLinks(): HTMLLinkElement[] {
  return Array.from(
    document.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]'),
  ).filter((link) => link.sheet === null);
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
  await Promise.all(failedStylesheetLinks().map(replaceWithClone));
}

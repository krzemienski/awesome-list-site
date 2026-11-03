/**
 * The one import of the command palette chunk. React.lazy (App.tsx) and every
 * preload share this factory, so the browser fetches the chunk once and a
 * preload that is still in flight is the same promise the lazy component waits
 * on.
 */
export const loadSearchDialog = () => import("@/components/ui/search-dialog");

/** Start fetching the palette chunk. A failure is swallowed here: the lazy
 * wrapper retries the import itself when the palette is actually opened. */
export function preloadSearchDialog(): void {
  loadSearchDialog().catch(() => undefined);
}

/** Focus the element that opened the palette. A disconnected or body opener
 * (the palette was opened from an element that has since unmounted) falls
 * through to the visible header search trigger. Returns whether focus moved. */
export function focusPaletteOpener(opener: HTMLElement | null): boolean {
  const target =
    opener?.isConnected && opener !== document.body
      ? opener
      : Array.from(
          document.querySelectorAll<HTMLElement>(
            'button.header-search-trigger, button[aria-label="Search resources"], button[aria-label="Search"]',
          ),
        ).find((element) => element.getClientRects().length > 0);
  if (!target?.isConnected) return false;
  target.focus();
  return true;
}

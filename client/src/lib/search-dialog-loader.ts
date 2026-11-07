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

/** Search request captured by the inline script in index.html before React
 * mounted: Ctrl/Cmd+K or "/" plus the keys typed after it. */
export interface PendingPalette {
  open: boolean;
  draft: string;
  method: "keyboard_shortcut" | "slash_key";
}

declare global {
  interface Window {
    __awvPendingPalette?: PendingPalette;
    __awvStopPaletteCapture?: () => void;
  }
}

/** Remove the pre-hydration key listener; React's own handler takes over. */
export function stopPalettePrehydrationCapture(): void {
  window.__awvStopPaletteCapture?.();
}

/** The request captured before hydration, if any. Stops the capture. */
export function takePendingPalette(): PendingPalette | undefined {
  stopPalettePrehydrationCapture();
  const pending = window.__awvPendingPalette;
  if (!pending?.open) return undefined;
  // Consumed: a second read (remount, StrictMode) must not open it again. The
  // draft stays for SearchPalette until clearPendingPalette.
  window.__awvPendingPalette = { ...pending, open: false };
  return pending;
}

/** Drop the captured request once the palette has taken its draft. */
export function clearPendingPalette(): void {
  window.__awvPendingPalette = undefined;
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

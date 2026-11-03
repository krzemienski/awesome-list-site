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

import type { CommandPaletteOpenMethod } from "./analytics";

/** Window event MainLayout listens for to open the global search palette. */
export const OPEN_SEARCH_PALETTE_EVENT = "awesome:open-search-palette";

export interface OpenSearchPaletteDetail {
  method: CommandPaletteOpenMethod;
  /** Page that offered the entry (command_palette_opened `surface`). */
  surface?: string;
}

/** Opens the search palette from a page-level control. */
export function openSearchPalette(detail: OpenSearchPaletteDetail): void {
  window.dispatchEvent(new CustomEvent<OpenSearchPaletteDetail>(OPEN_SEARCH_PALETTE_EVENT, { detail }));
}

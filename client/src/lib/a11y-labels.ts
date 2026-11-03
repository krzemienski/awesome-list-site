/** Locale-formatted count shown in tile chips; the tile's aria-label uses the same text. */
export function formatTileCount(count: number): string {
  return count.toLocaleString();
}

/** Accessible name for a taxonomy/tag tile: "<name>, N resource(s)[, category total]". */
export function tileLabel(name: string, count: number, categoryTotal = false): string {
  return `${name}, ${formatTileCount(count)} ${count === 1 ? "resource" : "resources"}${categoryTotal ? ", category total" : ""}`;
}

/** Accessible name of a bookmark toggle; shared by cards and the resource page. */
export function bookmarkAriaLabel(isBookmarked: boolean, isAuthenticated: boolean, resourceTitle?: string): string {
  // Bookmarks work without an account while favorites do not, so the label
  // says where the bookmark lives.
  const base = isBookmarked
    ? (isAuthenticated ? "Remove bookmark" : "Remove bookmark saved on this device")
    : (isAuthenticated ? "Add bookmark" : "Bookmark on this device — no sign-in required");
  return resourceTitle ? `${base}: ${resourceTitle}` : base;
}

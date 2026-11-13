/** Locale-formatted count shown in tile chips; the tile's aria-label uses the same text. */
export function formatTileCount(count: number): string {
  return count.toLocaleString();
}

/** "N resource(s)": the count with its unit, for names and hover titles. */
export function resourceCountLabel(count: number): string {
  return `${formatTileCount(count)} ${count === 1 ? "resource" : "resources"}`;
}

/**
 * Accessible name for a link showing "<name> <count>": starts with that exact
 * visible text (WCAG 2.5.3 Label in Name) and adds the unit after it.
 */
export function countedName(name: string, count: number): string {
  return `${name} ${resourceCountLabel(count)}`;
}

/** Accessible name for a taxonomy/tag tile: "<name> N resource(s)[, category total]". */
export function tileLabel(name: string, count: number, categoryTotal = false): string {
  return `${countedName(name, count)}${categoryTotal ? ", category total" : ""}`;
}

/**
 * Accessible name for a text toggle: the visible words first, then the extra
 * explanation. The pressed state is carried by aria-pressed, not by the name.
 */
export function labeledToggleName(visibleText: string, hint?: string): string {
  return hint ? `${visibleText} — ${hint}` : visibleText;
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

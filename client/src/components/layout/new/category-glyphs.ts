/*
 * The V2 navigation uses category glyphs as taxonomy markers (sidebar rows,
 * compact rail, and the page footer's EXPLORE column). They are decorative:
 * every category link already carries an explicit accessible name.
 */
const CATEGORY_GLYPHS: Record<string, string> = {
  "Community & Events": "◈",
  "Encoding & Codecs": "◇",
  "General Tools": "◆",
  "Infrastructure & Delivery": "▣",
  "Intro & Learning": "▤",
  "Media Tools": "▥",
  "Players & Clients": "▶",
  "Protocols & Transport": "⟁",
  "Standards & Industry": "◉",
};

export function getCategoryGlyph(categoryName: string): string {
  return CATEGORY_GLYPHS[categoryName] ?? "◈";
}

/** Single presentation mapping for every public and admin category surface. */
export const CATEGORY_GLYPHS: Record<string, string> = {
  "community-events": "◈",
  "encoding-codecs": "◇",
  "general-tools": "◆",
  "infrastructure-delivery": "▣",
  "intro-learning": "▤",
  "media-tools": "▥",
  "players-clients": "▶",
  "protocols-transport": "⟁",
  "standards-industry": "◉",
};

export function categoryGlyph(category?: string | null): string {
  const slug = (category ?? "").trim().toLowerCase().replace(/&/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return CATEGORY_GLYPHS[slug] ?? "◆";
}

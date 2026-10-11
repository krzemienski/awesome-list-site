/*
 * The V2 navigation uses category glyphs as taxonomy markers (sidebar rows,
 * compact rail, and the page footer's EXPLORE column). They are decorative:
 * every category link already carries an explicit accessible name.
 *
 * Values come from the one shared map (@/lib/category-glyph) so the sidebar,
 * footer, home cards and resource chip can never disagree; this wrapper only
 * keeps the navigation's historical fallback for an unknown category.
 */
import { CATEGORY_GLYPHS, categorySlug } from "@/lib/category-glyph";

export function getCategoryGlyph(categoryName: string): string {
  return CATEGORY_GLYPHS[categorySlug(categoryName)] ?? "◈";
}

/**
 * Category glyph fallback faces (scripts/build-category-glyph-font.mjs).
 *
 * The category marks are absent from every web font the site loads, so each
 * loaded family is extended with a same-origin glyph face per declared
 * weight/style. Two drifts would silently bring back the empty boxes:
 *  - a glyph added to client/src/lib/category-glyph.ts that the generated
 *    fonts do not contain;
 *  - a family/weight added to a css2 URL with no matching glyph face
 *    (Chromium only consults faces in the exact weight/style group).
 * Pure file checks — no browser, DB or server.
 */
import { describe, expect, it } from "vitest";
import * as glyphFontScript from "../../scripts/build-category-glyph-font.mjs";
import { CATEGORY_GLYPHS } from "../../client/src/lib/category-glyph";

interface Css2Face { family: string; style: string; weight: string }
const { checkCategoryGlyphFaces, glyphCodepoints, parseCss2Faces, unicodeRange } = glyphFontScript as unknown as {
  checkCategoryGlyphFaces: () => string[];
  glyphCodepoints: () => number[];
  parseCss2Faces: (href: string) => Css2Face[];
  unicodeRange: (codepoints: number[]) => string;
};

describe("category glyph faces", () => {
  it("cover every glyph in the shared map", () => {
    const covered = new Set(glyphCodepoints());
    for (const glyph of Object.values(CATEGORY_GLYPHS)) {
      expect(covered.has(glyph.codePointAt(0)!)).toBe(true);
    }
    expect(covered.has(0x27c1)).toBe(true);
  });

  it("are generated from the current glyph map and css2 URLs", () => {
    expect(checkCategoryGlyphFaces()).toEqual([]);
  });

  it("parse css2 axis tuples into exact weight/style pairs", () => {
    expect(parseCss2Faces("https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;700&display=swap"))
      .toEqual([
        { family: "Instrument Serif", style: "normal", weight: "400" },
        { family: "Instrument Serif", style: "italic", weight: "400" },
        { family: "Inter", style: "normal", weight: "400" },
        { family: "Inter", style: "normal", weight: "700" },
      ]);
    expect(unicodeRange([0x25a3, 0x25a4, 0x25a5, 0x25b6, 0x27c1])).toBe("U+25A3-25A5, U+25B6, U+27C1");
  });
});

#!/usr/bin/env node
/**
 * Category glyph fallback faces.
 *
 * The category marks (◈ ◇ ◆ ▣ ▤ ▥ ▶ ⟁ ◉ — client/src/lib/category-glyph.ts) are
 * not in any of the site's web fonts, so the browser falls back to whatever
 * symbol font the device happens to have. ⟁ (U+27C1) is missing from most
 * of them and painted as an empty box (seen in the repo's headless Chromium).
 *
 * Fix without touching a font stack (the stacks are verbatim design tokens):
 * every family the site loads from Google Fonts is EXTENDED with one more
 * @font-face per declared style/weight, restricted by `unicode-range` to the
 * glyph codepoints and served same-origin. A family is the union of its faces,
 * so the glyphs now resolve inside the first family of every stack, wherever a
 * mark is rendered, while every other character keeps its Google face and the
 * line box keeps its strut (the glyph faces contain no space).
 *
 * Chromium groups a family's faces by exact (weight, style); a glyph face is
 * only consulted for text whose matched group contains it — a single 400 face
 * leaves bold text on tofu. That is why the faces mirror every weight/style
 * pair the css2 URLs request, and why --check fails when they drift.
 *
 * Three subsets keep the marks looking like they did on a Linux machine with
 * DejaVu: geometric shapes come from DejaVu Sans / Sans Mono / Serif (sans,
 * mono and serif stacks fell back to those), and ⟁ — which none of them has —
 * comes from Noto Sans Math, scaled onto DejaVu's △ box.
 *
 * Usage:
 *   node scripts/build-category-glyph-font.mjs           # rewrite fonts + CSS
 *   node scripts/build-category-glyph-font.mjs --css     # rewrite CSS only
 *   node scripts/build-category-glyph-font.mjs --check   # verify, write nothing
 * Font sources: DEJAVU_DIR (default /usr/share/fonts/truetype/dejavu) and
 * NOTO_MATH_OTF (default: the Nix store's noto-fonts NotoSansMath-Regular.otf).
 * --check reports stale CSS or fonts without writing.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GLYPH_SOURCE = path.join(ROOT, "client/src/lib/category-glyph.ts");
const INDEX_HTML = path.join(ROOT, "client/index.html");
const FONT_OPTIONS = path.join(ROOT, "client/src/lib/font-options.ts");
const FONT_DIR = path.join(ROOT, "client/src/assets/fonts");
const CSS_OUT = path.join(ROOT, "client/src/styles/category-glyph-faces.css");

export const GLYPH_VARIANTS = ["sans", "mono", "serif"];

/** Which DejaVu face each loaded family fell back to. Unknown families fail. */
export const FAMILY_VARIANT = {
  Inter: "sans",
  Geist: "sans",
  "Space Grotesk": "sans",
  "IBM Plex Sans": "sans",
  Manrope: "sans",
  "DM Sans": "sans",
  "Source Sans 3": "sans",
  "JetBrains Mono": "mono",
  "IBM Plex Mono": "mono",
  Fraunces: "serif",
  "Instrument Serif": "serif",
};

export const fontFileName = (variant) => `category-glyphs-${variant}.otf`;

/** Every codepoint the shared glyph map (values + fallbacks) can render. */
export function glyphCodepoints(source = fs.readFileSync(GLYPH_SOURCE, "utf8")) {
  const codepoints = new Set();
  for (const [, literal] of source.matchAll(/"([^"]+)"/g)) {
    const chars = [...literal];
    if (chars.every((char) => char.codePointAt(0) > 0x7f)) for (const char of chars) codepoints.add(char.codePointAt(0));
  }
  if (codepoints.size === 0) throw new Error(`no glyph literals found in ${GLYPH_SOURCE}`);
  return [...codepoints].sort((a, b) => a - b);
}

/** CSS unicode-range, merging consecutive codepoints. */
export function unicodeRange(codepoints) {
  const hex = (cp) => cp.toString(16).toUpperCase().padStart(4, "0");
  const parts = [];
  for (let i = 0; i < codepoints.length; i += 1) {
    let j = i;
    while (j + 1 < codepoints.length && codepoints[j + 1] === codepoints[j] + 1) j += 1;
    parts.push(i === j ? `U+${hex(codepoints[i])}` : `U+${hex(codepoints[i])}-${hex(codepoints[j])}`);
    i = j;
  }
  return parts.join(", ");
}

/** (family, style, weight) triples a Google Fonts css2 URL declares. */
export function parseCss2Faces(href) {
  const url = new URL(href);
  const faces = [];
  for (const spec of url.searchParams.getAll("family")) {
    const [family, axes] = spec.split(":");
    if (!axes) {
      faces.push({ family, style: "normal", weight: "400" });
      continue;
    }
    const [names, values] = axes.split("@");
    const axisNames = names.split(",");
    for (const tuple of values.split(";")) {
      const value = Object.fromEntries(tuple.split(",").map((v, i) => [axisNames[i], v]));
      faces.push({
        family,
        style: value.ital === "1" ? "italic" : "normal",
        weight: value.wght ?? "400",
      });
    }
  }
  return faces;
}

/** Every css2 URL the site can load: the pre-paint link plus picker overrides. */
export function loadedFontUrls() {
  const html = fs.readFileSync(INDEX_HTML, "utf8");
  const options = fs.readFileSync(FONT_OPTIONS, "utf8");
  const urls = [...html.matchAll(/href="(https:\/\/fonts\.googleapis\.com\/css2\?[^"]+)"/g), ...options.matchAll(/"(https:\/\/fonts\.googleapis\.com\/css2\?[^"]+)"/g)]
    .map((match) => match[1].replace(/&amp;/g, "&"));
  if (urls.length === 0) throw new Error("no Google Fonts css2 URLs found");
  return urls;
}

export function buildFacesCss(urls = loadedFontUrls(), codepoints = glyphCodepoints()) {
  const seen = new Map();
  for (const face of urls.flatMap(parseCss2Faces)) {
    const variant = FAMILY_VARIANT[face.family];
    if (!variant) {
      throw new Error(`no glyph variant for font family "${face.family}" — add it to FAMILY_VARIANT in scripts/build-category-glyph-font.mjs`);
    }
    seen.set(`${face.family}|${face.style}|${face.weight}`, { ...face, variant });
  }
  const range = unicodeRange(codepoints);
  const rules = [...seen.values()]
    .sort((a, b) => a.family.localeCompare(b.family) || a.style.localeCompare(b.style) || Number(a.weight) - Number(b.weight))
    .map((face) => [
      "@font-face {",
      `  font-family: "${face.family}"; /* DS-OK: @font-face descriptor extending a loaded web font with category glyphs, not a font stack. */`,
      `  font-style: ${face.style};`,
      `  font-weight: ${face.weight};`,
      "  font-display: swap;",
      `  src: url("@/assets/fonts/${fontFileName(face.variant)}") format("opentype");`,
      `  unicode-range: ${range};`,
      "}",
    ].join("\n"));
  return [
    "/* GENERATED by scripts/build-category-glyph-font.mjs — do not edit by hand.",
    "   Extends every loaded web font family with the category glyphs",
    "   (client/src/lib/category-glyph.ts) so no device paints them as tofu.",
    "   One face per css2 weight/style: Chromium only consults faces whose",
    "   exact weight/style group matched. */",
    "",
    rules.join("\n\n"),
    "",
  ].join("\n");
}

const loadFont = (file) => {
  const buffer = fs.readFileSync(file);
  return opentype.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
};

/** Codepoints a generated subset actually maps (used by --check and the test). */
export function fontCodepoints(variant) {
  const font = loadFont(path.join(FONT_DIR, fontFileName(variant)));
  const mapped = [];
  for (let i = 0; i < font.glyphs.length; i += 1) {
    const glyph = font.glyphs.get(i);
    for (const unicode of glyph.unicodes ?? []) if (unicode > 0x20) mapped.push(unicode);
  }
  return mapped.sort((a, b) => a - b);
}

/** Problems with the committed CSS + fonts; empty means current. */
export function checkCategoryGlyphFaces() {
  const problems = [];
  const expected = buildFacesCss();
  const actual = fs.existsSync(CSS_OUT) ? fs.readFileSync(CSS_OUT, "utf8") : "";
  if (actual !== expected) problems.push(`${path.relative(ROOT, CSS_OUT)} is stale — run node scripts/build-category-glyph-font.mjs --css`);
  const codepoints = glyphCodepoints();
  for (const variant of GLYPH_VARIANTS) {
    const mapped = new Set(fontCodepoints(variant));
    const missing = codepoints.filter((cp) => !mapped.has(cp)).map((cp) => `U+${cp.toString(16).toUpperCase()}`);
    if (missing.length) problems.push(`${fontFileName(variant)} lacks ${missing.join(", ")} — rebuild the fonts`);
  }
  return problems;
}

function findNotoMath() {
  if (process.env.NOTO_MATH_OTF) return process.env.NOTO_MATH_OTF;
  const store = "/nix/store";
  for (const entry of fs.existsSync(store) ? fs.readdirSync(store) : []) {
    if (!/-noto-fonts-\d/.test(entry)) continue;
    const candidate = path.join(store, entry, "share/fonts/noto/NotoSansMath-Regular.otf");
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error("NotoSansMath-Regular.otf not found — set NOTO_MATH_OTF");
}

const DEJAVU_FILES = { sans: "DejaVuSans.ttf", mono: "DejaVuSansMono.ttf", serif: "DejaVuSerif.ttf" };
const WHITE_TRIANGLE = 0x25b3;

function buildFonts(codepoints) {
  const dejavuDir = process.env.DEJAVU_DIR ?? "/usr/share/fonts/truetype/dejavu";
  const noto = loadFont(findNotoMath());
  const notoTriangle = noto.charToGlyph(String.fromCodePoint(WHITE_TRIANGLE)).getBoundingBox();
  fs.mkdirSync(FONT_DIR, { recursive: true });
  for (const variant of GLYPH_VARIANTS) {
    const base = loadFont(path.join(dejavuDir, DEJAVU_FILES[variant]));
    const target = base.charToGlyph(String.fromCodePoint(WHITE_TRIANGLE));
    const box = target.getBoundingBox();
    const glyphs = [new opentype.Glyph({ name: ".notdef", unicode: 0, advanceWidth: target.advanceWidth, path: new opentype.Path() })];
    for (const cp of codepoints) {
      const char = String.fromCodePoint(cp);
      const own = base.charToGlyph(char);
      if (own.index !== 0) {
        glyphs.push(new opentype.Glyph({ name: own.name ?? `uni${cp.toString(16)}`, unicode: cp, advanceWidth: own.advanceWidth, path: own.path }));
        continue;
      }
      // Not in DejaVu: borrow Noto Sans Math's outline, scaled so Noto's △
      // would land exactly on DejaVu's △ box (width-fit, bottom-aligned, centred).
      const source = noto.charToGlyph(char);
      if (source.index === 0) throw new Error(`U+${cp.toString(16)} is in neither DejaVu nor Noto Sans Math`);
      const scale = (box.x2 - box.x1) / (notoTriangle.x2 - notoTriangle.x1);
      const sb = source.getBoundingBox();
      const dx = (box.x1 + box.x2) / 2 - ((sb.x1 + sb.x2) / 2) * scale;
      const dy = box.y1 - notoTriangle.y1 * scale;
      const out = new opentype.Path();
      for (const c of source.path.commands) {
        const p = { ...c };
        for (const [x, y] of [["x", "y"], ["x1", "y1"], ["x2", "y2"]]) {
          if (x in p) { p[x] = Math.round(p[x] * scale + dx); p[y] = Math.round(p[y] * scale + dy); }
        }
        out.commands.push(p);
      }
      glyphs.push(new opentype.Glyph({ name: `uni${cp.toString(16).toUpperCase()}`, unicode: cp, advanceWidth: target.advanceWidth, path: out }));
    }
    const font = new opentype.Font({
      familyName: `AV Category Glyphs ${variant[0].toUpperCase()}${variant.slice(1)}`,
      styleName: "Regular",
      unitsPerEm: base.unitsPerEm,
      ascender: base.ascender,
      descender: base.descender,
      copyright: "Glyphs from DejaVu fonts (Bitstream Vera derivative; Bitstream Vera Fonts Copyright (c) 2003 Bitstream, Inc.) and Noto Sans Math (Copyright 2022 The Noto Project Authors, SIL Open Font License 1.1). See LICENSE-FONTS.md.",
      glyphs,
    });
    fs.writeFileSync(path.join(FONT_DIR, fontFileName(variant)), Buffer.from(font.toArrayBuffer()));
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = new Set(process.argv.slice(2));
  if (args.has("--check")) {
    const problems = checkCategoryGlyphFaces();
    for (const problem of problems) console.error(`✗ ${problem}`);
    if (problems.length) process.exit(1);
    console.log("✓ category glyph faces are current");
  } else {
    if (!args.has("--css")) buildFonts(glyphCodepoints());
    fs.writeFileSync(CSS_OUT, buildFacesCss());
    console.log(`wrote ${path.relative(ROOT, CSS_OUT)}${args.has("--css") ? "" : ` and ${GLYPH_VARIANTS.map(fontFileName).join(", ")}`}`);
  }
}

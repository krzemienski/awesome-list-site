#!/usr/bin/env node
/**
 * awesome.video brand asset builder
 * ---------------------------------
 * Generates the official brand kit under brand/ from the locked identity:
 *   mark      = "Inverted Monogram" — black rx16 tile, crimson #ff3d52 border,
 *               crimson "AV" (Inter 800), stroke thickens at small sizes.
 *   wordmark  = "awesome" Inter 700 + ".video" Fraunces italic 600 crimson.
 *
 * All SVG text is converted to outlined paths (opentype.js), so every SVG is
 * fully self-contained — no font installation required by consumers.
 * PNGs are rasterized from those outlined SVGs with sharp (librsvg-safe).
 *
 * Fonts: vendored in scripts/brand/fonts/ (Inter 700/800, Fraunces 600 italic —
 * both OFL-licensed) so regenerated assets never drift with Google Fonts
 * updates. Network download to /tmp/brandtools/fonts is only a fallback if the
 * vendored files are missing. Run: node scripts/brand/build-brand-assets.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import opentype from 'opentype.js';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const OUT = path.join(ROOT, 'brand');
const FONT_DIR = '/tmp/brandtools/fonts';
const VENDORED_FONT_DIR = path.join(ROOT, 'scripts', 'brand', 'fonts');

const C = {
  bg: '#000000',
  surface: '#0e0d0c',
  ink: '#f4f3ee',
  muted: '#a8a4a0',
  accent: '#ff3d52',
  accentTint: '#ffb4be',
  accent2: '#b84dff',
  hairline: 'rgba(244,243,238,0.12)',
};

// ---------------------------------------------------------------------------
// Fonts
// ---------------------------------------------------------------------------
const FONT_SOURCES = {
  'i700.ttf': 'https://fonts.googleapis.com/css2?family=Inter:wght@700&display=swap',
  'i800.ttf': 'https://fonts.googleapis.com/css2?family=Inter:wght@800&display=swap',
  'f600i.ttf': 'https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@1,600&display=swap',
};

function fontPath(file) {
  const vendored = path.join(VENDORED_FONT_DIR, file);
  if (fs.existsSync(vendored) && fs.statSync(vendored).size > 10000) return vendored;
  return path.join(FONT_DIR, file);
}

function ensureFonts() {
  fs.mkdirSync(FONT_DIR, { recursive: true });
  for (const [file, cssUrl] of Object.entries(FONT_SOURCES)) {
    const vendored = path.join(VENDORED_FONT_DIR, file);
    if (fs.existsSync(vendored) && fs.statSync(vendored).size > 10000) continue;
    const dest = path.join(FONT_DIR, file);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 10000) continue;
    console.warn(`WARN: vendored font missing (${file}) — falling back to Google Fonts download; regenerated assets may drift if the hosted font has changed.`);
    const css = execFileSync('curl', ['-s', '-A', 'Mozilla/5.0', cssUrl], { encoding: 'utf8' });
    const m = css.match(/https:\/\/[^)]*\.ttf/);
    if (!m) throw new Error(`No TTF URL resolved for ${file}`);
    execFileSync('curl', ['-s', m[0], '-o', dest]);
  }
}

function loadFont(file) {
  const buf = fs.readFileSync(fontPath(file));
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

// ---------------------------------------------------------------------------
// Text outlining helpers
// ---------------------------------------------------------------------------
/**
 * Manual per-glyph layout (charToGlyph + kerning). Avoids font.getPath's
 * shaping engine, which crashes on Inter's ccmp GSUB lookups
 * ("substFormat: 2 is not yet supported"). Latin-only text, no ligatures.
 */
function layoutText(font, text, size, letterSpacingPx = 0) {
  const scale = size / font.unitsPerEm;
  const glyphs = [...text].map((ch) => font.charToGlyph(ch));
  let x = 0;
  const placed = [];
  for (let i = 0; i < glyphs.length; i++) {
    placed.push({ g: glyphs[i], x });
    x += glyphs[i].advanceWidth * scale;
    if (i < glyphs.length - 1) {
      x += font.getKerningValue(glyphs[i], glyphs[i + 1]) * scale;
      x += letterSpacingPx;
    }
  }
  return { placed, width: x };
}

/**
 * Outline `text` at baseline (x, y) → { markup, width }.
 * opentype.js glyph.getPath() non-deterministically emits NaN coordinates
 * (varies with position, size AND accumulated per-font call state), and SVG
 * renderers silently stop drawing a path at the first NaN. So we NEVER let
 * opentype do coordinate math: each glyph's RAW font-unit path (glyph.path —
 * verified NaN-free) is cached on first use, and all scaling/positioning/
 * y-flip happens in an SVG transform. Throws loudly if a raw path has NaN.
 */
const RAW_GLYPH_D = new WeakMap();
function glyphRawD(font, g) {
  let m = RAW_GLYPH_D.get(font);
  if (!m) { m = new Map(); RAW_GLYPH_D.set(font, m); }
  if (!m.has(g.index)) {
    const d = g.path.toPathData(3);
    if (d.includes('NaN')) throw new Error(`NaN in raw path of glyph index ${g.index} (U+${(g.unicode || 0).toString(16)})`);
    m.set(g.index, d);
  }
  return m.get(g.index);
}
function outline(font, text, x, y, size, letterSpacingPx = 0) {
  const { placed, width } = layoutText(font, text, size, letterSpacingPx);
  const s = size / font.unitsPerEm;
  const sx = s.toFixed(6);
  const sy = (-s).toFixed(6);
  const markup = placed
    .map((p) => {
      const d = glyphRawD(font, p.g);
      if (!d) return '';
      return `<path transform="translate(${(x + p.x).toFixed(2)} ${Number(y).toFixed(2)}) scale(${sx} ${sy})" d="${d}"/>`;
    })
    .join('');
  return { markup, width };
}

// ---------------------------------------------------------------------------
// SVG builders
// ---------------------------------------------------------------------------
/** The monogram tile at a 76-unit grid. strokeW: 4 (default), 5 (≤24px), 6 (16px). */
function markSvg(fonts, strokeW = 4, { transparentTile = false } = {}) {
  const size = 34;
  const av = outline(fonts.i800, 'AV', 0, 0, size, -1);
  const x = 38 - av.width / 2;
  const y = 51;
  const glyphs = outline(fonts.i800, 'AV', x, y, size, -1);
  const inset = strokeW / 2;
  const side = 76 - strokeW;
  const rx = 16;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 76 76">
  <rect x="${inset}" y="${inset}" width="${side}" height="${side}" rx="${rx}" fill="${transparentTile ? 'none' : '#000000'}" stroke="${C.accent}" stroke-width="${strokeW}"/>
  <g fill="${C.accent}">${glyphs.markup}</g>
</svg>
`;
}

/** Wordmark: "awesome" Inter 700 + ".video" Fraunces italic 600 crimson. */
function wordmarkParts(fonts, size, inkColor) {
  const lsA = -0.023 * size; // ≈ -0.5px @ 22px, scaled
  const a = outline(fonts.i700, 'awesome', 0, 0, size, lsA);
  const v = outline(fonts.f600i, '.video', 0, 0, size, 0);
  return { a, v, lsA, inkColor };
}

function wordmarkSvg(fonts, inkColor = C.ink) {
  const size = 48;
  const upm = { asc: fonts.i700.ascender / fonts.i700.unitsPerEm, desc: fonts.i700.descender / fonts.i700.unitsPerEm };
  const baseline = Math.ceil(size * upm.asc);
  const height = Math.ceil(size * (upm.asc - upm.desc));
  const { a, v } = wordmarkParts(fonts, size, inkColor);
  const gap = size * 0.02;
  const aPath = outline(fonts.i700, 'awesome', 0, baseline, size, -0.023 * size);
  const vPath = outline(fonts.f600i, '.video', a.width + gap, baseline, size, 0);
  const width = Math.ceil(a.width + gap + v.width);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
  <g fill="${inkColor}">${aPath.markup}</g>
  <g fill="${C.accent}">${vPath.markup}</g>
</svg>
`;
}

/** Horizontal lockup: 76-unit tile + gap + wordmark, baseline-aligned. */
function lockupHorizontalSvg(fonts, inkColor = C.ink) {
  const strokeW = 4;
  const inset = strokeW / 2;
  const side = 76 - strokeW;
  const avSize = 34;
  const av = outline(fonts.i800, 'AV', 0, 0, avSize, -1);
  const avGlyphs = outline(fonts.i800, 'AV', 38 - av.width / 2, 51, avSize, -1);
  const gap = 26;
  const wSize = 42;
  const baseline = 51;
  const lsA = -0.023 * wSize;
  const aAdv = outline(fonts.i700, 'awesome', 0, 0, wSize, lsA).width;
  const aPath = outline(fonts.i700, 'awesome', 76 + gap, baseline, wSize, lsA);
  const wGap = wSize * 0.02;
  const vPath = outline(fonts.f600i, '.video', 76 + gap + aAdv + wGap, baseline, wSize, 0);
  const vAdv = outline(fonts.f600i, '.video', 0, 0, wSize, 0).width;
  const width = Math.ceil(76 + gap + aAdv + wGap + vAdv + 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 76">
  <rect x="${inset}" y="${inset}" width="${side}" height="${side}" rx="16" fill="#000000" stroke="${C.accent}" stroke-width="${strokeW}"/>
  <g fill="${C.accent}">${avGlyphs.markup}</g>
  <g fill="${inkColor}">${aPath.markup}</g>
  <g fill="${C.accent}">${vPath.markup}</g>
</svg>
`;
}

/** Stacked lockup: mark on top, wordmark centered below. */
function lockupStackedSvg(fonts, inkColor = C.ink) {
  const strokeW = 4;
  const inset = strokeW / 2;
  const side = 76 - strokeW;
  const avSize = 34;
  const av = outline(fonts.i800, 'AV', 0, 0, avSize, -1);
  const wSize = 28;
  const lsA = -0.023 * wSize;
  const aAdv = outline(fonts.i700, 'awesome', 0, 0, wSize, lsA).width;
  const wGap = wSize * 0.02;
  const vAdv = outline(fonts.f600i, '.video', 0, 0, wSize, 0).width;
  const wordW = aAdv + wGap + vAdv;
  const width = Math.ceil(Math.max(76, wordW) + 2);
  const tileX = (width - 76) / 2;
  const baseline = 76 + 24 + wSize * 0.72;
  const height = Math.ceil(baseline + wSize * 0.28);
  const wordX = (width - wordW) / 2;
  const avGlyphs = outline(fonts.i800, 'AV', tileX + 38 - av.width / 2, 51, avSize, -1);
  const aPath = outline(fonts.i700, 'awesome', wordX, baseline, wSize, lsA);
  const vPath = outline(fonts.f600i, '.video', wordX + aAdv + wGap, baseline, wSize, 0);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
  <rect x="${tileX + inset}" y="${inset}" width="${side}" height="${side}" rx="16" fill="#000000" stroke="${C.accent}" stroke-width="${strokeW}"/>
  <g fill="${C.accent}">${avGlyphs.markup}</g>
  <g fill="${inkColor}">${aPath.markup}</g>
  <g fill="${C.accent}">${vPath.markup}</g>
</svg>
`;
}

/** Social banner: black + crimson glow + centered lockup + Fraunces tagline. */
function bannerSvg(fonts, W, H, tagline) {
  const lock = lockupHorizontalSvg(fonts);
  const lockW = Number(lock.match(/viewBox="0 0 (\d+) 76"/)[1]);
  // Height-driven scale, capped so the lockup never exceeds 78% of the width
  // (square / portrait templates: IG post, IG story, YouTube thumbnail).
  const scale = Math.min((H / 500) * 1.9, (W * 0.78) / lockW);
  const lw = lockW * scale;
  const lh = 76 * scale;
  const lx = (W - lw) / 2;
  const ly = H / 2 - lh / 2 - (tagline ? Math.min(H * 0.06, lh * 0.5) : 0);
  const inner = lock.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  let tag = '';
  if (tagline) {
    let tSize = Math.max(18, Math.round(Math.min(H * 0.048, lh * 0.3)));
    let lsT = tSize * 0.28;
    let tAdv = outline(fonts.f600i, tagline, 0, 0, tSize, lsT).width;
    // Fit: shrink until the tracked-out tagline fits in 88% of the width
    // (narrow/portrait formats like the IG story template).
    const maxW = W * 0.88;
    if (tAdv > maxW) {
      tSize = Math.max(12, Math.floor((tSize * maxW) / tAdv));
      lsT = tSize * 0.28;
      tAdv = outline(fonts.f600i, tagline, 0, 0, tSize, lsT).width;
    }
    const tPath = outline(fonts.f600i, tagline, (W - tAdv) / 2, ly + lh + Math.min(H * 0.14, lh * 0.9), tSize, lsT);
    tag = `<g fill="${C.accentTint}" opacity="0.92">${tPath.markup}</g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="glow" cx="18%" cy="22%" r="70%">
      <stop offset="0%" stop-color="${C.accent}" stop-opacity="0.26"/>
      <stop offset="55%" stop-color="${C.accent}" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="${C.accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#000000"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <g transform="translate(${lx.toFixed(1)},${ly.toFixed(1)}) scale(${scale.toFixed(4)})">${inner}</g>
  ${tag}
</svg>
`;
}

/** Square icon canvas (black bg) with the mark centered at `ratio` of the box. */
function iconSvg(fonts, box, ratio, strokeW) {
  const mark = markSvg(fonts, strokeW);
  const inner = mark.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const s = (box * ratio) / 76;
  const off = (box - 76 * s) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${box} ${box}">
  <rect width="${box}" height="${box}" fill="#000000"/>
  <g transform="translate(${off.toFixed(1)},${off.toFixed(1)}) scale(${s.toFixed(4)})">${inner}</g>
</svg>
`;
}

// ---------------------------------------------------------------------------
// Raster helpers
// ---------------------------------------------------------------------------
async function svgToPng(svg, widthPx, dest) {
  const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const [w, h] = [Number(vb[1]), Number(vb[2])];
  const density = (widthPx / w) * 72;
  await sharp(Buffer.from(svg), { density }).resize(widthPx, Math.round((h / w) * widthPx)).png().toFile(dest);
}

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------
const TOKENS = {
  color: {
    bg: { value: C.bg, oklch: 'oklch(0 0 0)', role: 'Page background — pure black only' },
    surface: { value: C.surface, oklch: 'oklch(0.17 0.003 84)', role: 'Cards / raised surfaces' },
    ink: { value: C.ink, oklch: 'oklch(0.962 0.005 106)', role: 'Primary text (19.9:1 on bg, AAA)' },
    muted: { value: C.muted, oklch: 'oklch(0.723 0.008 84)', role: 'Secondary text (9.4:1 on bg, AAA)' },
    accent: { value: C.accent, oklch: 'oklch(0.65 0.23 18)', role: 'Crimson — action + identity (5.5:1 on bg, AA large/UI)' },
    'accent-tint': { value: C.accentTint, oklch: 'oklch(0.82 0.10 12)', role: 'Crimson tint — small crimson text on dark (11.2:1, AAA)' },
    'accent-2': { value: C.accent2, oklch: 'oklch(0.62 0.27 305)', role: 'Violet — rare seasoning (4.9:1, AA)' },
    hairline: { value: C.hairline, oklch: '—', role: 'Borders / dividers — depth without shadows' },
    ok: { value: '#34d08c', oklch: 'oklch(0.75 0.15 163)', role: 'Status: ok' },
    bad: { value: '#ff5c7a', oklch: 'oklch(0.68 0.21 12)', role: 'Status: bad' },
    warn: { value: '#ffb84d', oklch: 'oklch(0.82 0.14 74)', role: 'Status: warn' },
    info: { value: '#5eddf2', oklch: 'oklch(0.85 0.10 205)', role: 'Status: info' },
  },
  font: {
    sans: { value: "'Inter', 'Helvetica Neue', sans-serif", role: 'Titles 700/800 (tight tracking at display sizes), body 400/500' },
    display: { value: "'Fraunces', 'Times New Roman', serif", role: 'Italic 500/600 — eyebrows + editorial accents only, never body' },
    mono: { value: "'JetBrains Mono', monospace", role: 'Code, data, numerals, chips' },
  },
  radius: {
    card: { value: '14px', role: 'Cards and surfaces' },
    logo: { value: '16/76 of tile size', role: 'Logo tile corner radius' },
  },
  logo: {
    grid: '76-unit square',
    tile: 'x=2 y=2 w=72 h=72 rx=16 fill #000000 stroke #ff3d52',
    stroke: { default: 4, at24px: 5, at16px: 6 },
    monogram: "'AV' Inter 800 @ 34/76, letter-spacing -1/34em, fill #ff3d52, baseline y=51",
    clearspace: '0.5 × tile width on all sides',
    minSize: '16px (favicon stroke compensation applies)',
  },
};

function brandCss() {
  const lines = Object.entries(TOKENS.color)
    .map(([k, v]) => `  --brand-${k}: ${v.value};${v.oklch !== '—' ? ` /* ${v.oklch} */` : ''}`)
    .join('\n');
  return `/* awesome.video brand tokens — generated by scripts/brand/build-brand-assets.mjs
 * Mirrors client/src/styles/design-system.css (Editorial + Crimson). Do not
 * hand-edit values here without updating the design system, and vice versa. */
:root {
${lines}
  --brand-font-sans: ${TOKENS.font.sans.value};
  --brand-font-display: ${TOKENS.font.display.value};
  --brand-font-mono: ${TOKENS.font.mono.value};
  --brand-radius-card: ${TOKENS.radius.card.value};
}
`;
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------
async function main() {
  ensureFonts();
  const fonts = { i700: loadFont('i700.ttf'), i800: loadFont('i800.ttf'), f600i: loadFont('f600i.ttf') };

  const dirs = ['logo/svg', 'logo/png', 'favicon', 'social', 'tokens'].map((d) => path.join(OUT, d));
  dirs.forEach((d) => fs.mkdirSync(d, { recursive: true }));

  // --- SVG masters (outlined, self-contained) ---
  const svg = {
    mark: markSvg(fonts, 4),
    markSmall: markSvg(fonts, 5),
    markFavicon: markSvg(fonts, 6),
    wordmark: wordmarkSvg(fonts, C.ink),
    wordmarkLightBg: wordmarkSvg(fonts, '#0e0d0c'),
    lockupH: lockupHorizontalSvg(fonts, C.ink),
    lockupHLightBg: lockupHorizontalSvg(fonts, '#0e0d0c'),
    lockupStacked: lockupStackedSvg(fonts, C.ink),
  };
  const svgFiles = {
    'logo/svg/mark.svg': svg.mark,
    'logo/svg/mark-small.svg': svg.markSmall,
    'logo/svg/mark-favicon.svg': svg.markFavicon,
    'logo/svg/wordmark.svg': svg.wordmark,
    'logo/svg/wordmark-light-bg.svg': svg.wordmarkLightBg,
    'logo/svg/lockup-horizontal.svg': svg.lockupH,
    'logo/svg/lockup-horizontal-light-bg.svg': svg.lockupHLightBg,
    'logo/svg/lockup-stacked.svg': svg.lockupStacked,
  };
  for (const [rel, content] of Object.entries(svgFiles)) fs.writeFileSync(path.join(OUT, rel), content);

  // --- Logo PNG exports (transparent) ---
  await svgToPng(svg.mark, 76, path.join(OUT, 'logo/png/mark-76.png'));
  await svgToPng(svg.mark, 152, path.join(OUT, 'logo/png/mark-152.png'));
  await svgToPng(svg.mark, 228, path.join(OUT, 'logo/png/mark-228.png'));
  await svgToPng(svg.mark, 512, path.join(OUT, 'logo/png/mark-512.png'));
  await svgToPng(svg.lockupH, 480, path.join(OUT, 'logo/png/lockup-horizontal-1x.png'));
  await svgToPng(svg.lockupH, 960, path.join(OUT, 'logo/png/lockup-horizontal-2x.png'));
  await svgToPng(svg.lockupH, 1440, path.join(OUT, 'logo/png/lockup-horizontal-3x.png'));
  await svgToPng(svg.lockupStacked, 300, path.join(OUT, 'logo/png/lockup-stacked-1x.png'));
  await svgToPng(svg.lockupStacked, 600, path.join(OUT, 'logo/png/lockup-stacked-2x.png'));
  await svgToPng(svg.lockupStacked, 900, path.join(OUT, 'logo/png/lockup-stacked-3x.png'));

  // --- Favicons ---
  fs.writeFileSync(path.join(OUT, 'favicon/favicon.svg'), svg.markFavicon);
  const favSizes = [16, 32, 48];
  const favPngs = [];
  for (const s of favSizes) {
    const dest = path.join(OUT, `favicon/favicon-${s}.png`);
    await svgToPng(s <= 16 ? svg.markFavicon : s <= 32 ? svg.markSmall : svg.mark, s, dest);
    favPngs.push(dest);
  }
  fs.writeFileSync(path.join(OUT, 'favicon/favicon.ico'), await pngToIco(favPngs));
  await svgToPng(iconSvg(fonts, 180, 0.72, 4), 180, path.join(OUT, 'favicon/apple-touch-icon.png'));
  await svgToPng(iconSvg(fonts, 192, 0.72, 4), 192, path.join(OUT, 'favicon/icon-192.png'));
  await svgToPng(iconSvg(fonts, 512, 0.72, 4), 512, path.join(OUT, 'favicon/icon-512.png'));

  // --- Social ---
  const TAGLINE = 'The index for people who ship video';
  const banners = {
    'banner-x-1500x500': bannerSvg(fonts, 1500, 500, TAGLINE),
    'banner-github-1280x640': bannerSvg(fonts, 1280, 640, TAGLINE),
    'banner-youtube-2560x1440': bannerSvg(fonts, 2560, 1440, TAGLINE),
    'banner-linkedin-1584x396': bannerSvg(fonts, 1584, 396, TAGLINE),
    'template-ig-post-1080x1080': bannerSvg(fonts, 1080, 1080, TAGLINE),
    'template-ig-story-1080x1920': bannerSvg(fonts, 1080, 1920, TAGLINE),
    'template-youtube-thumb-1280x720': bannerSvg(fonts, 1280, 720, TAGLINE),
  };
  await svgToPng(iconSvg(fonts, 512, 0.66, 4), 512, path.join(OUT, 'social/avatar-512.png'));
  for (const [name, s] of Object.entries(banners)) {
    fs.writeFileSync(path.join(OUT, `social/${name}.svg`), s);
    await svgToPng(s, Number(name.match(/(\d+)x\d+$/)[1]), path.join(OUT, `social/${name}.png`));
  }

  // --- Tokens ---
  fs.writeFileSync(path.join(OUT, 'tokens/tokens.json'), JSON.stringify(TOKENS, null, 2) + '\n');
  fs.writeFileSync(path.join(OUT, 'tokens/brand.css'), brandCss());

  console.log('Brand kit written to brand/');
}

main().catch((e) => { console.error(e); process.exit(1); });

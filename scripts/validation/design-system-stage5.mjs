// Shared stage-5 detectors and DS-OK parsing helpers.
//
// Keep this logic in one place so the client palette ratchet and standalone
// artifact checks agree about what counts as a hardcoded value and a written
// exception reason.

export const DS_OK_LOOKBACK = 5;
export const DS_OK_RE = /DS-OK\b/g;
export const PALETTE_RE = /\b(bg|text|border(?:-[xytrblse])?|ring|fill|stroke|from|via|to|divide|outline|decoration|shadow|accent|caret|placeholder|ring-offset|inset-ring|inset-shadow)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}\b/g;
export const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g;
export const RGB_RE = /\brgba?\(\s*(?:[^()]|\([^()]*\))*\)/gi;
export const RADII_RE = /border(-radius)?:\s*\d+px|rounded-\[\d+px\]/g;
export const FONT_RE = /font-family:\s*(?:'[^'\n]*'|"[^"\n]*")(?:\s*,\s*(?:'[^'\n]*'|"[^"\n]*"|[-\w ]+))*/gi;

function dsOkReasonText(line, markerStart, markerEnd) {
  const blockStart = line.lastIndexOf('/*', markerStart);
  const blockEndBefore = line.lastIndexOf('*/', markerStart);
  if (blockStart > blockEndBefore) {
    const blockEnd = line.indexOf('*/', markerEnd);
    return line.slice(markerEnd, blockEnd === -1 ? line.length : blockEnd);
  }
  return line.slice(markerEnd);
}

function dsOkTagHasReason(line, markerStart, markerEnd) {
  return /[^\p{P}\s]/u.test(dsOkReasonText(line, markerStart, markerEnd));
}

export function lineHasReasonedDsOkTag(line) {
  return [...line.matchAll(DS_OK_RE)].some((match) =>
    dsOkTagHasReason(line, match.index, match.index + match[0].length),
  );
}

export function lineHasBareDsOkTag(line) {
  return [...line.matchAll(DS_OK_RE)].some((match) =>
    !dsOkTagHasReason(line, match.index, match.index + match[0].length),
  );
}

export function hasDsOkTag(lines, i) {
  for (let j = Math.max(0, i - DS_OK_LOOKBACK); j <= i; j++) {
    if (lineHasReasonedDsOkTag(lines[j])) return true;
  }
  return false;
}

export function hasBareDsOkTag(lines, i) {
  for (let j = Math.max(0, i - DS_OK_LOOKBACK); j <= i; j++) {
    if (lineHasBareDsOkTag(lines[j])) return true;
  }
  return false;
}

// A raw #… token is a COLOR candidate (vs a "Task #307" issue reference)
// when it has 6 or 8 hex digits, or 3–4 digits containing a hex letter.
// 3–4 all-numeric tokens (#307, #4181) are issue refs, not colors.
export function hexTokenIsColor(token) {
  const digits = token.slice(1);
  if (digits.length === 6 || digits.length === 8) return true;
  if ((digits.length === 3 || digits.length === 4) && /[a-fA-F]/.test(digits)) return true;
  return false;
}

const normalizeWs = (s) => s.replace(/\s+/g, ' ');

export function paletteLineTokens(lines, i) {
  return [...lines[i].matchAll(PALETTE_RE)].map((m) => m[0]);
}

export function hexLineTokens(lines, i) {
  const tokens = [...lines[i].matchAll(HEX_RE)].map((m) => m[0]).filter(hexTokenIsColor);
  if (!tokens.length || hasDsOkTag(lines, i)) return [];
  return tokens.map((t) => t.toLowerCase());
}

// Token-derived composition is on-system because the color comes from a
// custom property; only literal rgb()/rgba() values are reported.
export function rgbLineTokens(lines, i) {
  const tokens = [...lines[i].matchAll(RGB_RE)]
    .map((m) => m[0])
    .filter((t) => !/var\(\s*--/i.test(t));
  if (!tokens.length || hasDsOkTag(lines, i)) return [];
  return tokens.map((t) => t.replace(/\s+/g, '').toLowerCase());
}

export function radiiLineTokens(lines, i) {
  const tokens = [...lines[i].matchAll(RADII_RE)].map((m) => normalizeWs(m[0]));
  if (!tokens.length || hasDsOkTag(lines, i)) return [];
  return tokens;
}

export function fontLineTokens(lines, i) {
  const tokens = [...lines[i].matchAll(FONT_RE)]
    .map((m) => normalizeWs(m[0]).trim().toLowerCase());
  if (!tokens.length || hasDsOkTag(lines, i)) return [];
  return tokens;
}

// Keep detector identity and labels shared by every Stage 5 consumer. Scan
// roots provide their own source-specific exclusions.
export const STAGE5_SCANS = [
  {
    id: 'palette-classes',
    label: 'raw Tailwind palette classes',
    lineTokens: paletteLineTokens,
  },
  {
    id: 'hex-colors',
    label: 'hex color literals (untagged — no reasoned DS-OK within 5 lines)',
    lineTokens: hexLineTokens,
  },
  {
    id: 'rgb-colors',
    label: 'rgb()/rgba() literals (untagged, not var(--…)-composed, no reasoned DS-OK)',
    lineTokens: rgbLineTokens,
  },
  {
    id: 'raw-radii',
    label: 'raw border-radius / border px values (untagged — no reasoned DS-OK within 5 lines)',
    lineTokens: radiiLineTokens,
  },
  {
    id: 'font-family',
    label: 'raw font-family strings (untagged — no reasoned DS-OK within 5 lines)',
    lineTokens: fontLineTokens,
  },
];
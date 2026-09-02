#!/usr/bin/env node
// Automated stage-5 palette / hardcoded-color gate (task #358).
//
// Runs the EXACT stage-5 "Hardcoded value scan" regexes from
// .agents/skills/verify-design-system/SKILL.md over client/src:
//   · palette  — raw Tailwind palette classes (bg-zinc-900, text-red-500, …)
//   · hex      — hex color literals outside the DS sources of truth
//   · rgb      — rgb()/rgba() literals (task #361 — the skill's stage-5
//     regexes never covered these, so rgba(20,20,26,0.8) used to sail past);
//     token-derived composition like rgba(var(--accent-rgb), 0.4) is exempt
//     by construction, and DS-OK tagging works exactly as for hex
//   · radii    — raw border-radius / border px values that bypass the ladders
//   · font     — raw font-family strings
// (all four value detectors — hex, rgb, radii, font — honor the same DS-OK
// tag; see the escape-hatch note below)
//
// Ratchet model (the site-wide sweep, task #357, is still in flight):
// pre-existing hits are pinned in palette-drift-baseline.json as an explicit
// allowlist that may only SHRINK. The baseline identity is
// (detector, file, matched token) with a per-token COUNT — every individual
// match on a line is counted, so:
//   · a token in a file not in the baseline           → FAIL (new violation)
//   · a token's count above its baseline              → FAIL (regression —
//     including a NEW forbidden token appended to a line that already
//     carries a legacy hit)
//   · swapping a legacy token for a different one     → FAIL (the new token
//     is an increase even though totals are preserved)
//   · a token's count below its baseline              → FAIL (good news —
//     hits were cleaned; ratchet down with --update-baseline so they can
//     never come back). The gate never rewrites the baseline itself: repo
//     writes during a validation run can reload the Vite dev server
//     mid-flight and flake concurrently running browser gates.
// Line numbers are deliberately NOT part of the identity — they shift on
// every unrelated edit above a legacy hit and would force constant baseline
// churn; the token multiset is stable under moves/reformats while still
// catching every added or substituted off-system value. (Residual gap: a
// like-for-like move of the SAME token within the SAME file is invisible —
// that is a relocation, not a new violation, and stays bounded by the
// pinned count.)
//
// --update-baseline is itself shrink-only: it refuses to write when any
// current token count exceeds the existing baseline, so the documented
// command can never be used to launder a fresh violation into the
// allowlist. Initializing a missing baseline requires the explicit --init
// flag; the same flag also permits initializing the section for a NEWLY
// ADDED detector (a scan id absent from the baseline file entirely) —
// increases inside a scan section that already exists are still refused,
// so --init cannot launder regressions in the established detectors.
//
// DS-OK escape hatch (hex + rgb + radii + font scans, per the skill's
// "Acceptable hardcoded values"): a line is exempt when "DS-OK" appears on
// the SAME line or within the previous 5 lines (block-level tags like the
// JourneyDetail celebration surface or the showcase status-constant
// table). Task #378 extended it from the two color detectors to raw radii
// and font-family: a value that genuinely cannot ride the token ladder (a
// webkit scrollbar thumb, a forced-colors border) previously had no honest
// middle option between converting it — sometimes changing how it looks —
// and excluding the whole file, which also hides every FUTURE violation in
// that file. A tagged line still owes a written reason next to the tag; the
// gate does not parse the prose, the reviewer reads it.
// Only the palette-class detector has no escape hatch: a raw Tailwind
// palette class is never the right answer, so there is nothing to justify.
//
// Detector canaries run on every invocation: each regex, the DS-OK /
// task-number classifiers, per-match counting (several tokens on one line),
// and the ratchet diff (same-line insertion + count-preserving replacement
// + new file + decrease) are asserted against known-bad and known-good
// samples first, so a detector regression can never pass vacuously.
//
// Usage:
//   node scripts/validation/palette-drift.mjs                    # gate mode
//   node scripts/validation/palette-drift.mjs --update-baseline  # ratchet down
//   node scripts/validation/palette-drift.mjs --update-baseline --init  # first write only
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = path.join(ROOT, 'client/src');
const BASELINE_PATH = path.join(ROOT, 'scripts/validation/palette-drift-baseline.json');
const UPDATE = process.argv.includes('--update-baseline');

const SCAN_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css', '.scss', '.html', '.svg', '.md']);
const DS_OK_LOOKBACK = 5; // lines above a hex hit that a /* DS-OK: … */ tag may sit

// ---------------------------------------------------------------------------
// The stage-5 scans (regex literals mirror SKILL.md "How to run" verbatim).
// `excludes` are the skill's rg --glob '!…' lists, relative to repo root.
// Each detector returns the array of matched TOKENS on a line (one entry per
// individual match — a line with three palette classes yields three tokens).
// ---------------------------------------------------------------------------
const PALETTE_RE = /\b(bg|text|border(?:-[xytrblse])?|ring|fill|stroke|from|via|to|divide|outline|decoration|shadow|accent|caret|placeholder|ring-offset|inset-ring|inset-shadow)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}\b/g;
const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g;
// rgb()/rgba() literals. One level of nested parens is tolerated so that a
// truncated match of rgba(var(--x), 0.4) can never smuggle the var() ref out
// of the token; case-insensitive because CSS is. `\b` keeps color-mix(in
// srgb, …) from matching — no word boundary between "s" and "rgb".
const RGB_RE = /\brgba?\(\s*(?:[^()]|\([^()]*\))*\)/gi;
const RADII_RE = /border(-radius)?:\s*\d+px|rounded-\[\d+px\]/g;
const FONT_RE = /font-family:\s*['"]/g;

const normalizeWs = (s) => s.replace(/\s+/g, ' ');

// A raw #… token is a COLOR candidate (vs a "Task #307" issue reference)
// when it has 6 or 8 hex digits, or 3–4 digits containing a hex letter.
// 3–4 all-numeric tokens (#307, #4181) are issue refs, not colors.
function hexTokenIsColor(token) {
  const digits = token.slice(1);
  if (digits.length === 6 || digits.length === 8) return true;
  if ((digits.length === 3 || digits.length === 4) && /[a-fA-F]/.test(digits)) return true;
  return false;
}

// The DS-OK escape hatch, shared by EVERY value detector (hex, rgb, radii,
// font) so the exemption rules can never drift apart between them: a hit is
// exempt when the literal "DS-OK" appears on the same line or within the
// previous DS_OK_LOOKBACK lines. Plain substring search — the written reason
// travels with the tag for the reviewer, not for the gate. The lookback is a
// hard cap: a tag N>5 lines above a hit does not reach it (so a long
// justified block needs a tag every 5 entries).
function hasDsOkTag(lines, i) {
  for (let j = Math.max(0, i - DS_OK_LOOKBACK); j <= i; j++) {
    if (lines[j].includes('DS-OK')) return true;
  }
  return false;
}

function hexLineTokens(lines, i) {
  const tokens = [...lines[i].matchAll(HEX_RE)].map((m) => m[0]).filter(hexTokenIsColor);
  if (!tokens.length || hasDsOkTag(lines, i)) return [];
  return tokens.map((t) => t.toLowerCase()); // case-insensitive identity (#E50914 ≡ #e50914)
}

// rgb()/rgba() literals with the same DS-OK same-line / 5-line-lookback
// exemption as hex. Token-derived composition — any match whose body
// references a CSS custom property via var(--…) — is genuinely on-system
// (the color comes FROM a token) and is whitelisted by construction rather
// than baselined. Identity strips ALL whitespace (rgba(255, 255, 255, .5) ≡
// rgba(255,255,255,.5)) and lowercases, so reformatting never churns the
// baseline.
function rgbLineTokens(lines, i) {
  const tokens = [...lines[i].matchAll(RGB_RE)]
    .map((m) => m[0])
    .filter((t) => !/var\(\s*--/i.test(t));
  if (!tokens.length || hasDsOkTag(lines, i)) return [];
  return tokens.map((t) => t.replace(/\s+/g, '').toLowerCase());
}

// Raw radii / border px values and raw font-family strings. Same DS-OK
// same-line / 5-line-lookback exemption as the color detectors (task #378):
// the honest middle option for a value that legitimately cannot ride the
// ladder, instead of excluding the whole file from the scan.
function radiiLineTokens(lines, i) {
  const tokens = [...lines[i].matchAll(RADII_RE)].map((m) => normalizeWs(m[0]));
  if (!tokens.length || hasDsOkTag(lines, i)) return [];
  return tokens;
}

function fontLineTokens(lines, i) {
  const tokens = [...lines[i].matchAll(FONT_RE)].map((m) => normalizeWs(m[0]));
  if (!tokens.length || hasDsOkTag(lines, i)) return [];
  return tokens;
}

const SCANS = [
  {
    id: 'palette-classes',
    label: 'raw Tailwind palette classes',
    excludes: [],
    lineTokens: (lines, i) => [...lines[i].matchAll(PALETTE_RE)].map((m) => m[0]),
  },
  {
    id: 'hex-colors',
    label: 'hex color literals (untagged — no DS-OK within 5 lines)',
    excludes: [
      'client/src/styles/design-system.css',
      'client/src/index.css',
      'client/src/lib/charts/palette.ts',
    ],
    lineTokens: hexLineTokens,
  },
  {
    id: 'rgb-colors',
    label: 'rgb()/rgba() literals (untagged, not var(--…)-composed)',
    excludes: [
      'client/src/styles/design-system.css',
      'client/src/index.css',
      'client/src/lib/charts/palette.ts',
    ],
    lineTokens: rgbLineTokens,
  },
  {
    id: 'raw-radii',
    label: 'raw border-radius / border px values (untagged — no DS-OK within 5 lines)',
    excludes: ['client/src/styles/design-system.css'],
    lineTokens: radiiLineTokens,
  },
  {
    id: 'font-family',
    label: 'raw font-family strings (untagged — no DS-OK within 5 lines)',
    excludes: ['client/src/styles/design-system.css'],
    lineTokens: fontLineTokens,
  },
];

// ---------------------------------------------------------------------------
// Detector canaries — fail loudly if any classifier stops classifying.
// ---------------------------------------------------------------------------
function runCanaries() {
  const byId = (id) => SCANS.find((s) => s.id === id);
  const palette = (s) => byId('palette-classes').lineTokens([s], 0);
  const hex = (src, i = 0) => { const lines = src.split('\n'); return hexLineTokens(lines, i); };
  const rgb = (src, i = 0) => { const lines = src.split('\n'); return rgbLineTokens(lines, i); };
  const radii = (src, i = 0) => byId('raw-radii').lineTokens(src.split('\n'), i);
  const font = (src, i = 0) => byId('font-family').lineTokens(src.split('\n'), i);
  const eq = (a, b, what) => {
    if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`canary: ${what} → ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`);
  };

  eq(palette('className="bg-red-500"'), ['bg-red-500'], 'single palette class');
  eq(palette('hover:text-zinc-400'), ['text-zinc-400'], 'variant-prefixed palette class');
  // Per-match counting: several tokens on ONE line each count individually.
  eq(palette('bg-red-500 text-blue-300 border-emerald-950'), ['bg-red-500', 'text-blue-300', 'border-emerald-950'], 'multi-token line');
  eq(palette('from-yellow-400'), ['from-yellow-400'], 'gradient stop palette class');
  eq(palette('from-[var(--accent)]'), [], 'tokenized gradient stop');
  eq(
    palette('border-x-red-500 border-y-orange-500 border-t-amber-500 border-r-yellow-500 border-b-lime-500 border-l-green-500 border-s-emerald-500 border-e-teal-500'),
    ['border-x-red-500', 'border-y-orange-500', 'border-t-amber-500', 'border-r-yellow-500', 'border-b-lime-500', 'border-l-green-500', 'border-s-emerald-500', 'border-e-teal-500'],
    'directional and logical border palette classes',
  );
  eq(palette('inset-ring-blue-400 inset-shadow-gray-900'), ['inset-ring-blue-400', 'inset-shadow-gray-900'], 'inset ring and shadow palette classes');
  eq(palette('bg-card text-muted-foreground bg-[var(--surface-3)] ring-ring'), [], 'bridge utilities');
  eq(palette('text-red-foreground bg-orange'), [], 'no numeric step → not a palette class');

  eq(hex('color: "#E50914"'), ['#e50914'], '6-digit hex literal (lowercased identity)');
  eq(hex('from-[#34d08c]/10 to-[#34d08c]/5 border-[#34d08c]/30'), ['#34d08c', '#34d08c', '#34d08c'], 'three hex tokens on one line');
  eq(hex('// Task #307 — Clerk auth wiring'), [], 'issue reference is not a color');
  eq(hex('text-[#34d08c] // DS-OK: status ok'), [], 'same-line DS-OK');
  eq(hex('/* DS-OK: status constants */\na\nb\nc\nd\ncolor: #34d08c', 5), [], '5-line DS-OK lookback');
  eq(hex('/* DS-OK: status constants */\na\nb\nc\nd\ne\ncolor: #34d08c', 6), ['#34d08c'], 'DS-OK lookback capped at 5 lines');

  eq(rgb('background: rgba(20,20,26,0.8)'), ['rgba(20,20,26,0.8)'], 'rgba literal');
  eq(rgb('color: rgb(255, 61, 82)'), ['rgb(255,61,82)'], 'rgb literal (ws-stripped identity)');
  eq(rgb('style={{ color: "RGBA(255, 255, 255, 0.66)" }}'), ['rgba(255,255,255,0.66)'], 'inline style + case-insensitive identity');
  eq(rgb('rgba(0,0,0,0.1) rgba(0,0,0,0.2)'), ['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.2)'], 'two rgb tokens on one line');
  eq(rgb('background: rgba(var(--accent-rgb), 0.4)'), [], 'token-derived rgba(var(--…)) composition is on-system');
  eq(rgb('color: rgb(var(--status-ok-rgb) / 0.5)'), [], 'token-derived rgb(var(--…)/alpha) is on-system');
  eq(rgb('color-mix(in srgb, var(--accent) 22%, transparent)'), [], 'color-mix srgb is not an rgb() literal');
  eq(rgb('fill="rgba(0,0,0,0.55)" // DS-OK: fixed scrim'), [], 'same-line DS-OK');
  eq(rgb('/* DS-OK: overlay ladder */\na\nb\nc\nd\nbackground: rgba(0,0,0,0.55)', 5), [], '5-line DS-OK lookback');
  eq(rgb('/* DS-OK: overlay ladder */\na\nb\nc\nd\ne\nbackground: rgba(0,0,0,0.55)', 6), ['rgba(0,0,0,0.55)'], 'DS-OK lookback capped at 5 lines');

  eq(radii('rounded-[12px]'), ['rounded-[12px]'], 'raw radius');
  eq(radii('border-radius:   8px;'), ['border-radius: 8px'], 'raw border-radius (ws-normalized)');
  eq(radii('rounded-lg rounded-[var(--radius-pill)]'), [], 'ladder radii');
  // Task #378 — the DS-OK escape hatch now covers radii/borders too, with the
  // same same-line + 5-line-lookback rules (and the same hard cap) as hex/rgb.
  eq(radii('border-radius: 3px; /* DS-OK: webkit scrollbar thumb, below the smallest ladder step */'), [], 'same-line DS-OK exempts a raw radius');
  eq(radii('border: 2px solid ButtonText; /* DS-OK: Windows High Contrast forced-colors outline */'), [], 'same-line DS-OK exempts a raw border width');
  eq(radii('/* DS-OK: forced-colors block — widths must be literal */\na\nb\nc\nd\nborder: 2px solid ButtonText;', 5), [], '5-line DS-OK lookback (radii)');
  eq(radii('/* DS-OK: forced-colors block — widths must be literal */\na\nb\nc\nd\ne\nborder: 2px solid ButtonText;', 6), ['border: 2px'], 'DS-OK lookback capped at 5 lines (radii)');

  eq(font("font-family: 'Inter', sans-serif"), ["font-family: '"], 'raw font-family');
  eq(font('font-family: var(--font-body)'), [], 'tokenized font-family');
  eq(font("font-family: 'Courier New', monospace; /* DS-OK: literal fallback stack for the code sample */"), [], 'same-line DS-OK exempts a raw font-family');
  eq(font("/* DS-OK: standalone export document, no DS vars available */\na\nb\nc\nd\nfont-family: 'Georgia', serif;", 5), [], '5-line DS-OK lookback (font)');
  eq(font("/* DS-OK: standalone export document, no DS vars available */\na\nb\nc\nd\ne\nfont-family: 'Georgia', serif;", 6), ["font-family: '"], 'DS-OK lookback capped at 5 lines (font)');

  // The tag is a shared helper (hasDsOkTag) — assert the classifier itself so
  // a detector wired to a private copy of the lookback shows up here.
  eq(hasDsOkTag(['/* DS-OK: reason */'], 0), true, 'DS-OK helper: same line');
  eq(hasDsOkTag('/* DS-OK: reason */\na\nb\nc\nd\ne'.split('\n'), 5), true, 'DS-OK helper: 5 lines below the tag');
  eq(hasDsOkTag('/* DS-OK: reason */\na\nb\nc\nd\ne\nf'.split('\n'), 6), false, 'DS-OK helper: 6 lines below is out of reach');
  eq(hasDsOkTag(['plain line'], 0), false, 'DS-OK helper: untagged line');

  // Ratchet classifier — the same diff drives gate mode AND the shrink-only
  // --update-baseline refusal. Verify every evasion vector on synthetic data:
  const key = (v) => `${v.rel}|${v.token}|${v.base}->${v.cur}`;
  // 1 · same-line insertion: a NEW token appears in a file whose legacy
  //     token keeps its count (line totals would not have moved).
  let d = diffAgainstBaseline(
    { 'palette-classes': { 'a.tsx': { 'bg-red-500': 1 } } },
    { 'palette-classes': { 'a.tsx': { 'bg-red-500': 1, 'text-blue-300': 1 } } },
  );
  eq(d.increases.map(key), ['a.tsx|text-blue-300|0->1'], 'same-line insertion increase');
  eq(d.decreases, [], 'same-line insertion has no decreases');
  // 2 · count-preserving replacement: legacy token removed, different
  //     forbidden token added — totals identical, must still fail.
  d = diffAgainstBaseline(
    { 'palette-classes': { 'a.tsx': { 'bg-red-500': 1 } } },
    { 'palette-classes': { 'a.tsx': { 'text-blue-300': 1 } } },
  );
  eq(d.increases.map(key), ['a.tsx|text-blue-300|0->1'], 'replacement increase');
  eq(d.decreases.map(key), ['a.tsx|bg-red-500|1->0'], 'replacement decrease');
  // 3 · duplicate of an existing token on the same/another line.
  d = diffAgainstBaseline(
    { 'hex-colors': { 'a.tsx': { '#e50914': 2 } } },
    { 'hex-colors': { 'a.tsx': { '#e50914': 3 } } },
  );
  eq(d.increases.map(key), ['a.tsx|#e50914|2->3'], 'same-token count increase');
  // 4 · new file + cleaned file.
  d = diffAgainstBaseline(
    { 'palette-classes': { 'b.tsx': { 'bg-zinc-900': 1 } } },
    { 'palette-classes': { 'c.tsx': { 'bg-zinc-900': 1 } } },
  );
  eq(d.increases.map(key), ['c.tsx|bg-zinc-900|0->1'], 'new-file increase');
  eq(d.decreases.map(key), ['b.tsx|bg-zinc-900|1->0'], 'cleaned-file decrease');
  // 5 · unchanged baseline is silent.
  d = diffAgainstBaseline(
    { 'palette-classes': { 'a.tsx': { 'bg-red-500': 2 } } },
    { 'palette-classes': { 'a.tsx': { 'bg-red-500': 2 } } },
  );
  eq(d.increases, [], 'unchanged baseline: no increases');
  eq(d.decreases, [], 'unchanged baseline: no decreases');

  // --update-baseline write decision (the per-scan --init path):
  // 6 · established sections unchanged + a NEW detector's hits — --init must
  //     write (initialize the new section) even with zero decreases…
  const priorNoRgb = { 'palette-classes': { 'a.tsx': { 'bg-red-500': 1 } } };
  const withRgb = { 'palette-classes': { 'a.tsx': { 'bg-red-500': 1 } }, 'rgb-colors': { 'b.tsx': { 'rgba(0,0,0,0.5)': 1 } } };
  let u = classifyUpdate(priorNoRgb, withRgb, true);
  eq(u.increases, [], 'init: new-detector hits are not refusable increases');
  eq(u.initSections.includes('rgb-colors'), true, 'init: missing section is initialized');
  eq(u.shouldWrite, true, 'init: initialization alone justifies the write');
  // 7 · …but WITHOUT --init the same state refuses (increases in the new section).
  u = classifyUpdate(priorNoRgb, withRgb, false);
  eq(u.increases.map(key), ['b.tsx|rgba(0,0,0,0.5)|0->1'], 'no init: new-detector hits refuse');
  eq(u.shouldWrite, false, 'no init: refused state never writes');
  // 8 · --init still refuses an increase inside an EXISTING section.
  u = classifyUpdate(priorNoRgb, { 'palette-classes': { 'a.tsx': { 'bg-red-500': 2 } }, 'rgb-colors': {} }, true);
  eq(u.increases.map(key), ['a.tsx|bg-red-500|1->2'], 'init cannot launder an established-section increase');
  eq(u.shouldWrite, false, 'init + established increase: no write');
  // 9 · fully unchanged baseline with all sections present: nothing to do.
  const full = {}; for (const s of SCANS) full[s.id] = {};
  u = classifyUpdate(full, full, true);
  eq(u.initSections, [], 'complete baseline: nothing to initialize');
  eq(u.shouldWrite, false, 'complete unchanged baseline: no write');
}

// ---------------------------------------------------------------------------
// Scan
// ---------------------------------------------------------------------------
function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (SCAN_EXTS.has(path.extname(entry.name))) yield full;
  }
}

function collect() {
  const hits = {};   // scanId -> relFile -> [{ line, token, text }]  (for reporting)
  const counts = {}; // scanId -> relFile -> token -> count           (the identity)
  for (const scan of SCANS) { hits[scan.id] = {}; counts[scan.id] = {}; }
  for (const file of walk(SRC)) {
    const rel = path.relative(ROOT, file);
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    for (const scan of SCANS) {
      if (scan.excludes.includes(rel)) continue;
      for (let i = 0; i < lines.length; i++) {
        for (const token of scan.lineTokens(lines, i)) {
          (hits[scan.id][rel] ??= []).push({ line: i + 1, token, text: lines[i].trim().slice(0, 160) });
          const perFile = (counts[scan.id][rel] ??= {});
          perFile[token] = (perFile[token] ?? 0) + 1;
        }
      }
    }
  }
  // Deterministic ordering for the baseline file.
  for (const scanId of Object.keys(counts)) {
    const sortedFiles = {};
    for (const rel of Object.keys(counts[scanId]).sort()) {
      const sortedTokens = {};
      for (const token of Object.keys(counts[scanId][rel]).sort()) sortedTokens[token] = counts[scanId][rel][token];
      sortedFiles[rel] = sortedTokens;
    }
    counts[scanId] = sortedFiles;
  }
  return { hits, counts };
}

// Per-scan, per-file, per-token comparison against the pinned baseline.
// Shared by gate mode and --update-baseline so the two can never disagree
// about what counts as a regression.
function diffAgainstBaseline(baseline, counts) {
  const increases = [];
  const decreases = [];
  for (const scan of SCANS) {
    const cur = counts[scan.id] ?? {};
    const base = baseline[scan.id] ?? {};
    for (const rel of [...new Set([...Object.keys(cur), ...Object.keys(base)])].sort()) {
      const curTokens = cur[rel] ?? {};
      const baseTokens = base[rel] ?? {};
      for (const token of [...new Set([...Object.keys(curTokens), ...Object.keys(baseTokens)])].sort()) {
        const c = curTokens[token] ?? 0;
        const b = baseTokens[token] ?? 0;
        if (c > b) increases.push({ scanId: scan.id, rel, token, cur: c, base: b });
        else if (c < b) decreases.push({ scanId: scan.id, rel, token, cur: c, base: b });
      }
    }
  }
  return { increases, decreases };
}

const totalOf = (counts) => Object.values(counts).reduce(
  (n, files) => n + Object.values(files).reduce(
    (m, tokens) => m + Object.values(tokens).reduce((a, b) => a + b, 0), 0), 0);

// Decide what an --update-baseline run against an EXISTING baseline may do.
// A scan id absent from the baseline file entirely is a NEWLY ADDED detector,
// not a regression in an established one: under --init (and only --init) its
// hits are pinned as that section's initialization — and that initialization
// alone justifies a write even when no established section has decreases.
// Increases inside a scan section that already exists are refused regardless
// of --init, so the flag can never launder regressions in the established
// detectors. Shared with the canaries so the write decision is tested, not
// just the diff.
function classifyUpdate(prior, counts, init) {
  const missing = SCANS.map((s) => s.id).filter((id) => !Object.prototype.hasOwnProperty.call(prior, id));
  let { increases, decreases } = diffAgainstBaseline(prior, counts);
  if (init) increases = increases.filter((v) => !missing.includes(v.scanId));
  const initSections = init ? missing : [];
  return { increases, decreases, initSections, shouldWrite: !increases.length && (decreases.length > 0 || initSections.length > 0) };
}

runCanaries();
console.log('PASS canaries :: all stage-5 detectors + ratchet classifier verified against known-bad/known-good samples');

const { hits, counts } = collect();

if (UPDATE) {
  const INIT = process.argv.includes('--init');
  const exists = fs.existsSync(BASELINE_PATH);
  if (!exists && !INIT) {
    console.error('FAIL update-baseline :: no existing baseline to ratchet. First-time initialization');
    console.error('     must be explicit: node scripts/validation/palette-drift.mjs --update-baseline --init');
    process.exit(1);
  }
  if (exists) {
    const prior = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
    // classifyUpdate holds the whole write decision (see its comment) and is
    // canary-tested, including: --init pinning a newly added detector's
    // section even with zero decreases elsewhere, and --init still refusing
    // increases inside established sections.
    const { increases, decreases, initSections, shouldWrite } = classifyUpdate(prior, counts, INIT);
    if (increases.length) {
      console.error('FAIL update-baseline :: REFUSING to write — the allowlist only ever shrinks, and the');
      console.error('     working tree currently has hits ABOVE the pinned baseline. Fix these first');
      console.error('     (DS tokens / status constants / a DS-OK tag at the definition site):');
      for (const v of increases) {
        console.error(`       ${v.scanId} :: ${v.rel} — "${v.token}" ×${v.cur}, baseline allows ×${v.base}`);
        for (const hit of (hits[v.scanId]?.[v.rel] ?? []).filter((h) => h.token === v.token)) {
          console.error(`         ${v.rel}:${hit.line}: ${hit.text}`);
        }
      }
      if (increases.some((v) => !Object.prototype.hasOwnProperty.call(prior, v.scanId))) {
        console.error('     (hits in a scan section absent from the baseline are a newly added detector —');
        console.error('      pin them explicitly with: node scripts/validation/palette-drift.mjs --update-baseline --init)');
      }
      process.exit(1);
    }
    if (!shouldWrite) {
      console.log('update-baseline :: nothing to ratchet — counts already equal the baseline.');
      if (!INIT) console.log('     (initializing a newly added detector\'s section additionally requires --init)');
      process.exit(0);
    }
    if (initSections.length) console.log(`update-baseline :: initializing new detector section(s): ${initSections.join(', ')}`);
  }
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(counts, null, 2) + '\n');
  console.log(`baseline ${exists ? 'ratcheted down' : 'initialized'} at ${path.relative(ROOT, BASELINE_PATH)} (${totalOf(counts)} legacy matches pinned)`);
  process.exit(0);
}

if (!fs.existsSync(BASELINE_PATH)) {
  console.error('FAIL :: baseline missing — run: node scripts/validation/palette-drift.mjs --update-baseline --init');
  process.exit(1);
}
const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
const { increases, decreases } = diffAgainstBaseline(baseline, counts);

for (const v of increases) {
  console.error(`FAIL ${v.scanId} :: ${v.rel} — "${v.token}" ×${v.cur}, baseline allows ×${v.base} (${SCANS.find((s) => s.id === v.scanId).label})`);
  for (const hit of (hits[v.scanId]?.[v.rel] ?? []).filter((h) => h.token === v.token)) {
    console.error(`       ${v.rel}:${hit.line}: ${hit.text}`);
  }
}
if (increases.length) {
  console.error('       Fix: route through DS tokens (bridge utilities, var(--token) refs, status');
  console.error('       constants) per .agents/skills/verify-design-system/SKILL.md stage 5.');
  console.error('       A genuinely intentional hex/rgb/radius/font-family value needs a');
  console.error('       /* DS-OK: written reason */ tag on the same line or within the 5 lines');
  console.error('       above it. Raw Tailwind palette classes have no escape hatch.');
}
for (const v of decreases) {
  console.error(`FAIL ${v.scanId} :: ${v.rel} — "${v.token}" down to ×${v.cur} from baseline ×${v.base}. Good news, but the`);
  console.error('       allowlist must ratchet DOWN so the cleaned hits can never return:');
  console.error('       run: node scripts/validation/palette-drift.mjs --update-baseline  (then commit the baseline)');
}

if (increases.length || decreases.length) {
  console.error(`\n${increases.length + decreases.length} palette-drift failure(s) (${increases.length} regression(s), ${decreases.length} unratcheted cleanup(s)).`);
  console.error('The stage-5 allowlist only ever shrinks (task #357 sweep).');
  process.exit(1);
}
for (const scan of SCANS) {
  const files = Object.keys(counts[scan.id]).length;
  const total = Object.values(counts[scan.id]).reduce((m, tokens) => m + Object.values(tokens).reduce((a, b) => a + b, 0), 0);
  console.log(`PASS ${scan.id} :: ${total} legacy match(es) across ${files} file(s), all pinned at baseline`);
}
console.log('\nPASS palette-drift :: no off-system color/radius/font drift beyond the pinned baseline');

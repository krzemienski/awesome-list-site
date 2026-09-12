#!/usr/bin/env node
/**
 * One-off evidence run for the cascade-layer model in canonical-token-parity:
 * loads every LAYER_CANARIES stylesheet in real Chromium next to the design's
 * .hide-tablet / .chip rules, serves every DOCUMENT_CANARIES overlay (a
 * rewritten client/src/index.css plus added sheets, byte-identical to what the
 * gate models) behind a synthetic client/index.html — compiled by the same
 * Tailwind compiler the app's Vite pipeline runs, and once more raw — and
 * reads what the browser computes, then walks the live app's stylesheets to list the layer order the
 * browser actually built, and writes all of it next to the gate's own
 * verdicts. Not a gate — documented in docs/parity/evidence/tokens/gate-mutations.md.
 */
/* global document, getComputedStyle, CSSLayerStatementRule, CSSLayerBlockRule, CSSImportRule */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { compile } from 'tailwindcss';
import { LAYER_CANARIES, DOCUMENT_CANARIES, CANARIES, overlayFiles, resolveImport } from './canonical-token-parity.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const OUT = path.join(ROOT, 'docs/parity/evidence/tokens/layer-order-browser.json');
const APP = process.env.BASE_URL ?? 'http://127.0.0.1:5000';
const executablePath = path.join(ROOT, '.cache/ms-playwright/chromium-1223/chrome-linux64/chrome');
const VIEWPORT = { width: 900, height: 600 };

// The design's rules the canaries compete with (awesome-list-site-ds/styles.css).
const CANONICAL = '@media (max-width: 1024px) { .hide-tablet { display: none !important; } } .chip { display: inline-flex; }';
const vendor = fs.readFileSync(path.join(ROOT, 'node_modules/tailwindcss/index.css'), 'utf8');

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: VIEWPORT });
const rows = [];
const record = (id, element, property, computed, spec) => {
  const canary = CANARIES.find((c) => c.id === id);
  rows.push({ id, element, property, browser: computed, expectedBrowser: spec.browser, gateExpect: canary.expect instanceof RegExp ? 'FAIL' : canary.expect, agrees: computed === spec.browser });
};
const read = ([sel, prop]) => getComputedStyle(document.querySelector(sel)).getPropertyValue(prop);

for (const [id, spec] of Object.entries(LAYER_CANARIES)) {
  const element = spec.element ?? '.hide-tablet';
  const property = spec.property ?? 'display';
  const html = `<!doctype html><html><head>
    <style>${CANONICAL}</style>
    ${spec.vendor ? `<style>${vendor}</style>` : ''}
    <style>${spec.css}</style>
  </head><body><div class="${element.slice(1)}">x</div></body></html>`;
  await page.setContent(html);
  record(id, element, property, await page.evaluate(read, [element, property]), spec);
}

// Document canaries: a synthetic client/index.html links client/src/index.css
// COMPILED the way the app serves it — index.css is a Tailwind root, so
// @tailwindcss/vite hands it (dev and build alike) to the tailwindcss compiler,
// which inlines every @import of the graph where it sits. The compile below
// runs that same compiler over the canary's overlay (byte-identical to what
// the gate models), resolving imports with the gate's own resolver. A second
// pass serves the RAW sheets (the browser following the @imports itself) so
// the evidence also shows where css-syntax and the compiler disagree — a
// misplaced @import loads under the compiler and is dropped raw.
const ORIGIN = 'http://canary.local';
const INDEX_HTML = '<!doctype html><html><head><link rel="stylesheet" href="/client/src/index.css"></head><body><div class="hide-tablet">x</div><div class="chip">c</div></body></html>';
const ENTRY = 'client/src/index.css';
let overlay = {};
let compiled = null;
const sheetText = (rel) => (Object.hasOwn(overlay, rel) ? overlay[rel] : fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel), 'utf8') : null);
const compileEntry = async () => {
  const loadStylesheet = async (id, base) => {
    const resolved = resolveImport(path.join(base, 'x.css'), id);
    const rel = resolved ? path.relative(ROOT, resolved) : null;
    const content = rel == null ? null : sheetText(rel);
    if (content == null) throw new Error(`cannot resolve @import "${id}" from ${path.relative(ROOT, base)}`);
    return { path: resolved, base: path.dirname(resolved), content };
  };
  const compiler = await compile(sheetText(ENTRY), { base: path.join(ROOT, 'client/src'), loadStylesheet });
  return compiler.build([]);
};
await page.route(`${ORIGIN}/**`, async (route) => {
  const pathname = decodeURIComponent(new URL(route.request().url()).pathname);
  const rel = pathname.replace(/^\/+/, '');
  if (rel === 'client/index.html') return route.fulfill({ status: 200, contentType: 'text/html', body: INDEX_HTML });
  if (rel === ENTRY && compiled != null) return route.fulfill({ status: 200, contentType: 'text/css', body: compiled });
  if (Object.hasOwn(overlay, rel)) {
    if (overlay[rel] == null) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ status: 200, contentType: 'text/css', body: overlay[rel] });
  }
  const abs = path.join(ROOT, rel);
  if (abs.startsWith(ROOT) && abs.endsWith('.css') && fs.existsSync(abs) && fs.statSync(abs).isFile()) {
    return route.fulfill({ status: 200, contentType: 'text/css', body: fs.readFileSync(abs, 'utf8') });
  }
  // Bare specifier (raw pass): split the URL into an importer directory and a
  // specifier at every slash and take the first that resolves to a real file.
  const parts = rel.split('/');
  for (let i = parts.length - 1; i > 0; i -= 1) {
    const spec = parts.slice(i).join('/');
    const resolved = resolveImport(path.join(ROOT, parts.slice(0, i).join('/'), 'x.css'), spec);
    if (resolved && fs.existsSync(resolved)) return route.fulfill({ status: 302, headers: { location: `${ORIGIN}/${path.relative(ROOT, resolved)}` } });
  }
  return route.fulfill({ status: 404, body: '' });
});
for (const [id, spec] of Object.entries(DOCUMENT_CANARIES)) {
  const element = spec.element ?? '.hide-tablet';
  const property = spec.property ?? 'display';
  overlay = overlayFiles(spec.files);
  await page.setViewportSize(spec.viewport ?? VIEWPORT);
  compiled = await compileEntry();
  await page.goto(`${ORIGIN}/client/index.html`, { waitUntil: 'load' });
  const served = await page.evaluate(read, [element, property]);
  compiled = null;
  await page.goto(`${ORIGIN}/client/index.html`, { waitUntil: 'load' });
  const raw = await page.evaluate(read, [element, property]);
  record(id, element, property, served, spec);
  rows[rows.length - 1].rawBrowser = raw;
  rows[rows.length - 1].document = 'tailwind-compiled index.css (rawBrowser: the browser following the raw @imports)';
}
await page.unroute(`${ORIGIN}/**`);
await page.setViewportSize(VIEWPORT);

// @import … layer(theme) of the main sheet: an earlier unlayered :root beats it.
await page.setContent('<!doctype html><html><head><style>:root { --bg: #000001; }</style><style>@import url("data:text/css,:root%7B--bg:%23ff0000%7D") layer(theme);</style></head><body></body></html>');
await page.waitForFunction(() => [...document.styleSheets].some((s) => { try { return [...s.cssRules].some((r) => r.styleSheet); } catch { return false; } }), null, { timeout: 5000 }).catch(() => {});
const importCase = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
rows.push({ id: 'import-layer-main-sheet', element: 'html', property: '--bg', browser: importCase, expectedBrowser: '#000001', gateExpect: 'FAIL', agrees: importCase === '#000001' });

// The live document: first-appearance order of every cascade layer.
await page.goto(`${APP}/`, { waitUntil: 'networkidle', timeout: 60000 });
const live = await page.evaluate(() => {
  const seen = [];
  const note = (name) => { if (name && !seen.includes(name)) seen.push(name); };
  const walk = (rules, prefix) => {
    for (const rule of rules) {
      if (rule instanceof CSSLayerStatementRule) for (const n of rule.nameList) note(prefix ? `${prefix}.${n}` : n);
      else if (rule instanceof CSSLayerBlockRule) { const n = rule.name ? (prefix ? `${prefix}.${rule.name}` : rule.name) : '(anonymous)'; note(n); walk(rule.cssRules, rule.name ? n : prefix); }
      else if (rule instanceof CSSImportRule) { if (rule.layerName != null) note(rule.layerName || '(anonymous)'); try { if (rule.styleSheet) walk(rule.styleSheet.cssRules, prefix); } catch { /* cross-origin */ } }
      else if (rule.cssRules) walk(rule.cssRules, prefix);
    }
  };
  for (const sheet of document.styleSheets) { try { walk(sheet.cssRules, ''); } catch { /* cross-origin */ } }
  return { layers: seen, sheets: [...document.styleSheets].map((s) => s.ownerNode?.getAttribute?.('data-vite-dev-id') ?? s.href ?? 'inline') };
});
await browser.close();

const evidence = {
  generated: new Date().toISOString(),
  viewport: VIEWPORT,
  chromium: 'ms-playwright chromium-1223',
  canaries: rows,
  liveDocument: { url: `${APP}/`, layerOrder: live.layers, sheets: live.sheets },
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(evidence, null, 2)}\n`);
for (const r of rows) console.log(`${r.agrees ? 'ok  ' : 'DIFF'} ${r.id}: browser ${r.property}=${r.browser} (expected ${r.expectedBrowser})${r.rawBrowser !== undefined ? ` raw=${r.rawBrowser}` : ''}, gate expects ${r.gateExpect}`);
console.log('live layer order:', live.layers.join(' < '));
console.log(`wrote ${path.relative(ROOT, OUT)}`);
process.exit(rows.every((r) => r.agrees) ? 0 : 1);

// Declared @font-face parity probe: app vs design source.
// Usage: node docs/parity/evidence/fonts/font-set.mjs <phase> [appBase]
// Output: $FONTS_EVIDENCE_OUT/<phase> (default /tmp/fonts-evidence/<phase>); copy into
// docs/parity/evidence/fonts/<phase>/ after the last browser run (Vite watches the repo).
// Lists [...document.fonts] (family, weight, style) after document.fonts.ready
// on the app's "/" and "/settings/theme" (each system) and on the design
// source page served straight from awesome-list-site-ds/, then diffs them.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// Repo root: this file lives at docs/parity/evidence/fonts/.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const phase = process.argv[2] || 'before';
const APP = process.argv[3] || 'http://127.0.0.1:5000';
const OUT = path.join(process.env.FONTS_EVIDENCE_OUT || '/tmp/fonts-evidence', phase);
fs.mkdirSync(OUT, { recursive: true });

const EXE = fs.readdirSync(path.join(ROOT, '.cache/ms-playwright'))
  .filter((d) => d.startsWith('chromium-'))
  .map((d) => path.join(ROOT, '.cache/ms-playwright', d, 'chrome-linux64/chrome'))
  .find((p) => fs.existsSync(p));

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.jsx': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const designRoot = path.join(ROOT, 'awesome-list-site-ds');
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = path.join(designRoot, rel === '/' ? 'index.html' : rel);
  if (!file.startsWith(designRoot) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end('not found'); return;
  }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const DESIGN = `http://127.0.0.1:${server.address().port}/`;

const SYSTEMS = ['editorial', 'terminal', 'geist', 'brutalist', 'swiss'];
const unq = (s) => String(s).replace(/^["']|["']$/g, '');

async function readFonts(page) {
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate(() => {
    const seen = new Map();
    for (const f of document.fonts) {
      const family = f.family.replace(/^["']|["']$/g, '');
      const key = `${family}|${f.style}|${f.weight}`;
      const prev = seen.get(key);
      seen.set(key, { family, style: f.style, weight: f.weight, faces: (prev?.faces || 0) + 1, loaded: (prev?.loaded || 0) + (f.status === 'loaded' ? 1 : 0) });
    }
    return [...seen.values()].sort((a, b) => a.family.localeCompare(b.family) || a.style.localeCompare(b.style) || a.weight.localeCompare(b.weight));
  });
}

async function fontLinks(page) {
  return page.evaluate(() => [...document.querySelectorAll('link[rel="stylesheet"]')]
    .map((l) => l.getAttribute('href') || l.href)
    .filter((h) => /fonts\.googleapis\.com/.test(h)));
}

function watch(page, label, log) {
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') log.push({ page: label, kind: `console.${m.type()}`, text: m.text().slice(0, 300) }); });
  page.on('requestfailed', (r) => log.push({ page: label, kind: 'requestfailed', url: r.url().slice(0, 200), error: r.failure()?.errorText }));
  page.on('response', (r) => { if (r.status() >= 400) log.push({ page: label, kind: `http-${r.status()}`, url: r.url().slice(0, 200) }); });
}

const browser = await chromium.launch({ executablePath: EXE });
const log = [];
const result = { phase, capturedAt: new Date().toISOString(), app: APP, pages: {} };
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  // design source
  {
    const page = await ctx.newPage();
    watch(page, 'design', log);
    await page.goto(DESIGN, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(1500);
    result.pages.design = { url: DESIGN, links: await fontLinks(page), fonts: await readFonts(page) };
    await page.close();
  }
  for (const route of ['/', '/settings/theme']) {
    const page = await ctx.newPage();
    watch(page, `app${route}`, log);
    await page.goto(APP + route, { waitUntil: 'networkidle', timeout: 60000 });
    result.pages[`app${route}`] = { url: APP + route, links: await fontLinks(page), fonts: await readFonts(page) };
    if (route === '/settings/theme') {
      const perSystem = {};
      for (const id of SYSTEMS) {
        await page.click(`[data-testid="system-option-${id}"]`);
        await page.waitForFunction((s) => document.documentElement.getAttribute('data-system') === s, id, { timeout: 5000 });
        await page.waitForTimeout(1200);
        await page.evaluate(() => document.fonts.ready);
        const heading = await page.evaluate(() => {
          const h = document.querySelector('h1');
          const cs = h ? getComputedStyle(h) : null;
          return h ? { text: h.textContent.trim().slice(0, 60), fontFamily: cs.fontFamily, width: h.getBoundingClientRect().width } : null;
        });
        const tokens = await page.evaluate(() => {
          const cs = getComputedStyle(document.documentElement);
          return Object.fromEntries(['--font-display', '--font-body', '--font-mono'].map((t) => [t, cs.getPropertyValue(t).trim()]));
        });
        await page.screenshot({ path: path.join(OUT, `settings-theme-${id}.png`), clip: { x: 0, y: 0, width: 1440, height: 520 } });
        perSystem[id] = { tokens, heading, links: await fontLinks(page), fonts: await readFonts(page) };
      }
      await page.click('[data-testid="system-option-editorial"]');
      await page.waitForTimeout(300);
      result.pages['app/settings/theme'].perSystem = perSystem;
    }
    await page.close();
  }
  await ctx.close();
} finally {
  await browser.close();
  server.close();
}
result.log = log;

// Diff app "/" vs design.
const key = (f) => `${f.family}|${f.style}|${f.weight}`;
const design = new Map(result.pages.design.fonts.map((f) => [key(f), f]));
const app = new Map(result.pages['app/'].fonts.map((f) => [key(f), f]));
const shared = [...app.keys()].filter((k) => design.has(k)).sort();
const appOnly = [...app.keys()].filter((k) => !design.has(k)).sort();
const designOnly = [...design.keys()].filter((k) => !app.has(k)).sort();
result.diff = { shared: shared.length, appOnly, designOnly };

fs.writeFileSync(path.join(OUT, 'font-set.json'), JSON.stringify(result, null, 2));
const lines = [];
lines.push(`# Declared @font-face set — ${phase}`, '', `Captured ${result.capturedAt}. App: ${APP} — design source served from awesome-list-site-ds/.`, '');
lines.push(`## Font stylesheet links`, '', `App "/":`, ...result.pages['app/'].links.map((l) => `- ${l}`), '', `Design:`, ...result.pages.design.links.map((l) => `- ${l}`), '');
lines.push(`## Diff (family|style|weight) app "/" vs design`, '', `- shared: ${shared.length}`, `- app-only: ${appOnly.length}${appOnly.length ? ` — ${appOnly.join(', ')}` : ''}`, `- design-only: ${designOnly.length}${designOnly.length ? ` — ${designOnly.join(', ')}` : ''}`, '');
lines.push('| Family | Style | Weight | App "/" | Design |', '|---|---|---|---|---|');
for (const k of [...new Set([...app.keys(), ...design.keys()])].sort()) {
  const [family, style, weight] = k.split('|');
  const a = app.get(k); const d = design.get(k);
  const cell = (f) => (f ? `${f.faces} face${f.faces === 1 ? '' : 's'}${f.loaded ? ` (${f.loaded} loaded)` : ''}` : 'missing');
  lines.push(`| ${family} | ${style} | ${weight} | ${cell(a)} | ${cell(d)} |`);
}
lines.push('', '## /settings/theme per system', '');
for (const [id, s] of Object.entries(result.pages['app/settings/theme'].perSystem || {})) {
  lines.push(`### ${id}`, '', `- tokens: ${JSON.stringify(s.tokens)}`, `- h1: ${JSON.stringify(s.heading)}`, `- font links: ${s.links.length}`, `- declared keys: ${s.fonts.length}`, '');
}
lines.push('## Network / console log (fonts-related and errors)', '');
const rel = log.filter((e) => /font|csp|Content Security/i.test(JSON.stringify(e)) || e.kind.startsWith('http-') || e.kind === 'requestfailed');
lines.push(rel.length ? rel.map((e) => `- ${JSON.stringify(e)}`).join('\n') : '- none');
fs.writeFileSync(path.join(OUT, 'font-set.md'), lines.join('\n') + '\n');
console.log(lines.slice(0, 12).join('\n'));
console.log(`per-system link counts: ${JSON.stringify(Object.fromEntries(Object.entries(result.pages['app/settings/theme'].perSystem || {}).map(([k, v]) => [k, v.links.length])))}`);
console.log(`log entries: ${log.length}, relevant: ${rel.length}`);

// First-paint filmstrip at 375 wide for "/": CDP screencast frames + rAF samples
// of the first <h1>'s computed family and measured width (width is paint
// evidence; document.fonts.check is not). Cold run = fresh context; warm run =
// second navigation in the same context (Google Fonts CSS + woff2 cached).
// Usage: node docs/parity/evidence/fonts/filmstrip.mjs <phase> [appBase]
// Output: $FONTS_EVIDENCE_OUT/<phase> (default /tmp/fonts-evidence/<phase>); copy into
// docs/parity/evidence/fonts/<phase>/ after the last browser run (Vite watches the repo).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// Repo root: this file lives at docs/parity/evidence/fonts/.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const phase = process.argv[2] || 'before';
const APP = process.argv[3] || 'http://127.0.0.1:5000';
const OUT = path.join(process.env.FONTS_EVIDENCE_OUT || '/tmp/fonts-evidence', phase, 'filmstrip');
fs.mkdirSync(OUT, { recursive: true });
const EXE = fs.readdirSync(path.join(ROOT, '.cache/ms-playwright'))
  .filter((d) => d.startsWith('chromium-'))
  .map((d) => path.join(ROOT, '.cache/ms-playwright', d, 'chrome-linux64/chrome'))
  .find((p) => fs.existsSync(p));

const SAMPLER = `(() => {
  const samples = []; window.__samples = samples; const t0 = performance.now();
  let fontsReadyAt = null;
  document.fonts?.ready.then(() => { fontsReadyAt = performance.now() - t0; });
  const tick = () => {
    const h = document.querySelector('h1');
    const now = performance.now() - t0;
    if (h) {
      const r = h.getBoundingClientRect();
      samples.push({ t: Math.round(now), text: (h.textContent || '').trim().slice(0, 40), family: getComputedStyle(h).fontFamily, width: Math.round(r.width * 100) / 100, height: Math.round(r.height * 100) / 100, fontsReadyAt });
    } else {
      samples.push({ t: Math.round(now), family: null, width: null, height: null, fontsReadyAt });
    }
    if (now < 4000) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();`;

const browser = await chromium.launch({ executablePath: EXE });
const summary = { phase, app: APP, runs: {} };
try {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1 });
  for (const run of ['cold', 'warm']) {
    const page = await ctx.newPage();
    await page.addInitScript(SAMPLER);
    const cdp = await ctx.newCDPSession(page);
    const frames = [];
    const start = Date.now();
    cdp.on('Page.screencastFrame', async (f) => {
      frames.push({ t: Date.now() - start, data: f.data });
      try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch {}
    });
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 70, maxWidth: 375, maxHeight: 812, everyNthFrame: 1 });
    await page.goto(APP + '/', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(4200);
    try { await cdp.send('Page.stopScreencast'); } catch {}
    const samples = await page.evaluate(() => window.__samples || []);
    // Keep distinct-looking frames only: first 6 unique + last.
    const uniq = [];
    for (const f of frames) if (!uniq.length || uniq[uniq.length - 1].data !== f.data) uniq.push(f);
    const keep = [...uniq.slice(0, 6), ...(uniq.length > 6 ? [uniq[uniq.length - 1]] : [])];
    keep.forEach((f, i) => fs.writeFileSync(path.join(OUT, `${run}-${String(i + 1).padStart(2, '0')}-${f.t}ms.jpg`), Buffer.from(f.data, 'base64')));
    const withH1 = samples.filter((s) => s.family);
    const first = withH1[0] || null;
    const last = withH1[withH1.length - 1] || null;
    const widthChanges = [];
    for (let i = 1; i < withH1.length; i++) if (withH1[i].width !== withH1[i - 1].width || withH1[i].text !== withH1[i - 1].text || withH1[i].family !== withH1[i - 1].family) widthChanges.push({ t: withH1[i].t, from: withH1[i - 1].width, to: withH1[i].width, fromText: withH1[i - 1].text, toText: withH1[i].text, toFamily: withH1[i].family });
    summary.runs[run] = {
      framesTotal: frames.length, framesUnique: uniq.length, framesKept: keep.map((f) => `${f.t}ms`),
      h1FirstSample: first, h1LastSample: last, widthChanges, fontsReadyAt: last?.fontsReadyAt ?? null,
      sampleCount: samples.length,
    };
    await page.close();
  }
  await ctx.close();
} finally {
  await browser.close();
}
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
const md = [`# First-paint filmstrip @375 — ${phase}`, '', `App: ${APP}. Frames from CDP Page.startScreencast; h1 samples via requestAnimationFrame (family + measured width).`, ''];
for (const [run, r] of Object.entries(summary.runs)) {
  md.push(`## ${run} cache`, '', `- frames: ${r.framesTotal} captured, ${r.framesUnique} unique, kept: ${r.framesKept.join(', ')}`,
    `- first h1 sample: ${JSON.stringify(r.h1FirstSample)}`, `- last h1 sample: ${JSON.stringify(r.h1LastSample)}`,
    `- h1 changes after first paint (element swap = different text; a fallback→webfont swap = same text, new width): ${r.widthChanges.length ? JSON.stringify(r.widthChanges) : 'none'}`,
    `- document.fonts.ready at: ${r.fontsReadyAt}ms`, '');
}
fs.writeFileSync(path.join(OUT, 'summary.md'), md.join('\n') + '\n');
console.log(md.join('\n'));

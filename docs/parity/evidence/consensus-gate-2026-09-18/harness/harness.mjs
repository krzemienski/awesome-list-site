// Main-agent real-browser DS audit harness (protocol from
// .agents/skills/verify-design-system/SKILL.md "Browser execution protocol").
// Usage: BASE=http://127.0.0.1:5000 OUT=.cache/ds-audit/dev node .cache/ds-audit/harness.mjs
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import * as F from '/home/runner/workspace/scripts/validation/ds-button-filter.mjs';

const BASE = process.env.BASE || 'http://127.0.0.1:5000';
const OUT = process.env.OUT || '.cache/ds-audit/dev';
const SYSTEMS = ['editorial', 'terminal', 'geist', 'brutalist', 'swiss'];
const SCREENS = {
  home: '/', about: '/about', journeys: '/journeys', category: '/category/community-events',
  resource: '/resource/188015', login: '/login', 'settings-theme': '/settings/theme', 'not-found': '/this-route-does-not-exist-404',
};
const WIDTHS = [[1440, 900], [375, 812]];
const filters = Object.fromEntries(Object.entries(F).map(([k, fn]) => [k, fn.toString()]));
mkdirSync(OUT, { recursive: true });

const results = { base: BASE, stage3: {}, screens: {}, findings: [] };
const finding = (sev, stage, msg) => results.findings.push({ sev, stage, msg });

// ---- Stage 3 static proof -------------------------------------------------
{
  const html = await (await fetch(BASE + '/')).text();
  const head = html.slice(0, html.search(/<body\b/i));
  const scripts = [...head.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  const boot = scripts.find(m => !/type\s*=\s*["']module["']|\bsrc=|\basync\b|\bdefer\b/.test(m[1]) && /setAttribute\(['"]data-system['"]/.test(m[2]) && /setAttribute\(['"]data-accent['"]/.test(m[2]));
  const usesModuleGlobal = boot ? /window\.applyDesignSystem\s*\(/.test(boot[2]) : null;
  results.stage3.static = { inlineBootInHead: !!boot, usesModuleGlobal, ok: !!boot && !usesModuleGlobal };
  if (!results.stage3.static.ok) finding('FIX', 3, `no inline synchronous data-system boot script in <head> (or it depends on a module global)`);
}

const browser = await chromium.launch();
const initScript = () => {
  window.__dsAttr = [];
  const rec = () => { const el = document.documentElement; if (!el) return; for (const a of ['data-system', 'data-accent']) { const v = el.getAttribute(a); if (v && !window.__dsAttr.some(x => x.a === a && x.v === v)) window.__dsAttr.push({ a, v, t: performance.now() }); } };
  new MutationObserver(rec).observe(document, { attributes: true, subtree: true, attributeFilter: ['data-system', 'data-accent'] });
  rec();
};

// ---- Stage 3 runtime proof (fresh + saved terminal) -----------------------
for (const saved of [null, 'terminal']) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(initScript);
  if (saved) await ctx.addInitScript((s) => { try { localStorage.setItem('ds-system', s); localStorage.setItem('ds-accent', 'matrix'); } catch {} }, saved);
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 90000 });
  const r = await page.evaluate(() => ({
    system: window.__dsAttr.find(x => x.a === 'data-system') || null,
    accent: window.__dsAttr.find(x => x.a === 'data-accent') || null,
    firstPaint: (performance.getEntriesByType('paint')[0] || {}).startTime ?? null,
    now: document.documentElement.getAttribute('data-system') + '/' + document.documentElement.getAttribute('data-accent'),
  }));
  const ok = !!r.system && !!r.accent && r.firstPaint != null && Math.max(r.system.t, r.accent.t) <= r.firstPaint && (!saved || (r.system.v === saved && r.accent.v === 'matrix'));
  results.stage3[saved ? 'savedTerminal' : 'fresh'] = { ...r, ok };
  if (!ok) finding('FIX', 3, `runtime boot ${saved || 'fresh'}: ${JSON.stringify(r)}`);
  await ctx.close();
}

// ---- Per screen × width × system -----------------------------------------
for (const [w, h] of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  for (const [name, path] of Object.entries(SCREENS)) {
    const key = `${name}@${w}`;
    const resp = await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForSelector('.page', { timeout: 30000 }).catch(() => {});
    await page.waitForFunction(() => typeof window.applyDesignSystem === 'function' && !!window.SYSTEM_DEFAULT_ACCENT, null, { timeout: 30000 }).catch(() => {});
    await page.evaluate(() => document.fonts.ready);
    const rec = { status: resp?.status(), url: page.url(), systems: {} };
    if (name === 'not-found' && rec.status !== 404) finding('FIX', 2, `${key}: 404 route returned HTTP ${rec.status}`);
    for (const id of SYSTEMS) {
      await page.evaluate((id) => window.applyDesignSystem(id, window.SYSTEM_DEFAULT_ACCENT[id]), id);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(800);
      const dir = `${OUT}/${name}/${w}`; mkdirSync(dir, { recursive: true });
      await page.screenshot({ path: `${dir}/${id}.png`, fullPage: false });
      const r = await page.evaluate(async ([fns]) => {
        const rs = getComputedStyle(document.documentElement);
        const face = (v) => String(v || '').split(',')[0].replace(/["']/g, '').trim();
        const disp = face(rs.getPropertyValue('--font-display')), body = face(rs.getPropertyValue('--font-body'));
        const strays = {};
        for (const [k, src] of Object.entries(fns)) { try { strays[k] = (new Function(`return (${src})`)())().strays; } catch (e) { strays[k] = 'ERR ' + e.message; } }
        const accent = rs.getPropertyValue('--accent').trim();
        const text3 = rs.getPropertyValue('--text-3').trim();
        const skin = [...document.querySelectorAll('style')].some(s => s.textContent.includes(`[data-system="${document.documentElement.dataset.system}"]`)) ||
          [...document.styleSheets].some(s => { try { return [...s.cssRules].some(r => r.selectorText && r.selectorText.includes(`[data-system="${document.documentElement.dataset.system}"]`)); } catch { return false; } });
        return {
          system: document.documentElement.dataset.system, accent: document.documentElement.dataset.accent,
          applyFn: typeof window.applyDesignSystem, nSystems: Object.keys(window.DESIGN_SYSTEMS || {}).length, nAccents: (window.ACCENTS || []).length,
          bg: rs.getPropertyValue('--bg').trim(), page: !!document.querySelector('.page'), grain: !!document.querySelector('.grain'),
          atmosphere: !!getComputedStyle(document.querySelector('.page') || document.body).getPropertyValue('--bg-atmosphere').trim(),
          fonts: await (async () => {
            const load = async (fam) => { try { const f = await document.fonts.load(`16px "${fam}"`); return f.length > 0 && f.every(x => x.status === 'loaded'); } catch { return false; } };
            return { display: disp, displayOk: await load(disp), body, bodyOk: await load(body) };
          })(),
          skin, strays,
          text3Offenders: [...document.querySelectorAll('p, li')].filter(p => getComputedStyle(p).color === text3 && p.textContent.length > 60).length,
          accentUsers: accent ? [...document.querySelectorAll('*')].filter(el => { const s = getComputedStyle(el); return [s.color, s.backgroundColor, s.borderColor].some(c => c.toLowerCase().includes(accent.replace('#', '').slice(0, 6))); }).length : null,
        };
      }, [filters]);
      rec.systems[id] = r;
      if (r.system !== id) finding('BLOCK', 2, `${key}/${id}: data-system=${r.system}`);
      if (!r.page || !r.grain || !r.atmosphere) finding('FIX', 4, `${key}/${id}: page=${r.page} grain=${r.grain} atmosphere=${r.atmosphere}`);
      if (!r.skin) finding('BLOCK', 10, `${key}/${id}: no [data-system] skin rule reachable`);
      if (!r.fonts.displayOk || !r.fonts.bodyOk) finding('FIX', 9, `${key}/${id}: display ${r.fonts.display}=${r.fonts.displayOk} body ${r.fonts.body}=${r.fonts.bodyOk}`);
      for (const [k, v] of Object.entries(r.strays)) if (typeof v === 'string' || v.length) finding('FIX', 6, `${key}/${id}: ${k} ${typeof v === 'string' ? v : JSON.stringify(v.slice(0, 6))}`);
      if (r.text3Offenders) finding('FIX', 8, `${key}/${id}: ${r.text3Offenders} long-copy --text-3 offenders`);
    }
    await page.evaluate(() => window.applyDesignSystem('editorial', 'crimson'));
    results.screens[key] = rec;
    console.log(key, rec.status, Object.values(rec.systems).map(s => `${s.system}:${s.fonts.displayOk && s.fonts.bodyOk ? 'F' : 'f'}${Object.values(s.strays).every(v => Array.isArray(v) && !v.length) ? 'S' : 's'}`).join(' '));
  }
  await ctx.close();
}
await browser.close();
writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
console.log('\nFINDINGS', results.findings.length);
for (const f of results.findings) console.log(`${f.sev} S${f.stage} ${f.msg}`);
console.log('stage3', JSON.stringify(results.stage3));

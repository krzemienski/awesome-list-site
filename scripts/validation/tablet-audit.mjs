// Repeatable tablet clipping + consent-banner-overlay validation (task #270,
// promoted from the task #258 evidence checks). Guards the 14 tablet/mobile
// layout & a11y fixes: /advanced tabs+chips in-bounds @768/320, sidebar
// auto-collapsed @768, microtext >=12px, single "Toggle sidebar" label + no
// active rail, unique aria-labels on repeated Explore/Journey buttons, home
// CTA reachable via hit-test @768/320, consent-banner clearance (body/footer
// padding == banner height, global scroll-margin-bottom rule effective,
// elementFromPoint never lands on the banner), search grid >=280px cols @768
// and single col @320, exactly one search-dialog dismiss control, drawer rows
// >=44px @375, theme preview inert + text >=12px, back links >=24px.
//
// Gotchas kept from the evidence copy:
// - Site CSS sets `scroll-behavior: smooth`; every programmatic scroll below
//   passes behavior:'instant' before measuring.
// - Chromium is launched with the explicit executablePath found under
//   .cache/ms-playwright (installed revision differs from the package's pin).
// - The consent banner exposes its height as --consent-banner-h and a global
//   `* { scroll-margin-bottom: var(--consent-banner-h, 0px) }` rule in
//   client/src/index.css keeps scroll-into-view targets clear of the banner;
//   this script asserts that rule stays effective.
//
// Requires the dev server on :5000 (no admin login needed — all surfaces are
// public). Exits 1 on any failure. Evidence: /tmp/validation/tablet-audit.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { chromium } = await import(path.join(ROOT, 'node_modules/playwright/index.mjs'));

const BASE = process.env.AUDIT_BASE_URL || 'http://localhost:5000';
const OUT = '/tmp/validation/tablet-audit';
fs.mkdirSync(OUT, { recursive: true });

function chromePath() {
  const cache = path.join(ROOT, '.cache/ms-playwright');
  const dir = fs.readdirSync(cache).filter(d => /^chromium-\d+$/.test(d)).sort().pop();
  if (!dir) throw new Error('No chromium-* dir in .cache/ms-playwright — run npx playwright install chromium');
  return path.join(cache, dir, 'chrome-linux64/chrome');
}

// Wait up to 120s for the server so this can run in parallel with app startup.
{
  const deadline = Date.now() + 120000;
  let up = false, lastErr = '';
  while (Date.now() < deadline && !up) {
    try {
      const ping = await fetch(`${BASE}/api/awesome-list`, { method: 'HEAD' });
      if (ping.ok || ping.status === 405) { up = true; break; }
      lastErr = `status ${ping.status}`;
    } catch (e) { lastErr = e.message; }
    await new Promise(r => setTimeout(r, 3000));
  }
  if (!up) { console.error(`FATAL: app not reachable at ${BASE} after 120s (${lastErr}) — start the "Start application" workflow`); process.exit(1); }
}

const results = [];
const log = (k, pass, detail) => { results.push({ k, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'} ${k} :: ${detail}`); };

const browser = await chromium.launch({ headless: true, executablePath: chromePath(), args: ['--no-sandbox', '--disable-dev-shm-usage'] });

// Fresh context per surface: consent must be UNDECIDED (localStorage empty) so
// the banner is present for the clearance/hit-test checks, and the sidebar
// open/closed state must come from viewport width, not a stored preference.
const newPage = async (w, h) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  return { ctx, page };
};
// Completion validations run in parallel. A resilience gate may deliberately
// hold the catalog table and return a bounded 503 while this audit is starting.
// Do not silently inspect that JSON error page as if it were the requested UI;
// honor Retry-After and retry until the real document is available.
const goto = async (page, route) => {
  const deadline = Date.now() + 90000;
  let last = 'no response';
  while (Date.now() < deadline) {
    try {
      const response = await page.goto(`${BASE}${route}`, {
        waitUntil: 'domcontentloaded',
        timeout: 45000,
      });
      const status = response?.status() ?? 0;
      if (status > 0 && status < 429) {
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        return;
      }
      last = `status ${status}`;
      const retryAfter = Number(response?.headers()['retry-after'] || 1);
      await page.waitForTimeout(Math.max(1000, Math.min(retryAfter * 1000, 5000)));
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
      await page.waitForTimeout(1500);
    }
  }
  throw new Error(`Unable to load ${route} for tablet audit (${last})`);
};

// Shared in-page helpers (serialized into evaluate calls).
const IN_BOUNDS = `(els, vw) => {
  const doc = document.documentElement;
  const out = els.filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > vw + 1 || r.left < -1); });
  return { count: els.length, clipped: out.length, hOverflow: doc.scrollWidth - doc.clientWidth,
    sample: out[0] ? (out[0].textContent || out[0].getAttribute('aria-label') || '?').trim().slice(0, 40) : null };
}`;

// ---- /advanced tabs + chips in-bounds @768 and @320 ----
for (const w of [768, 320]) {
  const { ctx, page } = await newPage(w, 900);
  await goto(page, '/advanced');
  await page.waitForSelector('[role="tablist"] [role="tab"]', { timeout: 20000 }).catch(() => {});
  // Explorer tab content (category chips) renders async — wait for at least one.
  await page.waitForSelector('[aria-label^="Explore Category"]', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(600);
  const tabs = await page.evaluate(`((inBounds) => {
    return inBounds([...document.querySelectorAll('[role="tablist"] [role="tab"]')], ${w});
  })(${IN_BOUNDS})`);
  log(`advanced-tabs@${w}`, tabs.count >= 4 && tabs.clipped === 0 && tabs.hOverflow <= 0,
    `tabs=${tabs.count} clipped=${tabs.clipped} hOverflow=${tabs.hOverflow}${tabs.sample ? ` sample="${tabs.sample}"` : ''}`);
  const chips = await page.evaluate(`((inBounds) => {
    const chips = [...document.querySelectorAll('[aria-label^="Explore Category"], button, a')]
      .filter(e => /explore category/i.test(e.getAttribute('aria-label') || '') || /^explore category/i.test((e.textContent || '').trim()));
    return inBounds(chips, ${w});
  })(${IN_BOUNDS})`);
  log(`advanced-chips@${w}`, chips.count > 0 && chips.clipped === 0,
    `chips=${chips.count} clipped=${chips.clipped}${chips.sample ? ` sample="${chips.sample}"` : ''}`);

  if (w === 768) {
    // ---- sidebar auto-collapsed @768 (tablet squeeze guard) ----
    const sb = await page.evaluate(() => {
      const el = document.querySelector('div[data-state][data-collapsible], div[data-state][data-variant]');
      return { found: !!el, state: el?.getAttribute('data-state'), collapsible: el?.getAttribute('data-collapsible') };
    });
    log('sidebar-collapsed@768', sb.found && sb.state === 'collapsed', JSON.stringify(sb));

    // ---- single "Toggle sidebar" accessible label + no interactive rail ----
    const tog = await page.evaluate(() => {
      const label = (e) => (e.getAttribute('aria-label') || e.querySelector('.sr-only')?.textContent || '').trim();
      const visible = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      const toggles = [...document.querySelectorAll('button, a')].filter(e => /^toggle sidebar$/i.test(label(e)) && visible(e));
      const rail = document.querySelector('[data-sidebar="rail"]');
      let railActive = false;
      if (rail) {
        const s = getComputedStyle(rail);
        const r = rail.getBoundingClientRect();
        railActive = s.pointerEvents !== 'none' && parseFloat(s.opacity) > 0 && r.width > 0 && r.height > 0;
      }
      return { toggles: toggles.length, railPresent: !!rail, railActive };
    });
    log('toggle-label-unique@768', tog.toggles === 1 && !tog.railActive, JSON.stringify(tog));

    // ---- explore chips have UNIQUE aria-labels ----
    const uniq = await page.evaluate(() => {
      const labels = [...document.querySelectorAll('[aria-label^="Explore Category"]')].map(e => e.getAttribute('aria-label'));
      return { count: labels.length, unique: new Set(labels).size };
    });
    log('explore-aria-unique@768', uniq.count > 1 && uniq.count === uniq.unique, JSON.stringify(uniq));
    await page.screenshot({ path: `${OUT}/advanced-768.png` }).catch(() => {});
  } else {
    await page.screenshot({ path: `${OUT}/advanced-320.png` }).catch(() => {});
  }
  await ctx.close();
}

// ---- /journeys: repeated journey CTAs have unique accessible names ----
{
  const { ctx, page } = await newPage(768, 900);
  await goto(page, '/journeys');
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => {
    const name = (e) => (e.getAttribute('aria-label') || (e.textContent || '').trim()).slice(0, 120);
    const ctas = [...document.querySelectorAll('a[href^="/journey/"], [data-testid^="button-view-journey"], [data-testid^="link-journey"]')]
      .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    const names = ctas.map(name);
    return { count: names.length, unique: new Set(names).size };
  });
  log('journey-aria-unique@768', r.count > 1 && r.count === r.unique, JSON.stringify(r));
  await ctx.close();
}

// ---- home: microtext >=12px, CTA hit-test @768 + @320, consent clearance ----
for (const w of [768, 320]) {
  const { ctx, page } = await newPage(w, w === 320 ? 568 : 900);
  await goto(page, '/');
  await page.waitForSelector('[data-testid="consent-banner"]', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1200);

  if (w === 768) {
    // ---- microtext: no visible text below 12px ----
    const micro = await page.evaluate(() => {
      const bad = [];
      let checked = 0;
      for (const el of document.querySelectorAll('body *')) {
        if (!el.childNodes.length) continue;
        const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 0);
        if (!hasText) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const s = getComputedStyle(el);
        if (s.visibility === 'hidden' || s.display === 'none') continue;
        checked++;
        const fs = parseFloat(s.fontSize);
        if (fs < 12) bad.push(`${(el.textContent || '').trim().slice(0, 30)}=${fs}px`);
      }
      return { checked, bad: bad.slice(0, 5), badCount: bad.length };
    });
    log('microtext-home@768', micro.checked > 20 && micro.badCount === 0, `checked=${micro.checked} under12px=${micro.badCount} ${micro.bad.join(' | ')}`);

    // ---- consent clearance: padding == banner height, scroll-margin rule, hit-test ----
    const consent = await page.evaluate(() => {
      const banner = document.querySelector('[data-testid="consent-banner"]');
      if (!banner) return { banner: false };
      const h = banner.offsetHeight;
      const varH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--consent-banner-h')) || 0;
      const bodyPad = parseFloat(getComputedStyle(document.body).paddingBottom) || 0;
      const inset = document.querySelector('footer')?.parentElement;
      const insetPad = inset ? parseFloat(getComputedStyle(inset).paddingBottom) || 0 : -1;
      // Global `* { scroll-margin-bottom: var(--consent-banner-h,0px) }` rule
      // must stay effective — sample an arbitrary in-flow element.
      const sample = document.querySelector('footer a') || document.querySelector('main');
      const scrollMargin = sample ? parseFloat(getComputedStyle(sample).scrollMarginBottom) || 0 : -1;
      return { banner: true, h, varH, bodyPad, insetPad, scrollMargin };
    });
    const near = (a, b) => Math.abs(a - b) <= 2;
    log('consent-padding@768', consent.banner && consent.h > 0 && near(consent.varH, consent.h) && near(consent.bodyPad, consent.h) && near(consent.insetPad, consent.h),
      JSON.stringify(consent));
    log('consent-scroll-margin@768', consent.banner && near(consent.scrollMargin, consent.h),
      `scrollMarginBottom=${consent.scrollMargin} bannerH=${consent.h} (global * rule in index.css)`);

    // scrollIntoView a footer link (behavior:'instant' — site CSS smooth-scrolls)
    // and assert elementFromPoint at its center resolves to the link, not the banner.
    const hit = await page.evaluate(() => {
      const link = document.querySelector('footer a');
      const banner = document.querySelector('[data-testid="consent-banner"]');
      if (!link || !banner) return { ok: false, why: 'footer link or banner missing' };
      link.scrollIntoView({ block: 'end', behavior: 'instant' });
      const r = link.getBoundingClientRect();
      const bTop = banner.getBoundingClientRect().top;
      const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      const onLink = !!at && (at === link || link.contains(at) || at.contains(link));
      const onBanner = !!at && banner.contains(at);
      return { ok: onLink && !onBanner && r.bottom <= bTop + 1, why: `target="${(link.textContent || '').trim().slice(0, 25)}" bottom=${Math.round(r.bottom)} bannerTop=${Math.round(bTop)} hit=${at ? at.tagName : 'none'} onBanner=${onBanner}` };
    });
    log('consent-hittest@768', hit.ok, hit.why);
    await page.screenshot({ path: `${OUT}/home-consent-768.png` }).catch(() => {});
  }

  // ---- home CTA reachable (hit-test) with the banner still visible ----
  const cta = await page.evaluate((vw) => {
    const el = document.querySelector('[data-testid="button-browse-recommendations"], [data-testid="link-browse-all-resources"], a[href="/login"]');
    if (!el) return { found: false };
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
    const r = el.getBoundingClientRect();
    const at = document.elementFromPoint(Math.min(r.left + r.width / 2, vw - 2), r.top + r.height / 2);
    const hitOk = !!at && (at === el || el.contains(at) || at.contains(el));
    const banner = document.querySelector('[data-testid="consent-banner"]');
    const onBanner = !!at && !!banner && banner.contains(at);
    return { found: true, inBounds: r.left >= -1 && r.right <= vw + 1, hitOk, onBanner, w: Math.round(r.width), right: Math.round(r.right) };
  }, w);
  log(`home-cta@${w}`, cta.found && cta.inBounds && cta.hitOk && !cta.onBanner, JSON.stringify(cta));
  if (w === 320) await page.screenshot({ path: `${OUT}/home-320.png` }).catch(() => {});
  await ctx.close();
}

// ---- search grid: >=280px cols @768, single col @320 ----
for (const w of [768, 320]) {
  const { ctx, page } = await newPage(w, 900);
  await goto(page, '/search?q=video');
  await page.waitForSelector('[data-testid="text-result-count"], [data-testid="text-no-results"]', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => {
    const grid = [...document.querySelectorAll('div.grid')].find(g => /auto-fill/.test(getComputedStyle(g).gridTemplateColumns) || g.children.length > 0 && getComputedStyle(g).display === 'grid' && g.querySelector('[data-testid^="card-"], a'));
    if (!grid) return { found: false };
    const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').map(parseFloat).filter(n => n > 0);
    return { found: true, cols: cols.length, min: Math.round(Math.min(...cols)), items: grid.children.length };
  });
  const pass = w === 768 ? r.found && r.min >= 280 : r.found && r.cols === 1;
  log(`search-grid@${w}`, pass, JSON.stringify(r));
  if (!pass) await page.screenshot({ path: `${OUT}/search-${w}.png` }).catch(() => {});
  await ctx.close();
}

// ---- search dialog: exactly one dismiss control ----
{
  const { ctx, page } = await newPage(1280, 900);
  await goto(page, '/');
  const openBtn = page.locator('button[aria-label="Open search"]').first();
  const ok = await openBtn.waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false);
  if (!ok) { log('search-dialog-dismiss', false, 'Open search button not found'); }
  else {
    await openBtn.click();
    const opened = await page.waitForSelector('[role="dialog"][data-state="open"]', { timeout: 10000 }).then(() => true).catch(() => false);
    if (!opened) { log('search-dialog-dismiss', false, 'search dialog did not open'); }
    else {
      const r = await page.evaluate(() => {
        const dlg = document.querySelector('[role="dialog"][data-state="open"]');
        const label = (e) => (e.getAttribute('aria-label') || e.querySelector('.sr-only')?.textContent || (e.textContent || '')).trim();
        const dismiss = [...dlg.querySelectorAll('button')].filter(b => /close|dismiss/i.test(label(b)) && b.getBoundingClientRect().width > 0);
        return { dismiss: dismiss.length, labels: dismiss.map(label).slice(0, 3) };
      });
      log('search-dialog-dismiss', r.dismiss === 1, JSON.stringify(r));
    }
  }
  await ctx.close();
}

// ---- mobile drawer rows >=44px @375 ----
{
  const { ctx, page } = await newPage(375, 812);
  await goto(page, '/');
  const trigger = page.locator('button[data-sidebar="trigger"]').first();
  const trigOk = await trigger.waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false);
  if (!trigOk) { log('drawer-rows@375', false, 'hamburger trigger not visible'); }
  else {
    await trigger.click();
    const opened = await page.waitForSelector('[data-sidebar="sidebar"][data-mobile="true"][data-state="open"]', { timeout: 10000 }).then(() => true).catch(() => false);
    if (!opened) { log('drawer-rows@375', false, 'drawer did not open'); }
    else {
      await page.waitForTimeout(600);
      const r = await page.evaluate(() => {
        const sheet = document.querySelector('[data-sidebar="sidebar"][data-mobile="true"]');
        const rows = [...sheet.querySelectorAll('[data-sidebar="menu-button"], a, button')]
          .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
        const short = rows.filter(e => e.getBoundingClientRect().height < 43.5);
        return { rows: rows.length, short: short.length, sample: short[0] ? `${(short[0].textContent || short[0].getAttribute('aria-label') || '?').trim().slice(0, 30)}=${Math.round(short[0].getBoundingClientRect().height)}px` : null };
      });
      log('drawer-rows@375', r.rows > 3 && r.short === 0, JSON.stringify(r));
      if (r.short > 0) await page.screenshot({ path: `${OUT}/drawer-375.png` }).catch(() => {});
    }
  }
  await ctx.close();
}

// ---- theme preview inert + text >=12px; back link >=24px ----
{
  const { ctx, page } = await newPage(768, 900);
  await goto(page, '/settings/theme');
  await page.waitForSelector('[data-testid="preview-card"]', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => {
    const card = document.querySelector('[data-testid="preview-card"]');
    if (!card) return { found: false };
    const inert = card.hasAttribute('inert');
    const note = !!document.querySelector('[data-testid="preview-display-only-note"]');
    let minFont = Infinity, under = 0;
    for (const el of card.querySelectorAll('*')) {
      const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 0);
      if (!hasText) continue;
      const b = el.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      minFont = Math.min(minFont, fs);
      if (fs < 12) under++;
    }
    const back = document.querySelector('[data-testid="link-back-home"]');
    const bh = back ? back.getBoundingClientRect().height : 0;
    return { found: true, inert, note, minFont, under, backH: Math.round(bh) };
  });
  log('theme-preview-inert', r.found && r.inert && r.note, `inert=${r.inert} displayOnlyNote=${r.note}`);
  log('theme-preview-text', r.found && r.under === 0, `minFont=${r.minFont}px under12=${r.under}`);
  log('back-link-size', r.found && r.backH >= 24, `backLinkHeight=${r.backH}px (>=24 required)`);
  await page.screenshot({ path: `${OUT}/theme-768.png` }).catch(() => {});
  await ctx.close();
}

fs.writeFileSync(`${OUT}/tablet-audit.json`, JSON.stringify(results, null, 2));
const fails = results.filter(x => !x.pass);
console.log(`\nTOTAL ${results.length}, FAIL ${fails.length} (evidence: ${OUT})`);
await browser.close();
process.exit(fails.length ? 1 : 0);

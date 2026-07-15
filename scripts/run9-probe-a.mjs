import { chromium } from 'playwright';
const exePath = new URL('../.cache/ms-playwright/chromium-1223/chrome-linux64/chrome', import.meta.url).pathname;
const BASE = 'https://awesome.video';
const browser = await chromium.launch({ executablePath: exePath });

// --- mobile touch targets (BUG-013) ---
{
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);
  const small = await page.evaluate(() => {
    const els = [...document.querySelectorAll('a,button,[role="button"],input,select')];
    const out = [];
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue; // hidden
      const st = getComputedStyle(el);
      if (st.visibility === 'hidden' || st.display === 'none') continue;
      if (r.height < 44 || r.width < 44) {
        out.push({ tag: el.tagName, txt: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height), cls: (el.className + '').slice(0, 60) });
      }
    }
    return out;
  });
  console.log('BUG-013 mobile <44px count:', small.length);
  console.log(JSON.stringify(small.slice(0, 25), null, 0));
  await ctx.close();
}

// --- desktop home: search input timing, hover states, Login label, footer, sort button ---
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  // BUG-019: query immediately, no wait
  const searchNow = await page.evaluate(() => !!document.querySelector('input[type="search"], input[placeholder*="earch"], [data-testid*="search"] input, button[aria-label*="earch"], [data-testid*="search"]'));
  console.log('BUG-019 search element present immediately after domcontentloaded:', searchNow);
  await page.waitForTimeout(2500);
  const searchLater = await page.evaluate(() => {
    const el = document.querySelector('input[type="search"], input[placeholder*="earch"], button[aria-label*="earch"], [data-testid*="search"]');
    return el ? el.outerHTML.slice(0, 150) : null;
  });
  console.log('BUG-019 search element after wait:', searchLater);

  // BUG-025: auth terminology on header
  const authLabels = await page.evaluate(() => [...document.querySelectorAll('a,button')].map(e => (e.textContent || '').trim()).filter(t => /^(log ?in|sign ?in)$/i.test(t)));
  console.log('BUG-025 header auth labels:', JSON.stringify(authLabels));

  // BUG-023: category card hover
  const card = await page.$('a[href^="/category/"]');
  if (card) {
    const before = await card.evaluate(el => { const c = el.closest('[class*="card"], .group') || el; const s = getComputedStyle(c); return { bg: s.backgroundColor, sh: s.boxShadow, tr: s.transform, bc: s.borderColor }; });
    await card.hover(); await page.waitForTimeout(600);
    const after = await card.evaluate(el => { const c = el.closest('[class*="card"], .group') || el; const s = getComputedStyle(c); return { bg: s.backgroundColor, sh: s.boxShadow, tr: s.transform, bc: s.borderColor }; });
    console.log('BUG-023 card hover before:', JSON.stringify(before));
    console.log('BUG-023 card hover after :', JSON.stringify(after));
    console.log('BUG-023 changed:', JSON.stringify(before) !== JSON.stringify(after));
  } else console.log('BUG-023: no category card link found');

  // BUG-024: sidebar nav hover
  const nav = await page.$('[data-sidebar] a, aside a, nav a[href="/journeys"], a[href="/submit"]');
  if (nav) {
    const b = await nav.evaluate(el => { const s = getComputedStyle(el); return { bg: s.backgroundColor, col: s.color }; });
    await nav.hover(); await page.waitForTimeout(600);
    const a = await nav.evaluate(el => { const s = getComputedStyle(el); return { bg: s.backgroundColor, col: s.color }; });
    console.log('BUG-024 nav hover before:', JSON.stringify(b), 'after:', JSON.stringify(a), 'changed:', JSON.stringify(b) !== JSON.stringify(a));
  } else console.log('BUG-024: no sidebar nav link found');

  // BUG-030: footer links
  const footer = await page.evaluate(() => {
    const f = document.querySelector('footer');
    if (!f) return null;
    return { links: [...f.querySelectorAll('a')].map(a => (a.textContent || '').trim()).slice(0, 30), text: (f.innerText || '').slice(0, 200) };
  });
  console.log('BUG-030 footer:', JSON.stringify(footer));

  // BUG-009: search dialog garbage query
  await page.keyboard.press('Meta+KeyK').catch(() => {});
  await page.waitForTimeout(500);
  let dialogOpen = await page.$('[role="dialog"]');
  if (!dialogOpen) {
    const btn = await page.$('button[aria-label*="earch"], [data-testid*="search"]');
    if (btn) { await btn.click(); await page.waitForTimeout(500); dialogOpen = await page.$('[role="dialog"]'); }
  }
  if (dialogOpen) {
    await page.keyboard.type('xyznonexistent12345');
    await page.waitForTimeout(1200);
    const dlg = await page.evaluate(() => document.querySelector('[role="dialog"]')?.innerText?.slice(0, 300));
    console.log('BUG-009 dialog after garbage query:', JSON.stringify(dlg));
  } else console.log('BUG-009: could not open search dialog');
  await ctx.close();
}

// --- BUG-028: /?sort=name-asc sort button ---
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/?sort=name-asc', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);
  const sortBtn = await page.evaluate(() => {
    const els = [...document.querySelectorAll('button')].filter(b => /sort|default|name|newest|oldest/i.test(b.textContent || ''));
    return els.map(b => (b.textContent || '').trim()).slice(0, 5);
  });
  console.log('BUG-028 sort-ish buttons on /?sort=name-asc:', JSON.stringify(sortBtn));
  await ctx.close();
}
await browser.close();

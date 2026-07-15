import { chromium } from 'playwright';
const exePath = new URL('../.cache/ms-playwright/chromium-1223/chrome-linux64/chrome', import.meta.url).pathname;
const BASE = 'https://awesome.video';
const browser = await chromium.launch({ executablePath: exePath });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// BUG-010 + BUG-017: resource page share + external link
await page.goto(BASE + '/resource/184847', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1200);
const ext = await page.evaluate(() => {
  const out = [];
  for (const a of document.querySelectorAll('a[href^="http"]')) {
    if (!a.href.includes('awesome.video')) out.push({ txt: (a.textContent || a.getAttribute('aria-label') || '').trim().slice(0, 30), target: a.target, rel: a.rel });
  }
  return out.slice(0, 8);
});
console.log('BUG-017 external links:', JSON.stringify(ext));
const shareBtn = await page.$('button:has-text("Share"), [aria-label*="hare"]');
if (shareBtn) {
  await shareBtn.click();
  await page.waitForTimeout(1000);
  const toast = await page.evaluate(() => {
    const t = document.querySelector('[role="status"], [data-sonner-toast], .toast, [class*="toast"], [role="dialog"]');
    return t ? (t.innerText || '').slice(0, 120) : null;
  });
  console.log('BUG-010 share feedback:', JSON.stringify(toast));
} else console.log('BUG-010: no Share button found');

// BUG-020: journey breadcrumb
await page.goto(BASE + '/journey/6', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1200);
const bc = await page.evaluate(() => {
  const n = document.querySelector('nav[aria-label*="read"], [class*="breadcrumb"], nav ol');
  return n ? (n.innerText || '').replace(/\n/g, ' > ').slice(0, 120) : null;
});
console.log('BUG-020 breadcrumb on /journey/6:', JSON.stringify(bc));

// BUG-021: duplicate step badges on /journeys
await page.goto(BASE + '/journeys', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1200);
const badges = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('a[href^="/journey/"], [class*="card"]')].filter(c => /steps/i.test(c.innerText || ''));
  return cards.slice(0, 8).map(c => {
    const m = (c.innerText || '').match(/\d+\s*steps/gi) || [];
    return { title: (c.innerText || '').split('\n')[0]?.slice(0, 45), stepBadges: m };
  });
});
console.log('BUG-021 step badges per card:', JSON.stringify(badges, null, 0));

// BUG-022 + BUG-027: category page AMD dupes + filter/sort overlap
await page.goto(BASE + '/category/encoding-codecs', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1500);
const amd = await page.evaluate(() => {
  const txts = [...document.querySelectorAll('a[href^="/resource/"]')].map(a => (a.innerText || '').split('\n')[0].trim()).filter(t => /amd/i.test(t));
  return txts.slice(0, 10);
});
console.log('BUG-022 AMD-ish titles on page 1:', JSON.stringify(amd));
const filterBtn = await page.$('button:has-text("Filter")');
const sortBtn = await page.$('button:has-text("Default"), button:has-text("Sort"), button:has-text("Newest"), button:has-text("Name")');
if (filterBtn && sortBtn) {
  await filterBtn.click(); await page.waitForTimeout(600);
  const filterOpen1 = await page.evaluate(() => !!document.querySelector('[class*="filter"] [role], [data-state="open"]'));
  await sortBtn.click(); await page.waitForTimeout(600);
  const both = await page.evaluate(() => {
    const openEls = [...document.querySelectorAll('[data-state="open"]')].map(e => (e.textContent || '').slice(0, 40));
    return openEls;
  });
  console.log('BUG-027 filter open then sort clicked; open elements:', JSON.stringify(both).slice(0, 300), '| filterOpen after step1:', filterOpen1);
} else console.log('BUG-027: buttons found? filter:', !!filterBtn, 'sort:', !!sortBtn);
await browser.close();

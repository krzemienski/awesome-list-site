// Phase 3c — Verify HIGH bugs + capture missing screenshots
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = '/Users/nick/Desktop/awesome-list-site/hunt-workspace/screenshots';

(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();

  // 1. Theme toggle — REPRODUCE FROM SCRATCH (per Phase 4 rule)
  await p.goto('https://awesome.video/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  const beforeClass = await p.evaluate(() => document.documentElement.className);
  const beforeHtmlClass = await p.evaluate(() => document.body.className);
  const beforeBg = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await p.screenshot({ path: `${OUT}/theme_repro1_before.png`, fullPage: false });

  // Try to find the theme toggle button on landing
  const themeLink = await p.$('a[href*="/settings/theme"]');
  if (themeLink) {
    await themeLink.click();
    await p.waitForLoadState('domcontentloaded');
    await p.waitForTimeout(2000);
  } else {
    await p.goto('https://awesome.video/settings/theme', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1500);
  }
  const afterClass = await p.evaluate(() => document.documentElement.className);
  const afterHtmlClass = await p.evaluate(() => document.body.className);
  const afterBg = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await p.screenshot({ path: `${OUT}/theme_repro1_after.png`, fullPage: false });

  // Try clicking a "Dark" / "Light" button on the theme page
  const buttons = await p.$$('button');
  let clicked = [];
  for (let i = 0; i < buttons.length; i++) {
    const t = (await buttons[i].evaluate(el => el.textContent||'')).trim().slice(0, 30);
    clicked.push(t);
    if (/dark|light|theme|system|toggle/i.test(t)) {
      try {
        await buttons[i].click();
        await p.waitForTimeout(1200);
        const after2Class = await p.evaluate(() => document.documentElement.className);
        const after2Bg = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
        await p.screenshot({ path: `${OUT}/theme_repro1_clicked_${i}.png`, fullPage: false });
        console.log('clicked button', i, 'text', JSON.stringify(t), 'class after:', after2Class, 'bg after:', after2Bg);
      } catch (e) { console.log('click fail', e.message); }
    }
  }
  console.log('BUTTONS:', clicked);

  console.log('---');
  console.log('before class:', beforeClass, 'before bg:', beforeBg);
  console.log('after class:', afterClass, 'after bg:', afterBg);
  console.log('toggle class unchanged:', beforeClass === afterClass, 'bg unchanged:', beforeBg === afterBg);

  await p.close();

  // 2. Search — look on EVERY page in main area
  const ctx2 = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p2 = await ctx2.newPage();
  await p2.goto('https://awesome.video/', { waitUntil: 'domcontentloaded' });
  await p2.waitForTimeout(2500);
  // search input candidates
  const searchInputs = await p2.evaluate(() => {
    const candidates = [...document.querySelectorAll('input, [role="searchbox"], [role="combobox"]')]
      .filter(el => {
        const p = (el.placeholder||'').toLowerCase();
        const n = (el.getAttribute('name')||'').toLowerCase();
        const t = (el.getAttribute('type')||'').toLowerCase();
        return /search|query|find|q\b/.test(p) || /search|query|q\b/.test(n) || t === 'search';
      });
    return candidates.map(el => ({ tag: el.tagName, name: el.getAttribute('name'), type: el.type, placeholder: el.placeholder, visible: el.offsetParent !== null }));
  });
  console.log('SEARCH-CANDIDATES-LANDING:', JSON.stringify(searchInputs, null, 0));

  // Visible "search-like" text strings on the page (header/footer)
  const labels = await p2.evaluate(() => {
    const labels = [...document.querySelectorAll('label, button, a')].map(el => (el.textContent||'').trim().toLowerCase()).filter(t => t && t.length < 50);
    return [...new Set(labels)].slice(0, 80);
  });
  console.log('VISIBLE-LABELS:', JSON.stringify(labels.filter(l => /search|find|filter|discover|browse/.test(l))));

  await p2.screenshot({ path: `${OUT}/landing_search_check.png`, fullPage: true });

  // 3. Check mobile landing for a search affordance (since user can browse)
  const ctx3 = await b.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const p3 = await ctx3.newPage();
  await p3.goto('https://awesome.video/', { waitUntil: 'domcontentloaded' });
  await p3.waitForTimeout(2000);
  await p3.screenshot({ path: `${OUT}/mobile_landing_search.png`, fullPage: false });
  const mobileSearch = await p3.evaluate(() => [...document.querySelectorAll('input, [role="searchbox"]')].map(el => ({ placeholder: el.placeholder, visible: el.offsetParent !== null })));
  console.log('MOBILE-SEARCH-INPUTS:', JSON.stringify(mobileSearch));

  await b.close();
})();

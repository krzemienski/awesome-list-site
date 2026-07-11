// Phase 3b — Deep interaction audit (authenticated + non-auth core flows)
const { chromium } = require('playwright');
const fs = require('fs');

const AUTH = JSON.parse(fs.readFileSync('/Users/nick/Desktop/awesome-list-site/hunt-workspace/hunt-auth.json', 'utf8'));
const OUT = '/Users/nick/Desktop/awesome-list-site/hunt-workspace/screenshots';

(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, storageState: AUTH });
  const findings = [];
  function rec(category, severity, title, url, evidence, details) {
    findings.push({ category, severity, title, url, evidence, details });
  }

  // ===== Test 1: Admin dashboard renders data =====
  {
    const p = await ctx.newPage();
    const errs = [];
    p.on('console', m => { if (m.type()==='error') errs.push(m.text().slice(0,200)); });
    await p.goto('https://awesome.video/admin', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2500);
    const path = `${OUT}/admin_dashboard.png`;
    await p.screenshot({ path, fullPage: true });
    const txt = (await p.evaluate(() => document.body.innerText)).slice(0, 800);
    if (/Loading admin dashboard\.\.\./i.test(txt)) rec('admin', 'HIGH', 'Admin dashboard stuck on "Loading admin dashboard…" forever', 'https://awesome.video/admin', path, { consoleErrors: [...new Set(errs)].slice(0,3) });
    if (errs.length) rec('admin', 'MEDIUM', 'Console errors on /admin', 'https://awesome.video/admin', path, { consoleErrors: [...new Set(errs)].slice(0,3) });
    await p.close();
  }

  // ===== Test 2: /admin/categories =====
  {
    const p = await ctx.newPage();
    const errs = [];
    p.on('console', m => { if (m.type()==='error') errs.push(m.text().slice(0,200)); });
    await p.goto('https://awesome.video/admin/categories', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2000);
    const path = `${OUT}/admin_categories.png`;
    await p.screenshot({ path, fullPage: true });
    const status = (await p.evaluate(() => ({ txt: document.body.innerText.slice(0,400), count: document.querySelectorAll('button, a, tr, [role="button"]').length })));
    if (status.count < 5) rec('admin', 'HIGH', 'Admin categories page renders empty / no list', 'https://awesome.video/admin/categories', path, { text: status.txt.replace(/\n/g,' | ') });
    if (errs.length) rec('admin', 'MEDIUM', 'Console errors on /admin/categories', 'https://awesome.video/admin/categories', path, { consoleErrors: [...new Set(errs)].slice(0,3) });
    await p.close();
  }

  // ===== Test 3: /admin/resources =====
  {
    const p = await ctx.newPage();
    const errs = [];
    p.on('console', m => { if (m.type()==='error') errs.push(m.text().slice(0,200)); });
    await p.goto('https://awesome.video/admin/resources', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2000);
    const path = `${OUT}/admin_resources.png`;
    await p.screenshot({ path, fullPage: true });
    const status = (await p.evaluate(() => ({ txt: document.body.innerText.slice(0,400), count: document.querySelectorAll('button, a, tr, [role="button"]').length })));
    if (status.count < 5) rec('admin', 'HIGH', 'Admin resources page renders empty / no list', 'https://awesome.video/admin/resources', path, { text: status.txt.replace(/\n/g,' | ') });
    if (errs.length) rec('admin', 'MEDIUM', 'Console errors on /admin/resources', 'https://awesome.video/admin/resources', path, { consoleErrors: [...new Set(errs)].slice(0,3) });
    await p.close();
  }

  // ===== Test 4: /submit =====
  {
    const p = await ctx.newPage();
    const errs = [];
    p.on('console', m => { if (m.type()==='error') errs.push(m.text().slice(0,200)); });
    await p.goto('https://awesome.video/submit', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2000);
    const path = `${OUT}/submit.png`;
    await p.screenshot({ path, fullPage: true });
    const inputs = await p.evaluate(() => [...document.querySelectorAll('input,textarea,select')].map(i => ({ name: i.name, type: i.type, placeholder: i.placeholder, required: i.required })));
    if (inputs.length === 0) rec('submit', 'HIGH', 'Submit form has no inputs', 'https://awesome.video/submit', path, { text: (await p.evaluate(() => document.body.innerText)).slice(0,400).replace(/\n/g, ' | ') });
    if (errs.length) rec('submit', 'MEDIUM', 'Console errors on /submit', 'https://awesome.video/submit', path, { consoleErrors: [...new Set(errs)].slice(0,3) });
    await p.close();
  }

  // ===== Test 5: Theme toggle =====
  {
    const p = await ctx.newPage();
    const errs = [];
    p.on('console', m => { if (m.type()==='error') errs.push(m.text().slice(0,200)); });
    await p.goto('https://awesome.video/', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2000);
    const beforeHtml = await p.evaluate(() => document.documentElement.className + ' ' + document.documentElement.getAttribute('data-theme'));
    await p.screenshot({ path: `${OUT}/theme_before.png`, fullPage: false });
    const themeLink = await p.$('a[href*="settings/theme"], a[href*="/settings/theme"]');
    if (themeLink) {
      await themeLink.click();
      await p.waitForLoadState('domcontentloaded');
      await p.waitForTimeout(1500);
      const afterHtml = await p.evaluate(() => document.documentElement.className + ' ' + document.documentElement.getAttribute('data-theme'));
      const path = `${OUT}/theme_after.png`;
      await p.screenshot({ path, fullPage: false });
      if (beforeHtml === afterHtml) rec('settings', 'HIGH', 'Theme toggle does nothing — page classes unchanged', 'https://awesome.video/settings/theme', path, { before: beforeHtml, after: afterHtml });
    }
    await p.close();
  }

  // ===== Test 6: Search =====
  {
    const p = await ctx.newPage();
    const errs = [];
    p.on('console', m => { if (m.type()==='error') errs.push(m.text().slice(0,200)); });
    await p.goto('https://awesome.video/', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1500);
    const search = await p.$('input[placeholder*="earch"], input[name*="earch"], input[type="search"]');
    if (search) {
      await search.fill('ffmpeg');
      await search.press('Enter');
      await p.waitForTimeout(1800);
      const afterUrl = p.url();
      const txt = (await p.evaluate(() => document.body.innerText)).slice(0, 500).replace(/\n/g,' | ');
      const path = `${OUT}/search_ffmpeg.png`;
      await p.screenshot({ path, fullPage: false });
      if (!/\?q=/i.test(afterUrl) && !/search/i.test(afterUrl)) rec('search', 'HIGH', 'Search submit does not navigate to a results page', 'https://awesome.video/', path, { afterUrl, textSnippet: txt });
    } else {
      rec('search', 'HIGH', 'No search input found on landing page', 'https://awesome.video/', `${OUT}/search_missing.png`, {});
    }
    await p.close();
  }

  // ===== Test 7: Recommendations =====
  {
    const p = await ctx.newPage();
    const errs = [];
    p.on('console', m => { if (m.type()==='error') errs.push(m.text().slice(0,200)); });
    await p.goto('https://awesome.video/recommendations', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1500);
    const path = `${OUT}/recommendations.png`;
    await p.screenshot({ path, fullPage: true });
    const txt = (await p.evaluate(() => document.body.innerText)).slice(0, 600).replace(/\n/g, ' | ');
    if (/Loading\.\.\./i.test(txt) && txt.length < 700) rec('recommendations', 'HIGH', 'Recommendations page stuck loading', 'https://awesome.video/recommendations', path, { text: txt });
    if (errs.length) rec('recommendations', 'MEDIUM', 'Console errors on /recommendations', 'https://awesome.video/recommendations', path, { consoleErrors: [...new Set(errs)].slice(0,3) });
    await p.close();
  }

  // ===== Test 8: Journey detail =====
  {
    const p = await ctx.newPage();
    await p.goto('https://awesome.video/journeys', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `${OUT}/journeys.png`, fullPage: true });
    const links = await p.$$('a[href*="/journey"]');
    if (links.length > 0) {
      await links[0].click();
      await p.waitForLoadState('domcontentloaded');
      await p.waitForTimeout(2000);
      await p.screenshot({ path: `${OUT}/journey_detail.png`, fullPage: true });
      const txt = (await p.evaluate(() => document.body.innerText)).slice(0, 400);
      rec('journeys', 'INFO', 'Journey detail reachable', p.url(), `${OUT}/journey_detail.png`, { textSnippet: txt.replace(/\n/g, ' | ') });
    }
    await p.close();
  }

  // ===== Test 9: 404 page =====
  {
    const p = await ctx.newPage();
    await p.goto('https://awesome.video/this-route-does-not-exist-zzz', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `${OUT}/404_page.png`, fullPage: false });
    const txt = (await p.evaluate(() => document.body.innerText)).slice(0, 400).replace(/\n/g, ' | ');
    rec('404', 'INFO', 'Unknown URL response', p.url(), `${OUT}/404_page.png`, { text: txt });
    await p.close();
  }

  // ===== Test 10: Settings/theme =====
  {
    const p = await ctx.newPage();
    const errs = [];
    p.on('console', m => { if (m.type()==='error') errs.push(m.text().slice(0,200)); });
    await p.goto('https://awesome.video/settings/theme', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2000);
    await p.screenshot({ path: `${OUT}/settings_theme.png`, fullPage: true });
    const buttons = await p.evaluate(() => [...document.querySelectorAll('button')].map(b => (b.textContent||'').trim().slice(0,30)));
    rec('settings', 'INFO', 'Theme settings page', 'https://awesome.video/settings/theme', `${OUT}/settings_theme.png`, { buttons });
    await p.close();
  }

  await b.close();
  fs.writeFileSync('/Users/nick/Desktop/awesome-list-site/hunt-workspace/interaction-findings.json', JSON.stringify(findings, null, 1));
  console.log('INTERACTION-FINDINGS', findings.length);
})();

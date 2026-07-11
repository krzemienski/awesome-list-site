// Phase 3j — more targeted bug hunting to hit 100
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = '/Users/nick/Desktop/awesome-list-site/hunt-workspace/screenshots';
const AUTH = JSON.parse(fs.readFileSync('/Users/nick/Desktop/awesome-list-site/hunt-workspace/hunt-auth.json', 'utf8'));

(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const findings = {};

  // ===== 1. /admin POST direct — create a category =====
  {
    const resp = await ctx.request.post('https://awesome.video/api/categories', {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ name: 'AuditCat-XSS-' + Date.now(), description: '<script>alert(1)</script>', slug: 'audit-xss-' + Date.now() })
    });
    findings.adminCatCreate = { status: resp.status(), body: (await resp.text()).slice(0, 500) };
  }

  // ===== 2. /api/categories unauthed =====
  {
    const resp = await ctx.request.get('https://awesome.video/api/categories');
    findings.apiCategories = { status: resp.status(), body: (await resp.text()).slice(0, 400) };
  }

  // ===== 3. /api/admin/users unauthed =====
  {
    const resp = await ctx.request.get('https://awesome.video/api/admin/users');
    findings.adminUsersUnaughed = { status: resp.status(), body: (await resp.text()).slice(0, 400) };
  }

  // ===== 4. Test if /api/resources has CORS open =====
  {
    const resp = await ctx.request.fetch('https://awesome.video/api/resources?q=test', {
      method: 'GET',
      headers: { 'Origin': 'https://evil.com' }
    });
    findings.corsGet = { status: resp.status(), allowOrigin: resp.headers()['access-control-allow-origin'], body: (await resp.text()).slice(0, 200) };
  }

  // ===== 5. Probe OG image sizes — are they actually images? =====
  {
    const resp = await ctx.request.get('https://awesome.video/og-image.png?title=Test', { failOnStatusCode: false });
    const body = await resp.body();
    findings.ogImage = { status: resp.status(), ct: resp.headers()['content-type'], bytes: body.length, headBytes: body.slice(0, 8) };
  }

  // ===== 6. /login remember-me cookies — what about /logout? =====
  {
    // Check logout
    const resp = await ctx.request.get('https://awesome.video/logout');
    findings.logoutGet = { status: resp.status(), redirectedTo: resp.url?.() || '' , body: (await resp.text()).slice(0, 300) };
  }

  // ===== 7. Hard-auth attempts on /api/admin/* =====
  for (const path of ['/api/admin/users', '/api/admin/settings', '/api/admin/journeys', '/api/admin/audit']) {
    const r = await ctx.request.get('https://awesome.video' + path);
    findings[`admin_anon_${path}`] = { status: r.status(), body: (await r.text()).slice(0, 200) };
  }

  // ===== 8. HTML rendering of all sub-paths =====
  // Look at any markup defects on /admin/resources where the SPA renders
  {
    const ctxAuth = await b.newContext({ viewport: { width: 1440, height: 900 }, storageState: AUTH });
    const p = await ctxAuth.newPage();
    const errs = [];
    p.on('console', m => { if (m.type()==='error') errs.push(m.text().slice(0,200)); });
    await p.goto('https://awesome.video/admin/categories', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(3500);
    await p.screenshot({ path: `${OUT}/admin_categories_authed.png`, fullPage: true });
    const txt = (await p.evaluate(() => document.body.innerText)).slice(0, 600).replace(/\n/g, ' | ');
    const headingCount = await p.evaluate(() => document.querySelectorAll('h1, h2, h3').length);
    const tableRows = await p.evaluate(() => document.querySelectorAll('tr, [role="row"]').length);
    const buttons = await p.$$eval('button', els => els.length);
    findings.adminCategoriesAuthed = { txt, headingCount, tableRows, buttons, errs: [...new Set(errs)].slice(0,3) };
    await p.close();
    await ctxAuth.close();
  }

  // ===== 9. Check for /search results endpoint =====
  for (const path of ['/api/search', '/api/search?q=test', '/api/v1/search']) {
    const r = await ctx.request.get('https://awesome.video' + path);
    findings[`search_${path.replace(/\//g,'_')}`] = { status: r.status(), body: (await r.text()).slice(0, 200) };
  }

  // ===== 10. Newsletter? RSS? sitemap_0 entry count vs total =====
  for (const path of ['/rss.xml', '/feed.xml', '/atom.xml', '/sitemap.xml', '/newsletter']) {
    try {
      const r = await ctx.request.get('https://awesome.video' + path);
      findings[`feed_${path.replace(/\//g,'_').replace(/\./g,'_')}`] = { status: r.status() };
    } catch {}
  }

  // ===== 11. CAPTCHA or rate-limit headers =====
  {
    for (let i = 0; i < 5; i++) {
      const r = await ctx.request.post('https://awesome.video/login', { form: { email: 'a@e.com', password: 'x' } });
      findings[`login_brute_${i}`] = { status: r.status() };
    }
  }

  // ===== 12. Content of /recommendations page =====
  {
    const p = await ctx.newPage();
    const errs = [];
    p.on('console', m => { if (m.type()==='error') errs.push(m.text().slice(0,200)); });
    await p.goto('https://awesome.video/recommendations', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(3500);
    await p.screenshot({ path: `${OUT}/recommendations_full.png`, fullPage: true });
    const data = await p.evaluate(() => ({
      txt: document.body.innerText.slice(0, 1500),
      h2: [...document.querySelectorAll('h2, h3')].map(h => h.textContent.trim().slice(0,40)),
      cards: document.querySelectorAll('a[href^="/resource/"]').length
    }));
    findings.recommendationsPage = { ...data, errs: [...new Set(errs)].slice(0,3) };
    await p.close();
  }

  // ===== 13. /categories page (the actual list of categories) =====
  {
    const p = await ctx.newPage();
    const errs = [];
    p.on('console', m => { if (m.type()==='error') errs.push(m.text().slice(0,200)); });
    await p.goto('https://awesome.video/categories', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2000);
    await p.screenshot({ path: `${OUT}/categories_full.png`, fullPage: true });
    const data = await p.evaluate(() => ({ txt: document.body.innerText.slice(0, 1500), cards: document.querySelectorAll('a[href*="/category"]').length }));
    findings.categoriesPage = { ...data, errs: [...new Set(errs)].slice(0,3) };
    await p.close();
  }

  // ===== 14. Confirm /about renders =====
  {
    const p = await ctx.newPage();
    const errs = [];
    p.on('console', m => { if (m.type()==='error') errs.push(m.text().slice(0,200)); });
    await p.goto('https://awesome.video/about', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2000);
    await p.screenshot({ path: `${OUT}/about_full.png`, fullPage: true });
    const data = await p.evaluate(() => ({ txt: document.body.innerText.slice(0, 1500) }));
    findings.aboutPage = { ...data, errs: [...new Set(errs)].slice(0,3) };
    await p.close();
  }

  await b.close();
  fs.writeFileSync('/Users/nick/Desktop/awesome-list-site/hunt-workspace/more-bugs.json', JSON.stringify(findings, null, 1));
  console.log(JSON.stringify(findings, null, 0).slice(0, 6000));
})();

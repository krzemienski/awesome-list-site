// Phase 3e — security/well-known bug probe
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = '/Users/nick/Desktop/awesome-list-site/hunt-workspace/screenshots';

(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const findings = [];

  // ========== 1) CSP headers — what exactly does the response set ==========
  for (const path of ['/', '/submit', '/login', '/about', '/recommendations']) {
    const r = await ctx.request.get('https://awesome.video' + path);
    const csp = r.headers()['content-security-policy'] || r.headers()['content-security-policy-report-only'];
    const xfo = r.headers()['x-frame-options'];
    const xct = r.headers()['x-content-type-options'];
    const sts = r.headers()['strict-transport-security'];
    const refPol = r.headers()['referrer-policy'];
    const perms = r.headers()['permissions-policy'];
    findings.push({ path, status: r.status(), csp: csp ? csp.slice(0, 300) : null, xfo, xct, sts, refPol, perms });
  }

  // ========== 2) cookie security on /login ==========
  const p = await ctx.newPage();
  await p.goto('https://awesome.video/login', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/cookie_inspect.png`, fullPage: false });
  await p.close();
  const cookies = await ctx.cookies();
  findings.push({ type: 'cookies', data: cookies.map(c => ({ name: c.name, httpOnly: c.httpOnly, secure: c.secure, sameSite: c.sameSite, domain: c.domain, path: c.path, expires: c.expires, valueLen: (c.value||'').length })) });

  // ========== 3) /robots.txt and /sitemap.xml ==========
  for (const path of ['/robots.txt', '/sitemap.xml', '/sitemap-0.xml', '/sitemap_index.xml']) {
    try {
      const r = await ctx.request.get('https://awesome.video' + path);
      findings.push({ type: 'sitemap-robots', path, status: r.status(), size: (await r.text()).length });
    } catch (e) { findings.push({ type: 'sitemap-robots', path, error: e.message }); }
  }

  // ========== 4) Broken external links + a11y-ish: anchor targets that 404 ==========
  await new Promise((r) => setTimeout(r, 0));
  const ctx2 = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p2 = await ctx2.newPage();
  const bad404s = [];
  p2.on('response', r => { if (r.status() === 404) bad404s.push(r.url()); });
  await p2.goto('https://awesome.video/', { waitUntil: 'domcontentloaded' });
  await p2.waitForTimeout(2500);
  const internalAnchors = await p2.evaluate(() => [...document.querySelectorAll('a[href^="/"]')].map(a => a.getAttribute('href')));
  // Check the sitemap URLs response (hard 404 check via curl)
  const sitemapUrls = internalAnchors.slice(0, 30);
  findings.push({ type: '404-on-landing', count: bad404s.length, urls: [...new Set(bad404s)].slice(0, 10), anchorsChecked: sitemapUrls.length });
  await p2.close();

  // ========== 5) /login error handling — wrong creds ==========
  const ctx3 = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p3 = await ctx3.newPage();
  const errs = [];
  p3.on('console', m => { if (m.type()==='error') errs.push(m.text().slice(0, 200)); });
  await p3.goto('https://awesome.video/login', { waitUntil: 'domcontentloaded' });
  await p3.waitForTimeout(1200);
  await p3.fill('input[name="email"]', 'haxor@evil.com');
  await p3.fill('input[name="password"]', 'definitely-wrong-password');
  await p3.click('button[type="submit"]');
  await p3.waitForLoadState('domcontentloaded');
  await p3.waitForTimeout(1500);
  await p3.screenshot({ path: `${OUT}/login_bad_creds.png`, fullPage: false });
  const txt = (await p3.evaluate(() => document.body.innerText)).slice(0, 500).replace(/\n/g, ' | ');
  findings.push({ type: 'login-bad-creds', url: p3.url(), textSnippet: txt, consoleErrs: [...new Set(errs)] });
  await p3.close();

  // ========== 6) /signup vs /register route ==========
  for (const path of ['/signup', '/register', '/forgot-password', '/reset-password', '/admin']) {
    try {
      const r = await ctx.request.get('https://awesome.video' + path, { maxRedirects: 0 });
      findings.push({ type: 'auth-routes', path, status: r.status() });
    } catch (e) {
      findings.push({ type: 'auth-routes', path, error: e.message });
    }
  }

  // ========== 7) /api endpoints to see what's exposed ==========
  for (const path of ['/api', '/api/health', '/api/resources', '/api/admin/resources', '/api/auth/login', '/api/auth/status']) {
    try {
      const r = await ctx.request.get('https://awesome.video' + path);
      const ct = r.headers()['content-type'] || '';
      findings.push({ type: 'api-endpoints', path, status: r.status(), contentType: ct, sample: (await r.text()).slice(0, 200) });
    } catch (e) { findings.push({ type: 'api-endpoints', path, error: e.message }); }
  }

  fs.writeFileSync('/Users/nick/Desktop/awesome-list-site/hunt-workspace/security-probe.json', JSON.stringify(findings, null, 1));
  console.log(JSON.stringify(findings, null, 0).slice(0, 6000));
  await b.close();
})();

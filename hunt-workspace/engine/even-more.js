// Phase 3k — even more bug hunting
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = '/Users/nick/Desktop/awesome-list-site/hunt-workspace/screenshots';

(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const findings = {};

  // ===== 1. Sitemap correctness =====
  {
    const r = await ctx.request.get('https://awesome.video/sitemap.xml');
    const xml = await r.text();
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
    findings.sitemap = { count: urls.length, sample: urls.slice(0, 5), sampleTail: urls.slice(-5) };
    // Check duplicates
    const seen = new Map();
    for (const u of urls) seen.set(u, (seen.get(u) || 0) + 1);
    findings.sitemapDups = [...seen.entries()].filter(([k, v]) => v > 1).slice(0, 20);
  }

  // ===== 2. /api/categories listing =====
  {
    const r = await ctx.request.get('https://awesome.video/api/categories');
    findings.apiCategories = { status: r.status(), body: (await r.text()).slice(0, 600) };
  }

  // ===== 3. Response header overview =====
  {
    for (const path of ['/', '/api/health', '/api/resources', '/api/categories']) {
      const r = await ctx.request.get('https://awesome.video' + path);
      findings[`hdr_${path.replace(/\//g,'_')}`] = {
        status: r.status(),
        ct: r.headers()['content-type'],
        cache: r.headers()['cache-control'],
        csp: r.headers()['content-security-policy']?.slice(0, 200),
        xfo: r.headers()['x-frame-options'],
        cf: r.headers()['cf-cache-status'] || 'no-cf-hdr',
      };
    }
  }

  // ===== 4. /admin direct API POST without auth =====
  for (const url of ['/api/admin/categories', '/api/admin/categories/edit', '/api/admin/resources/edit', '/api/admin/users', '/api/admin/users/delete']) {
    const r = await ctx.request.fetch('https://awesome.video' + url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, data: '{}' });
    findings[`unauth_post_${url.replace(/\//g,'_')}`] = { status: r.status(), body: (await r.text()).slice(0, 200) };
  }

  // ===== 5. /sitemap-0.xml? =====
  for (const path of ['/sitemap-0.xml', '/sitemap_index.xml', '/sitemap/sitemap.xml']) {
    try {
      const r = await ctx.request.get('https://awesome.video' + path);
      findings[`sitemap_${path.replace(/\//g,'_').replace(/\./g,'_')}`] = { status: r.status(), bytes: (await r.text()).length };
    } catch {}
  }

  // ===== 6. Detect honeypot fields in /login =====
  {
    const r = await ctx.request.get('https://awesome.video/login');
    const html = await r.text();
    const hidden = [...html.matchAll(/<input[^>]+type=["']hidden["'][^>]*name=["']([^"']+)["']/g)].map(m => m[1]);
    findings.loginHiddenFields = hidden;
  }

  // ===== 7. Test 404 via render — does the 404 page have a CTA? =====
  {
    const p = await ctx.newPage();
    const r = await p.goto('https://awesome.video/zzz-no-such-page-zzz', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2000);
    await p.screenshot({ path: `${OUT}/404_custom.png`, fullPage: true });
    const data = await p.evaluate(() => ({ txt: document.body.innerText.slice(0, 800), links: document.querySelectorAll('a').length }));
    findings.notFound = { status: r.status(), ...data };
    await p.close();
  }

  // ===== 8. /sitemap.xml individual URL response =====
  const sampleURLs = [
    '/category/encoding-codecs',
    '/resource/188025',
    '/journeys',
    '/advanced'
  ];
  for (const u of sampleURLs) {
    const r = await ctx.request.get('https://awesome.video' + u);
    const html = await r.text();
    const canonMatch = html.match(/<link rel=["']canonical["']\s+href=["']([^"']+)["']/);
    findings[`canon_${u.replace(/\//g,'_')}`] = { status: r.status(), canonical: canonMatch ? canonMatch[1] : null };
  }

  // ===== 9. /og-image.png direct returns what? =====
  {
    const r = await ctx.request.get('https://awesome.video/og-image.png?title=Test', { failOnStatusCode: false });
    const buf = await r.body();
    findings.ogImage = { status: r.status(), bytes: buf.length, head: buf.slice(0, 16).toString('hex') };
  }

  // ===== 10. Cookie domain issues after admin login =====
  {
    const ctxAuth = await b.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctxAuth.newPage();
    await p.goto('https://awesome.video/login', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1000);
    await p.fill('input[name="email"]', 'admin@example.com');
    await p.fill('input[name="password"]', process.env.HUNT_PW || '');
    await p.click('button[type="submit"]');
    await p.waitForLoadState('domcontentloaded');
    await p.waitForTimeout(1500);
    const cookies = await ctxAuth.cookies();
    findings.cookiesDomain = cookies.filter(c => c.name === 'connect.sid').map(c => ({ name: c.name, domain: c.domain, path: c.path, httpOnly: c.httpOnly, secure: c.secure, sameSite: c.sameSite, expires: c.expires }));
    await p.close();
    await ctxAuth.close();
  }

  await b.close();
  fs.writeFileSync('/Users/nick/Desktop/awesome-list-site/hunt-workspace/even-more.json', JSON.stringify(findings, null, 1));
  console.log(JSON.stringify(findings, null, 0).slice(0, 6000));
})();

// Phase 3r — quick bugs across headers / routes
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const findings = {};

  // 1. /api/admin/users POST without auth
  for (const body of [JSON.stringify({}), JSON.stringify({isAdmin: true}), JSON.stringify({role: 'admin'}), JSON.stringify({userId: 1})]) {
    const r = await ctx.request.post('https://awesome.video/api/admin/users', { headers: { 'Content-Type': 'application/json' }, data: body });
    findings[`admin_users_POST_${body.length}_${body.slice(0, 20)}`] = { status: r.status(), body: (await r.text()).slice(0, 100) };
  }

  // 2. /api/admin/resources without auth (various verbs)
  for (const v of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
    const r = await ctx.request.fetch('https://awesome.video/api/admin/resources', { method: v, headers: { 'Content-Type': 'application/json' }, data: '{}' });
    findings[`admin_resources_${v}`] = { status: r.status() };
  }

  // 3. /api/admin/categories PATCH without auth
  {
    const r = await ctx.request.fetch('https://awesome.video/api/admin/categories', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, data: '{"id":1,"name":"x"}' });
    findings.adminCatPatch = { status: r.status(), body: (await r.text()).slice(0, 200) };
  }

  // 4. Test overflow on / at 320 / 360 / 480 viewports
  for (const w of [320, 360, 480]) {
    const ctxN = await b.newContext({ viewport: { width: w, height: 800 }, isMobile: true, hasTouch: true });
    const p = await ctxN.newPage();
    await p.goto('https://awesome.video/', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2000);
    const ov = await p.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, clientW: window.innerWidth, overflow: document.documentElement.scrollWidth > window.innerWidth }));
    findings[`overflow_${w}`] = ov;
    await p.close();
    await ctxN.close();
  }

  // 5. Check if cookie flags are set on /api requests
  {
    const r = await ctx.request.fetch('https://awesome.video/api/resources', { method: 'GET', headers: { Origin: 'https://evil.example' } });
    findings.corsResources = {
      status: r.status(),
      allowOrigin: r.headers()['access-control-allow-origin'],
      allowCredentials: r.headers()['access-control-allow-credentials'],
      allowMethods: r.headers()['access-control-allow-methods']
    };
  }

  // 6. /api/* endpoints listed via OPTIONS (CORS)
  for (const p of ['/api/resources', '/api/categories', '/api/health', '/api/admin/resources']) {
    const r = await ctx.request.fetch('https://awesome.video' + p, { method: 'OPTIONS', headers: { 'Origin': 'https://evil.example', 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'content-type' } });
    findings[`cors_options_${p.replace(/\//g,'_')}`] = { status: r.status(), allowOrigin: r.headers()['access-control-allow-origin'] };
  }

  // 7. Check if /bookmarks.html (with extension) serves 200
  {
    const r = await ctx.request.get('https://awesome.video/bookmarks.html');
    findings.bookmarksDotHtml = { status: r.status() };
  }

  // 8. Check /admin (without trailing slash, with trailing slash)
  for (const u of ['/admin', '/admin/', '/admin//']) {
    const r = await ctx.request.get('https://awesome.video' + u);
    findings[`admin_${u.replace(/\//g,'_').replace(/_/g, '_')}`] = { status: r.status() };
  }

  await b.close();
  fs.writeFileSync('/Users/nick/Desktop/awesome-list-site/hunt-workspace/quick4.json', JSON.stringify(findings, null, 1));
  console.log(JSON.stringify(findings, null, 0).slice(0, 6000));
})();

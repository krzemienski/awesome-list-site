// Phase 3p — bug harvest pass 2: per-page, deeper per-category layouts
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = '/Users/nick/Desktop/awesome-list-site/hunt-workspace/screenshots';

const allURLs = fs.readFileSync('/Users/nick/Desktop/awesome-list-site/hunt-workspace/all-urls.txt', 'utf8').split('\n').filter(Boolean);

(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const findings = {};

  // ===== 1. /journey/6 — does the resource cards exist after H2 sections? =====
  {
    const p = await ctx.newPage();
    await p.goto('https://awesome.video/journey/6', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2500);
    const data = await p.evaluate(() => {
      const mainAnchors = document.querySelectorAll('main a, [role="main"] a');
      return { 
        mainAnchorCount: mainAnchors.length,
        mainResourceCount: [...mainAnchors].filter(a => a.getAttribute('href')?.startsWith('/resource/')).length,
        h2s: [...document.querySelectorAll('h2')].map(h => h.textContent.trim()),
        stepButtons: [...document.querySelectorAll('button')].filter(b => /step|next|prev|continue/i.test(b.textContent || b.getAttribute('aria-label') || '')).length,
        progressIndicator: document.querySelector('[role="progressbar"], [class*="progress" i]')?.outerHTML?.slice(0, 200) || null
      };
    });
    findings.journey6 = data;
    await p.close();
  }

  // ===== 2. Check every top-level category page card count vs its title count =====
  {
    const cats = allURLs.filter(u => /^\/category\/[^/]+$/.test(u) && !u.includes('?')).slice(0, 12);
    for (const u of cats) {
      const r = await ctx.request.get(u);
      const html = await r.text();
      const slug = u.split('/category/')[1].slice(0, 30);
      const titleCount = (html.match(/<h\d[^>]*>\s*(\d+)\s*<\/h\d>/g) || []).length;
      const resourceCards = (html.match(/a href="\/resource\//g) || []).length;
      findings[`cat_${slug}`] = { url: u, resourceCards };
    }
  }

  // ===== 3. /admin login CSRF — does the cookie get a CSRF token? =====
  {
    const p = await ctx.newPage();
    await p.goto('https://awesome.video/login', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1500);
    const tokens = await p.evaluate(() => {
      const meta = document.querySelector('meta[name="csrf-token"]');
      const header = document.querySelectorAll('input[name*="csrf" i], input[name*="token" i]');
      return { meta: meta?.content?.slice(0, 40) || null, inputs: [...header].map(i => i.getAttribute('name')) };
    });
    findings.csrf = tokens;
    await p.close();
  }

  // ===== 4. /api/resources pagination =====
  {
    const r1 = await ctx.request.get('https://awesome.video/api/resources?limit=10');
    const j1 = await r1.json();
    findings.pagination = {
      limit10_count: (j1.resources || []).length,
      hasNext: !!j1.nextCursor,
      sample: (j1.resources || []).slice(0, 3).map(r => r.title),
    };
    if (j1.nextCursor) {
      const r2 = await ctx.request.get('https://awesome.video/api/resources?limit=10&cursor=' + encodeURIComponent(j1.nextCursor));
      const j2 = await r2.json();
      findings.paginationPage2 = { count: (j2.resources || []).length, hasNext: !!j2.nextCursor };
    }
  }

  // ===== 5. Public landing nav has no Search input but check if sidebar has one =====
  {
    const p = await ctx.newPage();
    await p.goto('https://awesome.video/', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2500);
    const allInputs = await p.evaluate(() => [...document.querySelectorAll('input')].map(i => ({ type: i.type, placeholder: i.placeholder, name: i.name, parent: i.parentElement?.tagName, visible: i.offsetParent !== null })));
    findings.landingAllInputs = allInputs;
    await p.close();
  }

  // ===== 6. /admin sidebar lists "Search resources..." input — what does it do? =====
  {
    const AUTH = JSON.parse(fs.readFileSync('/Users/nick/Desktop/awesome-list-site/hunt-workspace/hunt-auth.json', 'utf8'));
    const ctxA = await b.newContext({ viewport: { width: 1440, height: 900 }, storageState: AUTH });
    const p = await ctxA.newPage();
    await p.goto('https://awesome.video/admin', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2000);
    const search = await p.$('input[placeholder*="Search resources"], input[type="search"]');
    if (search) {
      const beforeURL = p.url();
      await search.fill('ffmpeg');
      await search.press('Enter');
      await p.waitForTimeout(1500);
      findings.adminSidebarSearch = { beforeURL, afterURL: p.url(), changed: beforeURL !== p.url() };
    } else {
      findings.adminSidebarSearch = { found: false };
    }
    await p.close();
    await ctxA.close();
  }

  // ===== 7. /journey/9 /journey/10 paths =====

  // ===== 8. Check if /api/* always responds with default JSON regardless of path =====
  for (const p of ['/api/anything', '/api/v2/resources', '/api/admin', '/api/admin/users', '/api/admin/resources', '/api/admin/categories']) {
    const r = await ctx.request.get('https://awesome.video' + p);
    findings[`api_route_${p.replace(/[^a-z0-9]+/g,'_')}`] = { status: r.status() };
  }

  // ===== 9. Check robots.txt: confirm social crawlers allowed =====
  const rt = await ctx.request.get('https://awesome.video/robots.txt');
  findings.robotsTxtLen = (await rt.text()).length;

  // ===== 10. /sitemap/0 split (does the sitemap split across files) =====

  // ===== 11. Check if /admin/users (authed) lists admin users =====
  {
    const AUTH = JSON.parse(fs.readFileSync('/Users/nick/Desktop/awesome-list-site/hunt-workspace/hunt-auth.json', 'utf8'));
    const ctxA = await b.newContext({ viewport: { width: 1440, height: 900 }, storageState: AUTH });
    const p = await ctxA.newPage();
    await p.goto('https://awesome.video/admin/users', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2500);
    await p.screenshot({ path: `${OUT}/admin_users.png`, fullPage: true });
    const data = await p.evaluate(() => ({
      txt: document.body.innerText.slice(0, 1500),
      tableRows: document.querySelectorAll('tr, [role="row"]').length,
      h2: [...document.querySelectorAll('h2, h3')].map(h => h.textContent.trim()),
    }));
    findings.adminUsers = data;
    await p.close();
    await ctxA.close();
  }

  await b.close();
  fs.writeFileSync('/Users/nick/Desktop/awesome-list-site/hunt-workspace/wider-bugs.json', JSON.stringify(findings, null, 1));
  console.log(JSON.stringify(findings, null, 0).slice(0, 6500));
})();

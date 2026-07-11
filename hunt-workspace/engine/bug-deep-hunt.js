// Phase 3g — Specific bug hunting
// 1) /submit aria-hidden interactive buttons
// 2) Active navigate tests on every nav link
// 3) Voting button functional test
// 4) External hard-status check across many resources
// 5) Search via /resource?q= URL params
// 6) Settings/theme no Light/Dark toggle
// 7) Internal 404s / soft-404 detection
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = '/Users/nick/Desktop/awesome-list-site/hunt-workspace/screenshots';
const allURLs = fs.readFileSync('/Users/nick/Desktop/awesome-list-site/hunt-workspace/all-urls.txt', 'utf8').split('\n').filter(Boolean);

(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const findings = {};

  // ========== 1) /submit aria-hidden buttons ==========
  {
    const p = await ctx.newPage();
    await p.goto('https://awesome.video/submit', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `${OUT}/submit_form.png`, fullPage: true });
    const ariaHidden = await p.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('[aria-hidden="true"]')) {
        const inner = el.matches('button, a, input, select, textarea, [role="button"], [role="link"], [tabindex]');
        if (inner) {
          out.push({ tag: el.tagName, role: el.getAttribute('role'), text: (el.textContent||'').trim().slice(0, 40), cls: el.className.slice(0, 80) });
        }
      }
      return out;
    });
    const allInputs = await p.evaluate(() => [...document.querySelectorAll('input,textarea,select')].map(i => ({ name: i.name, type: i.type, placeholder: i.placeholder, required: i.required, label: (i.labels && i.labels[0]?.textContent || '').trim().slice(0,40) })));
    const formFields = await p.evaluate(() => {
      const forms = [...document.querySelectorAll('form')];
      return forms.map(f => ({ action: f.action, method: f.method, fields: [...f.querySelectorAll('input,textarea,select')].map(i => i.name) }));
    });
    findings.submit = { ariaHiddenInputs: ariaHidden, allInputs, formFields };
    await p.close();
  }

  // ========== 2) /journeys — list renders? ==========
  {
    const p = await ctx.newPage();
    const errs = [];
    p.on('console', m => { if (m.type()==='error') errs.push(m.text().slice(0,200)); });
    await p.goto('https://awesome.video/journeys', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2000);
    await p.screenshot({ path: `${OUT}/journeys_list.png`, fullPage: true });
    const data = await p.evaluate(() => ({ txt: document.body.innerText.slice(0, 800), links: document.querySelectorAll('a[href*="journey"]').length }));
    findings.journeys = { ...data, consoleErrors: [...new Set(errs)] };
    await p.close();
  }

  // ========== 3) /advanced — list renders? ==========
  {
    const p = await ctx.newPage();
    const errs = [];
    p.on('console', m => { if (m.type()==='error') errs.push(m.text().slice(0,200)); });
    await p.goto('https://awesome.video/advanced', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2000);
    await p.screenshot({ path: `${OUT}/advanced_list.png`, fullPage: true });
    const data = await p.evaluate(() => ({ txt: document.body.innerText.slice(0, 800), links: document.querySelectorAll('a').length }));
    findings.advanced = { ...data, consoleErrors: [...new Set(errs)] };
    await p.close();
  }

  // ========== 4) External URL hard-status check across all resources ==========
  const externalFails = [];
  const resourceUrls = allURLs.filter(u => /\/resource\/[a-z0-9-]+$/.test(u)).slice(0, 60);
  for (const url of resourceUrls) {
    const slug = url.split('/resource/')[1];
    try {
      const r = await ctx.request.get(url, { timeout: 8000 });
      if (!r.ok()) continue;
      // Now parse HTML and find outbound
      const html = await r.text();
      // Find first external anchor to a non-awesome domain
      const m = html.match(/<a[^>]+href=["'](https?:\/\/(?!awesome\.video)[^"']+)["']/i);
      if (m) {
        try {
          const extResp = await ctx.request.head(m[1], { timeout: 4000 });
          if (extResp.status() >= 400) externalFails.push({ slug, resourceUrl: url, extUrl: m[1].slice(0, 200), status: extResp.status() });
        } catch (e) { externalFails.push({ slug, resourceUrl: url, extUrl: m[1].slice(0, 200), error: e.message.slice(0,80) }); }
      }
    } catch {}
  }
  findings.externalFails = externalFails;

  // ========== 5) Search via URL — /resource?q=foo ==========
  for (const q of ['ffmpeg', 'codec', 'streaming', 'asdfqwertyzzz']) {
    const p = await ctx.newPage();
    const r = await p.goto(`https://awesome.video/resource?q=${encodeURIComponent(q)}`, { waitUntil: 'domcontentloaded' });
    const status = r.status();
    const txt = (await p.evaluate(() => document.body.innerText)).slice(0, 400).replace(/\n/g, ' | ');
    const slug = q.replace(/[^a-z0-9]+/g,'_').slice(0,20);
    await p.screenshot({ path: `${OUT}/url_search_${slug}.png`, fullPage: false });
    findings[`url_search_${q}`] = { url: p.url(), status, text: txt };
    await p.close();
  }

  // ========== 6) Nav link hard-status (every nav link should resolve to 200) ==========
  const navCheck = [];
  const navUrls = [
    '/', '/journeys', '/advanced', '/about', '/categories', '/recommendations',
    '/submit', '/login', '/register', '/forgot-password', '/reset-password',
    '/profile', '/bookmarks', '/admin', '/admin/categories', '/admin/resources',
    '/settings/theme', '/search', '/explore', '/sitemap.xml'
  ];
  for (const u of navUrls) {
    try {
      const r = await ctx.request.get('https://awesome.video' + u, { maxRedirects: 0 });
      navCheck.push({ path: u, status: r.status() });
    } catch (e) {
      navCheck.push({ path: u, error: e.message.slice(0, 80) });
    }
  }
  findings.navCheck = navCheck;

  // ========== 7) Voting / upvote functional test ==========
  {
    const p = await ctx.newPage();
    await p.goto('https://awesome.video/resource', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1500);
    const sampleSlugs = allURLs.filter(u => /\/resource\//.test(u)).slice(0, 3);
    for (const surl of sampleSlugs) {
      await p.goto(surl, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(1500);
      const voteBtns = await p.evaluate(() => [...document.querySelectorAll('button')].filter(b => /upvote|vote|like|star|bookmark/i.test(b.textContent || b.getAttribute('aria-label') || '')).map(b => ({ text: (b.textContent||'').trim(), aria: b.getAttribute('aria-label'), disabled: b.disabled })));
      const slug = surl.split('/resource/')[1].slice(0, 30);
      await p.screenshot({ path: `${OUT}/vote_test_${slug}.png`, fullPage: false });
      findings[`vote_test_${slug}`] = { url: surl, voteBtns };
    }
    await p.close();
  }

  // ========== 8) Cookie attributes after login ==========
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
    findings.postLoginCookies = cookies.map(c => ({ name: c.name, httpOnly: c.httpOnly, secure: c.secure, sameSite: c.sameSite }));
    await p.close();
    await ctxAuth.close();
  }

  await b.close();
  fs.writeFileSync('/Users/nick/Desktop/awesome-list-site/hunt-workspace/bug-deep-hunt.json', JSON.stringify(findings, null, 1));
  console.log('OK — findings keys:', Object.keys(findings));
})();

// Phase 3h — Comprehensive bug scout
// — Contrast / WCAG: per-page sample
// — JSON-LD / OG tags: SEO correctness
// — Form validators: try empty / invalid / html-injection in known inputs
// — Vary user-agent to test mobile/tablet detection
// — Stress-test concurrent fetches for /api/resources (race)
// — Test admin XSS: try stored payloads via submit (just POST, don't approve)
// — Check /api/resources for CORS, head, etc.
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = '/Users/nick/Desktop/awesome-list-site/hunt-workspace/screenshots';
const AUTH = JSON.parse(fs.readFileSync('/Users/nick/Desktop/awesome-list-site/hunt-workspace/hunt-auth.json', 'utf8'));
const findings = {};

const allURLs = fs.readFileSync('/Users/nick/Desktop/awesome-list-site/hunt-workspace/all-urls.txt', 'utf8').split('\n').filter(Boolean);

function rgbToLuminance(rgbStr) {
  const m = rgbStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  const [r, g, b] = [+m[1], +m[2], +m[3]].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrastRatio(c1, c2) {
  const L1 = rgbToLuminance(c1), L2 = rgbToLuminance(c2);
  if (L1 == null || L2 == null) return null;
  const [a, b] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (a + 0.05) / (b + 0.05);
}

(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });

  // ========== 1) Sample contrast on landing ==========
  {
    const p = await ctx.newPage();
    await p.goto('https://awesome.video/', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2500);
    await p.screenshot({ path: `${OUT}/contrast_landing.png`, fullPage: true });
    const samples = await p.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('a, h1, h2, h3, p, button, span, label')) {
        const cs = getComputedStyle(el);
        if (cs.color === cs.backgroundColor) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        out.push({
          tag: el.tagName,
          text: (el.textContent||'').trim().slice(0, 60),
          color: cs.color,
          bg: cs.backgroundColor,
          fontSize: cs.fontSize
        });
      }
      return out.slice(0, 200);
    });
    let failed = 0, total = 0;
    const failing = [];
    for (const s of samples) {
      const cr = contrastRatio(s.color, s.bg);
      if (cr == null) continue;
      total++;
      const minSize = parseFloat(s.fontSize) >= 18.66 ? 3 : 4.5;
      if (cr < minSize) { failed++; if (failing.length < 20) failing.push({ ...s, ratio: cr.toFixed(2), min: minSize }); }
    }
    findings.contrast = { total, failed: failed, ratio: failed / total, examples: failing };
    await p.close();
  }

  // ========== 2) JSON-LD / OG / twitter:card check on key pages ==========
  const seoPages = ['/', '/resource/188025', '/category/encoding-codecs', '/journeys', '/about', '/recommendations', '/submit', '/login', '/admin'];
  const seo = [];
  for (const u of seoPages) {
    const r = await ctx.request.get('https://awesome.video' + u);
    const html = await r.text();
    const has = {
      jsonLd: /application\/ld\+json/.test(html),
      ogTitle: /<meta property="og:title"/.test(html),
      ogDesc: /<meta property="og:description"/.test(html),
      ogImage: /<meta property="og:image"/.test(html),
      twCard: /<meta name="twitter:card"/.test(html),
      canonical: /<link rel="canonical"/.test(html),
      title: (html.match(/<title>([^<]+)<\/title>/) || [])[1] || '',
      desc: (html.match(/<meta name="description" content="([^"]+)"/) || [])[1] || '',
      ldCount: (html.match(/application\/ld\+json/g) || []).length
    };
    seo.push({ url: u, status: r.status(), ...has });
  }
  findings.seo = seo;

  // ========== 3) Form validator: empty submit on /login ==========
  {
    const p = await ctx.newPage();
    await p.goto('https://awesome.video/login', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1000);
    // click submit with empty fields
    await p.click('button[type="submit"]');
    await p.waitForTimeout(1500);
    const url = p.url();
    const errs = await p.$$eval('[role="alert"], .text-red-500, .text-destructive, [class*="error"]', els => els.map(e => e.textContent.trim()));
    const inputsValidity = await p.evaluate(() => {
      return [...document.querySelectorAll('input')].map(i => ({ name: i.name, valid: i.validity.valid, valueMissing: i.validity.valueMissing, typeMismatch: i.validity.typeMismatch }));
    });
    findings.loginEmptySubmit = { url, errs, inputsValidity };
    await p.close();
  }

  // ========== 4) /submit with obviously invalid URL — what happens ==========
  {
    const ctx2 = await b.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx2.newPage();
    await p.goto('https://awesome.video/submit', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2000);
    await p.screenshot({ path: `${OUT}/submit_visit.png`, fullPage: true });

    // Find inputs by name from earlier inspection
    const inputs = await p.evaluate(() => [...document.querySelectorAll('input,textarea,select')].map(i => ({ name: i.name, type: i.type, placeholder: i.placeholder, tag: i.tagName })));
    findings.submitFields = inputs;

    // Try filling values and POSTing directly to /submit
    const submitResp = await ctx2.request.post('https://awesome.video/submit', {
      form: { title: '<script>alert(1)</script>Bogus', url: 'not-a-url', description: '', tags: 'foo,bar' },
      maxRedirects: 0,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    findings.submitPostDirect = { status: submitResp.status(), headers: submitResp.headers(), bodySnippet: (await submitResp.text()).slice(0, 600) };
    await p.close();
    await ctx2.close();
  }

  // ========== 5) Mobile UA from desktop site ==========
  {
    const ctx2 = await b.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
    const p = await ctx2.newPage();
    await p.goto('https://awesome.video/', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2000);
    await p.screenshot({ path: `${OUT}/mobile_landing_full.png`, fullPage: true });
    const stats = await p.evaluate(() => ({
      bodyW: document.body.getBoundingClientRect().width,
      docW: document.documentElement.scrollWidth,
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      navBtn: document.querySelector('button[aria-label*="menu" i], button[aria-label*="navigation" i]')?.outerHTML?.slice(0, 200) || null,
      sidebarVisible: !!document.querySelector('[role="complementary"], aside, .sidebar'),
      linksClickable: [...document.querySelectorAll('a')].filter(a => {
        const r = a.getBoundingClientRect();
        return r.top >= 0 && r.top < window.innerHeight && r.width > 0;
      }).length
    }));
    findings.mobileLanding = stats;
    await p.close();
    await ctx2.close();
  }

  // ========== 6) /api/resources with malformed queries ==========
  for (const q of ["'*", '%27%20OR%201%3D1--', 'undefined', '../../etc/passwd', '<script>alert(1)</script>', 'SELECT 1']) {
    try {
      const r = await ctx.request.get(`https://awesome.video/api/resources?q=${q}`);
      const ct = r.headers()['content-type'] || '';
      const snippet = (await r.text()).slice(0, 200);
      findings[`api_q_${q.replace(/[^\w]+/g,'_').slice(0,20)}`] = { status: r.status(), ct, snippet };
    } catch (e) {
      findings[`api_q_${q.replace(/[^\w]+/g,'_').slice(0,20)}`] = { error: e.message.slice(0,100) };
    }
  }

  // ========== 7) CORS test on /api/resources ==========
  try {
    const r = await ctx.request.fetch('https://awesome.video/api/resources', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://evil.example',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'content-type',
      }
    });
    findings.cors = { status: r.status(), allowOrigin: r.headers()['access-control-allow-origin'], allowMethods: r.headers()['access-control-allow-methods'] };
  } catch (e) { findings.cors = { error: e.message.slice(0,80) }; }

  // ========== 8) OG image probes per-resource (sample a few) ==========
  {
    const p = await ctx.newPage();
    const sample = allURLs.filter(u => /\/resource\//.test(u)).slice(0, 5);
    const ogImgs = [];
    for (const u of sample) {
      const r = await ctx.request.get(u);
      const html = await r.text();
      const og = html.match(/<meta property="og:image" content="([^"]+)"/);
      if (og) {
        const status = await ctx.request.head(og[1]);
        ogImgs.push({ url: u, ogImage: og[1].slice(0, 200), headStatus: status.status() });
      } else {
        ogImgs.push({ url: u, ogImage: null });
      }
    }
    findings.ogImageCheck = ogImgs;
    await p.close();
  }

  // ========== 9) Admin: test an admin action (CRUD) via direct API ==========
  {
    const ctxAuth = await b.newContext({ viewport: { width: 1440, height: 900 }, storageState: AUTH });
    // POST a new resource via API
    const createResp = await ctxAuth.request.post('https://awesome.video/api/resources', {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ title: 'AuditTestResource', url: 'https://example.com/audit-test', description: 'created by automated audit', category: 'community-events' }),
    });
    findings.adminCreate = { status: createResp.status(), body: (await createResp.text()).slice(0, 300) };
    await ctxAuth.close();
  }

  // ========== 10) Empty-state for an unbuilt section ==========
  for (const path of ['/bookmarks', '/profile']) {
    const p = await ctx.newPage();
    const r = await p.goto('https://awesome.video' + path, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `${OUT}/empty_${path.replace(/\//g,'_')}.png`, fullPage: true });
    const txt = (await p.evaluate(() => document.body.innerText)).slice(0, 400).replace(/\n/g, ' | ');
    findings[`empty_state_${path}`] = { status: r.status(), txt };
    await p.close();
  }

  await b.close();
  fs.writeFileSync('/Users/nick/Desktop/awesome-list-site/hunt-workspace/contrast-seo-vuln.json', JSON.stringify(findings, null, 1));
  console.log(JSON.stringify(findings, null, 0).slice(0, 6000));
})();

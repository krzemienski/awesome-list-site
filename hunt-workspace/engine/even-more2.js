// Phase 3l — even more bug hunting
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = '/Users/nick/Desktop/awesome-list-site/hunt-workspace/screenshots';

(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const findings = {};

  // ===== 1. /journey/1 /journey/2 etc — do they render? =====
  {
    for (const n of [1, 2, 3, 4, 5, 100, 99999]) {
      const r = await ctx.request.get(`https://awesome.video/journey/${n}`);
      findings[`journey_${n}`] = { status: r.status() };
    }
  }

  // ===== 2. Top-bar Login / Sign-up link presence =====
  {
    const p = await ctx.newPage();
    await p.goto('https://awesome.video/', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1500);
    const hasLogin = await p.evaluate(() => !!document.querySelector('a[href="/login"], a[href*="/login"]'));
    const hasRegister = await p.evaluate(() => !!document.querySelector('a[href="/register"], a[href*="/register"]'));
    const hasSignup = await p.evaluate(() => !!document.querySelector('a[href="/signup"], a[href*="/signup"]'));
    findings.authLinks = { hasLogin, hasRegister, hasSignup };
    await p.close();
  }

  // ===== 3. Inline SVG / favicon links =====
  {
    const r = await ctx.request.get('https://awesome.video/');
    const html = await r.text();
    findings.favicon = /<link rel=["'](?:icon|shortcut)["']/.test(html);
    findings.canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    findings.themeColor = html.match(/<meta name="theme-color" content="([^"]+)"/)?.[1];
    findings.viewport = html.match(/<meta name="viewport" content="([^"]+)"/)?.[1];
    findings.lang = html.match(/<html lang="([^"]+)"/)?.[1];
  }

  // ===== 4. Tab focus order + focus-visible styles =====
  {
    const p = await ctx.newPage();
    await p.goto('https://awesome.video/', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2000);
    const focusable = await p.evaluate(() => {
      const els = [...document.querySelectorAll('button, a, input, [tabindex="0"]')]
        .filter(el => el.offsetParent !== null && !el.disabled);
      return els.slice(0, 12).map(el => ({ tag: el.tagName, text: (el.textContent||'').trim().slice(0, 30), href: el.getAttribute('href'), tabIndex: el.tabIndex, aria: el.getAttribute('aria-label') }));
    });
    await p.close();
    findings.focusablesOnLanding = focusable;
  }

  // ===== 5. Image alt audit =====
  {
    const p = await ctx.newPage();
    await p.goto('https://awesome.video/', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1500);
    const imgs = await p.evaluate(() => {
      const ims = [...document.querySelectorAll('img')];
      return {
        total: ims.length,
        noAlt: ims.filter(i => !i.alt && !i.getAttribute('aria-label')).length,
        emptyAlt: ims.filter(i => i.alt === '').length,
        decorative: ims.filter(i => i.role === 'presentation' || i.getAttribute('aria-hidden') === 'true').length
      };
    });
    findings.altAuditLanding = imgs;
    await p.close();
  }

  // ===== 6. Probe /api endpoints for additional bugs =====
  const apis = [
    '/api/tags', '/api/journeys', '/api/votes', '/api/bookmarks',
    '/api/newsletter', '/api/contact', '/api/og', '/api/profile',
    '/api/health/ready', '/api/metrics'
  ];
  for (const a of apis) {
    try {
      const r = await ctx.request.get('https://awesome.video' + a);
      findings[`api_anon_${a.replace(/\//g,'_')}`] = { status: r.status(), body: (await r.text()).slice(0, 200) };
    } catch (e) {
      findings[`api_anon_${a.replace(/\//g,'_')}`] = { error: e.message.slice(0,80) };
    }
  }

  // ===== 7. /journeys — find the actual rendered journey count and link texts =====
  {
    const p = await ctx.newPage();
    await p.goto('https://awesome.video/journeys', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(3500);
    const data = await p.evaluate(() => ({
      txt: document.body.innerText,
      h2s: [...document.querySelectorAll('h1, h2, h3')].map(h => h.textContent.trim()),
      journeyCards: [...document.querySelectorAll('a[href^="/journey/"]')].length,
      loaders: document.querySelectorAll('[class*="loading" i], [class*="spinner" i], [class*="skeleton" i]').length
    }));
    findings.journeysInsight = data;
    await p.close();
  }

  // ===== 8. /advanced — does the advanced search form actually submit? =====
  {
    const p = await ctx.newPage();
    await p.goto('https://awesome.video/advanced', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2500);
    const inputs = await p.evaluate(() => [...document.querySelectorAll('input, textarea, select')].map(i => ({ name: i.name, type: i.type, placeholder: i.placeholder })));
    // Try a non-trivial search
    try {
      const submitBtn = await p.$('button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
        await p.waitForTimeout(1500);
        const urlAfter = p.url();
        const txt = (await p.evaluate(() => document.body.innerText)).slice(0, 400).replace(/\n/g,' | ');
        findings.advancedSubmit = { inputs, urlAfter, txt };
      } else {
        findings.advancedSubmit = { inputs, noSubmitBtn: true };
      }
    } catch (e) {
      findings.advancedSubmit = { inputs, error: e.message.slice(0,80) };
    }
    await p.screenshot({ path: `${OUT}/advanced_full.png`, fullPage: true });
    await p.close();
  }

  // ===== 9. /recommendations -- admin operations =====
  // (not relevant to unauth)

  // ===== 10. /journey/1 actual content =====
  {
    const p = await ctx.newPage();
    const r = await p.goto('https://awesome.video/journey/1', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2000);
    await p.screenshot({ path: `${OUT}/journey_1.png`, fullPage: true });
    const data = await p.evaluate(() => ({ txt: document.body.innerText.slice(0, 1000), resources: document.querySelectorAll('a[href^="/resource/"]').length }));
    findings.journey_1 = { status: r.status(), ...data };
    await p.close();
  }

  // ===== 11. Console errors on /journey/1 =====
  {
    const p = await ctx.newPage();
    const errs = [];
    p.on('console', m => { if (m.type()==='error') errs.push(m.text().slice(0,200)); });
    await p.goto('https://awesome.video/journey/1', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2500);
    findings.journey_1_console = [...new Set(errs)].slice(0, 5);
    await p.close();
  }

  // ===== 12. Page title length audit (SEO) =====
  {
    const r = await ctx.request.get('https://awesome.video/');
    const html = await r.text();
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1] || '';
    findings.titleLength = title.length;
    findings.title = title;
  }

  // ===== 13. h1 audit (SEO + a11y) =====
  {
    const r = await ctx.request.get('https://awesome.video/');
    findings.h1Count = (r.match(/<h1[^>]*>/g) || []).length;
    findings.h1 = (r.match(/<h1[^>]*>([^<]+)<\/h1>/) || [])[1];
  }

  await b.close();
  fs.writeFileSync('/Users/nick/Desktop/awesome-list-site/hunt-workspace/even-more2.json', JSON.stringify(findings, null, 1));
  console.log(JSON.stringify(findings, null, 0).slice(0, 6000));
})();

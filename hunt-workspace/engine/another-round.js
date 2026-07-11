// Phase 3n — confirm the /advanced input behavior with "ffmpeg"
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = '/Users/nick/Desktop/awesome-list-site/hunt-workspace/screenshots';

(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const findings = {};

  // ===== 1. Try /advanced?q=ffmpeg =====
  for (const q of ['ffmpeg', 'codec', 'streaming', 'asdfqwerty']) {
    const p = await ctx.newPage();
    const r = await p.goto(`https://awesome.video/advanced?q=${encodeURIComponent(q)}`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2500);
    const data = await p.evaluate(() => ({
      resourceCards: [...document.querySelectorAll('a[href^="/resource/"]')].length,
      catCards: [...document.querySelectorAll('a[href^="/category/"]')].length,
      subcatCards: [...document.querySelectorAll('a[href^="/subcategory/"], a[href^="/sub-subcategory/"]')].length,
      txtLen: document.body.innerText.length,
      h2Count: document.querySelectorAll('h2, h3').length
    }));
    await p.screenshot({ path: `${OUT}/advanced_q_${q.replace(/[^a-z0-9]+/g,'_').slice(0,20)}.png`, fullPage: true });
    findings[`advanced_q_${q}`] = { status: r.status(), ...data };
    await p.close();
  }

  // ===== 2. /journey/6 detail content =====
  {
    const p = await ctx.newPage();
    const r = await p.goto('https://awesome.video/journey/6', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2500);
    const data = await p.evaluate(() => ({
      txtLen: document.body.innerText.length,
      h2Count: document.querySelectorAll('h2, h3').length,
      resourceCards: [...document.querySelectorAll('a[href^="/resource/"]')].length,
      h2Sample: [...document.querySelectorAll('h2, h3')].slice(0, 10).map(h => h.textContent.trim())
    }));
    await p.screenshot({ path: `${OUT}/journey_6.png`, fullPage: true });
    findings.journey6 = { status: r.status(), ...data };
    await p.close();
  }

  // ===== 3. /journey/7 detail content =====
  {
    const p = await ctx.newPage();
    const r = await p.goto('https://awesome.video/journey/7', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2500);
    const data = await p.evaluate(() => ({
      txtLen: document.body.innerText.length,
      h2Count: document.querySelectorAll('h2, h3').length,
      resourceCards: [...document.querySelectorAll('a[href^="/resource/"]')].length,
      h2Sample: [...document.querySelectorAll('h2, h3')].slice(0, 10).map(h => h.textContent.trim())
    }));
    await p.screenshot({ path: `${OUT}/journey_7.png`, fullPage: true });
    findings.journey7 = { status: r.status(), ...data };
    await p.close();
  }

  // ===== 4. Public, no auth, check /admin/users/anything to see error boundary =====
  for (const path of ['/admin/users', '/admin/edit/1', '/admin/delete/1']) {
    const r = await ctx.request.get('https://awesome.video' + path);
    findings[`admin_${path.replace(/\//g, '_')}`] = { status: r.status() };
  }

  // ===== 5. Check if /admin/resources has any "stats" =====
  {
    const p = await ctx.newPage();
    await p.goto('https://awesome.video/admin', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(3500);
    await p.screenshot({ path: `${OUT}/admin_full_load.png`, fullPage: true });
    const data = await p.evaluate(() => ({
      txt: document.body.innerText.slice(0, 1500),
      counters: [...document.querySelectorAll('h1, h2, h3, h4')].map(h => h.textContent.trim()),
    }));
    findings.adminPostLoad = data;
    await p.close();
  }

  // ===== 6. Sitemap lastmod audit =====
  {
    const r = await ctx.request.get('https://awesome.video/sitemap.xml');
    const xml = await r.text();
    const lastmods = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map(m => m[1]);
    findings.sitemap = {
      totalEntries: (xml.match(/<loc>/g) || []).length,
      lastmodCount: lastmods.length,
      lastmodSamples: lastmods.slice(0, 5),
      lastmodFuture: lastmods.filter(d => new Date(d) > new Date('2026-07-11')).slice(0, 5),
    };
  }

  // ===== 7. Test mobile hamburger menu =====
  {
    const ctx2 = await b.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
    const p = await ctx2.newPage();
    await p.goto('https://awesome.video/', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2500);
    await p.screenshot({ path: `${OUT}/mobile_menu_initial.png`, fullPage: false });
    // Try to find a hamburger button
    const ham = await p.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      const ham = btns.find(b => /menu|hamburger|nav/i.test(b.getAttribute('aria-label') || '') || /☰|≡/.test(b.textContent || ''));
      if (ham) return { found: true, ariaLabel: ham.getAttribute('aria-label'), text: ham.textContent.trim().slice(0,40) };
      return { found: false, buttonCount: btns.length };
    });
    findings.mobileHamburger = ham;
    if (ham.found) {
      const btn = await p.$(`button[aria-label*="${ham.ariaLabel}" i]`);
      try { await btn.click(); await p.waitForTimeout(800); await p.screenshot({ path: `${OUT}/mobile_menu_open.png`, fullPage: false }); } catch {}
    }
    await p.close();
    await ctx2.close();
  }

  // ===== 8. Sitemap.xml's "lastmod" is in the future =====
  // (already covered by sitemap.lastmodFuture)

  // ===== 9. robots crawl-delay =====

  // ===== 10. lastmod >= today? Any future lastmod dates?

  await b.close();
  fs.writeFileSync('/Users/nick/Desktop/awesome-list-site/hunt-workspace/another-round.json', JSON.stringify(findings, null, 1));
  console.log(JSON.stringify(findings, null, 0).slice(0, 6000));
})();

// Phase 3m — slim targeted probe (text-based, no APIResponse.match confusion)
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = '/Users/nick/Desktop/awesome-list-site/hunt-workspace/screenshots';

(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const findings = {};

  // Helper to GET text
  async function getText(url) {
    const r = await ctx.request.get(url);
    return { status: r.status(), text: await r.text() };
  }

  // ===== 1. /journey/N status =====
  for (const n of [1, 2, 3, 4, 5, 6, 7, 100, 99999]) {
    const r = await getText(`https://awesome.video/journey/${n}`);
    findings[`journey_${n}`] = { status: r.status, len: r.text.length };
  }

  // ===== 2. Auth-related links on landing =====
  {
    const html = (await getText('https://awesome.video/')).text;
    findings.authLinksOnLanding = {
      hasLogin: /href="\/login"/.test(html),
      hasRegister: /href="\/register"/.test(html),
      hasSignup: /href="\/signup"/.test(html),
    };
  }

  // ===== 3. Favicon + theme + viewport + lang + canonical =====
  {
    const html = (await getText('https://awesome.video/')).text;
    findings.metaHead = {
      hasFavicon: /<link rel="(?:icon|shortcut)" /.test(html) || /<link rel=['\"]icon['\"]/.test(html),
      canonical: html.match(/<link rel=["']canonical["']\s+href=["']([^"']+)["']/)?.[1] || null,
      themeColor: html.match(/<meta name="theme-color" content="([^"]+)"/)?.[1] || null,
      viewport: html.match(/<meta name="viewport" content="([^"]+)"/)?.[1] || null,
      lang: html.match(/<html lang="([^"]+)"/)?.[1] || null,
      robots: html.match(/<meta name="robots" content="([^"]+)"/)?.[1] || null,
    };
  }

  // ===== 4. Image alt on landing =====
  {
    const p = await ctx.newPage();
    await p.goto('https://awesome.video/', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1500);
    const alt = await p.evaluate(() => {
      const ims = [...document.querySelectorAll('img')];
      return {
        total: ims.length,
        noAlt: ims.filter(i => !i.alt && !i.getAttribute('aria-label')).length,
        emptyAlt: ims.filter(i => i.alt === '').length,
      };
    });
    findings.altAuditLanding = alt;
    await p.close();
  }

  // ===== 5. /api/* discovery =====
  const apis = ['/api/tags', '/api/journeys', '/api/votes', '/api/bookmarks', '/api/newsletter', '/api/contact', '/api/og', '/api/profile', '/api/health/ready', '/api/metrics', '/api/search', '/api/recommendations', '/api/submissions', '/api/comments'];
  for (const a of apis) {
    const r = await ctx.request.get('https://awesome.video' + a);
    findings[`api_${a.replace(/[^a-z0-9]+/g,'_')}`] = { status: r.status(), sample: (await r.text()).slice(0, 150) };
  }

  // ===== 6. /journeys content check =====
  {
    const p = await ctx.newPage();
    await p.goto('https://awesome.video/journeys', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(3500);
    const data = await p.evaluate(() => ({
      txtLen: document.body.innerText.length,
      uniqueH2Count: new Set([...document.querySelectorAll('h1, h2, h3')].map(h => h.textContent.trim())).size,
      journeyCards: [...document.querySelectorAll('a[href^="/journey/"]')].length,
      resourceCards: [...document.querySelectorAll('a[href^="/resource/"]')].length,
      sidebarCount: [...document.querySelectorAll('aside a, nav a')].length
    }));
    findings.journeysMeta = data;
    await p.screenshot({ path: `${OUT}/journeys_deep.png`, fullPage: true });
    await p.close();
  }

  // ===== 7. /advanced submit =====
  {
    const p = await ctx.newPage();
    await p.goto('https://awesome.video/advanced', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2500);
    const data = await p.evaluate(() => ({
      inputs: [...document.querySelectorAll('input, textarea, select')].map(i => ({ name: i.name, type: i.type, placeholder: i.placeholder })),
      txtLen: document.body.innerText.length,
      h2Count: document.querySelectorAll('h1, h2, h3').length,
      resourceCards: [...document.querySelectorAll('a[href^="/resource/"]')].length
    }));
    await p.screenshot({ path: `${OUT}/advanced_deep.png`, fullPage: true });
    findings.advancedMeta = data;
    await p.close();
  }

  // ===== 8. /journey/1 actual render =====
  {
    const p = await ctx.newPage();
    await p.goto('https://awesome.video/journey/1', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2500);
    const data = await p.evaluate(() => ({
      txtLen: document.body.innerText.length,
      resourceCards: [...document.querySelectorAll('a[href^="/resource/"]')].length,
      h2Count: document.querySelectorAll('h2, h3').length,
      h2Sample: [...document.querySelectorAll('h2, h3')].slice(0, 10).map(h => h.textContent.trim())
    }));
    await p.screenshot({ path: `${OUT}/journey_1_deep.png`, fullPage: true });
    findings.journey1Meta = data;
    await p.close();
  }

  // ===== 9. h1 audit (fix the earlier crash) =====
  {
    const html = (await getText('https://awesome.video/')).text;
    findings.h1 = {
      count: (html.match(/<h1[^>]*>/g) || []).length,
      first: (html.match(/<h1[^>]*>([^<]+)<\/h1>/) || [])[1] || null
    };
  }

  await b.close();
  fs.writeFileSync('/Users/nick/Desktop/awesome-list-site/hunt-workspace/quickprobe.json', JSON.stringify(findings, null, 1));
  console.log(JSON.stringify(findings, null, 0).slice(0, 6500));
})();

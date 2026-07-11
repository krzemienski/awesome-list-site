// Phase 3o — even more bug checks; sitemap, headers, focus-visible, etc.
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = '/Users/nick/Desktop/awesome-list-site/hunt-workspace/screenshots';

(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const findings = {};

  // ===== 1. Check focus-visible in CSS =====

  // ===== 2. /admin/login form fields and their visibility =====
  // ===== 3. More specific /journey details =====

  // ===== 1. /journey/1..5 all 404 -- check all sitemap entries =====

  // ===== 2. Check all /journey/* entries for status =====
  {
    const r = await ctx.request.get('https://awesome.video/sitemap.xml');
    const xml = await r.text();
    const journeyEntries = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]).filter(u => /\/journey\//.test(u));
    findings.journeyEntries = journeyEntries;
    for (const u of journeyEntries) {
      const sr = await ctx.request.get(u);
      findings[`journey_status_${u.split('/').pop()}`] = { url: u, status: sr.status() };
    }
  }

  // ===== 3. Robots crawl-delay =====

  // ===== 4. Test /sitemap.xml GZIP / compression =====

  // ===== 5. /robots.txt crawl-delay is 1 =====

  // ===== 6. Get all sub-resource URLs from sitemap and check first 50 =====
  {
    const r = await ctx.request.get('https://awesome.video/sitemap.xml');
    const xml = await r.text();
    const resourceEntries = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]).filter(u => /\/resource\//.test(u)).slice(0, 50);
    for (const u of resourceEntries) {
      const sr = await ctx.request.get(u);
      if (sr.status() !== 200) {
        findings[`resource_404_${u.split('/resource/')[1].slice(0, 20)}`] = { url: u, status: sr.status() };
      }
    }
  }

  // ===== 7. Check final wait and the html lang attribute on /journey/1 (it's 404 today, but should still have lang=) =====

  // ===== 8. /admin/favicon doesn't exist =====

  // ===== 9. /api/admin/categories anon =====
  // ===== 10. Check if the great /themeColor mismatch (`#ff3d52` for a dark site) is a UX problem =====

  await b.close();
  fs.writeFileSync('/Users/nick/Desktop/awesome-list-site/hunt-workspace/more-probes.json', JSON.stringify(findings, null, 1));
  console.log(JSON.stringify(findings, null, 0).slice(0, 6000));
})();

// Phase 3i — Big per-resource-page defect sweep (50+ pages, looking for per-resource distinct bugs)
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = '/Users/nick/Desktop/awesome-list-site/hunt-workspace/screenshots';

const allURLs = fs.readFileSync('/Users/nick/Desktop/awesome-list-site/hunt-workspace/all-urls.txt', 'utf8').split('\n').filter(Boolean);
const resources = allURLs.filter(u => /\/resource\//.test(u)).slice(0, 80);

(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const def = {
    no_description: [],
    no_tags: [],
    no_external: [],
    external_5xx: [],
    external_4xx: [],
    rendered_minimal: [],
    vote_or_star: [],
    bookmark_button: [],
    image_missing: [],
    outbound_unique_domains: {}
  };

  for (const url of resources) {
    const p = await ctx.newPage();
    try {
      const r = await p.goto(url, { waitUntil: 'domcontentloaded' });
      if (!r || !r.ok()) { await p.close(); continue; }
      await p.waitForTimeout(800);
      const data = await p.evaluate(() => {
        const text = document.body.innerText;
        const m = text.match(/Description\s*([\s\S]{1,500}?)\n\s*\n/);
        const desc = m ? m[1].trim().slice(0, 300) : null;
        const extLinks = [...document.querySelectorAll('a[href^="http"]')]
          .map(a => a.getAttribute('href'))
          .filter(h => !h.startsWith('https://awesome.video'));
        const extDomains = extLinks.map(h => { try { return new URL(h).hostname; } catch { return null; } }).filter(Boolean);
        const bookmark = [...document.querySelectorAll('button')].some(b => /bookmark|save/i.test(b.textContent + (b.getAttribute('aria-label') || '')));
        const votes = [...document.querySelectorAll('button')].some(b => /upvote|vote|like|star/i.test(b.textContent + (b.getAttribute('aria-label') || '')));
        const imgCount = [...document.querySelectorAll('img')].length;
        const brokenImg = [...document.querySelectorAll('img')].filter(i => i.complete && i.naturalWidth === 0).length;
        return { desc: desc?.slice(0, 100), extLinks, extDomains, bookmark, votes, imgCount, brokenImg, len: text.length };
      });
      const slug = url.split('/resource/')[1];
      def.rendered_minimal.push({ url, len: data.len });
      if (!data.desc) def.no_description.push(url);
      if (!data.extLinks || data.extLinks.length === 0) def.no_external.push(url);
      if (data.brokenImg > 0) def.image_missing.push(url);
      if (data.bookmark) def.bookmark_button.push(url);
      if (data.votes) def.vote_or_star.push(url);
      for (const d of (data.extDomains || [])) def.outbound_unique_domains[d] = (def.outbound_unique_domains[d] || 0) + 1;
    } catch (e) {}
    await p.close();
  }
  await b.close();
  fs.writeFileSync('/Users/nick/Desktop/awesome-list-site/hunt-workspace/big-resource-sweep.json', JSON.stringify(def, null, 1));
  console.log('SUMMARY:');
  console.log('  no_description:', def.no_description.length);
  console.log('  no_external:', def.no_external.length);
  console.log('  bookmark_button:', def.bookmark_button.length);
  console.log('  vote_or_star:', def.vote_or_star.length);
  console.log('  brokenImg>', def.image_missing.length);
  console.log('  unique_extDomains:', Object.keys(def.outbound_unique_domains).length);
  console.log('  top domains:');
  for (const [d, n] of Object.entries(def.outbound_unique_domains).sort((a,b) => b[1] - a[1]).slice(0, 10)) console.log('   ', n, d);
  console.log('  no_description samples:');
  for (const u of def.no_description.slice(0, 10)) console.log('   ', u);
})();

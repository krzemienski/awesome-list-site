// R-09: 100-page served-HTML title scan — zero mid-brand / mid-word cuts.
const BASE = 'http://localhost:5000';
const BRAND = ' — Awesome Video';

// worst cases: longest resource titles from the corpus
const corpus = await (await fetch(BASE + '/api/awesome-list')).json();
const all = [];
(function walk(nodes) {
  for (const n of nodes || []) {
    for (const r of n.resources || []) all.push(r);
    walk(n.subcategories || n.children || []);
  }
})(corpus.categories || []);
const seen = new Set();
const longest = all
  .filter(r => r.id && /^\d+$/.test(String(r.id)))
  .sort((a, b) => (b.title?.length || 0) - (a.title?.length || 0))
  .filter(r => (seen.has(r.id) ? false : (seen.add(r.id), true)))
  .slice(0, 60)
  .map(r => `/resource/${r.id}`);

// breadth: every non-resource URL family from the sitemap
const sm = await (await fetch(BASE + '/sitemap.xml')).text();
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1]).pathname);
const nonResource = locs.filter(p => !p.startsWith('/resource/'));
const breadth = [];
for (let i = 0; i < nonResource.length && breadth.length < 40; i += Math.ceil(nonResource.length / 40)) {
  breadth.push(nonResource[i]);
}

const pages = [...new Set([...longest, ...breadth])].slice(0, 100);

// a bad cut = title ends with "…" preceded by a PROPER PREFIX of the brand
// suffix (brand severed), or a title over the 60-char SERP budget.
const brandPrefixes = [];
for (let i = 1; i < BRAND.length; i++) brandPrefixes.push(BRAND.slice(0, i));

const results = [];
for (const p of pages) {
  const res = await fetch(BASE + p, { headers: { 'User-Agent': 'Mozilla/5.0 r09-scan' } });
  const html = await res.text();
  const head = html.slice(0, html.indexOf('</head>') + 7);
  const m = head.match(/<title>([^<]*)<\/title>/);
  const title = m ? m[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"') : '(none)';
  const severedBrand = brandPrefixes.some(pre => title.endsWith(pre.trimEnd() + '…') || title.endsWith(pre + '…'));
  const midWordEllipsis = /\S{25,}…/.test(title); // ellipsis glued to an implausibly long unbroken token
  const overBudget = title.length > 60;
  results.push({ path: p, title, len: title.length, severedBrand, overBudget, midWordEllipsis, status: res.status });
}

const bad = results.filter(r => r.severedBrand || r.overBudget);
console.log(`scanned=${results.length} clamped=${results.filter(r => r.title.includes('…')).length} severedBrand=${results.filter(r => r.severedBrand).length} overBudget=${results.filter(r => r.overBudget).length}`);
console.log('\n-- clamped titles (ellipsis present) --');
for (const r of results.filter(r => r.title.includes('…'))) console.log(`${r.len}ch ${r.path}\n   "${r.title}"`);
console.log('\n-- BAD --');
for (const r of bad) console.log(JSON.stringify(r));
if (!bad.length) console.log('(none)');

import { writeFileSync } from 'fs';
writeFileSync('fix-evidence-v2/R-09/scan-results.json', JSON.stringify(results, null, 2));

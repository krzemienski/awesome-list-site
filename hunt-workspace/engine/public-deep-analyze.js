// Quick analysis of pass 1 data to find interesting patterns
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('/Users/nick/Desktop/awesome-list-site/hunt-workspace/public-deep-pass1.json', 'utf8'));

// Group by slug
const bySlug = {};
for (const e of data) {
  if (!bySlug[e.slug]) bySlug[e.slug] = {};
  bySlug[e.slug][e.vp] = e;
}

// Print summary
for (const [slug, vps] of Object.entries(bySlug)) {
  const keys = Object.keys(vps);
  for (const k of keys) {
    const m = vps[k].metrics || {};
    const ce = (vps[k].consoleErrs || []).filter(x => !x.includes('replit-cdn.com')).slice(0, 2);
    const ne = (vps[k].netErrs || []).slice(0, 3);
    const cons = m.horizontalOverflow ? 'H-OVERFLOW' : '';
    const emptyH = m.emptyH1 ? `empty-h1:${m.emptyH1}` : '';
    const inputs = m.inputsCount;
    const forms = m.formCount;
    const broken = (m.brokenImgs || []).length;
    const titles = m.docTitle || '';
    const headingCount = m.headingCount;
    const buttonCount = m.buttonsCount;
    console.log(`${slug} @${k} | ${cons} ${emptyH} in:${inputs} f:${forms} | img-broken:${broken} | ce+net:${ce.length + ne.length} | btns:${buttonCount} h:${headingCount}`);
    if (ce.length) console.log(`  ce: ${JSON.stringify(ce).slice(0,200)}`);
    if (ne.length) console.log(`  ne: ${JSON.stringify(ne).slice(0,200)}`);
    if (broken > 0) console.log(`  brokenImgs: ${JSON.stringify(m.brokenImgs).slice(0, 200)}`);
    if (titles !== '' && !titles.includes('Awesome Video')) console.log(`  TITLE: ${titles}`);
  }
  console.log('---');
}
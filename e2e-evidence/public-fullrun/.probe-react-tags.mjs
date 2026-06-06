// Does the React-rendered Home actually have the Filter-by-Tag button?
// And what does the query cache hold for tags?
export default async function (page, _ctx, h) {
  await h.goto('/');
  const dom = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter(b => /filter by tag/i.test(b.textContent));
    // also check for the popover trigger by SlidersHorizontal icon
    const sliders = document.querySelector('.lucide-sliders-horizontal');
    return { filterByTagButtons: btns.length, slidersIconPresent: !!sliders, btnText: btns[0]?.textContent.trim() };
  });
  // Compare the exact endpoint the page uses for awesome-list
  const direct = await page.evaluate(async () => {
    const res = await fetch('/api/awesome-list');
    const d = await res.json();
    const cats = d.categories || d;
    // replicate getAllResources for first real category + count metadata.tags
    let withTags = 0, total = 0;
    cats.forEach(c => {
      const all = [...(c.resources||[])];
      (c.subcategories||[]).forEach(sc => { all.push(...(sc.resources||[])); (sc.subSubcategories||[]).forEach(ss=>all.push(...(ss.resources||[]))); });
      all.forEach(r => { total++; const t = r.tags || r.metadata?.tags || []; if (t.length) withTags++; });
    });
    return { total, withTags };
  });
  h.log('REACT_TAGS:', JSON.stringify({ dom, direct }, null, 1));
}

// Probe: do awesome-list resources carry tags? Why is availableTags empty on Home?
export default async function (page, _ctx, h) {
  await h.goto('/');
  const r = await page.evaluate(async () => {
    const res = await fetch('/api/awesome-list');
    const d = await res.json();
    const cats = d.categories || d;
    let total = 0, withTopTags = 0, withMetaTags = 0, sample = [];
    function walkRes(arr) {
      (arr || []).forEach(x => {
        total++;
        if (Array.isArray(x.tags) && x.tags.length) withTopTags++;
        if (x.metadata && Array.isArray(x.metadata.tags) && x.metadata.tags.length) withMetaTags++;
        if (sample.length < 3) sample.push({ id: x.id, topTags: x.tags, metaTags: x.metadata?.tags, keys: Object.keys(x).slice(0, 12) });
      });
    }
    cats.forEach(c => {
      walkRes(c.resources);
      (c.subcategories || []).forEach(sc => {
        walkRes(sc.resources);
        (sc.subSubcategories || []).forEach(ss => walkRes(ss.resources));
      });
    });
    return { total, withTopTags, withMetaTags, sample };
  });
  h.log('TAGS_PROBE:', JSON.stringify(r, null, 1));
}

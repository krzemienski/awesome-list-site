// Probe: sidebar badge counts vs /api/categories vs /api/resources?category.
export default async function (page, _ctx, h) {
  await h.goto('/');
  const badges = await page.evaluate(() => {
    const out = {};
    document.querySelectorAll('[data-testid^="badge-count-"]').forEach(b => {
      out[b.getAttribute('data-testid').replace('badge-count-', '')] = b.textContent.trim();
    });
    return out;
  });
  const cats = (await h.api('/api/categories')).json;
  const apiCounts = {};
  (Array.isArray(cats) ? cats : cats.categories || []).forEach(c => { apiCounts[c.slug] = c.resourceCount; });
  // cross-check 2 slugs against /api/resources?category total
  const enc = (await h.api('/api/resources?category=encoding-codecs&limit=1')).json?.total;
  const med = (await h.api('/api/resources?category=media-tools&limit=1')).json?.total;
  h.log('BADGES:', JSON.stringify(badges, null, 1));
  h.log('API_CATEGORIES:', JSON.stringify(apiCounts, null, 1));
  h.log('RESOURCES_total encoding-codecs=', enc, ' media-tools=', med);
}

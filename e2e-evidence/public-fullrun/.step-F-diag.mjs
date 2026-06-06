export default async function (page, _ctx, h) {
  // Compare resource object shape: category page vs subcategory page API
  const catApi = await (async () => { await h.goto('/category/encoding-codecs'); return h.api('/api/resources?subcategory=Codecs&limit=2'); })();
  h.log('CATEGORY-CTX subcat=Codecs first resource keys:', JSON.stringify(catApi.json?.resources?.[0] ? Object.keys(catApi.json.resources[0]) : catApi));
  h.log('  id/title:', catApi.json?.resources?.[0]?.id, '/', catApi.json?.resources?.[0]?.title);

  // What endpoint does /subcategory/codecs actually call? check network by reading the rendered first card's expected id
  await h.goto('/subcategory/codecs');
  const probe = await page.evaluate(() => {
    const art = document.querySelector('article[data-testid^="card-resource"]');
    // climb to find any data-* with an id, or any onclick
    const attrs = {};
    for (const a of art.attributes) attrs[a.name] = a.value.slice(0, 40);
    // React fiber to read props
    const key = Object.keys(art).find(k => k.startsWith('__reactProps') || k.startsWith('__reactFiber'));
    return { attrs, reactKey: key ? 'present' : 'none', innerText: art.innerText.slice(0, 60) };
  });
  h.log('SUBCAT CARD:', JSON.stringify(probe, null, 1));

  // Try clicking the card TITLE specifically (maybe only title is the link)
  const titleEl = page.locator('article[data-testid^="card-resource"] .line-clamp-2').first();
  await titleEl.click({ force: true });
  await page.waitForTimeout(2000);
  h.log('URL after title click:', page.url());

  // also try the resource detail directly to confirm detail route works at all
  if (catApi.json?.resources?.[0]?.id) {
    await h.goto('/resource/' + catApi.json.resources[0].id);
    h.log('Direct /resource/<id> title:', await page.title(), 'url:', page.url());
  }
}

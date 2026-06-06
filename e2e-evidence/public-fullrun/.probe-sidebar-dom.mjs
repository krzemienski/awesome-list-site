// Inspect exact sidebar row DOM: is there a stale count distinct from badge-count?
export default async function (page, _ctx, h) {
  await h.goto('/');
  const html = await page.evaluate(() => {
    const a = document.querySelector('[data-testid="link-category-encoding-codecs"]');
    if (!a) return 'NO LINK';
    // climb to the row container that also holds the badge
    let row = a.closest('li,[role="listitem"],div');
    return {
      linkOuter: a.outerHTML.slice(0, 600),
      rowOuter: (row?.outerHTML || '').slice(0, 1200),
    };
  });
  h.log('LINK:', html.linkOuter);
  h.log('---ROW:', html.rowOuter);
  // also: what does category page param actually need
  const byName = (await h.api('/api/resources?category=Encoding%20%26%20Codecs&limit=1')).json?.total;
  const bySlug = (await h.api('/api/resources?category=encoding-codecs&limit=1')).json?.total;
  h.log('category byName total=', byName, ' bySlug total=', bySlug);
}

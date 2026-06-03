export default async function (page, _ctx, h) {
  await h.goto('/');
  const r = await page.evaluate(() => {
    const out = {};
    document.querySelectorAll('[data-testid^="badge-count-"]').forEach(b => out[b.getAttribute('data-testid').replace('badge-count-','')] = b.textContent.trim());
    const aria = {};
    document.querySelectorAll('[data-testid^="link-category-"]').forEach(a => {
      const m = (a.getAttribute('aria-label')||'').match(/with (\d+) resources/);
      if (m) aria[a.getAttribute('data-testid').replace('link-category-','')] = m[1];
    });
    return { badge: out, aria };
  });
  const cats = (await h.api('/api/categories')).json;
  const api = {}; (Array.isArray(cats)?cats:cats.categories||[]).forEach(c=>{ if(c.resourceCount>0) api[c.slug]=c.resourceCount; });
  h.log('C1:', JSON.stringify({ badge:r.badge, aria:r.aria, api }, null, 1));
}

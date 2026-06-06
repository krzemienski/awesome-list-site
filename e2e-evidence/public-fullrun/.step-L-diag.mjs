import { login } from './.lib-login.mjs';
export default async function (page, _ctx, h) {
  const TITLE = 'ZZ Audit Test Resource PA-L2';
  await login(page, h);

  // direct POST /api/resources to see exact contract
  const post = await page.evaluate(async (title) => {
    const r = await fetch('/api/resources', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title, url: 'https://example.com/pa-l-diag',
        description: 'A temporary PA-L diagnostic resource long enough to pass validation rules here.',
        category: 'Encoding & Codecs', subcategory: 'Codecs', tags: ['audit-test'],
      }),
    });
    return { status: r.status, body: (await r.text()).slice(0, 250) };
  }, TITLE);
  h.log('POST /api/resources:', JSON.stringify(post));

  // where did it land?
  const pend = await h.api('/api/resources/pending');
  const pendList = Array.isArray(pend.json) ? pend.json : (pend.json?.resources || []);
  h.log('pending count:', pendList.length, 'mine in pending:', !!pendList.find(r => r.title === TITLE));
  // search via admin all + status
  const all = await page.evaluate(async (title) => {
    const r = await fetch('/api/admin/resources?search=' + encodeURIComponent('PA-L'), { credentials: 'include' });
    const j = await r.json();
    const list = Array.isArray(j) ? j : (j.resources || []);
    return list.filter(x => /PA-L/.test(x.title)).map(x => ({ id: x.id, title: x.title.slice(0,30), status: x.status }));
  }, TITLE);
  h.log('admin search PA-L:', JSON.stringify(all));

  // cleanup ALL PA-L test rows
  for (const row of all) {
    const d = await page.evaluate(async (id) => { const r = await fetch('/api/admin/resources/' + id, { method: 'DELETE', credentials: 'include' }); return r.status; }, row.id);
    h.log('deleted', row.id, '->', d);
  }
}

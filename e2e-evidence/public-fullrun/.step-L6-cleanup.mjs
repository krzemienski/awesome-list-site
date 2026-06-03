// L6 cleanup: delete the leftover submitted test resource (id 186833 "ZZ Audit Test Resource")
// to restore baseline. Uses admin session + DELETE /api/admin/resources/:id (canonical per progress.txt).
import { login, logout } from './.lib-login.mjs';
export default async function (page, _ctx, h) {
  const R = {};
  await login(page, h);

  // find any leftover test resources via admin search (pending + approved)
  R.searchZZ = await page.evaluate(async () => {
    const res = await fetch('/api/admin/resources?search=ZZ Audit', { credentials: 'include' });
    const d = await res.json();
    const list = d.resources || d;
    return Array.isArray(list) ? list.map(r => ({ id: r.id, title: r.title, status: r.status })) : d;
  });
  // also search "Audit Test"
  R.searchAudit = await page.evaluate(async () => {
    const res = await fetch('/api/admin/resources?search=Audit Test', { credentials: 'include' });
    const d = await res.json();
    const list = d.resources || d;
    return Array.isArray(list) ? list.map(r => ({ id: r.id, title: r.title, status: r.status })) : d;
  });

  // collect ids to delete: known 186833 + any ZZ/Audit matches
  const ids = new Set([186833]);
  for (const arr of [R.searchZZ, R.searchAudit]) {
    if (Array.isArray(arr)) arr.forEach(r => { if (/audit test|ZZ /i.test(r.title)) ids.add(r.id); });
  }
  R.idsToDelete = [...ids];

  R.deletes = {};
  for (const id of ids) {
    R.deletes[id] = await page.evaluate(async (rid) => {
      const res = await fetch(`/api/admin/resources/${rid}`, { method: 'DELETE', credentials: 'include' });
      return res.status;
    }, id);
  }

  // verify gone
  R.verifyAfter = await page.evaluate(async () => {
    const res = await fetch('/api/admin/resources?search=Audit Test', { credentials: 'include' });
    const d = await res.json();
    const list = d.resources || d;
    return Array.isArray(list) ? list.filter(r => /audit test|ZZ /i.test(r.title)).length : 'err';
  });
  R.totalAfter = (await h.api('/api/resources?limit=1')).json?.total;

  await logout(page, h);
  h.log('CLEANUP_L6:', JSON.stringify(R, null, 1));
}

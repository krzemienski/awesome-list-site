import { login } from './.lib-login.mjs';

export default async function (page, _ctx, h) {
  const RID = 186677;
  await login(page, h);

  // 1) raw GET shapes
  const favGet = await page.evaluate(async () => {
    const r = await fetch('/api/favorites', { credentials: 'include' });
    return { status: r.status, body: (await r.text()).slice(0, 200) };
  });
  h.log('GET /api/favorites:', JSON.stringify(favGet));

  // 2) direct POST favorite
  const favPost = await page.evaluate(async (rid) => {
    const r = await fetch('/api/favorites/' + rid, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' } });
    return { status: r.status, body: (await r.text()).slice(0, 200) };
  }, RID);
  h.log('POST /api/favorites/' + RID + ':', JSON.stringify(favPost));

  // 3) GET again
  const favGet2 = await page.evaluate(async () => {
    const r = await fetch('/api/favorites', { credentials: 'include' });
    return { status: r.status, body: (await r.text()).slice(0, 300) };
  });
  h.log('GET /api/favorites after POST:', JSON.stringify(favGet2));

  // 4) capture what the UI button actually does — listen to network
  await h.goto('/resource/' + RID);
  const reqs = [];
  page.on('requestfinished', async (req) => {
    const u = req.url();
    if (/favorites|bookmarks/.test(u)) {
      const resp = await req.response();
      reqs.push({ method: req.method(), url: u.replace('http://localhost:5001',''), status: resp?.status() });
    }
  });
  await page.locator('[data-testid="button-favorite"]').click();
  await page.waitForTimeout(2000);
  h.log('UI button-favorite network:', JSON.stringify(reqs));

  // 5) cleanup: delete favorite to restore baseline
  const del = await page.evaluate(async (rid) => {
    const r = await fetch('/api/favorites/' + rid, { method: 'DELETE', credentials: 'include' });
    return r.status;
  }, RID);
  h.log('DELETE favorite cleanup status:', del);
  const finalGet = await page.evaluate(async () => { const r = await fetch('/api/favorites', { credentials: 'include' }); return (await r.text()).slice(0,80); });
  h.log('final favorites:', finalGet);
}

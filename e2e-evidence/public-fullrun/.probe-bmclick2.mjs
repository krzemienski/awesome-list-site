// Isolate: click DELETE response + final count, capture response statuses.
import { login, logout } from './.lib-login.mjs';
export default async function (page, _ctx, h) {
  const R = { responses: [] };
  await login(page, h);
  const RID = 186677;
  await page.evaluate(async (rid) => { await fetch('/api/bookmarks/' + rid, { method: 'DELETE', credentials: 'include' }); }, RID);
  await page.evaluate(async (rid) => { await fetch('/api/bookmarks/' + rid, { method: 'POST', credentials: 'include' }); }, RID);
  await h.goto('/bookmarks'); await page.waitForTimeout(2000);

  page.on('response', async resp => {
    if (/\/api\/bookmarks/.test(resp.url())) {
      let body = ''; try { body = (await resp.text()).slice(0, 80); } catch {}
      R.responses.push(`${resp.request().method()} ${resp.status()} ${resp.url().replace('http://localhost:5001','')} :: ${body}`);
    }
  });

  const btn = page.locator('[data-testid="button-bookmark"]').first();
  await btn.click();
  await page.waitForTimeout(3500);

  R.finalCount = await page.evaluate(async () => { const d = await (await fetch('/api/bookmarks', { credentials:'include' })).json(); return Array.isArray(d)?d.length:d; });
  await page.evaluate(async (rid) => { await fetch('/api/bookmarks/' + rid, { method: 'DELETE', credentials: 'include' }); }, RID);
  await logout(page, h);
  h.log('BMCLICK2:', JSON.stringify(R, null, 1));
}

// Capture network + console when clicking the /bookmarks card bookmark button.
import { login, logout } from './.lib-login.mjs';
export default async function (page, _ctx, h) {
  const R = { requests: [], console: [] };
  await login(page, h);
  const RID = 186677;
  await page.evaluate(async (rid) => { await fetch('/api/bookmarks/' + rid, { method: 'DELETE', credentials: 'include' }); }, RID);
  await page.evaluate(async (rid) => { await fetch('/api/bookmarks/' + rid, { method: 'POST', credentials: 'include' }); }, RID);

  await h.goto('/bookmarks'); await page.waitForTimeout(2000);

  page.on('request', req => { if (/bookmark/i.test(req.url())) R.requests.push(`${req.method()} ${req.url().replace('http://localhost:5001','')}`); });
  page.on('console', msg => { if (msg.type() === 'error' || /bookmark|mutation/i.test(msg.text())) R.console.push(msg.text().slice(0, 120)); });

  // describe the button before click
  R.btnBefore = await page.evaluate(() => {
    const b = document.querySelector('[data-testid="button-bookmark"]');
    return b ? { aria: b.getAttribute('aria-label'), disabled: b.disabled, inLink: !!b.closest('a') } : 'none';
  });

  const btn = page.locator('[data-testid="button-bookmark"]').first();
  await btn.click();
  await page.waitForTimeout(3000); // let mutation + refetch settle

  // did a dialog open? (the ADD path opens notes dialog)
  R.dialogOpen = await page.evaluate(() => !!document.querySelector('[role="dialog"]'));
  R.dialogText = await page.evaluate(() => document.querySelector('[role="dialog"]')?.textContent?.replace(/\s+/g,' ').trim().slice(0,80) || 'no-dialog');
  R.ariaAfter = await page.evaluate(() => document.querySelector('[data-testid="button-bookmark"]')?.getAttribute('aria-label'));
  R.apiCount = await page.evaluate(async () => { const d = await (await fetch('/api/bookmarks', { credentials:'include' })).json(); return Array.isArray(d)?d.length:d; });

  // clean
  await page.evaluate(async (rid) => { await fetch('/api/bookmarks/' + rid, { method: 'DELETE', credentials: 'include' }); }, RID);
  await logout(page, h);
  h.log('BMCLICK:', JSON.stringify(R, null, 1));
}

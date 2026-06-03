import { login, logout } from './.lib-login.mjs';

export default async function (page, _ctx, h) {
  const R = {};
  const TITLE = 'ZZ Audit Test Resource PA-L';
  const URL = 'https://example.com/pa-l-audit-test';

  // baseline pending count
  await login(page, h);
  const pendBefore = await h.api('/api/resources/pending');
  R.pendingBefore = Array.isArray(pendBefore.json) ? pendBefore.json.length : (pendBefore.json?.resources?.length ?? pendBefore.json?.total ?? JSON.stringify(pendBefore.json||pendBefore.text).slice(0,50));

  // L2: form fields present (logged-in)
  await h.goto('/submit');
  await page.waitForTimeout(1200);
  R.L2_fields = await page.evaluate(() => ['input-title', 'input-url', 'input-description', 'select-category'].map(t => ({ t, present: !!document.querySelector(`[data-testid="${t}"]`) })));

  // L4: empty submit -> validation
  await page.locator('[data-testid="button-submit"]').click();
  await page.waitForTimeout(1200);
  R.L4_validation = await page.evaluate(() => {
    const errs = [...document.querySelectorAll('[role="alert"],.text-destructive,[class*="error"]')].map(e => e.textContent.trim().slice(0, 50)).filter(Boolean);
    return { errs: errs.slice(0, 6), stillOnSubmit: location.pathname.includes('submit') };
  });
  await h.shot('L-04-empty-validation.png');

  // L3: category cascade
  await page.locator('[data-testid="select-category"]').click();
  await page.waitForTimeout(600);
  R.L3_catOptions = await page.evaluate(() => [...document.querySelectorAll('[role="option"]')].map(o => o.textContent.trim()).slice(0, 12));
  // pick Encoding & Codecs
  await page.locator('[role="option"]', { hasText: 'Encoding & Codecs' }).first().click();
  await page.waitForTimeout(1200);
  // subcategory select should now appear/populate
  R.L3_afterCat = await page.evaluate(() => {
    const selects = [...document.querySelectorAll('button[role="combobox"]')].map(s => ({ txt: s.textContent.trim().slice(0, 30), testid: s.getAttribute('data-testid') }));
    return selects;
  });
  // try opening subcategory select
  const subSel = page.locator('[data-testid="select-subcategory"]');
  if (await subSel.count()) {
    await subSel.click();
    await page.waitForTimeout(600);
    R.L3_subOptions = await page.evaluate(() => [...document.querySelectorAll('[role="option"]')].map(o => o.textContent.trim()).slice(0, 10));
    await page.keyboard.press('Escape');
  }
  await h.shot('L-03-cascade.png');

  // L5: fill + submit valid
  await page.fill('[data-testid="input-title"]', TITLE);
  await page.fill('[data-testid="input-url"]', URL);
  await page.fill('[data-testid="input-description"]', 'This is a temporary PA-L audit test resource that will be deleted to restore baseline.');
  const tagsField = page.locator('[data-testid="input-tags"]');
  if (await tagsField.count()) await tagsField.fill('audit-test');
  // ensure category still selected
  await page.locator('[data-testid="button-submit"]').click();
  await page.waitForTimeout(2500);
  R.L5_afterSubmit = await page.evaluate(() => ({
    path: location.pathname,
    toast: [...document.querySelectorAll('[data-sonner-toast],[role="status"]')].map(t => t.textContent.trim().slice(0, 50)).filter(Boolean),
    bodyHasSuccess: /success|submitted|pending|thank|received/i.test(document.body.innerText),
  }));
  await h.shot('L-05-submitted.png');

  // verify pending count increased + find our resource
  const pendAfter = await h.api('/api/resources/pending');
  const pendList = Array.isArray(pendAfter.json) ? pendAfter.json : (pendAfter.json?.resources || []);
  R.pendingAfter = pendList.length;
  const mine = pendList.find(r => r.title === TITLE);
  R.L5_createdId = mine?.id ?? 'NOT-FOUND';

  // L6: cleanup — delete the test resource
  if (mine?.id) {
    const del = await page.evaluate(async (id) => {
      const r = await fetch('/api/admin/resources/' + id, { method: 'DELETE', credentials: 'include' });
      return r.status;
    }, mine.id);
    R.L6_deleteStatus = del;
    await page.waitForTimeout(800);
    const pendFinal = await h.api('/api/resources/pending');
    const finalList = Array.isArray(pendFinal.json) ? pendFinal.json : (pendFinal.json?.resources || []);
    R.L6_pendingFinal = finalList.length;
    R.L6_mineGone = !finalList.find(r => r.title === TITLE);
  }

  await logout(page, h);
  h.log('RESULTS:', JSON.stringify(R, null, 1));
}

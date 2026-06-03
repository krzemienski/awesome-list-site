export default async function (page, _ctx, h) {
  const R = {};
  await h.goto('/advanced');
  await page.locator('[role="tab"]', { hasText: 'Export' }).click();
  await page.waitForTimeout(1200);
  // full inventory of export tab
  R.exportTab = await page.evaluate(() => {
    const panel = document.querySelector('[role="tabpanel"]:not([hidden])') || document.body;
    return {
      buttons: [...panel.querySelectorAll('button')].map(b => ({ txt: b.textContent.trim().slice(0, 35), testid: b.getAttribute('data-testid') })),
      selects: [...panel.querySelectorAll('button[role="combobox"],select')].map(s => s.textContent.trim().slice(0, 30)),
      text: panel.innerText.replace(/\s+/g, ' ').slice(0, 250),
    };
  });
  h.log('EXPORT TAB:', JSON.stringify(R.exportTab, null, 1));

  // click "Export 1952 Resources" and watch for download / dialog / clipboard
  let dl = null;
  page.on('download', d => { dl = d.suggestedFilename(); });
  const mainBtn = page.locator('button', { hasText: /Export \d+ Resources|Export Resources|Download/i }).first();
  R.mainBtnCount = await mainBtn.count();
  if (await mainBtn.count()) {
    await mainBtn.click();
    await page.waitForTimeout(2500);
    R.afterClick = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      const ta = document.querySelector('textarea');
      const toast = [...document.querySelectorAll('[role="status"],[data-sonner-toast],.toast')].map(t => t.textContent.trim().slice(0, 50));
      return { dialogOpen: !!dialog, dialogText: dialog?.innerText.replace(/\s+/g,' ').slice(0,150), textareaLen: ta?.value?.length || ta?.textContent?.length || 0, toast };
    });
    R.download = dl;
  }
  await h.shot('I-03b-export-action.png');
  h.log('RESULTS:', JSON.stringify(R, null, 1));
}

export default async function (page, _ctx, h) {
  const R = {};
  const rootAttrs = () => page.evaluate(() => ({
    system: document.documentElement.getAttribute('data-system'),
    accent: document.documentElement.getAttribute('data-accent'),
    cls: document.documentElement.className,
    font: getComputedStyle(document.body).fontFamily.slice(0, 40),
    bg: getComputedStyle(document.body).backgroundColor,
  }));
  await h.goto('/settings/theme');
  await page.waitForTimeout(1200);
  R.initial = await rootAttrs();

  // N2: switch design system Editorial -> Terminal (applies live)
  await page.locator('text=Terminal').first().click();
  await page.waitForTimeout(1200);
  R.afterTerminal = await rootAttrs();
  await h.shot('N-02-terminal-system.png');

  // -> Geist
  await page.locator('text=Geist').first().click();
  await page.waitForTimeout(1200);
  R.afterGeist = await rootAttrs();

  // N6 persist: reload keeps Geist
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  R.afterReload = await rootAttrs();
  R.persisted = R.afterGeist.system === R.afterReload.system;

  // restore Editorial + Crimson baseline
  await page.locator('text=Editorial').first().click();
  await page.waitForTimeout(800);
  await page.locator('text=Crimson').first().click();
  await page.waitForTimeout(800);
  R.restored = await rootAttrs();

  h.log('RESULTS:', JSON.stringify(R, null, 1));
}

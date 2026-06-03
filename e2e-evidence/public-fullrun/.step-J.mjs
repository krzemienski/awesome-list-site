// PA-J Journeys list + detail J1-J8.
export default async function (page, _ctx, h) {
  const R = {};
  await h.goto('/journeys');
  const api = await h.api('/api/learning-journeys');
  R.J_apiStatus = api.status;
  R.J_apiCount = Array.isArray(api.json) ? api.json.length : (api.json?.journeys?.length ?? api.json?.length ?? JSON.stringify(api.json || api.text).slice(0, 60));
  R.J1_bodyText = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 250));
  R.J7_notBlank = await page.evaluate(() => document.body.innerText.trim().length > 40);
  R.J3_countText = await page.evaluate(() => (document.body.innerText.match(/\d+\s+journeys?\s+(available|found)/i) || [null])[0]);
  // J2: category filter select present?
  R.J2_selectPresent = await page.locator('button[role="combobox"],select').count();
  // J4: any journey cards?
  R.J4_cards = await page.evaluate(() => document.querySelectorAll('article,[data-testid*="journey"],[class*="journey-card"]').length);
  await h.shot('J-01-journeys-list.png');

  // J2: if a select exists, open it
  if (await page.locator('button[role="combobox"]').count()) {
    await page.locator('button[role="combobox"]').first().click();
    await page.waitForTimeout(600);
    R.J2_options = await page.evaluate(() => [...document.querySelectorAll('[role="option"]')].map(o => o.textContent.trim()).slice(0, 12));
    await page.keyboard.press('Escape');
  }

  // J4/J5: click a journey if present
  const card = page.locator('[data-testid*="journey"],article').first();
  if (await card.count() && R.J4_cards > 0) {
    await card.click();
    await page.waitForTimeout(1500);
    R.J4_url = page.url();
    R.J5_hasBack = await page.locator('button', { hasText: /back/i }).count();
    await h.shot('J-04-journey-detail.png');
  }

  h.log('RESULTS:', JSON.stringify(R, null, 1));
}

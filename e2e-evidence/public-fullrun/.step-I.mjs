// PA-I Advanced 4 sub-tabs I1-I8.
export default async function (page, _ctx, h) {
  const R = {};
  const clickTab = async (name) => {
    await page.locator('[role="tab"]', { hasText: name }).click();
    await page.waitForTimeout(1200);
  };
  const activeTab = () => page.evaluate(() => document.querySelector('[role="tab"][data-state="active"]')?.textContent.trim());
  const panelText = () => page.evaluate(() => (document.querySelector('[role="tabpanel"]:not([hidden])') || document.querySelector('[data-state="active"][role="tabpanel"]') || document.body).innerText.replace(/\s+/g, ' ').slice(0, 200));

  // I5 + stats: Explorer tab (default)
  await h.goto('/advanced');
  R.I1_explorerActive = await activeTab();
  R.I1_stats = await page.evaluate(() => {
    // grab the 4 stat numbers (Categories/Resources/Unique Tags/Subcategories)
    const cards = [...document.querySelectorAll('.text-2xl.font-bold')].map(e => e.textContent.trim());
    return cards.slice(0, 4);
  });
  await h.shot('I-01-explorer.png');

  // I6: explorer internal search
  const explorerSearch = page.locator('input[placeholder*="categories" i],input[placeholder*="Search categories" i]').first();
  R.I6_searchPresent = await explorerSearch.count();
  if (await explorerSearch.count()) {
    await explorerSearch.fill('encoding');
    await page.waitForTimeout(1200);
    R.I6_afterSearch = await page.evaluate(() => document.body.innerText.includes('Encoding'));
    await explorerSearch.fill('');
    await page.waitForTimeout(500);
  }

  // I2: Metrics tab
  await clickTab('Metrics');
  R.I2_active = await activeTab();
  R.I2_hasCharts = await page.evaluate(() => document.querySelectorAll('svg, canvas, [class*="recharts"], [class*="chart"]').length);
  R.I2_text = await panelText();
  await h.shot('I-02-metrics.png');

  // I3 + I7: Export tab
  await clickTab('Export');
  R.I3_active = await activeTab();
  R.I3_controls = await page.evaluate(() => [...document.querySelectorAll('button')].map(b => b.textContent.trim()).filter(t => /export|download|json|csv|copy|markdown/i.test(t)).slice(0, 8));
  await h.shot('I-03-export.png');
  // I7: click an export action, see if output/file appears
  const exportBtn = page.locator('button', { hasText: /JSON|Export|Copy|Download|Markdown/i }).first();
  if (await exportBtn.count()) {
    R.I7_btnText = (await exportBtn.textContent())?.trim().slice(0, 30);
    // listen for download
    let downloaded = null;
    page.once('download', d => { downloaded = d.suggestedFilename(); });
    await exportBtn.click();
    await page.waitForTimeout(1500);
    R.I7_downloadOrText = downloaded || await page.evaluate(() => {
      const ta = document.querySelector('textarea,pre,code');
      return ta ? 'output-area-present:' + ta.textContent.slice(0, 30) : 'clicked-no-visible-output';
    });
  }

  // I4: AI Recommendations tab (degraded acceptable, crash not)
  await clickTab('AI Recommendations');
  R.I4_active = await activeTab();
  R.I4_text = await panelText();
  R.I4_crashed = await page.evaluate(() => document.body.innerText.length < 50 || /something went wrong|error boundary/i.test(document.body.innerText));
  await h.shot('I-04-ai-recommendations.png');

  h.log('RESULTS:', JSON.stringify(R, null, 1));
}

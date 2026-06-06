// PA-C Search Dialog (command palette) — cases C1-C10.
export default async function (page, _ctx, h) {
  const R = {};
  const step = async (id, fn) => { try { R[id] = await fn(); } catch (e) { R[id] = 'ERR:' + e.message.slice(0, 100); } };
  const openViaBtn = async () => { await page.locator('button[aria-label="Open search"]').first().click(); await page.waitForTimeout(800); };
  const dialogInput = () => page.locator('[role="dialog"] input, [cmdk-input]').first();
  const isOpen = () => page.evaluate(() => !!document.querySelector('[role="dialog"] input,[cmdk-input]'));
  const close = async () => { await page.keyboard.press('Escape'); await page.waitForTimeout(400); };

  await h.goto('/');

  // C1: open via header search button, input present + focused
  await step('C1_open', async () => {
    await openViaBtn();
    const open = await isOpen();
    const focused = await page.evaluate(() => { const el = document.activeElement; return el && (el.matches('[role="dialog"] input,[cmdk-input]') || el.closest('[role="dialog"]') != null); });
    await h.shot('B-02-search-dialog-open.png');
    return { open, focused };
  });
  await close();

  // C2: open via keyboard shortcut "/" (and Cmd-K)
  await step('C2_shortcut', async () => {
    await page.keyboard.press('/'); await page.waitForTimeout(700);
    const openSlash = await isOpen();
    await close();
    await page.keyboard.press('Control+k'); await page.waitForTimeout(700);
    const openCmdK = await isOpen();
    return { openSlash, openCmdK };
  });
  // (leave open for typing)
  if (!(await isOpen())) { await openViaBtn(); }

  // C3: type "ffmpeg" -> results filter live
  await step('C3_liveFilter', async () => {
    await dialogInput().fill('ffmpeg');
    await page.waitForTimeout(1200);
    const results = await page.evaluate(() => [...document.querySelectorAll('[cmdk-item],[role="option"],[role="dialog"] [data-testid*="result" i]')].map(r => r.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 8));
    return { count: results.length, sample: results.slice(0, 4) };
  });
  // C4: result shows title/category breadcrumb
  await step('C4_resultMeta', () => page.evaluate(() => {
    const first = document.querySelector('[cmdk-item],[role="option"]');
    return first ? first.textContent.replace(/\s+/g, ' ').trim().slice(0, 80) : 'none';
  }));

  // C5: click result -> opens external resource in NEW TAB (per app design)
  await step('C5_clickResult', async () => {
    const before = _ctx.pages().length;
    const first = page.locator('[cmdk-item],[role="option"]').first();
    if (!(await first.count())) return 'no-result';
    await first.click(); await page.waitForTimeout(1500);
    const after = _ctx.pages().length;
    const newUrl = after > before ? _ctx.pages()[_ctx.pages().length - 1].url().slice(0, 50) : 'no-new-tab';
    for (const p of _ctx.pages().slice(1)) { try { await p.close(); } catch {} }
    return { newTabOpened: after > before, newUrl };
  });

  // C6/C7: arrow keys navigate + Enter selects
  await step('C6C7_keyboard', async () => {
    if (!(await isOpen())) { await openViaBtn(); }
    await dialogInput().fill('ffmpeg'); await page.waitForTimeout(1000);
    await page.keyboard.press('ArrowDown'); await page.waitForTimeout(300);
    const highlighted = await page.evaluate(() => { const el = document.querySelector('[cmdk-item][data-selected="true"],[aria-selected="true"]'); return el ? el.textContent.replace(/\s+/g, ' ').trim().slice(0, 50) : 'none-highlighted'; });
    const before = _ctx.pages().length;
    await page.keyboard.press('Enter'); await page.waitForTimeout(1200);
    const selWorked = _ctx.pages().length > before || page.url() !== 'http://localhost:5001/';
    for (const p of _ctx.pages().slice(1)) { try { await p.close(); } catch {} }
    return { highlighted, selectFired: selWorked };
  });

  // C8: empty query state (prompt, no crash)
  await step('C8_emptyState', async () => {
    if (!(await isOpen())) { await openViaBtn(); }
    await dialogInput().fill(''); await page.waitForTimeout(700);
    return page.evaluate(() => { const d = document.querySelector('[role="dialog"]'); return d ? (d.innerText.replace(/\s+/g, ' ').trim().slice(0, 80) || 'empty-no-crash') : 'no-dialog'; });
  });
  // C9: no-match query
  await step('C9_noMatch', async () => {
    if (!(await isOpen())) { await openViaBtn(); }
    await dialogInput().fill('zzzzqqqxyz123'); await page.waitForTimeout(1000);
    return page.evaluate(() => /no results|nothing found|no match/i.test(document.querySelector('[role="dialog"]')?.innerText || '') ? 'NO-RESULTS-STATE' : (document.querySelector('[role="dialog"]')?.innerText || '').replace(/\s+/g, ' ').slice(0, 80));
  });
  // C10: Esc closes
  await step('C10_escClose', async () => {
    const openBefore = await isOpen();
    await page.keyboard.press('Escape'); await page.waitForTimeout(500);
    const openAfter = await isOpen();
    return { openBefore, closedAfterEsc: openBefore && !openAfter };
  });

  h.log('RESULTS_C:', JSON.stringify(R, null, 1));
}

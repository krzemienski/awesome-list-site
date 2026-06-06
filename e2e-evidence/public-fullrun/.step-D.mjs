// PA-D Home (/) — cases D1-D13. Fresh run vs rebuilt app (1952 total, 9 cards).
export default async function (page, _ctx, h) {
  const R = {};
  const step = async (id, fn) => { try { R[id] = await fn(); } catch (e) { R[id] = 'ERR:' + e.message.slice(0, 100); } };
  const cardCount = () => page.evaluate(() => document.querySelectorAll('[data-testid="list-categories"] [data-testid^="link-category-"]').length);
  const cardOrder = () => page.evaluate(() => [...document.querySelectorAll('[data-testid="list-categories"] [data-testid^="link-category-"]')].map(a => a.getAttribute('data-testid').replace('link-category-', '')));
  const badgeMap = () => page.evaluate(() => { const o = {}; document.querySelectorAll('[data-testid^="badge-count-"]').forEach(b => o[b.getAttribute('data-testid').replace('badge-count-', '')] = +b.textContent.trim()); return o; });

  await h.goto('/');

  // D1: hero "Explore 9 categories ... M curated resources"
  await step('D1_hero', async () => {
    const txt = await page.evaluate(() => {
      const el = [...document.querySelectorAll('h1,h2,p')].find(e => /categ/i.test(e.textContent) && /\d/.test(e.textContent));
      return el ? el.textContent.replace(/\s+/g, ' ').trim() : document.body.innerText.slice(0, 200);
    });
    const api = (await h.api('/api/resources?limit=1')).json?.total;
    const nums = (txt.match(/\d[\d,]*/g) || []).map(s => +s.replace(/,/g, ''));
    return { heroText: txt.slice(0, 120), apiTotal: api, nums };
  });

  // D2: 9 category cards render w/ counts; D13 visual via shot
  await step('D2_cards', async () => ({ cards: await cardCount(), badges: await badgeMap() }));
  await h.shot('D-01-home-dupheader-fixed.png');

  // D3: "Filter by Tag" popover opens (trigger = Button with SlidersHorizontal + text "Filter by Tag").
  // Tag rows are clickable <div> with a Checkbox + <span>tag</span> + count Badge (advanced-filter.tsx).
  const openTagPopover = async () => {
    const trigger = page.locator('button', { hasText: 'Filter by Tag' }).first();
    await trigger.click(); await page.waitForTimeout(900);
  };
  const tagRows = () => page.evaluate(() => {
    // popover content rows: div containing a checkbox + span + badge
    return [...document.querySelectorAll('[data-radix-popper-content-wrapper] [role="checkbox"], [data-radix-popper-content-wrapper] .cursor-pointer')]
      .map(el => { const row = el.closest('.cursor-pointer') || el; return row.textContent.replace(/\s+/g, ' ').trim(); }).filter(Boolean).slice(0, 12);
  });
  await step('D3_tagDialogOpens', async () => {
    await openTagPopover();
    const opts = await tagRows();
    await h.shot('D-03-tag-filter-streaming.png');
    return { opened: opts.length > 0, sampleTags: opts.slice(0, 6) };
  });

  // D4: select a single tag -> "Active:" badge appears; card set may shrink (categories w/ that tag)
  await step('D4_singleTag', async () => {
    // click first tag row's checkbox (popover already open)
    const firstRow = page.locator('[data-radix-popper-content-wrapper] .cursor-pointer').first();
    const label = (await firstRow.textContent())?.replace(/\s+/g, ' ').trim();
    await firstRow.click(); await page.waitForTimeout(1300);
    const after = await cardCount();
    const active = await page.evaluate(() => /Active:/i.test(document.body.innerText));
    const badgeOnTrigger = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /Filter by Tag/.test(x.textContent)); return b ? (b.textContent.match(/\d+$/) || [''])[0] : ''; });
    return { pickedTag: label, cardsAfter: after, activeBadgeShown: active, selectedCountBadge: badgeOnTrigger };
  });
  // D5: select a second tag -> cumulative
  await step('D5_multiTag', async () => {
    if (!(await page.locator('[data-radix-popper-content-wrapper]').count())) await openTagPopover();
    const second = page.locator('[data-radix-popper-content-wrapper] .cursor-pointer').nth(1);
    let picked = 'none';
    if (await second.count()) { picked = (await second.textContent())?.replace(/\s+/g, ' ').trim(); await second.click(); await page.waitForTimeout(1200); }
    const selBadge = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /Filter by Tag/.test(x.textContent)); return b ? (b.textContent.match(/\d+$/) || [''])[0] : ''; });
    return { secondTag: picked, cardsAfterMulti: await cardCount(), selectedCountBadge: selBadge };
  });
  // D6: clear all -> resets to 9 cards, no Active
  await step('D6_clearAll', async () => {
    // "Clear all" inside popover, or "Clear" in Active chips row
    const clr = page.locator('button:has-text("Clear all"), button:has-text("Clear")').first();
    if (await clr.count()) { await clr.click(); await page.waitForTimeout(1000); }
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(500);
    const active = await page.evaluate(() => /Active:/i.test(document.body.innerText));
    return { cardsAfterClear: await cardCount(), activeCleared: !active };
  });

  // D7-D10: sort modes. Sort control is a combobox on home.
  await h.goto('/');
  const openSort = async () => { await page.locator('button[role="combobox"], [data-testid*="sort" i]').first().click(); await page.waitForTimeout(500); };
  await step('D7_nameAsc', async () => {
    await openSort();
    await page.locator('[role="option"]:has-text("Name A-Z"), [role="option"]:has-text("A-Z")').first().click().catch(() => {});
    await page.waitForTimeout(900);
    await h.shot('D-02-sort-most-resources.png');
    return await cardOrder();
  });
  await step('D9_countDesc', async () => {
    await openSort();
    await page.locator('[role="option"]:has-text("Most Resources"), [role="option"]:has-text("Count")').first().click().catch(() => {});
    await page.waitForTimeout(900);
    const order = await cardOrder();
    const badges = await badgeMap();
    const counts = order.map(s => badges[s]);
    const isDesc = counts.every((v, i) => i === 0 || counts[i - 1] >= v);
    return { order, counts, isDescending: isDesc };
  });
  await step('D8_nameDesc', async () => {
    await openSort();
    await page.locator('[role="option"]:has-text("Name Z-A"), [role="option"]:has-text("Z-A")').first().click().catch(() => {});
    await page.waitForTimeout(900);
    return await cardOrder();
  });
  await step('D10_countAsc', async () => {
    await openSort();
    await page.locator('[role="option"]:has-text("Least"), [role="option"]:has-text("Fewest"), [role="option"]:has-text("low")').first().click().catch(() => {});
    await page.waitForTimeout(900);
    const order = await cardOrder();
    const badges = await badgeMap();
    const counts = order.map(s => badges[s]);
    const isAsc = counts.every((v, i) => i === 0 || counts[i - 1] <= v);
    return { counts, isAscending: isAsc };
  });

  // D11: tag filter hides 0-match categories (displayCount>0 filter)
  await h.goto('/');
  await step('D11_hidesZero', async () => {
    const trigger = page.locator('button', { hasText: 'Filter by Tag' }).first();
    if (!(await trigger.count())) return 'no-tag-btn';
    await trigger.click(); await page.waitForTimeout(800);
    const before = await cardCount();
    const t = page.locator('[data-radix-popper-content-wrapper] .cursor-pointer').first();
    await t.click(); await page.waitForTimeout(1300);
    const after = await cardCount();
    await page.keyboard.press('Escape').catch(() => {});
    return { before, after, hid: after <= before };
  });

  // D12: click a category card -> /category/:slug
  await h.goto('/');
  await step('D12_cardNav', async () => {
    await page.locator('[data-testid="link-category-media-tools"]').first().click();
    await page.waitForTimeout(1500);
    return page.url();
  });

  // D13: visual grid (shot already captured D-01)
  await h.goto('/');
  await step('D13_overflow', () => page.evaluate(() => {
    const de = document.documentElement;
    return { scrollW: de.scrollWidth, clientW: de.clientWidth, overflow: de.scrollWidth - de.clientWidth };
  }));

  h.log('RESULTS_D:', JSON.stringify(R, null, 1));
}

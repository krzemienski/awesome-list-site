export default async function (page, _ctx, h) {
  await h.goto('/category/encoding-codecs');
  const tagBtn = page.locator('button', { hasText: 'Filter by Tag' }).first();
  h.log('tagBtn count:', await tagBtn.count());
  await tagBtn.click();
  await page.waitForTimeout(1000);
  // dump whatever opened: popover/dialog/cmdk content
  const dump = await page.evaluate(() => {
    const out = {};
    out.popovers = [...document.querySelectorAll('[role="dialog"],[data-radix-popper-content-wrapper],[cmdk-root],[role="listbox"]')].map(p => p.className.slice(0, 60));
    out.optionRoles = {
      option: document.querySelectorAll('[role="option"]').length,
      menuitemcheckbox: document.querySelectorAll('[role="menuitemcheckbox"]').length,
      cmdkItem: document.querySelectorAll('[cmdk-item]').length,
      checkbox: document.querySelectorAll('[role="checkbox"]').length,
      labels: [...document.querySelectorAll('label')].slice(0, 10).map(l => l.textContent.trim().slice(0, 30)),
    };
    // any element with text containing a count like "(259)"
    const withCounts = [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && /\(\d+\)/.test(e.textContent)).slice(0, 12).map(e => e.textContent.trim().slice(0, 40));
    out.withCounts = withCounts;
    // search input inside popover?
    out.searchInputs = [...document.querySelectorAll('input')].map(i => i.placeholder || i.getAttribute('aria-label') || i.type).slice(0, 6);
    return out;
  });
  h.log(JSON.stringify(dump, null, 1));
  await h.shot('.probe-E-tagpopover.png');
}

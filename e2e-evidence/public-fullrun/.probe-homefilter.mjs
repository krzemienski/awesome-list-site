// Probe Home's tag-filter + sort controls.
export default async function (page, _ctx, h) {
  await h.goto('/');
  const info = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].map(b => ({ testid: b.getAttribute('data-testid'), role: b.getAttribute('role'), label: (b.getAttribute('aria-label') || b.textContent).replace(/\s+/g, ' ').trim().slice(0, 30) })).filter(b => b.label || b.testid);
    const comboboxes = [...document.querySelectorAll('[role="combobox"]')].map(c => ({ testid: c.getAttribute('data-testid'), label: (c.getAttribute('aria-label') || c.textContent).replace(/\s+/g, ' ').trim().slice(0, 30) }));
    const filterTestids = [...document.querySelectorAll('[data-testid]')].map(e => e.getAttribute('data-testid')).filter(t => /filter|tag|sort/i.test(t));
    return { buttons: btns.slice(0, 25), comboboxes, filterTestids };
  });
  h.log('HOMEFILTER:', JSON.stringify(info, null, 1));
}

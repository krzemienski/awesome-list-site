import { chromium } from 'playwright';
const EXEC = '.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';
const BASE = 'http://localhost:5000';
const browser = await chromium.launch({ executablePath: EXEC });
const page = await (await browser.newContext()).newPage();
await page.goto(BASE + '/submit', { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForSelector('form', { timeout: 15000 });
await page.waitForTimeout(1000);

// Accessibility tree: what assistive tech actually sees (CDP full AX tree)
const cdp = await page.context().newCDPSession(page);
await cdp.send('Accessibility.enable');
const { nodes } = await cdp.send('Accessibility.getFullAXTree');
const flat = nodes
  .filter(n => ['textbox', 'combobox', 'button', 'checkbox'].includes(n.role?.value))
  .map(n => ({
    role: n.role?.value,
    name: (n.name?.value || '').slice(0, 40),
    disabled: (n.properties || []).find(p => p.name === 'disabled')?.value?.value ?? false,
    readonly: (n.properties || []).find(p => p.name === 'readonly')?.value?.value ?? false,
    focusable: (n.properties || []).find(p => p.name === 'focusable')?.value?.value ?? false,
  }))
  .filter(n => n.name || n.role !== 'button');

// keyboard reachability: tab through the page, record what receives focus
const focusStops = [];
for (let i = 0; i < 25; i++) {
  await page.keyboard.press('Tab');
  const f = await page.evaluate(() => {
    const a = document.activeElement;
    return a ? { tag: a.tagName.toLowerCase(), testid: a.getAttribute('data-testid'), text: (a.textContent || '').slice(0, 30) } : null;
  });
  if (f) focusStops.push(f);
}
const formFieldFocused = focusStops.some(f => ['input-title', 'input-url', 'input-description', 'select-category'].includes(f.testid));
console.log(JSON.stringify({ a11yFormControls: flat, formFieldEverFocused: formFieldFocused, focusStops: focusStops.map(f => f.testid || f.tag + ':' + f.text) }, null, 2));
await browser.close();

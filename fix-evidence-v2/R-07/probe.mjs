import { chromium } from 'playwright';
const EXEC = '.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';
const BASE = 'http://localhost:5000';
const browser = await chromium.launch({ executablePath: EXEC });
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.goto(BASE + '/submit', { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForSelector('form, [data-testid="banner-login-required"], main', { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1500);

const dump = await page.evaluate(() => {
  const els = Array.from(document.querySelectorAll('form input, form textarea, form select, form button, form [role="combobox"]'));
  return els.map(el => ({
    tag: el.tagName.toLowerCase(),
    type: el.getAttribute('type'),
    testid: el.getAttribute('data-testid'),
    name: el.getAttribute('name'),
    disabledProp: 'disabled' in el ? el.disabled : null,
    matchesDisabled: el.matches(':disabled'),
    ariaDisabled: el.getAttribute('aria-disabled'),
    readOnly: 'readOnly' in el ? el.readOnly : null,
    tabIndex: el.tabIndex,
    inDisabledFieldset: !!el.closest('fieldset:disabled'),
  }));
});
const fieldset = await page.evaluate(() => {
  const f = document.querySelector('form fieldset');
  return f ? { hasDisabledAttr: f.hasAttribute('disabled'), matchesDisabled: f.matches(':disabled') } : null;
});
// try typing into the first text input
const first = page.locator('form input[type="text"], form input:not([type]), form input[type="url"]').first();
let typedValue = null;
if (await first.count()) {
  await first.click({ force: true }).catch(() => {});
  await page.keyboard.type('probe123').catch(() => {});
  typedValue = await first.inputValue().catch(() => 'ERR');
}
await page.screenshot({ path: '/tmp/r07-submit-loggedout.png', fullPage: false });
console.log(JSON.stringify({ fieldset, typedValue, controls: dump }, null, 2));
await browser.close();

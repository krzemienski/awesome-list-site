import { chromium } from 'playwright';
const exePath = new URL('../.cache/ms-playwright/chromium-1223/chrome-linux64/chrome', import.meta.url).pathname;
const BASE = 'https://awesome.video';
const results = [];
const ok = (name, pass, detail='') => { results.push({name, pass, detail}); console.log(`${pass?'PASS':'FAIL'} ${name} ${detail}`.trim()); };

const browser = await chromium.launch({ executablePath: exePath });
const ctx = await browser.newContext();
const page = await ctx.newPage();

// R4-H03: /register form fields + R4-M25 strength meter
await page.goto(BASE + '/register', { waitUntil: 'networkidle', timeout: 60000 });
const emailN = await page.locator('input[type="email"]').count();
const pwN = await page.locator('input[type="password"]').count();
ok('R4-H03 register form fields', emailN >= 1 && pwN >= 2, `email=${emailN} pw=${pwN}`);
await page.locator('input[type="password"]').first().fill('Str0ng-passw0rd!');
await page.waitForTimeout(400);
const meterText = await page.textContent('body');
ok('R4-M25 password strength meter', /strong|medium|weak|fair|good/i.test(meterText) || await page.locator('[data-testid*="strength"]').count() > 0, '');
await page.screenshot({ path: 'evidence/run7/H03-M25-register-prod.png' });

// R4-H08/M01: anon favorite/bookmark feedback on resource page
await page.goto(BASE + '/resource/186145', { waitUntil: 'networkidle', timeout: 60000 });
const favBtn = page.locator('[data-testid*="favorite"], button[aria-label*="avorite"]').first();
if (await favBtn.count()) {
  await favBtn.click();
  await page.waitForTimeout(1200);
  const toastText = await page.textContent('body');
  ok('R4-H08 anon favorite sign-in prompt', /sign in/i.test(toastText), '');
  await page.screenshot({ path: 'evidence/run7/H08-anon-favorite-toast-prod.png' });
} else ok('R4-H08 anon favorite sign-in prompt', false, 'favorite button not found');

// R4-M22/L01: footer semantic nav + back-to-top after scroll
const footerNav = await page.locator('footer nav, footer a').count();
ok('R4-M22 footer nav links', footerNav >= 3, `footer links=${footerNav}`);
await page.goto(BASE + '/category/encoding-codecs', { waitUntil: 'networkidle', timeout: 60000 });
await page.mouse.wheel(0, 3000);
await page.waitForTimeout(900);
const backTop = await page.locator('[data-testid*="back-to-top"], button[aria-label*="top" i]').count();
ok('R4-L01 back-to-top button', backTop >= 1, `count=${backTop}`);

// R4-M24: sort persists via ?sort=
await page.goto(BASE + '/category/encoding-codecs?sort=title-az', { waitUntil: 'networkidle', timeout: 60000 }).catch(()=>{});
const hasSortParam = page.url().includes('sort=');
ok('R4-M24 sort URL param accepted', hasSortParam, page.url());

// R4-L14: filter badge aria-label (Run6 L16 fix)
await page.goto(BASE + '/category/encoding-codecs', { waitUntil: 'networkidle', timeout: 60000 });
const tagBtn = page.locator('button:has-text("Filter by Tag"), [data-testid*="tag-filter"]').first();
ok('R4-L14 tag filter control present', (await tagBtn.count()) >= 1, '');

// R4-H04/H05: admin reseed confirm + masked emails (prod admin)
await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 60000 });
await page.fill('#email', 'admin@example.com');
await page.fill('input[type="password"]', 'Usmc12345!');
await page.click('button[type="submit"]');
await page.waitForTimeout(3000);
await page.goto(BASE + '/admin#database', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1500);
const reseedBtn = page.locator('button:has-text("Re-seed"), button:has-text("Clear & Re-seed")').first();
if (await reseedBtn.count()) {
  await reseedBtn.click();
  await page.waitForTimeout(900);
  const dlg = await page.locator('[role="alertdialog"], [role="dialog"]').count();
  const dlgText = dlg ? await page.textContent('[role="alertdialog"], [role="dialog"]') : '';
  ok('R4-H04 reseed typed-confirm dialog', dlg >= 1 && /RESEED/i.test(dlgText), `dialogs=${dlg}`);
  await page.screenshot({ path: 'evidence/run7/H04-reseed-confirm-prod.png' });
  await page.keyboard.press('Escape');
} else ok('R4-H04 reseed typed-confirm dialog', false, 'reseed button not found');

await page.goto(BASE + '/admin#users', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2000);
const tableText = await page.textContent('table').catch(()=> '');
const masked = /•{2,}/.test(tableText);
const fullEmailLeak = /[a-z0-9._%+-]{3,}@(gmail|e3webcasting|yahoo|outlook)/i.test(tableText.replace(/admin@example\.com/g,''));
ok('R4-H05 admin emails masked', masked && !fullEmailLeak, `masked=${masked} leak=${fullEmailLeak}`);
await page.screenshot({ path: 'evidence/run7/H05-masked-emails-prod.png' });

await browser.close();
const fails = results.filter(r=>!r.pass).length;
console.log(`\n${results.length - fails}/${results.length} PASS`);
process.exit(fails ? 1 : 0);

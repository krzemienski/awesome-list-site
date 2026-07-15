import { chromium } from 'playwright';
const exePath = new URL('../.cache/ms-playwright/chromium-1223/chrome-linux64/chrome', import.meta.url).pathname;
const BASE = 'https://awesome.video';
const results = [];
const ok = (name, pass, detail='') => { results.push({name, pass, detail}); console.log(`${pass?'PASS':'FAIL'} ${name} ${detail}`.trim()); };

const browser = await chromium.launch({ executablePath: exePath });
const ctx = await browser.newContext();
const page = await ctx.newPage();

// R4-H03 corrected: register form = email + password + submit (single pw by design)
await page.goto(BASE + '/register', { waitUntil: 'networkidle', timeout: 60000 });
const emailN = await page.locator('input[type="email"]').count();
const pwN = await page.locator('input[type="password"]').count();
const submitN = await page.locator('button[type="submit"]').count();
ok('R4-H03 register form renders', emailN === 1 && pwN >= 1 && submitN >= 1, `email=${emailN} pw=${pwN} submit=${submitN}`);

// R4-M24 corrected: ?sort=name-asc alias normalizes to canonical sortBy
await page.goto(BASE + '/category/encoding-codecs?sort=name-asc', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1500);
ok('R4-M24 sort param persists (canonicalized)', page.url().includes('sortBy=name-asc'), page.url());

// Admin: login then CLICK tabs (hash goto does not remount SPA)
await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 60000 });
await page.fill('#email', 'admin@example.com');
await page.fill('input[type="password"]', process.env.PROD_ADMIN_PASSWORD);
await page.click('button[type="submit"]');
await page.waitForURL('**/admin', { timeout: 20000 }).catch(()=>{});
await page.waitForSelector('[data-testid="tab-database"]', { timeout: 20000 });

// R4-H04: reseed typed-confirm dialog
await page.click('[data-testid="tab-database"]');
await page.waitForSelector('[data-testid="tab-database"][data-state="active"]');
await page.waitForSelector('[data-testid="button-clear-reseed"]', { timeout: 15000 });
await page.click('[data-testid="button-clear-reseed"]');
await page.waitForSelector('[data-testid="dialog-clear-reseed"]', { timeout: 10000 });
const dlgText = await page.textContent('[data-testid="dialog-clear-reseed"]');
const hasConfirmInput = await page.locator('[data-testid="input-reseed-confirm"]').count();
const confirmBtnDisabled = await page.locator('[data-testid="button-reseed-confirm"]').isDisabled().catch(()=>null);
ok('R4-H04 reseed typed-confirm dialog', /RESEED/.test(dlgText) && hasConfirmInput === 1 && confirmBtnDisabled === true, `input=${hasConfirmInput} confirmDisabled=${confirmBtnDisabled}`);
await page.screenshot({ path: 'evidence/run7/H04-reseed-confirm-prod.png' });
await page.click('[data-testid="button-reseed-cancel"]');

// R4-H05: masked emails in Users tab
await page.click('[data-testid="tab-users"]');
await page.waitForSelector('[data-testid="tab-users"][data-state="active"]');
await page.waitForSelector('table', { timeout: 15000 });
await page.waitForTimeout(1500);
const tableText = await page.textContent('table');
const masked = tableText.includes('•••');
const leak = /[a-z0-9._%+-]{2,}[a-z0-9]@(gmail|yahoo|outlook|e3webcasting|hotmail)/i.test(tableText);
ok('R4-H05 admin emails masked by default', masked && !leak, `masked=${masked} leak=${leak}`);
await page.screenshot({ path: 'evidence/run7/H05-masked-emails-prod.png' });

await browser.close();
const fails = results.filter(r=>!r.pass).length;
console.log(`\n${results.length - fails}/${results.length} PASS`);
process.exit(fails ? 1 : 0);

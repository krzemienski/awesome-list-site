import { chromium } from 'playwright';
const exePath = new URL('../.cache/ms-playwright/chromium-1223/chrome-linux64/chrome', import.meta.url).pathname;
const BASE = 'http://localhost:5000';
const results = [];
const ok = (name, pass, detail='') => { results.push({name, pass, detail}); console.log(`${pass?'PASS':'FAIL'} ${name} ${detail}`); };

const browser = await chromium.launch({ executablePath: exePath });
const ctx = await browser.newContext();
const page = await ctx.newPage();

// R4-M10: login subtitle generic
await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
const sub = await page.textContent('.text-center.text-sm, [class*="CardDescription"], p:has-text("Sign in")').catch(()=>null);
const bodyText = await page.textContent('body');
ok('R4-M10 login subtitle generic', bodyText.includes('Sign in to your Awesome Video account') && !bodyText.includes('admin dashboard'), '');

// R4-L16: status badge title on a resource page
await page.goto(BASE + '/resource/186145', { waitUntil: 'networkidle' });
const badgeTitle = await page.getAttribute('span[title*="Approved:"], div[title*="Approved:"], [title*="Approved:"]', 'title').catch(()=>null);
ok('R4-L16 status badge tooltip', !!badgeTitle, badgeTitle || 'no title attr found');

// R4-L17: admin stat cards clickable
await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
await page.fill('#email', 'admin@example.com');
await page.fill('input[type="password"]', 'devtest-run3-Pw1');
await page.click('button[type="submit"]');
await page.waitForTimeout(2500);
await page.goto(BASE + '/admin', { waitUntil: 'networkidle' });
await page.waitForSelector('[data-testid="stat-card-users"]', { timeout: 15000 });
await page.click('[data-testid="stat-card-users"]');
await page.waitForTimeout(800);
const usersTabState = await page.getAttribute('[data-testid="tab-users"]', 'data-state');
const urlHash = page.url();
ok('R4-L17 stat card -> users tab', usersTabState === 'active' && urlHash.includes('#users'), `state=${usersTabState} url=${urlHash}`);
// keyboard activation
await page.click('[data-testid="tab-approvals"]');
await page.focus('[data-testid="stat-card-journeys"]');
await page.keyboard.press('Enter');
await page.waitForTimeout(600);
const journeysState = await page.getAttribute('[data-testid="tab-journeys"]', 'data-state');
ok('R4-L17 keyboard Enter -> journeys tab', journeysState === 'active', `state=${journeysState}`);
await page.screenshot({ path: 'evidence/run7/L17-stat-card-users-tab.png' });

await browser.close();
const fails = results.filter(r=>!r.pass).length;
console.log(`\n${results.length - fails}/${results.length} PASS`);
process.exit(fails ? 1 : 0);

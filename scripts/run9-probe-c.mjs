import { chromium } from 'playwright';
const exePath = new URL('../.cache/ms-playwright/chromium-1223/chrome-linux64/chrome', import.meta.url).pathname;
const BASE = 'https://awesome.video';
const browser = await chromium.launch({ executablePath: exePath });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// BUG-015 + BUG-026: login page
await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(800);
const pwToggle = await page.evaluate(() => {
  const pw = document.querySelector('input[type="password"]');
  const wrap = pw?.closest('div');
  return { hasToggle: !!wrap?.querySelector('button'), wrapHtml: (wrap?.outerHTML || '').slice(0, 200) };
});
console.log('BUG-026 password toggle:', JSON.stringify(pwToggle));
const loginBtnLabel = await page.evaluate(() => [...document.querySelectorAll('button[type="submit"]')].map(b => b.textContent?.trim()));
console.log('BUG-025 login submit label:', JSON.stringify(loginBtnLabel));
await page.fill('[data-testid="input-email"], input[type="email"], input[name="email"]', 'notanemail');
await page.fill('[data-testid="input-password"], input[type="password"]', 'short');
await page.click('button[type="submit"]');
await page.waitForTimeout(1200);
const errs = await page.evaluate(() => {
  const fieldErrs = [...document.querySelectorAll('[id$="-message"], [class*="destructive"], p[role="alert"], .text-destructive')].map(e => (e.textContent || '').trim()).filter(Boolean);
  const toast = document.querySelector('[role="status"], [data-sonner-toast], li[role="status"]');
  return { fieldErrs: fieldErrs.slice(0, 5), toast: toast ? (toast.textContent || '').slice(0, 100) : null };
});
console.log('BUG-015 invalid-cred errors:', JSON.stringify(errs));
// now real bad creds (valid format)
await page.fill('[data-testid="input-email"], input[type="email"], input[name="email"]', 'nobody@example.com');
await page.fill('[data-testid="input-password"], input[type="password"]', 'wrongpass123');
await page.click('button[type="submit"]');
await page.waitForTimeout(2000);
const errs2 = await page.evaluate(() => {
  const toast = [...document.querySelectorAll('[role="status"], [data-sonner-toast], li')].map(e => (e.textContent || '').trim()).filter(t => /invalid|error|password/i.test(t));
  return toast.slice(0, 3);
});
console.log('BUG-015 wrong-creds toast:', JSON.stringify(errs2));

// BUG-011 + BUG-012: submit form
await page.goto(BASE + '/submit', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1000);
const reqMarks = await page.evaluate(() => {
  const labels = [...document.querySelectorAll('label')].map(l => (l.textContent || '').trim()).slice(0, 12);
  const stars = labels.filter(t => t.includes('*')).length;
  const requiredAttrs = document.querySelectorAll('input[required], textarea[required], [aria-required="true"]').length;
  return { labels, stars, requiredAttrs };
});
console.log('BUG-012 required indicators:', JSON.stringify(reqMarks));
// whitespace-only
const inputs = await page.$$('form input[type="text"], form input:not([type]), form textarea, form input[type="url"]');
for (const inp of inputs.slice(0, 5)) { try { await inp.fill('   '); } catch {} }
const submitBtn = await page.$('button[type="submit"]');
if (submitBtn) {
  await submitBtn.click();
  await page.waitForTimeout(1200);
  const verrs = await page.evaluate(() => [...document.querySelectorAll('[id$="-message"], .text-destructive, p[role="alert"]')].map(e => (e.textContent || '').trim()).filter(Boolean).slice(0, 6));
  console.log('BUG-011 whitespace-only submit errors:', JSON.stringify(verrs), '| url now:', page ? location?.href : '');
  console.log('BUG-011 page url after submit:', page.url());
}

// BUG-029: about content
await page.goto(BASE + '/about', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(800);
const about = await page.evaluate(() => (document.querySelector('main')?.innerText || document.body.innerText).slice(0, 400));
console.log('BUG-029 about content len+snippet:', about.length, JSON.stringify(about.slice(0, 250)));

// Login as admin → advanced metrics + feedback widget + journeys badges
await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 60000 });
await page.fill('[data-testid="input-email"], input[type="email"]', 'admin@example.com');
await page.fill('[data-testid="input-password"], input[type="password"]', process.env.ADMIN_PASSWORD);
await page.click('button[type="submit"]');
await page.waitForTimeout(3000);
console.log('logged in, url:', page.url());

// BUG-016: advanced metrics
await page.goto(BASE + '/advanced', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1500);
const tabs = await page.evaluate(() => [...document.querySelectorAll('[role="tab"]')].map(t => t.textContent?.trim()));
console.log('BUG-016 /advanced tabs:', JSON.stringify(tabs));
const metricsTab = await page.$('[role="tab"]:has-text("Metrics")');
if (metricsTab) {
  await metricsTab.click();
  await page.waitForTimeout(2000);
  const txt = await page.evaluate(() => (document.querySelector('[role="tabpanel"][data-state="active"]')?.innerText || '').slice(0, 500));
  console.log('BUG-016 metrics panel:', JSON.stringify(txt));
}

// BUG-021 logged-in journeys badges
await page.goto(BASE + '/journeys', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1500);
const badges = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('[class*="card"]')].filter(c => /steps/i.test(c.innerText || '') && !c.querySelector('[class*="card"]'));
  return cards.slice(0, 8).map(c => ({ t: (c.innerText || '').split('\n').slice(0, 2).join('|').slice(0, 50), m: (c.innerText || '').match(/\d+\s*steps/gi) }));
});
console.log('BUG-021 logged-in badges:', JSON.stringify(badges));
await browser.close();

import { chromium } from 'playwright';
const BASE = 'http://localhost:5000';
const EXEC = '.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';
const pages = ['/resource/186111', '/resource/186249', '/resource/185949'];
const browser = await chromium.launch({ executablePath: EXEC });
const page = await browser.newPage();
for (const p of pages) {
  const served = (await (await fetch(BASE + p)).text()).match(/<title>([^<]*)<\/title>/)?.[1]
    .replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"');
  await page.goto(BASE + p, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(1500);
  const hydrated = await page.title();
  console.log(JSON.stringify({ path: p, served, hydrated, identical: served === hydrated }));
}
await browser.close();

import { chromium } from 'playwright';
const exe = process.env.PW_EXE;
const b = await chromium.launch({ executablePath: exe });
const ctx = await b.newContext();
const page = await ctx.newPage();
const BASE = 'https://awesome.video';
async function check(url) {
  await page.goto(BASE + url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const banner = await page.locator('[data-testid="banner-scrubbed-params"]').count();
  const prompt = await page.locator('[data-testid="text-search-prompt"]').count();
  const count = await page.locator('[data-testid="text-result-count"]').textContent().catch(()=>null);
  const noRes = await page.locator('[data-testid="text-no-results"]').textContent().catch(()=>null);
  const inputVal = await page.locator('[data-testid="input-search-page"]').inputValue().catch(()=>null);
  console.log(JSON.stringify({url, finalUrl: page.url(), banner, prompt, count, noRes, inputVal}));
}
await check('/search?q=javascript%3A%20the%20good%20parts');
await check('/search?q=a%20%3C%20b%20%3E%20c');
await check('/search?q=%253Cscript%253Ealert(1)%253C%252Fscript%253E');
await check('/search?q=%25253Cscript%25253Ealert(1)%25253C%25252Fscript%25253E');
await check('/search');
await check('/search?q=ffmpeg%20hls');
await check('/search?q=hls%20ffmpeg');
await check('/search?q=%22ffmpeg%22');
await b.close();

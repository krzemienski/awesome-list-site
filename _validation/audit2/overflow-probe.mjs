import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath: '/home/runner/workspace/.cache/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-linux64/chrome-headless-shell',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

for (const p of process.argv.slice(2)) {
  await page.goto('http://localhost:5000' + p, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(3500);
  const report = await page.evaluate(() => {
    const vw = 390;
    const culprits = [];
    for (const el of document.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 && r.width > 5) {
        const kids = [...el.children].some(c => c.getBoundingClientRect().right > vw + 1);
        if (!kids) {
          culprits.push({
            tag: el.tagName.toLowerCase(),
            cls: (el.className?.baseVal ?? el.className ?? '').toString().slice(0, 120),
            testid: el.getAttribute('data-testid') || '',
            right: Math.round(r.right), width: Math.round(r.width),
            text: (el.textContent || '').replace(/\s+/g, ' ').slice(0, 60),
          });
        }
      }
    }
    return {
      scrollW: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      culprits: culprits.slice(0, 12),
    };
  });
  console.log('\n===', p, 'scrollW=', report.scrollW);
  report.culprits.forEach(c => console.log(JSON.stringify(c)));
}
await browser.close();

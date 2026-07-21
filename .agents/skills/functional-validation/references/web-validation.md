# Web Frontend Validation Reference

## Prerequisites

- **Playwright**: `npx playwright install chromium` (if `chromium.launch()` fails with "executable doesn't exist")
- **Dev server**: Your frontend must be running (`npm run dev`, `yarn dev`, etc.) before Playwright connects
- **Node 18+**: Required for Playwright. Check with `node --version`.

## The Validation Pattern

```javascript
// validate.mjs — Playwright (recommended)
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';

const EVIDENCE = './evidence/web';
await mkdir(EVIDENCE, { recursive: true });

const browser = await chromium.launch({ headless: false }); // headed = see what's happening
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

try {
  // 1. Navigate and screenshot initial state
  await page.goto('http://localhost:5173');
  await page.screenshot({ path: `${EVIDENCE}/01-home.png`, fullPage: true });

  // 2. Interact through real UI
  await page.fill('[name="email"]', 'user@example.com');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  await page.screenshot({ path: `${EVIDENCE}/02-dashboard.png`, fullPage: true });

  // 3. Verify content (not just page load)
  const text = await page.textContent('h1');
  console.log(`Dashboard heading: ${text}`);

} catch (err) {
  await page.screenshot({ path: `${EVIDENCE}/error-state.png` });
  console.error('Validation failed:', err.message);
} finally {
  await browser.close();
}
```

## What PASS Looks Like

| Verification | Good Evidence | Bad Evidence |
|-------------|--------------|-------------|
| Page loads | Screenshot showing real content and layout | `200 OK` from curl (proves HTML served, not rendered) |
| Form works | Screenshot of filled form + success state | Console log saying "form submitted" |
| Navigation | Screenshot of destination page with correct URL | `page.goto` didn't throw |
| Error states | Screenshot showing user-friendly error message | Console showing error caught |
| Responsive | Screenshots at 375px, 768px, 1920px widths | Only testing at one viewport |

## Failure Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Blank page in screenshot | JS bundle failed to load or render error | Check browser console: `page.on('console', msg => ...)` |
| Element not found | Wrong selector or element hasn't rendered | Use `waitForSelector` with timeout; check actual HTML |
| Timeout waiting for navigation | Navigation never happened (form validation error?) | Screenshot BEFORE the expected navigation |
| CORS/network errors | Backend not running or wrong URL | Start backend first; check proxy config |
| Stale data | Browser cache or service worker | Use fresh context: `browser.newContext()` |
| Different rendering in CI | Headless browser renders differently | Use `headless: false` for debugging; check viewport size |

## Responsive Validation

```javascript
const viewports = [
  { name: 'mobile', width: 375, height: 667 },   // iPhone SE
  { name: 'tablet', width: 768, height: 1024 },   // iPad
  { name: 'desktop', width: 1920, height: 1080 }, // Desktop
];

for (const vp of viewports) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.goto('http://localhost:5173');
  await page.screenshot({ path: `${EVIDENCE}/${vp.name}-home.png`, fullPage: true });
}
```

## Never Do

- **NEVER use jsdom or happy-dom** — they don't render CSS, run JS inconsistently, and miss real browser behavior
- **NEVER mock fetch/axios** — mocked responses diverge from real API over time
- **NEVER render components in isolation** (Testing Library) — a component alone proves nothing about the integrated app
- **NEVER use snapshot testing as validation** — snapshots compare structure, not visual correctness
- **NEVER skip visual verification** — READ the screenshots, don't just check they exist

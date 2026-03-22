#!/usr/bin/env node
// ──────────────────────────────────────────────────────────────────
// Web Validator — Playwright-based browser validation
// ──────────────────────────────────────────────────────────────────
// Usage:
//   BASE_URL=http://localhost:5173 node scripts/web-validator.mjs
//   BASE_URL=http://localhost:5173 HEADLESS=false node scripts/web-validator.mjs
//
// Environment Variables:
//   BASE_URL     — Frontend URL (required)
//   HEADLESS     — true/false (default: true)
//   EVIDENCE_DIR — Output directory (default: e2e-evidence/web)
// ──────────────────────────────────────────────────────────────────

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';

const BASE_URL = process.env.BASE_URL;
if (!BASE_URL) {
  console.error('ERROR: BASE_URL required. Set BASE_URL=http://localhost:PORT');
  process.exit(1);
}

const HEADLESS = process.env.HEADLESS !== 'false';
const EVIDENCE = process.env.EVIDENCE_DIR || 'e2e-evidence/web';

await mkdir(EVIDENCE, { recursive: true });
await mkdir(`${EVIDENCE}/responsive`, { recursive: true });

const results = { pass: 0, fail: 0, errors: [] };

console.log('═══════════════════════════════════════════════');
console.log('  Web Validator (Playwright)');
console.log('═══════════════════════════════════════════════');
console.log(`  Base URL: ${BASE_URL}`);
console.log(`  Headless: ${HEADLESS}`);
console.log(`  Evidence: ${EVIDENCE}`);
console.log('═══════════════════════════════════════════════');

const browser = await chromium.launch({ headless: HEADLESS });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();

// Capture console errors
const consoleErrors = [];
page.on('console', msg => {
  if (msg.type() === 'error') {
    consoleErrors.push(msg.text());
  }
});
page.on('pageerror', err => {
  consoleErrors.push(`Page error: ${err.message}`);
});

try {
  // ─── Initial Load ───
  console.log('\n── Validating: Initial Load ──');
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: `${EVIDENCE}/01-initial-load.png`, fullPage: true });
  console.log(`  Screenshot: 01-initial-load.png`);

  const title = await page.title();
  console.log(`  Page title: ${title}`);

  if (title && title !== 'Error' && title !== '') {
    console.log('  ✓ Page loaded with content');
    results.pass++;
  } else {
    console.log('  ✗ Page may not have loaded correctly');
    results.fail++;
  }

  // ─── Responsive Testing ───
  console.log('\n── Validating: Responsive Design ──');
  const viewports = [
    { name: 'mobile', width: 375, height: 812 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1440, height: 900 },
  ];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.screenshot({
      path: `${EVIDENCE}/responsive/${vp.name}-${vp.width}x${vp.height}.png`,
      fullPage: true
    });
    console.log(`  Screenshot: responsive/${vp.name}-${vp.width}x${vp.height}.png`);
    results.pass++;
  }

} catch (err) {
  console.error(`\n  ✗ Validation error: ${err.message}`);
  await page.screenshot({ path: `${EVIDENCE}/error-state.png` }).catch(() => {});
  results.fail++;
  results.errors.push(err.message);
} finally {
  // ─── Console Errors ───
  if (consoleErrors.length > 0) {
    console.log(`\n── Console Errors: ${consoleErrors.length} ──`);
    consoleErrors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
    await writeFile(`${EVIDENCE}/console-errors.txt`, consoleErrors.join('\n'));
  } else {
    console.log('\n  ✓ No console errors detected');
  }

  await browser.close();
}

// ─── Summary ───
console.log('\n═══════════════════════════════════════════════');
console.log('  Web Validation Summary');
console.log('═══════════════════════════════════════════════');
console.log(`  PASS:           ${results.pass}`);
console.log(`  FAIL:           ${results.fail}`);
console.log(`  Console errors: ${consoleErrors.length}`);
console.log(`  Evidence:       ${EVIDENCE}`);
console.log('═══════════════════════════════════════════════');

await writeFile(`${EVIDENCE}/summary.json`, JSON.stringify({
  timestamp: new Date().toISOString(),
  baseUrl: BASE_URL,
  pass: results.pass,
  fail: results.fail,
  consoleErrors: consoleErrors.length,
  errors: results.errors
}, null, 2));

process.exit(results.fail > 0 ? 1 : 0);

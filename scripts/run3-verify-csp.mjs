/**
 * Run3 CSP proof (R3-18/19): run against a LOCAL PRODUCTION build
 * (NODE_ENV=production node dist/index.js) where the nonce-based CSP is active,
 * and assert zero CSP violations in the browser console across key routes.
 *
 * Usage: node scripts/run3-verify-csp.mjs http://localhost:5001
 */
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://localhost:5001";
const EXEC = ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const ROUTES = ["/", "/category/encoding-codecs", "/search?q=codec", "/about", "/journeys", "/login"];

const browser = await chromium.launch({ executablePath: EXEC });
const page = await (await browser.newContext()).newPage();

const violations = [];
page.on("console", (msg) => {
  const t = msg.text();
  if (/content security policy|refused to (apply|execute|load|connect)/i.test(t)) {
    violations.push(t.slice(0, 300));
  }
});
await page.addInitScript(() => {
  document.addEventListener("securitypolicyviolation", (e) => {
    console.error(`CSPVIOLATION ${e.violatedDirective} ${e.blockedURI}`);
  });
});

let failed = false;
for (const r of ROUTES) {
  const before = violations.length;
  const resp = await page.goto(`${BASE}${r}`, { waitUntil: "networkidle", timeout: 20000 }).catch((e) => null);
  await page.waitForTimeout(800);
  const status = resp ? resp.status() : "ERR";
  const delta = violations.length - before;
  const hasContent = (await page.locator("#root > *").count()) > 0;
  const pass = delta === 0 && hasContent && status !== "ERR";
  if (!pass) failed = true;
  console.log(`${pass ? "PASS" : "FAIL"}  ${r} — status=${status} cspViolations=${delta} rendered=${hasContent}`);
}

if (violations.length) console.log("\nviolations:\n" + violations.join("\n"));
console.log(`\n=== CSP proof: ${failed ? "FAIL" : "PASS"} (${violations.length} total violations) ===`);
await browser.close();
process.exit(failed ? 1 : 0);

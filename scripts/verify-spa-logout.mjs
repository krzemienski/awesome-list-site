import { chromium } from "playwright";

const BASE = "http://localhost:5000";
const EXEC = ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome";

const browser = await chromium.launch({ executablePath: EXEC });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

// 1. Login via same-origin fetch (sets session cookie in the browser context)
await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
const loginStatus = await page.evaluate(async () => {
  const r = await fetch("/api/auth/local/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email: "admin@example.com", password: "devtest-run3-Pw1" }),
  });
  return r.status;
});
console.log("login status:", loginStatus);

// 2. Full load of home page, confirm authed
await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
const before = await page.evaluate(async () => (await (await fetch("/api/auth/user", { credentials: "include" })).json()));
console.log("before SPA /logout:", JSON.stringify(before));

// 3. SPA client-side navigation to /logout (no full page load)
await page.evaluate(() => {
  window.history.pushState({}, "", "/logout");
  window.dispatchEvent(new PopStateEvent("popstate"));
});

// 4. The Logout route posts /api/auth/logout then window.location.replace("/")
await page.waitForURL(BASE + "/", { timeout: 10000 });
await page.waitForTimeout(1000);
const after = await page.evaluate(async () => (await (await fetch("/api/auth/user", { credentials: "include" })).json()));
console.log("after SPA /logout:", JSON.stringify(after));
console.log("final URL:", page.url());

const pass =
  loginStatus === 200 &&
  before.isAuthenticated === true &&
  after.isAuthenticated === false &&
  after.user === null &&
  new URL(page.url()).pathname === "/";
console.log(pass ? "PASS SPA /logout clears session and redirects home" : "FAIL SPA /logout");
await browser.close();
process.exit(pass ? 0 : 1);

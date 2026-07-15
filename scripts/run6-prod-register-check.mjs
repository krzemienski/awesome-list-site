import { chromium } from "playwright";

const exePath = ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome";

const browser = await chromium.launch({ executablePath: exePath });
const page = await browser.newPage();

// R3-H03: audit claims the /register page renders no form fields on prod.
await page.goto("https://awesome.video/register", { waitUntil: "networkidle", timeout: 45000 });
const email = await page.locator('input[type="email"]').count();
const pw = await page.locator('input[type="password"]').count();
const submit = await page.locator('button[type="submit"]').count();
const heading = (await page.locator("h1, h2").first().textContent().catch(() => "")) || "";
console.log(`H03 prod /register: email-inputs=${email} password-inputs=${pw} submit=${submit} heading="${heading.trim()}"`);
console.log(email >= 1 && pw >= 1 && submit >= 1 ? "H03 VERDICT: STALE (form fully renders on prod)" : "H03 VERDICT: CONFIRMED (fields missing)");

await browser.close();

// One-off: log into the LOCAL running app via a real browser and persist the
// authenticated storageState so verify-fixes.mjs can exercise auth-gated pages
// (/settings/theme, /admin). Real login, no mocks. Local :5055 only.
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE || "http://localhost:5055";
const OUT = process.env.AUTH_OUT || "/tmp/hunt-local-auth.json";

const b = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const ctx = await b.newContext();
const p = await ctx.newPage();
await p.goto(BASE + "/login", { waitUntil: "networkidle" });
await p.fill('input[type="email"]', "admin@example.com");
await p.fill('input[type="password"]', "admin123");
await Promise.all([
  p.waitForResponse(
    (r) => r.url().includes("/api/auth/local/login") && r.status() === 200,
    { timeout: 15000 }
  ).catch(() => {}),
  p.click('button[type="submit"]'),
]);
await p.waitForTimeout(1500);
const authed = await p.evaluate(async () => {
  const r = await fetch("/api/auth/user");
  const j = await r.json();
  return j.isAuthenticated === true
    ? j.user.email
    : "NOT-AUTHED:" + JSON.stringify(j).slice(0, 80);
});
console.log("browser-login →", authed);
await ctx.storageState({ path: OUT });
await b.close();
process.exit(authed.startsWith("NOT-AUTHED") ? 1 : 0);

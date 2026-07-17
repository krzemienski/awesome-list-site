// Run16 — BUG-018 live DOM probe: recommendation preference selects must have
// accessible names (label[for] / aria-labelledby / aria-label). Authed session
// required — the preference form only renders for logged-in users.
import { chromium } from "playwright";
const EXE = ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const BASE = "http://localhost:5000";
const lr = await fetch(`${BASE}/api/auth/local/login`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin@example.com", password: process.env.ADMIN_PASSWORD }),
});
if (!lr.ok) { console.error("login failed", lr.status); process.exit(1); }
const sid = (lr.headers.getSetCookie ? lr.headers.getSetCookie() : [lr.headers.get("set-cookie")])
  .map(c => c.split(";")[0]).find(c => c.startsWith("connect.sid="));
const [name, ...rest] = sid.split("=");
const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext();
await ctx.addCookies([{ name, value: rest.join("="), domain: "localhost", path: "/" }]);
const page = await ctx.newPage();
await page.goto(BASE + "/recommendations", { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForSelector('[data-testid^="trigger-"], [role="combobox"]', { timeout: 25000 }).catch(() => {});
const rec = await page.evaluate(() => {
  const out = [];
  for (const t of document.querySelectorAll('main [role="combobox"]')) {
    const id = t.id;
    const labelled = t.getAttribute("aria-labelledby");
    const byFor = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
    let name = "";
    if (byFor) name = byFor.textContent.trim();
    else if (labelled) name = labelled.split(/\s+/).map(i => document.getElementById(i)?.textContent?.trim() || "").join(" ").trim();
    else name = t.getAttribute("aria-label") || "";
    out.push({ testid: t.getAttribute("data-testid") || t.tagName, name });
  }
  return out;
});
console.log("BUG-018 preference selects:", JSON.stringify(rec, null, 1));
const unlabeled = rec.filter(r => !r.name);
console.log(unlabeled.length === 0 && rec.length > 0
  ? `PASS BUG-018 all ${rec.length} preference selects have accessible names`
  : `FAIL BUG-018 unlabeled=${unlabeled.length} found=${rec.length}`);
await browser.close();
process.exit(unlabeled.length === 0 && rec.length > 0 ? 0 : 1);

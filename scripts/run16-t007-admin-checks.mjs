// Run16 T007 — deferred live admin checks: BUG-082 (Escape closes Add Resource
// dialog), BUG-013 (journey steps dialog groups rows by stepNumber: journey 7 =
// 18 rows -> 6 cards), BUG-011/088 (admin users table horizontally scrollable
// at 375/768 without body overflow).
import { chromium } from "playwright";

const EXE = ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const BASE = "http://localhost:5000";
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
  cond ? pass++ : fail++;
};

// API login -> connect.sid
const lr = await fetch(`${BASE}/api/auth/local/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin@example.com", password: process.env.ADMIN_PASSWORD }),
});
if (!lr.ok) { console.error("login failed", lr.status, await lr.text()); process.exit(1); }
const setCookies = lr.headers.getSetCookie ? lr.headers.getSetCookie() : [lr.headers.get("set-cookie")];
const sid = setCookies.map(c => c.split(";")[0]).find(c => c.startsWith("connect.sid="));
if (!sid) { console.error("no connect.sid"); process.exit(1); }
const [name, ...rest] = sid.split("=");
const cookie = { name, value: rest.join("="), domain: "localhost", path: "/" };

const browser = await chromium.launch({ executablePath: EXE });

// ---- Desktop: BUG-082 + BUG-013 ----
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies([cookie]);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 150)));

  // BUG-082: Add Resource dialog closes on Escape
  await page.goto(BASE + "/admin#resources", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector('[data-testid="button-add-resource"]', { timeout: 20000 });
  await page.click('[data-testid="button-add-resource"]');
  await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
  const openBefore = await page.locator('[role="dialog"]').count();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  const openAfter = await page.locator('[role="dialog"]').count();
  ok("BUG-082 Add Resource dialog opens then Escape closes it", openBefore > 0 && openAfter === 0,
    `before=${openBefore} after=${openAfter}`);

  // BUG-013: journey 7 steps dialog -> 6 grouped cards (18 raw rows)
  await page.goto(BASE + "/admin#journeys", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector('[data-testid="edit-steps-7"]', { timeout: 20000 });
  await page.click('[data-testid="edit-steps-7"]');
  await page.waitForSelector('[data-testid="steps-dialog"]', { timeout: 10000 });
  await page.waitForTimeout(1200); // steps query
  const groups = await page.locator('[data-testid^="step-group-"]').count();
  ok("BUG-013 journey 7 renders 6 grouped step cards (not 18 raw rows)", groups === 6, `cards=${groups}`);
  await page.keyboard.press("Escape");

  ok("desktop admin zero page errors", errors.length === 0, errors.join(" | ") || "clean");
  await ctx.close();
}

// ---- BUG-011/088 at 375 and 768: users table scroll containment ----
for (const [label, width] of [["mobile@375", 375], ["tablet@768", 768]]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, isMobile: width < 500, hasTouch: width < 500 });
  await ctx.addCookies([cookie]);
  const page = await ctx.newPage();
  await page.goto(BASE + "/admin#users", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector('[data-testid="input-user-search"]', { timeout: 20000 });
  await page.waitForTimeout(1000);
  const m = await page.evaluate(() => {
    const doc = document.documentElement;
    const table = document.querySelector("table");
    let scroller = table && table.parentElement;
    while (scroller && scroller !== document.body) {
      const st = getComputedStyle(scroller);
      if (/(auto|scroll)/.test(st.overflowX)) break;
      scroller = scroller.parentElement;
    }
    return {
      bodyOverflow: doc.scrollWidth - doc.clientWidth,
      hasScroller: !!(scroller && scroller !== document.body),
      scrollerOverflow: scroller && scroller !== document.body ? scroller.scrollWidth - scroller.clientWidth : -1,
    };
  });
  ok(`BUG-011/088 ${label} users table contained (no body x-overflow)`, m.bodyOverflow <= 1, `body overflow=${m.bodyOverflow}px`);
  ok(`BUG-011/088 ${label} table lives in an x-scroll container`, m.hasScroller && m.scrollerOverflow >= 0,
    `scroller=${m.hasScroller} innerOverflow=${m.scrollerOverflow}px`);
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);

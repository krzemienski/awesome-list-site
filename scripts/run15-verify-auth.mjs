// Run15 authed verification (1440px, admin@example.com session):
// Part 1 (user surfaces): BUG-034 fav/bookmark aria-pressed, BUG-005 profile Settings btn,
//   BUG-006 favorites linked, BUG-049 display-name edit UI, BUG-041 suggest-edit no-op guard
// Part 2 (admin surfaces): BUG-014 create validation, BUG-016 Escape closes dialog,
//   BUG-002 category create works, BUG-015 humanized 409 toast, BUG-019 batch size 0 guard,
//   BUG-030 sync date format, BUG-035 link-health zero-state
import { chromium } from "playwright";

const EXE = ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const BASE = "http://localhost:5000";
const RESOURCE_ID = 187906;
const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${name} — ${detail}`);
};

const PART = process.argv[2] ?? "all";
const run1 = PART === "all" || PART === "1";
const run2 = PART === "all" || PART === "2";

const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// login (session cookie shared with the browser context)
const login = await ctx.request.post(BASE + "/api/auth/local/login", {
  data: { email: "admin@example.com", password: process.env.ADMIN_PASSWORD },
});
if (login.status() !== 200) {
  console.error(`LOGIN FAILED status=${login.status()} body=${(await login.text()).slice(0, 200)}`);
  process.exit(1);
}

const bodyText = () => page.evaluate(() => document.body.innerText);

if (run1) {
  // --- BUG-034: aria-pressed present + toggles on resource detail fav/bookmark
  await page.goto(`${BASE}/resource/${RESOURCE_ID}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector('[data-testid="button-favorite"]', { timeout: 20000 });
  {
    const fav = page.locator('[data-testid="button-favorite"]');
    const before = await fav.getAttribute("aria-pressed");
    await fav.click();
    await page.waitForTimeout(1200);
    const after = await fav.getAttribute("aria-pressed");
    const bmk = await page.locator('[data-testid="button-bookmark"]').getAttribute("aria-pressed");
    ok("BUG-034 fav/bookmark aria-pressed", before !== null && bmk !== null && before !== after,
      `favorite ${before}->${after}, bookmark=${bmk}`);
  }

  // --- BUG-005: profile Settings button navigates
  await page.goto(BASE + "/profile", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector('[data-testid="button-profile-settings"]', { timeout: 20000 });
  {
    await page.locator('[data-testid="button-profile-settings"]').click();
    await page.waitForTimeout(800);
    const path = await page.evaluate(() => window.location.pathname);
    ok("BUG-005 profile Settings navigates", path === "/settings/theme", `landed on ${path}`);
  }

  // --- BUG-006: favorites tab rows link to /resource/:id
  await page.goto(BASE + "/profile", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector('[role="tab"]', { timeout: 20000 });
  {
    await page.locator('[role="tab"]', { hasText: /^favorites$/i }).click();
    await page.waitForTimeout(1200);
    const link = page.locator('[data-testid^="link-favorite-"]').first();
    const href = (await link.count()) ? await link.getAttribute("href") : null;
    ok("BUG-006 favorite rows linked", !!href && /^\/resource\/\d+$/.test(href), `first favorite href=${href}`);
  }

  // --- BUG-049: display-name edit dialog (change then restore)
  {
    const origName = (await page.locator("h1").first().textContent())?.trim() || "";
    await page.locator('[data-testid="button-edit-name"]').click();
    await page.waitForSelector('[data-testid="input-first-name"]', { timeout: 10000 });
    await page.locator('[data-testid="input-first-name"]').fill("QA");
    await page.locator('[data-testid="input-last-name"]').fill("Run15");
    await page.locator('[data-testid="button-save-name"]').click();
    await page.waitForTimeout(1500);
    const newName = (await page.locator("h1").first().textContent())?.trim() || "";
    const changed = /QA\s*Run15/.test(newName);
    // restore original
    const [origFirst, ...rest] = origName.split(/\s+/);
    await page.locator('[data-testid="button-edit-name"]').click();
    await page.waitForSelector('[data-testid="input-first-name"]', { timeout: 10000 });
    await page.locator('[data-testid="input-first-name"]').fill(origFirst || "Admin");
    await page.locator('[data-testid="input-last-name"]').fill(rest.join(" "));
    await page.locator('[data-testid="button-save-name"]').click();
    await page.waitForTimeout(1500);
    const restored = (await page.locator("h1").first().textContent())?.trim() || "";
    ok("BUG-049 display-name edit UI", changed && restored === origName,
      `"${origName}" -> "${newName}" -> restored "${restored}"`);
  }

  // --- unfavorite (teardown of BUG-034/006 state)
  await page.goto(`${BASE}/resource/${RESOURCE_ID}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector('[data-testid="button-favorite"]', { timeout: 20000 });
  {
    const fav = page.locator('[data-testid="button-favorite"]');
    if ((await fav.getAttribute("aria-pressed")) === "true") {
      await fav.click();
      await page.waitForTimeout(1000);
    }
    console.log(`  cleanup: favorite aria-pressed=${await fav.getAttribute("aria-pressed")}`);
  }

  // --- BUG-041: suggest-edit no-op blocked
  {
    await page.locator('[data-testid="button-suggest-edit"]').click();
    await page.waitForSelector('[data-testid="button-submit-edit"]', { timeout: 10000 });
    await page.locator('[data-testid="button-submit-edit"]').click();
    await page.waitForTimeout(800);
    const text = await bodyText();
    const blocked = /no changes to submit/i.test(text);
    const stillOpen = (await page.locator('[data-testid="button-submit-edit"]').count()) > 0;
    ok("BUG-041 suggest-edit no-op blocked", blocked && stillOpen,
      `toast=${blocked} dialogOpen=${stillOpen}`);
    if (stillOpen) await page.locator('[data-testid="button-cancel-edit"]').click();
  }
}

if (run2) {
  await page.goto(BASE + "/admin", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector('[data-testid="tab-categories"]', { timeout: 20000 });
  await page.locator('[data-testid="tab-categories"]').click();
  await page.waitForSelector('[data-testid="button-create-category"]', { timeout: 20000 });

  // --- BUG-016: Escape closes a freshly opened dialog (audit's literal claim).
  // Note: with a toast visible, the FIRST Escape dismisses the toast (topmost
  // layer) and the second closes the dialog — standard layered dismissal.
  {
    await page.locator('[data-testid="button-create-category"]').click();
    await page.waitForSelector('[data-testid="dialog-create-category"]', { timeout: 10000 });
    await page.waitForTimeout(400);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
    const open = (await page.locator('[data-testid="dialog-create-category"]').count()) > 0;
    ok("BUG-016 Escape closes dialog", !open, `dialog open after Escape=${open}`);
    if (open) await page.keyboard.press("Escape");
  }

  // --- BUG-014: empty create submit -> validation, dialog stays open
  {
    await page.locator('[data-testid="button-create-category"]').click();
    await page.waitForSelector('[data-testid="dialog-create-category"]', { timeout: 10000 });
    await page.locator('[data-testid="button-confirm-create"]').click();
    await page.waitForTimeout(800);
    const text = await bodyText();
    const stillOpen = (await page.locator('[data-testid="dialog-create-category"]').count()) > 0;
    const flagged = /missing|required/i.test(text);
    ok("BUG-014 create validation", stillOpen && flagged, `dialogOpen=${stillOpen} missing/required-msg=${flagged}`);
    // close: Escape may first dismiss the validation toast
    for (let i = 0; i < 3 && (await page.locator('[data-testid="dialog-create-category"]').count()); i++) {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
    }
  }

  // --- BUG-002: category create works end-to-end
  const QA_CAT = "__qa_run15_cat";
  {
    await page.locator('[data-testid="button-create-category"]').click();
    await page.waitForSelector('[data-testid="input-create-name"]', { timeout: 10000 });
    await page.locator('[data-testid="input-create-name"]').fill(QA_CAT);
    await page.locator('[data-testid="button-confirm-create"]').click();
    await page.waitForTimeout(2000);
    const text = await bodyText();
    const rowVisible = text.includes(QA_CAT);
    const dialogClosed = (await page.locator('[data-testid="dialog-create-category"]').count()) === 0;
    ok("BUG-002 category create works", rowVisible && dialogClosed,
      `rowVisible=${rowVisible} dialogClosed=${dialogClosed}`);
  }

  // --- BUG-015: duplicate create -> humanized toast (no raw JSON/status)
  {
    await page.locator('[data-testid="button-create-category"]').click();
    await page.waitForSelector('[data-testid="input-create-name"]', { timeout: 10000 });
    await page.locator('[data-testid="input-create-name"]').fill(QA_CAT);
    await page.locator('[data-testid="button-confirm-create"]').click();
    await page.waitForTimeout(1500);
    const text = await bodyText();
    const humanized = /already exists|already in use|duplicate/i.test(text);
    const raw = /409[:\s]|\{"|"message"/.test(text);
    ok("BUG-015 duplicate toast humanized", humanized && !raw, `humanized=${humanized} raw-json=${raw}`);
    for (let i = 0; i < 3 && (await page.locator('[data-testid="dialog-create-category"]').count()); i++) {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
    }
  }

  // --- cleanup: delete the QA category
  {
    const row = page.locator("tr", { hasText: QA_CAT }).first();
    let deleted = false;
    if (await row.count()) {
      await row.locator('[data-testid^="button-delete-"]').click();
      await page.waitForSelector('[data-testid="button-confirm-delete"]', { timeout: 10000 });
      await page.locator('[data-testid="button-confirm-delete"]').click();
      await page.waitForTimeout(2000);
      deleted = !(await bodyText()).includes(QA_CAT);
    }
    console.log(`  cleanup: QA category deleted=${deleted}`);
  }

  // --- BUG-019: enrichment batch size 0 rejected client-side
  // (assert the specific guard toast AND that no new job row was created —
  //  generic "started" regexes false-positive on static panel copy)
  {
    const before = await (await ctx.request.get(`${BASE}/api/enrichment/jobs`)).json();
    const beforeCount = Array.isArray(before) ? before.length : (before.jobs?.length ?? 0);
    await page.locator('[data-testid="tab-enrichment"]').click();
    await page.waitForSelector('[data-testid="input-batch-size"]', { timeout: 20000 });
    await page.locator('[data-testid="input-batch-size"]').fill("0");
    await page.locator('[data-testid="button-start-enrichment"]').click();
    await page.waitForTimeout(800);
    const text = await bodyText();
    const guardToast = /invalid batch size|between 1 and 50/i.test(text);
    const after = await (await ctx.request.get(`${BASE}/api/enrichment/jobs`)).json();
    const afterCount = Array.isArray(after) ? after.length : (after.jobs?.length ?? 0);
    ok("BUG-019 batch size 0 guarded", guardToast && afterCount === beforeCount,
      `guard-toast=${guardToast} jobs ${beforeCount}->${afterCount}`);
  }

  // --- BUG-030: GitHub sync dates use one explicit format
  {
    await page.locator('[data-testid="tab-github"]').click();
    await page.waitForTimeout(2500);
    const text = await bodyText();
    const rawLocale = (text.match(/\b\d{1,2}\/\d{1,2}\/\d{4},?\s+\d{1,2}:\d{2}/g) || []).slice(0, 3);
    const formatted = (text.match(/\b[A-Z][a-z]{2} \d{1,2}, \d{4}, \d{2}:\d{2} [AP]M/g) || []).slice(0, 3);
    ok("BUG-030 sync date format", rawLocale.length === 0,
      `raw-locale-dates=${JSON.stringify(rawLocale)} formatted-sample=${JSON.stringify(formatted)}`);
  }

  // --- BUG-035: link health honest zero-state (or real stats)
  {
    await page.locator('[data-testid="tab-linkhealth"]').click();
    await page.waitForTimeout(2500);
    const text = await bodyText();
    const zeroState = /no link health checks performed yet/i.test(text);
    const totalMatch = text.match(/Total Links?\s*\n?\s*([\d,]+)/i);
    const total = totalMatch ? parseInt(totalMatch[1].replace(/,/g, ""), 10) : null;
    const honest = zeroState || (total !== null && total > 0);
    ok("BUG-035 link health zero-state honest", honest,
      zeroState ? "zero-state copy shown" : `stats shown with totalLinks=${total}`);
  }
}

await browser.close();
const fails = results.filter(r => !r.pass);
console.log(`\n${results.length - fails.length}/${results.length} PASS (part ${PART})`);
process.exit(fails.length ? 1 : 0);

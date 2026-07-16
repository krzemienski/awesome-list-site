// Run14 authed verification (desktop 1440): BUG-008 return leg, BUG-052 streak hint,
// BUG-023/024 suggest-edit, BUG-034 admin tags, BUG-029 tag guard, BUG-020 admin tabs,
// BUG-007 friendly submit errors, BUG-033 cancel confirm.
import { chromium } from "playwright";

const EXE = ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const BASE = "http://localhost:5000";
const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) { console.error("ADMIN_PASSWORD env missing"); process.exit(2); }

const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${name} — ${detail}`);
};

const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// --- BUG-008: guarded route -> login -> back to requested page
await page.goto(BASE + "/profile", { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(1800);
const atLogin = page.url().includes("/login?next=%2Fprofile");
ok("BUG-008 redirect carries next", atLogin, `url=${page.url()}`);
await page.fill('input[type="email"]', ADMIN_EMAIL);
await page.fill('input[type="password"]', ADMIN_PASSWORD);
await page.locator('button[type="submit"]').first().click();
await page.waitForTimeout(3000);
ok("BUG-008 login returns to next", page.url().endsWith("/profile"), `post-login url=${page.url()}`);

// --- BUG-052: streak stat hint
await page.waitForTimeout(1500);
const hint = await page.locator('[data-testid="stat-hint-learning-streak"]').textContent().catch(() => null);
ok("BUG-052 streak hint present", !!hint && /consecutive days signed in/i.test(hint), `hint="${hint?.trim()}"`);

// --- BUG-023: suggest-edit no-op guard + name diff (on any resource)
await page.goto(BASE + "/resource/186449", { waitUntil: "domcontentloaded" });
await page.waitForSelector('[data-testid="button-back"]', { timeout: 15000 });
{
  const suggest = page.locator("button", { hasText: /suggest edit/i }).first();
  await suggest.click();
  await page.waitForSelector('[data-testid="button-submit-edit"]', { timeout: 8000 });
  await page.locator('[data-testid="button-submit-edit"]').click();
  await page.waitForTimeout(900);
  const dialogStill = await page.locator('[data-testid="button-submit-edit"]').count();
  const bodyTxt = await page.locator("body").innerText();
  const noopBlocked = dialogStill > 0 && /no changes|nothing to submit|change at least/i.test(bodyTxt);
  ok("BUG-023 no-op edit blocked", noopBlocked, `dialogOpen=${dialogStill > 0} msgFound=${/no changes|nothing to submit|change at least/i.test(bodyTxt)}`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
}

// --- BUG-024: legacy http:// resource can be edited without https block
await page.goto(BASE + "/resource/185277", { waitUntil: "domcontentloaded" }); // http://lives-video.com/
await page.waitForSelector('[data-testid="button-back"]', { timeout: 15000 });
{
  const suggest = page.locator("button", { hasText: /suggest edit/i }).first();
  await suggest.click();
  await page.waitForSelector('[data-testid="input-edit-title"]', { timeout: 8000 });
  const urlVal = await page.locator('[data-testid="input-edit-url"]').inputValue();
  await page.locator('[data-testid="input-edit-title"]').fill("LiVES Video Editing System (QA run14)");
  await page.locator('[data-testid="button-submit-edit"]').click();
  await page.waitForTimeout(1500);
  const bodyTxt = await page.locator("body").innerText();
  const httpsBlocked = /https/i.test(bodyTxt) && /must|required|invalid url/i.test(bodyTxt) && (await page.locator('[data-testid="button-submit-edit"]').count()) > 0;
  const succeeded = /submitted|thank|received|review/i.test(bodyTxt) || (await page.locator('[data-testid="button-submit-edit"]').count()) === 0;
  ok("BUG-024 legacy http URL not blocked", urlVal.startsWith("http://") && succeeded && !httpsBlocked,
    `prefill="${urlVal}" submitted=${succeeded}`);
  await page.keyboard.press("Escape");
}

// --- BUG-034 + BUG-029: submission tags visible to admin; script tags rejected server-side
{
  const submitRes = await page.evaluate(async () => {
    const r = await fetch("/api/submit", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "__qa_test_run14 tag visibility probe",
        url: "https://example.com/__qa_test_run14_tags",
        description: "Temporary QA submission to verify reviewer tag visibility.",
        category: "Encoding & Codecs",
        metadata: { tags: ["qa-tag-run14", "hls"] },
      }),
    });
    return { status: r.status, body: await r.json().catch(() => null) };
  });
  const xssRes = await page.evaluate(async () => {
    const r = await fetch("/api/submit", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "__qa_test_run14 xss probe",
        url: "https://example.com/__qa_test_run14_xss",
        description: "Temporary QA submission for tag guard.",
        category: "Encoding & Codecs",
        metadata: { tags: ["<script>alert(1)</script>"] },
      }),
    });
    return { status: r.status, body: await r.json().catch(() => null) };
  });
  ok("BUG-029 script tags rejected in tags", xssRes.status === 400,
    `xss tag submit -> ${xssRes.status} ${JSON.stringify(xssRes.body).slice(0, 100)}`);

  await page.goto(BASE + "/admin", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="tab-approvals"]', { timeout: 15000 });
  await page.waitForTimeout(2500);
  const pendingTxt = await page.locator("body").innerText();
  ok("BUG-034 reviewer sees submitted tags", submitRes.status < 300 && /qa-tag-run14/.test(pendingTxt),
    `submit=${submitRes.status} tagVisible=${/qa-tag-run14/.test(pendingTxt)}`);

  // --- BUG-020: all admin tabs visible (wrapping, no hidden overflow)
  const tabsInfo = await page.evaluate(() => {
    const list = document.querySelector('[role="tablist"]');
    if (!list) return null;
    const tabs = [...list.querySelectorAll('[role="tab"]')];
    const listRect = list.getBoundingClientRect();
    const hidden = tabs.filter(t => {
      const r = t.getBoundingClientRect();
      return r.right > listRect.right + 2 || r.left < listRect.left - 2;
    });
    return { total: tabs.length, hidden: hidden.length, overflow: list.scrollWidth > list.clientWidth + 2 };
  });
  ok("BUG-020 admin tabs all visible", !!tabsInfo && tabsInfo.total >= 12 && tabsInfo.hidden === 0 && !tabsInfo.overflow,
    tabsInfo ? `${tabsInfo.total} tabs, hidden=${tabsInfo.hidden} overflow=${tabsInfo.overflow}` : "tablist not found");
}

// --- BUG-007: duplicate submit -> friendly toast (no raw JSON)
await page.goto(BASE + "/submit", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
{
  const inputs = {
    title: 'input[name="title"], [data-testid="input-title"]',
    url: 'input[name="url"], [data-testid="input-url"]',
    desc: 'textarea[name="description"], [data-testid="input-description"], textarea',
  };
  await page.locator(inputs.title).first().fill("MPEG Standards Documentation duplicate probe");
  await page.locator(inputs.url).first().fill("https://www.mpeg.org/standards/");
  await page.locator(inputs.desc).first().fill("Duplicate URL probe — should trigger the friendly duplicate message.");
  const catTrigger = page.locator('button[role="combobox"]').first();
  if (await catTrigger.count()) {
    await catTrigger.click();
    await page.waitForTimeout(400);
    await page.locator('[role="option"]').first().click();
  }
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(2000);
  const toasts = (await page.locator("[role='status'], li[role='status'], .toast").allInnerTexts().catch(() => [])).join(" ");
  const surface = toasts || (await page.locator("body").innerText());
  const friendly = /already (exists|been submitted|in the list)|duplicate/i.test(surface);
  const raw = /409:|\{"/.test(surface);
  ok("BUG-007 friendly duplicate error", friendly && !raw, `toast="${surface.replace(/\s+/g, " ").slice(0, 140)}"`);
}

// --- BUG-033: Cancel on dirty form asks for confirmation
{
  await page.goto(BASE + "/submit", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await page.locator('input[name="title"], [data-testid="input-title"]').first().fill("dirty form probe");
  const cancel = page.locator("button", { hasText: /^cancel$/i }).first();
  // The fix uses a native window.confirm — it never appears in the DOM, so
  // capture Playwright's dialog event (dismiss = stay on the form).
  let confirmMsg = "";
  page.once("dialog", async (d) => { confirmMsg = d.message(); await d.dismiss(); });
  await cancel.click();
  await page.waitForTimeout(700);
  ok("BUG-033 cancel confirms discard", /discard|unsaved/i.test(confirmMsg),
    `confirm="${confirmMsg.slice(0, 100)}" stillOnSubmit=${page.url().includes("/submit")}`);
}

await browser.close();
const failed = results.filter(x => !x.pass);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length ? 1 : 0);

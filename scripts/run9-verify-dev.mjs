// Run9 dev verification — all client fixes + pending re-probes.
// Usage: node scripts/run9-verify-dev.mjs
import { chromium } from "playwright";

const BASE = "http://localhost:5000";
const EXE = ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${name} — ${detail}`);
};

const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

// goto 1: journey breadcrumb (BUG-020)
await page.goto(`${BASE}/journey/6`, { waitUntil: "networkidle" });
const crumb = await page
  .locator("nav[aria-label='breadcrumb'] li")
  .last()
  .innerText()
  .catch(() => "");
ok("BUG-020 journey breadcrumb", /video streaming fundamentals/i.test(crumb), `last crumb="${crumb.trim()}"`);

// header Sign in (BUG-025) — same page, logged out
const signIn = await page.locator("header button[aria-label='Sign in']").count();
const loginBtn = await page.locator("header button[aria-label='Login']").count();
ok("BUG-025 header Sign in", signIn === 1 && loginBtn === 0, `aria Sign in=${signIn}, Login=${loginBtn}`);

// footer 44px + GitHub (BUG-013/030) — same page
const footer = await page.evaluate(() => {
  const links = [...document.querySelectorAll("footer nav a")];
  return links.map((a) => ({
    text: a.textContent.trim(),
    h: Math.round(a.getBoundingClientRect().height),
    href: a.getAttribute("href"),
  }));
});
const allTall = footer.every((l) => l.h >= 44);
const gh = footer.find((l) => /github\.com\/krzemienski\/awesome-video/.test(l.href || ""));
ok("BUG-013 footer link heights", allTall, JSON.stringify(footer.map((l) => `${l.text}:${l.h}px`)));
ok("BUG-030 footer GitHub link", !!gh, gh ? `${gh.href} (${gh.h}px)` : "missing");

// skip-link height on focus (BUG-013)
const skipH = await page.evaluate(() => {
  const el = document.querySelector(".skip-link");
  el.focus();
  return Math.round(el.getBoundingClientRect().height);
});
ok("BUG-013 skip-link height", skipH >= 44, `${skipH}px focused`);

// BUG-024 sidebar hover — real hover on a NON-active taxonomy/nav item
const navItem = page
  .locator("[data-sidebar='sidebar'] button:not([class*='pink'])", { hasText: "Home" })
  .first();
const before24 = await navItem.evaluate((el) => getComputedStyle(el).backgroundColor);
await navItem.hover();
await page.waitForTimeout(350);
const after24 = await navItem.evaluate((el) => getComputedStyle(el).backgroundColor);
ok("BUG-024 sidebar item hover", before24 !== after24, `bg ${before24} -> ${after24}`);

// goto 2: home card hover (BUG-023)
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
const card = page.locator("a[data-testid^='link-category-'] > div").first();
await card.scrollIntoViewIfNeeded();
const before23 = await card.evaluate((el) => getComputedStyle(el).borderColor);
await card.hover();
await page.waitForTimeout(400);
const after23 = await card.evaluate((el) => getComputedStyle(el).borderColor);
ok("BUG-023 home card hover border", before23 !== after23, `border ${before23} -> ${after23}`);

// goto 3: login page (BUG-026 toggle, BUG-015 native email validation evidence)
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
const pw = page.locator("[data-testid='input-password']");
await pw.fill("secret123");
let type1 = await pw.getAttribute("type");
await page.locator("[data-testid='button-toggle-password']").click();
let type2 = await pw.getAttribute("type");
await page.locator("[data-testid='button-toggle-password']").click();
let type3 = await pw.getAttribute("type");
ok("BUG-026 password toggle", type1 === "password" && type2 === "text" && type3 === "password", `type ${type1}->${type2}->${type3}`);

const emailMsg = await page.evaluate(() => {
  const el = document.querySelector("[data-testid='input-email'], input[type='email']");
  if (!el) return "NO EMAIL INPUT";
  el.value = "notanemail";
  return `validity.valid=${el.checkValidity()} message="${el.validationMessage}"`;
});
ok("BUG-015 native email validation (evidence)", /valid=false/.test(emailMsg), emailMsg);

// goto 4: submit page whitespace validation (BUG-011)
await page.goto(`${BASE}/submit`, { waitUntil: "networkidle" });
const titleInput = page.locator("input[name='title'], [data-testid='input-title']").first();
const hasSubmitForm = (await titleInput.count()) > 0;
if (hasSubmitForm) {
  await titleInput.fill("   ");
  await titleInput.blur();
  await page.keyboard.press("Tab");
  // submit to trigger validation
  const btn = page.locator("button[type='submit']").first();
  await btn.click().catch(() => {});
  await page.waitForTimeout(600);
  const err = await page.locator("text=/title is required/i").count();
  ok("BUG-011 whitespace title rejected", err > 0, `error visible=${err}`);
} else {
  ok("BUG-011 whitespace title rejected", false, "submit form not reachable (auth wall?)");
}

// goto 5: advanced-filter mutual exclusion (BUG-027) — category page has filter+sort
await page.goto(`${BASE}/category/encoding-codecs`, { waitUntil: "networkidle" });
const filterBtn = page.locator("button", { hasText: "Filter by Tag" }).first();
if ((await filterBtn.count()) > 0) {
  await filterBtn.click();
  await page.waitForTimeout(300);
  const popoverOpen1 = await page.locator("[data-radix-popper-content-wrapper]").count();
  const sortTrigger = page.locator("button[aria-label='Sort resources']").first();
  await sortTrigger.click();
  await page.waitForTimeout(400);
  const state = await page.evaluate(() => {
    const pop = document.querySelector("[role='dialog'][data-state='open']");
    const sel = document.querySelector("[role='listbox']");
    return { filterOpen: !!pop, sortOpen: !!sel };
  });
  ok("BUG-027 filter/sort exclusion", popoverOpen1 > 0 && state.sortOpen && !state.filterOpen, `popover was open=${popoverOpen1 > 0}, after: sort=${state.sortOpen} filter=${state.filterOpen}`);
} else {
  ok("BUG-027 filter/sort exclusion", false, "Filter by Tag button not found");
}

// goto 6: /advanced community metrics zero-state (BUG-016)
await page.goto(`${BASE}/advanced`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
const hint = await page.locator("text=/tracked in this browser only/i").count();
const zeroChips = await page.evaluate(() => {
  const body = document.body.innerText;
  return { hasHint: /tracked in this browser only/i.test(body), hasZeroPct: /\b0%\s*\n?\s*engagement/i.test(body) };
});
ok("BUG-016 local-metrics hint", hint > 0 || zeroChips.hasHint, `hint=${hint > 0 || zeroChips.hasHint}, zero-pct-still-shown=${zeroChips.hasZeroPct}`);

// AMF differentiation visible on dev (BUG-022)
const amf = await page.evaluate(async () => {
  const r = await fetch("/api/search?q=Advanced%20Media%20Framework").then((r) => r.json());
  const list = (r.results || r).filter((x) => /AMF/i.test(x.title)).map((x) => x.title);
  return list;
});
ok("BUG-022 AMF titles differentiated", new Set(amf).size === amf.length && amf.some((t) => /guide/i.test(t)), JSON.stringify(amf));

await browser.close();
const fails = results.filter((r) => !r.pass);
console.log(`\n${results.length - fails.length}/${results.length} PASS`);
process.exit(fails.length ? 1 : 0);

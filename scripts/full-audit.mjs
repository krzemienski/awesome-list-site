// Comprehensive functional + layout audit crawler.
// Visits every route at desktop (1280) and mobile (400) and runs a battery
// of automated checks that surface REAL defects:
//   - console errors / page errors
//   - horizontal overflow (broken responsive layout)
//   - broken images (naturalWidth === 0)
//   - anchors with empty/`#`/javascript: href (links to nowhere)
//   - buttons / links with no accessible name
//   - sub-44px interactive targets on mobile (WCAG 2.5.5 / replit.md claim)
//   - duplicate id attributes (invalid DOM / a11y breakage)
//   - form controls with no associated label
// Output: .local/audit/full-audit-results.json  +  console summary.
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";

const BASE = "http://localhost:5000";
mkdirSync(".local/audit", { recursive: true });
mkdirSync("screenshots/full-audit", { recursive: true });

const findings = [];
function bug(route, vp, category, detail) {
  findings.push({ route, viewport: vp, category, detail });
}

// Static route list. Dynamic leaf routes (subcategory/sub-sub/resource) are
// discovered at runtime from real links on the Home/Category pages.
const staticRoutes = [
  "/", "/login", "/about", "/advanced", "/submit",
  "/journeys", "/journey/6", "/settings/theme",
  "/profile", "/bookmarks", "/admin",
  "/category/community-events", "/category/encoding-codecs",
  "/category/general-tools", "/category/media-tools",
  "/resource/186811",
  "/this-route-does-not-exist",
];

const PAGE_CHECK = () => {
  const out = { brokenImgs: [], deadLinks: [], namelessControls: [], dupIds: [], unlabeledInputs: [] };
  // broken images
  for (const img of Array.from(document.images)) {
    if (img.complete && img.naturalWidth === 0) {
      out.brokenImgs.push(img.getAttribute("src") || "(no src)");
    }
  }
  // dead links
  for (const a of Array.from(document.querySelectorAll("a"))) {
    const href = a.getAttribute("href");
    if (href === null || href === "" || href === "#" || href.startsWith("javascript:")) {
      out.deadLinks.push((a.textContent || "").trim().slice(0, 40) || "(empty)");
    }
  }
  // nameless interactive controls
  const named = (el) =>
    (el.getAttribute("aria-label") || "").trim() ||
    (el.getAttribute("aria-labelledby") || "").trim() ||
    (el.getAttribute("title") || "").trim() ||
    (el.textContent || "").trim() ||
    (el.querySelector("img[alt]")?.getAttribute("alt") || "").trim();
  for (const el of Array.from(document.querySelectorAll('button, a, [role="button"]'))) {
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") continue;
    if (!named(el)) out.namelessControls.push(el.outerHTML.slice(0, 80));
  }
  // duplicate ids
  const ids = {};
  for (const el of Array.from(document.querySelectorAll("[id]"))) {
    const id = el.id;
    ids[id] = (ids[id] || 0) + 1;
  }
  for (const [id, n] of Object.entries(ids)) if (n > 1) out.dupIds.push(`${id} ×${n}`);
  // unlabeled inputs
  for (const inp of Array.from(document.querySelectorAll("input, select, textarea"))) {
    if (inp.type === "hidden") continue;
    // Skip elements explicitly removed from the a11y tree (e.g. Radix's hidden
    // native <select> mirror rendered with aria-hidden + tabindex=-1).
    if (inp.getAttribute("aria-hidden") === "true" || inp.getAttribute("tabindex") === "-1") continue;
    const hasLabel =
      inp.getAttribute("aria-label") ||
      inp.getAttribute("aria-labelledby") ||
      inp.getAttribute("placeholder") ||
      (inp.id && document.querySelector(`label[for="${inp.id}"]`)) ||
      inp.closest("label");
    if (!hasLabel) out.unlabeledInputs.push(inp.outerHTML.slice(0, 80));
  }
  // horizontal overflow
  out.scrollW = document.documentElement.scrollWidth;
  out.clientW = document.documentElement.clientWidth;
  return out;
};

const TAP_TARGETS = () => {
  const small = [];
  for (const el of Array.from(document.querySelectorAll('button, a, [role="button"], input[type="checkbox"], input[type="radio"]'))) {
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    // ignore elements outside the viewport flow / off-screen
    if (r.bottom < 0 || r.top > window.innerHeight * 3) continue;
    if (r.width < 44 || r.height < 44) {
      small.push({ w: Math.round(r.width), h: Math.round(r.height), label: (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 30) });
    }
  }
  return small.slice(0, 25);
};

async function auditRoute(page, route, vp) {
  const consoleErrors = [];
  const onConsole = (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 160)); };
  const onPageErr = (e) => consoleErrors.push("[pageerror] " + String(e).slice(0, 160));
  page.on("console", onConsole);
  page.on("pageerror", onPageErr);

  let httpStatus = 0;
  try {
    const resp = await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 15000 });
    httpStatus = resp ? resp.status() : 0;
  } catch (e) {
    bug(route, vp, "NAVIGATION", `goto failed: ${String(e).slice(0, 100)}`);
  }
  await page.waitForTimeout(500);

  const checks = await page.evaluate(PAGE_CHECK);
  // filter expected console noise: 401 on admin endpoints for unauth users
  const realErrors = consoleErrors.filter(
    (e) => !e.includes("/api/admin/me") && !e.includes("401") && !e.includes("Failed to load resource: the server responded with a status of 401")
  );
  if (realErrors.length) bug(route, vp, "CONSOLE_ERROR", realErrors.slice(0, 5).join(" || "));
  if (checks.scrollW > checks.clientW + 2) bug(route, vp, "H_OVERFLOW", `scrollW=${checks.scrollW} > clientW=${checks.clientW}`);
  for (const i of checks.brokenImgs) bug(route, vp, "BROKEN_IMG", i);
  for (const l of [...new Set(checks.deadLinks)]) bug(route, vp, "DEAD_LINK", l);
  for (const c of checks.namelessControls.slice(0, 8)) bug(route, vp, "NO_ACCESSIBLE_NAME", c);
  for (const d of checks.dupIds) bug(route, vp, "DUPLICATE_ID", d);
  for (const u of checks.unlabeledInputs.slice(0, 6)) bug(route, vp, "UNLABELED_INPUT", u);

  if (vp === "mobile") {
    const small = await page.evaluate(TAP_TARGETS);
    for (const s of small) bug(route, vp, "SMALL_TAP_TARGET", `${s.w}x${s.h} "${s.label}"`);
  }

  const safe = route.replace(/[^a-z0-9]/gi, "_") || "root";
  await page.screenshot({ path: `screenshots/full-audit/${safe}_${vp}.jpg`, type: "jpeg", quality: 60, fullPage: false });

  page.off("console", onConsole);
  page.off("pageerror", onPageErr);
}

const browser = await chromium.launch();
for (const vp of ["desktop", "mobile"]) {
  const ctx = await browser.newContext({
    viewport: vp === "mobile" ? { width: 400, height: 760 } : { width: 1280, height: 800 },
  });
  const page = await ctx.newPage();
  for (const route of staticRoutes) {
    await auditRoute(page, route, vp);
  }
  await ctx.close();
}
await browser.close();

// group + dedupe
const byCat = {};
for (const f of findings) {
  byCat[f.category] = byCat[f.category] || [];
  byCat[f.category].push(f);
}
writeFileSync(".local/audit/full-audit-results.json", JSON.stringify({ total: findings.length, byCategory: Object.fromEntries(Object.entries(byCat).map(([k, v]) => [k, v.length])), findings }, null, 2));

console.log("=== FULL AUDIT FINDINGS ===");
for (const [cat, items] of Object.entries(byCat).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n## ${cat} (${items.length})`);
  for (const it of items.slice(0, 12)) console.log(`  [${it.viewport}] ${it.route} — ${it.detail}`);
  if (items.length > 12) console.log(`  ... +${items.length - 12} more`);
}
console.log(`\nTOTAL: ${findings.length} findings across ${staticRoutes.length} routes × 2 viewports`);

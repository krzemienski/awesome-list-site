// WP-6 AC-6.5 / G4.6-d — final axe-core sweep.
// Canonical 8-rule subset across 16 public routes + 15 admin tabs x 4 viewports.
// Public routes navigate via SPA pushState (single document, axe stays injected);
// admin tabs via location.hash. Results: _validation/phase-5/axe/<slug>.<vp>.axe.json
// Side effect (admin @1280): dumps DOM html for enrichment/github/linkhealth tabs
// into _validation/phase-5/admin-<tab>/ for the AC-6.3 color-alone audit.
// Usage: node _validation/phase-5/wp-6/axe-sweep.mjs <public|admin> <375|768|1280|1536>
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync } from "fs";

const BASE = "http://localhost:5000";
const OUT = "_validation/phase-5/axe";
const EXEC = ".cache/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-linux64/chrome-headless-shell";
const AXE_SRC = readFileSync("_validation/phase-6/axe.min.js", "utf8");
const RULES = ["landmark-one-main", "page-has-heading-one", "color-contrast", "button-name", "link-name", "aria-required-attr", "aria-valid-attr-value", "region"];
mkdirSync(OUT, { recursive: true });

const mode = process.argv[2];
const vp = parseInt(process.argv[3], 10);
// Optional 4th arg: comma-separated tab/route-slug subset (resume a timed-out
// sweep without re-running green cells; per-cell JSON artifacts are unchanged).
const only = process.argv[4] ? process.argv[4].split(",") : null;
if (!["public", "admin"].includes(mode) || ![375, 768, 1280, 1536].includes(vp)) {
  console.error("usage: axe-sweep.mjs <public|admin> <375|768|1280|1536> [tab1,tab2,...]");
  process.exit(2);
}

const PUBLIC_ROUTES = [
  { slug: "home", path: "/" },
  { slug: "about", path: "/about" },
  { slug: "login", path: "/login" },
  { slug: "settings-theme", path: "/settings/theme" },
  { slug: "submit", path: "/submit" },
  { slug: "advanced", path: "/advanced" },
  { slug: "journeys", path: "/journeys" },
  { slug: "journey-detail", path: "/journey/6" },
  { slug: "category", path: "/category/encoding-codecs" },
  { slug: "subcategory", path: "/category/encoding-codecs/encoders" },
  { slug: "sub-subcategory", path: "/category/encoding-codecs/encoders/hevc" },
  { slug: "resource-detail", path: "/resource/1" },
  { slug: "profile", path: "/profile" },
  { slug: "bookmarks", path: "/bookmarks" },
  { slug: "notfound", path: "/not-a-real-route" },
  { slug: "admin-gate", path: "/admin" },
];
const ADMIN_TABS = ["approvals", "edits", "enrichment", "researcher", "export", "database", "resources", "categories", "subcategories", "subsubcategories", "journeys", "users", "github", "linkhealth", "audit"];
const DOM_DUMP_TABS = ["enrichment", "github", "linkhealth"];

async function runAxe(page) {
  // Vite dev can full-reload the SPA (HMR), wiping the injected axe — re-inject if missing.
  const hasAxe = await page.evaluate(() => typeof window.axe !== "undefined");
  if (!hasAxe) await page.addScriptTag({ content: AXE_SRC });
  return page.evaluate(async (rules) => {
    const res = await window.axe.run(document, { runOnly: { type: "rule", values: rules } });
    return res.violations.map((v) => ({
      id: v.id, impact: v.impact,
      nodes: v.nodes.slice(0, 5).map((n) => ({ target: n.target, html: (n.html || "").slice(0, 200) })),
      nodeCount: v.nodes.length,
    }));
  }, RULES);
}

async function settleSpa(page) {
  await page.waitForFunction(() => document.body && document.body.innerText.length > 20, null, { timeout: 10000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 6000 }).catch(() => {});
  // Data-fetching route transitions can render main/h1 late; wait for landmarks
  // with catch so genuinely-broken pages still get scanned (and flagged) honestly.
  await page.waitForSelector("main", { timeout: 8000 }).catch(() => {});
  await page.waitForFunction(() => !!document.querySelector("h1"), null, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(700);
}

const browser = await chromium.launch({ executablePath: EXEC, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: vp, height: vp < 768 ? 844 : 900 } });
let totalViolations = 0;
const summary = [];

if (mode === "admin") {
  const login = await ctx.request.post(BASE + "/api/auth/local/login", {
    data: { email: readFileSync("/tmp/qa_wp6_email.txt", "utf8").trim(), password: readFileSync("/tmp/qa_wp6_pass.txt", "utf8").trim() },
    headers: { "Content-Type": "application/json" },
  });
  if (!login.ok()) throw new Error("login failed " + login.status());
}
const page = await ctx.newPage();

if (mode === "public") {
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 25000 });
  await settleSpa(page);
  await page.addScriptTag({ content: AXE_SRC });
  for (const r of PUBLIC_ROUTES) {
    if (only && !only.includes(r.slug)) continue;
    if (r.path !== "/") {
      await page.evaluate((p) => {
        window.history.pushState({}, "", p);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }, r.path);
      await settleSpa(page);
    }
    const violations = await runAxe(page);
    writeFileSync(`${OUT}/${r.slug}.${vp}.axe.json`, JSON.stringify({ mode, route: r.path, slug: r.slug, vp, rules: RULES, violations }, null, 2));
    totalViolations += violations.length;
    summary.push(`${r.slug}=${violations.length}${violations.length ? "(" + violations.map((v) => v.id).join(",") + ")" : ""}`);
    console.log(`${violations.length === 0 ? "PASS" : "FAIL"} ${r.slug}.${vp} violations=${violations.length}${violations.length ? " " + violations.map((v) => v.id + ":" + v.nodeCount).join(",") : ""}`);
  }
} else {
  await page.goto(`${BASE}/admin#approvals`, { waitUntil: "domcontentloaded", timeout: 25000 });
  await page.waitForSelector('[role="tab"]', { timeout: 15000 });
  await settleSpa(page);
  await page.addScriptTag({ content: AXE_SRC });
  // Match by data-testid OR Radix's own trigger id (id="radix-...-trigger-<value>")
  // so a missing testid can never silently break activation/verification again.
  const TRIGGER_SEL = (t) => `[data-testid="tab-${t}"], [role="tab"][id$="-trigger-${t}"]`;
  // catch(() => false): a Vite dev-client full reload can destroy the execution
  // context mid-evaluate — treat as "not active" so the goto fallback recovers.
  const isTabActive = (t) =>
    page.evaluate((sel) => document.querySelector(sel)?.getAttribute("aria-selected") === "true", TRIGGER_SEL(t)).catch(() => false);
  for (const tab of ADMIN_TABS) {
    if (only && !only.includes(tab)) continue;
    // AdminDashboard reads location.hash only in its useState initializer, so a
    // hash write after mount does nothing — the trigger click is the real
    // activation path. Scroll it into view first (the tab strip overflows and a
    // hidden trigger makes el.click() time out SILENTLY, leaving the previous
    // panel mounted — that produced wrong-panel scans/dumps before this guard).
    await page.evaluate((t) => {
      window.location.hash = t; // keep URL honest for the artifact metadata
      document.querySelectorAll(`[data-testid="tab-${t}"], [role="tab"][id$="-trigger-${t}"]`)[0]?.scrollIntoView({ block: "center", inline: "center" });
    }, tab).catch(() => {});
    await page.waitForTimeout(200);
    if (!(await isTabActive(tab))) {
      const el = await page.$(TRIGGER_SEL(tab));
      if (el) await el.click({ timeout: 5000 }).catch(() => {});
    }
    if (!(await isTabActive(tab))) {
      // Last resort: full reload — the hash initializer picks the tab on mount.
      await page.goto(`${BASE}/admin#${tab}`, { waitUntil: "domcontentloaded", timeout: 25000 });
      await page.waitForSelector('[role="tab"]', { timeout: 15000 }).catch(() => {});
    }
    await settleSpa(page);
    if (!(await isTabActive(tab))) {
      // NEVER scan the wrong panel silently — count it as a failure.
      totalViolations += 1;
      summary.push(`${tab}=HARNESS-FAIL(tab-not-activated)`);
      console.log(`FAIL admin-${tab}.${vp} HARNESS: tab could not be activated — skipping scan (counted as failure)`);
      continue;
    }
    const violations = await runAxe(page);
    writeFileSync(`${OUT}/admin-${tab}.${vp}.axe.json`, JSON.stringify({ mode, route: `/admin#${tab}`, slug: `admin-${tab}`, vp, rules: RULES, violations }, null, 2));
    totalViolations += violations.length;
    summary.push(`${tab}=${violations.length}${violations.length ? "(" + violations.map((v) => v.id).join(",") + ")" : ""}`);
    console.log(`${violations.length === 0 ? "PASS" : "FAIL"} admin-${tab}.${vp} violations=${violations.length}${violations.length ? " " + violations.map((v) => v.id + ":" + v.nodeCount).join(",") : ""}`);
    if (vp === 1280 && DOM_DUMP_TABS.includes(tab)) {
      mkdirSync(`_validation/phase-5/admin-${tab}`, { recursive: true });
      const html = await page.content();
      writeFileSync(`_validation/phase-5/admin-${tab}/1280-dark-admin-default.dom.html`, html);
      console.log(`  dumped DOM -> _validation/phase-5/admin-${tab}/1280-dark-admin-default.dom.html`);
    }
  }
}

await browser.close();
console.log(`SWEEP ${mode}.${vp}: totalViolations=${totalViolations} | ${summary.join(" ")}`);
process.exit(totalViolations === 0 ? 0 : 1);

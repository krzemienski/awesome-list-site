// V20 — cold, signed-out catalog/nav load against a genuinely unavailable database (real 503s, no mocks), then
// keyboard Retry after the database recovers. Scratch DB awesome_scratch_592 (DEV clone), dedicated instance D :5166.
// The outage is a real ACCESS EXCLUSIVE lock on `resources` held by a separate connection on the SCRATCH DB only;
// queries hit the server lock_timeout (SQLSTATE 55P03, ~2 s) and the route answers 503 + Retry-After.
import fs from "node:fs";
import pg from "pg";
import { spawn } from "node:child_process";
import { writeJson, sleep } from "./lib.mjs";
import { launch, newPage, shot, VPS } from "./browser-lib.mjs";

const DB = process.env.DATABASE_URL ?? "";
if (!/awesome_scratch_592(?!_seed)/.test(DB)) throw new Error("refusing: not the DEV-clone scratch DB");
const BASE = "http://127.0.0.1:5166";
process.on("unhandledRejection", (e) => console.error("unhandled (ignored)", String(e).slice(0, 200)));
const out = { started: new Date().toISOString(), steps: [] };
const step = (name, data) => { out.steps.push({ at: new Date().toISOString(), name, ...data }); console.log(new Date().toISOString().slice(11, 19), name, JSON.stringify(data).slice(0, 2200)); writeJson("/tmp/v592out/v20-catalog-503-retry.json", out); };
const sql = new pg.Pool({ connectionString: DB, max: 2 });

// SQL truth: categories and approved-resource counts per category (the nav tree counts every level under the category).
const truth = (await sql.query(`SELECT c.slug, c.name, count(r.id)::int n FROM categories c
  LEFT JOIN resources r ON r.category = c.name AND r.status = 'approved' GROUP BY c.slug, c.name ORDER BY c.name`)).rows;
step("sql-truth", { categories: truth.length, withResources: truth.filter((t) => t.n > 0).length, truth });

const fd = fs.openSync("/tmp/scrD-v20.log", "a");
const dProc = spawn("node_modules/.bin/tsx", ["server/index.ts"], { cwd: "/home/runner/workspace", detached: true, stdio: ["ignore", fd, fd],
  env: { ...process.env, PORT: "5166", DISABLE_BACKGROUND_JOBS: "1" } });
let lockClient = null;
async function lock() {
  lockClient = new pg.Client({ connectionString: DB }); await lockClient.connect();
  await lockClient.query("BEGIN"); await lockClient.query("LOCK TABLE resources IN ACCESS EXCLUSIVE MODE");
  const safety = setTimeout(() => unlock("safety-timeout"), 240_000); lockClient.__safety = safety;
}
async function unlock(why = "release") {
  if (!lockClient) return; const c = lockClient; lockClient = null; clearTimeout(c.__safety);
  await c.query("COMMIT").catch(() => {}); await c.end().catch(() => {}); console.log("unlocked:", why);
}
async function probe(path) {
  const t = Date.now(); try { const r = await fetch(`${BASE}${path}`, { headers: { "Cache-Control": "no-cache" } });
    return { status: r.status, ms: Date.now() - t, retryAfter: r.headers.get("retry-after"), body: (await r.text()).slice(0, 120) }; }
  catch (e) { return { error: String(e), ms: Date.now() - t }; }
}
/** Lock, then wait until the server's 60 s catalog cache no longer answers (a real 503 from the route). */
async function outage() {
  await lock();
  for (let i = 0; i < 12; i++) { const p = await probe("/api/awesome-list/nav"); if (p.status === 503) return p; await sleep(7000); }
  throw new Error("nav never went 503 under the lock");
}

const browser = await launch();
let r0 = {};
try {
  const t0 = Date.now();
  while (Date.now() - t0 < 150_000) { try { if ((await fetch(`${BASE}/api/health`)).ok) break; } catch {} await sleep(1000); }
  step("booted", { ms: Date.now() - t0, healthyNav: await probe("/api/awesome-list/nav") });

  for (const [label, vp, route] of [["1440-categories", VPS.desktop, "/categories"], ["390-categories", VPS[390], "/categories"], ["1440-home", VPS.desktop, "/"]]) {
    const before = await outage();
    const { page, context } = await newPage(browser, vp);
    const net = [];
    page.on("response", (r) => { const u = r.url(); if (/\/api\/(awesome-list|home)/.test(u)) net.push(`${r.status()} ${u.replace(BASE, "")}`); });
    r0 = { docStatus: null };
    page.on("response", (resp) => { if (resp.request().isNavigationRequest() && resp.url().startsWith(BASE) && (resp.status() < 300 || resp.status() >= 400)) r0.docStatus = `${resp.status()} retry-after=${resp.headers()["retry-after"] ?? "-"} ${resp.headers()["content-type"] ?? ""}`; });
    const tNav = Date.now();
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    const docMs = Date.now() - tNav;
    const card = route === "/" ? page.locator(".home-error[role=alert]") : page.locator('[data-testid="categories-error-card"]');
    const retry = route === "/" ? page.locator('[data-testid="button-retry-catalog"]') : page.locator('[data-testid="button-categories-retry"]');
    let shown = false; try { await card.waitFor({ timeout: 170_000 }); shown = true; } catch {}
    const r = { route, docMs, document: r0.docStatus, before, errorCardShown: shown, msToErrorCard: Date.now() - tNav,
      cardText: shown ? (await card.innerText()).replace(/\s+/g, " ") : null, apiResponsesWhileFailing: [...net],
      skeletonStillShown: await page.locator('[aria-busy="true"]').count() };
    await shot(page, `V20-${label}-error-card`);
    // Keyboard: Tab from the top of the document until Retry has focus (no mouse).
    if (!shown) { r.errors = page.__errors; step(`scenario-${label}`, r); await context.close(); await unlock("no error card"); continue; }
    let tabs = 0; await page.evaluate(() => document.activeElement?.blur());
    for (; tabs < 60; tabs++) { await page.keyboard.press("Tab"); if (await retry.evaluate((b) => b === document.activeElement, null, { timeout: 2000 }).catch(() => false)) break; }
    r.keyboard = { tabsToRetry: tabs + 1, retryFocused: await retry.evaluate((b) => b === document.activeElement).catch(() => false),
      focusVisible: await retry.evaluate((b) => b.matches(":focus-visible")).catch(() => null) };
    // Restore the real API, then activate Retry with Enter.
    await unlock("restore before Retry");
    r.afterRestoreProbe = await probe("/api/awesome-list/nav");
    net.length = 0;
    await page.keyboard.press("Enter");
    if (route === "/") { await page.waitForLoadState("domcontentloaded"); await page.locator('[data-testid^="card-category-"], .home-category-card, a[href^="/category/"]').first().waitFor({ timeout: 60_000 }).catch(() => {}); }
    else await page.locator('main a[href^="/category/"]').first().waitFor({ timeout: 60_000 }).catch(() => {});
    await sleep(2500);
    const rendered = await page.locator('main a[href^="/category/"]').evaluateAll((els) => [...new Set(els.map((a) => a.getAttribute("href")))]);
    r.recovery = { url: page.url(), errorCardGone: (await card.count()) === 0, apiResponsesAfterRetry: [...net], renderedCategoryLinks: rendered.length,
      renderedSlugs: rendered.map((h) => h.replace("/category/", "")),
      focusAfter: await page.evaluate(() => { const a = document.activeElement; return a ? { tag: a.tagName, id: a.id || null, testid: a.getAttribute("data-testid"), text: (a.textContent || "").trim().slice(0, 60), isBody: a === document.body } : null; }) };
    if (route === "/categories") {
      r.recovery.renderedCounts = await page.locator("main a[href^='/category/']").evaluateAll((els) => els.map((a) => ({ slug: a.getAttribute("href").replace("/category/", ""), text: a.innerText.replace(/\s+/g, " ").slice(0, 120) })));
      const navJson = await (await fetch(`${BASE}/api/awesome-list/nav`)).json();
      r.recovery.navVsSql = navJson.categories.map((c) => ({ slug: c.slug, nav: c.resourceCount, sql: truth.find((t) => t.slug === c.slug)?.n ?? null }));
      r.recovery.navMatchesSql = r.recovery.navVsSql.every((x) => x.nav === x.sql);
    }
    r.errors = page.__errors;
    await shot(page, `V20-${label}-recovered`);
    step(`scenario-${label}`, r);
    await context.close();
  }
} catch (e) { out.error = String(e.stack ?? e); console.error(e); }
finally {
  await unlock("finally");
  await browser.close().catch(() => {});
  try { process.kill(-dProc.pid, "SIGTERM"); } catch {} await sleep(2500); try { process.kill(-dProc.pid, "SIGKILL"); } catch {}
  const locks = (await sql.query(`SELECT count(*)::int n FROM pg_locks l JOIN pg_class c ON c.oid = l.relation WHERE c.relname = 'resources' AND l.mode = 'AccessExclusiveLock'`)).rows[0].n;
  step("cleanup", { accessExclusiveLocksLeft: locks, writes: "none (read-only scenario; lock released by COMMIT of an empty transaction)" });
  await sql.end(); process.exit(0);
}

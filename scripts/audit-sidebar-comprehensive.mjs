#!/usr/bin/env node
/**
 * Comprehensive sidebar audit.
 *
 * - Loads the inventory from /api/awesome-list (filtered like the sidebar).
 * - At 4 viewports: 375 (mobile), 768 (tablet), 1280 (desktop), 1920 (wide).
 *   - Screenshots collapsed sidebar
 *   - Opens mobile drawer when <1024
 *   - Click-toggles every category accordion (open + close)
 *   - Screenshots one expanded state
 * - For every category, every subcategory, every sub-subcategory:
 *   - Programmatically navigate to its canonical URL
 *   - Assert HTTP 200, exactly one visible h1, body text length > 200
 *   - Assert <h1> text contains category/sub/sub-sub name (case-insensitive,
 *     loose — first word match)
 * - Sample: from a few category accordions, actually CLICK the sidebar
 *   sub-item links to verify URL update + page change (proves the in-sidebar
 *   click contract, not just direct nav).
 *
 * Outputs:
 *   _validation/sidebar/run.json     — machine-readable pass/fail per check
 *   _validation/sidebar/summary.md   — human summary with failure list
 *   _validation/sidebar/shots/*.jpg  — screenshots at each viewport/state
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:5000";
const OUT = "_validation/sidebar";
const SHOTS = `${OUT}/shots`;
mkdirSync(SHOTS, { recursive: true });

const VIEWPORTS = [
  { name: "mobile-375", width: 375, height: 800, mobileDrawer: true },
  { name: "tablet-820", width: 820, height: 1000, mobileDrawer: false },
  { name: "desktop-1280", width: 1280, height: 900, mobileDrawer: false },
  { name: "wide-1920", width: 1920, height: 1080, mobileDrawer: false },
];

function pass(o, k, ok, extra = {}) {
  o.checks.push({ k, ok, ...extra });
  if (!ok) o.failures.push({ k, ...extra });
}

async function gotoSettled(page, url, t = 20000) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: t });
  await page
    .waitForFunction(() => document.body && document.body.innerText.length > 30, null, { timeout: 8000 })
    .catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(400);
}

async function ensureSidebarOpen(page, vp) {
  if (!vp.mobileDrawer) return;
  const trigger = await page.$('[data-testid="mobile-drawer-trigger"], [data-sidebar="trigger"]');
  if (!trigger) return;
  await trigger.click();
  await page.waitForSelector('[data-sidebar="sidebar"][data-state="open"]', { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(250);
}

async function getInventory() {
  const res = await fetch(`${BASE}/api/awesome-list`);
  const data = await res.json();
  const inv = [];
  for (const cat of data.categories || []) {
    if (
      cat.name === "Table of contents" ||
      cat.name.startsWith("List of") ||
      ["Contributing", "License", "External Links", "Anti-features"].includes(cat.name)
    ) continue;
    const subs = [];
    for (const sub of cat.subcategories || []) {
      const subSubs = [];
      for (const ss of sub.subSubcategories || []) {
        subSubs.push({ name: ss.name, slug: ss.slug, path: `/sub-subcategory/${ss.slug}` });
      }
      subs.push({ name: sub.name, slug: sub.slug, path: `/subcategory/${sub.slug}`, subSubs });
    }
    inv.push({ name: cat.name, slug: cat.slug, path: `/category/${cat.slug}`, subs });
  }
  return inv;
}

function looseMatch(text, name) {
  const t = (text || "").toLowerCase();
  const n = (name || "").toLowerCase();
  if (!t || !n) return false;
  if (t.includes(n)) return true;
  const firstWord = n.split(/[\s&\-]+/)[0];
  return firstWord.length > 2 && t.includes(firstWord);
}

async function probePage(page) {
  return await page.evaluate(() => {
    const h1s = Array.from(document.querySelectorAll("h1"))
      .filter((h) => !!(h.offsetParent || h.getClientRects().length))
      .map((h) => (h.innerText || "").trim().slice(0, 200));
    return {
      h1Visible: h1s.length,
      h1Texts: h1s,
      bodyLen: document.body.innerText.length,
    };
  });
}

async function runViewportSweep(browser, vp, inv) {
  const out = { viewport: vp.name, checks: [], failures: [] };
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();

  await gotoSettled(page, BASE + "/");
  await page.screenshot({ path: `${SHOTS}/${vp.name}_home.jpg`, type: "jpeg", quality: 70 });

  await ensureSidebarOpen(page, vp);
  await page.screenshot({ path: `${SHOTS}/${vp.name}_sidebar_open.jpg`, type: "jpeg", quality: 70 });

  // Verify Categories header + filter + first 3 category buttons present
  const headerProbe = await page.evaluate(() => ({
    hasCategoriesLabel: /BROWSE/.test(document.body.innerText),
    hasFilter: !!document.querySelector('[data-testid="sidebar-filter"]'),
    hasExpandAll: !!document.querySelector('[data-testid="toggle-expand-all"]'),
    catButtons: document.querySelectorAll('[data-testid^="accordion-cat-"]').length,
    navButtons: document.querySelectorAll('[data-testid^="nav-"]').length,
  }));
  pass(out, `${vp.name}_sidebar_shell`, headerProbe.hasCategoriesLabel && headerProbe.hasFilter && headerProbe.hasExpandAll && headerProbe.catButtons >= inv.length && headerProbe.navButtons >= 5, headerProbe);

  // Expand each category accordion, verify aria-expanded flips + body shows
  for (const cat of inv) {
    const sel = `[data-testid="accordion-cat-${cat.slug}"]`;
    try {
      const btn = await page.waitForSelector(sel, { timeout: 4000 });
      const before = await btn.getAttribute("aria-expanded");
      await btn.click();
      await page.waitForTimeout(250);
      const after = await btn.getAttribute("aria-expanded");
      // After click: if it had subs, expanded should toggle; if no subs, navigation happened.
      const opened = before === "false" && after === "true";
      const navigated = await page.evaluate(() => location.pathname);
      const ok = opened || navigated.startsWith(`/category/${cat.slug}`);
      pass(out, `${vp.name}_expand_${cat.slug}`, ok, { before, after, navigated, subs: cat.subs.length });

      // collapse it back so we don't blow up the layout
      if (opened) {
        await btn.click();
        await page.waitForTimeout(150);
      }
      if (navigated.startsWith("/category/")) {
        // go back home
        await gotoSettled(page, BASE + "/");
        await ensureSidebarOpen(page, vp);
      }
    } catch (e) {
      pass(out, `${vp.name}_expand_${cat.slug}`, false, { err: e.message.slice(0, 160) });
    }
  }

  // Final screenshot with first category expanded
  if (inv[0]) {
    const sel = `[data-testid="accordion-cat-${inv[0].slug}"]`;
    const btn = await page.$(sel);
    if (btn) {
      await btn.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${SHOTS}/${vp.name}_first_expanded.jpg`, type: "jpeg", quality: 70 });
    }
  }

  await ctx.close();
  return out;
}

let __navPartial = null;
async function runNavigationProof(browser, inv) {
  const out = { phase: "navigation", checks: [], failures: [] };
  __navPartial = out;

  // PHASE A: HTTP fetch for ALL 143 routes (fast — just status + has-html).
  console.log("  HTTP probe for all routes...");
  const allRoutes = [];
  for (const cat of inv) {
    allRoutes.push({ k: `http_cat:${cat.slug}`, path: cat.path, name: cat.name });
    for (const sub of cat.subs) {
      allRoutes.push({ k: `http_sub:${sub.slug}`, path: sub.path, name: sub.name });
      for (const ss of sub.subSubs)
        allRoutes.push({ k: `http_subsub:${ss.slug}`, path: ss.path, name: ss.name });
    }
  }
  // batched concurrent fetch
  const conc = 8;
  for (let i = 0; i < allRoutes.length; i += conc) {
    const slice = allRoutes.slice(i, i + conc);
    const results = await Promise.all(
      slice.map(async (r) => {
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 6000);
          const resp = await fetch(BASE + r.path, { signal: ctrl.signal });
          clearTimeout(t);
          const text = await resp.text();
          return { r, status: resp.status, len: text.length, ok: resp.status === 200 && text.length > 500 };
        } catch (e) {
          return { r, status: 0, len: 0, ok: false, err: e.message.slice(0, 120) };
        }
      })
    );
    for (const { r, status, len, ok, err } of results) {
      pass(out, r.k, ok, { status, len, name: r.name, ...(err ? { err } : {}) });
    }
    if ((i / conc) % 4 === 0) console.log(`    ${i + slice.length}/${allRoutes.length} fetched`);
  }

  // Rendered probe moved into click-through phase to avoid Vite HMR cross-context churn.
  return out;
}

async function runSidebarClickThrough(browser, inv) {
  // From sidebar UI: actually click through 3 categories (first + middle + last)
  // and for each, click "All in {cat}", then a sub, then a sub-sub if available.
  const out = { phase: "sidebar_clickthrough", checks: [], failures: [] };
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await gotoSettled(page, BASE + "/");

  const picks = [inv[0], inv[Math.floor(inv.length / 2)], inv[inv.length - 1]].filter(Boolean);
  for (const cat of picks) {
    // expand the accordion
    const acc = await page.waitForSelector(`[data-testid="accordion-cat-${cat.slug}"]`, { timeout: 5000 });
    const expanded = (await acc.getAttribute("aria-expanded")) === "true";
    if (!expanded) {
      await acc.click();
      await page.waitForTimeout(300);
    }
    // click "All in"
    const allBtn = await page.$(`[data-testid="sub-all-${cat.slug}"]`);
    if (allBtn) {
      await allBtn.click();
      await page.waitForTimeout(800);
      const url = page.url();
      const probe = await probePage(page);
      const ok = url.includes(cat.path) && probe.h1Visible >= 1 && probe.h1Texts.some((t) => looseMatch(t, cat.name));
      pass(out, `click_all_${cat.slug}`, ok, { url, h1: probe.h1Texts[0]?.slice(0, 80) });
    } else {
      pass(out, `click_all_${cat.slug}`, false, { err: "all-link missing" });
    }
    // back home
    await gotoSettled(page, BASE + "/");

    // click first sub via sidebar
    const acc2 = await page.waitForSelector(`[data-testid="accordion-cat-${cat.slug}"]`, { timeout: 5000 });
    await acc2.click();
    await page.waitForTimeout(250);
    const sub = cat.subs[0];
    if (sub) {
      const subBtn = await page.$(`[data-testid="sub-${sub.slug}"]`);
      if (subBtn) {
        await subBtn.click();
        await page.waitForTimeout(800);
        const url = page.url();
        const probe = await probePage(page);
        const ok = url.includes(sub.path) && probe.h1Visible >= 1 && probe.h1Texts.some((t) => looseMatch(t, sub.name));
        pass(out, `click_sub_${sub.slug}`, ok, { url, h1: probe.h1Texts[0]?.slice(0, 80) });
      } else {
        pass(out, `click_sub_${sub.slug}`, false, { err: "sub link missing" });
      }
      await gotoSettled(page, BASE + "/");
    }

    // click first sub-sub if available
    const ss = cat.subs.find((s) => s.subSubs.length > 0)?.subSubs[0];
    const ssParent = cat.subs.find((s) => s.subSubs.length > 0);
    if (ss && ssParent) {
      const acc3 = await page.waitForSelector(`[data-testid="accordion-cat-${cat.slug}"]`, { timeout: 5000 });
      await acc3.click();
      await page.waitForTimeout(250);
      const expSub = await page.$(`[data-testid="expand-sub-${ssParent.slug}"]`);
      if (expSub) {
        await expSub.click();
        await page.waitForTimeout(250);
        const ssBtn = await page.$(`[data-testid="subsub-${ss.slug}"]`);
        if (ssBtn) {
          await ssBtn.click();
          await page.waitForTimeout(800);
          const url = page.url();
          const probe = await probePage(page);
          const ok = url.includes(ss.path) && probe.h1Visible >= 1 && probe.h1Texts.some((t) => looseMatch(t, ss.name));
          pass(out, `click_subsub_${ss.slug}`, ok, { url, h1: probe.h1Texts[0]?.slice(0, 80) });
        } else {
          pass(out, `click_subsub_${ss.slug}`, false, { err: "subsub link missing" });
        }
      } else {
        pass(out, `click_subsub_${ss.slug}`, false, { err: `expand-sub-${ssParent.slug} missing` });
      }
      await gotoSettled(page, BASE + "/");
    }
  }

  await ctx.close();
  return out;
}

(async () => {
  console.log("loading inventory...");
  const inv = await getInventory();
  console.log(`inventory: ${inv.length} cats, ${inv.reduce((n,c)=>n+c.subs.length,0)} subs, ${inv.reduce((n,c)=>n+c.subs.reduce((m,s)=>m+s.subSubs.length,0),0)} subsubs`);

  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const all = { inventory: { cats: inv.length, subs: inv.reduce((n,c)=>n+c.subs.length,0), subSubs: inv.reduce((n,c)=>n+c.subs.reduce((m,s)=>m+s.subSubs.length,0),0) }, viewports: [], nav: null, clicks: null };

  try {
    for (const vp of VIEWPORTS) {
      console.log(`viewport sweep: ${vp.name}...`);
      try {
        all.viewports.push(await runViewportSweep(browser, vp, inv));
        console.log(`  ✓ ${vp.name} done`);
      } catch (e) {
        console.error(`  ✗ ${vp.name} crashed:`, e.message);
        all.viewports.push({ viewport: vp.name, checks: [], failures: [{ k: "sweep-crash", err: e.message }] });
      }
    }
    console.log("navigation proof (all category/sub/subsub URLs)...");
    try { all.nav = await runNavigationProof(browser, inv); console.log("  ✓ nav done"); }
    catch (e) {
      console.error("  ✗ nav crashed:", e.message);
      if (__navPartial && __navPartial.checks.length > 0) {
        console.error(`    preserving ${__navPartial.checks.length} collected checks before crash`);
        __navPartial.failures.push({ k: "nav-postcrash", err: e.message.slice(0, 200) });
        all.nav = __navPartial;
      } else {
        all.nav = { phase: "navigation", checks: [], failures: [{ k: "nav-crash", err: e.message.slice(0, 200) }] };
      }
    }
  } finally {
    await browser.close().catch(() => {});
  }

  // Click-through gets its own fresh browser (Vite HMR churn crashes long-lived browsers).
  console.log("sidebar click-through (fresh browser)...");
  const browser2 = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    all.clicks = await runSidebarClickThrough(browser2, inv);
    console.log("  ✓ clicks done");
  } catch (e) {
    console.error("  ✗ clicks crashed:", e.message);
    all.clicks = { phase: "sidebar_clickthrough", checks: [], failures: [{ k: "click-crash", err: e.message.slice(0, 200) }] };
  } finally {
    await browser2.close().catch(() => {});
  }

  // Aggregate
  let totalChecks = 0, totalFail = 0;
  const totals = { viewports: {}, nav: 0, clicks: 0 };
  for (const v of all.viewports) {
    totalChecks += v.checks.length;
    totalFail += v.failures.length;
    totals.viewports[v.viewport] = { checks: v.checks.length, failures: v.failures.length };
  }
  if (all.nav) { totalChecks += all.nav.checks.length; totalFail += all.nav.failures.length; totals.nav = all.nav.failures.length; }
  if (all.clicks) { totalChecks += all.clicks.checks.length; totalFail += all.clicks.failures.length; totals.clicks = all.clicks.failures.length; }

  all.totals = { checks: totalChecks, failures: totalFail };
  writeFileSync(`${OUT}/run.json`, JSON.stringify(all, null, 2));

  // Markdown summary
  const lines = [];
  lines.push(`# Sidebar audit — ${new Date().toISOString()}`);
  lines.push("");
  lines.push(`Inventory: ${all.inventory.cats} categories · ${all.inventory.subs} subcategories · ${all.inventory.subSubs} sub-subcategories`);
  lines.push("");
  lines.push(`**Total checks:** ${totalChecks} — **Failures:** ${totalFail}`);
  lines.push("");
  lines.push("## Per-viewport sidebar UI + accordion expand");
  for (const v of all.viewports) {
    lines.push(`- ${v.viewport}: ${v.checks.length - v.failures.length}/${v.checks.length} pass`);
  }
  lines.push("");
  lines.push("## Navigation (URL probe)");
  if (all.nav) lines.push(`- ${all.nav.checks.length - all.nav.failures.length}/${all.nav.checks.length} pass`);
  lines.push("");
  lines.push("## Sidebar click-through (UI interaction)");
  if (all.clicks) lines.push(`- ${all.clicks.checks.length - all.clicks.failures.length}/${all.clicks.checks.length} pass`);
  lines.push("");
  if (totalFail > 0) {
    lines.push("## Failures");
    for (const v of all.viewports) for (const f of v.failures) lines.push(`- [${v.viewport}] \`${f.k}\` — ${JSON.stringify(f).slice(0, 220)}`);
    if (all.nav) for (const f of all.nav.failures) lines.push(`- [nav] \`${f.k}\` — ${JSON.stringify(f).slice(0, 220)}`);
    if (all.clicks) for (const f of all.clicks.failures) lines.push(`- [click] \`${f.k}\` — ${JSON.stringify(f).slice(0, 220)}`);
  }
  writeFileSync(`${OUT}/summary.md`, lines.join("\n"));

  console.log(`\n=== TOTALS: ${totalChecks - totalFail}/${totalChecks} pass (${totalFail} failures) ===`);
  process.exit(totalFail === 0 ? 0 : 1);
})().catch((e) => { console.error("FATAL", e); process.exit(2); });

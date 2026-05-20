#!/usr/bin/env node
/**
 * EXHAUSTIVE sidebar click audit — DOM-DRIVEN.
 *
 * The click queue is discovered from the actual rendered sidebar DOM
 * (NOT from /api/awesome-list) so we exercise the real, user-visible surface.
 * The sidebar filters subs/sub-subs with `getTotalResourceCount > 0`, so
 * items hidden from real users are not pretended to exist.
 *
 * For every clickable nav item in the sidebar:
 *   1. ensure the parent cat accordion is expanded
 *   2. for subsubs, ensure the parent sub is expanded
 *   3. click via the actual DOM node
 *   4. verify the URL changed to the expected path
 *   5. verify a visible <h1> exists whose text matches the item name
 *   6. verify body has rendered content and differs from the homepage
 *
 * Outputs:
 *   _validation/sidebar/exhaustive.json   — every click PASS/FAIL with proof
 *   _validation/sidebar/exhaustive.md     — markdown summary
 *   _validation/sidebar/clicks/*.jpg      — screenshot per FAIL + first per kind
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const BASE = process.env.BASE_URL || "http://localhost:5000";
const OUT = "_validation/sidebar";
const SHOTS = `${OUT}/clicks`;
mkdirSync(SHOTS, { recursive: true });

const SAVE_EVERY = 10;
const RESTART_CTX_EVERY = 60; // restart browser context to avoid resource leaks
const PER_ITEM_WALL_MS = 9000;

const md5 = (s) => createHash("md5").update(s).digest("hex").slice(0, 12);

function looseMatch(text, name) {
  const t = (text || "").toLowerCase().replace(/\s+/g, " ");
  const n = (name || "").toLowerCase().replace(/\s+/g, " ");
  if (!t || !n) return false;
  if (t.includes(n)) return true;
  const firstWord = n.split(/[\s&\-]+/)[0];
  return firstWord.length > 2 && t.includes(firstWord);
}

async function probePage(page) {
  return await page.evaluate(() => {
    const visibleH1 = Array.from(document.querySelectorAll("h1"))
      .filter((h) => !!(h.offsetParent || h.getClientRects().length))
      .map((h) => (h.innerText || "").trim().slice(0, 200));
    const main = document.querySelector("main, [role='main'], #content, body") || document.body;
    return {
      h1Count: visibleH1.length,
      h1: visibleH1,
      bodyLen: document.body.innerText.length,
      bodyText: document.body.innerText.slice(0, 4000),
      resourceCards: main.querySelectorAll('article, [data-testid*="resource"], [data-testid*="card"], a[href^="/resource/"]').length,
      listItems: main.querySelectorAll("ul li, ol li").length,
      paragraphs: main.querySelectorAll("p").length,
      url: location.pathname,
    };
  });
}

async function isExpanded(page, testid) {
  return await page.evaluate((tid) => {
    const el = document.querySelector(`[data-testid="${tid}"]`);
    if (!el) return null;
    return el.getAttribute("aria-expanded") === "true" ||
           el.getAttribute("data-state") === "open";
  }, testid);
}

async function clickByTestid(page, testid, timeoutMs = 2500) {
  return await page.evaluate(async ({ tid, timeoutMs }) => {
    const start = Date.now();
    let el;
    while (Date.now() - start < timeoutMs) {
      el = document.querySelector(`[data-testid="${tid}"]`);
      if (el) break;
      await new Promise((r) => setTimeout(r, 50));
    }
    if (!el) return { ok: false, error: "not-found" };
    el.scrollIntoView({ block: "nearest" });
    el.click();
    return { ok: true };
  }, { tid: testid, timeoutMs });
}

async function ensureExpanded(page, testid) {
  const state = await isExpanded(page, testid);
  if (state === null) return false; // not in DOM
  if (state === true) return true;
  const r = await clickByTestid(page, testid, 2500);
  if (!r.ok) return false;
  await page.waitForTimeout(180);
  // verify
  return (await isExpanded(page, testid)) === true;
}

/* ------------------------- queue discovery ------------------------- */

async function discoverQueue(page) {
  // navs (always present)
  const navs = await page.$$eval('[data-sidebar="sidebar"] [data-testid^="nav-"]', els => els.map(e => ({
    testid: e.getAttribute("data-testid"),
    name: (e.innerText || e.title || "").trim().slice(0, 80),
    href: e.getAttribute("href"),
  })));

  // categories
  const cats = await page.$$eval('[data-testid^="accordion-cat-"]', els => els.map(e => ({
    testid: e.getAttribute("data-testid"),
    slug: e.getAttribute("data-testid").replace("accordion-cat-", ""),
    name: (e.getAttribute("title") || e.innerText || "").trim().slice(0, 80),
  })));

  // expand every category to enumerate its subs
  for (const c of cats) await ensureExpanded(page, c.testid);
  await page.waitForTimeout(300);

  // sub-all (one per cat)
  const subAlls = await page.$$eval('[data-sidebar="sidebar"] [data-testid^="sub-all-"]', els => els.map(e => ({
    testid: e.getAttribute("data-testid"),
    slug: e.getAttribute("data-testid").replace("sub-all-", ""),
    name: (e.getAttribute("title") || e.innerText || "").trim().replace(/^All in\s+/, "").replace(/\s*→.*$/, "").slice(0, 80),
    href: e.getAttribute("href"),
  })));

  // sub items (exclude sub-all)
  const subs = await page.$$eval('[data-sidebar="sidebar"] [data-testid]', els => els
    .filter(e => {
      const t = e.getAttribute("data-testid") || "";
      return t.startsWith("sub-") && !t.startsWith("sub-all-") && !t.startsWith("subsub-");
    })
    .map(e => ({
      testid: e.getAttribute("data-testid"),
      slug: e.getAttribute("data-testid").replace("sub-", ""),
      name: (e.getAttribute("title") || e.innerText || "").trim().slice(0, 80),
      href: e.getAttribute("href"),
    })));

  // expand-sub buttons (so we can enumerate sub-subs)
  const expandSubs = await page.$$eval('[data-sidebar="sidebar"] [data-testid^="expand-sub-"]', els => els.map(e => ({
    testid: e.getAttribute("data-testid"),
    slug: e.getAttribute("data-testid").replace("expand-sub-", ""),
  })));

  // expand every sub
  for (const e of expandSubs) {
    const state = await isExpanded(page, e.testid);
    if (state !== true) await clickByTestid(page, e.testid, 1500);
  }
  await page.waitForTimeout(300);

  // sub-subs
  const subSubs = await page.$$eval('[data-sidebar="sidebar"] [data-testid^="subsub-"]', els => els.map(e => ({
    testid: e.getAttribute("data-testid"),
    slug: e.getAttribute("data-testid").replace("subsub-", ""),
    name: (e.getAttribute("title") || e.innerText || "").trim().slice(0, 80),
    href: e.getAttribute("href"),
  })));

  // For each sub-sub we need to know its parent sub (so we can pre-expand it when clicking)
  // Build a map: subsub-slug → expand-sub-slug → parent cat
  const ssParent = await page.evaluate(() => {
    const out = {};
    document.querySelectorAll('[data-testid^="subsub-"]').forEach(ss => {
      // walk up to find the nearest div containing an expand-sub button
      let n = ss.parentElement;
      while (n) {
        const exp = n.querySelector('[data-testid^="expand-sub-"]');
        if (exp) {
          // also walk up further to find the cat accordion
          let n2 = exp.parentElement;
          while (n2) {
            const cat = n2.querySelector('[data-testid^="accordion-cat-"]');
            if (cat) {
              out[ss.getAttribute("data-testid")] = {
                expandSub: exp.getAttribute("data-testid"),
                accordionCat: cat.getAttribute("data-testid"),
              };
              return;
            }
            n2 = n2.parentElement;
          }
          out[ss.getAttribute("data-testid")] = {
            expandSub: exp.getAttribute("data-testid"),
            accordionCat: null,
          };
          return;
        }
        n = n.parentElement;
      }
    });
    return out;
  });

  // For each sub, find its parent cat (so we can pre-expand it)
  const subParent = await page.evaluate(() => {
    const out = {};
    document.querySelectorAll('[data-testid]').forEach(s => {
      const t = s.getAttribute("data-testid") || "";
      if (!t.startsWith("sub-") || t.startsWith("sub-all-") || t.startsWith("subsub-")) return;
      let n = s.parentElement;
      while (n) {
        const cat = n.querySelector('[data-testid^="accordion-cat-"]');
        if (cat) {
          out[t] = cat.getAttribute("data-testid");
          return;
        }
        n = n.parentElement;
      }
    });
    return out;
  });

  // Build click queue
  const q = [];
  for (const n of navs) q.push({
    kind: "nav", testid: n.testid, name: n.name, expectedPath: n.href, openVia: [],
  });
  for (const c of cats) q.push({
    kind: "cat", testid: `sub-all-${c.slug}`, name: c.name, expectedPath: `/category/${c.slug}`,
    openVia: [`accordion-cat-${c.slug}`],
  });
  for (const s of subs) q.push({
    kind: "sub", testid: s.testid, name: s.name, expectedPath: s.href || `/subcategory/${s.slug}`,
    openVia: subParent[s.testid] ? [subParent[s.testid]] : [],
  });
  for (const ss of subSubs) {
    const p = ssParent[ss.testid] || {};
    const open = [];
    if (p.accordionCat) open.push(p.accordionCat);
    if (p.expandSub) open.push(p.expandSub);
    q.push({
      kind: "subsub", testid: ss.testid, name: ss.name,
      expectedPath: ss.href || `/sub-subcategory/${ss.slug}`,
      openVia: open,
    });
  }
  return { queue: q, counts: { navs: navs.length, cats: cats.length, subs: subs.length, subSubs: subSubs.length } };
}

/* ------------------------- per-item verifier ------------------------- */

async function verifyOne(page, item, homeHash) {
  const errors = [];

  for (const ev of item.openVia) {
    if (!(await ensureExpanded(page, ev))) errors.push(`expand-${ev}-failed`);
  }

  const cr = await clickByTestid(page, item.testid, 2500);
  if (!cr.ok) {
    errors.push(`click-${item.testid}-${cr.error}`);
    return { ok: false, click: false, errors };
  }

  // wait until URL settles
  try {
    await page.waitForFunction(
      (p) => location.pathname === p,
      item.expectedPath,
      { timeout: 2500 },
    );
  } catch {}
  await page.waitForTimeout(180);

  const probe = await probePage(page);
  const urlOk = probe.url === item.expectedPath;
  const isHomeNav = item.kind === "nav" && item.expectedPath === "/";
  const h1Ok = isHomeNav ? true : (probe.h1Count >= 1 && probe.h1.some((t) => looseMatch(t, item.name)));
  const bodyOk = probe.bodyLen > 400;
  const distinctOk = isHomeNav ? true : md5(probe.bodyText) !== homeHash;
  const needsContent = item.kind !== "nav";
  const contentOk = !needsContent || (probe.resourceCards + probe.listItems + probe.paragraphs >= 1);

  const ok = !errors.length && urlOk && h1Ok && bodyOk && distinctOk && contentOk;
  return {
    ok, click: true, errors,
    url: probe.url, expectedPath: item.expectedPath,
    urlOk,
    h1: probe.h1[0]?.slice(0, 80), h1Ok,
    bodyLen: probe.bodyLen, bodyOk,
    bodyHash: md5(probe.bodyText), distinctOk,
    resourceCards: probe.resourceCards,
    listItems: probe.listItems,
    paragraphs: probe.paragraphs,
    contentOk,
  };
}

async function withWall(promise, ms, tag) {
  let t;
  const cap = new Promise((res) => { t = setTimeout(() => res({ __wall: tag, ms }), ms); });
  const r = await Promise.race([promise, cap]);
  clearTimeout(t);
  return r;
}

/* ------------------------- main ------------------------- */

async function setupContext(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(4000);
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForSelector('[data-testid^="accordion-cat-"]', { timeout: 10000 });
  await page.waitForTimeout(400);
  return { ctx, page };
}

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });

  let { ctx, page } = await setupContext(browser);
  const homeProbe = await probePage(page);
  const homeHash = md5(homeProbe.bodyText);
  console.log(`home: hash=${homeHash} body=${homeProbe.bodyLen}`);

  console.log("discovering queue from DOM...");
  const { queue, counts } = await discoverQueue(page);
  console.log(`discovered: ${counts.navs} navs · ${counts.cats} cats · ${counts.subs} subs · ${counts.subSubs} sub-subs = ${queue.length} click targets`);

  // reset to home for clean start
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 10000 });
  await page.waitForSelector('[data-testid^="accordion-cat-"]', { timeout: 8000 });
  await page.waitForTimeout(300);

  const results = [];
  const failures = [];
  const start = Date.now();
  const kindFirstShot = new Set();

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    const t0 = Date.now();

    const r = await withWall(verifyOne(page, item, homeHash), PER_ITEM_WALL_MS, item.testid);
    let result;
    if (r.__wall) {
      result = { ok: false, click: false, errors: [`WALL_${PER_ITEM_WALL_MS}ms`] };
      // best-effort recovery: close & rebuild context (wall-capped)
      const rec = await withWall((async () => {
        try { await ctx.close(); } catch {}
        const nb = await setupContext(browser);
        ctx = nb.ctx; page = nb.page;
        return true;
      })(), 12000, "recovery");
      if (rec.__wall) {
        console.log("  RECOVERY HUNG — aborting audit");
        break;
      }
    } else {
      result = r;
    }

    const row = { ...item, ...result, elapsedMs: Date.now() - t0 };
    results.push(row);
    if (!result.ok) failures.push(row);

    const status = result.ok ? "PASS" : "FAIL";
    console.log(`[${i + 1}/${queue.length}] ${status} ${item.kind}:${item.name.slice(0, 38)} → ${result.url || "?"} (body=${result.bodyLen || 0} cards=${result.resourceCards || 0})${result.errors?.length ? " err=" + JSON.stringify(result.errors).slice(0, 90) : ""}`);

    if (!result.ok || !kindFirstShot.has(item.kind)) {
      kindFirstShot.add(item.kind);
      const tag = `${item.kind}_${(item.name || "").replace(/[^\w]+/g, "-").slice(0, 30)}_${result.ok ? "ok" : "FAIL"}`;
      await page.screenshot({ path: `${SHOTS}/${tag}.jpg`, type: "jpeg", quality: 60, fullPage: false }).catch(() => {});
    }

    if ((i + 1) % SAVE_EVERY === 0) {
      writeFileSync(`${OUT}/exhaustive.json`, JSON.stringify({
        completed: i + 1, total: queue.length, passes: results.length - failures.length, failures: failures.length, partial: true, results,
      }, null, 2));
      console.log(`   --- saved partial at ${i + 1}, ${failures.length} fails, ${Math.round((Date.now() - start) / 1000)}s elapsed ---`);
    }

    // periodic ctx restart to dodge browser resource leaks
    if ((i + 1) % RESTART_CTX_EVERY === 0 && i + 1 < queue.length) {
      console.log(`   --- ctx restart at ${i + 1} ---`);
      try { await ctx.close(); } catch {}
      const nb = await setupContext(browser);
      ctx = nb.ctx; page = nb.page;
    }
  }

  try { await ctx.close(); } catch {}
  await browser.close().catch(() => {});

  const passes = results.length - failures.length;
  const final = {
    discovered: counts,
    queueLen: queue.length,
    totals: { checks: results.length, passes, failures: failures.length },
    homeHash,
    elapsedSec: Math.round((Date.now() - start) / 1000),
    results,
    failures,
  };
  writeFileSync(`${OUT}/exhaustive.json`, JSON.stringify(final, null, 2));

  const md = [];
  md.push(`# Exhaustive sidebar click audit — ${new Date().toISOString()}`);
  md.push("");
  md.push(`Discovered from DOM: ${counts.navs} navs · ${counts.cats} cats · ${counts.subs} subs · ${counts.subSubs} sub-subs`);
  md.push(`Click queue: **${queue.length}** items — **${passes}** passed, **${failures.length}** failed`);
  md.push(`Elapsed: ${final.elapsedSec}s · Home body hash: \`${homeHash}\``);
  md.push("");
  md.push("## Per-kind summary");
  for (const k of ["nav", "cat", "sub", "subsub"]) {
    const subset = results.filter((r) => r.kind === k);
    const ok = subset.filter((r) => r.ok).length;
    md.push(`- **${k}**: ${ok}/${subset.length} passed`);
  }
  if (failures.length) {
    md.push("");
    md.push("## Failures");
    for (const f of failures) {
      md.push(`- [${f.kind}] **${f.name}** — expected \`${f.expectedPath}\`, got \`${f.url}\`. urlOk=${f.urlOk} h1Ok=${f.h1Ok} bodyOk=${f.bodyOk} distinctOk=${f.distinctOk} contentOk=${f.contentOk}${f.errors?.length ? ` errors=${JSON.stringify(f.errors)}` : ""}`);
    }
  }
  writeFileSync(`${OUT}/exhaustive.md`, md.join("\n"));

  console.log(`\n=== EXHAUSTIVE TOTALS: ${passes}/${results.length} pass (${failures.length} failures) in ${final.elapsedSec}s ===`);
  process.exit(failures.length === 0 ? 0 : 1);
})().catch((e) => { console.error("FATAL", e); process.exit(2); });

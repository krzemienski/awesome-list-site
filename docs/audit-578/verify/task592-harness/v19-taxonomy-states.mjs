// V19 — empty taxonomy, absent-tag, high-page-count, featured/deep/tagged states on an isolated catalog.
// Seed scratch DB (awesome_scratch_592_seed, 3 pre-existing QA categories), instance C :5165. Owned fixtures only.
import fs from "node:fs";
import { spawn } from "node:child_process";
import { BASE, q, call, mintUser, ensureLocal, token, teardownAll, writeJson, sleep } from "./lib.mjs";
import { launch, newPage, signIn, shot, VPS } from "./browser-lib.mjs";

if (!/awesome_scratch_592_seed/.test(process.env.DATABASE_URL ?? "")) throw new Error("refusing: not the seed scratch DB");
process.on("unhandledRejection", (e) => console.error("unhandled (ignored)", String(e).slice(0, 200)));
const out = { started: new Date().toISOString(), steps: [] };
const step = (name, data) => { out.steps.push({ at: new Date().toISOString(), name, ...data }); console.log(new Date().toISOString().slice(11, 19), name, JSON.stringify(data).slice(0, 1800)); writeJson("/tmp/v592out/v19-taxonomy-states.json", out); };
const P = "__qa_test_plan_592_v19";
const BIG = { name: `${P} Big`, slug: "qatestplan592v19-big" };
const SUB = { name: `${P} Big Sub`, slug: "qatestplan592v19-big-sub" };
const LEAF = { name: `${P} Big Leaf`, slug: "qatestplan592v19-big-leaf" };
const EMPTY = { name: `${P} Empty`, slug: "qatestplan592v19-empty" };
const CHILD = { name: `${P} Empty Child`, slug: "qatestplan592v19-empty-child" };
const TAG = "qa592v19-alpha";

// ---- pre-start fixtures (SQL; the server boots with them so no stale cache) ----
const [big] = await q(`INSERT INTO categories (name, slug) VALUES ($1,$2) RETURNING id`, [BIG.name, BIG.slug]);
const [sub] = await q(`INSERT INTO subcategories (name, slug, category_id) VALUES ($1,$2,$3) RETURNING id`, [SUB.name, SUB.slug, big.id]);
const [leaf] = await q(`INSERT INTO sub_subcategories (name, slug, subcategory_id) VALUES ($1,$2,$3) RETURNING id`, [LEAF.name, LEAF.slug, sub.id]);
await q(`INSERT INTO resources (title, url, description, category, subcategory, status, metadata)
  SELECT $1 || ' item ' || lpad(g::text,3,'0'), 'https://example.com/qa-592-v19/' || g, 'Owned QA pagination fixture.', $2,
         CASE WHEN g <= 20 THEN $3 ELSE NULL END, 'approved',
         CASE WHEN g <= 30 THEN jsonb_build_object('tags', jsonb_build_array($4::text)) ELSE '{}'::jsonb END
  FROM generate_series(1,197) g`, [P, BIG.name, SUB.name, TAG]);
const [feat] = await q(`INSERT INTO resources (title, url, description, category, subcategory, sub_subcategory, status, metadata)
  VALUES ($1,'https://example.com/qa-592-v19/featured','Owned QA featured deep-tagged fixture.',$2,$3,$4,'approved',$5::jsonb) RETURNING id`,
  [`${P} Featured Deep`, BIG.name, SUB.name, LEAF.name, JSON.stringify({ featured: true, tags: [TAG, "qa592v19-featured"] })]);
const sqlCounts = (await q(`SELECT (SELECT count(*) FROM resources WHERE status='approved' AND category=$1)::int big_total,
  (SELECT count(*) FROM resources WHERE status='approved' AND metadata->'tags' ? $2)::int tag_total,
  (SELECT count(*) FROM categories)::int categories_before_api`, [BIG.name, TAG]))[0];
step("fixtures", { big: big.id, sub: sub.id, leaf: leaf.id, featuredId: feat.id, sqlCounts });

const fd = fs.openSync("/tmp/scrC-v19.log", "a");
const cProc = spawn("node_modules/.bin/tsx", ["server/index.ts"], { cwd: "/home/runner/workspace", detached: true, stdio: ["ignore", fd, fd],
  env: { ...process.env, PORT: "5165", DISABLE_BACKGROUND_JOBS: "1", SEED_SOURCE_URL: "http://127.0.0.1:5198/unused.json" } });
const browser = await launch();
const created = [];
let jwt; let ADMREF = null;
const cards = (page) => page.locator('[data-testid^="link-resource-title-"]:visible').count();
async function settle(page, ms = 2500) { await page.waitForLoadState("domcontentloaded"); await sleep(ms); }
try {
  const t0 = Date.now();
  while (Date.now() - t0 < 120_000) { try { if ((await fetch(`${BASE}/api/health`)).ok) break; } catch {} await sleep(1000); }
  const ADM = await mintUser("v19admin"); ADMREF = ADM; await ensureLocal(ADM);
  await q(`UPDATE users SET role='admin' WHERE id=$1`, [ADM.bridgeId]);
  jwt = await token(ADM);

  // ---- 1. empty category + child via admin API; extra categories to cross admin 10/page ----
  const ce = await call("POST", "/api/admin/categories", { jwt, body: EMPTY });
  const cc = await call("POST", "/api/admin/subcategories", { jwt, body: { ...CHILD, categoryId: ce.json?.id } });
  created.push(["subcategories", cc.json?.id], ["categories", ce.json?.id]);
  const extras = [];
  for (let i = 1; i <= 8; i++) {
    const r = await call("POST", "/api/admin/categories", { jwt, body: { name: `${P} Extra ${String(i).padStart(2, "0")}`, slug: `qatestplan592v19-extra-${i}` } });
    extras.push(r.status); created.push(["categories", r.json?.id]);
  }
  const catsNow = (await q(`SELECT count(*)::int n FROM categories`))[0].n;
  step("admin-api-create", { empty: { status: ce.status, id: ce.json?.id }, child: { status: cc.status, id: cc.json?.id }, extras, categoriesTotal: catsNow });

  // ---- 2. empty category / child at 375 / 768 / 1440 ----
  const emptyRes = {};
  for (const [label, vp] of [["1440", VPS.desktop], ["768", VPS[768]], ["375", VPS[375]]]) {
    const { page, context } = await newPage(browser, vp);
    await page.goto(`${BASE}/category/${EMPTY.slug}`); await settle(page, 4000);
    const main = page.locator("main").first();
    const r = {
      http: (await page.request.get(`${BASE}/category/${EMPTY.slug}`)).status(),
      heading: (await page.locator("h1").first().innerText().catch(() => null)),
      resultsHeading: await page.locator('[data-testid="text-results-count"]').innerText().catch(() => null),
      dataTotal: await page.locator('[data-testid="text-results-count"]').getAttribute("data-total").catch(() => null),
      cards: await cards(page),
      tagChips: await main.locator('a[href^="/tag/"], [data-testid^="tag-link-"], [data-testid^="badge-tag"]').count(),
      tagFilter: await page.locator('[data-testid*="tag-filter"], [aria-label*="Filter by tag" i]').count(),
      recovery: (await main.locator('[data-testid="empty-resources"], [data-testid="link-broaden-taxonomy-scope"]').allInnerTexts()).join(" / ").replace(/\s+/g, " ").slice(0, 300),
      mainText: (await main.innerText()).replace(/\s+/g, " ").slice(0, 700),
      overflowX: await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
      errors: page.__errors,
    };
    await shot(page, `V19-empty-category-${label}`);
    if (label === "1440") {
      const broaden = page.locator('[data-testid="link-broaden-taxonomy-scope"]');
      if (await broaden.count()) { r.broadenHref = await broaden.getAttribute("href"); }
      await page.goto(`${BASE}/subcategory/${CHILD.slug}`); await settle(page, 4000);
      r.child = { heading: await page.locator("h1").first().innerText().catch(() => null), cards: await cards(page),
        text: (await page.locator("main").first().innerText()).replace(/\s+/g, " ").slice(0, 500) };
      await shot(page, "V19-empty-subcategory-1440");
    }
    emptyRes[label] = r; await context.close();
  }
  step("empty-taxonomy", emptyRes);

  // ---- 3. high page count: 198 approved in Big → 9 pages of 24 ----
  {
    const { page, context } = await newPage(browser, VPS.desktop);
    await page.goto(`${BASE}/category/${BIG.slug}`); await settle(page, 5000);
    const r = { results: await page.locator('[data-testid="text-results-count"]').innerText(), page1Cards: await cards(page),
      indicator: await page.locator('[data-testid="text-page-indicator"]').innerText().catch(() => null),
      pageLinks: await page.locator('[data-testid^="link-page-"]').evaluateAll((els) => els.map((e) => e.textContent.trim())),
      jumpInput: await page.locator('[data-testid="input-page-jump"]').count() };
    await shot(page, "V19-big-page1-paginator-1440", page.locator(".taxonomy-pagination"));
    await page.locator('[data-testid="link-page-9"]').click(); await sleep(2500);
    r.last = { url: page.url(), cards: await cards(page), indicator: await page.locator('[data-testid="text-page-indicator"]').innerText().catch(() => null),
      nextDisabled: await page.locator('[data-testid="button-next-page"]').evaluate((e) => e.getAttribute("aria-disabled") ?? String(e.disabled ?? e.hasAttribute("disabled"))).catch(() => "absent") };
    await shot(page, "V19-big-last-page-1440");
    await page.locator('[data-testid="input-page-jump"]').fill("5"); await page.locator('[data-testid="input-page-jump"]').press("Enter"); await sleep(2500);
    r.jump5 = { url: page.url(), cards: await cards(page), indicator: await page.locator('[data-testid="text-page-indicator"]').innerText().catch(() => null),
      firstTitle: await page.locator('[data-testid^="link-resource-title-"]:visible').first().innerText() };
    await page.locator('[data-testid="link-page-1"]').click(); await sleep(2500);
    r.first = { url: page.url(), prevDisabled: await page.locator('[data-testid="button-prev-page"]').evaluate((e) => e.getAttribute("aria-disabled") ?? String(e.hasAttribute("disabled"))).catch(() => "absent") };
    await page.goBack(); await sleep(2500);
    r.back1 = { url: page.url(), indicator: await page.locator('[data-testid="text-page-indicator"]').innerText().catch(() => null) };
    await page.goBack(); await sleep(2500);
    r.back2 = { url: page.url(), indicator: await page.locator('[data-testid="text-page-indicator"]').innerText().catch(() => null) };
    await page.goForward(); await sleep(2500);
    r.forward = { url: page.url(), indicator: await page.locator('[data-testid="text-page-indicator"]').innerText().catch(() => null) };
    await page.goto(`${BASE}/category/${BIG.slug}?page=99`); await settle(page, 5000);
    r.outOfRange = { url: page.url(), notice: await page.locator('[data-testid="notice-page-adjusted"]').innerText().catch(() => null), cards: await cards(page),
      indicator: await page.locator('[data-testid="text-page-indicator"]').innerText().catch(() => null) };
    await shot(page, "V19-big-out-of-range-1440");
    await page.locator('[data-testid="input-page-jump"]').fill("12"); await page.locator('[data-testid="input-page-jump"]').press("Enter"); await sleep(1200);
    r.badJump = { url: page.url(), inputValue: await page.locator('[data-testid="input-page-jump"]').inputValue().catch(() => null),
      ariaInvalid: await page.locator('[data-testid="input-page-jump"]').getAttribute("aria-invalid").catch(() => null),
      error: await page.locator('[data-testid="text-page-jump-error"]').innerText().catch(() => null) };
    r.errors = page.__errors;
    step("pagination-1440", r); await context.close();
    for (const [label, vp] of [["768", VPS[768]], ["375", VPS[375]]]) {
      const { page: p2, context: c2 } = await newPage(browser, vp);
      await p2.goto(`${BASE}/category/${BIG.slug}?page=4`); await settle(p2, 5000);
      const pg = p2.locator(".taxonomy-pagination");
      await pg.scrollIntoViewIfNeeded();
      const rr = { cards: await cards(p2), indicator: await p2.locator('[data-testid="text-page-indicator"]').innerText().catch(() => null),
        overflowX: await p2.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
        pagerBox: await pg.boundingBox() };
      await p2.locator('[data-testid="button-next-page"]').click(); await sleep(2500);
      rr.afterNext = { url: p2.url(), indicator: await p2.locator('[data-testid="text-page-indicator"]').innerText().catch(() => null) };
      await shot(p2, `V19-big-paginator-${label}`, p2.locator(".taxonomy-pagination"));
      step(`pagination-${label}`, rr); await c2.close();
    }
  }

  // ---- 4. admin categories cross 10/page ----
  {
    const { page, context } = await newPage(browser, VPS.desktop);
    await signIn(page, ADM, "/admin/categories");
    await page.goto(`${BASE}/admin/categories`); await settle(page, 5000);
    const pager = page.locator('[data-testid="pagination-categories"]');
    const rows = () => page.locator("table tbody tr").count();
    const r = { pagerPresent: await pager.count(), page1Rows: await rows(), pagerText: (await pager.innerText().catch(() => "")).replace(/\s+/g, " ") };
    await shot(page, "V19-admin-categories-page1-1440");
    const p2link = pager.locator('[data-testid="link-page-2"]');
    if (await p2link.count()) await p2link.click(); else await pager.locator('[data-testid="button-next-page"]').click();
    await sleep(1500);
    r.page2Rows = await rows();
    r.page2Names = (await page.locator("table tbody tr").allInnerTexts()).map((t) => t.split("\n")[0].slice(0, 60));
    r.pagerText2 = (await pager.innerText().catch(() => "")).replace(/\s+/g, " ");
    await shot(page, "V19-admin-categories-page2-1440");
    // search narrows across pages
    const search = page.locator('input[type="search"], [data-testid^="input-search"]').first();
    if (await search.isVisible().catch(() => false)) { await search.fill("Extra 0"); await sleep(1200); r.searchText = await page.locator('[data-testid="text-search-results"]').innerText().catch(() => null); r.searchRows = await rows(); }
    step("admin-pagination", r); await context.close();
  }

  // ---- 5. curated home, Ctrl+K, resource detail ----
  {
    const { page, context } = await newPage(browser, VPS.desktop);
    await page.goto(`${BASE}/?layout=curated`); await settle(page, 5000);
    const card = page.locator(`[data-testid="card-home-resource-${feat.id}"]`);
    const r = { homeApi: await page.evaluate(async () => { const j = await (await fetch("/api/home")).json(); return { stats: j.stats ?? j.counts ?? null, featuredIds: (j.featured ?? []).map((x) => x.id) }; }),
      featuredCard: await card.count(), cardText: (await card.innerText().catch(() => "")).replace(/\s+/g, " "),
      cardLinks: await card.locator("a").evaluateAll((els) => els.map((a) => a.getAttribute("href"))),
      emptyNotice: await page.locator('[data-testid="home-featured-empty"]').count() };
    await card.scrollIntoViewIfNeeded().catch(() => {});
    await shot(page, "V19-home-curated-featured-1440", page.locator(".home-curated-featured"));
    // Ctrl+K palette featured jump
    await page.keyboard.press("Control+k"); await sleep(1500);
    const pf = page.locator(`[data-testid="palette-featured-${feat.id}"]`);
    r.paletteFeatured = await pf.count(); r.paletteText = await pf.innerText().catch(() => null);
    await shot(page, "V19-palette-featured-1440");
    await pf.click(); await sleep(3500);
    r.paletteDest = page.url();
    // resource detail chips (three levels) and tag links
    r.detail = {
      title: await page.locator('[data-testid="text-resource-title"]').innerText().catch(() => null),
      featuredBadge: await page.locator('[data-testid="badge-featured"]').count(),
      chips: await page.locator('[data-testid="badge-category"], [data-testid="badge-subcategory"], [data-testid="badge-sub-subcategory"]').evaluateAll((els) => els.map((e) => ({ t: e.getAttribute("data-testid"), href: e.getAttribute("href"), text: e.textContent.trim() }))),
      tags: await page.locator('[data-testid^="tag-link-"]').evaluateAll((els) => els.map((e) => ({ text: e.textContent.trim(), href: e.closest("a")?.getAttribute("href") }))),
    };
    await shot(page, "V19-resource-detail-1440");
    const visits = [];
    for (const t of ["badge-sub-subcategory", "badge-subcategory", "badge-category"]) {
      await page.goto(`${BASE}/resource/${feat.id}`); await settle(page, 3500);
      await page.locator(`[data-testid="${t}"]`).first().click(); await sleep(3500);
      visits.push({ chip: t, url: page.url(), h1: await page.locator("h1").first().innerText().catch(() => null),
        crumbs: await page.locator('[data-testid="page-breadcrumb"] li').allInnerTexts().catch(() => []),
        hasFeatured: await page.locator(`[data-testid="link-resource-title-${feat.id}"]`).count() });
    }
    await shot(page, "V19-category-from-chip-1440");
    await page.goto(`${BASE}/resource/${feat.id}`); await settle(page, 3500);
    await page.locator('[data-testid="tag-link-0"]').click(); await sleep(4000);
    visits.push({ chip: "tag-link-0", url: page.url(), h1: await page.locator("h1").first().innerText().catch(() => null),
      mainExcerpt: (await page.locator("main").first().innerText()).replace(/\s+/g, " ").slice(0, 300) });
    await shot(page, "V19-tag-landing-1440");
    r.visits = visits; r.errors = page.__errors;
    step("featured-deep-tagged", r); await context.close();
    // tablet: header breadcrumb ellipsis exposes all three ancestors
    const { page: t, context: tc } = await newPage(browser, { width: 1024, height: 900 });
    await t.goto(`${BASE}/resource/${feat.id}`); await settle(t, 5000);
    const ell = t.locator('[data-testid="button-breadcrumb-ellipsis"]');
    const tr = { ellipsis: await ell.count() };
    if (tr.ellipsis) { await ell.click(); await sleep(800); tr.ancestors = await t.locator('[role="menuitem"] a, a[role="menuitem"]').evaluateAll((els) => els.map((a) => ({ text: a.textContent.trim(), href: a.getAttribute("href") }))); await shot(t, "V19-resource-breadcrumb-ancestors-1024"); }
    step("tablet-breadcrumb", tr); await tc.close();
  }
} catch (e) { out.error = String(e.stack ?? e); console.error(e); }
finally {
  await browser.close().catch(() => {});
  // ---- cleanup: resources by SQL, taxonomy via admin API (invalidates caches), then fresh-query disappearance ----
  const ids = (await q(`SELECT id FROM resources WHERE title LIKE $1`, [`${P}%`])).map((r) => r.id);
  await q(`DELETE FROM resource_audit_log WHERE resource_id = ANY($1::int[])`, [ids]);
  await q(`DELETE FROM resources WHERE id = ANY($1::int[])`, [ids]);
  const del = [];
  try {
    if (ADMREF) { jwt = await token(ADMREF);
      const leafRow = (await q(`SELECT id FROM sub_subcategories WHERE slug=$1`, [LEAF.slug]))[0];
      const subRow = (await q(`SELECT id FROM subcategories WHERE slug=$1`, [SUB.slug]))[0];
      const bigRow = (await q(`SELECT id FROM categories WHERE slug=$1`, [BIG.slug]))[0];
      for (const [kind, id] of [["sub-subcategories", leafRow?.id], ["subcategories", subRow?.id], ...created, ["categories", bigRow?.id]]) {
        if (!id) continue; const r = await call("DELETE", `/api/admin/${kind}/${id}`, { jwt }); del.push(`${kind}/${id}:${r.status}`);
      }
      const home = await call("GET", "/api/home", { headers: { "Cache-Control": "no-cache" } });
      const cats = await call("GET", "/api/categories", { headers: { "Cache-Control": "no-cache" } });
      const pageStatus = (await fetch(`${BASE}/category/${BIG.slug}`)).status;
      const tagStatus = (await fetch(`${BASE}/tag/${TAG}`)).status;
      step("fresh-after-delete", { del, featuredIds: (home.json?.featured ?? []).map((x) => x.id), homeStats: home.json?.stats ?? null,
        v19CategoriesInApi: JSON.stringify(cats.json ?? "").split("qatestplan592v19").length - 1, bigCategoryPageStatus: pageStatus, tagPageStatus: tagStatus });
    }
  } catch (e) { step("cleanup-api-error", { e: String(e) }); }
  await teardownAll();
  try { process.kill(-cProc.pid, "SIGTERM"); } catch {} await sleep(2500); try { process.kill(-cProc.pid, "SIGKILL"); } catch {}
  // SQL safety net for anything the API refused
  await q(`DELETE FROM sub_subcategories WHERE name LIKE $1`, [`${P}%`]);
  await q(`DELETE FROM subcategories WHERE name LIKE $1`, [`${P}%`]);
  await q(`DELETE FROM categories WHERE name LIKE $1`, [`${P}%`]);
  const residue = (await q(`SELECT (SELECT count(*) FROM users WHERE id LIKE '\\_\\_qa\\_test\\_plan\\_592\\_%')::int qa_users,
    (SELECT count(*) FROM resources WHERE title LIKE $1)::int resources, (SELECT count(*) FROM categories WHERE name LIKE $1)::int categories,
    (SELECT count(*) FROM subcategories WHERE name LIKE $1)::int subcategories, (SELECT count(*) FROM sub_subcategories WHERE name LIKE $1)::int leaves`, [`${P}%`]))[0];
  step("cleanup", { residue });
  process.exit(0);
}

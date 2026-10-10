// V19 part B — the resource breadcrumb ancestor disclosure at 1024px. It lives inside the visually-hidden shell
// breadcrumb (AT-only, tabIndex -1 by design), so it is driven the way assistive tech does: focus + Enter.
import fs from "node:fs";
import { spawn } from "node:child_process";
import { BASE, q, writeJson, sleep } from "./lib.mjs";
import { launch, newPage, shot } from "./browser-lib.mjs";
if (!/awesome_scratch_592_seed/.test(process.env.DATABASE_URL ?? "")) throw new Error("refusing: not the seed scratch DB");
const P = "__qa_test_plan_592_v19b";
const out = { started: new Date().toISOString(), steps: [] };
const step = (name, data) => { out.steps.push({ name, ...data }); console.log(name, JSON.stringify(data).slice(0, 2500)); writeJson("/tmp/v592out/v19b-tablet-breadcrumb.json", out); };
const [c] = await q(`INSERT INTO categories (name, slug) VALUES ($1,'qatestplan592v19b-cat') RETURNING id`, [`${P} Cat`]);
const [s] = await q(`INSERT INTO subcategories (name, slug, category_id) VALUES ($1,'qatestplan592v19b-sub',$2) RETURNING id`, [`${P} Sub`, c.id]);
await q(`INSERT INTO sub_subcategories (name, slug, subcategory_id) VALUES ($1,'qatestplan592v19b-leaf',$2)`, [`${P} Leaf`, s.id]);
const [r] = await q(`INSERT INTO resources (title,url,description,category,subcategory,sub_subcategory,status) VALUES ($1,'https://example.com/qa-592-v19b','Owned QA deep fixture.',$2,$3,$4,'approved') RETURNING id`,
  [`${P} Deep`, `${P} Cat`, `${P} Sub`, `${P} Leaf`]);
const fd = fs.openSync("/tmp/scrC-v19b.log", "a");
const cProc = spawn("node_modules/.bin/tsx", ["server/index.ts"], { cwd: "/home/runner/workspace", detached: true, stdio: ["ignore", fd, fd],
  env: { ...process.env, PORT: "5165", DISABLE_BACKGROUND_JOBS: "1", SEED_SOURCE_URL: "http://127.0.0.1:5198/unused.json" } });
const browser = await launch();
try {
  const t0 = Date.now();
  while (Date.now() - t0 < 120_000) { try { if ((await fetch(`${BASE}/api/health`)).ok) break; } catch {} await sleep(1000); }
  for (const w of [1024, 1440]) {
    const { page, context } = await newPage(browser, { width: w, height: 900 });
    await page.goto(`${BASE}/resource/${r.id}`); await sleep(6000);
    const ell = page.locator('[data-testid="button-breadcrumb-ellipsis"]');
    const res = { width: w, ellipsisCount: await ell.count(), tabIndex: await ell.first().getAttribute("tabindex").catch(() => null),
      inSrOnly: await ell.first().evaluate((e) => Boolean(e.closest(".sr-only"))).catch(() => null),
      srCrumbs: await page.locator('[data-testid="page-breadcrumb"] li').allInnerTexts().catch(() => []),
      visibleChips: await page.locator('[data-testid^="badge-"][href]').evaluateAll((els) => els.map((e) => `${e.textContent.trim()} -> ${e.getAttribute("href")}`)) };
    if (res.ellipsisCount) {
      await ell.first().focus(); await page.keyboard.press("Enter"); await sleep(900);
      res.menuItems = await page.locator('[role="menuitem"]').evaluateAll((els) => els.map((a) => `${a.textContent.trim()} -> ${a.getAttribute("href")}`));
      await shot(page, `V19b-breadcrumb-disclosure-${w}`);
      await page.keyboard.press("ArrowDown"); await page.keyboard.press("Enter"); await sleep(3500);
      res.afterActivate = { url: page.url(), h1: await page.locator("h1").first().innerText().catch(() => null) };
    } else await shot(page, `V19b-breadcrumb-disclosure-${w}`);
    res.errors = page.__errors;
    step(`breadcrumb-${w}`, res); await context.close();
  }
} catch (e) { out.error = String(e.stack ?? e); console.error(e); }
finally {
  await browser.close().catch(() => {});
  try { process.kill(-cProc.pid, "SIGTERM"); } catch {} await sleep(2500); try { process.kill(-cProc.pid, "SIGKILL"); } catch {}
  await q(`DELETE FROM resource_audit_log WHERE resource_id=$1`, [r.id]);
  await q(`DELETE FROM resources WHERE id=$1`, [r.id]);
  await q(`DELETE FROM sub_subcategories WHERE name LIKE $1`, [`${P}%`]);
  await q(`DELETE FROM subcategories WHERE id=$1`, [s.id]);
  await q(`DELETE FROM categories WHERE id=$1`, [c.id]);
  const residue = (await q(`SELECT (SELECT count(*) FROM resources WHERE title LIKE $1)::int resources, (SELECT count(*) FROM categories WHERE name LIKE $1)::int categories,
    (SELECT count(*) FROM subcategories WHERE name LIKE $1)::int subs, (SELECT count(*) FROM sub_subcategories WHERE name LIKE $1)::int leaves`, [`${P}%`]))[0];
  step("cleanup", { residue }); process.exit(0);
}

// D02 browser half: admin dialogs keep entered values after a 409 conflict.
import { api, sql, expect, residue, flush, P, RUN, BASE } from "./lib.mjs";
import { openAdminBrowser, shot } from "./browser.mjs";
const I = "D02-ui";
const cats = [];
let b;
try {
  const a = (await api(I, "fixture category A", "POST", "/api/admin/categories", { name: `${P}d02ui_a_${RUN}`, slug: `qa-583-d02ui-a-${RUN}` })).json;
  const bb = (await api(I, "fixture category B", "POST", "/api/admin/categories", { name: `${P}d02ui_b_${RUN}`, slug: `qa-583-d02ui-b-${RUN}` })).json;
  cats.push(a.id, bb.id);
  const before = sql(I, "BEFORE rows", `select string_agg(id||':'||name||':'||slug, ' | ' order by id) from categories where id in (${a.id},${bb.id})`);

  b = await openAdminBrowser();
  const { page } = b;
  await page.goto(`${BASE}/admin#categories`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("content-categories").waitFor({ timeout: 60000 });
  if (!(await page.getByTestId("input-search-categories").isVisible())) await page.getByTestId("button-more-categories").click();
  await page.getByTestId("input-search-categories").fill(`d02ui_b_${RUN}`);
  await page.getByTestId(`button-edit-${bb.id}`).click({ timeout: 30000 });
  const dlg = page.getByTestId("dialog-edit-category");
  await dlg.waitFor();
  // Phase 1 — conflict with a row the page already loaded: client precheck, no request.
  let patchCount = 0, postCount = 0;
  page.on("request", (r) => { if (r.url().includes("/api/admin/categories")) { if (r.method() === "PATCH") patchCount++; if (r.method() === "POST") postCount++; } });
  await dlg.getByTestId("input-edit-slug").fill(a.slug);
  await dlg.getByTestId("button-confirm-edit").click();
  const banner = dlg.getByTestId("error-edit-form");
  await banner.waitFor({ timeout: 10000 });
  await page.waitForTimeout(500);
  const t1 = (await banner.textContent())?.trim();
  await shot(page, "D02", "edit-dialog-client-precheck");
  expect(I, patchCount === 0 && /already in use/i.test(t1 ?? ""), `known duplicate slug caught inline before any request: "${t1}" (PATCH sent: ${patchCount})`);
  expect(I, (await dlg.getByTestId("input-edit-slug").inputValue()) === a.slug && (await dlg.getByTestId("input-edit-name").inputValue()) === bb.name, "dialog keeps entered values after client precheck");

  // Phase 2 — another admin creates C after this page loaded its list, so only the SERVER knows.
  const c = (await api(I, "concurrent admin creates category C (unknown to the open page)", "POST", "/api/admin/categories", { name: `${P}d02ui_c_${RUN}`, slug: `qa-583-d02ui-c-${RUN}` })).json;
  cats.push(c.id);
  await dlg.getByTestId("input-edit-slug").fill(c.slug);
  const respP = page.waitForResponse((r) => r.url().includes(`/api/admin/categories/${bb.id}`) && r.request().method() === "PATCH");
  await dlg.getByTestId("button-confirm-edit").click();
  const resp = await respP;
  await page.waitForFunction((slug) => document.querySelector('[data-testid="error-edit-form"]')?.textContent?.includes("already exists"), c.slug, { timeout: 10000 });
  const t2 = (await banner.textContent())?.trim();
  const slugVal = await dlg.getByTestId("input-edit-slug").inputValue();
  const nameVal = await dlg.getByTestId("input-edit-name").inputValue();
  await shot(page, "D02", "edit-dialog-server-409");
  expect(I, resp.status() === 409, `edit dialog PATCH answered ${resp.status()} (${(await resp.text()).slice(0, 200)})`);
  expect(I, /already exists/i.test(t2 ?? ""), `inline banner shows the server conflict: "${t2}"`);
  expect(I, slugVal === c.slug && nameVal === bb.name, `dialog still open with entered values (slug="${slugVal}", name="${nameVal}")`);
  await dlg.getByTestId("button-cancel-edit").click();

  // Phase 3 — create dialog: C's display name (server-only knowledge) with a distinct slug.
  await page.getByTestId("button-create-category").click();
  const cdlg = page.getByTestId("dialog-create-category");
  await cdlg.waitFor();
  await cdlg.getByTestId("input-create-name").fill(c.name.toUpperCase());
  await cdlg.getByTestId("input-create-slug").fill(`qa-583-d02ui-dup-${RUN}`);
  const cRespP = page.waitForResponse((r) => r.url().endsWith("/api/admin/categories") && r.request().method() === "POST");
  await cdlg.getByTestId("button-confirm-create").click();
  const cResp = await cRespP;
  const cBanner = cdlg.getByTestId("error-create-form");
  await cBanner.waitFor({ timeout: 10000 });
  const cText = (await cBanner.textContent())?.trim();
  const cName = await cdlg.getByTestId("input-create-name").inputValue();
  const cSlug = await cdlg.getByTestId("input-create-slug").inputValue();
  await shot(page, "D02", "create-dialog-server-409");
  expect(I, cResp.status() === 409, `create dialog POST (case-variant duplicate name) answered ${cResp.status()} (${(await cResp.text()).slice(0, 200)})`);
  expect(I, /already exists/i.test(cText ?? ""), `create banner shows conflict: "${cText}"`);
  expect(I, cName === c.name.toUpperCase() && cSlug === `qa-583-d02ui-dup-${RUN}`, `create dialog keeps entered values (name="${cName}", slug="${cSlug}")`);
  await cdlg.getByTestId("button-cancel-create").click();

  const after = sql(I, "AFTER rows", `select string_agg(id||':'||name||':'||slug, ' | ' order by id) from categories where id in (${a.id},${bb.id})`);
  expect(I, before === after, "SQL rows unchanged by both rejected dialog submissions");
  expect(I, sql(I, "no duplicate created", `select count(*) from categories where slug = 'qa-583-d02ui-dup-${RUN}'`) === "0", "no category created by the rejected create");
  expect(I, b.consoleErrors.length === 0, `no page errors (${b.consoleErrors.join("; ").slice(0, 200)})`);
} catch (e) { console.error(e); process.exitCode = 1; if (b) await b.page.screenshot({ path: "/tmp/p583/shots/D02-failure.png" }).catch(() => {}); }
finally {
  await b?.browser.close();
  for (const id of cats) await api(I, "cleanup category", "DELETE", `/api/admin/categories/${id}`);
  console.log("RESIDUE", JSON.stringify(residue(I)));
  flush("/tmp/p583/out-ui");
}

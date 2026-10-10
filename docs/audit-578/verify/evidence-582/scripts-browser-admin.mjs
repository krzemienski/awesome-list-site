import fs from "node:fs";
import { loadState, q, pool, BASE } from "./lib.mjs";
import { signedInPage } from "./browser-lib.mjs";
const s = loadState();
const R = s.resources;
const E = s.edits;
const out = "/tmp/qa582/shots";
// Historical (pre-fix) analysis on the legacy row, as the old endpoint stored it.
await q(`UPDATE resource_edits SET claude_metadata=$2::jsonb, claude_analyzed_at=now() WHERE id=$1`,
  [E.legacy, JSON.stringify({ confidence: 1, suggestedTitle: "Forged by client", keyTopics: ["legacy", "unverified"] })]);
const { browser, page, requests, responses } = await signedInPage(s.users.admin, { width: 1440, height: 1000 });
const result = {};
const shot = async (name) => { await page.waitForTimeout(400); await page.screenshot({ path: `${out}/${name}.png` }); };
try {
  await page.goto(`${BASE}/admin/edits`, { waitUntil: "domcontentloaded" });
  const row = page.getByTestId(`row-pending-edit-${E.c01}`);
  await row.waitFor({ timeout: 60000 });
  await row.scrollIntoViewIfNeeded();
  await shot("admin-pending-edits-queue");
  result.legacyRowText = await page.getByTestId(`row-pending-edit-${E.legacy}`).innerText();
  result.c01RowText = await row.innerText();

  await page.getByTestId(`button-view-edit-${E.c01}`).click();
  const dlg = page.getByRole("dialog", { name: "Edit Suggestion Details" });
  await dlg.waitFor();
  result.c01DiffText = await dlg.innerText();
  await shot("C01-admin-diff-dialog");
  await dlg.getByRole("button", { name: "Close" }).last().click();
  await dlg.waitFor({ state: "hidden" });

  await page.getByTestId(`button-view-edit-${E.legacy}`).click();
  await dlg.waitFor();
  result.legacyDiffText = await dlg.innerText();
  await shot("C02-admin-legacy-unverified");
  await dlg.getByRole("button", { name: "Close" }).last().click();
  await dlg.waitFor({ state: "hidden" });

  for (const [key, name] of [["legacy", "C01-admin-legacy-refused"], ["c05Pending", "C05-admin-approve-409"]]) {
    await page.getByTestId(`button-approve-edit-${E[key]}`).click();
    await page.getByTestId("button-confirm-approve-edit").click();
    const err = page.getByTestId("error-approve-edit-dialog");
    await err.waitFor({ timeout: 20000 });
    result[`${key}ApproveError`] = await err.innerText();
    await shot(name);
    await page.getByTestId("button-cancel-approve-edit").click();
    await page.waitForTimeout(600);
  }

  const before = (await q(`SELECT proposed_changes FROM resource_edits WHERE id=$1`, [E.c01]))[0].proposed_changes;
  await page.getByTestId(`button-approve-edit-${E.c01}`).click();
  await page.getByTestId("button-confirm-approve-edit").click();
  await page.getByTestId(`row-pending-edit-${E.c01}`).waitFor({ state: "detached", timeout: 30000 });
  await shot("C01-admin-after-approve");
  const pub = await page.evaluate(async (id) => (await fetch(`/api/resources/${id}`)).json(), R.diff.id);
  result.c01Reviewed = before;
  result.c01Applied = { title: pub.title ?? pub.resource?.title, url: pub.url ?? pub.resource?.url };
  result.stateAfter = await q(`SELECT id, status FROM resource_edits WHERE id = ANY($1::int[]) ORDER BY id`, [[E.c01, E.legacy, E.c05Pending]]);
  result.resourcesAfter = await q(`SELECT id, title, url FROM resources WHERE id = ANY($1::int[]) ORDER BY id`, [[R.diff.id, R.legacy.id, R.url_a.id, R.url_b.id]]);
} catch (e) {
  result.error = String(e);
  await page.screenshot({ path: `${out}/admin-error.png` }).catch(() => {});
} finally {
  result.requests = requests; result.responses = responses;
  fs.writeFileSync("/tmp/qa582/browser-admin.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  await browser.close(); await pool.end();
}

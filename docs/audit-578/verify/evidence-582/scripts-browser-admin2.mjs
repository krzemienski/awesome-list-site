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
  await page.getByTestId(`row-pending-edit-${E.c01}`).waitFor({ timeout: 60000 });
  result.conflictTarget = await q(`SELECT e.proposed_data->>'url' url, (SELECT id FROM resources WHERE url=e.proposed_data->>'url') owner FROM resource_edits e WHERE e.id=$1`, [E.race23505b]);
  await page.getByTestId(`button-approve-edit-${E.race23505b}`).click();
  await page.getByTestId("button-confirm-approve-edit").click();
  const err = page.getByTestId("error-approve-edit-dialog");
  await err.waitFor({ timeout: 20000 });
  result.conflictApproveError = await err.innerText();
  await shot("C05-admin-approve-409");
  await page.getByTestId("button-cancel-approve-edit").click();
  await page.waitForTimeout(600);

  const before = (await q(`SELECT proposed_changes FROM resource_edits WHERE id=$1`, [E.c01]))[0].proposed_changes;
  await page.getByTestId(`button-approve-edit-${E.c01}`).click();
  await page.getByTestId("button-confirm-approve-edit").click();
  await page.getByTestId(`row-pending-edit-${E.c01}`).waitFor({ state: "detached", timeout: 30000 });
  await shot("C01-admin-after-approve");
  const pub = await page.evaluate(async (id) => (await fetch(`/api/resources/${id}`)).json(), R.diff.id);
  result.c01Reviewed = before;
  result.c01Applied = { title: pub.title ?? pub.resource?.title, url: pub.url ?? pub.resource?.url };
  result.stateAfter = await q(`SELECT id, status FROM resource_edits WHERE id = ANY($1::int[]) ORDER BY id`, [[E.c01, E.legacy, E.c05Pending, E.race23505b]]);
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

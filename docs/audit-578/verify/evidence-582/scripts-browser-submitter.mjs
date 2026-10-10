import fs from "node:fs";
import { loadState, saveState, q, pool, BASE } from "./lib.mjs";
import { signedInPage } from "./browser-lib.mjs";
const s = loadState();
const R = s.resources;
const out = "/tmp/qa582/shots";
fs.mkdirSync(out, { recursive: true });
const { browser, page, requests, responses } = await signedInPage(s.users.submitter);
const result = {};
try {
  await page.goto(`${BASE}/resource/${R.ui.id}`, { waitUntil: "domcontentloaded" });
  const me = await page.evaluate(async () => (await fetch("/api/auth/user")).json());
  result.signedInAs = me?.id;
  await page.getByTestId("button-suggest-edit").click();
  await page.getByTestId("input-edit-url").waitFor({ timeout: 30000 });
  result.analyzeButtonVisibleForUser = await page.getByTestId("button-analyze-ai").count();
  // C05: propose a URL another resource already owns.
  await page.getByTestId("input-edit-url").fill(R.url_a.url);
  await page.getByTestId("button-submit-edit").click();
  const err = page.locator('[role="dialog"] [id$="-form-item-message"], [role="dialog"] p.text-destructive').first();
  await err.waitFor({ timeout: 20000 });
  result.inlineUrlError = await err.innerText();
  result.urlInvalid = await page.getByTestId("input-edit-url").getAttribute("aria-invalid");
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/C05-dialog-inline-409.png` });
  result.editsAfterDup = (await q(`SELECT count(*)::int c FROM resource_edits WHERE resource_id=$1`, [R.ui.id]))[0].c;
  // Valid manual edit: restore URL, change the title.
  await page.getByTestId("input-edit-url").fill(R.ui.url);
  await page.getByTestId("input-edit-title").fill(`${R.ui.title} browser edit`);
  await page.getByTestId("button-submit-edit").click();
  await page.getByText("Edit Suggestion Submitted").first().waitFor({ timeout: 20000 });
  await page.screenshot({ path: `${out}/C02-dialog-submit-success.png` });
  const [row] = await q(`SELECT id, proposed_changes, proposed_data, claude_metadata, claude_analyzed_at FROM resource_edits WHERE resource_id=$1 ORDER BY id DESC LIMIT 1`, [R.ui.id]);
  result.storedEdit = row;
  s.edits.uiEdit = row?.id;
} catch (e) {
  result.error = String(e);
  await page.screenshot({ path: `${out}/submitter-error.png` }).catch(() => {});
} finally {
  result.requests = requests;
  result.responses = responses;
  fs.writeFileSync("/tmp/qa582/browser-submitter.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  saveState(s);
  await browser.close();
  await pool.end();
}

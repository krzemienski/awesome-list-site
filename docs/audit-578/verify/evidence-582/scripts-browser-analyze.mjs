import fs from "node:fs";
import { loadState, q, pool, api, BASE } from "./lib.mjs";
import { signedInPage } from "./browser-lib.mjs";
const s = loadState();
const R = s.resources;
const out = "/tmp/qa582/shots";
const URL_TO_ANALYZE = "https://github.com/FFmpeg/FFmpeg";
const result = { startedAt: new Date().toISOString() };
result.aiHealthBefore = (await api(s.users.admin, "GET", "/api/health/ai")).body;
const { browser, page, requests, responses } = await signedInPage(s.users.admin);
try {
  await page.goto(`${BASE}/resource/${R.ui.id}`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("button-suggest-edit").click();
  await page.getByTestId("input-edit-url").waitFor({ timeout: 30000 });
  await page.getByTestId("input-edit-url").fill(URL_TO_ANALYZE);
  await page.getByTestId("button-analyze-ai").click();
  await page.getByTestId("button-apply-suggestions").waitFor({ timeout: 150000 });
  result.formBefore = {
    title: await page.getByTestId("input-edit-title").inputValue(),
    description: await page.getByTestId("input-edit-description").inputValue(),
  };
  await page.getByTestId("button-apply-suggestions").click();
  await page.waitForTimeout(600);
  result.formAfterApply = {
    title: await page.getByTestId("input-edit-title").inputValue(),
    description: await page.getByTestId("input-edit-description").inputValue(),
  };
  await page.screenshot({ path: `${out}/C03-admin-analyze-apply.png` });
  await page.getByTestId("button-submit-edit").click();
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${out}/C03-admin-submit-after-apply.png` });
} catch (e) {
  result.error = String(e);
  await page.screenshot({ path: `${out}/analyze-error.png` }).catch(() => {});
} finally {
  result.requests = requests; result.responses = responses;
  await browser.close();
  result.aiHealthAfter = (await api(s.users.admin, "GET", "/api/health/ai")).body;
  result.latestEdit = (await q(`SELECT id, proposed_data, claude_metadata, claude_analyzed_at FROM resource_edits WHERE resource_id=$1 ORDER BY id DESC LIMIT 1`, [R.ui.id]))[0];
  fs.writeFileSync("/tmp/qa582/browser-analyze.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  await pool.end();
}

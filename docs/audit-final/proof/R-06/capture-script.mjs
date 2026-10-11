// R-06: member "saved learning profile" chips — is the available-time choice shown?
import { BASE, open, shot, revision, log } from "./lib.mjs";
import { makePersona } from "./persona.mjs";
const ID = "R-06", PHASE = process.env.PHASE || "after";
const m = await makePersona("member1");
const rows = [];
for (const [engine, width] of [["chromium", 1440], ["firefox", 375]]) {
  const s = await open(engine, { width, height: width === 375 ? 812 : 900, storageState: m.statePath });
  const p = s.page;
  // what the account actually saved
  await p.goto(BASE + "/settings#learning-preferences", { waitUntil: "load" }); await p.waitForTimeout(3000);
  const savedTime = await p.evaluate(() => document.querySelector('[data-testid="preferences-section-time"] [role="radio"][data-state="checked"]')?.closest("label")?.textContent?.trim() ?? null);
  await p.goto(BASE + "/recommendations", { waitUntil: "load" }); await p.waitForTimeout(6000);
  await p.getByRole("button", { name: "Decline" }).click().catch(() => {});
  const sum = p.getByTestId("active-preference-summary");
  await sum.scrollIntoViewIfNeeded().catch(() => {}); await p.evaluate(() => window.scrollBy(0, -160));
  const chips = await sum.locator("> *").allTextContents().catch(() => []);
  const row = { engine, width, rev: await revision(p), savedTime, chips, recPosts: s.net.filter((l) => /recommendations/.test(l)), console: s.consoleLog.filter((l) => !/development keys|_cfuvid/.test(l)) };
  rows.push(row);
  await shot(p, s, ID, `${PHASE}-chips-${engine}-${width}`, `member ${m.email}`, { extra: `saved time="${savedTime}" chips=${JSON.stringify(chips)}` });
  await s.browser.close();
}
log(ID, { phase: PHASE, rows }); console.log(JSON.stringify(rows, null, 1));

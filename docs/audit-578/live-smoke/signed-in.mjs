// Signed-in flows on prod using the owner admin account (user-approved),
// net-zero: every change is undone through the UI and the end state is
// compared with the baseline captured before any write.
import { chromium } from "@playwright/test";
import fs from "node:fs";
const BASE = process.env.BASE || "https://awesome.video";
const VW = Number(process.env.VW || 1440);
const OUT = "/tmp/a578/shots";
const STEP = process.env.STEP || "all";
const NOTE = "__qa_test_578_ live smoke note";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: VW, height: 900 } });
const host = new URL(BASE).hostname;
await ctx.addCookies([{ name: "analytics-consent", value: "denied", domain: host, path: "/" }]);
const login = await ctx.request.post(BASE + "/api/auth/admin-login", { headers: { Origin: BASE, "Content-Type": "application/json" }, data: { password: process.env.OWNER_PASSWORD } });
const log = (...a) => console.log(...a);
log("admin-login", login.status());
const api = async (p) => { const r = await ctx.request.get(BASE + p, { headers: { "Cache-Control": "no-cache" } }); return r.json(); };
const snapshot = async () => {
  const prefs = await api("/api/user/preferences");
  const bm = await api("/api/bookmarks");
  const fav = await api("/api/favorites");
  const prog = await api("/api/journeys/9/progress");
  return {
    theme: prefs.theme, homeLayout: prefs.homeLayout, preferences: prefs.preferences,
    bookmarks: bm.map((b) => `${b.id}:${b.notes ?? ""}`).sort(),
    favorites: fav.map((f) => f.id).sort((a, b) => a - b),
    journey9: { completedSteps: prog?.completedSteps ?? prog?.progress?.completedSteps, currentStepId: prog?.currentStepId ?? prog?.progress?.currentStepId, completedAt: prog?.completedAt ?? prog?.progress?.completedAt },
  };
};
const before = await snapshot();
log("BEFORE", JSON.stringify(before));
const writes = [];
const page = await ctx.newPage();
const consoleErrors = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200)); });
page.on("pageerror", (e) => consoleErrors.push("PAGEERROR " + String(e).slice(0, 200)));
page.on("response", (r) => { const u = new URL(r.url()); const m = r.request().method(); if (u.hostname === host && u.pathname.startsWith("/api/") && m !== "GET" && u.pathname !== "/api/send") writes.push(`${m} ${u.pathname} -> ${r.status()}`); });
const result = {};
const shot = (n) => page.screenshot({ path: `${OUT}/signed-${VW}-${n}.jpg`, type: "jpeg", quality: 60 });

// Pick a resource the account has neither bookmarked nor favorited.
const list = await api("/api/resources?limit=40");
const items = list.resources ?? list.items ?? list;
const bmIds = new Set(before.bookmarks.map((s) => Number(s.split(":")[0])));
const favIds = new Set(before.favorites);
const target = items.find((r) => !bmIds.has(r.id) && !favIds.has(r.id));
log("target resource", target.id, JSON.stringify(target.title));

if (STEP === "all" || STEP === "bookmark") {
  await page.goto(`${BASE}/resource/${target.id}`, { waitUntil: "domcontentloaded" });
  const bmBtn = page.getByTestId("button-bookmark");
  await bmBtn.waitFor({ timeout: 20000 });
  await page.waitForTimeout(1500);
  log("bookmark btn aria", await bmBtn.getAttribute("aria-label"), await bmBtn.getAttribute("aria-pressed"));
  await bmBtn.click();
  await page.getByTestId("textarea-bookmark-notes").fill(NOTE);
  await shot("bookmark-dialog");
  await page.getByTestId("button-save-with-notes").click();
  await page.getByTestId("text-bookmark-notes").waitFor({ timeout: 10000 });
  result.noteShown = (await page.getByTestId("text-bookmark-notes").innerText()).trim();
  await shot("bookmark-saved");
  const mid = await api("/api/bookmarks");
  result.bookmarkApi = mid.filter((b) => b.id === target.id).map((b) => ({ id: b.id, notes: b.notes }));
  log("note shown:", JSON.stringify(result.noteShown), "api:", JSON.stringify(result.bookmarkApi));
  // remove through the same button
  await page.waitForTimeout(800);
  await bmBtn.click();
  await page.waitForTimeout(2500);
  await shot("bookmark-removed");
  const after = await api("/api/bookmarks");
  result.bookmarkRemoved = !after.some((b) => b.id === target.id);
  result.noteGone = (await page.getByTestId("text-bookmark-notes").count()) === 0;
  log("bookmark removed:", result.bookmarkRemoved, "note gone:", result.noteGone);

  // favorite
  const favBtn = page.getByTestId("button-favorite");
  log("fav btn aria", await favBtn.getAttribute("aria-label"), await favBtn.getAttribute("aria-pressed"));
  await favBtn.click();
  await page.waitForTimeout(2500);
  result.favAdded = (await api("/api/favorites")).some((f) => f.id === target.id);
  result.favAriaOn = await favBtn.getAttribute("aria-pressed");
  await shot("favorite-on");
  await favBtn.click();
  await page.waitForTimeout(2500);
  result.favRemoved = !(await api("/api/favorites")).some((f) => f.id === target.id);
  result.favAriaOff = await favBtn.getAttribute("aria-pressed");
  log("fav added:", result.favAdded, result.favAriaOn, "removed:", result.favRemoved, result.favAriaOff);
}

if (STEP === "all" || STEP === "theme") {
  await page.goto(`${BASE}/settings/theme`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("system-option-brutalist").waitFor({ timeout: 20000 });
  await page.waitForTimeout(1500);
  result.systemBefore = await page.evaluate(() => document.documentElement.dataset.system);
  await page.getByTestId("system-option-brutalist").click();
  await page.waitForTimeout(3000);
  result.systemAfterClick = await page.evaluate(() => document.documentElement.dataset.system);
  result.prefsAfterClick = (await api("/api/user/preferences")).theme;
  await shot("theme-brutalist");
  log("theme before", result.systemBefore, "after click", result.systemAfterClick, "server", JSON.stringify(result.prefsAfterClick));
  // reload proves persistence
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  result.systemAfterReload = await page.evaluate(() => document.documentElement.dataset.system);
  // restore through the UI: original system, then original accent
  await page.getByTestId(`system-option-${before.theme.systemId}`).click();
  await page.waitForTimeout(2000);
  const acc = page.getByTestId(`accent-option-${before.theme.accentId}`);
  if (await acc.count()) { await acc.click(); await page.waitForTimeout(2500); }
  result.prefsRestored = (await api("/api/user/preferences")).theme;
  result.systemRestored = await page.evaluate(() => [document.documentElement.dataset.system, document.documentElement.dataset.accent]);
  await shot("theme-restored");
  log("after reload", result.systemAfterReload, "restored server", JSON.stringify(result.prefsRestored), "dom", JSON.stringify(result.systemRestored));
}

if (STEP === "all" || STEP === "journey") {
  await page.goto(`${BASE}/journey/9`, { waitUntil: "domcontentloaded" });
  const c1 = page.getByTestId("button-complete-step-1");
  await c1.waitFor({ timeout: 20000 });
  await page.waitForTimeout(1500);
  result.startVisible = await page.getByTestId("button-start-journey").count();
  const [putDone] = await Promise.all([page.waitForResponse((r) => r.url().includes("/api/journeys/9/progress") && r.request().method() === "PUT"), c1.click()]);
  result.putComplete = { status: putDone.status(), completedSteps: (await putDone.json()).completedSteps };
  await page.getByTestId("button-uncomplete-step-1").waitFor({ timeout: 10000 });
  await page.waitForTimeout(2000);
  await page.getByTestId("button-uncomplete-step-1").scrollIntoViewIfNeeded();
  const p1 = await api("/api/journeys/9/progress");
  result.journeyAfterComplete = p1?.completedSteps ?? p1?.progress?.completedSteps;
  result.progressText = (await page.locator("main").innerText()).match(/\d+\s*(of|\/)\s*\d+[^\n]{0,30}|\d+%[^\n]{0,20}/)?.[0] ?? null;
  await shot("journey-step-done");
  log("journey after complete", JSON.stringify(result.journeyAfterComplete), "progress", result.progressText);
  const [putUndo] = await Promise.all([page.waitForResponse((r) => r.url().includes("/api/journeys/9/progress") && r.request().method() === "PUT"), page.getByTestId("button-uncomplete-step-1").click()]);
  result.putUndo = { status: putUndo.status(), completedSteps: (await putUndo.json()).completedSteps };
  log("PUT complete", JSON.stringify(result.putComplete), "PUT undo", JSON.stringify(result.putUndo));
  await page.getByTestId("button-complete-step-1").waitFor({ timeout: 10000 });
  await page.getByTestId("button-complete-step-1").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  const p2 = await api("/api/journeys/9/progress");
  result.journeyAfterUndo = p2?.completedSteps ?? p2?.progress?.completedSteps;
  await shot("journey-step-undone");
  log("journey after undo", JSON.stringify(result.journeyAfterUndo));
}

const after = await snapshot();
log("AFTER ", JSON.stringify(after));
const diff = Object.keys(before).filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
log("NET-ZERO DIFF KEYS:", JSON.stringify(diff));
log("writes:", JSON.stringify(writes));
log("console errors:", JSON.stringify(consoleErrors));
fs.writeFileSync(`${OUT}/signed-${VW}.json`, JSON.stringify({ before, after, diff, target: { id: target.id, title: target.title }, result, writes, consoleErrors }, null, 2));
await ctx.request.post(BASE + "/api/auth/admin-logout", { headers: { Origin: BASE } });
await browser.close();

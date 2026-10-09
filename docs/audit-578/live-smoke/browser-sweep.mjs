// Anonymous browser sweep. Run from project root:
// BASE=https://awesome.video SYS=editorial VW=1440 OUT=/tmp/a578/shots node --input-type=module < /tmp/a578/browser-sweep.mjs
import { chromium } from "@playwright/test";
import fs from "node:fs";

const BASE = process.env.BASE || "https://awesome.video";
const SYS = process.env.SYS || "editorial";
const VW = Number(process.env.VW || 1440);
const VH = VW < 600 ? 844 : 900;
const OUT = process.env.OUT || "/tmp/a578/shots";
const ONLY = process.env.ONLY ? process.env.ONLY.split(",") : null;
fs.mkdirSync(OUT, { recursive: true });

const nav = await (await fetch(BASE + "/api/awesome-list/nav")).json();
const cat = nav.categories.find((c) => c.slug === "encoding-codecs") || nav.categories[0];
const sub = cat.subcategories.find((s) => s.count > 5 || s.resourceCount > 5) || cat.subcategories[0];
const list = await (await fetch(BASE + "/api/resources?limit=1")).json();
const rid = list.resources[0].id;
const journeys = await (await fetch(BASE + "/api/journeys")).json();
const jid = journeys[0].id;

const pages = [
  ["home", "/"],
  ["category", `/category/${cat.slug}`],
  ["subcategory", `/subcategory/${sub.slug}`],
  ["search", `/search?q=ffmpeg&category=${encodeURIComponent(cat.name)}&tags=ffmpeg`],
  ["resource", `/resource/${rid}`],
  ["journeys", "/journeys"],
  ["journey", `/journey/${jid}`],
  ["tag", "/tag/ffmpeg"],
  ["signin", "/sign-in"],
  ["notfound", "/this-page-does-not-exist-578"],
].filter(([k]) => !ONLY || ONLY.includes(k));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 });
const host = new URL(BASE).hostname;
await ctx.addCookies([{ name: "analytics-consent", value: "denied", domain: host, path: "/" }]);
await ctx.addInitScript(([sys]) => {
  try { localStorage.setItem("ds-system", sys); localStorage.removeItem("ds-accent"); } catch {}
}, [SYS]);

const results = [];
for (const [key, path] of pages) {
  const page = await ctx.newPage();
  const consoleErrors = [], pageErrors = [], badResponses = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 300)); });
  page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 300)));
  page.on("response", (r) => {
    const u = new URL(r.url());
    if (u.hostname === host && r.status() >= 400) badResponses.push(`${r.status()} ${u.pathname}${u.search}`);
  });
  const t0 = Date.now();
  let status = null, err = null;
  try {
    const resp = await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 30000 });
    status = resp?.status();
    await page.waitForSelector("h1", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(key === "signin" ? 4000 : 2500);
  } catch (e) { err = String(e).slice(0, 200); }
  const info = await page.evaluate(() => {
    const de = document.documentElement;
    const h1s = [...document.querySelectorAll("h1")].map((h) => h.textContent.trim().slice(0, 80));
    const cards = document.querySelectorAll('[data-testid^="card-resource"], [data-testid="resource-card"], article').length;
    const resultCount = document.querySelector('[data-testid="text-result-count"]')?.textContent?.trim() || null;
    const clerk = !!document.querySelector(".cl-rootBox, .cl-card, [class*='cl-signIn']");
    const overflowX = de.scrollWidth - de.clientWidth;
    const errorBoundary = /something went wrong|application error/i.test(document.body.innerText);
    const steps = document.querySelectorAll('[data-testid^="journey-step"], [data-testid^="step-"]').length;
    return { system: de.getAttribute("data-system"), accent: de.getAttribute("data-accent"), title: document.title, h1s, cards, resultCount, clerk, overflowX, errorBoundary, steps, textLen: document.body.innerText.length };
  }).catch((e) => ({ evalError: String(e) }));
  const shot = `${OUT}/${SYS}-${VW}-${key}.jpg`;
  await page.screenshot({ path: shot, type: "jpeg", quality: 60 }).catch(() => {});
  results.push({ key, path, status, ms: Date.now() - t0, err, ...info, consoleErrors, pageErrors, badResponses, shot });
  await page.close();
}
await browser.close();
const outFile = `${OUT}/${SYS}-${VW}.json`;
fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
for (const r of results) {
  console.log(`${r.key.padEnd(11)} ${r.status} ${String(r.ms).padStart(5)}ms sys=${r.system} h1=${JSON.stringify(r.h1s?.[0])} cards=${r.cards} rc=${r.resultCount} clerk=${r.clerk} ovx=${r.overflowX} eb=${r.errorBoundary} cerr=${r.consoleErrors.length} perr=${r.pageErrors.length} bad=${JSON.stringify(r.badResponses)}${r.err ? " ERR " + r.err : ""}`);
}

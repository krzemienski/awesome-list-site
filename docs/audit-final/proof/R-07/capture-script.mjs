// R-07: onboarding completion screen — do the action buttons fit their label at narrow widths?
// Capture-only: completes the wizard as a fresh member, then reads each button's box vs content
// in all five design systems, switched with the app's own window.applyDesignSystem(system, default accent).
import path from "node:path";
import fs from "node:fs";
import { BASE, OUT, open, shot, revision, log } from "./lib.mjs";
import { makePersona } from "./persona.mjs";

const ID = "R-07";
const PHASE = process.env.PHASE || "before";
const SYSTEMS = ["editorial", "terminal", "geist", "brutalist", "swiss"];
const cells = (process.env.CELLS || "chromium:375:touch,firefox:375,chromium:768").split(",");
const label = process.env.LABEL || `r07${PHASE[0]}`;
const out = [];

const measure = (p) => p.evaluate(() => {
  const card = document.querySelector("h1")?.closest(".account-page");
  return [...(card?.querySelectorAll(".btn") ?? [])].map((b) => {
    const r = b.getBoundingClientRect();
    const svg = b.querySelector("svg")?.getBoundingClientRect();
    return {
      text: b.textContent.trim(),
      boxW: Math.round(r.width), contentW: b.scrollWidth, clientW: b.clientWidth, h: Math.round(r.height),
      clipped: b.scrollWidth > b.clientWidth + 1 || (svg ? svg.left < r.left - 0.5 : false),
      iconLeftInside: svg ? Math.round(svg.left - r.left) : null,
    };
  });
});

for (const cell of cells) {
  const [engine, w, t] = cell.split(":");
  const width = Number(w), touch = t === "touch";
  const m = await makePersona(`${label}${engine[0]}${width}`);
  const s = await open(engine, { width, height: 812, touch, storageState: m.statePath });
  const p = s.page;
  await p.goto(BASE + "/onboarding", { waitUntil: "load" });
  await p.waitForTimeout(3000);
  const rev = await revision(p);
  // walk the wizard: step 1 radio, steps 2-4 one checkbox, step 5 radio, save
  for (let i = 1; i <= 5; i++) {
    const save = p.getByTestId("button-onboarding-save");
    if (await save.isVisible().catch(() => false)) break;
    const radio = p.locator('label:has([role="radio"])').first();
    const checked = await p.locator('[role="radio"][data-state="checked"], [role="checkbox"][data-state="checked"]').count();
    if (!checked) {
      if (await radio.count()) await radio.click();
      else await p.locator('[role="checkbox"]').first().click();
    }
    await p.getByTestId("button-onboarding-next").click();
    await p.waitForTimeout(700);
  }
  const resp = p.waitForResponse((x) => x.url().includes("/api/user/preferences") && x.request().method() === "PUT", { timeout: 15000 }).catch(() => null);
  await p.getByTestId("button-onboarding-save").click();
  const put = await resp;
  await p.waitForTimeout(1500);
  // dismiss consent so it does not cover the card
  await p.getByRole("button", { name: "Decline" }).click().catch(() => {});
  await p.waitForTimeout(300);
  const row = { engine, width, touch, rev, put: put ? put.status() : "none", url: p.url().replace(BASE, ""), systems: {} };
  for (const sys of SYSTEMS) {
    await p.evaluate((sys) => window.applyDesignSystem(sys, window.SYSTEM_DEFAULT_ACCENT[sys]), sys);
    await p.waitForTimeout(500);
    const btns = await measure(p);
    row.systems[sys] = btns;
    const cta = btns[0] ?? {};
    await shot(p, s, ID, `${PHASE}-complete-${sys}-${engine}-${width}`, `member ${m.email}`,
      { extra: `CTA box ${cta.boxW}px content ${cta.contentW}px icon@${cta.iconLeftInside} clipped=${cta.clipped} h=${cta.h}` });
  }
  row.console = s.consoleLog.filter((l) => !/development keys|_cfuvid/.test(l));
  row.net = s.net.filter((l) => !/^2\d\d/.test(l));
  out.push(row); log(ID, { phase: PHASE, ...row });
  await s.browser.close();
}
console.log(JSON.stringify(out.map((r) => ({ cell: `${r.engine}-${r.width}`, rev: r.rev, put: r.put, url: r.url, console: r.console, net: r.net,
  cta: Object.fromEntries(Object.entries(r.systems).map(([k, v]) => [k, v.map((b) => `${b.boxW}/${b.contentW} icon${b.iconLeftInside} ${b.clipped ? "CLIPPED" : "ok"} h${b.h}`)])) })), null, 1));

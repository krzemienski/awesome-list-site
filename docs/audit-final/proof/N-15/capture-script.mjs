import { BASE, open, shot, log } from "./lib.mjs";
const out = []; const bad = [];
const read = (p) => p.evaluate(() => { const h = document.querySelector("#taxonomy-results-heading"); const c = document.querySelector('[data-testid="chip-taxonomy-scope"]'); const r = h?.getBoundingClientRect();
  return { url: location.pathname + location.search, heading: h?.textContent, headingVisible: !!r && r.width > 2 && r.height > 2 && getComputedStyle(h.firstElementChild || h).position !== "absolute", chip: c?.textContent ?? null, chipLabel: c?.getAttribute("aria-label") ?? null, chipH: c ? Math.round(c.getBoundingClientRect().height) : null, badge: document.querySelector(".taxonomy-summary .chip.accent")?.textContent, tilePressed: document.querySelector('[data-testid="taxonomy-child-uncategorized"]')?.getAttribute("aria-pressed") ?? null, overflowX: document.documentElement.scrollWidth > innerWidth }; });
for (const [w, h] of [[1440, 900], [375, 812]]) {
  const s = await open("chromium", { width: w, height: h }); const p = s.page;
  p.on("response", (r) => { if (r.status() >= 400) bad.push(r.status() + " " + r.url()); });
  await p.goto(BASE + "/subcategory/mobile-web-players?filter=general", { waitUntil: "load" }); await p.waitForTimeout(2500);
  await p.getByRole("button", { name: "Decline" }).click().catch(() => {});
  for (const sys of ["editorial", "brutalist"]) {
    await p.evaluate((sys) => window.applyDesignSystem(sys, window.SYSTEM_DEFAULT_ACCENT[sys]), sys); await p.waitForTimeout(500);
    const r = await read(p); out.push({ w, sys, step: "sub filtered", ...r });
    await shot(p, s, "N-15", `after-sub-filtered-${sys}-chromium-${w}`, "guest", { extra: JSON.stringify(r) });
  }
  await p.evaluate(() => window.applyDesignSystem("editorial", window.SYSTEM_DEFAULT_ACCENT.editorial));
  await p.locator('[data-testid="chip-taxonomy-scope"]').click(); await p.waitForTimeout(1500);
  let r = await read(p); out.push({ w, step: "chip removed", focus: await p.evaluate(() => document.activeElement?.getAttribute("data-testid")), ...r });
  await shot(p, s, "N-15", `after-sub-chip-removed-chromium-${w}`, "guest", { extra: JSON.stringify(r) });
  await p.goBack(); await p.waitForTimeout(1500); out.push({ w, step: "back", ...(await read(p)) });
  await p.goForward(); await p.waitForTimeout(1500); out.push({ w, step: "forward", ...(await read(p)) });
  if (w === 1440) {
    await p.goto(BASE + "/category/players-clients?filter=general", { waitUntil: "load" }); await p.waitForTimeout(2500);
    r = await read(p); out.push({ w, step: "cat filtered", ...r });
    await shot(p, s, "N-15", `after-cat-filtered-chromium-${w}`, "guest", { extra: JSON.stringify(r) });
    await p.locator('[data-testid="chip-taxonomy-scope"]').click(); await p.waitForTimeout(1500);
    out.push({ w, step: "cat chip removed", ...(await read(p)) });
    await p.goto(BASE + "/subcategory/mobile-web-players", { waitUntil: "load" }); await p.waitForTimeout(2500);
    r = await read(p); out.push({ w, step: "sub unfiltered", ...r });
    await shot(p, s, "N-15", `after-sub-unfiltered-chromium-${w}`, "guest", { extra: JSON.stringify(r) });
  }
  out.push({ w, console: s.consoleLog });
  await s.browser.close();
}
console.log(JSON.stringify(out, null, 0).replace(/\},\{/g, "},\n{")); console.log("bad", bad);
log("N-15", { phase: "after", out, bad });

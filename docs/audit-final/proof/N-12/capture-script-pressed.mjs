// N-12: pressed state of the Uncategorized tile per system (pointer away and hovering), 1440 + 375.
import { BASE, open, shot, revision, log } from "./lib.mjs";
const ID = "N-12"; const rows = [];
for (const width of [1440, 375]) {
  const s = await open("chromium", { width, height: width === 375 ? 812 : 900 }); const p = s.page;
  await p.goto(BASE + "/category/players-clients?filter=general", { waitUntil: "load" }); await p.waitForTimeout(2500);
  await p.getByRole("button", { name: "Decline" }).click().catch(() => {});
  for (const sys of ["editorial", "terminal", "geist", "brutalist", "swiss"]) {
    await p.evaluate((sys) => window.applyDesignSystem(sys, window.SYSTEM_DEFAULT_ACCENT[sys]), sys); await p.waitForTimeout(600);
    const tile = p.getByTestId("taxonomy-child-uncategorized");
    await tile.scrollIntoViewIfNeeded(); await p.mouse.move(2, 2); await p.waitForTimeout(400);
    const read = () => tile.evaluate((t) => { const c = getComputedStyle(t), ch = getComputedStyle(t.querySelector(".chip")); const acc = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
      return { pressed: t.getAttribute("aria-pressed"), border: c.borderTopColor, chipBg: ch.backgroundColor, chipColor: ch.color, chipClass: t.querySelector(".chip").className, accent: acc }; });
    const away = await read();
    const sib = await p.locator(".taxonomy-child").first().evaluate((t) => getComputedStyle(t).borderTopColor);
    await shot(p, s, ID, `after-pressed-${sys}-chromium-${width}`, "guest", { extra: `away: border ${away.border} (unpressed sibling ${sib}) chip ${away.chipClass} bg ${away.chipBg} | accent ${away.accent}` });
    await tile.hover(); await p.waitForTimeout(500);
    const hover = await read();
    if (width === 1440) await shot(p, s, ID, `after-pressed-hover-${sys}-chromium-${width}`, "guest", { extra: `hover: border ${hover.border} chip bg ${hover.chipBg}` });
    rows.push({ width, sys, away, sib, hover: { border: hover.border, chipBg: hover.chipBg } });
  }
  rows.push({ width, rev: await revision(p), net: s.net.filter((l) => !/^2/.test(l)), console: s.consoleLog.filter((l) => !/development keys|_cfuvid/.test(l)) });
  await s.browser.close();
}
log(ID, { phase: "after-pressed", rows }); for (const r of rows) console.log(JSON.stringify(r));

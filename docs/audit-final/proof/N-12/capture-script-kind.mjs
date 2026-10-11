// N-12 follow-up: Forward state, and tile sums under a real kind filter (tiles hidden at 0 by design).
import { BASE, open, shot, revision, log } from "./lib.mjs";
const ID = "N-12", PHASE = "after";
const s = await open("chromium", { width: 1440, height: 900 }); const p = s.page; const steps = [];
const read = () => p.evaluate(() => {
  const tiles = [...document.querySelectorAll(".taxonomy-child")].map((t) => ({ n: Number(t.querySelector(".chip")?.textContent), button: t.tagName === "BUTTON", pressed: t.getAttribute("aria-pressed") }));
  return { sum: tiles.reduce((a, t) => a + t.n, 0), tiles: tiles.length, unc: tiles.find((t) => t.button)?.n ?? 0, pressed: tiles.find((t) => t.button)?.pressed ?? null,
    badge: document.querySelector(".taxonomy-summary .chip.accent")?.textContent, heading: [...document.querySelectorAll("h2,h3")].map((h) => h.textContent).find((t) => /^Resources \(/.test(t ?? "")), url: location.pathname + location.search };
});
await p.goto(BASE + "/category/players-clients", { waitUntil: "load" }); await p.waitForTimeout(2500);
await p.getByTestId("taxonomy-child-uncategorized").click(); await p.waitForTimeout(2000); steps.push({ step: "click", ...(await read()) });
await p.goBack(); await p.waitForTimeout(2000); steps.push({ step: "Back", ...(await read()) });
await p.goForward(); await p.waitForTimeout(2000); steps.push({ step: "Forward", ...(await read()) });
for (const kind of ["libraries", "tools", "events"]) {
  await p.goto(BASE + `/category/players-clients?kind=${kind}`, { waitUntil: "load" }); await p.waitForTimeout(2500);
  steps.push({ step: `?kind=${kind}`, ...(await read()) });
  if (kind === "libraries") { await p.locator(".taxonomy-children").scrollIntoViewIfNeeded(); await shot(p, s, ID, `after-tiles-kind-libraries-chromium-1440`, "guest", { extra: JSON.stringify(steps.at(-1)) }); }
}
const out = { rev: await revision(p), steps, net: s.net.filter((l) => !/^2/.test(l)), console: s.consoleLog.filter((l) => !/development keys|_cfuvid/.test(l)) };
log(ID, { phase: "after-kind", ...out }); console.log(JSON.stringify(out)); await s.browser.close();

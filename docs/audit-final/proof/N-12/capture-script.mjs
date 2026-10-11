// N-12: do the category page's tiles add up to the category total, and does the Uncategorized tile filter?
import { BASE, open, shot, revision, log } from "./lib.mjs";
const ID = "N-12", PHASE = process.env.PHASE || "after";
const cats = await (await fetch(BASE + "/api/categories")).json();
const list = (Array.isArray(cats) ? cats : cats.categories ?? []).map((c) => c.slug).filter(Boolean);
const s = await open("chromium", { width: 1440, height: 900 });
const p = s.page; const rows = [];
const read = () => p.evaluate(() => {
  const tiles = [...document.querySelectorAll(".taxonomy-child")].map((t) => ({ name: t.querySelector("span")?.textContent, n: Number(t.querySelector(".chip")?.textContent), button: t.tagName === "BUTTON", pressed: t.getAttribute("aria-pressed") }));
  const badge = document.querySelector(".taxonomy-summary .chip.accent")?.textContent;
  const heading = [...document.querySelectorAll("h2,h3")].map((h) => h.textContent).find((t) => /^Resources \(/.test(t ?? ""));
  return { tiles, sum: tiles.reduce((a, t) => a + t.n, 0), badge, heading, url: location.pathname + location.search };
});
for (const slug of list) {
  await p.goto(BASE + "/category/" + slug, { waitUntil: "load" }); await p.waitForTimeout(2500);
  const r = await read(); rows.push({ slug, ...r, tiles: undefined, uncategorized: r.tiles.find((t) => t.button)?.n ?? 0, nTiles: r.tiles.length });
  if (slug === "players-clients" || slug === "community-events") {
    await p.locator(".taxonomy-children").scrollIntoViewIfNeeded();
    await shot(p, s, ID, `${PHASE}-tiles-${slug}-chromium-1440`, "guest", { extra: `tiles sum ${r.sum} | badge "${r.badge}" | ${r.heading}` });
  }
}
// interact on Players & Clients
await p.goto(BASE + "/category/players-clients", { waitUntil: "load" }); await p.waitForTimeout(2500);
const steps = [];
await p.getByTestId("taxonomy-child-uncategorized").click(); await p.waitForTimeout(2500);
let r = await read(); steps.push({ step: "click Uncategorized", url: r.url, heading: r.heading, pressed: r.tiles.find((t) => t.button)?.pressed, focus: await p.evaluate(() => document.activeElement?.getAttribute("data-testid") || document.activeElement?.tagName), select: await p.getByTestId("select-subcategory-filter").inputValue().catch(() => "n/a") });
await shot(p, s, ID, `${PHASE}-uncategorized-on-chromium-1440`, "guest", { extra: JSON.stringify(steps.at(-1)) });
await p.reload({ waitUntil: "load" }); await p.waitForTimeout(2500);
r = await read(); steps.push({ step: "reload", url: r.url, heading: r.heading, pressed: r.tiles.find((t) => t.button)?.pressed });
await p.goBack(); await p.waitForTimeout(2000);
r = await read(); steps.push({ step: "Back", url: r.url, heading: r.heading, pressed: r.tiles.find((t) => t.button)?.pressed });
await p.goForward(); await p.waitForTimeout(2000);
await p.locator(".taxonomy-children").scrollIntoViewIfNeeded();
await p.getByTestId("taxonomy-child-uncategorized").focus(); await p.keyboard.press("Enter"); await p.waitForTimeout(2500);
r = await read(); steps.push({ step: "keyboard Enter on pressed tile", url: r.url, heading: r.heading, pressed: r.tiles.find((t) => t.button)?.pressed });
await shot(p, s, ID, `${PHASE}-uncategorized-off-chromium-1440`, "guest", { extra: JSON.stringify(steps.at(-1)) });
// kind filter
await p.goto(BASE + "/category/players-clients?kind=library", { waitUntil: "load" }); await p.waitForTimeout(2500);
r = await read(); steps.push({ step: "?kind=library", sum: r.sum, badge: r.badge, heading: r.heading, tiles: r.tiles.length, unc: r.tiles.find((t) => t.button)?.n ?? 0 });
const out = { rev: await revision(p), rows, steps, net: s.net.filter((l) => !/^2/.test(l)), console: s.consoleLog.filter((l) => !/development keys|_cfuvid/.test(l)) };
log(ID, { phase: PHASE, ...out }); console.log(JSON.stringify(out, null, 1)); await s.browser.close();

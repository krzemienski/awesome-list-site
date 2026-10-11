import { BASE, open } from "./lib.mjs";
const s = await open("chromium", { width: 1440, height: 900 }); const p = s.page;
for (const q of ["", "?filter=general"]) {
  await p.goto(BASE + "/subcategory/mobile-web-players" + q, { waitUntil: "load" }); await p.waitForTimeout(2500);
  console.log(q || "(all)", JSON.stringify(await p.evaluate(() => ({ h: document.querySelector("#taxonomy-results-heading")?.textContent, total: document.querySelector("#taxonomy-results-heading")?.dataset.total,
    cards: [...document.querySelectorAll("#taxonomy-results-heading ~ * h3, [data-testid^=card-resource] h3, article h3")].map(h => h.textContent).slice(0, 30), sel: document.querySelector('[data-testid="select-subcategory-filter"]')?.value }))));
}
await s.browser.close();

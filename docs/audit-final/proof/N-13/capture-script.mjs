// N-13: what a resource card shows when its stored thumbnail URL fails (real GitHub 429s, no interception).
import { BASE, open, shot, revision, log } from "./lib.mjs";
const ID = "N-13", PHASE = process.env.PHASE || "before";
const s = await open("chromium", { width: 1440, height: 900 });
const p = s.page;
const out = { rev: null, cards: [] };
for (const q of ["DRMreview", "CTA-WAVE Device Playback"]) {
  await p.goto(BASE + "/search?q=" + encodeURIComponent(q), { waitUntil: "load" });
  await p.waitForTimeout(4000);
  out.rev ??= await revision(p);
  const card = p.locator("[data-testid^='card-resource'], .resource-card").filter({ hasText: q.split(" ")[0] }).first();
  const n = await card.count();
  if (!n) { out.cards.push({ q, url: p.url(), found: false }); await shot(p, s, ID, `${PHASE}-search-${q.split(" ")[0]}`, "guest"); continue; }
  await card.scrollIntoViewIfNeeded(); await p.waitForTimeout(2500);
  const info = await card.evaluate((c) => {
    const f = c.querySelector(".resource-card__image-frame"); const i = f?.querySelector("img");
    return { frame: !!f, frameH: f ? Math.round(f.getBoundingClientRect().height) : 0, imgDisplay: i ? getComputedStyle(i).display : null,
      imgComplete: i?.complete, natural: i?.naturalWidth, blurhash: !!f?.querySelector(".resource-card__blurhash"), src: i?.getAttribute("src") };
  });
  out.cards.push({ q, url: p.url().replace(BASE, ""), ...info });
  await shot(p, s, ID, `${PHASE}-card-${q.split(" ")[0]}`, "guest", { extra: `frame=${info.frame} h=${info.frameH} img=${info.imgDisplay} natural=${info.natural} blurhash=${info.blurhash}` });
}
out.net = s.net; out.console = s.consoleLog.filter((l) => !/development keys|_cfuvid/.test(l));
log(ID, { phase: PHASE, ...out });
console.log(JSON.stringify(out, null, 1));
await s.browser.close();

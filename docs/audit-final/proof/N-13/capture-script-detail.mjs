import { BASE, open, shot, revision, log } from "./lib.mjs";
const ID = "N-13", PHASE = process.env.PHASE || "before";
const s = await open("chromium", { width: 1440, height: 900 });
const p = s.page; const out = { pages: [] };
for (const id of [188012, 188011]) {
  await p.goto(BASE + "/resource/" + id, { waitUntil: "load" });
  await p.waitForTimeout(4500);
  out.rev ??= await revision(p);
  const info = await p.evaluate(() => {
    const i = document.querySelector(".resource-detail-content img"); const f = i?.parentElement;
    return { frame: !!f, frameH: f ? Math.round(f.getBoundingClientRect().height) : 0, imgDisplay: i ? getComputedStyle(i).display : null, natural: i?.naturalWidth ?? null, h1: document.querySelector("h1")?.textContent };
  });
  out.pages.push({ id, ...info });
  await shot(p, s, ID, `${PHASE}-detail-${id}`, "guest", { extra: `frame=${info.frame} h=${info.frameH} img=${info.imgDisplay} natural=${info.natural}` });
}
out.net = s.net.filter((l) => !/^2/.test(l));
log(ID, { phase: PHASE + "-detail", ...out }); console.log(JSON.stringify(out, null, 1)); await s.browser.close();

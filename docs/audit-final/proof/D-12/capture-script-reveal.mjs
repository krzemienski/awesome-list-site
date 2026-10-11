import { BASE, open, shot, log } from "./lib.mjs";
const out = [];
for (const [w, h] of [[375, 812], [768, 1024]]) {
  const s = await open("chromium", { width: w, height: h }); const p = s.page;
  await p.goto(BASE + "/subcategory/video-codec-specifications", { waitUntil: "load" }); await p.waitForTimeout(2500);
  await p.getByRole("button", { name: "Decline" }).click().catch(() => {});
  await p.getByRole("button", { name: "Toggle sidebar" }).first().click(); await p.waitForTimeout(1200);
  const r = await p.evaluate(() => { const d = document.querySelector(".av-sidebar-drawer[data-state=open]"); const a = [...d.querySelectorAll("[data-active]")].pop(); const rr = a?.getBoundingClientRect(); const db = d.getBoundingClientRect();
    return { drawerScrollTop: Math.round(d.scrollTop), active: a?.textContent.trim().replace(/\s+/g, " ").slice(0, 40), activeTop: rr && Math.round(rr.top), activeBottom: rr && Math.round(rr.bottom), drawerBottom: Math.round(db.bottom), activeInView: !!rr && rr.top >= db.top && rr.bottom <= db.bottom }; });
  out.push({ w, ...r });
  await shot(p, s, "D-12", `after-drawer-deeplink-reveal-chromium-${w}`, "guest", { extra: JSON.stringify(r) });
  await s.browser.close();
}
console.log(JSON.stringify(out)); log("D-12", { phase: "after-reveal", out });

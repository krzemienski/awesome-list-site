import { BASE, open, shot, log } from "./lib.mjs";
const out = [];
const measure = (p) => p.evaluate(() => {
  const d = document.querySelector(".av-sidebar-drawer[data-state=open]"); if (!d) return { err: "no drawer" };
  const x = d.querySelector(".av-sidebar-drawer-close").getBoundingClientRect();
  const nav = d.querySelector('[data-sidebar="drawer-navigation"]');
  const counts = [...d.querySelectorAll(".chip, .av-sidebar-leaf-count, [class*=count]")].filter(e => e.offsetParent && e.textContent.trim() && !e.closest(".av-sidebar-drawer-close"));
  const hit = counts.filter(e => { const r = e.getBoundingClientRect(); return r.width && r.left < x.right - 4 && r.right > x.left + 4 && r.top < x.bottom - 4 && r.bottom > x.top + 4; }).map(e => e.closest("a,button")?.textContent.trim().replace(/\s+/g, " ").slice(0, 40));
  const header = d.querySelector(".av-sidebar-drawer-header").getBoundingClientRect();
  return { drawerScrollTop: Math.round(d.scrollTop), drawerScrollable: d.scrollHeight > d.clientHeight, navScrollTop: nav.scrollTop, navOverflowY: getComputedStyle(nav).overflowY, closeTop: Math.round(x.top), headerTop: Math.round(header.top), closeInHeader: x.top >= header.top - 1 && x.bottom <= header.bottom + 5, countsUnderClose: hit, footerVisibleAtEnd: null };
});
for (const [w, h] of [[375, 812], [768, 1024]]) {
  const s = await open("chromium", { width: w, height: h }); const p = s.page;
  await p.goto(BASE + "/category/players-clients", { waitUntil: "load" }); await p.waitForTimeout(2500);
  await p.getByRole("button", { name: "Decline" }).click().catch(() => {});
  for (const sys of ["editorial", "brutalist"]) {
    await p.evaluate((sys) => window.applyDesignSystem(sys, window.SYSTEM_DEFAULT_ACCENT[sys]), sys); await p.waitForTimeout(400);
    await p.getByRole("button", { name: "Toggle sidebar" }).first().click(); await p.waitForTimeout(1000);
    const opened = await measure(p); out.push({ w, sys, step: "opened (deep-link auto-reveal)", ...opened });
    await shot(p, s, "D-12", `after-drawer-opened-${sys}-chromium-${w}`, "guest", { extra: JSON.stringify(opened) });
    // same scroll position as the BEFORE frame: Players & Clients near the top
    await p.locator('.av-sidebar-drawer[data-state=open] [data-testid="sub-players-clients-uncategorized"]').evaluate(a => a.scrollIntoView({ block: "center" })); await p.waitForTimeout(400);
    const mid = await measure(p); out.push({ w, sys, step: "scrolled", ...mid });
    await shot(p, s, "D-12", `after-drawer-scrolled-${sys}-chromium-${w}`, "guest", { extra: JSON.stringify(mid) });
    await p.evaluate(() => { const d = document.querySelector(".av-sidebar-drawer[data-state=open]"); d.scrollTop = d.scrollHeight; }); await p.waitForTimeout(300);
    const end = await p.evaluate(() => { const d = document.querySelector(".av-sidebar-drawer[data-state=open]"); const f = d.querySelector(".av-sidebar-drawer-footer, .av-sidebar-compact-footer"); const r = f?.getBoundingClientRect(); return { footerBottom: r && Math.round(r.bottom), drawerBottom: Math.round(d.getBoundingClientRect().bottom), footerText: f?.textContent.trim().slice(0, 50) }; });
    out.push({ w, sys, step: "end", ...end });
    if (sys === "brutalist") await shot(p, s, "D-12", `after-drawer-end-${sys}-chromium-${w}`, "guest", { extra: JSON.stringify(end) });
    await p.evaluate(() => { const d = document.querySelector(".av-sidebar-drawer[data-state=open]"); d.scrollTop = 0; });
    await p.locator(".av-sidebar-drawer-close").click(); await p.waitForTimeout(700);
    out.push({ w, sys, step: "closed", drawerOpen: await p.locator(".av-sidebar-drawer[data-state=open]").count(), focus: await p.evaluate(() => document.activeElement?.getAttribute("aria-label")) });
  }
  out.push({ w, console: s.consoleLog.filter(l => !/development keys/.test(l)) });
  await s.browser.close();
}
console.log(JSON.stringify(out).replace(/\},\{/g, "},\n{")); log("D-12", { phase: "after", out });

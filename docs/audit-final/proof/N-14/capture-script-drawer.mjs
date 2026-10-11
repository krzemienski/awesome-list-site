import { BASE, open, shot, log } from "./lib.mjs";
const s = await open("chromium", { width: 375, height: 812 }); const p = s.page; const out = [];
await p.goto(BASE + "/category/players-clients?filter=general", { waitUntil: "load" }); await p.waitForTimeout(2500);
await p.getByRole("button", { name: "Decline" }).click().catch(() => {});
const btns = await p.evaluate(() => [...document.querySelectorAll("header button")].map(b => b.getAttribute("aria-label") || b.textContent.trim()).slice(0, 10));
console.log("header buttons", JSON.stringify(btns));
for (const sys of ["editorial", "brutalist"]) {
  await p.evaluate((sys) => window.applyDesignSystem(sys, window.SYSTEM_DEFAULT_ACCENT[sys]), sys); await p.waitForTimeout(500);
  const trigger = p.locator("header button").filter({ hasText: "" }).first();
  await p.getByRole("button", { name: /menu|navigation|sidebar/i }).first().click(); await p.waitForTimeout(900);
  const row = p.locator('.av-sidebar-drawer [data-testid="sub-players-clients-uncategorized"], [role=dialog] [data-testid="sub-players-clients-uncategorized"]').first();
  await row.evaluate((a) => a.scrollIntoView({ block: "center" })); await p.waitForTimeout(400);
  const info = await row.evaluate((a) => { const r = a.getBoundingClientRect(), b = a.querySelector(".av-sidebar-leaf-count").getBoundingClientRect(); return { cur: a.getAttribute("aria-current"), h: r.height, right: r.right, countRight: b.right, vw: innerWidth, label: a.textContent }; }).catch((e) => ({ err: String(e).slice(0, 120) }));
  out.push({ sys, ...info });
  await shot(p, s, "N-14", `after-drawer-${sys}-chromium-375`, "guest", { extra: JSON.stringify(info) });
  await p.keyboard.press("Escape"); await p.waitForTimeout(600);
}
console.log(JSON.stringify(out)); log("N-14", { phase: "after-drawer", out, console: s.consoleLog });
await s.browser.close();

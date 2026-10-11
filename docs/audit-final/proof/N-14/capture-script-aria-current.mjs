import { BASE, open, shot, log } from "./lib.mjs";
const out = [];
const read = (p, surface) => p.evaluate((surface) => {
  const root = document.querySelector(surface); if (!root) return { err: "no " + surface };
  const cur = [...root.querySelectorAll('[aria-current="page"]')].map(a => (a.getAttribute("href") || "") + " :: " + a.textContent.trim().replace(/\s+/g, " ").slice(0, 40));
  const hl = [...root.querySelectorAll(".av-sidebar-l2-row.active")].map(r => r.textContent.trim().replace(/\s+/g, " ").slice(0, 30));
  return { url: location.pathname + location.search, current: cur, highlightedGroups: hl };
}, surface);
const routes = ["/subcategory/mobile-web-players?filter=general", "/subcategory/mobile-web-players", "/sub-subcategory/android", "/category/players-clients?filter=general", "/category/players-clients"];
const s = await open("chromium", { width: 1440, height: 900 }); const p = s.page;
for (const r of routes) {
  await p.goto(BASE + r, { waitUntil: "load" }); await p.waitForTimeout(2500);
  await p.getByRole("button", { name: "Decline" }).click().catch(() => {});
  const m = await read(p, '[data-sidebar="sidebar"]'); out.push({ w: 1440, ...m });
  if (r === routes[0]) { await p.reload({ waitUntil: "load" }); await p.waitForTimeout(2500); out.push({ w: 1440, step: "reload", ...(await read(p, '[data-sidebar="sidebar"]')) });
    await p.locator('[data-testid="subsub-mobile-web-players-uncategorized"]').first().scrollIntoViewIfNeeded();
    await shot(p, s, "N-14", "after2-nested-current-chromium-1440", "guest", { extra: JSON.stringify(out.at(-1).current) }); }
  if (r === "/sub-subcategory/android") { await p.locator('[data-sidebar="sidebar"] [aria-current="page"]').first().scrollIntoViewIfNeeded(); await shot(p, s, "N-14", "after2-subsub-current-chromium-1440", "guest", { extra: JSON.stringify(m.current) }); }
}
await s.browser.close();
const m = await open("chromium", { width: 375, height: 812 }); const q = m.page;
await q.goto(BASE + routes[0], { waitUntil: "load" }); await q.waitForTimeout(2500);
await q.getByRole("button", { name: "Decline" }).click().catch(() => {});
await q.getByRole("button", { name: "Toggle sidebar" }).first().click(); await q.waitForTimeout(1200);
out.push({ w: 375, ...(await read(q, ".av-sidebar-drawer[data-state=open]")) });
await shot(q, m, "N-14", "after2-nested-current-drawer-chromium-375", "guest", { extra: JSON.stringify(out.at(-1).current) });
await m.browser.close();
console.log(JSON.stringify(out).replace(/\},\{/g, "},\n{")); log("N-14", { phase: "after2-aria-current", rev: await (await fetch(BASE + "/api/version")).json(), out });

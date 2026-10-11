// N-14: sidebar child rows + Uncategorized vs category/subcategory badges; navigation through the new rows.
import { BASE, open, shot, revision, log } from "./lib.mjs";
const ID = "N-14"; const PHASE = process.env.PHASE || "after"; const rows = [];
const s = await open("chromium", { width: 1440, height: 900 }); const p = s.page;
const cats = await (await fetch(BASE + "/api/categories")).json();
const list = (Array.isArray(cats) ? cats : cats.categories || cats.data).map((c) => c.slug);
await p.goto(BASE + "/", { waitUntil: "load" }); await p.waitForTimeout(2000);
await p.getByRole("button", { name: "Decline" }).click().catch(() => {});
const readCat = (slug) => p.evaluate((slug) => {
  const head = document.querySelector(`[data-testid="accordion-cat-${slug}"]`); const item = head.closest(".accordion-item");
  const num = (t) => Number((t || "").replace(/[^0-9]/g, "")) || 0;
  const badge = num([...head.querySelectorAll("span[aria-label]")].map((e) => e.getAttribute("aria-label")).find((a) => /resource/.test(a)));
  const body = item.querySelector(".accordion-body-inner"); if (!body) return { badge, open: false };
  const leaves = [...body.querySelectorAll(":scope > a.sub-item.av-sidebar-leaf")].map((a) => ({ label: a.querySelector(".av-sidebar-leaf-label")?.textContent, n: num(a.querySelector(".av-sidebar-leaf-count")?.textContent), cur: a.getAttribute("aria-current") }));
  const groups = [...body.querySelectorAll(":scope > .av-sidebar-l2-group")].map((g) => { const l = g.querySelector(".av-sidebar-l2-link"); const sp = l.querySelectorAll(":scope > span"); return { label: sp[0].textContent, n: num(sp[sp.length - 1].textContent), slug: l.dataset.testid.replace(/^sub-/, "") }; });
  const all = body.querySelector(".av-sidebar-all-category");
  return { badge, open: true, leaves, groups, sum: [...leaves, ...groups].reduce((a, b) => a + b.n, 0), allCurrent: all?.getAttribute("aria-current") };
}, slug);
for (const slug of list) {
  await p.evaluate((path) => { history.pushState({}, "", path); dispatchEvent(new PopStateEvent("popstate")); }, `/category/${slug}`);
  await p.waitForTimeout(1800);
  const head = p.getByTestId(`accordion-cat-${slug}`);
  if ((await head.getAttribute("data-state")) !== "open") { await head.click(); await p.waitForTimeout(500); }
  const side = await readCat(slug);
  const tile = await p.getByTestId("taxonomy-child-uncategorized").locator(".chip").textContent({ timeout: 1500 }).catch(() => null);
  const heading = await p.locator("h2", { hasText: /^Resources \(/ }).first().textContent().catch(() => null);
  const unc = side.leaves?.find((l) => l.label === "Uncategorized");
  // nested groups
  const nested = [];
  for (const g of side.groups || []) {
    const ex = p.getByTestId(`expand-sub-${g.slug}`).first();
    if ((await ex.getAttribute("aria-expanded")) !== "true") { await ex.click(); await p.waitForTimeout(450); }
    const t = await p.evaluate((sub) => { const l = document.querySelector(`[data-testid="sub-${sub}"]`); const tree = l.closest(".av-sidebar-l2-group").querySelector(".av-sidebar-l3-tree");
      const num = (t) => Number((t || "").replace(/[^0-9]/g, "")) || 0;
      return [...tree.querySelectorAll("a.av-sidebar-l3-row")].map((a) => { const sp = a.querySelectorAll("span"); return { glyph: sp[0].textContent, label: sp[1].textContent, n: num(sp[2]?.textContent) }; }); }, g.slug);
    nested.push({ sub: g.label, badge: g.n, rows: t, sum: t.reduce((a, b) => a + b.n, 0) });
  }
  rows.push({ slug, badge: side.badge, sidebarSum: side.sum, sidebarUncategorized: unc?.n ?? 0, tile: tile ? Number(tile) : 0, heading, nested });
  if (slug === "players-clients") await shot(p, s, ID, `${PHASE}-sidebar-${slug}-chromium-1440`, "guest", { extra: `badge ${side.badge} | rows sum ${side.sum} | Uncategorized row ${unc?.n ?? "none"} | tile ${tile} | ${nested.map((n) => `${n.sub} ${n.badge}=${n.sum}`).join(", ")}` });
}
// Navigation through the new rows (after phase only)
const nav = [];
if (PHASE === "after") {
  await p.goto(BASE + "/category/players-clients", { waitUntil: "load" }); await p.waitForTimeout(2200);
  await p.getByTestId("sub-players-clients-uncategorized").first().click(); await p.waitForTimeout(1600);
  const st = () => p.evaluate(() => ({ url: location.pathname + location.search, heading: [...document.querySelectorAll("h2")].map((h) => h.textContent).find((t) => /^Resources \(/.test(t)),
    rowCur: document.querySelector('[data-testid="sub-players-clients-uncategorized"]')?.getAttribute("aria-current"),
    allCur: document.querySelector(".av-sidebar-all-category")?.getAttribute("aria-current"),
    tilePressed: document.querySelector('[data-testid="taxonomy-child-uncategorized"]')?.getAttribute("aria-pressed") }));
  nav.push({ step: "click sidebar Uncategorized", ...(await st()) });
  await shot(p, s, ID, `after-sidebar-uncategorized-active-chromium-1440`, "guest", { extra: JSON.stringify(nav.at(-1)) });
  await p.reload({ waitUntil: "load" }); await p.waitForTimeout(2200); nav.push({ step: "reload", ...(await st()) });
  await p.goBack(); await p.waitForTimeout(1500); nav.push({ step: "back", ...(await st()) });
  await p.goForward(); await p.waitForTimeout(1500); nav.push({ step: "forward", ...(await st()) });
  // nested: Mobile & Web Players
  const ex = p.getByTestId("expand-sub-mobile-web-players").first();
  if ((await ex.getAttribute("aria-expanded")) !== "true") { await ex.click(); await p.waitForTimeout(450); }
  await p.getByTestId("subsub-mobile-web-players-uncategorized").first().click(); await p.waitForTimeout(1800);
  const sub = await p.evaluate(() => ({ url: location.pathname + location.search, heading: [...document.querySelectorAll("h2")].map((h) => h.textContent).find((t) => /^Resources \(/.test(t)),
    rowCur: document.querySelector('[data-testid="subsub-mobile-web-players-uncategorized"]')?.getAttribute("aria-current"),
    tile: document.querySelector('[data-testid="taxonomy-child-uncategorized"] .chip')?.textContent, tilePressed: document.querySelector('[data-testid="taxonomy-child-uncategorized"]')?.getAttribute("aria-pressed") }));
  nav.push({ step: "click nested Uncategorized (Mobile & Web Players)", ...sub });
  await shot(p, s, ID, `after-sidebar-nested-uncategorized-chromium-1440`, "guest", { extra: JSON.stringify(sub) });
}
rows.push({ rev: await revision(p), net: s.net.filter((l) => !/^2/.test(l)), console: s.consoleLog.filter((l) => !/development keys|_cfuvid/.test(l)) });
await s.browser.close();
log(ID, { phase: PHASE, rows, nav }); for (const r of rows) console.log(JSON.stringify(r)); for (const n of nav) console.log(JSON.stringify(n));

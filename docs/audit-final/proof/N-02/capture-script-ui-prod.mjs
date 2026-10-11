import { open, shot, log } from "./lib.mjs"; const BASE = "https://awesome.video";
const tree = await (await fetch(BASE + "/api/awesome-list")).json(); const cats = tree.categories || tree;
const targets = [];
for (const c of cats) for (const s of c.subcategories) {
  const direct = s.resources.length, nested = (s.subSubcategories || []).reduce((a, x) => a + x.resources.length, 0);
  targets.push({ path: `/subcategory/${s.slug}`, label: `${c.name} › ${s.name}`, expect: direct + nested, kids: (s.subSubcategories || []).length });
  for (const x of s.subSubcategories || []) targets.push({ path: `/sub-subcategory/${x.slug}`, label: `${c.name} › ${s.name} › ${x.name}`, expect: x.resources.length, kids: 0 });
}
const s = await open("chromium", { width: 1440, height: 900 }); const p = s.page;
const A=+(process.env.A||0), Z=+(process.env.Z||targets.length); const run=targets.slice(A,Z);
await p.goto(BASE + run[0].path, { waitUntil: "load" }); await p.waitForTimeout(3000);
await p.getByRole("button", { name: "Decline" }).click().catch(() => {});
const res = []; const bad = [];
let i = 0; p.on("crash", () => console.log("CRASH at", i)); p.on("close", () => console.log("CLOSE at", i, targets[i]?.path));
for (const t of run) { i++;
  await p.evaluate((u) => { history.pushState({}, "", u); dispatchEvent(new PopStateEvent("popstate")); }, t.path);
  const waited = await p.waitForFunction((u) => location.pathname === u.path && document.querySelector("h1")?.textContent?.trim() === u.name && document.querySelector('[data-testid="text-results-count"]') && !document.querySelector('[data-testid="taxonomy-results-loading"]'), { path: t.path, name: t.label.split(" › ").pop() }, { timeout: 6000 }).then(() => true, () => false);
  await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const num = (x) => Number((x || "").replace(/[^0-9]/g, "")) || 0;
    const badge = num(document.querySelector(".taxonomy-summary .chip.accent")?.textContent);
    const heading = num(document.querySelector('[data-testid="text-results-count"]')?.textContent);
    const cards = document.querySelectorAll(".resource-card").length;
    const pag = [...document.querySelectorAll("nav[aria-label*=agination] a, nav[aria-label*=agination] button")].map(e => e.textContent.trim()).filter(x => /^\d+$/.test(x)).map(Number);
    const cur = document.querySelector('[data-sidebar="sidebar"] [aria-current="page"]');
    const sideTxt = cur ? (cur.querySelector(".font-mono")?.textContent || cur.textContent) : null;
    return { badge, heading, cards, lastPage: pag.length ? Math.max(...pag) : 1, sideActive: sideTxt === null ? null : num(sideTxt.match(/\d[\d,]*\s*$/)?.[0]), h1: document.querySelector("h1")?.textContent };
  });
  const row = { ...t, ...r };
  row.expCards = Math.min(24, t.expect); row.expPages = Math.max(1, Math.ceil(t.expect / 24));
  row.ok = r.badge === t.expect && r.heading === t.expect && r.cards === row.expCards && r.lastPage === row.expPages && r.sideActive === t.expect;
  row.waited = waited; res.push(row); if (!row.ok) bad.push(row);
}
log("N-02", { phase: `ui-sweep-prod ${A}-${Z}`, base: BASE, rev: await (await fetch(BASE + "/api/version")).json(), count: res.length, bad, res });
// representative frames: a subcategory with sub-sub tiles, and a sub-subcategory
for (const pick of [res.find(r => r.kids >= 3 && r.expect > 24), res.find(r => r.path.startsWith("/sub-sub") && r.expect > 5)]) {
  await p.goto(BASE + pick.path, { waitUntil: "load" }); await p.waitForTimeout(2500);
  await shot(p, s, "N-02", `prod-sweep-${pick.path.split("/")[1]}-${pick.path.split("/")[2]}-chromium-1440`, "guest", { extra: `SQL ${pick.expect} | badge ${pick.badge} | heading ${pick.heading} | cards p1 ${pick.cards} | pages ${pick.lastPage} | sidebar ${pick.sideActive}` });
}
console.log(JSON.stringify({ count: res.length, bad: bad.length, sideChecked: res.filter(r => r.sideActive !== null).length, badRows: bad.slice(0, 12) }));
console.log("console:", s.consoleLog.filter(l => !/development keys/.test(l)).slice(0, 5)); console.log("net>=400:", s.net.filter(l => /^[45]/.test(l)));
await s.browser.close();

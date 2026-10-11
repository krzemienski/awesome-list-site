import { BASE, open, shot, log, revision } from "./lib.mjs";
const s = await open("chromium", { width: 1440, height: 900 }); const p = s.page; const out = { rev: await revision().catch(e => String(e)) };
for (const [path, label] of [["/category/players-clients", "category"], ["/subcategory/mobile-web-players?filter=general", "sub-filtered"]]) {
  await p.goto(BASE + path, { waitUntil: "load" }); await p.waitForTimeout(3500);
  await p.getByRole("button", { name: "Decline" }).click().catch(() => {});
  const r = await p.evaluate(() => {
    const body = [...document.querySelectorAll("[id^=accordion-body-players-clients]")].find(b => b.offsetParent);
    const rows = body ? [...body.querySelectorAll(":scope a, :scope button")].filter(a => a.closest("[id^=accordion-body]") === body && a.offsetParent).map(a => a.textContent.trim().replace(/\s+/g, " ")) : [];
    const h = document.querySelector("#taxonomy-results-heading");
    if (body) body.querySelector("a:last-of-type")?.scrollIntoView({ block: "end" });
    const last = body && [...body.querySelectorAll("a")].filter(a => a.offsetParent).pop(); last?.scrollIntoView({ block: "center" });
    return { rows, uncategorizedRow: rows.some(t => /^Uncategorized/.test(t)), heading: h?.textContent, headingSrOnly: !!h?.querySelector(".sr-only"), chip: !!document.querySelector('[data-testid="chip-taxonomy-scope"]'), badge: document.querySelector(".taxonomy-summary .chip.accent")?.textContent };
  });
  out[label] = r; await p.waitForTimeout(300);
  await shot(p, s, label === "category" ? "N-14" : "N-15", `before-${label}-prod-chromium-1440`, "guest", { extra: JSON.stringify({ uncategorizedRow: r.uncategorizedRow, heading: r.heading, headingSrOnly: r.headingSrOnly, chip: r.chip, badge: r.badge }) });
}
console.log(JSON.stringify(out, null, 1)); log("N-14", { phase: "before-prod", out, console: s.consoleLog });
await s.browser.close();

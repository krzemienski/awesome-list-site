// V23 production read-only probe. Guest browser only: theme choice is localStorage (no server write),
// the Explorer long-name test rewrites text in the visitor's own DOM only. No requests mutate prod.
import { chromium } from "@playwright/test";
import fs from "node:fs";
const BASE = process.env.BASE ?? "https://awesome.video";
const OUT = process.env.OUT ?? "/tmp/v23out";
fs.mkdirSync(OUT, { recursive: true });
const axeSrc = fs.readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const result = { base: BASE, at: new Date().toISOString() };
const browser = await chromium.launch();
try {
  const version = await (await fetch(`${BASE}/api/version`)).json();
  result.version = version;

  // 1) 375px Terminal/Matrix palette caption contrast.
  {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, bypassCSP: true });
    await ctx.addInitScript(() => { localStorage.setItem("ds-system", "terminal"); localStorage.setItem("ds-accent", "matrix"); });
    const page = await ctx.newPage();
    const writes = [];
    page.on("request", (r) => { if (!["GET", "HEAD", "OPTIONS"].includes(r.method()) && r.url().startsWith(BASE)) writes.push(`${r.method()} ${r.url()}`); });
    await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 60000 });
    result.paletteRoot = await page.evaluate(() => ({ system: document.documentElement.dataset.system, accent: document.documentElement.dataset.accent }));
    await page.mouse.click(5, 400);
    await page.keyboard.press("Control+k");
    try { await page.waitForSelector("[cmdk-item]", { timeout: 6000 }); result.openedBy = "Control+k"; }
    catch { await page.keyboard.press("Meta+k"); try { await page.waitForSelector("[cmdk-item]", { timeout: 6000 }); result.openedBy = "Meta+k"; }
      catch { result.searchButtons = await page.evaluate(() => [...document.querySelectorAll("button")].filter((b) => /search/i.test(b.getAttribute("aria-label") ?? b.textContent ?? "")).map((b) => b.getAttribute("aria-label") ?? b.textContent.trim()).slice(0, 5));
        await page.locator('button[aria-label*="earch" i]').first().click(); await page.waitForSelector("[cmdk-item]", { timeout: 10000 }); result.openedBy = "search button"; } }
    await page.waitForTimeout(600);
    let label = "";
    for (let i = 0; i < 40; i++) {
      label = await page.evaluate(() => document.querySelector('[cmdk-item][data-selected="true"]')?.textContent?.trim() ?? "");
      if (/Encoding & Codecs/.test(label)) break;
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(120);
    }
    result.selectedRow = label;
    await page.waitForTimeout(800); // settle transitions
    const probe = await page.evaluate(() => {
      const row = document.querySelector('[cmdk-item][data-selected="true"]');
      const small = row?.querySelector("small");
      return small ? { caption: small.textContent, color: getComputedStyle(small).color, rowBg: getComputedStyle(row).backgroundColor } : null;
    });
    result.captionStyles = probe;
    await page.addScriptTag({ content: axeSrc });
    const axe = await page.evaluate(async () => {
      const r = await window.axe.run('[cmdk-item][data-selected="true"]', { runOnly: { type: "rule", values: ["color-contrast"] } });
      const pick = (arr) => arr.flatMap((v) => v.nodes.map((n) => ({ target: n.target.join(" "), summary: n.any?.[0]?.data ?? null })));
      return { violations: pick(r.violations), passes: pick(r.passes), incomplete: pick(r.incomplete) };
    });
    result.paletteAxe = axe;
    await page.screenshot({ path: `${OUT}/V23-prod-375-terminal-matrix-palette.png` });
    result.paletteWrites = writes;
    await ctx.close();
  }

  // 2) 768x1024 Explorer long category name stays inside its card.
  {
    const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/advanced`, { waitUntil: "networkidle", timeout: 60000 });
    const titleSel = 'a[href^="/category/"] > span.min-w-0';
    await page.waitForSelector(titleSel, { timeout: 20000 });
    const measure = () => page.evaluate((sel) => [...document.querySelectorAll(sel)].map((span) => {
      const card = span.closest(".rounded-lg, [class*='card'], article") ?? span.parentElement;
      const s = span.getBoundingClientRect(); const c = card.getBoundingClientRect();
      return { name: span.textContent.slice(0, 60), spanRight: Math.round(s.right), cardRight: Math.round(c.right), inside: s.left >= c.left - 0.5 && s.right <= c.right + 0.5, lines: Math.round(s.height / parseFloat(getComputedStyle(span).lineHeight || "24")) };
    }), titleSel);
    result.explorerReal = await measure();
    // Client-only DOM experiment: give the first card an unbroken 90-char name, as the clean6 repro did.
    await page.evaluate((sel) => { document.querySelector(sel).textContent = "__qa_test_plan_592_" + "Supercalifragilisticexpialidocious".repeat(2) + "EncodingAndCodecsLongName"; }, titleSel);
    await page.waitForTimeout(300);
    result.explorerLong = (await measure())[0];
    await page.locator(titleSel).first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${OUT}/V23-prod-768-explorer-long-name.png` });
    await ctx.close();
  }
} finally {
  await browser.close();
  fs.writeFileSync(`${OUT}/v23-prod-probe.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2).slice(0, 4000));
}

import { chromium } from "playwright";
const b = await chromium.launch({ args: ["--no-sandbox"] });
const p = await (await b.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
await p.goto("http://localhost:5000/", { waitUntil: "domcontentloaded" });
await p.waitForSelector('[data-testid^="accordion-cat-"]');
await p.waitForTimeout(800);

// Expand every cat
const cats = await p.$$eval('[data-testid^="accordion-cat-"]', els => els.map(e => e.getAttribute("data-testid")));
console.log("cats:", cats.length);
for (const c of cats) await p.click(`[data-testid="${c}"]`);
await p.waitForTimeout(400);

// All clickable items in sidebar
const items = await p.$$eval('[data-sidebar="sidebar"] [data-testid], aside [data-testid]', els => els.map(e => ({
  testid: e.getAttribute("data-testid"),
  text: (e.innerText || "").trim().slice(0, 60),
  tag: e.tagName.toLowerCase(),
})));
const subItems = items.filter(i => i.testid?.startsWith("sub-") && !i.testid.startsWith("sub-all-"));
const subSubItems = items.filter(i => i.testid?.startsWith("subsub-"));
const expandSubs = items.filter(i => i.testid?.startsWith("expand-sub-"));
console.log("sub items in DOM:", subItems.length);
console.log("subsub items in DOM:", subSubItems.length);
console.log("expand-sub buttons in DOM:", expandSubs.length);

// Specifically check the failures
for (const slug of ["sub-ffmpeg-tools", "sub-next-generation-codecs-av1-vvc", "sub-introduction", "sub-trimming-cutting-tools", "sub-non-linear-editing-suites", "sub-browser-extensions", "sub-dash-manifest-tools", "sub-subtitle-caption-tutorials", "sub-performance-monitoring-tools"]) {
  const found = items.find(i => i.testid === slug);
  console.log(`  ${slug}: ${found ? "PRESENT" : "MISSING"}${found ? ` text="${found.text}"` : ""}`);
}

// Now expand all subs that have expand-sub buttons
for (const e of expandSubs) await p.click(`[data-testid="${e.testid}"]`);
await p.waitForTimeout(400);
const items2 = await p.$$eval('aside [data-testid]', els => els.map(e => e.getAttribute("data-testid")));
const subSubs2 = items2.filter(i => i?.startsWith("subsub-"));
console.log("\nAfter expanding every sub: subsub items =", subSubs2.length);

await b.close();

import { chromium } from "playwright";
const EXE = ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage();
await page.goto("http://localhost:5000/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(6000);
const info = await page.evaluate(() => {
  const grid = document.querySelector("[data-testid='list-categories']");
  const links = document.querySelectorAll("a[data-testid^='link-category-']");
  const first = links[0];
  return {
    gridExists: !!grid,
    gridChildren: grid ? grid.children.length : 0,
    linkCount: links.length,
    firstLinkHTML: first ? first.outerHTML.slice(0, 200) : null,
    gridFirstChildTag: grid && grid.firstElementChild ? grid.firstElementChild.outerHTML.slice(0, 150) : null,
  };
});
console.log(JSON.stringify(info, null, 1));
await browser.close();

/**
 * Focused real-guest verification for the resource breadcrumb disclosure.
 * Prepared only: do not run until the parent authorizes this browser check.
 * Uses no auth storage, mocks, request interception, or pixel masking.
 */
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:5000";
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const resourcePath = "/resource/185020";
const outputDir = process.env.OUT_DIR;
if (!outputDir) throw new Error("OUT_DIR is required for retained evidence");
const triggerSelector = '[data-testid="button-breadcrumb-ellipsis"]';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function layoutMetrics(page) {
  return page.evaluate(() => {
    const breadcrumb = document.querySelector('[data-testid="page-breadcrumb"]');
    const heading = document.querySelector("main h1");
    return {
      breadcrumbHeight: breadcrumb ? Math.round(breadcrumb.getBoundingClientRect().height * 10) / 10 : null,
      headingTop: heading ? Math.round(heading.getBoundingClientRect().top * 10) / 10 : null,
      horizontalOverflow:
        document.documentElement.scrollWidth > window.innerWidth + 1 ||
        document.body.scrollWidth > window.innerWidth + 1,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });
}

async function triggerMetrics(page) {
  return page.locator(triggerSelector).evaluate((button) => {
    const rect = button.getBoundingClientRect();
    const before = getComputedStyle(button, "::before");
    return {
      visualWidth: Math.round(rect.width * 10) / 10,
      visualHeight: Math.round(rect.height * 10) / 10,
      pointerWidth: parseFloat(before.width) || 0,
      pointerHeight: parseFloat(before.height) || 0,
      pointerContent: before.content,
    };
  });
}

function sameGeometry(before, after, viewport) {
  assert(before.breadcrumbHeight !== null && after.breadcrumbHeight !== null, `${viewport}: missing breadcrumb geometry`);
  assert(before.headingTop !== null && after.headingTop !== null, `${viewport}: missing h1 geometry`);
  assert(Math.abs(before.breadcrumbHeight - after.breadcrumbHeight) <= 1, `${viewport}: breadcrumb height changed ${before.breadcrumbHeight} -> ${after.breadcrumbHeight}`);
  assert(Math.abs(before.headingTop - after.headingTop) <= 1, `${viewport}: h1 top changed ${before.headingTop} -> ${after.headingTop}`);
}

const browser = await chromium.launch({
  headless: true,
  ...(executablePath ? { executablePath } : {}),
});

try {
  for (const viewport of [768, 1024]) {
    const context = await browser.newContext({ viewport: { width: viewport, height: viewport === 768 ? 1024 : 768 } });
    const page = await context.newPage();
    await page.goto(`${baseUrl}${resourcePath}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="breadcrumb-mobile-current"]', { state: "visible" });
    await page.waitForSelector('[data-testid="text-resource-title"]', { state: "visible" });

    const trigger = page.locator(triggerSelector);
    await trigger.waitFor({ state: "visible", timeout: 15_000 });
    const closed = await layoutMetrics(page);
    const triggerGeometry = await triggerMetrics(page);
    assert(!closed.horizontalOverflow, `${viewport}: closed disclosure creates horizontal overflow`);
    assert(triggerGeometry.visualHeight <= closed.breadcrumbHeight + 1, `${viewport}: trigger increases breadcrumb row height (${triggerGeometry.visualHeight}px in ${closed.breadcrumbHeight}px row)`);
    assert(triggerGeometry.pointerWidth >= 24 && triggerGeometry.pointerHeight >= 24, `${viewport}: disclosure pointer target is below 24px (${triggerGeometry.pointerWidth}x${triggerGeometry.pointerHeight})`);
    assert(triggerGeometry.pointerContent !== "none", `${viewport}: compact target-spacing pseudo-element is missing`);
    await page.screenshot({ path: `${outputDir}/breadcrumb-closed-${viewport}.png`, fullPage: true });

    await trigger.click();
    await page.waitForFunction(() =>
      Array.from(document.querySelectorAll('[role="menu"]')).some((menu) =>
        menu.getClientRects().length > 0 && menu.querySelector('a[role="menuitem"]'),
      ),
    );
    await page.screenshot({ path: `${outputDir}/breadcrumb-open-${viewport}.png`, fullPage: false });
    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[role="menu"]'))
        .filter((menu) => menu.getClientRects().length > 0)
        .flatMap((menu) => Array.from(menu.querySelectorAll('a[role="menuitem"]')))
        .map((anchor) => ({
          label: anchor.textContent?.trim() ?? "",
          path: new URL(anchor.href, window.location.origin).pathname,
        })),
    );
    assert(links.length > 0, `${viewport}: disclosure has no ancestor links`);
    assert(links.every(({ label, path }) => label.length > 0 && /^\/(?:category|subcategory|sub-subcategory)\//.test(path)), `${viewport}: disclosure contains a non-taxonomy ancestor link: ${JSON.stringify(links)}`);

    const opened = await layoutMetrics(page);
    assert(!opened.horizontalOverflow, `${viewport}: open disclosure creates horizontal overflow`);
    sameGeometry(closed, opened, viewport);

    await page.keyboard.press("Escape");
    await page.waitForFunction(() =>
      !Array.from(document.querySelectorAll('[role="menu"]')).some((menu) =>
        menu.getClientRects().length > 0,
      ),
    );
    const escaped = await layoutMetrics(page);
    assert(!escaped.horizontalOverflow, `${viewport}: Escape state creates horizontal overflow`);
    sameGeometry(closed, escaped, viewport);
    const focusReturned = await page.evaluate(() => document.activeElement?.getAttribute("data-testid") === "button-breadcrumb-ellipsis");
    assert(focusReturned, `${viewport}: Escape did not restore focus to disclosure trigger`);

    console.log(JSON.stringify({ viewport, links, triggerGeometry, closed, opened, escaped }));
    await context.close();
  }

  for (const viewport of [375, 1440]) {
    const context = await browser.newContext({ viewport: { width: viewport, height: viewport === 375 ? 812 : 900 } });
    const page = await context.newPage();
    await page.goto(`${baseUrl}${resourcePath}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="breadcrumb-mobile-current"]', { state: "visible" });
    // A hidden CSS control is not acceptable: the slot/chunk selector must not
    // render at these widths.
    await page.waitForTimeout(100);
    const count = await page.locator(triggerSelector).count();
    assert(count === 0, `${viewport}: disclosure is rendered outside 768..1279`);
    const metrics = await layoutMetrics(page);
    assert(!metrics.horizontalOverflow, `${viewport}: canonical breadcrumb has horizontal overflow`);
    await page.screenshot({ path: `${outputDir}/breadcrumb-not-rendered-${viewport}.png`, fullPage: true });
    console.log(JSON.stringify({ viewport, notRendered: true, metrics }));
    await context.close();
  }
} finally {
  await browser.close();
}

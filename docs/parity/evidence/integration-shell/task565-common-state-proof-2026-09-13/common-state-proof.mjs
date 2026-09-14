/**
 * Focused real-guest common-state evidence for the public-comparison selector
 * review. This distinguishes reachable real controls from baseline default
 * visibility; it does not convert a different default into a parity pass.
 */
import { createRequire } from "node:module";
import path from "node:path";

const requireFromWorkspace = createRequire(path.join(process.cwd(), "package.json"));
const { chromium } = requireFromWorkspace("playwright");
const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:5000";
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function visible(root, selector) {
  return root.locator(selector).isVisible().catch(() => false);
}

async function href(root, testId) {
  return root.locator(`[data-testid="${testId}"]`).getAttribute("href");
}

async function openDetails(root) {
  const details = root.locator("details.av-sidebar-more-navigation").first();
  await details.locator("summary").waitFor({ state: "visible" });
  if ((await details.getAttribute("open")) === null) await details.locator("summary").click();
  return details;
}

async function openTabletDrawer(page) {
  const trigger = page.locator('[data-testid="mobile-drawer-trigger"]');
  await trigger.waitFor({ state: "visible" });
  await trigger.click();
  const drawer = page.locator(".av-sidebar-drawer");
  await drawer.waitFor({ state: "visible" });
  return drawer;
}

const browser = await chromium.launch({
  headless: true,
  ...(executablePath ? { executablePath } : {}),
});

try {
  // Baseline default root versus current anonymous account-context state.
  {
    const context = await browser.newContext({ viewport: { width: 1024, height: 768 } });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
    const defaultRoot = {
      linkRecommendationsHeading: await visible(page, '[data-testid="link-recommendations-heading"]'),
      buttonBrowseRecommendations: await visible(page, '[data-testid="button-browse-recommendations"]'),
    };
    await page.goto(`${baseUrl}/?context=account`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-testid="link-recommendations-heading"]').waitFor({ state: "visible" });
    await page.locator('[data-testid="button-browse-recommendations"]').waitFor({ state: "visible" });
    assert(await href(page, "link-recommendations-heading") === "/recommendations", "contextual recommendation heading is not a real route link");
    assert(await href(page, "button-browse-recommendations") === "/recommendations", "contextual recommendation browse control is not a real route link");
    console.log(JSON.stringify({ state: "anonymous-account-context", defaultRoot, contextualRecommendations: "real /recommendations links" }));
    await context.close();
  }

  // At the canonical tablet design width, controls live in the real drawer.
  // Open it normally, then prove real More-navigation and taxonomy disclosures.
  {
    const context = await browser.newContext({ viewport: { width: 1024, height: 768 } });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/about`, { waitUntil: "domcontentloaded" });
    const drawer = await openTabletDrawer(page);
    const details = await openDetails(drawer);
    for (const [testId, expectedHref] of [
      ["nav-submit-resource", "/submit"],
      ["nav-learning-journeys", "/journeys"],
      ["nav-advanced", "/advanced"],
      ["nav-theme", "/settings/theme"],
    ]) {
      await drawer.locator(`[data-testid="${testId}"]`).waitFor({ state: "visible" });
      assert(await href(drawer, testId) === expectedHref, `${testId} does not have its real route target`);
    }
    const categoryToggle = drawer.locator('[data-testid="toggle-cat-encoding-codecs"]');
    await categoryToggle.waitFor({ state: "visible" });
    if ((await categoryToggle.getAttribute("aria-expanded")) !== "true") await categoryToggle.click();
    const codecSub = drawer.locator('[data-testid="sub-codecs"]');
    await codecSub.waitFor({ state: "visible" });
    assert((await href(drawer, "sub-codecs"))?.startsWith("/subcategory/") === true, "sub-codecs is not a real taxonomy link");
    const subToggle = drawer.locator('[data-testid="expand-sub-codecs"]');
    await subToggle.waitFor({ state: "visible" });
    if ((await subToggle.getAttribute("aria-expanded")) !== "true") await subToggle.click();
    const liveL3 = drawer.locator('[data-testid^="subsub-"]:visible').first();
    await liveL3.waitFor({ state: "visible" });
    assert((await liveL3.getAttribute("href"))?.startsWith("/sub-subcategory/") === true, "expanded current L3 item is not a real taxonomy link");
    console.log(JSON.stringify({ state: "1024-drawer-open-more-and-taxonomy", detailsOpen: (await details.getAttribute("open")) !== null, currentTaxonomy: ["toggle-cat-encoding-codecs", "sub-codecs", "expand-sub-codecs", await liveL3.getAttribute("data-testid")] }));
    await context.close();
  }

  // Above the drawer cutoff, prove the existing compact rail via its real keyboard UI action.
  {
    const context = await browser.newContext({ viewport: { width: 1025, height: 768 } });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/category/encoding-codecs`, { waitUntil: "domcontentloaded" });
    const shell = page.locator(".av-sidebar-shell");
    await shell.waitFor({ state: "visible" });
    // SidebarProvider exposes the real Ctrl/Cmd+B compact-navigation action.
    await page.keyboard.press(process.platform === "darwin" ? "Meta+b" : "Control+b");
    for (const [testId, expectedHref] of [
      ["rail-home", "/"], ["rail-submit-resource", "/submit"],
      ["rail-learning-journeys", "/journeys"], ["rail-advanced", "/advanced"],
      ["rail-theme", "/settings/theme"], ["rail-about", "/about"],
    ]) {
      await shell.locator(`[data-testid="${testId}"]`).waitFor({ state: "visible" });
      assert(await href(shell, testId) === expectedHref, `${testId} does not have its real route target`);
    }
    console.log(JSON.stringify({ state: "1025-user-selected-compact-rail", rail: "six real links verified" }));
    await context.close();
  }

  // Preserve—not waive—the current 768 default responsive difference.
  {
    const context = await browser.newContext({ viewport: { width: 768, height: 1024 } });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/about`, { waitUntil: "domcontentloaded" });
    console.log(JSON.stringify({ state: "768-default", railHomeVisible: await visible(page, '[data-testid="rail-home"]'), mobileDrawerTriggerVisible: await visible(page, '[data-testid="mobile-drawer-trigger"]'), interpretation: "intentional canonical responsive state differs from retained production rail default" }));
    await context.close();
  }
} finally {
  await browser.close();
}

/**
 * Narrow browser harness for task 566. It intentionally writes captures only
 * to /tmp; the accompanying worklog records which checks are blocked rather
 * than turning an unavailable privileged flow into a synthetic pass.
 */
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const baseUrl = process.env.CONTACT_VARIANT_BASE_URL;
const variant = process.env.CONTACT_VARIANT_UNDER_TEST;
const marker = process.env.CONTACT_QA_MARKER;
const outputDir = process.env.CONTACT_CAPTURE_DIR || "/tmp/contact-variants-566/screenshots";
const offState = process.env.CONTACT_OFF_STATE === "true";

assert(baseUrl, "CONTACT_VARIANT_BASE_URL is required");
assert(
  offState || ["a", "b", "c", "d", "e"].includes(variant),
  "CONTACT_VARIANT_UNDER_TEST must be a–e unless CONTACT_OFF_STATE=true",
);
assert(marker, "CONTACT_QA_MARKER is required");

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CONTACT_CHROMIUM_PATH || undefined,
});
const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const mobile = await browser.newContext({ viewport: { width: 375, height: 812 } });
const results = { variant, baseUrl, marker, checks: [] };

async function pageFor(context) {
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForFunction(() => document.querySelector('[data-testid="site-footer"]') !== null);
  const decline = page.getByTestId("consent-decline");
  if (await decline.isVisible().catch(() => false)) await decline.click();
  return page;
}

async function capture(page, suffix = "", fullPage = true) {
  if (process.env.CONTACT_SKIP_CAPTURES === "true") return;
  await page.screenshot({
    path: path.join(outputDir, `variant-${variant}${suffix}.png`),
    fullPage,
  });
}

async function requireNoSeriousAxe(page, scope) {
  const scan = await new AxeBuilder({ page }).include(scope).analyze();
  const serious = scan.violations.filter((item) => item.impact === "serious" || item.impact === "critical");
  assert.equal(serious.length, 0, `axe serious/critical: ${serious.map((item) => item.id).join(", ")}`);
  return serious.length;
}

async function assertCanonicalContactTokens(page) {
  const evidence = await page.evaluate(() => {
    const tokenNames = [
      "--accent", "--bg-2", "--border", "--border-strong", "--eyebrow-tracking",
      "--font-mono", "--mono-size-step", "--radius-sm", "--shadow-lg",
      "--surface", "--surface-2", "--surface-3", "--text", "--text-2",
    ];
    const css = Array.from(document.styleSheets).flatMap((sheet) => {
      try {
        return Array.from(sheet.cssRules).map((rule) => rule.cssText);
      } catch {
        return [];
      }
    }).filter((rule) => rule.includes(".contact-dialog")).join("\n");
    const dialog = document.querySelector('[data-testid="contact-dialog"]');
    const root = getComputedStyle(document.documentElement);
    const tokens = Object.fromEntries(tokenNames.map((token) => [token, root.getPropertyValue(token).trim()]));
    if (!dialog) return { css, computed: null, tokens };
    const style = getComputedStyle(dialog);
    return {
      css,
      computed: {
        backgroundColor: style.backgroundColor,
        borderTopColor: style.borderTopColor,
        boxShadow: style.boxShadow,
      },
      tokens,
    };
  });
  assert.match(evidence.css, /var\(--bg-2\)/);
  assert.match(evidence.css, /var\(--border-strong\)/);
  assert.match(evidence.css, /var\(--shadow-lg\)/);
  assert.notEqual(evidence.computed?.backgroundColor, "rgba(0, 0, 0, 0)");
  assert.notEqual(evidence.computed?.borderTopColor, "rgba(0, 0, 0, 0)");
  for (const [token, value] of Object.entries(evidence.tokens)) {
    assert.notEqual(value, "", `${token} must resolve in the active design system`);
  }
  return { ...evidence.computed, tokens: evidence.tokens };
}

async function openContact(page) {
  const trigger = page.getByTestId("contact-open-form");
  await trigger.click();
  await page.getByTestId("contact-dialog").waitFor({ state: "visible" });
  return trigger;
}

async function fillContact(page, suffix) {
  await page.getByTestId("contact-name").fill("Contact QA");
  await page.getByTestId("contact-email").fill("contact-qa@example.com");
  await page.getByTestId("contact-subject").fill(`Task 566 ${suffix}`);
  await page.getByTestId("contact-message").fill(`${marker} ${suffix} validates the persisted contact intake path.`);
}

async function submitContact(page) {
  const response = page.waitForResponse((item) =>
    item.url().endsWith("/api/contact") && item.request().method() === "POST",
  );
  await page.getByTestId("contact-submit").click();
  return response;
}

async function closeContactReceipt(page) {
  await page.getByTestId("contact-success").getByRole("button", { name: "Close", exact: true }).click();
}

async function selectPaletteContactWithKeyboard(page) {
  const item = page.getByTestId("contact-palette-item");
  for (let index = 0; index < 20; index += 1) {
    if ((await item.getAttribute("data-selected")) === "true") return item;
    await page.keyboard.press("ArrowDown");
  }
  assert.fail("Contact palette item was not reachable with ArrowDown");
}

try {
  if (offState) {
    const page = await pageFor(desktop);
    await page.locator('button[aria-label="Open search"]').click();
    await page.getByPlaceholder(/find resources, categories, or pages/i).waitFor({ state: "visible" });
    const surfaces = await page.locator('[data-testid^="contact-"]').count();
    assert.equal(surfaces, 0, `expected no contact surfaces, found ${surfaces}`);
    await page.keyboard.press("Escape");
    const disabledResponse = await page.evaluate(async (message) => {
      const response = await fetch("/api/contact", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Contact QA",
          replyTo: "contact-qa@example.com",
          subject: "Disabled route check",
          message,
        }),
      });
      return { status: response.status, body: await response.json().catch(() => null) };
    }, `${marker} disabled route probe is never persisted`);
    assert.equal(disabledResponse.status, 404);
    assert.deepEqual(disabledResponse.body, { message: "Not found" });
    results.checks.push("DOM contact surface scan is zero and POST /api/contact is disabled with 404");
  }

  if (variant === "a") {
    const desktopPage = await pageFor(desktop);
    const email = desktopPage.getByText("Email unavailable", { exact: true });
    const issues = desktopPage.getByTestId("contact-report-an-issue");
    await email.waitFor({ state: "visible" });
    await issues.waitFor({ state: "visible" });
    assert.equal(await issues.getAttribute("href"), "https://github.com/krzemienski/awesome-video/issues");
    assert.equal(await issues.getAttribute("target"), "_blank");
    assert.equal(await issues.getAttribute("rel"), "noopener noreferrer");
    await capture(desktopPage);
    const popup = desktop.waitForEvent("page");
    await issues.click();
    const issuesPage = await popup;
    await issuesPage.waitForLoadState("domcontentloaded");
    assert.equal(new URL(issuesPage.url()).origin, "https://github.com");
    assert.match(new URL(issuesPage.url()).pathname, /\/krzemienski\/awesome-video\/issues/);
    results.checks.push("footer shows the honest unavailable email state and opens the configured issue tracker");
    const mobilePage = await pageFor(mobile);
    await mobilePage.getByTestId("contact-report-an-issue").waitFor({ state: "visible" });
    await capture(mobilePage, "-375");
  }

  if (variant === "b") {
    const desktopPage = await pageFor(desktop);
    const trigger = await openContact(desktopPage);
    await capture(desktopPage);
    await capture(desktopPage, "-viewport", false);
    results.tokenResolution = await assertCanonicalContactTokens(desktopPage);
    const axeFindings = await requireNoSeriousAxe(desktopPage, '[data-testid="contact-dialog"]');
    await desktopPage.getByTestId("contact-submit").click();
    await desktopPage.getByText("Name is required", { exact: true }).waitFor({ state: "visible" });
    results.checks.push(`dialog validation and axe (${axeFindings} serious/critical findings)`);

    await fillContact(desktopPage, "escape");
    await desktopPage.keyboard.press("Escape");
    await desktopPage.getByTestId("contact-dialog").waitFor({ state: "hidden" });
    assert.equal(await desktopPage.evaluate(() => document.activeElement?.getAttribute("data-testid")), "contact-open-form");
    results.checks.push("Escape closes the dialog and restores footer trigger focus");

    await openContact(desktopPage);
    await fillContact(desktopPage, "persisted");
    const persistedResponse = await submitContact(desktopPage);
    assert.equal(persistedResponse.status(), 200);
    const persistedReceipt = await persistedResponse.json();
    assert.equal(persistedReceipt.status, "received");
    results.persistedReceiptId = persistedReceipt.id;
    await desktopPage.getByTestId("contact-success").waitFor({ state: "visible" });

    await closeContactReceipt(desktopPage);
    await openContact(desktopPage);
    await fillContact(desktopPage, "honeypot");
    await desktopPage.getByTestId("contact-honeypot").evaluate((input) => {
      // Use the native setter so React's value tracker observes the change.
      // Assigning input.value directly leaves the controlled form state blank.
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")
        ?.set?.call(input, "https://spam.invalid");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const honeypotResponse = await submitContact(desktopPage);
    assert.equal(honeypotResponse.status(), 200);
    assert.equal((await honeypotResponse.json()).status, "received");
    results.checks.push("non-empty honeypot receives a receipt-shaped response");

    for (let sequence = 1; sequence <= 3; sequence += 1) {
      await closeContactReceipt(desktopPage);
      await openContact(desktopPage);
      await fillContact(desktopPage, `limit-${sequence}`);
      const response = await submitContact(desktopPage);
      assert.equal(response.status(), 200);
    }
    await closeContactReceipt(desktopPage);
    await openContact(desktopPage);
    await fillContact(desktopPage, "rate-limit");
    const limitedResponse = await submitContact(desktopPage);
    assert.equal(limitedResponse.status(), 429);
    const retryAfter = limitedResponse.headers()["retry-after"];
    assert.match(retryAfter || "", /^\d+$/);
    await desktopPage.getByTestId("contact-submit-error").waitFor({ state: "visible" });
    assert.equal(await desktopPage.getByTestId("contact-subject").inputValue(), "Task 566 rate-limit");
    results.retryAfter = retryAfter;
    results.checks.push("sixth real POST returns 429 with Retry-After and retains inline form inputs");

    const mobilePage = await pageFor(mobile);
    await openContact(mobilePage);
    const mobileAxe = await requireNoSeriousAxe(mobilePage, '[data-testid="contact-dialog"]');
    results.checks.push(`375px dialog axe (${mobileAxe} serious/critical findings)`);
    await capture(mobilePage, "-375");
    await capture(mobilePage, "-375-viewport", false);
    await trigger.count();
  }

  if (variant === "c") {
    const desktopPage = await pageFor(desktop);
    const discussion = desktopPage.getByTestId("contact-github-discussions");
    await discussion.waitFor({ state: "visible" });
    assert.equal(await discussion.getAttribute("href"), "https://github.com/krzemienski/awesome-video/discussions");
    assert.equal(await discussion.getAttribute("target"), "_blank");
    assert.equal(await discussion.getAttribute("rel"), "noopener noreferrer");
    await capture(desktopPage);
    const popup = desktop.waitForEvent("page");
    await discussion.click();
    const discussionPage = await popup;
    await discussionPage.waitForLoadState("domcontentloaded");
    assert.equal(new URL(discussionPage.url()).origin, "https://github.com");
    assert.match(new URL(discussionPage.url()).pathname, /\/krzemienski\/awesome-video\/discussions/);
    results.checks.push("verified Discussions destination opens in a safe new tab");
    const mobilePage = await pageFor(mobile);
    await mobilePage.getByTestId("contact-github-discussions").waitFor({ state: "visible" });
    await capture(mobilePage, "-375");
  }

  if (variant === "d") {
    const desktopPage = await pageFor(desktop);
    const resourceLink = desktopPage.locator('[data-testid^="card-resource-"] a').first();
    await resourceLink.waitFor({ state: "visible", timeout: 60_000 });
    await resourceLink.click();
    await desktopPage.getByTestId("button-suggest-edit").waitFor({ state: "visible" });
    results.checks.push("resource-level Suggest Edit control renders");
    await capture(desktopPage);
    const mobilePage = await pageFor(mobile);
    const mobileResourceLink = mobilePage.locator('[data-testid^="card-resource-"] a').first();
    await mobileResourceLink.waitFor({ state: "visible", timeout: 60_000 });
    await mobileResourceLink.click();
    await mobilePage.getByTestId("button-suggest-edit").waitFor({ state: "visible" });
    await capture(mobilePage, "-375");
  }

  if (variant === "e") {
    const desktopPage = await pageFor(desktop);
    await desktopPage.keyboard.press(process.platform === "darwin" ? "Meta+K" : "Control+K");
    await desktopPage.getByTestId("contact-palette-item").waitFor({ state: "visible" });
    await capture(desktopPage);
    await capture(desktopPage, "-palette-viewport", false);
    await selectPaletteContactWithKeyboard(desktopPage);
    if (process.env.CONTACT_E_EXPECT_FALLBACK === "true") {
      const popup = desktop.waitForEvent("page");
      await desktopPage.keyboard.press("Enter");
      const fallbackPage = await popup;
      await fallbackPage.waitForLoadState("domcontentloaded");
      assert.equal(new URL(fallbackPage.url()).origin, "https://github.com");
      assert.match(new URL(fallbackPage.url()).pathname, /\/krzemienski\/awesome-video\/issues/);
      results.checks.push("keyboard palette selection opens the first configured external destination");
    } else {
      await desktopPage.keyboard.press("Enter");
      await desktopPage.getByTestId("contact-dialog").waitFor({ state: "visible" });
      results.tokenResolution = await assertCanonicalContactTokens(desktopPage);
      results.checks.push("keyboard palette selection opens the configured form");
      await capture(desktopPage, "-form");
      await capture(desktopPage, "-form-viewport", false);
    }
    const mobilePage = await pageFor(mobile);
    await mobilePage.keyboard.press(process.platform === "darwin" ? "Meta+K" : "Control+K");
    await mobilePage.getByTestId("contact-palette-item").waitFor({ state: "visible" });
    if (process.env.CONTACT_E_EXPECT_FALLBACK !== "true") {
      await capture(mobilePage, "-375");
      await capture(mobilePage, "-375-viewport", false);
    }
  }

  process.stdout.write(`${JSON.stringify(results)}\n`);
} finally {
  await desktop.close();
  await mobile.close();
  await browser.close();
}
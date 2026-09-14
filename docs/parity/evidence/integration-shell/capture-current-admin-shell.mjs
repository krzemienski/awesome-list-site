#!/usr/bin/env node
/**
 * Current four-width admin-shell geometry capture.
 *
 * This is deliberately narrow: it uses the normal local app and a real
 * disposable Nick admin, navigates to /admin exactly once, then resizes that
 * same document for screenshots and shell-only assertions. It does not use
 * the cold static read-only guard, route interception, SDK exceptions, admin
 * CRUD, or body/pixel comparisons.
 *
 * Parent execution only:
 *
 *   CLERK_SECRET_KEY=... ADMIN_PASSWORD=... \
 *   node docs/parity/evidence/integration-shell/capture-current-admin-shell.mjs \
 *     --out /tmp/validation/task565-current-admin-shell
 *
 * Screenshots are the requested four-width screen evidence. The JSON report
 * intentionally retains only shell geometry, booleans/counts, viewport values,
 * and teardown completion—not identity values, API/Clerk bodies, cookies,
 * tokens, or admin-body content. This is token-only shell geometry evidence,
 * not an admin-body pixel pass.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { launchBrowserWithLease } from "../../../../scripts/validation/playwright-launch-lease.mjs";
import {
  createDisposableAdmin,
  identityAvailability,
} from "../../../../tests/parity/identity.mjs";

const BASE = "http://127.0.0.1:5000";
const DEFAULT_OUT = "/tmp/validation/task565-current-admin-shell";
const VIEWPORTS = [
  { width: 375, height: 812 },
  { width: 768, height: 900 },
  { width: 1024, height: 900 },
  { width: 1440, height: 900 },
];
const ADMIN_MAX_WIDTH = 1400;

function parseArgs(argv) {
  const args = { out: DEFAULT_OUT };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--out") {
      const value = argv[++index];
      if (!value) throw new Error("--out requires a value");
      args.out = value;
    } else if (flag === "--help" || flag === "-h") {
      console.log("Usage: CLERK_SECRET_KEY=... ADMIN_PASSWORD=... node docs/parity/evidence/integration-shell/capture-current-admin-shell.mjs [--out /tmp/validation/task565-current-admin-shell]");
      process.exit(0);
    } else {
      throw new Error(`Unknown argument ${flag}`);
    }
  }
  const availability = identityAvailability();
  if (!availability.ok) {
    throw new Error(`Real disposable Clerk identity is required: missing ${availability.missing.join(", ")}`);
  }
  return { out: path.resolve(args.out) };
}

function chromiumLaunchOptions() {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim();
  return {
    headless: true,
    chromiumSandbox: true,
    ...(executablePath ? { executablePath } : {}),
  };
}

async function shellGeometry(page) {
  return page.evaluate(() => {
    const main = document.querySelector("main#main.app-shell-main");
    const content = main?.querySelector(":scope > .page-content-wrap");
    const root = document.documentElement;
    const isRendered = (element) => {
      if (!element) return false;
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
    };
    const rect = (element) => {
      if (!element) return null;
      const box = element.getBoundingClientRect();
      return {
        x: Math.round(box.x * 100) / 100,
        y: Math.round(box.y * 100) / 100,
        width: Math.round(box.width * 100) / 100,
        height: Math.round(box.height * 100) / 100,
      };
    };
    const rootStyle = getComputedStyle(root);
    const contentStyle = content ? getComputedStyle(content) : null;
    const visibleFooterCount = [...document.querySelectorAll('[data-testid^="footer-"]')]
      .filter(isRendered)
      .length;
    const pageScrollWidth = Math.max(root.scrollWidth, document.body?.scrollWidth ?? 0);
    const viewportWidth = root.clientWidth;
    return {
      adminAuthorized: isRendered(document.querySelector('[data-testid="admin-authorized"]')),
      footerVisible: isRendered(document.querySelector(".site-footer")),
      visibleFooterCount,
      horizontalOverflow: pageScrollWidth > viewportWidth,
      viewport: { width: viewportWidth, height: window.innerHeight },
      pageScrollWidth,
      main: rect(main),
      content: rect(content),
      adminMaxWidthToken: rootStyle.getPropertyValue("--content-max-admin").trim(),
      contentMaxWidth: contentStyle?.maxWidth ?? null,
      adminDataAttribute: content?.getAttribute("data-admin") === "true",
    };
  });
}

function teardownSummary(outcome) {
  return {
    attempted: true,
    completed: outcome.errors.length === 0,
    localDeleted: Boolean(outcome.localDeleted),
    clerkDeleted: Boolean(outcome.clerkDeleted),
    localQaUsersRemaining: outcome.verification?.localQaUsersRemaining?.length ?? null,
    errorCount: outcome.errors.length,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  fs.mkdirSync(args.out, { recursive: true });
  const captures = [];
  let teardown = { attempted: false, completed: false };
  let runFailed = false;
  const browser = await launchBrowserWithLease(
    chromium,
    chromiumLaunchOptions(),
    "task565-current-admin-shell",
  );
  try {
    const identity = await createDisposableAdmin({
      browser,
      appBase: BASE,
      secretKey: process.env.CLERK_SECRET_KEY,
      auditKey: process.env.ADMIN_PASSWORD,
      log: () => {},
    });
    try {
      await identity.page.setViewportSize(VIEWPORTS[0]);
      // The sole admin navigation in this capture. Subsequent widths resize the
      // same settled document and do not navigate or click any admin control.
      await identity.page.goto(`${BASE}/admin`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await identity.page.getByTestId("admin-authorized").waitFor({
        state: "visible",
        timeout: 30_000,
      });

      for (const viewport of VIEWPORTS) {
        await identity.page.setViewportSize(viewport);
        await identity.page.waitForTimeout(250);
        const geometry = await shellGeometry(identity.page);
        const screenshot = `admin-shell-${viewport.width}.png`;
        await identity.page.screenshot({
          path: path.join(args.out, screenshot),
          fullPage: true,
        });
        captures.push({
          width: viewport.width,
          height: viewport.height,
          screenshot,
          ...geometry,
        });
      }
    } finally {
      try {
        teardown = teardownSummary(await identity.teardown());
      } catch (error) {
        const outcome = error?.outcome;
        teardown = outcome
          ? teardownSummary(outcome)
          : { attempted: true, completed: false, errorCount: 1 };
      }
    }
  } catch (error) {
    // Do not retain an error message: it could include an identity or external
    // provider detail. The report remains sufficient to identify this run phase.
    runFailed = true;
  } finally {
    await browser.close().catch(() => {});
  }

  const checks = {
    fourWidthsCaptured: captures.length === VIEWPORTS.length,
    adminAuthorized: captures.length === VIEWPORTS.length && captures.every((capture) => capture.adminAuthorized),
    footerAbsent: captures.length === VIEWPORTS.length && captures.every((capture) => !capture.footerVisible && capture.visibleFooterCount === 0),
    noHorizontalOverflow: captures.length === VIEWPORTS.length && captures.every((capture) => !capture.horizontalOverflow),
    adminMaxWidthToken1400: captures.length === VIEWPORTS.length && captures.every(
      (capture) => capture.adminMaxWidthToken === `${ADMIN_MAX_WIDTH}px` && capture.contentMaxWidth === `${ADMIN_MAX_WIDTH}px`,
    ),
    teardownCompleted: teardown.completed === true,
  };
  const report = {
    schemaVersion: 1,
    purpose: "Current four-width normal-auth admin-shell geometry/screenshots; token-only shell evidence, not admin-body pixel comparison",
    capturedAt: new Date().toISOString(),
    base: BASE,
    controls: {
      realDisposableNick: true,
      normalApplicationAuth: true,
      adminNavigations: 1,
      resizeOnlyAfterAdminNavigation: true,
      browserInterception: "none",
      sdkExceptions: "none",
      adminCrudInteractions: "none",
      retainedData: "viewport, shell geometry, booleans/counts, screenshot filenames, and created-identity teardown only",
    },
    captures,
    checks,
    teardown,
    runFailed,
    pass: !runFailed && Object.values(checks).every(Boolean),
  };
  fs.writeFileSync(path.join(args.out, "summary.json"), `${JSON.stringify(report, null, 2)}\n`);
  for (const [name, passed] of Object.entries(checks)) {
    console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
  }
  if (runFailed) console.log("FAIL run");
  console.log(`Report: ${path.join(args.out, "summary.json")}`);
  return report.pass ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(2);
  },
);

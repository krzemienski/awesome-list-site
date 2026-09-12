import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchBrowserWithLease } from "./playwright-launch-lease.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BASE = process.env.AUDIT_BASE_URL || "http://localhost:5000";
const APP_ORIGIN = new URL(BASE).origin;
const AUDIT_KEY = process.env.ADMIN_PASSWORD;

const read = (path) => fs.readFileSync(path, "utf8");
const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const runtime = read("client/src/lib/design-system.ts");
const app = read("client/src/App.tsx");
const boot = read("client/index.html");
const vite = read("vite.config.ts");
const profileCss = read("shared/styles/product-profiles.css");
const clientCss = read("client/src/styles/design-system.css");
const mainLayout = read("client/src/components/layout/new/MainLayout.tsx");
const main = read("client/src/main.tsx");
const button = read("client/src/components/ui/button.tsx");
const card = read("client/src/components/ui/card.tsx");
const exportTools = read("client/src/components/ui/export-tools.tsx");
// The standalone design-system surface is the registered artifact. The
// canonical reference under awesome-list-site-ds/ is an archive-identical
// source (docs/parity/source-sync.json) and is intentionally never edited.
const artifactEntry = read("artifacts/awesome-video-design-system/index.html");
const artifactCss = read("artifacts/awesome-video-design-system/src/index.css");
const mockupEntry = read("artifacts/mockup-sandbox/index.html");
const mockupCss = read("artifacts/mockup-sandbox/src/index.css");
const mockupApp = read("artifacts/mockup-sandbox/src/App.tsx");

const profiles = [
  "public-discovery",
  "learning-workspace",
  "admin-operations",
  "standalone-exports",
  "embedded-integrations",
];

const profileTokens = [
  "--profile-content-gap",
  "--profile-control-height",
  "--profile-panel-padding",
  "--profile-page-measure",
  "--profile-chrome-opacity",
];

for (const profile of profiles) {
  expect(runtime.includes(`"${profile}": {`), `Missing ${profile} runtime profile`);
  expect(
    profileCss.includes(`data-product-profile="${profile}"`),
    `Missing ${profile} semantic token selector`,
  );
}

for (const token of profileTokens) {
  expect(
    profileCss.match(new RegExp(token, "g"))?.length === profiles.length + 1,
    `${token} is not declared once per profile plus the root fallback`,
  );
}

expect(
  profileCss.includes("@media (prefers-reduced-motion: reduce)") &&
    profileCss.includes("animation-duration: 0.01ms !important"),
  "Shared profile foundation does not enforce reduced-motion behavior",
);
expect(
  runtime.includes("defaultSystem: null") && runtime.includes("defaultAccent: null"),
  "Embedded integrations are not host-neutral with inherited accent",
);
expect(app.includes("resolveProductProfile(location)"), "SPA routes do not resolve a product profile");
expect(app.includes("productProfile={productProfile}"), "MainLayout does not declare its product profile");
expect(
  boot.includes("PRODUCT_PROFILE_BOOT.profiles[profile]"),
  "Pre-paint boot does not select profile defaults",
);
expect(
  runtime.includes("PRODUCT_PROFILE_ROUTE_PATTERNS") &&
    boot.includes("PRODUCT_PROFILE_BOOT.routePatterns.admin") &&
    boot.includes("PRODUCT_PROFILE_BOOT.routePatterns.learning"),
  "Runtime and pre-paint route classification do not share one generated source",
);
expect(
  main.includes('document.documentElement.getAttribute("data-system")') &&
    main.includes("loadDesignSystemFont(resolveSystemId(selectedSystemAtBoot))") &&
    !main.includes('selectedSystemAtBoot = localStorage.getItem("ds-system")'),
  "Initial font loading does not consume the profile/saved system resolved before paint",
);
expect(
  vite.includes("PRODUCT_PROFILE_BOOT_DATA") &&
    vite.includes("__AWESOME_VIDEO_PRODUCT_PROFILE_BOOT__"),
  "Vite does not inject generated product-profile boot data",
);

const surfaces = [
  {
    name: "SPA",
    entry: boot,
    profile: "public-discovery",
    adapter: clientCss,
    importPath: "../../../shared/styles/product-profiles.css",
    consumers: [
      [mainLayout, "--profile-page-measure"],
      [button, "--profile-control-height"],
      [card, "--profile-panel-padding"],
    ],
  },
  {
    name: "standalone design-system artifact",
    entry: artifactEntry,
    profile: "standalone-exports",
    // The artifact reaches the shared foundation through the app stylesheet
    // (design-system.css imports product-profiles.css; the SPA surface above
    // asserts that hop), so both hops of the chain are covered.
    adapter: artifactCss,
    importPath: "../../../client/src/styles/design-system.css",
    consumers: [
      // The docs measure (920px) is canonical docs.html chrome, so the
      // artifact deliberately does not consume --profile-page-measure; see
      // docs/parity/assumptions/foundation.md.
      [artifactCss, "--profile-control-height"],
    ],
  },
  {
    name: "mockup sandbox",
    entry: mockupEntry,
    profile: "standalone-exports",
    adapter: mockupCss,
    importPath: "../../../shared/styles/product-profiles.css",
    consumers: [
      [mockupCss, "--profile-panel-padding"],
      [mockupCss, "--profile-content-gap"],
      [mockupCss, "--profile-page-measure"],
      [mockupApp, "profile-gallery-shell"],
    ],
  },
];

for (const surface of surfaces) {
  expect(
    surface.entry.includes(`data-product-profile="${surface.profile}"`),
    `${surface.name} does not declare ${surface.profile}`,
  );
  expect(
    surface.adapter.includes(`@import "${surface.importPath}"`),
    `${surface.name} does not import the shared profile foundation`,
  );
  for (const [source, role] of surface.consumers) {
    expect(source.includes(role), `${surface.name} does not consume ${role}`);
  }
}

expect(
  exportTools.includes('data-product-profile="standalone-exports"'),
  "Generated HTML downloads do not declare standalone-exports",
);
const artifactGeneration = spawnSync(
  process.execPath,
  ["scripts/generate-design-system-artifact.mjs", "--check"],
  { encoding: "utf8" },
);
expect(
  artifactGeneration.status === 0,
  artifactGeneration.stderr.trim() ||
    "Design-system artifact tokens (incl. productProfiles) are stale",
);

if (failures.length) {
  console.error(`Product profile drift (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

if (!process.argv.includes("--browser")) {
  console.log(`Product profile drift: PASS (${profiles.length} approved profiles)`);
  process.exit(0);
}

function chromePath() {
  const cache = path.join(ROOT, ".cache/ms-playwright");
  const dir = fs.readdirSync(cache).filter((entry) => /^chromium-\d+$/.test(entry)).sort().pop();
  if (!dir) {
    throw new Error("No chromium-* dir in .cache/ms-playwright — run npx playwright install chromium");
  }
  return path.join(cache, dir, "chrome-linux64/chrome");
}

async function waitForServer() {
  const deadline = Date.now() + 120_000;
  let lastError = "no response";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE}/`, { method: "HEAD" });
      if (response.ok) return;
      lastError = `status ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error(`App not reachable at ${BASE} after 120s (${lastError})`);
}

const routeFamilies = [
  {
    route: "/",
    profile: "public-discovery",
    defaultSystem: "editorial",
    defaultAccent: "crimson",
    density: {
      "--profile-content-gap": "1.5rem",
      "--profile-control-height": "2.75rem",
      "--profile-panel-padding": "1.5rem",
      "--profile-page-measure": "80rem",
      "--profile-chrome-opacity": "0.88",
    },
  },
  {
    route: "/settings/theme",
    profile: "learning-workspace",
    defaultSystem: "geist",
    defaultAccent: "cyan",
    density: {
      "--profile-content-gap": "1.25rem",
      "--profile-control-height": "2.75rem",
      "--profile-panel-padding": "1.25rem",
      "--profile-page-measure": "72rem",
      "--profile-chrome-opacity": "0.92",
    },
  },
  {
    route: "/admin",
    profile: "admin-operations",
    defaultSystem: "swiss",
    defaultAccent: "orange",
    density: {
      "--profile-content-gap": "0.75rem",
      // Every profile shares the 44px accessible-target floor (see
      // shared/styles/product-profiles.css); admin no longer runs denser.
      "--profile-control-height": "2.75rem",
      "--profile-panel-padding": "1rem",
      "--profile-page-measure": "80rem",
      "--profile-chrome-opacity": "0.96",
    },
  },
];

async function inspectRoute(browser, family, saved) {
  const context = await browser.newContext();
  if (family.profile === "admin-operations") {
    await context.route("**/*", (route) => {
      let sameOrigin = false;
      try {
        sameOrigin = new URL(route.request().url()).origin === APP_ORIGIN;
      } catch {
        // Opaque schemes (data:, about:) never receive the audit credential.
      }
      if (sameOrigin) {
        route.continue({
          headers: { ...route.request().headers(), "x-admin-audit-key": AUDIT_KEY },
        });
      } else {
        route.continue();
      }
    });

    let probeHeaders = null;
    await context.route("https://audit-key-leak-probe.invalid/**", (route) => {
      probeHeaders = route.request().headers();
      route.fulfill({ status: 200, contentType: "text/plain", body: "probe" });
    });
    const probePage = await context.newPage();
    await probePage.goto("https://audit-key-leak-probe.invalid/profile-theme").catch(() => {});
    await probePage.close();
    await context.unroute("https://audit-key-leak-probe.invalid/**");
    if (!probeHeaders) {
      await context.close();
      throw new Error("Cross-origin audit-key leak probe never ran");
    }
    if (Object.keys(probeHeaders).some((header) => header.toLowerCase() === "x-admin-audit-key")) {
      await context.close();
      throw new Error("Admin audit key leaked to a cross-origin request");
    }
    console.log(`Audit key scope: PASS (${family.route} ${saved.system ?? "clean"}/${saved.accent ?? "clean"})`);
  }
  await context.addInitScript(({ system, accent, blocked }) => {
    window.__profileStorageCalls = { getItem: 0, setItem: 0, removeItem: 0 };
    if (blocked) {
      const nativeStorage = window.localStorage;
      // Deny the app-owned theme keys without turning this focused profile gate
      // into a compatibility test for Clerk's separately managed session keys.
      const themeKeys = new Set(["ds-system", "ds-accent"]);
      const deniedStorage = new Proxy(nativeStorage, {
        get(target, property) {
          if (property === "getItem" || property === "setItem" || property === "removeItem") {
            return function (key, ...args) {
              if (themeKeys.has(String(key))) {
                window.__profileStorageCalls[property] += 1;
                throw new DOMException("Theme storage access denied by profile audit", "SecurityError");
              }
              return target[property](key, ...args);
            };
          }
          const value = Reflect.get(target, property, target);
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
      Object.defineProperty(window, "localStorage", {
        configurable: true,
        value: deniedStorage,
      });
    } else {
      if (system === null) localStorage.removeItem("ds-system");
      else localStorage.setItem("ds-system", system);
      if (accent === null) localStorage.removeItem("ds-accent");
      else localStorage.setItem("ds-accent", accent);
    }

    window.__profileAttributeWrites = {
      "data-product-profile": [],
      "data-system": [],
      "data-accent": [],
    };
    const original = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (name, value) {
      if (
        this === document.documentElement &&
        Object.prototype.hasOwnProperty.call(window.__profileAttributeWrites, name)
      ) {
        window.__profileAttributeWrites[name].push(String(value));
      }
      return original.call(this, name, value);
    };
  }, saved);

  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.stack || error.message));
  try {
    const response = await page.goto(`${BASE}${family.route}`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    if (!response?.ok()) {
      throw new Error(`${family.route} returned ${response?.status() ?? "no status"}`);
    }
    try {
      await page.waitForFunction(
        () => Object.values(window.__profileAttributeWrites || {})
          .every((writes) => writes.length >= 2),
        undefined,
        { timeout: 30_000 },
      );
    } catch (error) {
      const writes = await page.evaluate(() => window.__profileAttributeWrites);
      throw new Error(
        `${family.route} theme mount did not complete; writes=${JSON.stringify(writes)}; ` +
        `pageErrors=${JSON.stringify(pageErrors)}`,
        { cause: error },
      );
    }
    const readState = async () => page.evaluate((densityRoles) => {
        const root = document.documentElement;
        const styles = getComputedStyle(root);
        return {
          first: Object.fromEntries(
            Object.entries(window.__profileAttributeWrites)
              .map(([attribute, writes]) => [attribute, writes[0]]),
          ),
          final: {
            "data-product-profile": root.getAttribute("data-product-profile"),
            "data-system": root.getAttribute("data-system"),
            "data-accent": root.getAttribute("data-accent"),
          },
          density: Object.fromEntries(densityRoles.map((role) => [role, styles.getPropertyValue(role).trim()])),
          saved: (() => {
            try {
              return {
                system: localStorage.getItem("ds-system"),
                accent: localStorage.getItem("ds-accent"),
              };
            } catch {
              return null;
            }
          })(),
          storageCalls: { ...window.__profileStorageCalls },
        };
      }, Object.keys(family.density));

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await readState();
      } catch (error) {
        if (!String(error).includes("Execution context was destroyed") || attempt === 2) throw error;
        await page.waitForLoadState("domcontentloaded", { timeout: 30_000 });
      }
    }
  } finally {
    await context.close();
  }
}

async function inspectCrossTabThemeSync(browser) {
  const context = await browser.newContext();
  const writer = await context.newPage();
  const receiver = await context.newPage();

  const readTheme = (page) => page.evaluate(() => ({
    profile: document.documentElement.getAttribute("data-product-profile"),
    system: document.documentElement.getAttribute("data-system"),
    accent: document.documentElement.getAttribute("data-accent"),
    font: document.documentElement.getAttribute("data-font"),
    fontBody: document.documentElement.style.getPropertyValue("--font-body"),
  }));
  const waitForTheme = (page, system, accent) => page.waitForFunction(
    ({ expectedSystem, expectedAccent }) => {
      const root = document.documentElement;
      return root.getAttribute("data-system") === expectedSystem
        && root.getAttribute("data-accent") === expectedAccent;
    },
    { expectedSystem: system, expectedAccent: accent },
    { timeout: 10_000 },
  );

  try {
    await receiver.goto(`${BASE}/settings/theme`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await receiver.waitForSelector('[data-testid="system-picker"]', { timeout: 30_000 });
    await writer.goto(`${BASE}/design-system`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await writer.waitForSelector('[data-testid="ds-system-switcher"]', { timeout: 30_000 });

    await writer.click('[data-testid="ds-system-terminal"]');
    await writer.click('[data-testid="ds-accent-violet"]');
    await waitForTheme(receiver, "terminal", "violet");
    let state = await readTheme(receiver);
    expect(
      state.profile === "learning-workspace",
      `Cross-tab valid update reset the receiving profile to ${state.profile}`,
    );

    await writer.evaluate(() => {
      localStorage.setItem("ds-font-override", "ibm-plex");
    });
    await receiver.waitForFunction(
      () => document.documentElement.getAttribute("data-font") === "ibm-plex",
      undefined,
      { timeout: 10_000 },
    );
    state = await readTheme(receiver);
    expect(
      state.fontBody.includes("IBM Plex Sans"),
      `Cross-tab font update did not apply the IBM Plex stack: ${state.fontBody}`,
    );
    expect(
      state.profile === "learning-workspace" && state.system === "terminal" && state.accent === "violet",
      `Cross-tab font update changed unrelated theme state: ${JSON.stringify(state)}`,
    );
    expect(
      await receiver.locator('[data-testid="font-option-ibm-plex"]').getAttribute("aria-checked") === "true",
      "Cross-tab font update did not update the receiving picker",
    );
    expect(
      await receiver.locator('link[data-font-option="ibm-plex"]').count() === 1,
      "Cross-tab font update did not load the selected font stylesheet",
    );

    await writer.evaluate(() => {
      localStorage.setItem("ds-font-override", "retired-font");
    });
    await receiver.waitForFunction(
      () => document.documentElement.getAttribute("data-font") === "system",
      undefined,
      { timeout: 10_000 },
    );
    state = await readTheme(receiver);
    expect(
      state.fontBody === "",
      `Cross-tab invalid font did not clear the override: ${state.fontBody}`,
    );
    expect(
      state.profile === "learning-workspace" && state.system === "terminal" && state.accent === "violet",
      `Cross-tab invalid font fallback changed unrelated theme state: ${JSON.stringify(state)}`,
    );

    await writer.evaluate(() => {
      localStorage.removeItem("ds-font-override");
    });
    await receiver.waitForFunction(
      () => document.documentElement.getAttribute("data-font") === "system",
      undefined,
      { timeout: 10_000 },
    );
    state = await readTheme(receiver);
    expect(
      state.font === "system" && state.fontBody === "",
      `Cross-tab cleared font did not retain the system fallback: ${JSON.stringify(state)}`,
    );

    await writer.evaluate(() => {
      localStorage.setItem("ds-system", "retired-system");
      localStorage.setItem("ds-accent", "retired-accent");
    });
    await waitForTheme(receiver, "editorial", "crimson");
    state = await readTheme(receiver);
    expect(
      state.profile === "learning-workspace",
      `Cross-tab invalid fallback reset the receiving profile to ${state.profile}`,
    );

    await writer.evaluate(() => {
      localStorage.removeItem("ds-system");
      localStorage.removeItem("ds-accent");
    });
    await waitForTheme(receiver, "editorial", "crimson");
    state = await readTheme(receiver);
    expect(
      state.profile === "learning-workspace",
      `Cross-tab removed-value fallback reset the receiving profile to ${state.profile}`,
    );
  } finally {
    await context.close();
  }
}

await waitForServer();
if (!AUDIT_KEY || AUDIT_KEY.length < 8) {
  throw new Error("ADMIN_PASSWORD (>=8 chars) is required to inspect the protected admin document");
}
const { chromium } = await import(path.join(ROOT, "node_modules/playwright/index.mjs"));
const browser = await launchBrowserWithLease(
  chromium,
  {
    headless: true,
    executablePath: chromePath(),
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  },
  "product-profile-browser",
);

try {
  for (const family of routeFamilies) {
    const scenarios = [
      {
        name: "storage-blocked",
        saved: { system: null, accent: null, blocked: true },
        expectedSystem: family.defaultSystem,
        expectedAccent: family.defaultAccent,
        storageBlocked: true,
      },
      {
        name: "clean",
        saved: { system: null, accent: null },
        expectedSystem: family.defaultSystem,
        expectedAccent: family.defaultAccent,
      },
      {
        name: "saved-valid",
        saved: { system: "terminal", accent: "violet" },
        expectedSystem: "terminal",
        expectedAccent: "violet",
      },
      {
        name: "saved-invalid",
        saved: { system: "retired-system", accent: "retired-accent" },
        expectedSystem: family.defaultSystem,
        expectedAccent: family.defaultAccent,
      },
      {
        name: "saved-invalid-system",
        saved: { system: "retired-system", accent: "violet" },
        expectedSystem: family.defaultSystem,
        expectedAccent: "violet",
      },
      {
        name: "saved-invalid-accent",
        saved: { system: "terminal", accent: "retired-accent" },
        expectedSystem: "terminal",
        expectedAccent: family.defaultAccent,
      },
    ];

    for (const scenario of scenarios) {
      const result = await inspectRoute(browser, family, scenario.saved);
      const expected = {
        "data-product-profile": family.profile,
        "data-system": scenario.expectedSystem,
        "data-accent": scenario.expectedAccent,
      };
      for (const [attribute, value] of Object.entries(expected)) {
        expect(
          result.first[attribute] === value,
          `${family.route} ${scenario.name} pre-paint ${attribute}: expected ${value}, got ${result.first[attribute]}`,
        );
        expect(
          result.final[attribute] === value,
          `${family.route} ${scenario.name} runtime ${attribute}: expected ${value}, got ${result.final[attribute]}`,
        );
      }
      for (const [role, value] of Object.entries(family.density)) {
        expect(
          result.density[role] === value,
          `${family.route} ${scenario.name} ${role}: expected ${value}, got ${result.density[role]}`,
        );
      }
      if (scenario.storageBlocked) {
        expect(
          result.saved === null,
          `${family.route} ${scenario.name} unexpectedly regained localStorage access`,
        );
        expect(
          result.storageCalls.getItem >= 1 && result.storageCalls.setItem >= 1,
          `${family.route} ${scenario.name} did not exercise denied theme reads and writes`,
        );
      } else {
        expect(
          result.saved.system === scenario.expectedSystem && result.saved.accent === scenario.expectedAccent,
          `${family.route} ${scenario.name} did not persist the resolved theme consistently`,
        );
      }
    }
  }
  await inspectCrossTabThemeSync(browser);
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`Product profile browser drift (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  `Product profile drift: PASS (${profiles.length} approved profiles; ${routeFamilies.length * 6} route scenarios; cross-tab theme and font sync)`,
);
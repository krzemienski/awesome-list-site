import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { FONT_BOOT_DATA, FONT_LS_KEY, FONT_OPTIONS } from "../../client/src/lib/font-options";
import { launchBrowserWithLease } from "./playwright-launch-lease.mjs";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const BASE_URL = process.env.AUDIT_BASE_URL ?? "http://127.0.0.1:5000";
const UNKNOWN_FONT_ID = "__unknown-font-audit__";

type FontWrites = {
  dataFont: string[];
  fontBody: string[];
  fontSans: string[];
};

declare global {
  interface Window {
    __fontPrepaintWrites?: FontWrites;
  }
}

function chromiumPath(): string {
  const cache = path.join(ROOT, ".cache", "ms-playwright");
  const directory = fs
    .readdirSync(cache)
    .filter((entry) => /^chromium-\d+$/.test(entry))
    .sort()
    .pop();
  if (!directory) {
    throw new Error("No chromium-* dir in .cache/ms-playwright — run npx playwright install chromium");
  }
  return path.join(cache, directory, "chrome-linux64", "chrome");
}

async function waitForServer(): Promise<void> {
  const deadline = Date.now() + 120_000;
  let lastError = "no response";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(BASE_URL, { method: "HEAD" });
      if (response.ok) return;
      lastError = `status ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error(`App not reachable at ${BASE_URL} after 120s (${lastError})`);
}

await waitForServer();

const browser = await launchBrowserWithLease(
  chromium,
  {
    headless: true,
    executablePath: chromiumPath(),
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  },
  "font-prepaint-audit",
);

const context = await browser.newContext();
await context.addInitScript(() => {
  const writes: FontWrites = { dataFont: [], fontBody: [], fontSans: [] };
  window.__fontPrepaintWrites = writes;

  const nativeSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name, value) {
    if (this === document.documentElement && name === "data-font") {
      writes.dataFont.push(String(value));
    }
    return nativeSetAttribute.call(this, name, value);
  };

  const nativeSetProperty = CSSStyleDeclaration.prototype.setProperty;
  CSSStyleDeclaration.prototype.setProperty = function (property, value, priority) {
    if (this === document.documentElement.style) {
      if (property === "--font-body") writes.fontBody.push(String(value));
      if (property === "--font-sans") writes.fontSans.push(String(value));
    }
    return nativeSetProperty.call(this, property, value, priority);
  };
});

const page = await context.newPage();
const failures: string[] = [];

try {
  const response = await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 45_000 });
  if (!response?.ok()) throw new Error(`Initial document returned ${response?.status() ?? "no status"}`);

  const scenarios = [
    ...FONT_OPTIONS.map(({ id, stack }) => ({
      requestedId: id,
      expectedId: id,
      expectedStack: stack,
    })),
    {
      requestedId: UNKNOWN_FONT_ID,
      expectedId: FONT_BOOT_DATA.fallback,
      expectedStack: FONT_BOOT_DATA.stacks[FONT_BOOT_DATA.fallback],
    },
  ];

  for (const scenario of scenarios) {
    await page.evaluate(
      ({ key, id }) => localStorage.setItem(key, id),
      { key: FONT_LS_KEY, id: scenario.requestedId },
    );
    const reload = await page.reload({ waitUntil: "domcontentloaded", timeout: 45_000 });
    if (!reload?.ok()) {
      failures.push(
        `font id ${JSON.stringify(scenario.requestedId)}: reload returned ${reload?.status() ?? "no status"}`,
      );
      continue;
    }

    const observed = await page.evaluate(() => {
      const root = document.documentElement;
      const writes = window.__fontPrepaintWrites ?? {
        dataFont: [],
        fontBody: [],
        fontSans: [],
      };
      return {
        firstWrites: {
          dataFont: writes.dataFont[0] ?? null,
          fontBody: writes.fontBody[0] ?? null,
          fontSans: writes.fontSans[0] ?? null,
        },
        inline: {
          dataFont: root.getAttribute("data-font"),
          fontBody: root.style.getPropertyValue("--font-body"),
          fontSans: root.style.getPropertyValue("--font-sans"),
        },
      };
    });

    const expectedWrite = scenario.expectedStack || null;
    const passes =
      observed.firstWrites.dataFont === scenario.expectedId &&
      observed.firstWrites.fontBody === expectedWrite &&
      observed.firstWrites.fontSans === expectedWrite &&
      observed.inline.dataFont === scenario.expectedId &&
      observed.inline.fontBody === scenario.expectedStack &&
      observed.inline.fontSans === scenario.expectedStack;

    if (!passes) {
      failures.push(
        `font id ${JSON.stringify(scenario.requestedId)}: expected ` +
          `${JSON.stringify({
            dataFont: scenario.expectedId,
            fontBody: scenario.expectedStack,
            fontSans: scenario.expectedStack,
          })}; observed pre-paint ${JSON.stringify(observed)}`,
      );
    } else {
      console.log(
        `font-prepaint ${scenario.requestedId}: PASS ` +
          `(data-font=${scenario.expectedId}, stack=${JSON.stringify(scenario.expectedStack)})`,
      );
    }
  }
} finally {
  await context.close();
  await browser.close();
}

if (failures.length > 0) {
  console.error(`Font pre-paint audit failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  `Font pre-paint audit: PASS (${FONT_OPTIONS.length} saved font ids + unknown-id fallback)`,
);
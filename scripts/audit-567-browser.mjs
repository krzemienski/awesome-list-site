#!/usr/bin/env node
/**
 * Task 567 browser evidence.
 *
 * This is deliberately an evidence runner, not a product test fixture.  It
 * drives the shipped /settings/theme controls, keeps the five systems and ten
 * accents in real localStorage, captures the four requested surfaces at four
 * widths, and runs axe against every app row in the generated parity
 * inventory at 375/1440.  A fresh Nick admin is created through the parity
 * identity helper and only that identity is torn down.
 *
 * Usage:
 *   BASE_URL=http://127.0.0.1:5000 \
 *   CLERK_SECRET_KEY=... ADMIN_PASSWORD=... \
 *   node scripts/audit-567-browser.mjs --phase all
 *
 * Phases are independently resumable with `--resume`: theme, runtime, smoke,
 * axe, font-prepaint, or all.  Every completed cell updates the checkpoint
 * before the next browser operation.  A PNG without a matching run-scoped
 * metadata row and SHA-256 is never accepted as resumed evidence.
 *
 * The default staging directory is .cache/audit-567-run.  Only the published
 * evidence directories and this script are retained in the repository.
 */
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import { launchBrowserWithLease } from "./validation/playwright-launch-lease.mjs";
import {
  createDisposableAdmin,
  declineAnalyticsConsentViaUi,
  identityAvailability,
} from "../tests/parity/identity.mjs";
import { loadInventory } from "../tests/parity/inventory.mjs";
import {
  buildCatalogAdapter,
  resolveCatalogTokens,
  resolvePathTemplate,
} from "../tests/parity/reference-adapter.mjs";
import { applyAction } from "../tests/parity/actions.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.env.BASE_URL || "http://127.0.0.1:5000").replace(/\/+$/, "");
const OUT = path.resolve(process.env.AUDIT_567_OUT || path.join(ROOT, ".cache", "audit-567-run"));
const REPORT_PATH = path.join(OUT, "audit-567-summary.json");
const PUBLISHED_MULTI = path.join(ROOT, "docs", "parity", "evidence", "multi-system");
const PUBLISHED_AXE = path.join(ROOT, "docs", "parity", "evidence", "axe");
const PUBLISHED_WORKLOG = path.join(ROOT, "docs", "parity", "worklog", "audit-567-browser.md");
const CHROMIUM_EXECUTABLE = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim()
  || path.join(ROOT, ".cache", "ms-playwright", "chromium-1223", "chrome-linux64", "chrome");
const NODE_EXECUTABLE = process.execPath;
const NPM_EXECUTABLE = process.env.NPM_EXECUTABLE_PATH
  || "/nix/store/1lagpgadaybvs1n2312gysg2phjk89y8-nodejs-20.20.0-wrapped/bin/npm";
const VIEWPORTS = {
  375: { width: 375, height: 812 },
  768: { width: 768, height: 1024 },
  1024: { width: 1024, height: 768 },
  1440: { width: 1440, height: 900 },
};
const SYSTEMS = ["editorial", "terminal", "geist", "brutalist", "swiss"];
const ACCENTS = ["crimson", "magenta", "orange", "amber", "emerald", "matrix", "cyan", "violet", "lime", "rose"];
const SMOKE_SYSTEM_DEFAULTS = {
  editorial: "crimson",
  terminal: "matrix",
  geist: "cyan",
  brutalist: "amber",
  swiss: "orange",
};
const SMOKE_ROUTES = {
  home: "/",
  "category-encoding-codecs": "/category/encoding-codecs",
  "resource-185020": "/resource/185020",
};
const SERIOUS_CRITICAL = new Set(["serious", "critical"]);
const EXPECTED_SYSTEMS = 5;
const EXPECTED_THEME_COMBINATIONS = 50;
const EXPECTED_SMOKE_CAPTURES = 80;
const STAGE10_CSS = path.join(ROOT, "client", "src", "styles", "design-system.css");
const PHASES = new Set(["theme", "runtime", "smoke", "axe", "font-prepaint", "all"]);
const REPORT_SCHEMA_VERSION = 3;

const log = (message) => process.stdout.write(`[audit-567] ${message}\n`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const safeError = (error) => ({
  name: error instanceof Error ? error.name : "Error",
  message: error instanceof Error ? error.message.split("\n")[0].slice(0, 240) : "unknown error",
});
const safeTeardown = (outcome) => ({
  attempted: true,
  completed: outcome?.errors?.length === 0,
  localDeleted: Boolean(outcome?.localDeleted),
  clerkDeleted: Boolean(outcome?.clerkDeleted),
  localQaUsersRemaining: outcome?.verification?.localQaUsersRemaining?.length ?? null,
  errorCount: outcome?.errors?.length ?? 1,
});

function parseCli() {
  const args = process.argv.slice(2);
  const phaseIndex = args.indexOf("--phase");
  const phaseArgument = phaseIndex >= 0 ? args[phaseIndex + 1] : null;
  const inlinePhase = args.find((arg) => arg.startsWith("--phase="))?.slice("--phase=".length);
  const phase = inlinePhase || phaseArgument;
  if (!phase || !PHASES.has(phase)) {
    throw new Error(
      "usage: node scripts/audit-567-browser.mjs --phase <theme|runtime|smoke|axe|font-prepaint|all> [--resume]",
    );
  }
  const readList = (names) => {
    const index = names.map((name) => args.indexOf(name)).find((candidate) => candidate >= 0);
    const inline = args.find((arg) => names.some((name) => arg.startsWith(`${name}=`)));
    const raw = inline
      ? inline.slice(inline.indexOf("=") + 1)
      : index === undefined || index < 0 ? null : args[index + 1];
    return raw ? raw.split(",").map((item) => item.trim()).filter(Boolean) : null;
  };
  const systems = readList(["--system", "--systems"]);
  const unknownSystems = systems?.filter((system) => !SYSTEMS.includes(system)) || [];
  if (unknownSystems.length) throw new Error(`unknown --system value(s): ${unknownSystems.join(", ")}`);
  const screens = readList(["--screen", "--screens"]);
  const knownScreens = [...Object.keys(SMOKE_ROUTES), "admin-overview"];
  if (phase === "smoke") {
    const unknownScreens = screens?.filter((screen) => !knownScreens.includes(screen)) || [];
    if (unknownScreens.length) throw new Error(`unknown --screen value(s): ${unknownScreens.join(", ")}`);
  }
  return { phase, resume: args.includes("--resume"), systems, screens };
}

async function writeJsonDurably(filename, value) {
  await fsp.mkdir(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.tmp-${process.pid}`;
  await fsp.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fsp.rename(temporary, filename);
}

async function readCheckpoint(resume) {
  if (!resume) return null;
  try {
    const value = JSON.parse(await fsp.readFile(REPORT_PATH, "utf8"));
    if (value?.task !== "567" || value?.schemaVersion !== REPORT_SCHEMA_VERSION) {
      throw new Error(`checkpoint schema is not resumable (expected ${REPORT_SCHEMA_VERSION})`);
    }
    return value;
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(`--resume requested but no checkpoint exists at ${REPORT_PATH}`);
    }
    throw error;
  }
}

async function checkpoint(report, phase, detail = "") {
  report.phase = phase;
  report.lastCheckpoint = {
    phase,
    detail,
    at: new Date().toISOString(),
  };
  await writeJsonDurably(REPORT_PATH, report);
  if (report.axe?.summary && Object.keys(report.axe.summary).length) {
    await writeJsonDurably(path.join(OUT, "axe", "audit-567-summary.json"), {
      task: "567",
      status: report.axe.summary.incompleteRows || report.axe.summary.seriousCriticalRows ? "INCOMPLETE" : "RUNNING",
      ...report.axe.summary,
    });
  }
  await writeJsonDurably(path.join(OUT, "worklog.md"), renderWorklog(report));
  log(`checkpoint ${phase}${detail ? ` (${detail})` : ""}`);
}

function rowKey(row) {
  return [row.system, row.accent, row.width, row.screen, row.identity, row.route].join("|");
}

function replaceRow(rows, row, key = rowKey) {
  const index = rows.findIndex((candidate) => key(candidate) === key(row));
  if (index >= 0) rows[index] = row;
  else rows.push(row);
}

async function sha256File(filename) {
  const digest = createHash("sha256");
  digest.update(await fsp.readFile(filename));
  return digest.digest("hex");
}

function resumableSmokeRow(row, filename, report, system, accent, width, screen, identity, route) {
  return Boolean(
    row &&
      row.captureRunId === report.runId &&
      row.system === system &&
      row.accent === accent &&
      row.width === width &&
      row.screen === screen &&
      row.identity === identity &&
      row.route === route &&
      row.pass === true &&
      row.screenshot === path.basename(filename) &&
      row.screenshotSha256 &&
      fs.existsSync(filename),
  );
}

function resumableAxeRow(row, screen, width, identity, route) {
  return Boolean(
    row &&
      row.screen === screen &&
      row.width === width &&
      row.identity === identity &&
      row.route === route &&
      row.ready === true &&
      row.status === "PASS",
  );
}

function assertLocalBase() {
  const url = new URL(BASE);
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost", "::1"].includes(url.hostname)) {
    throw new Error("BASE_URL must be a loopback HTTP origin; production is not a local capture target");
  }
}

function chromiumLaunchOptions() {
  if (!fs.existsSync(CHROMIUM_EXECUTABLE)) {
    throw new Error(`Pinned Chromium executable is missing: ${CHROMIUM_EXECUTABLE}`);
  }
  return {
    headless: true,
    chromiumSandbox: true,
    args: ["--disable-partial-raster"],
    executablePath: CHROMIUM_EXECUTABLE,
  };
}

async function makeContext(browser, storageState = undefined) {
  const context = await browser.newContext({
    storageState,
    locale: "en-US",
    timezoneId: "UTC",
    colorScheme: "dark",
    reducedMotion: "reduce",
    serviceWorkers: "block",
  });
  context.setDefaultTimeout(30_000);
  return context;
}

async function waitForApp(page, selector = "body") {
  await page.locator(selector).first().waitFor({ state: "attached", timeout: 45_000 }).catch(() => {});
  await page.locator('[data-testid="route-chunk-skeleton"]').waitFor({ state: "hidden", timeout: 45_000 });
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  await page.waitForTimeout(350);
}

async function assertTheme(page, system, accent, { reload = false } = {}) {
  if (reload) {
    await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
    await waitForApp(page);
  }
  const state = await page.waitForFunction(
    ({ expectedSystem, expectedAccent }) => {
      const root = document.documentElement;
      let storedSystem = null;
      let storedAccent = null;
      try {
        storedSystem = localStorage.getItem("ds-system");
        storedAccent = localStorage.getItem("ds-accent");
      } catch {}
      return {
        attrs: {
          system: root.getAttribute("data-system"),
          accent: root.getAttribute("data-accent"),
        },
        stored: { system: storedSystem, accent: storedAccent },
        pass: root.getAttribute("data-system") === expectedSystem &&
          root.getAttribute("data-accent") === expectedAccent &&
          storedSystem === expectedSystem &&
          storedAccent === expectedAccent,
      };
    },
    { expectedSystem: system, expectedAccent: accent },
    { timeout: 30_000 },
  );
  const values = await state.jsonValue();
  if (!values.pass) throw new Error(`theme state did not settle for ${system}/${accent}`);
  return values;
}

async function waitFonts(page) {
  return page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    const root = getComputedStyle(document.documentElement);
    const family = async (property) => {
      const stack = root.getPropertyValue(property).trim();
      const familyName = stack.split(",")[0].replace(/["']/g, "").trim();
      if (!familyName) {
        return { stack, family: familyName, computedFamily: "", loadedFaces: 0, loaded: true, checked: true };
      }
      // A bare document.fonts.check() is a false negative until a face has
      // been requested. Probe the actual computed token family first so an
      // unused Editorial display face is not reported as missing.
      const probe = document.createElement("span");
      probe.textContent = "Hamburgefontsiv";
      probe.style.cssText = `position:fixed;left:-10000px;top:-10000px;font-family:${stack};font-size:32px;font-weight:400;`;
      document.body.appendChild(probe);
      const computedFamily = getComputedStyle(probe).fontFamily;
      const loadedFaces = (await document.fonts.load(`400 32px "${familyName}"`, "Hamburgefontsiv")).length;
      const checked = document.fonts.check(`400 32px "${familyName}"`, "Hamburgefontsiv");
      probe.remove();
      return {
        stack,
        family: familyName,
        computedFamily,
        loadedFaces,
        loaded: loadedFaces > 0,
        checked,
      };
    };
    const faces = {
      display: await family("--font-display"),
      body: await family("--font-body"),
      mono: await family("--font-mono"),
    };
    await document.fonts.ready;
    return {
      ready: document.fonts.status === "loaded",
      faces,
      allLoaded: Object.values(faces).every((face) => face.loaded && face.checked),
    };
  });
}

async function selectTheme(page, system, accent, { reload = true } = {}) {
  await page.goto(`${BASE}/settings/theme`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await waitForApp(page, '[data-testid="system-picker"]');
  await page.locator(`[data-testid="system-option-${system}"]`).click();
  await page.waitForFunction(
    (expectedSystem) => document.documentElement.getAttribute("data-system") === expectedSystem,
    system,
    { timeout: 30_000 },
  );
  await page.locator(`[data-testid="accent-option-${accent}"]`).click();
  await assertTheme(page, system, accent);
  const fontsBeforeReload = await waitFonts(page);
  const persisted = await assertTheme(page, system, accent, { reload });
  const fontsAfterReload = await waitFonts(page);
  return { persisted, fontsBeforeReload, fontsAfterReload };
}

async function themeMatrix(page, report, onCell) {
  const rows = report.themeMatrix;
  await page.goto(`${BASE}/settings/theme`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await waitForApp(page, '[data-testid="system-picker"]');
  for (const system of SYSTEMS) {
    await page.locator(`[data-testid="system-option-${system}"]`).click();
    await page.waitForFunction(
      (expectedSystem) => document.documentElement.getAttribute("data-system") === expectedSystem,
      system,
      { timeout: 30_000 },
    );
    for (const accent of ACCENTS) {
      const prior = rows.find((row) => row.system === system && row.accent === accent);
      if (prior?.persistence === true && prior.attrs?.system === system && prior.attrs?.accent === accent &&
        prior.stored?.system === system && prior.stored?.accent === accent) {
        log(`theme ${system} × ${accent}: RESUMED`);
        continue;
      }
      await page.locator(`[data-testid="accent-option-${accent}"]`).click();
      const beforeReload = await assertTheme(page, system, accent);
      const afterReload = await assertTheme(page, system, accent, { reload: true });
      const row = {
        system,
        accent,
        attrs: afterReload.attrs,
        stored: afterReload.stored,
        persistence: beforeReload.pass && afterReload.pass,
        // Font faces are checked against each system's computed token stack
        // during the smoke captures and stage 9.  Keeping the 50-combo
        // persistence loop focused on the reload contract avoids treating an
        // unused face as missing before it has been requested.
        fonts: { checkedInSmoke: false },
      };
      replaceRow(rows, row, (candidate) => `${candidate.system}|${candidate.accent}`);
      await onCell(row);
      log(`theme ${system} × ${accent}: ${row.persistence ? "PASS" : "FAIL"}`);
    }
  }
  return rows;
}

function contrastRatio(foreground, background, underBackground = null) {
  const parse = (value) => {
    const raw = String(value || "").trim().toLowerCase();
    const hex = raw.match(/^#([0-9a-f]{3,8})$/i);
    if (hex) {
      const source = hex[1];
      const chars = source.length === 3 || source.length === 4
        ? source.split("").map((char) => char + char).join("")
        : source;
      if (chars.length < 6) return null;
      return {
        rgb: [0, 2, 4].map((index) => Number.parseInt(chars.slice(index, index + 2), 16) / 255),
        alpha: chars.length >= 8 ? Number.parseInt(chars.slice(6, 8), 16) / 255 : 1,
      };
    }
    const rgb = raw.match(/^rgba?\((.*)\)$/);
    if (rgb) {
      const channels = rgb[1].replace(/\//g, " ").split(/[,\s]+/).filter(Boolean);
      if (channels.length < 3) return null;
      const channel = (token) => token.endsWith("%")
        ? Number.parseFloat(token) / 100
        : Number.parseFloat(token) / 255;
      const alpha = channels[3] === undefined
        ? 1
        : channels[3].endsWith("%") ? Number.parseFloat(channels[3]) / 100 : Number.parseFloat(channels[3]);
      return {
        rgb: channels.slice(0, 3).map(channel),
        alpha: Math.max(0, Math.min(1, alpha)),
      };
    }
    return null;
  };
  const composite = (over, under) => {
    if (!over || !under) return null;
    const alpha = over.alpha + under.alpha * (1 - over.alpha);
    if (alpha <= 0) return null;
    return {
      rgb: over.rgb.map((channel, index) =>
        (channel * over.alpha + under.rgb[index] * under.alpha * (1 - over.alpha)) / alpha,
      ),
      alpha,
    };
  };
  const luminance = (rgb) => {
    if (!rgb) return null;
    const linear = rgb.map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  const under = parse(underBackground) || { rgb: [0, 0, 0], alpha: 1 };
  const backgroundColor = composite(parse(background), under);
  const foregroundColor = composite(parse(foreground), backgroundColor);
  const foregroundLuminance = luminance(foregroundColor?.rgb);
  const backgroundLuminance = luminance(backgroundColor?.rgb);
  if (foregroundLuminance === null || backgroundLuminance === null) return null;
  const light = Math.max(foregroundLuminance, backgroundLuminance);
  const dark = Math.min(foregroundLuminance, backgroundLuminance);
  return Number(((light + 0.05) / (dark + 0.05)).toFixed(3));
}

async function stageAudit(page, system, accent) {
  const runtime = await page.evaluate(async () => {
    const root = document.documentElement;
    const style = getComputedStyle(root);
    const value = (name) => style.getPropertyValue(name).trim();
    const isVisible = (element) => {
      if (!element) return false;
      const computed = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return computed.display !== "none" && computed.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const buttonStrays = [...document.querySelectorAll("button")].filter((button) =>
      !button.hasAttribute("data-ds-variant") &&
      !button.matches("[data-state], [data-radix-collection-item], [cmdk-item], [role='switch'], [role='checkbox'], [role='tab'], [role='combobox'], [role='radio']") &&
      !button.closest("[data-sidebar], [role='dialog'], [cmdk-root], [data-radix-popper-content-wrapper], .accordion-item, [data-ds='card-hover']") &&
      button.getAttribute("aria-label") !== "Open search" &&
      !button.hasAttribute("aria-pressed") &&
      !button.classList.contains("chip") &&
      !button.classList.contains("kbd") &&
      !["footer-cookie-settings", "button-clear-recent-searches", "button-dismiss-scrubbed-params"].includes(button.getAttribute("data-testid")),
    ).map((button) => button.getAttribute("data-testid") || button.getAttribute("aria-label") || button.textContent?.trim().slice(0, 50) || "button");
    const inputStrays = [...document.querySelectorAll("input, select, textarea")].filter((element) =>
      !element.classList.contains("border-input") &&
      !element.classList.contains("border-[var(--border-strong)]") &&
      !element.matches("[cmdk-input], [type='hidden'], [type='checkbox'], [type='radio'], [type='range'], [type='file'], select[aria-hidden='true']") &&
      !element.classList.contains("sr-only") &&
      !element.closest("[data-sidebar], [cmdk-root], [data-radix-popper-content-wrapper]") &&
      element.getAttribute("data-testid") !== "select-subcategory-filter",
    ).map((element) => element.getAttribute("data-testid") || element.getAttribute("aria-label") || element.tagName.toLowerCase());
    const h1Strays = [...document.querySelectorAll("h1")].filter((heading) =>
      !heading.classList.contains("display-h") && !heading.classList.contains("sr-only"),
    ).map((heading) => heading.textContent?.trim().slice(0, 80) || "h1");
    const accentProbe = document.createElement("span");
    accentProbe.textContent = ".";
    accentProbe.style.cssText = "position:fixed;left:-10000px;top:-10000px;color:var(--accent);";
    document.body.appendChild(accentProbe);
    const accentColor = getComputedStyle(accentProbe).color;
    accentProbe.remove();
    const accentUsers = [...document.querySelectorAll("*")].filter((element) => {
      if (!isVisible(element)) return false;
      const computed = getComputedStyle(element);
      return [computed.color, computed.backgroundColor, computed.borderColor].some((color) =>
        color.toLowerCase() === accentColor.toLowerCase(),
      );
    }).length;
    const inks = {
      text: value("--text"),
      text2: value("--text-2"),
      text3: value("--text-3"),
      text4: value("--text-4"),
      bg: value("--bg"),
      surface: value("--surface"),
    };
    const families = async (property) => {
      const stack = value(property);
      const family = stack.split(",")[0].replace(/["']/g, "").trim();
      if (!family) return { stack, family, computedFamily: "", loadedFaces: 0, check: true };
      const probe = document.createElement("span");
      probe.textContent = "Hamburgefontsiv";
      probe.style.cssText = `position:fixed;left:-10000px;top:-10000px;font-family:${stack};font-size:32px;font-weight:400;`;
      document.body.appendChild(probe);
      const computedFamily = getComputedStyle(probe).fontFamily;
      const loadedFaces = (await document.fonts.load(`400 32px "${family}"`, "Hamburgefontsiv")).length;
      const check = document.fonts.check(`400 32px "${family}"`, "Hamburgefontsiv");
      probe.remove();
      return { stack, family, computedFamily, loadedFaces, check };
    };
    return {
      stage1: {
        applyDesignSystem: typeof window.applyDesignSystem === "function",
        systems: Object.keys(window.DESIGN_SYSTEMS || {}).length,
        accents: (window.ACCENTS || []).length,
        bg: inks.bg,
      },
      stage2: {
        system: root.getAttribute("data-system"),
        accent: root.getAttribute("data-accent"),
        bg: inks.bg,
      },
      stage3: {
        bootAttributesPresent: Boolean(root.getAttribute("data-system") && root.getAttribute("data-accent")),
        localStorageKeys: (() => {
          try {
            return {
              system: localStorage.getItem("ds-system"),
              accent: localStorage.getItem("ds-accent"),
            };
          } catch {
            return { system: null, accent: null };
          }
        })(),
      },
      stage4: {
        page: Boolean(document.querySelector(".page")),
        grain: Boolean(document.querySelector(".grain")),
      },
      stage6: {
        buttonStrays,
        inputStrays,
        h1Strays,
        canonicalPrimitives: buttonStrays.length === 0 && inputStrays.length === 0 && h1Strays.length === 0,
      },
      stage7: { visibleAccentUsers: accentUsers },
      stage8: { inks },
      stage9: {
        documentFontsStatus: document.fonts.status,
        families: {
          display: await families("--font-display"),
          body: await families("--font-body"),
          mono: await families("--font-mono"),
        },
      },
    };
  });
  const contrast = {};
  for (const [name, value] of Object.entries(runtime.stage8.inks)) {
    if (name === "bg" || name === "surface") continue;
    contrast[name] = {
      value,
      onBg: contrastRatio(value, runtime.stage8.inks.bg),
      onSurface: contrastRatio(value, runtime.stage8.inks.surface, runtime.stage8.inks.bg),
    };
  }
  return {
    system,
    accent,
    runtime,
    stage8: { ...runtime.stage8, contrast },
    stage9: runtime.stage9,
  };
}

function refreshStageContrasts(report) {
  for (const audit of report.stageAudits || []) {
    const inks = audit.runtime?.stage8?.inks || audit.stage8?.inks;
    if (!inks?.bg || !inks?.surface) continue;
    const contrast = {};
    for (const [name, value] of Object.entries(inks)) {
      if (name === "bg" || name === "surface") continue;
      contrast[name] = {
        value,
        onBg: contrastRatio(value, inks.bg),
        onSurface: contrastRatio(value, inks.surface, inks.bg),
      };
    }
    audit.stage8 = { ...(audit.stage8 || {}), inks, contrast };
    if (audit.runtime?.stage8) audit.runtime.stage8 = { ...audit.runtime.stage8, inks };
  }
}

async function interactionSweep(page, system, accent, report, onCell) {
  const rows = [];
  for (const width of [375, 1440]) {
    const existing = report.interactions.find((row) => row.system === system && row.accent === accent && row.width === width);
    if (existing?.sidebar && existing?.paletteDialog) {
      rows.push(existing);
      log(`interactions ${system} × ${width}: RESUMED`);
      continue;
    }
    await page.setViewportSize(VIEWPORTS[width]);
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await waitForApp(page);
    await assertTheme(page, system, accent);
    let sidebar = false;
    const sidebarTrigger = page.getByRole("button", { name: "Toggle sidebar", exact: true });
    if (width === 375 && await sidebarTrigger.isVisible().catch(() => false)) {
      await sidebarTrigger.click();
      await page.locator("[data-sidebar='sidebar']").first().waitFor({ state: "visible", timeout: 15_000 }).catch(() => {});
      sidebar = await page.locator("[data-sidebar='sidebar']").first().isVisible().catch(() => false);
      await page.keyboard.press("Escape");
    } else {
      sidebar = await page.locator("[data-sidebar='sidebar']").first().isVisible().catch(() => false);
    }
    await page.keyboard.press("Control+K");
    // The palette chunk is lazy-loaded on first trigger (MainLayout keeps only
    // the keydown handler in the eager shell), so wait for the dialog rather
    // than sampling visibility synchronously after the keypress.
    const paletteDialog = page.locator('[role="dialog"]').first();
    await paletteDialog.waitFor({ state: "visible", timeout: 15_000 }).catch(() => {});
    const palette = await paletteDialog.isVisible().catch(() => false);
    await page.keyboard.press("Escape");
    const row = { system, accent, width, sidebar, paletteDialog: palette };
    replaceRow(report.interactions, row, (candidate) =>
      `${candidate.system}|${candidate.accent}|${candidate.width}`,
    );
    rows.push(row);
    await onCell(row);
  }
  return rows;
}

async function smokeCapture(browser, visitorPage, identity, system, accent, report, onCell, selectedScreens = null) {
  const smokeRows = report.smoke.rows;
  const smokeEntries = Object.entries(SMOKE_ROUTES).filter(([screen]) =>
    !selectedScreens || selectedScreens.includes(screen),
  );
  const includeAdmin = !selectedScreens || selectedScreens.includes("admin-overview");
  const selection = await selectTheme(visitorPage, system, accent);
  // Keep Clerk's real sign-in context alive. Copying a signed-out context's
  // cookies/storage can overwrite its session and capture sign-in as admin.
  const adminPage = identity.page;
  await selectTheme(adminPage, system, accent);
  try {
    for (const [widthString, viewport] of Object.entries(VIEWPORTS)) {
      const width = Number(widthString);
      await visitorPage.setViewportSize(viewport);
      for (const [screen, route] of smokeEntries) {
        await visitorPage.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
        await waitForApp(visitorPage);
        await assertTheme(visitorPage, system, accent);
        const fonts = await waitFonts(visitorPage);
        const filename = `${width}-${screen}.png`;
        const temp = path.join(OUT, "multi-system", system, filename);
        await fsp.mkdir(path.dirname(temp), { recursive: true });
        const prior = smokeRows.find((row) =>
          row.captureRunId === report.runId &&
          row.system === system &&
          row.accent === accent &&
          row.width === width &&
          row.screen === screen &&
          row.identity === "public" &&
          row.route === route,
        );
        const resumed = process.env.AUDIT_567_RECAPTURE !== "1" &&
          resumableSmokeRow(prior, temp, report, system, accent, width, screen, "public", route) &&
          await sha256File(temp) === prior.screenshotSha256;
        if (!resumed) {
          await visitorPage.screenshot({ path: temp, fullPage: true, timeout: 60_000 });
        }
        const row = {
          captureRunId: report.runId,
          system,
          accent,
          width,
          screen,
          identity: "public",
          route,
          screenshot: filename,
          fonts,
          theme: { system, accent },
          resumed,
          pass: fonts.allLoaded,
          screenshotSha256: await sha256File(temp),
        };
        replaceRow(smokeRows, row);
        await onCell(row);
      }
      if (includeAdmin) {
        await adminPage.setViewportSize(viewport);
        await adminPage.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded", timeout: 60_000 });
        await adminPage.getByTestId("admin-authorized").waitFor({ state: "visible", timeout: 30_000 });
        const overviewTab = adminPage.locator('[data-testid="tab-overview"]').first();
        if (await overviewTab.isVisible().catch(() => false)) await overviewTab.click();
        await adminPage.locator('[role="tabpanel"][data-state="active"]').first().waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});
        await assertTheme(adminPage, system, accent);
        const fonts = await waitFonts(adminPage);
        await adminPage.getByTestId("admin-overview").waitFor({ state: "visible", timeout: 30_000 });
        await adminPage.waitForFunction(() => {
          const panel = document.querySelector('[data-testid="admin-overview"]');
          return panel && !/Loading (activity|health|categories)/i.test(panel.textContent || "");
        }, null, { timeout: 30_000 });
        await adminPage.waitForTimeout(1000);
        const filename = `${width}-admin-overview.png`;
        const temp = path.join(OUT, "multi-system", system, filename);
        await fsp.mkdir(path.dirname(temp), { recursive: true });
        const prior = smokeRows.find((row) =>
          row.captureRunId === report.runId &&
          row.system === system &&
          row.accent === accent &&
          row.width === width &&
          row.screen === "admin-overview" &&
          row.identity === "Nick-admin" &&
          row.route === "/admin",
        );
        const resumed = process.env.AUDIT_567_RECAPTURE !== "1" &&
          resumableSmokeRow(prior, temp, report, system, accent, width, "admin-overview", "Nick-admin", "/admin") &&
          await sha256File(temp) === prior.screenshotSha256;
        if (!resumed) {
          const session = await adminPage.context().newCDPSession(adminPage);
          try {
            const metrics = await session.send("Page.getLayoutMetrics");
            const capture = await session.send("Page.captureScreenshot", {
              format: "png",
              fromSurface: true,
              captureBeyondViewport: true,
              clip: { x: 0, y: 0, width: viewport.width, height: Math.ceil(metrics.cssContentSize.height), scale: 1 },
            });
            await fsp.writeFile(temp, Buffer.from(capture.data, "base64"));
          } finally {
            await session.detach();
          }
        }
        const row = {
          captureRunId: report.runId,
          system,
          accent,
          width,
          screen: "admin-overview",
          identity: "Nick-admin",
          route: "/admin",
          screenshot: filename,
          fonts,
          theme: { system, accent },
          resumed,
          pass: fonts.allLoaded && fonts.ready && await adminPage.getByTestId("admin-overview").isVisible().catch(() => false),
          screenshotSha256: await sha256File(temp),
        };
        replaceRow(smokeRows, row);
        await onCell(row);
      }
    }
  } finally {
    // The identity owns its authenticated context and tears it down once.
  }
  return selection;
}

function sanitiseAxe(result) {
  const compact = (violation) => ({
    id: violation.id,
    impact: violation.impact || null,
    help: violation.help,
    description: violation.description,
    nodes: violation.nodes.length,
    targets: violation.nodes.map((node) => node.target),
    details: violation.nodes.map((node) => ({
      target: node.target,
      failureSummary: node.failureSummary,
    })),
  });
  const violations = result.violations.map(compact);
  return {
    violations,
    seriousCritical: violations.filter((violation) => SERIOUS_CRITICAL.has(violation.impact)),
    passes: result.passes.length,
    incomplete: result.incomplete.length,
  };
}

async function axeForScreen(page, screen, width, tokens, identityMode) {
  const route = screen.actualPath
    ? resolvePathTemplate(screen.actualPath, tokens.values)
    : screen.id === "app.shell.default" ? "/" : null;
  if (!route) {
    return {
      screen: screen.id,
      width,
      identity: identityMode,
      status: "SKIPPED",
      stateOnly: true,
      reason: screen.reason || "inventory row has no actualPath; state-only state cannot be injected",
    };
  }
  const result = { screen: screen.id, width, route, identity: identityMode, status: "INCOMPLETE" };
  try {
    await page.setViewportSize(VIEWPORTS[width]);
    const response = await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const httpStatus = response?.status() ?? null;
    const intentionalNotFound = screen.id === "app.not-found" || screen.notes?.match(/\bHTTP 404\b/i);
    if (httpStatus === null || (httpStatus >= 400 && !(intentionalNotFound && httpStatus === 404))) {
      throw new Error(`actual route ${route} returned HTTP ${httpStatus ?? "unknown"} (expected a successful route)`);
    }
    await waitForApp(page);
    const foldedParents = { "admin-tab:digests": "github", "admin-tab:journeys": "research", "admin-tab:subsubcategories": "subcategories" };
    const foldedParent = foldedParents[screen.actualAction];
    if (foldedParent) {
      await applyAction(page, `admin-tab:${foldedParent}`, "actual", { tokens });
    }
    if (screen.actualAction) {
      if (foldedParent) {
        const child = screen.actualAction.slice("admin-tab:".length);
        await page.getByTestId(`tab-${child}`).click();
        await page.getByTestId(`content-${child}`).waitFor({ state: "visible", timeout: 30_000 });
      } else {
        await applyAction(page, screen.actualAction, "actual", { tokens });
      }
    }
    if (screen.actualReadySelector) {
      await page.locator(screen.actualReadySelector).first().waitFor({ state: "attached", timeout: 30_000 });
    }
    if (!screen.actualAction) {
      await page.locator("main h1, h1").first().waitFor({ state: "visible", timeout: 30_000 });
    }
    if (identityMode === "Nick-admin") {
      const session = await page.evaluate(async () => {
        const response = await fetch("/api/auth/user", { credentials: "include", headers: { accept: "application/json" } });
        return response.json().catch(() => null);
      });
      if (!session?.isAuthenticated || session.user?.role !== "admin") {
        throw new Error(`protected app row is not authenticated as admin (session=${JSON.stringify(session).slice(0, 240)})`);
      }
      const name = session.user?.firstName || session.user?.name;
      if (name !== "Nick") throw new Error("Protected row is not using the disposable Nick identity");
      // Mobile intentionally collapses the header name to an avatar. Verify
      // identity at the authenticated API, not by demanding desktop chrome.
      result.identityVerified = { name: "Nick", role: "admin" };
    }
    await page.evaluate(() => document.fonts?.ready).catch(() => {});
    const axe = sanitiseAxe(await new AxeBuilder({ page }).analyze());
    result.ready = true;
    result.httpStatus = httpStatus;
    result.axe = axe;
    result.status = axe.seriousCritical.length === 0 ? "PASS" : "FAIL";
  } catch (error) {
    result.error = safeError(error);
  }
  return result;
}

function axeSummary(screens, publicScreens, adminScreens, rows) {
  return {
    inventoriedAppScreens: screens.length,
    routableAppScreens: screens.filter((screen) => screen.actualPath || screen.id === "app.shell.default").length,
    publicScreens: publicScreens.length,
    adminScreens: adminScreens.length,
    expectedRows: screens.filter((screen) => screen.actualPath || screen.id === "app.shell.default").length * 2,
    inventoriedRows: screens.length * 2,
    executedRows: rows.filter((row) => row.status !== "SKIPPED").length,
    skippedRows: rows.filter((row) => row.status === "SKIPPED").length,
    stateOnlyRows: rows.filter((row) => row.stateOnly === true).length,
    passRows: rows.filter((row) => row.status === "PASS").length,
    seriousCriticalRows: rows.filter((row) => row.status === "FAIL").length,
    incompleteRows: rows.filter((row) => row.status === "INCOMPLETE").length,
  };
}

async function writeAxeScreenEvidence(screenId, rows) {
  const filename = `audit-567-${screenId.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}.json`;
  const target = path.join(OUT, "axe", filename);
  const payload = {
    schemaVersion: 2,
    task: "567",
    screen: screenId,
    widths: rows,
    seriousCriticalZero: rows.some((row) => row.status !== "SKIPPED") &&
      rows.filter((row) => row.status !== "SKIPPED").every((row) => row.status === "PASS"),
  };
  await writeJsonDurably(target, payload);
  return filename;
}

async function runAxe(browser, visitorState, identity, inventory, tokens, report, onCell, selectedScreenIds = null) {
  const screens = inventory.screens.filter((screen) => screen.kind === "app");
  const needsIdentity = (screen) => screen.family === "admin" ||
    (screen.family === "account" && !screen.id.startsWith("app.auth.")) ||
    (screen.requires || []).includes("admin-session");
  const publicScreens = screens.filter((screen) => !needsIdentity(screen));
  const adminScreens = screens.filter(needsIdentity);
  const selected = selectedScreenIds
    ? screens.filter((screen) => selectedScreenIds.includes(screen.id))
    : screens;
  const selectedPublicScreens = selected.filter((screen) => publicScreens.includes(screen));
  const selectedAdminScreens = selected.filter((screen) => adminScreens.includes(screen));
  const byScreen = new Map();
  const publicContext = await makeContext(browser, visitorState);
  const publicPage = await publicContext.newPage();
  const adminPage = identity.page;
  await selectTheme(adminPage, "editorial", "crimson");
  const rows = report.axe.rows;
  const files = [];
  try {
    for (const [label, page, selected] of [
      ["public", publicPage, selectedPublicScreens],
      ["Nick-admin", adminPage, selectedAdminScreens],
    ]) {
      for (const screen of selected) {
        for (const width of [375, 1440]) {
          const route = screen.actualPath
            ? resolvePathTemplate(screen.actualPath, tokens.values)
            : screen.id === "app.shell.default" ? "/" : null;
          const prior = rows.find((candidate) =>
            candidate.screen === screen.id &&
            candidate.width === width &&
            candidate.identity === label &&
            candidate.route === route,
          );
          const row = resumableAxeRow(prior, screen.id, width, label, route)
            ? prior
            : await axeForScreen(page, screen, width, tokens, label);
          replaceRow(rows, row, (candidate) =>
            `${candidate.screen}|${candidate.width}`,
          );
          if (!byScreen.has(screen.id)) byScreen.set(screen.id, []);
          const screenRows = byScreen.get(screen.id);
          replaceRow(screenRows, row, (candidate) =>
            `${candidate.width}|${candidate.identity}|${candidate.route}`,
          );
          const filename = await writeAxeScreenEvidence(screen.id, screenRows);
          if (!files.includes(filename)) files.push(filename);
          report.axe.summary = axeSummary(screens, publicScreens, adminScreens, rows);
          report.axe.files = files;
          await onCell(row);
          const findingCount = row.axe?.seriousCritical?.length || 0;
          log(`axe ${screen.id}@${width} ${label}: ${row.status}${findingCount ? ` (${findingCount} serious/critical)` : ""}${prior ? " (RESUMED)" : ""}`);
        }
      }
    }
  } finally {
    await publicContext.close().catch(() => {});
    // Authenticated context belongs to the disposable identity.
  }
  for (const [screen, screenRows] of byScreen) {
    const filename = await writeAxeScreenEvidence(screen, screenRows);
    files.push(filename);
  }
  report.axe.summary = axeSummary(screens, publicScreens, adminScreens, rows);
  report.axe.files = [...new Set(files)];
  return {
    rows,
    files: report.axe.files,
    summary: report.axe.summary,
  };
}

function runStaticCommand(label, command, args) {
  const started = Date.now();
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env,
    timeout: 300_000,
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
  return {
    label,
    command: [command, ...args].join(" "),
    exitCode: result.status ?? 2,
    signal: result.signal || null,
    durationMs: Date.now() - started,
    outputTail: output.slice(-2_000),
    pass: result.status === 0,
  };
}

function stage10SkinCounts() {
  const css = fs.readFileSync(STAGE10_CSS, "utf8");
  return {
    systemSelectorCount: (css.match(/\[data-system="(?:editorial|terminal|geist|brutalist|swiss)"\]/g) || []).length,
    dataDsCount: (css.match(/data-ds/g) || []).length,
  };
}

function copyTree(source, destination) {
  fs.rmSync(destination, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true });
}

async function publishEvidence(report) {
  if (fs.existsSync(path.join(OUT, "multi-system"))) {
    for (const system of SYSTEMS) {
      const source = path.join(OUT, "multi-system", system);
      if (fs.existsSync(source)) copyTree(source, path.join(PUBLISHED_MULTI, system));
    }
  }
  if (fs.existsSync(path.join(OUT, "axe"))) {
    fs.mkdirSync(PUBLISHED_AXE, { recursive: true });
    for (const file of fs.readdirSync(path.join(OUT, "axe"))) {
      if (!file.startsWith("audit-567-")) continue;
      fs.copyFileSync(path.join(OUT, "axe", file), path.join(PUBLISHED_AXE, file));
    }
  }
  await fsp.mkdir(PUBLISHED_MULTI, { recursive: true });
  await writeJsonDurably(path.join(PUBLISHED_MULTI, "audit-567-summary.json"), report);
  await fsp.mkdir(path.dirname(PUBLISHED_WORKLOG), { recursive: true });
  await fsp.writeFile(PUBLISHED_WORKLOG, renderWorklog(report));
}

function renderWorklog(report) {
  const smokePass = report.smoke.rows.filter((row) => row.pass).length;
  const smokeTotal = report.smoke.rows.length;
  const themePass = report.themeMatrix.filter((row) => row.persistence).length;
  const themeTotal = report.themeMatrix.length;
  const axe = report.axe.summary;
  const stageComplete = report.stageAudits.length === EXPECTED_SYSTEMS;
  const themeComplete = themeTotal === EXPECTED_THEME_COMBINATIONS && themePass === EXPECTED_THEME_COMBINATIONS;
  const smokeComplete = smokeTotal === EXPECTED_SMOKE_CAPTURES && smokePass === EXPECTED_SMOKE_CAPTURES;
  const axeComplete = axe.expectedRows !== undefined &&
    axe.executedRows === axe.expectedRows &&
    axe.incompleteRows === 0 &&
    axe.seriousCriticalRows === 0;
  const staticLines = report.staticGates.map((gate) => {
    if (gate.status === "NOT_RUN") return `- NOT RUN \`${gate.label}\` (${gate.reason})`;
    return `- ${gate.pass ? "PASS" : "FAIL"} \`${gate.command}\` (exit ${gate.exitCode})`;
  }).join("\n");
  const contrastLines = report.stageAudits.map((audit) => {
    const ratios = Object.entries(audit.stage8.contrast)
      .map(([name, values]) => `${name}=${values.onBg ?? "n/a"}`)
      .join(", ");
    return `- ${audit.system} × ${audit.accent}: ${ratios}`;
  }).join("\n");
  const interactionLines = report.interactions.map((row) =>
    `- ${row.system} × ${row.width}: sidebar=${row.sidebar ? "opened/visible" : "not-open"}, palette/dialog=${row.paletteDialog ? "opened" : "not-open"}`,
  ).join("\n");
  return `# Task 567 browser DS/axe worklog

Captured: ${report.capturedAt}
Base: \`${report.base}\`
Browser: pinned Playwright Chromium (explicit executable path; browser lease held by \`playwright-launch-lease\`)

## Scope and identity safety

- Theme choices were made through the shipped \`/settings/theme\` controls; no \`data-system\` or \`data-accent\` attributes were injected.
- Theme persistence matrix: **${themePass}/${themeTotal}** rows recorded; an overall PASS requires exactly ${EXPECTED_THEME_COMBINATIONS}/${EXPECTED_THEME_COMBINATIONS} in the finalized report. Status: **${themeComplete ? "PASS" : "INCOMPLETE"}**.
- Public rows used a signed-out browser context. Admin rows used one disposable Nick admin created by \`tests/parity/identity.mjs\`; only that identity was deleted in teardown.
- No global identity sweep was run. Teardown: ${JSON.stringify(report.identity.teardown)}.

## Smoke screenshots

- **${smokePass}/${smokeTotal}** screenshot rows passed font readiness and route/theme assertions; an overall PASS requires exactly ${EXPECTED_SMOKE_CAPTURES}/${EXPECTED_SMOKE_CAPTURES}. Status: **${smokeComplete ? "PASS" : "INCOMPLETE"}**.
- Files: \`docs/parity/evidence/multi-system/<system>/<width>-<screen>.png\`.
- Systems: ${SYSTEMS.join(", ")}; widths: 375, 768, 1024, 1440; screens: home, category-encoding-codecs, resource-185020, admin-overview.
- Font evidence records \`document.fonts.ready\`, computed token families, and \`document.fonts.check\` in \`multi-system/audit-567-summary.json\`.

## Functional system chrome checks

${interactionLines || "- No interaction rows were captured."}

## DS stages 1–11 evidence

- Stage 1 (files/runtime): ${stageComplete && report.stageAudits.every((audit) => audit.runtime.stage1.applyDesignSystem && audit.runtime.stage1.systems === 5 && audit.runtime.stage1.accents === 10 && audit.runtime.stage1.bg) ? "PASS" : "INCOMPLETE"}.
- Stage 2 (applied system): ${stageComplete && report.stageAudits.every((audit) => audit.runtime.stage2.system === audit.system && audit.runtime.stage2.accent === audit.accent) ? "PASS" : "INCOMPLETE"}.
- Stage 3 (boot/storage contract): runtime attributes and persisted keys recorded per selected system; first-paint source remains the existing \`client/index.html\` boot script.
- Stage 4 (page chrome): ${stageComplete && report.stageAudits.every((audit) => audit.runtime.stage4.page && audit.runtime.stage4.grain) ? "PASS" : "INCOMPLETE"}.
- Stage 5 (hardcoded-value gates): see static command results below.
- Stage 6 (canonical primitives): ${stageComplete && report.stageAudits.every((audit) => audit.runtime.stage6.canonicalPrimitives) ? "PASS" : "INCOMPLETE"} on the sampled theme surface; raw details retained in summary.
- Stage 7 (accent discipline): visible accent-user counts retained per system; no count was silently waived.
- Stage 8 (ink values): contrast values retained below and in \`multi-system/audit-567-summary.json\`.
- Stage 9 (fonts): ${stageComplete && report.stageAudits.every((audit) => audit.runtime.stage9.families.display.check && audit.runtime.stage9.families.body.check && audit.runtime.stage9.families.mono.check) ? "PASS" : "INCOMPLETE"}.
- Stage 10 (skin blocks): ${report.skinCounts.systemSelectorCount} system selectors and ${report.skinCounts.dataDsCount} data-ds references in \`client/src/styles/design-system.css\`.
- Stage 11 (live switch): ${themeComplete ? "PASS" : "INCOMPLETE"}; an overall PASS requires exactly 50 combinations with reload persistence.

### Reported contrast ratios (ink on \`--bg\`)

${contrastLines || "- No stage audit values were captured."}

### Static gate commands

${staticLines || "- No static gate result was captured."}

## Axe results

- Inventory app screens: ${axe.inventoriedAppScreens}; public screens: ${axe.publicScreens}; Nick-admin screens: ${axe.adminScreens}.
  - Executed rows: ${axe.executedRows}; expected routable rows: ${axe.expectedRows}; inventoried state-only rows: ${axe.stateOnlyRows || 0}; skipped rows without an \`actualPath\`: ${axe.skippedRows}; PASS: ${axe.passRows}; serious/critical failures: ${axe.seriousCriticalRows}; incomplete: ${axe.incompleteRows}. Overall status: **${axeComplete ? "PASS" : "INCOMPLETE"}**.
- Per-screen JSON: \`docs/parity/evidence/axe/audit-567-*.json\`; aggregate: \`docs/parity/evidence/axe/audit-567-summary.json\`.
- A serious/critical zero claim is made only for rows with status PASS; incomplete rows remain blockers and are not counted as clean.

## Blockers and follow-up

${report.runError ? `- Runner error: ${report.runError.name}: ${report.runError.message}` : "- Runner completed without a top-level error."}
${axe.seriousCriticalRows ? "- Axe serious/critical findings require owning-component fixes; inspect the per-screen JSON before claiming closure." : ""}
${!axeComplete ? "- Axe evidence is incomplete; no zero serious/critical claim is made." : ""}
${axe.incompleteRows ? "- Axe incomplete rows require infrastructure/route follow-up; they are not silently waived." : ""}
${report.staticGates.some((gate) => gate.pass === false) ? "- One or more static gates failed; their output tails are retained in the summary for parent coordination." : ""}
`;
}

function freshReport({ phase, resume }) {
  const runId = `${Date.now().toString(36)}-${process.pid}`;
  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    task: "567",
    runId,
    capturedAt: new Date().toISOString(),
    base: BASE,
    phase,
    phaseStates: {
      theme: "PENDING",
      runtime: "PENDING",
      smoke: "PENDING",
      axe: "PENDING",
      "font-prepaint": "PENDING",
    },
    configuration: {
      chromium: CHROMIUM_EXECUTABLE,
      widths: [375, 768, 1024, 1440],
      axeWidths: [375, 1440],
      systems: SYSTEMS,
      accents: ACCENTS,
      smokeRoutes: SMOKE_ROUTES,
      identity: "public visitor + one disposable Nick admin",
      resume,
    },
    themeMatrix: [],
    stageAudits: [],
    interactions: [],
    smoke: { rows: [] },
    axe: { summary: {}, rows: [], files: [] },
    skinCounts: stage10SkinCounts(),
    staticGates: [
      { label: "palette-drift", status: "NOT_RUN", pass: null, reason: "retained static-worker evidence; browser runner did not rerun it" },
      { label: "accent-drift", status: "NOT_RUN", pass: null, reason: "retained static-worker evidence; browser runner did not rerun it" },
      { label: "standalone-palette-drift", status: "NOT_RUN", pass: null, reason: "retained static-worker evidence; browser runner did not rerun it" },
      { label: "font-prepaint", status: "NOT_RUN", pass: null, reason: "run only by the explicit font-prepaint phase" },
      { label: "theme-registry-types", status: "NOT_RUN", pass: null, reason: "retained static-worker evidence; browser runner did not rerun it" },
    ],
    identity: { teardown: { attempted: false, completed: false } },
    runError: null,
  };
}

function phaseSelected(requested, phase) {
  return requested === "all" || requested === phase;
}

function stageRowIsComplete(row, system, accent) {
  return Boolean(
    row?.system === system &&
      row?.accent === accent &&
      row.runtime?.stage1 &&
      row.runtime?.stage8?.contrast &&
      row.runtime?.stage9?.families,
  );
}

async function main() {
  const cli = parseCli();
  const browserPhase = cli.phase !== "font-prepaint";
  if (browserPhase) {
    assertLocalBase();
    const availability = identityAvailability();
    if (!availability.ok) {
      throw new Error(`Real disposable Nick identity is required: missing ${availability.missing.join(", ")}`);
    }
  }
  const checkpointReport = await readCheckpoint(cli.resume);
  if (!cli.resume && fs.existsSync(REPORT_PATH)) {
    throw new Error("Existing audit evidence must be resumed; use --resume or a new AUDIT_567_OUT directory.");
  }
  await fsp.mkdir(OUT, { recursive: true });
  const report = checkpointReport || freshReport(cli);
  report.runError = null;
  refreshStageContrasts(report);
  const selectedSystems = cli.systems || SYSTEMS;
  const save = (phase, detail) => checkpoint(report, phase, detail);
  await save(cli.phase, "start");

  let browser = null;
  let identity = null;
  let visitorContext = null;
  // Idempotent: tears down the disposable identity once, then closes the
  // visitor context and the leased browser. Called before the font-prepaint
  // static gate and again from `finally`.
  const releaseBrowser = async () => {
    if (identity) {
      const current = identity;
      identity = null;
      try {
        report.identity.teardown = safeTeardown(await current.teardown());
      } catch (error) {
        report.identity.teardown = safeTeardown(error?.outcome);
        report.identity.teardown.error = safeError(error);
      }
    }
    if (visitorContext) {
      const current = visitorContext;
      visitorContext = null;
      await current.close().catch(() => {});
    }
    if (browser) {
      const current = browser;
      browser = null;
      await current.close().catch(() => {});
    }
  };
  try {
    if (browserPhase) {
      browser = await launchBrowserWithLease(chromium, chromiumLaunchOptions(), "task567-browser");
      identity = await createDisposableAdmin({
        browser,
        appBase: BASE,
        secretKey: process.env.CLERK_SECRET_KEY,
        auditKey: process.env.ADMIN_PASSWORD,
        log: () => {},
      });
      await declineAnalyticsConsentViaUi({ page: identity.page, appBase: BASE });
      visitorContext = await makeContext(browser);
      const visitorPage = await visitorContext.newPage();
      await declineAnalyticsConsentViaUi({ page: visitorPage, appBase: BASE });

      if (phaseSelected(cli.phase, "theme")) {
        report.phaseStates.theme = "RUNNING";
        await save("theme", "running");
        await themeMatrix(visitorPage, report, async () => save("theme", "cell"));
        report.phaseStates.theme = report.themeMatrix.length === EXPECTED_THEME_COMBINATIONS &&
          report.themeMatrix.every((row) => row.persistence) ? "COMPLETE" : "INCOMPLETE";
        await save("theme", report.phaseStates.theme.toLowerCase());
      }

      if (phaseSelected(cli.phase, "runtime")) {
        report.phaseStates.runtime = "RUNNING";
        await save("runtime", "running");
        for (const system of selectedSystems) {
          const accent = SMOKE_SYSTEM_DEFAULTS[system];
          await selectTheme(visitorPage, system, accent);
          const prior = report.stageAudits.find((row) => row.system === system && row.accent === accent);
          if (!stageRowIsComplete(prior, system, accent)) {
            const stage = await stageAudit(visitorPage, system, accent);
            replaceRow(report.stageAudits, stage, (candidate) => `${candidate.system}|${candidate.accent}`);
            await save("runtime", `${system}-stages`);
          } else {
            log(`stages ${system} × ${accent}: RESUMED`);
          }
          await interactionSweep(visitorPage, system, accent, report, async () =>
            save("runtime", `${system}-interaction-cell`),
          );
        }
        report.phaseStates.runtime = report.stageAudits.length === EXPECTED_SYSTEMS &&
          report.interactions.length === EXPECTED_SYSTEMS * 2 ? "COMPLETE" : "INCOMPLETE";
        await save("runtime", report.phaseStates.runtime.toLowerCase());
      }

      if (phaseSelected(cli.phase, "smoke")) {
        report.phaseStates.smoke = "RUNNING";
        await save("smoke", "running");
        for (const system of selectedSystems) {
          const accent = SMOKE_SYSTEM_DEFAULTS[system];
          await smokeCapture(browser, visitorPage, identity, system, accent, report, async () =>
            save("smoke", `${system}-cell`),
            cli.screens,
          );
        }
        const smokePass = report.smoke.rows.filter((row) => row.pass).length;
        report.phaseStates.smoke = report.smoke.rows.length === EXPECTED_SMOKE_CAPTURES &&
          smokePass === EXPECTED_SMOKE_CAPTURES ? "COMPLETE" : "INCOMPLETE";
        await save("smoke", report.phaseStates.smoke.toLowerCase());
      }

      if (phaseSelected(cli.phase, "axe")) {
        report.phaseStates.axe = "RUNNING";
        await save("axe", "running");
        await selectTheme(visitorPage, "editorial", "crimson");
        const visitorState = await visitorContext.storageState();
        const catalog = await buildCatalogAdapter(BASE, { frozenAt: new Date() });
        const tokens = resolveCatalogTokens(catalog.adapter);
        const journeyResponse = await fetch(`${BASE}/api/journeys`);
        if (!journeyResponse.ok) throw new Error(`Journey inventory returned HTTP ${journeyResponse.status}`);
        const journeyBody = await journeyResponse.json();
        const journeys = Array.isArray(journeyBody) ? journeyBody : journeyBody.journeys;
        const journey = journeys?.find((item) => Number.isInteger(item.id) && item.id > 0);
        if (!journey) throw new Error("No real published journey is available for the journey-detail audit");
        // The inventory placeholder is named journeySlug, but the real
        // Journeys page links to numeric IDs, not a nonexistent slug field.
        tokens.values.journeySlug = String(journey.id);
        const tagResponse = await fetch(`${BASE}/api/tags`);
        if (!tagResponse.ok) throw new Error(`Tag inventory returned HTTP ${tagResponse.status}`);
        const tagBody = await tagResponse.json();
        const tag = tagBody.tags?.find((item) => typeof item.tag === "string" && item.count > 0);
        if (!tag) throw new Error("No real catalog tag is available for the tag audit");
        tokens.values.tagSlug = encodeURIComponent(tag.tag);
        const axeResult = await runAxe(
          browser,
          visitorState,
          identity,
          await loadInventory({ verifyGenerated: true }),
          tokens,
          report,
          async () => save("axe", "cell"),
          cli.screens,
        );
        report.axe = axeResult;
        report.phaseStates.axe = report.axe.summary.expectedRows !== undefined &&
          report.axe.summary.executedRows === report.axe.summary.expectedRows &&
          report.axe.summary.incompleteRows === 0 ? "COMPLETE" : "INCOMPLETE";
        await save("axe", report.phaseStates.axe.toLowerCase());
      }
    }

    if (phaseSelected(cli.phase, "font-prepaint")) {
      // validate:font-prepaint launches its own Chromium through the same
      // playwright-launch-lease. Release this runner's browser (and the lease it
      // holds) first, or the child waits on the lease until its 300s budget
      // expires and the phase records INCOMPLETE with no real finding.
      await releaseBrowser();
      report.phaseStates["font-prepaint"] = "RUNNING";
      await save("font-prepaint", "running");
      const result = runStaticCommand("font-prepaint", NPM_EXECUTABLE, ["run", "validate:font-prepaint"]);
      const index = report.staticGates.findIndex((gate) => gate.label === "font-prepaint");
      if (index >= 0) report.staticGates[index] = result;
      else report.staticGates.push(result);
      report.phaseStates["font-prepaint"] = result.pass ? "COMPLETE" : "INCOMPLETE";
      await save("font-prepaint", report.phaseStates["font-prepaint"].toLowerCase());
    }
  } catch (error) {
    report.runError = safeError(error);
    report.phaseStates[cli.phase] = "FAILED";
    await save(cli.phase, "failed");
  } finally {
    await releaseBrowser();
  }

  report.generatedAt = new Date().toISOString();
  await writeJsonDurably(REPORT_PATH, report);
  if (report.axe?.rows?.length) {
    await writeJsonDurably(path.join(OUT, "axe", "audit-567-summary.json"), {
      task: "567",
      status: report.axe.summary.incompleteRows || report.axe.summary.seriousCriticalRows ? "INCOMPLETE" : "PASS",
      ...report.axe.summary,
    });
  } else {
    await writeJsonDurably(path.join(OUT, "axe", "audit-567-summary.json"), {
      task: "567",
      status: "INCOMPLETE",
      reason: report.runError || "axe phase not run",
    });
  }
  await publishEvidence(report);
  log(`published evidence under docs/parity/evidence/multi-system, docs/parity/evidence/axe, and ${path.relative(ROOT, PUBLISHED_WORKLOG)}`);
  log(`theme matrix ${report.themeMatrix.filter((row) => row.persistence).length}/${report.themeMatrix.length}`);
  log(`smoke ${report.smoke.rows.filter((row) => row.pass).length}/${report.smoke.rows.length}`);
  log(`axe rows ${report.axe.summary.executedRows || 0}, serious/critical ${report.axe.summary.seriousCriticalRows || 0}, incomplete ${report.axe.summary.incompleteRows || 0}`);
  const themeComplete = report.themeMatrix.length === EXPECTED_THEME_COMBINATIONS &&
    report.themeMatrix.every((row) => row.persistence);
  const smokeComplete = report.smoke.rows.length === EXPECTED_SMOKE_CAPTURES &&
    report.smoke.rows.every((row) => row.pass);
  const axeComplete = report.axe.summary.expectedRows !== undefined &&
    report.axe.summary.executedRows === report.axe.summary.expectedRows &&
    report.axe.summary.incompleteRows === 0 &&
    report.axe.summary.seriousCriticalRows === 0;
  const runtimeComplete = report.stageAudits.length === EXPECTED_SYSTEMS &&
    report.interactions.length === EXPECTED_SYSTEMS * 2 &&
    report.interactions.every((row) => row.sidebar && row.paletteDialog);
  const selectedComplete = cli.phase === "all"
    ? themeComplete && smokeComplete && axeComplete && runtimeComplete &&
      report.staticGates.find((gate) => gate.label === "font-prepaint")?.pass === true
    : cli.phase === "theme" ? themeComplete
      : cli.phase === "runtime" ? runtimeComplete
        : cli.phase === "smoke" ? smokeComplete
          : cli.phase === "axe" ? axeComplete
            : report.staticGates.find((gate) => gate.label === "font-prepaint")?.pass === true;
  const failed = report.runError || !selectedComplete ||
    (phaseSelected(cli.phase, "axe") && ((report.axe.summary.seriousCriticalRows || 0) > 0 ||
      (report.axe.summary.incompleteRows || 0) > 0)) ||
    report.staticGates.some((gate) => gate.pass === false);
  return failed ? 1 : 0;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      process.stderr.write(`[audit-567] ${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(2);
    },
  );
}
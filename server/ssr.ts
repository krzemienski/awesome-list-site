import type { Request, Response, NextFunction } from "express";
import fs from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";
import { loadHomeSSRData } from "./home-ssr-data";
import type { HomeBoot } from "../client/src/lib/home-boot";

type HomeRenderer = {
  renderHome(context: {
    boot: HomeBoot;
    nav: unknown;
    home: unknown;
    kindCounts: unknown;
  }): { html: string; dehydratedState: unknown };
};

interface ClientManifestEntry {
  css?: string[];
  imports?: string[];
}

interface ClientManifest {
  [key: string]: ClientManifestEntry;
}

let rendererPromise: Promise<HomeRenderer> | undefined;
let templatePromise: Promise<string> | undefined;
let clientManifestPromise: Promise<ClientManifest> | undefined;
const ROOT_TEMPLATE_MARKER = '<div id="root"><!--app-html--></div>';
const MODULE_SCRIPT_MARKER = '<script type="module"';
const HTML_MARKER = "<html ";
const HEAD_CLOSE_MARKER = "</head>";
const HOME_MANIFEST_KEY = "src/pages/Home.tsx";

function countMarker(value: string, marker: string): number {
  return value.split(marker).length - 1;
}

function assertSsrTemplate(template: string): void {
  if (
    countMarker(template, ROOT_TEMPLATE_MARKER) !== 1 ||
    countMarker(template, MODULE_SCRIPT_MARKER) !== 1 ||
    countMarker(template, HTML_MARKER) !== 1 ||
    countMarker(template, HEAD_CLOSE_MARKER) !== 1
  ) {
    throw new Error("Home SSR template replacement marker is missing or ambiguous");
  }
}

function readCookie(req: Request, name: string): string | null {
  const match = (req.headers.cookie || "").match(
    new RegExp(`(?:^|;\\s*)${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`),
  );
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

function homeBoot(req: Request): HomeBoot {
  const url = new URL(req.originalUrl || req.url, "http://home-ssr.invalid");
  const requested = url.searchParams.get("layout");
  const stored = readCookie(req, "awesome-video-home-layout");
  const layout =
    requested === "curated" || requested === "index"
      ? requested
      : stored === "curated"
        ? "curated"
        : "index";
  const consent = readCookie(req, "analytics-consent");
  const sidebar = readCookie(req, "sidebar_state");
  const userAgent = req.headers["user-agent"] || "";
  const viewport =
    /(?:iphone|ipod|android.+mobile|windows phone)/i.test(userAgent)
      ? "phone"
      : /(?:ipad|tablet|android)/i.test(userAgent)
        ? "tablet"
        : "desktop";
  return {
    path: "/",
    url: `${url.pathname}${url.search}`,
    search: url.search,
    layout,
    layoutSource:
      requested === "curated" || requested === "index"
        ? "url"
        : stored === "curated" || stored === "index"
          ? "cookie"
          : "default",
    theme: "prepaint",
    viewport,
    // The persisted cookie wins; otherwise desktop starts expanded while
    // tablet/phone start closed, matching the shell's breakpoint policy.
    sidebarOpen: sidebar === "true" ? true : sidebar === "false" ? false : viewport === "desktop",
    consent: consent === "granted" || consent === "denied" ? consent : null,
    isAnonymous: true,
  };
}

function safeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

async function importRenderer(): Promise<HomeRenderer> {
  const rendererPath = pathToFileURL(
    path.resolve(import.meta.dirname, "ssr", "entry-server.js"),
  ).href;
  let loaded: unknown;
  try {
    loaded = await import(rendererPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`[home-ssr] failed to import renderer from ${rendererPath}: ${message}`);
  }
  if (
    !loaded ||
    typeof loaded !== "object" ||
    typeof (loaded as Partial<HomeRenderer>).renderHome !== "function"
  ) {
    throw new Error(
      `[home-ssr] renderer module at ${rendererPath} does not export renderHome`,
    );
  }
  return loaded as HomeRenderer;
}

function renderer(): Promise<HomeRenderer> {
  // Clear a rejected import so the normal document fallback can retry on a
  // later request. A transient startup/filesystem failure must not poison
  // every subsequent request with the same settled rejection.
  rendererPromise ??= importRenderer().catch((error: unknown) => {
    rendererPromise = undefined;
    throw error;
  });
  return rendererPromise;
}

/**
 * Load the compiled Home renderer without touching request data or the
 * database. Production startup awaits this before listening so the first
 * anonymous Home request does not pay the cold module-import cost.
 */
export async function prewarmSSRRenderer(): Promise<void> {
  await renderer();
}

function clientManifest(): Promise<ClientManifest> {
  clientManifestPromise ??= fs
    .readFile(
      path.resolve(import.meta.dirname, "public", ".vite", "manifest.json"),
      "utf8",
    )
    .then((raw) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`[home-ssr] failed to parse the client manifest: ${message}`);
      }
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("[home-ssr] client manifest must contain an object");
      }
      return parsed as ClientManifest;
    })
    .catch((error: unknown) => {
      clientManifestPromise = undefined;
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`[home-ssr] failed to load the client manifest: ${message}`);
    });
  return clientManifestPromise;
}

function manifestAssetHref(file: string): string {
  const normalized = file.replaceAll("\\", "/");
  if (!normalized.startsWith("assets/") || normalized.includes("..")) {
    throw new Error(`[home-ssr] client manifest contains an unsafe asset path: ${file}`);
  }
  return `/${normalized}`;
}

function homeStylesheetHrefs(manifest: ClientManifest): string[] {
  const homeEntry = manifest[HOME_MANIFEST_KEY];
  if (!homeEntry) {
    throw new Error(
      `[home-ssr] client manifest is missing the ${HOME_MANIFEST_KEY} entry`,
    );
  }

  const visited = new Set<string>();
  const stylesheets = new Set<string>();
  const visit = (key: string) => {
    if (visited.has(key)) return;
    visited.add(key);
    const entry = manifest[key];
    if (!entry) {
      throw new Error(`[home-ssr] client manifest is missing imported entry ${key}`);
    }
    for (const imported of entry.imports ?? []) {
      if (typeof imported !== "string") {
        throw new Error(`[home-ssr] client manifest has a non-string import for ${key}`);
      }
      visit(imported);
    }
    for (const file of entry.css ?? []) {
      if (typeof file !== "string") {
        throw new Error(`[home-ssr] client manifest has a non-string CSS asset for ${key}`);
      }
      stylesheets.add(manifestAssetHref(file));
    }
  };
  visit(HOME_MANIFEST_KEY);
  return [...stylesheets];
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function homeStylesheetLinks(template: string): Promise<string> {
  return clientManifest().then((manifest) => {
    const existing = new Set<string>();
    const hrefPattern = /<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi;
    for (const match of template.matchAll(hrefPattern)) {
      if (match[1]) existing.add(match[1]);
    }
    const links = homeStylesheetHrefs(manifest)
      .filter((href) => !existing.has(href))
      .map(
        (href) =>
          `    <link rel="stylesheet" crossorigin href="${escapeHtmlAttribute(href)}" />`,
      );
    return links.length ? `${links.join("\n")}\n` : "";
  });
}

/**
 * Validate the compiled document contract without loading request-local data.
 * The audit server uses this before listening so an absent manifest, Home CSS
 * entry, or emitted CSS asset cannot be mistaken for a successful SSR audit.
 */
export async function validateHomeSSRAssets(): Promise<void> {
  const [htmlTemplate, manifest] = await Promise.all([template(), clientManifest()]);
  assertSsrTemplate(htmlTemplate);

  const homeEntry = manifest[HOME_MANIFEST_KEY];
  if (!homeEntry || !Array.isArray(homeEntry.css) || homeEntry.css.length === 0) {
    throw new Error(
      `[home-ssr] client manifest ${HOME_MANIFEST_KEY} entry has no CSS assets`,
    );
  }
  const stylesheetHrefs = homeStylesheetHrefs(manifest);
  const publicDir = path.resolve(import.meta.dirname, "public");
  await Promise.all(
    stylesheetHrefs.map(async (href) => {
      const assetPath = path.resolve(publicDir, href.slice(1));
      try {
        const stats = await fs.stat(assetPath);
        if (!stats.isFile()) {
          throw new Error("path is not a regular file");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`[home-ssr] compiled CSS asset ${href} is unavailable: ${message}`);
      }
    }),
  );
}

async function template(): Promise<string> {
  templatePromise ??= fs
    .readFile(path.resolve(import.meta.dirname, "public", "index.html"), "utf8")
    .catch((error: unknown) => {
      // Do not poison subsequent requests with a transient deploy/filesystem
      // failure. This matches the retry behavior of the renderer and manifest
      // caches while preserving the normal production SPA fallback.
      templatePromise = undefined;
      throw error;
    });
  return templatePromise;
}

/**
 * Exact-tree SSR is deliberately limited to the anonymous public Home route.
 * Session-bearing requests retain the existing SPA path until Clerk's official
 * server initial-state contract is available; we never serialize identity,
 * claims, tokens, or a fabricated anonymous auth snapshot.
 */
export async function handleSSR(req: Request, res: Response, next: NextFunction) {
  const requestedUrl = new URL(req.originalUrl || req.url, "http://home-ssr.invalid");
  const layoutValues = requestedUrl.searchParams.getAll("layout");
  const hasOnlyValidLayout =
    [...requestedUrl.searchParams.keys()].every((key) => key === "layout") &&
    layoutValues.length <= 1 &&
    (layoutValues.length === 0 || layoutValues[0] === "index" || layoutValues[0] === "curated");
  if (
    req.method !== "GET" ||
    req.path !== "/" ||
    !hasOnlyValidLayout ||
    /(?:^|;\s*)__session[^=;]*=/.test(req.headers.cookie || "")
  ) {
    return next();
  }

  try {
    const [data, render, htmlTemplate] = await Promise.all([
      loadHomeSSRData(),
      renderer(),
      template(),
    ]);
    assertSsrTemplate(htmlTemplate);
    const homeCssLinks = await homeStylesheetLinks(htmlTemplate);
    const boot = homeBoot(req);
    const rendered = render.renderHome({ boot, ...data });
    const state = safeJson({ boot, dehydratedState: rendered.dehydratedState });
    const root = `<div id="root" data-home-ssr="true">${rendered.html}</div>`;
    const bootstrap = `<script>window.__HOME_SSR__=${state};</script>\n    ${MODULE_SCRIPT_MARKER}`;
    const document = htmlTemplate
      .replace(HTML_MARKER, '<html data-home-ssr="true" ')
      .replace(HEAD_CLOSE_MARKER, `${homeCssLinks}${HEAD_CLOSE_MARKER}`)
      .replace(ROOT_TEMPLATE_MARKER, root)
      .replace(MODULE_SCRIPT_MARKER, bootstrap);
    if (
      !document.includes('<html data-home-ssr="true" ') ||
      !document.includes(root) ||
      !document.includes(bootstrap)
    ) {
      throw new Error("Home SSR document replacement failed");
    }
    res.type("html").send(document);
  } catch (error) {
    // A document-render failure must not turn a healthy public route into a
    // blank/error page. The normal static SPA remains the explicit fallback.
    console.error("[home-ssr] render failed; using the existing SPA fallback", error);
    next();
  }
}
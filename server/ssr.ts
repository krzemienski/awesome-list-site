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

let rendererPromise: Promise<HomeRenderer> | undefined;
let templatePromise: Promise<string> | undefined;
const ROOT_TEMPLATE_MARKER = '<div id="root"><!--app-html--></div>';
const MODULE_SCRIPT_MARKER = '<script type="module"';
const HTML_MARKER = "<html ";

function countMarker(value: string, marker: string): number {
  return value.split(marker).length - 1;
}

function assertSsrTemplate(template: string): void {
  if (
    countMarker(template, ROOT_TEMPLATE_MARKER) !== 1 ||
    countMarker(template, MODULE_SCRIPT_MARKER) !== 1 ||
    countMarker(template, HTML_MARKER) !== 1
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

async function renderer(): Promise<HomeRenderer> {
  rendererPromise ??= import(
    pathToFileURL(path.resolve(import.meta.dirname, "ssr", "entry-server.js")).href,
  ) as Promise<HomeRenderer>;
  return rendererPromise;
}

async function template(): Promise<string> {
  templatePromise ??= fs.readFile(
    path.resolve(import.meta.dirname, "public", "index.html"),
    "utf8",
  );
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
    const boot = homeBoot(req);
    const rendered = render.renderHome({ boot, ...data });
    const state = safeJson({ boot, dehydratedState: rendered.dehydratedState });
    const root = `<div id="root" data-home-ssr="true">${rendered.html}</div>`;
    const bootstrap = `<script>window.__HOME_SSR__=${state};</script>\n    ${MODULE_SCRIPT_MARKER}`;
    const document = htmlTemplate
      .replace(HTML_MARKER, '<html data-home-ssr="true" ')
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
import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

export const SITE_URL =
  process.env.PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://new.awesome.video";
export const SITE_NAME = "Awesome Video";
export const SITE_TAGLINE =
  "The curated index of 2,600+ video development resources — players, encoders, codecs, streaming, AI, tools, and community.";

export interface RouteMeta {
  title: string;
  description: string;
  url: string;
  image: string;
  imageAlt: string;
  type: "website" | "article";
  keywords?: string;
}

function abs(path: string) {
  if (!path) return SITE_URL + "/";
  if (path.startsWith("http")) return path;
  return SITE_URL + (path.startsWith("/") ? path : "/" + path);
}

function ogImage(title: string, category?: string, count?: number | string) {
  const params = new URLSearchParams();
  if (title) params.set("title", title);
  if (category) params.set("category", category);
  if (count != null) params.set("resourceCount", String(count));
  return `${SITE_URL}/og-image.png?${params.toString()}`;
}

function defaultMeta(url: string): RouteMeta {
  return {
    title: `${SITE_NAME} — Curated video development resources`,
    description: SITE_TAGLINE,
    url: abs(url),
    image: ogImage(SITE_NAME),
    imageAlt: `${SITE_NAME} — curated video development resources`,
    type: "website",
    keywords:
      "video development, ffmpeg, hls, dash, video players, encoders, codecs, streaming, video ai, awesome video",
  };
}

// Small TTL cache so we don't hit the DB on every crawler/browser HTML request.
// Per-route metadata changes rarely (category renames, journey edits) — a 60s
// window is fine and still keeps crawler previews fresh after a deploy.
const META_CACHE = new Map<string, { meta: RouteMeta; expires: number }>();
const META_CACHE_TTL_MS = 60_000;
const META_CACHE_MAX = 500;

async function metaForUrl(url: string): Promise<RouteMeta> {
  const key = url.split("?")[0];
  const now = Date.now();
  const cached = META_CACHE.get(key);
  if (cached && cached.expires > now) return cached.meta;
  const meta = await metaForUrlUncached(url);
  if (META_CACHE.size >= META_CACHE_MAX) {
    // Simple eviction: drop the oldest ~10% entries
    const drop = Math.ceil(META_CACHE_MAX / 10);
    let i = 0;
    for (const k of META_CACHE.keys()) {
      if (i++ >= drop) break;
      META_CACHE.delete(k);
    }
  }
  META_CACHE.set(key, { meta, expires: now + META_CACHE_TTL_MS });
  return meta;
}

async function metaForUrlUncached(url: string): Promise<RouteMeta> {
  const path = url.split("?")[0].replace(/\/+$/, "") || "/";

  // Home
  if (path === "/" || path === "") {
    const m = defaultMeta(path);
    try {
      const data = await storage.getAwesomeListFromDatabase();
      const resourceCount = data?.resources?.length ?? 2600;
      const categoryCount = data?.categories?.length ?? 80;
      m.title = `${SITE_NAME} — ${resourceCount}+ curated video development resources`;
      m.description = `Browse ${resourceCount}+ tools, libraries, players, codecs, and learning resources across ${categoryCount}+ categories of video development.`;
      m.image = ogImage(SITE_NAME, "Home", resourceCount);
    } catch {}
    return m;
  }

  // Static page routes
  const staticRoutes: Record<string, Partial<RouteMeta>> = {
    "/about": {
      title: `About — ${SITE_NAME}`,
      description: `Learn about ${SITE_NAME}, the open-source index of video development resources, and the team behind it.`,
    },
    "/advanced": {
      title: `Advanced — ${SITE_NAME}`,
      description: `Power-user tools for ${SITE_NAME}: category explorer, analytics dashboard, link health, and bulk export.`,
    },
    "/journeys": {
      title: `Learning Journeys — ${SITE_NAME}`,
      description: `Guided multi-step learning paths for video development — from beginner streaming to advanced encoding pipelines.`,
    },
    "/submit": {
      title: `Submit a Resource — ${SITE_NAME}`,
      description: `Suggest a new video development tool, library, article, or course for inclusion in ${SITE_NAME}.`,
    },
    "/login": {
      title: `Sign In — ${SITE_NAME}`,
      description: `Sign in to ${SITE_NAME} to save bookmarks, submit resources, and personalize your learning journey.`,
    },
    "/profile": {
      title: `Profile — ${SITE_NAME}`,
      description: `Your ${SITE_NAME} profile, bookmarks, and learning progress.`,
    },
    "/bookmarks": {
      title: `Bookmarks — ${SITE_NAME}`,
      description: `Your saved video development resources on ${SITE_NAME}.`,
    },
    "/settings/theme": {
      title: `Theme Settings — ${SITE_NAME}`,
      description: `Customize the look and feel of ${SITE_NAME} — switch fonts and color themes.`,
    },
    "/admin": {
      title: `Admin — ${SITE_NAME}`,
      description: `${SITE_NAME} admin panel.`,
    },
  };
  if (staticRoutes[path]) {
    const m = defaultMeta(path);
    Object.assign(m, staticRoutes[path]);
    m.image = ogImage(m.title.split(" — ")[0]);
    return m;
  }

  // /category/:slug
  const catMatch = path.match(/^\/category\/([^\/]+)$/);
  if (catMatch) {
    const slug = decodeURIComponent(catMatch[1]);
    const m = defaultMeta(path);
    try {
      const cat = await storage.getCategoryBySlug(slug);
      if (cat) {
        const res = await storage
          .listResources({ category: cat.name, limit: 1, status: "published" } as any)
          .catch(() => ({ resources: [], total: 0 }));
        const count = (res as any)?.total ?? 0;
        m.title = `${cat.name} — ${SITE_NAME}`;
        m.description = cat.description
          ? `${cat.description} — ${count} curated resources on ${SITE_NAME}.`
          : `Browse ${count} curated ${cat.name.toLowerCase()} resources for video development on ${SITE_NAME}.`;
        m.image = ogImage(cat.name, cat.name, count);
        m.type = "article";
      }
    } catch {}
    return m;
  }

  // /subcategory/:slug and /sub-subcategory/:slug
  const subMatch = path.match(/^\/(?:subcategory|sub-subcategory)\/([^\/]+)$/);
  if (subMatch) {
    const slug = decodeURIComponent(subMatch[1]);
    const m = defaultMeta(path);
    m.title = `${slug.replace(/-/g, " ")} — ${SITE_NAME}`;
    m.description = `Curated video development resources in the ${slug.replace(/-/g, " ")} subcategory on ${SITE_NAME}.`;
    m.image = ogImage(slug.replace(/-/g, " "));
    m.type = "article";
    return m;
  }

  // /resource/:id
  const resMatch = path.match(/^\/resource\/([^\/]+)$/);
  if (resMatch) {
    const idNum = Number(decodeURIComponent(resMatch[1]));
    const m = defaultMeta(path);
    if (Number.isFinite(idNum)) {
      try {
        const resource = await storage.getResource(idNum).catch(() => undefined as any);
        if (resource) {
          m.title = `${resource.title} — ${SITE_NAME}`;
          m.description =
            (resource.description || "").slice(0, 280) ||
            `${resource.title} on ${SITE_NAME} — curated video development resource.`;
          m.image = (resource as any).imageUrl || ogImage(resource.title);
          m.type = "article";
        }
      } catch {}
    }
    return m;
  }

  // /journey/:id
  const jMatch = path.match(/^\/journey\/([^\/]+)$/);
  if (jMatch) {
    const idNum = Number(decodeURIComponent(jMatch[1]));
    const m = defaultMeta(path);
    if (Number.isFinite(idNum)) {
      try {
        const journey = await storage.getLearningJourney(idNum).catch(() => undefined as any);
        if (journey) {
          m.title = `${journey.title} — Learning Journey — ${SITE_NAME}`;
          m.description = journey.description
            ? String(journey.description).slice(0, 280)
            : `Multi-step learning journey on ${SITE_NAME}: ${journey.title}.`;
          m.image = ogImage(journey.title, "Learning Journey");
          m.type = "article";
        }
      } catch {}
    }
    return m;
  }

  return defaultMeta(path);
}

const META_BLOCK_MARKER = "<!--OG_META_INJECTED-->";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function buildMetaTags(m: RouteMeta): string {
  const t = escapeHtml(m.title);
  const d = escapeHtml(m.description);
  const u = escapeHtml(m.url);
  const img = escapeHtml(m.image);
  const imgAlt = escapeHtml(m.imageAlt);
  const kw = escapeHtml(m.keywords || "");
  return `${META_BLOCK_MARKER}
    <title>${t}</title>
    <meta name="description" content="${d}" />
    ${kw ? `<meta name="keywords" content="${kw}" />` : ""}
    <link rel="canonical" href="${u}" />
    <meta property="og:type" content="${m.type}" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:url" content="${u}" />
    <meta property="og:title" content="${t}" />
    <meta property="og:description" content="${d}" />
    <meta property="og:image" content="${img}" />
    <meta property="og:image:secure_url" content="${img}" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${imgAlt}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@awesome_video" />
    <meta name="twitter:title" content="${t}" />
    <meta name="twitter:description" content="${d}" />
    <meta name="twitter:image" content="${img}" />
    <meta name="twitter:image:alt" content="${imgAlt}" />
    <meta name="theme-color" content="#ff3d52" />
    <meta name="msapplication-TileColor" content="#ff3d52" />
    <meta name="application-name" content="${SITE_NAME}" />
    <meta name="apple-mobile-web-app-title" content="${SITE_NAME}" />`;
}

// Strip any existing <title>, og:*, twitter:*, name="description"/keywords, canonical
// from the HTML <head>, then inject the new block immediately after <head>.
function rewriteHead(html: string, meta: RouteMeta): string {
  // Remove existing title, description, keywords, canonical, og:*, twitter:* meta
  let out = html
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\s+name=["']description["'][^>]*>/gi, "")
    .replace(/<meta\s+name=["']keywords["'][^>]*>/gi, "")
    .replace(/<link\s+rel=["']canonical["'][^>]*>/gi, "")
    .replace(/<meta\s+property=["']og:[^"']+["'][^>]*>/gi, "")
    .replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>/gi, "")
    .replace(/<meta\s+name=["']theme-color["'][^>]*>/gi, "")
    .replace(/<meta\s+name=["']msapplication-TileColor["'][^>]*>/gi, "")
    .replace(/<meta\s+name=["']application-name["'][^>]*>/gi, "")
    .replace(/<meta\s+name=["']apple-mobile-web-app-title["'][^>]*>/gi, "");

  // Inject right after <head ...>
  out = out.replace(/<head([^>]*)>/i, `<head$1>\n    ${buildMetaTags(meta)}`);
  return out;
}

// Express middleware that intercepts HTML responses and rewrites <head> with
// route-specific OG/Twitter/SEO tags. Mount BEFORE any HTML-serving middleware
// (vite dev middlewares or static index.html fallback).
export function ogInjectionMiddleware() {
  return async function ogInject(req: Request, res: Response, next: NextFunction) {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    const urlPath = (req.originalUrl || req.url).split("?")[0];

    // Skip API + Vite internals + static assets (have a file extension)
    if (
      urlPath.startsWith("/api") ||
      urlPath.startsWith("/@") ||
      urlPath.startsWith("/src/") ||
      urlPath.startsWith("/node_modules") ||
      /\.[a-z0-9]+$/i.test(urlPath)
    ) {
      return next();
    }

    let meta: RouteMeta | null = null;
    try {
      meta = await metaForUrl(urlPath);
    } catch (e) {
      console.warn("[og-middleware] meta lookup failed for", urlPath, e);
      meta = defaultMeta(urlPath);
    }

    // Wrap res.end / res.write to capture HTML and rewrite it.
    const origWrite = res.write.bind(res);
    const origEnd = res.end.bind(res);
    const chunks: Buffer[] = [];
    let isHtml: boolean | null = null;

    function checkHtml() {
      if (isHtml !== null) return isHtml;
      const ct = String(res.getHeader("content-type") || "");
      isHtml = ct.includes("text/html");
      return isHtml;
    }

    res.write = function (chunk: any, ...args: any[]): boolean {
      if (chunk && checkHtml()) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        return true;
      }
      return (origWrite as any)(chunk, ...args);
    } as any;

    res.end = function (chunk?: any, ...args: any[]): any {
      if (chunk && checkHtml()) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      if (checkHtml() && chunks.length) {
        try {
          let html = Buffer.concat(chunks).toString("utf-8");
          // Only rewrite if it looks like a full HTML document
          if (/<head[\s>]/i.test(html)) {
            html = rewriteHead(html, meta!);
          }
          const buf = Buffer.from(html, "utf-8");
          res.setHeader("content-length", buf.length);
          return (origEnd as any)(buf, ...args);
        } catch (e) {
          console.warn("[og-middleware] rewrite failed", e);
          // Fall through with original concatenated bytes
          return (origEnd as any)(Buffer.concat(chunks), ...args);
        }
      }
      return (origEnd as any)(chunk, ...args);
    } as any;

    next();
  };
}

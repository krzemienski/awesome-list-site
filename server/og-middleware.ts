import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { getAboutFaqs } from "@shared/faq";
import { MAINTAINER } from "@shared/about-content";
import {
  homeSeoTitle,
  homeSeoDescription,
  categorySeoTitleCore,
  categorySeoDescription,
  advancedSeoTitle,
  advancedSeoDescription,
  submitSeoTitle,
  submitSeoDescription,
  clampSeoTitle,
  clampSeoDescription,
  ogImagePath,
} from "@shared/seo-templates";
import {
  renderHomeContent,
  renderTaxonomyContent,
  renderResourceContent,
  renderJourneysContent,
  renderJourneyContent,
  renderStaticPageContent,
  renderSearchContent,
  renderCategoriesContent,
} from "./seo-content";
import { buildRelatedResources } from "./services/relatedResources";

export const SITE_URL =
  process.env.PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://awesome.video";
export const SITE_NAME = "Awesome Video";
export const SITE_TAGLINE =
  "The curated index of 2,000+ video development resources — players, encoders, codecs, streaming, AI, tools, and community.";

export interface RouteMeta {
  title: string;
  description: string;
  url: string;
  image: string;
  imageAlt: string;
  type: "website" | "article";
  keywords?: string;
  /**
   * When true the page is excluded from search: buildMetaTags emits a static
   * `noindex,nofollow` robots tag and OMITS the self-referencing canonical +
   * og:url. Two cases use this:
   *   1. Soft-404s (unknown/non-existent route served as the SPA shell) — these
   *      ALSO get HTTP 404 from the middleware because `found` is false.
   *   2. Valid utility pages with no search value (e.g. /login, /register) —
   *      these stay HTTP 200 because `found` is true; only the index signal is
   *      suppressed. These may still opt in to prerendered body injection
   *      (noindex governs indexing, not readability); soft-404s never receive
   *      an injected body because `found` is false (`!notFound` guard).
   */
  noindex?: boolean;
  /**
   * Route-appropriate JSON-LD structured data (a single schema.org object or an
   * array of them). buildMetaTags emits one `<script type="application/ld+json">`
   * per object. Skipped entirely for soft-404 (noindex) pages so invalid URLs
   * never ship rich-result markup.
   */
  structuredData?: unknown;
}

/** A resolved route: its metadata plus whether the route actually exists. */
interface ResolvedRoute {
  meta: RouteMeta;
  /** false → unknown route / missing entity → soft-404 (HTTP 404 + noindex). */
  found: boolean;
  /**
   * Prerendered semantic body HTML for the SPA shell (Task #80). Present only
   * for found, indexable public routes; injected into `<!--app-html-->` so
   * non-JS crawlers see real content. Absent for soft-404s and auth/internal
   * routes (those keep the empty shell).
   */
  bodyHtml?: string;
}

function abs(path: string) {
  if (!path) return SITE_URL + "/";
  if (path.startsWith("http")) return path;
  return SITE_URL + (path.startsWith("/") ? path : "/" + path);
}

// R4-024/T007: the og-image endpoint resolves the display title/category
// SERVER-SIDE from the route path (never from caller-supplied text params), so
// the only parameter the URL carries is the path itself. The shared
// ogImagePath() builder keeps this byte-identical with the client SEOHead URL.
function ogImage(path: string) {
  return `${SITE_URL}${ogImagePath(path)}`;
}

function defaultMeta(url: string): RouteMeta {
  return {
    title: `${SITE_NAME} — Curated video development resources`,
    description: SITE_TAGLINE,
    url: abs(url),
    image: ogImage(url),
    imageAlt: `${SITE_NAME} — curated video development resources`,
    type: "website",
    keywords:
      "video development, ffmpeg, hls, dash, video players, encoders, codecs, streaming, video ai, awesome video",
  };
}

// Small TTL cache so we don't hit the DB on every crawler/browser HTML request.
// Per-route metadata changes rarely (category renames, journey edits) — a 60s
// window is fine and still keeps crawler previews fresh after a deploy.
const META_CACHE = new Map<string, { value: ResolvedRoute; expires: number }>();
const META_CACHE_TTL_MS = 60_000;
const META_CACHE_MAX = 500;

// Parse a 1-based ?page= param; anything not an integer > 1 collapses to page 1
// so the cache key and rendered slice stay canonical.
function parsePage(url: string): number {
  const q = url.split("?")[1] || "";
  const n = Number(new URLSearchParams(q).get("page"));
  return Number.isInteger(n) && n > 1 ? n : 1;
}

// Parse and bound the ?q= search term (BUG-002). Capped so an attacker cannot
// blow up the rendered HTML; escaping happens at render time.
function parseQueryParam(url: string): string {
  const q = url.split("?")[1] || "";
  return (new URLSearchParams(q).get("q") || "").trim().slice(0, 100);
}

async function resolveRoute(url: string): Promise<ResolvedRoute> {
  const cleanPath = url.split("?")[0].replace(/\/+$/, "") || "/";
  // /search is query-driven with an unbounded key space — never cache it
  // (cache poisoning / unbounded memory). /reset-password and /forgot-password
  // carry a secret token in the query; never let a token-bearing URL become a
  // cache key. All are cheap to resolve fresh. Always bypass the cache.
  if (
    cleanPath === "/search" ||
    cleanPath === "/reset-password" ||
    cleanPath === "/forgot-password"
  ) {
    return resolveRouteUncached(url);
  }
  // Only ?page= differentiates cacheable routes; fold it into the key so page 2
  // is not served page 1's cached body (BUG-001). All other params are ignored.
  const page = parsePage(url);
  const key = page > 1 ? `${cleanPath}?page=${page}` : cleanPath;
  const now = Date.now();
  const cached = META_CACHE.get(key);
  if (cached && cached.expires > now) return cached.value;
  const value = await resolveRouteUncached(url);
  if (META_CACHE.size >= META_CACHE_MAX) {
    // Simple eviction: drop the oldest ~10% entries
    const drop = Math.ceil(META_CACHE_MAX / 10);
    let i = 0;
    for (const k of META_CACHE.keys()) {
      if (i++ >= drop) break;
      META_CACHE.delete(k);
    }
  }
  META_CACHE.set(key, { value, expires: now + META_CACHE_TTL_MS });
  return value;
}

// Soft-404 metadata: a known-shape page rendered for an unknown URL. Marked
// noindex so buildMetaTags drops the self-referencing canonical/og:url and emits
// a static robots noindex tag; the middleware additionally sets HTTP 404.
function notFoundMeta(url: string): RouteMeta {
  const m = defaultMeta(url);
  m.title = `Page Not Found — ${SITE_NAME}`;
  m.description = `The page you're looking for doesn't exist on ${SITE_NAME}. Browse the curated index of video development resources instead.`;
  m.image = ogImage("/");
  m.type = "website";
  m.noindex = true;
  return m;
}

// ---------------------------------------------------------------------------
// JSON-LD structured data (Task #78)
//
// The server is the authority for route-appropriate schema.org markup: it is the
// only thing non-rendering crawlers see, and it is injected into the same HTML a
// rendering crawler later hydrates. The client SEOHead deliberately ships NO
// JSON-LD so the two pipelines can never disagree.
// ---------------------------------------------------------------------------

type Crumb = { name: string; path?: string };

function orgSchema() {
  // @id lets any future top-level Organization node dedupe cleanly against this
  // one when it is nested as WebSite.publisher. logo points at the real,
  // publicly-served brand asset (favicon.svg is scalable, so it satisfies the
  // ≥112px logo requirement); founder/sameAs carry verifiable E-E-A-T links
  // only (GitHub) — no fabricated profiles.
  return {
    "@type": "Organization",
    "@id": SITE_URL + "/#organization",
    name: SITE_NAME,
    url: SITE_URL + "/",
    logo: {
      "@type": "ImageObject",
      url: SITE_URL + "/favicon.svg",
    },
    description:
      "A free, curated directory of video development resources — encoders, players, codecs, streaming tools, specifications, and learning materials.",
    founder: {
      "@type": "Person",
      name: MAINTAINER.name,
      url: MAINTAINER.profileUrl,
    },
    sameAs: [
      "https://github.com/krzemienski/awesome-video",
      "https://github.com/krzemienski",
    ],
  };
}

function webSiteSchema(description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL + "/",
    description,
    inLanguage: "en-US",
    publisher: orgSchema(),
    // SearchAction enables the Google sitelinks search box. It targets the
    // in-app /search route; that route is noindex, which is fine — the search
    // box drives users into live results, it does not need the target indexed.
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: SITE_URL + "/search?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };
}

function breadcrumbSchema(items: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => {
      const li: Record<string, unknown> = {
        "@type": "ListItem",
        position: i + 1,
        name: it.name,
      };
      // A ListItem URL must be absolute. The final (current) crumb may omit it.
      if (it.path) li.item = abs(it.path);
      return li;
    }),
  };
}

function collectionPageSchema(opts: {
  name: string;
  description: string;
  path: string;
  numberOfItems?: number;
}) {
  const cp: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: opts.name,
    description: opts.description,
    url: abs(opts.path),
    inLanguage: "en-US",
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL + "/" },
  };
  if (typeof opts.numberOfItems === "number") {
    cp.mainEntity = { "@type": "ItemList", numberOfItems: opts.numberOfItems };
  }
  return cp;
}

function webPageSchema(opts: {
  name: string;
  description: string;
  path: string;
  mainEntity?: unknown;
}) {
  const wp: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: opts.name,
    description: opts.description,
    url: abs(opts.path),
    inLanguage: "en-US",
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL + "/" },
  };
  if (opts.mainEntity) wp.mainEntity = opts.mainEntity;
  return wp;
}

// Recursive count of distinct resources under a taxonomy node. The hierarchical
// tree (getAwesomeListFromDatabase) places every approved resource in exactly
// ONE node, so summing each level's own `resources` array yields the accurate
// total — unlike the prior `listResources({ status: "published" })` lookup,
// which returned 0 because public resources are status "approved".
function countNodeResources(node: any): number {
  let n = Array.isArray(node?.resources) ? node.resources.length : 0;
  for (const s of node?.subcategories ?? []) n += countNodeResources(s);
  for (const ss of node?.subSubcategories ?? []) n += countNodeResources(ss);
  return n;
}

// Module-level tree cache: taxonomy + resource breadcrumb resolution all need
// the hierarchical tree. A 60s TTL (matching META_CACHE) keeps a full crawl of
// hundreds of distinct taxonomy/resource URLs to one tree build per minute.
let TREE_CACHE: { value: any; expires: number } | null = null;
const TREE_CACHE_TTL_MS = 60_000;
async function getTreeCached(): Promise<any> {
  const now = Date.now();
  if (TREE_CACHE && TREE_CACHE.expires > now) return TREE_CACHE.value;
  const value = await storage.getAwesomeListFromDatabase();
  TREE_CACHE = { value, expires: now + TREE_CACHE_TTL_MS };
  return value;
}

type TaxoMatch = {
  name: string;
  path: string;
  count: number;
  crumbs: Crumb[];
  node: any;
};

function findCategory(tree: any, slug: string): TaxoMatch | null {
  const cat = (tree?.categories ?? []).find((c: any) => c.slug === slug);
  if (!cat) return null;
  const path = `/category/${cat.slug}`;
  return {
    name: cat.name,
    path,
    count: countNodeResources(cat),
    crumbs: [{ name: "Home", path: "/" }, { name: cat.name, path }],
    node: cat,
  };
}

function findSubcategory(tree: any, slug: string): TaxoMatch | null {
  for (const cat of tree?.categories ?? []) {
    const sub = (cat.subcategories ?? []).find((s: any) => s.slug === slug);
    if (sub) {
      const path = `/subcategory/${sub.slug}`;
      return {
        name: sub.name,
        path,
        count: countNodeResources(sub),
        crumbs: [
          { name: "Home", path: "/" },
          { name: cat.name, path: `/category/${cat.slug}` },
          { name: sub.name, path },
        ],
        node: sub,
      };
    }
  }
  return null;
}

function findSubSubcategory(tree: any, slug: string): TaxoMatch | null {
  for (const cat of tree?.categories ?? []) {
    for (const sub of cat.subcategories ?? []) {
      const ss = (sub.subSubcategories ?? []).find((x: any) => x.slug === slug);
      if (ss) {
        const path = `/sub-subcategory/${ss.slug}`;
        return {
          name: ss.name,
          path,
          count: countNodeResources(ss),
          crumbs: [
            { name: "Home", path: "/" },
            { name: cat.name, path: `/category/${cat.slug}` },
            { name: sub.name, path: `/subcategory/${sub.slug}` },
            { name: ss.name, path },
          ],
          node: ss,
        };
      }
    }
  }
  return null;
}

// Decode a URL path segment without throwing on malformed percent-encoding.
// A malformed segment (e.g. an incomplete "%E0%A4") can never match a real
// slug/id, so returning the raw value lets the existence check fall through to
// a proper soft-404 instead of bubbling a URIError up to the fail-open catch.
function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

async function resolveRouteUncached(url: string): Promise<ResolvedRoute> {
  const path = url.split("?")[0].replace(/\/+$/, "") || "/";
  const page = parsePage(url);

// BUG-004 / BUG-035: static header chrome for HTML-grounded clients (the SPA's
// pre-hydration shell sees an empty top-bar / zero search inputs). Emits the
// same affordances AppHeader.tsx renders after hydration, so crawlers and
// non-JS visitors can find the search form and toggle the navigation drawer.
function homeShellChrome(): string {
  return [
    '<header class="ssr-chrome" data-testid="ssr-home-header">',
    '  <button type="button" aria-label="Toggle navigation menu" data-testid="mobile-drawer-trigger" class="ssr-drawer-trigger">☰</button>',
    '  <form action="/search" method="get" role="search" aria-label="Search resources" class="ssr-search-form">',
    '    <input type="search" name="q" placeholder="Search resources…" aria-label="Search" />',
    '    <button type="submit">Search</button>',
    '  </form>',
    '  <nav aria-label="Primary"></nav>',
    '</header>',
  ].join("\n");
}

 // Home
 if (path === "/" || path === "") {
   const m = defaultMeta(path);
   let categories: { name: string; slug: string; count: number }[] = [];
   try {
     const data = await getTreeCached();
     const resourceCount = data?.resources?.length ?? 2000;
     const categoryCount = data?.categories?.length ?? 80;
     m.title = homeSeoTitle(resourceCount);
     m.description = homeSeoDescription(resourceCount, categoryCount);
     m.image = ogImage("/");
     categories = (data?.categories ?? []).map((c: any) => ({
       name: c.name,
       slug: c.slug,
       count: countNodeResources(c),
     }));
   } catch {}
   m.structuredData = webSiteSchema(m.description);
   const bodyHtml =
     homeShellChrome() +
     renderHomeContent({
       heading: SITE_NAME,
       description: m.description,
       categories,
     });
   return { meta: m, found: true, bodyHtml };
 }

  // Static page routes (every fixed client route in App.tsx). These always

  // Static page routes

  // Static page routes (every fixed client route in App.tsx). These always
  // resolve to a real page → HTTP 200, even when auth-gated (the SPA renders
  // its own login/permission gate client-side).
  const staticRoutes: Record<string, Partial<RouteMeta>> = {
    "/about": {
      title: `About — ${SITE_NAME}`,
      description: `Learn about ${SITE_NAME} — the web home of the awesome-video curated list by Nick Krzemienski — and awesome-list-site, the open-source platform that powers it.`,
    },
    // BUG-019 (run13): legal pages — indexable + listed in the sitemap.
    // Titles must mirror the client SEOHead titles exactly (two-pass parity).
    "/terms": {
      title: `Terms of Use — ${SITE_NAME}`,
      description: `The terms that govern your use of ${SITE_NAME} — a free, community-curated directory of video development resources.`,
    },
    "/privacy": {
      title: `Privacy Policy — ${SITE_NAME}`,
      description: `How ${SITE_NAME} handles your data: what we collect, how it's used, and the analytics choices you control.`,
    },
    "/advanced": {
      title: advancedSeoTitle,
      description: advancedSeoDescription,
    },
    "/journeys": {
      title: `Learning Journeys — ${SITE_NAME}`,
      description: `Guided multi-step learning paths for video development — from beginner streaming to advanced encoding pipelines.`,
    },
    "/submit": {
      title: submitSeoTitle,
      description: submitSeoDescription,
    },
    "/login": {
      title: `Sign In — ${SITE_NAME}`,
      description: `Sign in to ${SITE_NAME} to save bookmarks, submit resources, and personalize your learning journey.`,
      // Utility auth page: thin, duplicate content with no search value. Mark
      // noindex so it does not compete in search (buildMetaTags then also drops
      // the canonical/og:url); the route still returns HTTP 200 (found: true).
      noindex: true,
    },
    "/register": {
      title: `Create an Account — ${SITE_NAME}`,
      description: `Create an ${SITE_NAME} account to save bookmarks, submit resources, and track your learning journeys.`,
      // Utility auth page — noindex for the same reason as /login.
      noindex: true,
    },
    "/forgot-password": {
      title: `Reset Your Password — ${SITE_NAME}`,
      description: `Request a password reset link for your ${SITE_NAME} account.`,
      // Utility auth page — noindex like /login; route still returns HTTP 200.
      noindex: true,
    },
    "/reset-password": {
      title: `Set a New Password — ${SITE_NAME}`,
      description: `Choose a new password for your ${SITE_NAME} account.`,
      // Token-bearing auth page — noindex; the token stays out of the cache key
      // (resolveRoute bypasses the cache for this path).
      noindex: true,
    },
    "/profile": {
      title: `Profile — ${SITE_NAME}`,
      description: `Your ${SITE_NAME} profile, bookmarks, and learning progress.`,
      // Personalized, auth-gated account page — noindex so it stays out of
      // search (buildMetaTags then also drops the canonical/og:url); the route
      // still returns HTTP 200 (found: true).
      noindex: true,
    },
    "/bookmarks": {
      title: `Bookmarks — ${SITE_NAME}`,
      description: `Your saved video development resources on ${SITE_NAME}.`,
      // Personalized, auth-gated account page — noindex like /profile.
      noindex: true,
    },
    "/settings": {
      title: `Settings — ${SITE_NAME}`,
      description: `Manage your ${SITE_NAME} preferences — appearance, account, security, and saved resources.`,
      // Utility settings hub with no search value — noindex.
      noindex: true,
    },
    "/settings/theme": {
      title: `Theme Settings — ${SITE_NAME}`,
      description: `Customize the look and feel of ${SITE_NAME} — switch fonts and color themes.`,
      // Utility settings page with no search value — noindex.
      noindex: true,
    },
    "/recommendations": {
      // R3-21: count-honest label — recommendations may be rule-based, so the
      // page no longer claims "AI-Powered" (kept in lockstep with the client
      // SEOHead title in Recommendations.tsx — two-pass title parity).
      title: `Personalized Recommendations — ${SITE_NAME}`,
      description: `Personalized video development resource recommendations based on your interests and learning goals.`,
      // Personalized/dynamic content — keep out of the index so the
      // indexable set stays equal to the sitemap.
      noindex: true,
    },
    "/search": {
      title: `Search — ${SITE_NAME}`,
      description: `Search 2,000+ curated video development tools, libraries, players, codecs, and learning resources.`,
      // Search results pages are standard noindex (thin/duplicate content).
      noindex: true,
    },
    "/categories": {
      // BUG-007: real overview page listing every top-level category. Indexable
      // (a genuine hub page) — description/counts are filled in dynamically.
      title: `All Categories — ${SITE_NAME}`,
      description: `Browse all categories of curated video development resources on ${SITE_NAME} — players, encoders, codecs, streaming, AI, tools, and more.`,
    },
    "/admin": {
      title: `Admin — ${SITE_NAME}`,
      description: `${SITE_NAME} admin panel.`,
      // Internal admin panel — noindex; must never appear in search results.
      noindex: true,
    },
  };
  // Run3 audit R3-02: /admin/:section deep-links (e.g. /admin/users) are real
  // client routes that open the matching admin tab — serve them the /admin
  // meta (noindex) instead of a soft-404. The section list mirrors
  // AdminDashboard's tab ids; unknown sections still fall through to 404.
  const adminSectionMatch = path.match(
    /^\/admin\/(approvals|edits|enrichment|researcher|export|database|resources|categories|subcategories|subsubcategories|journeys|users|github|linkhealth|audit)$/,
  );
  const staticKey = adminSectionMatch ? "/admin" : path;
  if (staticRoutes[staticKey]) {
    const m = defaultMeta(path);
    Object.assign(m, staticRoutes[staticKey]);
    m.image = ogImage(path);
    let bodyHtml: string | undefined;
    if (path === "/journeys") {
      try {
        const journeys = await storage.listLearningJourneys();
        const published = journeys.filter(
          (j: any) => j.status === "published",
        );
        m.structuredData = [
          collectionPageSchema({
            name: "Learning Journeys",
            description: m.description,
            path,
            numberOfItems: published.length,
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Learning Journeys", path },
          ]),
        ];
        bodyHtml = renderJourneysContent({
          heading: "Learning Journeys",
          description: m.description,
          journeys: published.map((j: any) => ({
            id: j.id,
            title: j.title,
            description: j.description,
          })),
        });
      } catch {}
    } else if (path === "/about" || path === "/advanced" || path === "/submit") {
      let categories: { name: string; slug: string; count: number }[] = [];
      // Run22 BUG-018: FAQ count claim comes from the live catalog total so
      // schema, prerendered body, and hydrated DOM stay truthful together.
      let aboutResourceCount: number | undefined;
      try {
        const data = await getTreeCached();
        aboutResourceCount = data?.resources?.length;
        categories = (data?.categories ?? []).slice(0, 12).map((c: any) => ({
          name: c.name,
          slug: c.slug,
          count: countNodeResources(c),
        }));
      } catch {}
      const aboutFaqs = getAboutFaqs(aboutResourceCount);
      if (path === "/about") {
        // GEO: FAQPage schema (+ breadcrumb) markedly improves citation rates
        // in AI answer engines. The Q&A text is shared verbatim with the
        // client About page (shared/faq.ts) so schema, prerendered body, and
        // hydrated DOM all carry identical content — no cloaking.
        m.structuredData = [
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: aboutFaqs.map((f) => ({
              "@type": "Question",
              name: f.question,
              acceptedAnswer: { "@type": "Answer", text: f.answer },
            })),
          },
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "About", path },
          ]),
        ];
      }
      bodyHtml = renderStaticPageContent({
        heading: m.title.split(" — ")[0],
        description: m.description,
        ...(path === "/submit"
          ? {
              paragraphs: [
                "Share a valuable video development tool, library, article, or course with the community. All submissions are reviewed before being published.",
                "You can preview the submission form without an account, but you must log in to actually submit a resource.",
              ],
              links: [{ path: "/login", label: "Sign in to submit a resource" }],
              // BUG-015: real form markup for non-JS crawlers.
              form: {
                action: "/submit",
                heading: "Submit a resource",
                submitLabel: "Submit resource",
                fields: [
                  {
                    name: "title",
                    label: "Title",
                    type: "text" as const,
                    placeholder: "e.g., FFmpeg - Video encoding tool",
                    required: true,
                  },
                  {
                    name: "url",
                    label: "URL",
                    type: "url" as const,
                    placeholder: "https://example.com/resource",
                    required: true,
                  },
                  {
                    name: "description",
                    label: "Description",
                    type: "textarea" as const,
                    placeholder:
                      "Describe what this resource is about and why it's useful...",
                    required: true,
                  },
                  {
                    name: "category",
                    label: "Category",
                    type: "select" as const,
                    required: true,
                    options: categories.map((c) => c.name),
                  },
                  {
                    name: "tags",
                    label: "Tags",
                    type: "text" as const,
                    placeholder:
                      "e.g., video, encoding, streaming (comma-separated)",
                  },
                ],
              },
            }
          : {}),
        ...(path === "/about"
          ? { faqs: aboutFaqs, paragraphs: MAINTAINER.bio }
          : {}),
        categories,
      });
    } else if (path === "/login" || path === "/register" || path === "/reset-password" || path === "/forgot-password") {
      // Noindex utility pages still get a minimal readable body so non-JS
      // crawlers (GPTBot, ClaudeBot, PerplexityBot, Applebot-Extended) see real
      // content instead of an empty SPA shell. noindex governs indexing only —
      // the pages remain crawlable and readable.
      // BUG-042 / BUG-044: /reset-password and /forgot-password render zero
      // inputs at the SPA shell — emit real <form> markup so HTML-grounded
      // tooling (search bots, accessibility readers, password-manager form
      // autofill) see the fields. The client hydrates its own interactive
      // form over this markup.
      const isLogin = path === "/login";
      const isRegister = path === "/register";
      const isForgot = path === "/forgot-password";
      const isReset = path === "/reset-password";
      const staticForm = isForgot || isReset ? {
        action: isReset ? "/api/auth/reset-password" : "/api/auth/forgot-password",
        heading: isReset ? "Set a new password" : "Request a password reset link",
        submitLabel: isReset ? "Update password" : "Send reset link",
        fields: isReset
          ? [
              { name: "newPassword", label: "New password", placeholder: "At least 8 characters", required: true },
              { name: "confirmPassword", label: "Confirm new password", required: true },
            ]
          : [
              { name: "email", label: "Your account email", placeholder: "you@example.com", required: true },
            ],
      } : undefined;
      bodyHtml = renderStaticPageContent({
        heading: isLogin
          ? "Sign in to Awesome Video"
          : isRegister
            ? "Create an Awesome Video account"
            : isReset
              ? "Set a New Password"
              : "Reset your Awesome Video password",
        description: m.description,
        paragraphs: [
          isLogin
            ? "Welcome back. Sign in to access your bookmarks, submitted resources, and personalized learning journeys."
            : isRegister
              ? "Join the community to submit and save resources. A free account lets you bookmark tools, suggest new resources, and track your learning journeys."
              : isReset
                ? "Choose a new password for your Awesome Video account. The reset link from your email should already have the secret token appended; submit both the new password and a confirmation."
                : "Enter the email tied to your account and we'll send you a one-time password reset link. The link expires in one hour.",
        ],
        links: isLogin
          ? [
              { path: "/register", label: "Create an account" },
              { path: "/submit", label: "Submit a resource" },
            ]
          : isRegister
            ? [
                { path: "/login", label: "Sign in" },
                { path: "/submit", label: "Submit a resource" },
              ]
            : isReset
              ? [
                  { path: "/login", label: "Back to login" },
                  { path: "/forgot-password", label: "Request a new reset link" },
                ]
              : [
                  { path: "/login", label: "Back to login" },
                ],
        ...(staticForm ? { form: staticForm } : {}),
      });
    } else if (path === "/search") {
      // BUG-002: render real SSR search results for ?q= (still noindex).
      const q = parseQueryParam(url);
      let results: { id: number; title: string; description?: string }[] = [];
      if (q) {
        try {
          const { resources } = await storage.listResources({
            page: 1,
            limit: 50,
            status: "approved",
            search: q,
          });
          results = (resources ?? []).map((r: any) => ({
            id: r.id,
            title: r.title,
            description: r.description,
          }));
        } catch {}
      }
      bodyHtml = renderSearchContent({ query: q, results });
    } else if (path === "/categories") {
      // BUG-007: overview page listing every top-level category with its count.
      let cats: { name: string; slug: string; count: number }[] = [];
      try {
        const data = await getTreeCached();
        cats = (data?.categories ?? []).map((c: any) => ({
          name: c.name,
          slug: c.slug,
          count: countNodeResources(c),
        }));
      } catch {}
      m.structuredData = [
        collectionPageSchema({
          name: "All Categories",
          description: m.description,
          path,
          numberOfItems: cats.length,
        }),
        breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "All Categories", path },
        ]),
      ];
      bodyHtml = renderCategoriesContent({
        heading: "All Categories",
        description: m.description,
        crumbs: [
          { name: "Home", path: "/" },
          { name: "All Categories", path },
        ],
        categories: cats,
      });
    }
    // R4-059: every indexable static page ships at least WebPage + breadcrumb
    // JSON-LD. Per-path branches above (about/categories/journeys) keep their
    // richer schemas; this fallback only fills the gap for pages that would
    // otherwise emit none (/advanced, /submit, /terms, /privacy, ...).
    if (!m.noindex && !m.structuredData) {
      const pageName = m.title.split(" — ")[0].trim() || SITE_NAME;
      m.structuredData = [
        webPageSchema({ name: pageName, description: m.description, path }),
        breadcrumbSchema([{ name: "Home", path: "/" }, { name: pageName, path }]),
      ];
    }
    return { meta: m, found: true, bodyHtml };
  }

  // /category/:slug — found only if the category exists.
  const catMatch = path.match(/^\/category\/([^\/]+)$/);
  if (catMatch) {
    const slug = safeDecode(catMatch[1]);
    try {
      const found = findCategory(await getTreeCached(), slug);
      if (found) {
        const m = defaultMeta(path);
        m.title = `${categorySeoTitleCore(found.name, slug)} — ${SITE_NAME}`;
        m.description = categorySeoDescription(found.name, slug, found.count);
        m.image = ogImage(found.path);
        m.type = "article";
        m.structuredData = [
          collectionPageSchema({
            name: found.name,
            description: m.description,
            path,
            numberOfItems: found.count,
          }),
          breadcrumbSchema(found.crumbs),
        ];
        // BUG-001: fetch all approved resources for this category, not just the
        // truncated tree slice (getTreeCached caps a node's resources array).
        let allCategoryResources: any[] = [];
        try {
          const { resources } = await storage.listResources({
            status: "approved",
            category: found.name,
            limit: 100000,
          });
          allCategoryResources = resources ?? [];
        } catch (e) {
          allCategoryResources = found.node?.resources ?? [];
        }
        console.log(
          `[SSR category] ${found.name}: SSR payload size=${allCategoryResources.length} resources`,
        );
        const bodyHtml = renderTaxonomyContent({
          heading: found.name,
          description: m.description,
          crumbs: found.crumbs,
          childKind: "subcategory",
          children: (found.node?.subcategories ?? []).map((s: any) => ({
            name: s.name,
            slug: s.slug,
            count: countNodeResources(s),
          })),
          resources: allCategoryResources.map((r: any) => ({
            id: r.id,
            title: r.title,
            description: r.description,
          })),
          page,
          basePath: path,
        });
        return { meta: m, found: true, bodyHtml };
      }
    } catch {
      // DB error → fail open (treat as found) so a transient blip never marks a
      // real page as a 404 for crawlers.
      return { meta: defaultMeta(path), found: true };
    }
    return { meta: notFoundMeta(path), found: false };
  }

  // /subcategory/:slug — found only if the subcategory slug exists.
  const subMatch = path.match(/^\/subcategory\/([^\/]+)$/);
  if (subMatch) {
    const slug = safeDecode(subMatch[1]);
    try {
      const found = findSubcategory(await getTreeCached(), slug);
      if (found) {
        const m = defaultMeta(path);
        m.title = `${found.name} — ${SITE_NAME}`;
        m.description = `Browse ${found.count} curated ${found.name.toLowerCase()} resources for video development on ${SITE_NAME}.`;
        m.image = ogImage(found.path);
        m.type = "article";
        m.structuredData = [
          collectionPageSchema({
            name: found.name,
            description: m.description,
            path,
            numberOfItems: found.count,
          }),
          breadcrumbSchema(found.crumbs),
        ];
        // BUG-001: fetch all approved resources for this subcategory, not just
        // the truncated tree slice.
        let allSubResources: any[] = [];
        try {
          const { resources } = await storage.listResources({
            status: "approved",
            subcategory: found.name,
            limit: 100000,
          });
          allSubResources = resources ?? [];
        } catch (e) {
          allSubResources = found.node?.resources ?? [];
        }
        console.log(
          `[SSR subcategory] ${found.name}: SSR payload size=${allSubResources.length} resources`,
        );
        const bodyHtml = renderTaxonomyContent({
          heading: found.name,
          description: m.description,
          crumbs: found.crumbs,
          childKind: "sub-subcategory",
          children: (found.node?.subSubcategories ?? []).map((s: any) => ({
            name: s.name,
            slug: s.slug,
            count: countNodeResources(s),
          })),
          resources: allSubResources.map((r: any) => ({
            id: r.id,
            title: r.title,
            description: r.description,
          })),
          page,
          basePath: path,
        });
        return { meta: m, found: true, bodyHtml };
      }
    } catch {
      return { meta: defaultMeta(path), found: true };
    }
    return { meta: notFoundMeta(path), found: false };
  }

  // /sub-subcategory/:slug — found only if the sub-subcategory slug exists.
  const subSubMatch = path.match(/^\/sub-subcategory\/([^\/]+)$/);
  if (subSubMatch) {
    const slug = safeDecode(subSubMatch[1]);
    try {
      const found = findSubSubcategory(await getTreeCached(), slug);
      if (found) {
        const m = defaultMeta(path);
        // BUG-010 (run14): same-named sub-subcategories (7× "DASH", 2× "FFmpeg")
        // collided on byte-identical titles. Disambiguate with the parent
        // subcategory. LOCKSTEP: client SubSubcategory.tsx SEOHead passes
        // "<name> – <parent>" so both crawl passes see the same title.
        const parentSubName = found.crumbs[2]?.name;
        m.title = parentSubName
          ? `${found.name} – ${parentSubName} — ${SITE_NAME}`
          : `${found.name} — ${SITE_NAME}`;
        m.description = `Browse ${found.count} curated ${found.name.toLowerCase()} resources for video development on ${SITE_NAME}.`;
        m.image = ogImage(found.path);
        m.type = "article";
        m.structuredData = [
          collectionPageSchema({
            name: found.name,
            description: m.description,
            path,
            numberOfItems: found.count,
          }),
          breadcrumbSchema(found.crumbs),
        ];
        // BUG-001: fetch all approved resources for this sub-subcategory. The
        // list API has no sub-subcategory filter, so fetch the full approved set
        // for the parent category (crumb[1]) and filter by subSubcategory name.
        let allSubSubResources: any[] = [];
        try {
          const parentCategory = found.crumbs[1]?.name;
          const { resources } = await storage.listResources({
            status: "approved",
            category: parentCategory,
            limit: 100000,
          });
          allSubSubResources = (resources ?? []).filter(
            (r: any) => r.subSubcategory === found.name,
          );
          // Fall back to the tree slice if the category-scoped filter found
          // nothing (e.g. taxonomy name drift) so the page never renders empty.
          if (allSubSubResources.length === 0) {
            allSubSubResources = found.node?.resources ?? [];
          }
        } catch (e) {
          allSubSubResources = found.node?.resources ?? [];
        }
        console.log(
          `[SSR sub-subcategory] ${found.name}: SSR payload size=${allSubSubResources.length} resources`,
        );
        const bodyHtml = renderTaxonomyContent({
          heading: found.name,
          description: m.description,
          crumbs: found.crumbs,
          resources: allSubSubResources.map((r: any) => ({
            id: r.id,
            title: r.title,
            description: r.description,
          })),
          page,
          basePath: path,
        });
        return { meta: m, found: true, bodyHtml };
      }
    } catch {
      return { meta: defaultMeta(path), found: true };
    }
    return { meta: notFoundMeta(path), found: false };
  }

  // /resource/:id — found only if the resource exists.
  const resMatch = path.match(/^\/resource\/([^\/]+)$/);
  if (resMatch) {
    const raw = safeDecode(resMatch[1]);
    const idNum = Number(raw);
    if (Number.isInteger(idNum) && idNum > 0) {
      try {
        const resource = await storage.getResource(idNum);
        // Only approved resources are public/indexable (this mirrors the
        // sitemap, which lists approved resources only). A pending/rejected/
        // archived resource resolves to a soft-404 + noindex, no canonical.
        if (resource && resource.status === "approved") {
          const m = defaultMeta(path);
          m.title = `${resource.title} — ${SITE_NAME}`;
          m.description =
            (resource.description || "").slice(0, 280) ||
            `${resource.title} on ${SITE_NAME} — curated video development resource.`;
          m.image = (resource as any).imageUrl || ogImage(path);
          m.type = "article";
          const crumbs: Crumb[] = [{ name: "Home", path: "/" }];
          // R4-027: the JSON-LD BreadcrumbList must mirror the FULL visible
          // breadcrumb trail (category → subcategory → sub-subcategory), not
          // just the top-level category.
          try {
            const tree = await getTreeCached();
            const cat = (tree?.categories ?? []).find(
              (c: any) => c.name === resource.category,
            );
            if (cat) {
              crumbs.push({ name: cat.name, path: `/category/${cat.slug}` });
              const subName = (resource as any).subcategory;
              const sub = subName
                ? (cat.subcategories ?? []).find((s: any) => s.name === subName)
                : null;
              if (sub) {
                crumbs.push({
                  name: sub.name,
                  path: `/subcategory/${sub.slug}`,
                });
                const ssName = (resource as any).subSubcategory;
                const ss = ssName
                  ? (sub.subSubcategories ?? []).find(
                      (x: any) => x.name === ssName,
                    )
                  : null;
                if (ss) {
                  crumbs.push({
                    name: ss.name,
                    path: `/sub-subcategory/${ss.slug}`,
                  });
                }
              }
            }
          } catch {}
          crumbs.push({ name: resource.title });
          m.structuredData = [
            webPageSchema({
              name: resource.title,
              description: m.description,
              path,
              mainEntity: {
                "@type": "CreativeWork",
                name: resource.title,
                ...(resource.description
                  ? { description: String(resource.description).slice(0, 500) }
                  : {}),
                url: resource.url,
                ...((resource as any).imageUrl
                  ? { image: (resource as any).imageUrl }
                  : {}),
              },
            }),
            breadcrumbSchema(crumbs),
          ];
          // BUG-007: fetch related resources so the SSR body links out to other
          // resources (rendered as raw <a href="/resource/<id>"> links for
          // non-JS crawlers). Mirrors GET /api/resources/:id/related.
          let relatedLinks: { id: number; title: string; description?: string }[] =
            [];
          try {
            const { resources: pool } = await storage.listResources({
              status: "approved",
              category: resource.category ?? undefined,
              limit: 60,
            });
            const related = buildRelatedResources(resource as any, pool, 5);
            const seen = new Set<number>();
            for (const bucket of [
              related.similar,
              related.prerequisites,
              related.nextSteps,
            ]) {
              for (const item of bucket) {
                const r = item.resource as any;
                if (r?.id != null && !seen.has(r.id)) {
                  seen.add(r.id);
                  relatedLinks.push({
                    id: r.id,
                    title: r.title,
                    description: r.description,
                  });
                }
              }
            }
          } catch {}
          const bodyHtml = renderResourceContent({
            heading: resource.title,
            description: m.description,
            crumbs,
            url: resource.url,
            related: relatedLinks,
          });
          return { meta: m, found: true, bodyHtml };
        }
      } catch {
        return { meta: defaultMeta(path), found: true };
      }
    }
    return { meta: notFoundMeta(path), found: false };
  }

  // /journey/:id — found only if the journey exists.
  const jMatch = path.match(/^\/journey\/([^\/]+)$/);
  if (jMatch) {
    const raw = safeDecode(jMatch[1]);
    const idNum = Number(raw);
    if (Number.isInteger(idNum) && idNum > 0) {
      try {
        const journey = await storage.getLearningJourney(idNum);
        // Only published journeys are public/indexable (this mirrors the
        // sitemap, which lists published journeys only). A draft/archived
        // journey resolves to a soft-404 + noindex, no canonical.
        if (journey && journey.status === "published") {
          const m = defaultMeta(path);
          m.title = `${journey.title} — Learning Journey — ${SITE_NAME}`;
          m.description = journey.description
            ? String(journey.description).slice(0, 280)
            : `Multi-step learning journey on ${SITE_NAME}: ${journey.title}.`;
          m.image = ogImage(path);
          m.type = "article";
          m.structuredData = [
            webPageSchema({
              name: journey.title,
              description: m.description,
              path,
              mainEntity: {
                "@type": "Course",
                name: journey.title,
                ...(journey.description
                  ? { description: String(journey.description).slice(0, 500) }
                  : {}),
                provider: orgSchema(),
              },
            }),
            breadcrumbSchema([
              { name: "Home", path: "/" },
              { name: "Learning Journeys", path: "/journeys" },
              { name: journey.title },
            ]),
          ];
          const bodyHtml = renderJourneyContent({
            heading: journey.title,
            description: m.description,
            crumbs: [
              { name: "Home", path: "/" },
              { name: "Learning Journeys", path: "/journeys" },
              { name: journey.title },
            ],
          });
          return { meta: m, found: true, bodyHtml };
        }
      } catch {
        return { meta: defaultMeta(path), found: true };
      }
    }
    return { meta: notFoundMeta(path), found: false };
  }

  // Anything else is an unknown route → soft 404.
   return { meta: notFoundMeta(path), found: false };
}
const META_BLOCK_MARKER = "<!--OG_META_INJECTED-->";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Render JSON-LD as one <script> per schema object. `<` is escaped to its
// unicode form so a value containing "</script>" can never break out of the
// script element (the standard safe-embedding technique for JSON in <script>).
function renderJsonLd(data: unknown): string {
  const arr = Array.isArray(data) ? data : [data];
  return arr
    .filter(Boolean)
    .map((d) => {
      const json = JSON.stringify(d).replace(/</g, "\\u003c");
      return `\n    <script type="application/ld+json">${json}</script>`;
    })
    .join("");
}

// BUG-014: stamp the per-request CSP nonce onto every INLINE <script> and
// <style> in the flushed HTML so they satisfy `script-src 'nonce-<value>'` /
// `style-src 'nonce-<value>'` without the old blanket 'unsafe-inline'. This one
// pass covers three sources of inline code:
//   1. the static client/index.html boot scripts (theme, dev-overlay, fonts),
//   2. the JSON-LD <script type="application/ld+json"> blocks buildMetaTags emits,
//   3. the SSR shell <style> injected via <!--app-html-->.
// Only inline tags are touched: a <script> carrying a `src=` is external and is
// already authorized by 'self' / the explicit host allowlist, so it is skipped
// (and left unmodified). Tags that already declare a nonce are left as-is. The
// nonce value is the base64 string minted in server/index.ts; it is emitted
// verbatim inside a double-quoted attribute, so no escaping beyond the `"`-free
// base64 alphabet is required.
function stampNonce(html: string, nonce: string): string {
  if (!nonce) return html;
  // Inline <script ...> (no src=, no existing nonce=). The negative lookahead on
  // the opening-tag attributes rejects any tag that already has src= or nonce=.
  const withScripts = html.replace(
    /<script(?![^>]*\b(?:src|nonce)=)([^>]*)>/gi,
    `<script nonce="${nonce}"$1>`,
  );
  // Inline <style ...> (no existing nonce=). <style> never has a src, so the
  // only guard needed is against a pre-existing nonce.
  const withStyles = withScripts.replace(
    /<style(?![^>]*\bnonce=)([^>]*)>/gi,
    `<style nonce="${nonce}"$1>`,
  );
  return withStyles;
}

export function buildMetaTags(m: RouteMeta): string {
  // R4-025/026: clamp to SERP display budgets (title ≤60, description ≤160) at
  // the single emission choke point so EVERY route complies; the client
  // SEOHead clamps through the same shared functions (two-pass parity).
  const t = escapeHtml(clampSeoTitle(m.title));
  const d = escapeHtml(clampSeoDescription(m.description));
  const u = escapeHtml(m.url);
  const img = escapeHtml(m.image);
  const imgAlt = escapeHtml(m.imageAlt);
  const kw = escapeHtml(m.keywords || "");
  // Soft-404 pages must NOT self-canonicalize the invalid URL and must be
  // explicitly excluded from indexing. Real pages carry an EXPLICIT indexable
  // robots tag (R4-058) whose value mirrors the client SEOHead string exactly.
  const robotsTag = m.noindex
    ? `\n    <meta name="robots" content="noindex, nofollow" />`
    : `\n    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />`;
  const canonicalTag = m.noindex ? "" : `\n    <link rel="canonical" href="${u}" />`;
  const ogUrlTag = m.noindex ? "" : `\n    <meta property="og:url" content="${u}" />`;
  // Soft-404 pages ship no structured data — rich-result markup must only ever
  // describe a real, indexable page.
  const structuredDataTag =
    m.noindex || !m.structuredData ? "" : renderJsonLd(m.structuredData);
  return `${META_BLOCK_MARKER}
    <title>${t}</title>
    <meta name="description" content="${d}" />
    ${kw ? `<meta name="keywords" content="${kw}" />` : ""}${robotsTag}${canonicalTag}
    <meta property="og:type" content="${m.type}" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:locale" content="en_US" />${ogUrlTag}
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
    <meta name="apple-mobile-web-app-title" content="${SITE_NAME}" />${structuredDataTag}`;
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

/**
 * T007/R4-024: server-side resolution of the OG image card text from a route
 * path. The /og-image endpoints call this instead of trusting caller-supplied
 * ?title=/?category= text, so the card can never be made to render attacker
 * text for a real awesome.video URL. Returns null (→ brand default card) for
 * unknown routes and noindex pages.
 */
export async function resolveOgImageMeta(
  path: string,
): Promise<{ pageTitle: string; category?: string; kicker?: string } | null> {
  try {
    if (!path || path === "/") return { pageTitle: SITE_NAME };
    const r = await resolveRoute(path);
    if (!r.found || r.meta.noindex) return null;
    const pageTitle = r.meta.title.split(" — ")[0].trim() || SITE_NAME;
    let category: string | undefined;
    let kicker: string | undefined;
    if (path.startsWith("/category/")) category = kicker = "Category";
    else if (path.startsWith("/sub-subcategory/")) category = kicker = "Topic";
    else if (path.startsWith("/subcategory/")) category = kicker = "Subcategory";
    else if (path.startsWith("/resource/")) {
      category = "Resource";
      kicker = "Resource";
      // Run22 BUG-027: the kicker reflects the resource's REAL category
      // (server-resolved from the stored row — never caller-supplied text)
      // instead of the generic page-type label.
      const idNum = Number(path.split("/")[2]);
      if (Number.isInteger(idNum) && idNum > 0) {
        try {
          const resource = await storage.getResource(idNum);
          if (resource?.category) kicker = resource.category;
        } catch {}
      }
    } else if (path.startsWith("/journey")) category = kicker = "Learning Journeys";
    return { pageTitle, category, kicker };
  } catch {
    return null;
  }
}

// Express middleware that intercepts HTML responses and rewrites <head> with
// route-specific OG/Twitter/SEO tags. Mount BEFORE any HTML-serving middleware
// (vite dev middlewares or static index.html fallback).
export function ogInjectionMiddleware() {
  return async function ogInject(req: Request, res: Response, next: NextFunction) {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    const urlPath = (req.originalUrl || req.url).split("?")[0];

    // Reject malformed percent-encoding before anything else. Vite's dev
    // transform middleware (in server/vite.ts, which we cannot edit) calls
    // decodeURI() on the raw path and throws a URIError on malformed input;
    // because this middleware is async, that downstream throw becomes an
    // unhandledRejection that crashes the dev process. Guarding here — ahead of
    // the API/asset skip block — keeps EVERY malformed GET/HEAD path (page,
    // asset, or API-shaped) away from the crashing decoder, and answers the SEO
    // contract (404 + noindex, no canonical) for malformed page URLs.
    try {
      decodeURI(urlPath);
    } catch {
      const m = notFoundMeta(urlPath);
      res
        .status(404)
        .set("Content-Type", "text/html; charset=utf-8")
        .end(
          `<!doctype html><html lang="en"><head><meta charset="utf-8">\n    ${buildMetaTags(m)}</head><body></body></html>`,
        );
      return;
    }

    // R4-028: /index.html is the same document as / — canonicalize before the
    // extension-based asset skip would let it fall through as a "file".
    if (urlPath === "/index.html" || urlPath === "/index.htm") {
      return res.redirect(301, "/");
    }

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

    // R4-009 + R4-062: canonicalize URL-shape variants that render the same
    // page — trailing slashes ("/about/") and letter-case drift ("/About",
    // "/Category/Encoding-Codecs") 301 to the canonical lowercase, no-slash
    // form. Case redirects only fire when the lowercased path actually
    // resolves, so genuinely unknown mixed-case URLs still soft-404.
    {
      const search = (req.originalUrl || req.url).split("?")[1];
      const suffix = search ? `?${search}` : "";
      const trimmed =
        urlPath.length > 1 ? urlPath.replace(/\/+$/, "") || "/" : urlPath;
      let redirectTo: string | null = trimmed !== urlPath ? trimmed : null;
      if (/[A-Z]/.test(trimmed)) {
        const lower = trimmed.toLowerCase();
        try {
          if ((await resolveRoute(lower)).found) redirectTo = lower;
        } catch {
          // resolution failed — fall through without a case redirect
        }
      }
      if (redirectTo) {
        // Open-redirect guard: a request path like "//evil.com/" would emit a
        // protocol-relative Location ("//evil.com") that browsers treat as an
        // external host. Collapse any leading slash/backslash run to a single
        // "/" so the Location header can only ever be same-origin.
        redirectTo = redirectTo.replace(/^[\/\\]+/, "/");
        return res.redirect(301, redirectTo + suffix);
      }
    }

    // Tolerant redirects for URL shapes that circulate but were never routes.
    // Nested /category/:cat/:sub deep links 301 to the canonical flat
    // /subcategory/:sub when the subcategory exists; unknown ones fall through
    // to the normal resolver and get the standard 404 treatment.
    const nestedSubMatch = urlPath.match(/^\/category\/[^\/]+\/([^\/]+)$/);
    if (nestedSubMatch) {
      const subSlug = safeDecode(nestedSubMatch[1]);
      try {
        const found = findSubcategory(await getTreeCached(), subSlug);
        if (found) {
          return res.redirect(301, `/subcategory/${encodeURIComponent(subSlug)}`);
        }
      } catch {
        // tree lookup failed — fall through to the resolver's fail-open path
      }
      console.warn("[og-middleware] unresolvable nested category path:", urlPath);
    }
    // Slug tolerance for single-level /category/:slug where the slug actually
    // belongs to a subcategory or sub-subcategory — 301 to the canonical page
    // (mirrors the client-side tolerance in Category.tsx). Real category slugs
    // resolve normally below; unknown slugs fall through to the soft-404.
    const flatCatMatch = urlPath.match(/^\/category\/([^\/]+)$/);
    if (flatCatMatch) {
      const maybeSlug = safeDecode(flatCatMatch[1]);
      try {
        const tree = await getTreeCached();
        const isCategory = (tree?.categories ?? []).some(
          (c: any) => c.slug === maybeSlug,
        );
        if (!isCategory) {
          if (findSubcategory(tree, maybeSlug)) {
            return res.redirect(301, `/subcategory/${encodeURIComponent(maybeSlug)}`);
          }
          if (findSubSubcategory(tree, maybeSlug)) {
            return res.redirect(301, `/sub-subcategory/${encodeURIComponent(maybeSlug)}`);
          }
        }
      } catch {
        // tree lookup failed — fall through to the resolver's fail-open path
      }
    }
    // /?q=term was silently rendering the homepage; 301 it to the real search
    // results page so search is a first-class, linkable route (VG-4).
    if (urlPath === "/") {
      const qs = (req.originalUrl || req.url).split("?")[1] || "";
      const q = new URLSearchParams(qs).get("q");
      if (q && q.trim()) {
        return res.redirect(301, `/search?q=${encodeURIComponent(q.trim())}`);
      }
    }
    // /recommendations is now a real page (see staticRoutes) — no redirect.
    // /settings is now a real hub page (see staticRoutes) — no redirect.
    if (/^\/journey\/?$/.test(urlPath)) {
      // Bare /journey (no id) — canonical listing is /journeys. Exact-match so
      // this never hijacks the /journey/:id detail route.
      return res.redirect(301, "/journeys");
    }
    if (urlPath === "/category") {
      // Bare /category (no slug) — send to the category overview on home.
      return res.redirect(301, "/");
    }
    if (urlPath === "/favorites") {
      // Run17 BUG-055: favorites and bookmarks are different collections — the
      // old 301 → /bookmarks sent users to the wrong list. Canonical home for
      // favorites is the profile Favorites tab (client route mirrors this).
      return res.redirect(301, "/profile?tab=favorites");
    }
    if (urlPath === "/account") {
      // /account was never a route; canonical is the profile page (BUG-016).
      return res.redirect(301, "/profile");
    }
    // BUG-009: /auth/* aliases were never routes — 301 to the canonical pages.
    if (urlPath === "/auth/register") {
      return res.redirect(301, "/register");
    }
    if (urlPath === "/auth/login") {
      return res.redirect(301, "/login");
    }
    // Run3 audit R3-08/R3-09: more circulating URL shapes that were never
    // routes — 301 them to their canonical pages instead of soft-404ing.
    if (urlPath === "/signup") {
      return res.redirect(301, "/register");
    }
    if (urlPath === "/explore") {
      return res.redirect(301, "/search");
    }
    if (/^\/resource\/?$/.test(urlPath)) {
      // Bare /resource (often seen as /resource?q=term) — canonical is the
      // search page; carry the query through. Exact-match so this never
      // hijacks the /resource/:id detail route.
      const qs = (req.originalUrl || req.url).split("?")[1] || "";
      const q = new URLSearchParams(qs).get("q");
      return res.redirect(
        301,
        q && q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : "/search",
      );
    }
    // Run22 BUG-007: non-canonical /resource/:id shapes — leading zeros
    // ("/resource/0185020") and encoded whitespace ("/resource/185020%20",
    // "%09") — previously rendered the SAME page as the canonical URL and
    // self-canonicalized the invalid variant (duplicate-content trap). 301
    // any segment that normalizes to a different plain integer; segments
    // that are not numeric at all still fall through to the soft-404 path.
    {
      const resIdMatch = urlPath.match(/^\/resource\/([^\/]+)$/);
      if (resIdMatch) {
        const rawSeg = resIdMatch[1];
        const cleaned = safeDecode(rawSeg).trim();
        if (/^\d+$/.test(cleaned)) {
          const normalized = String(parseInt(cleaned, 10));
          if (rawSeg !== normalized) {
            const qs2 = (req.originalUrl || req.url).split("?")[1];
            return res.redirect(
              301,
              `/resource/${normalized}${qs2 ? `?${qs2}` : ""}`,
            );
          }
        }
      }
    }
    // BUG-008: the no-hyphen /subsubcategory/:slug 301s to the canonical
    // /sub-subcategory/:slug (a circulating URL shape that was never a route).
    const noHyphenSubSub = urlPath.match(/^\/subsubcategory\/([^\/]+)$/);
    if (noHyphenSubSub) {
      return res.redirect(
        301,
        `/sub-subcategory/${encodeURIComponent(safeDecode(noHyphenSubSub[1]))}`,
      );
    }

    // BUG-003 (run19): legacy per-import duplicate slugs (`hls-sc2241`,
    // `ffmpeg-sc2226`, …) were consolidated into their canonical bare slugs.
    // 301 any suffixed URL whose node no longer exists to the bare slug —
    // but only when the bare-slug node is real, so unknown suffixed slugs
    // still fall through to the soft-404.
    const scSuffixSubSub = urlPath.match(/^\/sub-subcategory\/([^\/]+)$/);
    if (scSuffixSubSub) {
      const rawSlug = safeDecode(scSuffixSubSub[1]);
      const bare = rawSlug.match(/^(.+)-sc\d+$/);
      if (bare) {
        try {
          const tree = await getTreeCached();
          if (!findSubSubcategory(tree, rawSlug) && findSubSubcategory(tree, bare[1])) {
            return res.redirect(301, `/sub-subcategory/${encodeURIComponent(bare[1])}`);
          }
        } catch {
          // tree lookup failed — fall through to the resolver's fail-open path
        }
      }
    }

    let meta: RouteMeta;
    let notFound = false;
    let bodyHtml: string | undefined;
    try {
      // Pass the full URL (with ?page=/?q=) so the resolver can paginate and
      // render search results; resolveRoute keys its cache on path + page.
      const resolved = await resolveRoute(req.originalUrl || req.url);
      meta = resolved.meta;
      notFound = !resolved.found;
      bodyHtml = resolved.bodyHtml;
    } catch (e) {
      console.warn("[og-middleware] meta lookup failed for", urlPath, e);
      // Fail open: never demote a real page to 404 on a transient lookup error.
      meta = defaultMeta(urlPath);
      notFound = false;
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
      // Soft-404: the downstream SPA handler (vite dev catch-all / static
      // sendFile) hard-codes status 200. Because this middleware buffers the
      // HTML and only flushes via origEnd below, headers are NOT yet sent here —
      // so overriding the status now makes the 404 stick. Done in og-middleware
      // (which already runs before the SPA fallback and owns the HTML rewrite)
      // rather than in the framework-managed server/vite.ts.
      if (notFound && checkHtml() && !res.headersSent) {
        res.statusCode = 404;
      }
      if (checkHtml() && chunks.length) {
        try {
          let html = Buffer.concat(chunks).toString("utf-8");
          // Only rewrite if it looks like a full HTML document
          if (/<head[\s>]/i.test(html)) {
            html = rewriteHead(html, meta!);
          }
          // Task #80: inject prerendered semantic content into the SPA shell for
          // found routes so non-JS crawlers (GPTBot, ClaudeBot, Googlebot's
          // pre-render) see real headings, summaries, and internal links.
          // Noindex utility routes (/login, /register) are included on purpose:
          // noindex governs indexing, not readability, and bodyHtml is only ever
          // assigned to routes that deliberately opt in. main.tsx calls
          // createRoot().render() on boot, which REPLACES this content — we
          // never set __INITIAL_DATA__, so there is no hydration step (and no
          // mismatch). The function form of replace() avoids `$`
          // special-sequence interpretation in titles/descriptions.
          if (
            bodyHtml &&
            !notFound &&
            html.includes("<!--app-html-->")
          ) {
            html = html.replace("<!--app-html-->", () => bodyHtml!);
          }
          // BUG-014: stamp the per-request CSP nonce onto every inline
          // <script>/<style> now that the head rewrite and SSR body injection
          // are both applied. res.locals.cspNonce is set by the security-header
          // middleware in server/index.ts (always, even in dev); when it is
          // absent (should not happen) stampNonce is a no-op and the HTML is
          // returned unchanged.
          const cspNonce = String((res.locals as any)?.cspNonce || "");
          if (cspNonce) {
            html = stampNonce(html, cspNonce);
          }
          const buf = Buffer.from(html, "utf-8");
          res.setHeader("content-length", buf.length);
          // July 2026 audit BUG-003 (run8): this HTML embeds a per-request CSP
          // nonce, so it must never be cached-and-revalidated — a 304 would pair
          // a stale-nonce body with a fresh-nonce CSP header and block every
          // inline script. Strip sendFile's template-based validators and mark
          // the document no-store (headers are not yet sent here; hashed
          // /assets/* bypass this buffer and keep long-lived caching).
          res.removeHeader("etag");
          res.removeHeader("last-modified");
          res.setHeader("Cache-Control", "no-store");
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

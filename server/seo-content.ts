// Server-side prerendered content for indexable public routes (Task #80).
//
// Why this exists: the app is a Vite SPA whose initial HTML is an empty
// `<div id="root"><!--app-html--></div>` shell. Non-JavaScript crawlers (GPTBot,
// ClaudeBot, PerplexityBot, Applebot-Extended, and Google's pre-render pass)
// therefore receive no body content or internal links. Full React SSR is
// infeasible under the current build (no server React bundle is produced, and
// client/src/entry-server.tsx is not SSR-safe per route), so og-middleware
// injects this static, route-appropriate semantic HTML into the shell instead.
//
// It mirrors the visible client page — same headings, same summaries, the same
// internal links — so it is progressive enhancement, NOT cloaking. On boot,
// client/src/main.tsx calls createRoot().render(), which REPLACES this content
// with the live React app. We deliberately do NOT set window.__INITIAL_DATA__,
// so there is no hydration step and therefore no hydration-mismatch risk; this
// markup is purely the pre-JavaScript / crawler view.

export type Crumb = { name: string; path?: string };

export function escapeHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Internal href: only same-origin absolute paths ("/...") are allowed. Anything
// else (protocol-relative "//", "javascript:", a bare slug) collapses to "/" so
// a malformed slug can never inject an unexpected or dangerous URL.
function internalHref(path: string): string {
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")) {
    return "/";
  }
  return escapeHtml(path);
}

// Outbound (resource) href: allow only http(s) URLs; otherwise omit the link.
function externalHref(url: unknown): string | null {
  if (typeof url !== "string" || !/^https?:\/\//i.test(url)) return null;
  return escapeHtml(url);
}

function count(n: number): string {
  return Number.isFinite(n) ? n.toLocaleString("en-US") : "0";
}

function snippet(s: unknown, max = 140): string {
  const t = String(s ?? "").trim();
  if (!t) return "";
  return t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t;
}

// Scoped, inline dark styling so the pre-JavaScript view is legible (the boot
// script paints <html> black before any CSS loads). Lives inside #root, so it is
// removed together with the content the moment React renders.
const STYLE = [
  "#ssr-seo-content{background:#000;color:#e6e6ea;min-height:100vh;",
  "font-family:'Inter',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;line-height:1.5}",
  "#ssr-seo-content .ssr-wrap{max-width:960px;margin:0 auto;padding:40px 20px}",
  "#ssr-seo-content h1{font-size:2rem;font-weight:800;letter-spacing:-.02em;margin:0 0 .5rem;color:#fff}",
  "#ssr-seo-content h2{font-size:1.05rem;font-weight:700;margin:2rem 0 .75rem;color:#fff}",
  "#ssr-seo-content p.ssr-lead{font-size:1.05rem;color:#b6b6c0;margin:0 0 1rem;max-width:72ch}",
  "#ssr-seo-content a{color:#ff5c7a;text-decoration:none}",
  "#ssr-seo-content a:hover{text-decoration:underline}",
  "#ssr-seo-content ul.ssr-list{list-style:none;padding:0;margin:0;display:grid;gap:.45rem}",
  "#ssr-seo-content ul.ssr-list li{padding:.1rem 0}",
  "#ssr-seo-content .ssr-meta{color:#76768a;font-size:.85em}",
  "#ssr-seo-content .ssr-desc{color:#9a9aae;display:block;font-size:.9em;margin-top:.1rem}",
  "#ssr-seo-content nav.ssr-crumbs{font-size:.85rem;color:#76768a;margin:0 0 1rem}",
  "#ssr-seo-content nav.ssr-crumbs a{color:#9a9aae}",
  "#ssr-seo-content .ssr-sep{color:#44444f;padding:0 .35rem}",
].join("");

function shell(inner: string): string {
  return `<style>${STYLE}</style><div id="ssr-seo-content"><main class="ssr-wrap">${inner}</main></div>`;
}

function crumbsHtml(crumbs?: Crumb[]): string {
  if (!crumbs || crumbs.length === 0) return "";
  const items = crumbs.map((c) => {
    const name = escapeHtml(c.name);
    return c.path ? `<a href="${internalHref(c.path)}">${name}</a>` : `<span>${name}</span>`;
  });
  return `<nav class="ssr-crumbs" aria-label="Breadcrumb">${items.join('<span class="ssr-sep">/</span>')}</nav>`;
}

type LinkItem = { href: string; label: string; meta?: string; desc?: string };

function linkList(items: LinkItem[], external = false): string {
  if (items.length === 0) return "";
  const rel = external ? ' rel="nofollow noopener noreferrer"' : "";
  const lis = items
    .map((it) => {
      const meta = it.meta ? ` <span class="ssr-meta">${escapeHtml(it.meta)}</span>` : "";
      const desc = it.desc ? `<span class="ssr-desc">${escapeHtml(it.desc)}</span>` : "";
      return `<li><a href="${it.href}"${rel}>${escapeHtml(it.label)}</a>${meta}${desc}</li>`;
    })
    .join("");
  return `<ul class="ssr-list">${lis}</ul>`;
}

// Cap on listed resource links per taxonomy page — bounds the prerendered HTML
// size on large categories. The full set remains discoverable via the sitemap.
const MAX_RESOURCE_LINKS = 100;

export interface TaxoNode {
  name: string;
  slug: string;
  resources?: { id: number; title: string; description?: string }[];
  subcategories?: { name: string; slug: string }[];
  subSubcategories?: { name: string; slug: string }[];
}

export function renderHomeContent(opts: {
  heading: string;
  description: string;
  categories: { name: string; slug: string; count: number }[];
}): string {
  const cats: LinkItem[] = opts.categories.map((c) => ({
    href: internalHref(`/category/${c.slug}`),
    label: c.name,
    meta: `${count(c.count)} resources`,
  }));
  return shell(
    `<h1>${escapeHtml(opts.heading)}</h1>` +
      `<p class="ssr-lead">${escapeHtml(opts.description)}</p>` +
      (cats.length ? `<h2>Browse categories</h2>${linkList(cats)}` : ""),
  );
}

export function renderTaxonomyContent(opts: {
  heading: string;
  description: string;
  crumbs: Crumb[];
  childKind?: "subcategory" | "sub-subcategory";
  children?: { name: string; slug: string; count: number }[];
  resources?: { id: number; title: string; description?: string }[];
}): string {
  const childLinks: LinkItem[] = (opts.children ?? []).map((c) => ({
    href: internalHref(`/${opts.childKind}/${c.slug}`),
    label: c.name,
    meta: `${count(c.count)} resources`,
  }));
  const resLinks: LinkItem[] = (opts.resources ?? [])
    .slice(0, MAX_RESOURCE_LINKS)
    .map((r) => ({
      href: internalHref(`/resource/${r.id}`),
      label: r.title,
      desc: snippet(r.description),
    }));
  const childHeading =
    opts.childKind === "sub-subcategory" ? "Topics" : "Subcategories";
  return shell(
    crumbsHtml(opts.crumbs) +
      `<h1>${escapeHtml(opts.heading)}</h1>` +
      `<p class="ssr-lead">${escapeHtml(opts.description)}</p>` +
      (childLinks.length ? `<h2>${childHeading}</h2>${linkList(childLinks)}` : "") +
      (resLinks.length ? `<h2>Resources</h2>${linkList(resLinks)}` : ""),
  );
}

export function renderResourceContent(opts: {
  heading: string;
  description: string;
  crumbs: Crumb[];
  url?: string;
}): string {
  const ext = externalHref(opts.url);
  const outbound = ext
    ? `<h2>Link</h2>${linkList([{ href: ext, label: "Visit resource" }], true)}`
    : "";
  return shell(
    crumbsHtml(opts.crumbs) +
      `<h1>${escapeHtml(opts.heading)}</h1>` +
      `<p class="ssr-lead">${escapeHtml(opts.description)}</p>` +
      outbound,
  );
}

export function renderJourneysContent(opts: {
  heading: string;
  description: string;
  journeys: { id: number; title: string; description?: string }[];
}): string {
  const links: LinkItem[] = opts.journeys.map((j) => ({
    href: internalHref(`/journey/${j.id}`),
    label: j.title,
    desc: snippet(j.description),
  }));
  return shell(
    `<h1>${escapeHtml(opts.heading)}</h1>` +
      `<p class="ssr-lead">${escapeHtml(opts.description)}</p>` +
      (links.length ? `<h2>Learning journeys</h2>${linkList(links)}` : ""),
  );
}

export function renderJourneyContent(opts: {
  heading: string;
  description: string;
  crumbs: Crumb[];
}): string {
  return shell(
    crumbsHtml(opts.crumbs) +
      `<h1>${escapeHtml(opts.heading)}</h1>` +
      `<p class="ssr-lead">${escapeHtml(opts.description)}</p>` +
      `<h2>More</h2>${linkList([{ href: internalHref("/journeys"), label: "All learning journeys" }])}`,
  );
}

export function renderStaticPageContent(opts: {
  heading: string;
  description: string;
  categories?: { name: string; slug: string; count: number }[];
}): string {
  const nav: LinkItem[] = [
    { href: internalHref("/"), label: "Home — all categories" },
    { href: internalHref("/journeys"), label: "Learning journeys" },
    { href: internalHref("/about"), label: "About" },
  ];
  const cats: LinkItem[] = (opts.categories ?? []).map((c) => ({
    href: internalHref(`/category/${c.slug}`),
    label: c.name,
    meta: `${count(c.count)} resources`,
  }));
  return shell(
    `<h1>${escapeHtml(opts.heading)}</h1>` +
      `<p class="ssr-lead">${escapeHtml(opts.description)}</p>` +
      `<h2>Explore</h2>${linkList(nav)}` +
      (cats.length ? `<h2>Top categories</h2>${linkList(cats)}` : ""),
  );
}

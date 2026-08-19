// Server-side prerendered content for indexable public routes (Task #80).
import { resourceFactsSummary } from "@shared/seo-content-templates";
import { tagLandingPath } from "@shared/tagNormalize";
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

export type TaxonomyMatch = {
  name: string;
  path: string;
  count: number;
  crumbs: Crumb[];
  node: any;
  category?: any;
  subcategory?: any;
};

/** Count the resources in a node and every descendant, in tree order. */
export function countNodeResources(node: any): number {
  let total = Array.isArray(node?.resources) ? node.resources.length : 0;
  for (const sub of node?.subcategories ?? []) total += countNodeResources(sub);
  for (const subSub of node?.subSubcategories ?? []) total += countNodeResources(subSub);
  return total;
}

export function findCategory(tree: any, slug: string): TaxonomyMatch | null {
  const category = (tree?.categories ?? []).find((item: any) => item.slug === slug);
  if (!category) return null;
  const path = `/category/${category.slug}`;
  return {
    name: category.name,
    path,
    count: countNodeResources(category),
    crumbs: [{ name: "Home", path: "/" }, { name: category.name, path }],
    node: category,
    category,
  };
}

export function findSubcategory(tree: any, slug: string): TaxonomyMatch | null {
  for (const category of tree?.categories ?? []) {
    const subcategory = (category.subcategories ?? []).find((item: any) => item.slug === slug);
    if (!subcategory) continue;
    const path = `/subcategory/${subcategory.slug}`;
    return {
      name: subcategory.name,
      path,
      count: countNodeResources(subcategory),
      crumbs: [
        { name: "Home", path: "/" },
        { name: category.name, path: `/category/${category.slug}` },
        { name: subcategory.name, path },
      ],
      node: subcategory,
      category,
      subcategory,
    };
  }
  return null;
}

export function findSubSubcategory(tree: any, slug: string): TaxonomyMatch | null {
  for (const category of tree?.categories ?? []) {
    for (const subcategory of category.subcategories ?? []) {
      const subSubcategory = (subcategory.subSubcategories ?? []).find(
        (item: any) => item.slug === slug,
      );
      if (!subSubcategory) continue;
      const path = `/sub-subcategory/${subSubcategory.slug}`;
      return {
        name: subSubcategory.name,
        path,
        count: countNodeResources(subSubcategory),
        crumbs: [
          { name: "Home", path: "/" },
          { name: category.name, path: `/category/${category.slug}` },
          { name: subcategory.name, path: `/subcategory/${subcategory.slug}` },
          { name: subSubcategory.name, path },
        ],
        node: subSubcategory,
        category,
        subcategory,
      };
    }
  }
  return null;
}

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
  // Run22 BUG-009: .ssr-h1 mirrors the h1 rule — main.tsx demotes the SSR <h1>
  // to <div class="ssr-h1"> when it moves this block into the hold overlay, so
  // the DOM never contains two H1s once React renders the page's real <h1>.
  "#ssr-seo-content h1,#ssr-seo-content .ssr-h1{font-size:2rem;font-weight:800;letter-spacing:-.02em;margin:0 0 .5rem;color:#fff}",
  "#ssr-seo-content h2{font-size:1.05rem;font-weight:700;margin:2rem 0 .75rem;color:#fff}",
  "#ssr-seo-content h3{font-size:.98rem;font-weight:700;margin:1.25rem 0 .35rem;color:#fff}",
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
  "#ssr-seo-content dl{display:grid;grid-template-columns:9rem 1fr;gap:.45rem 1rem;margin:0}",
  "#ssr-seo-content dt{color:#9a9aae;font-weight:600}",
  "#ssr-seo-content dd{margin:0}",
].join("");

// BUG-014: the shell <style> carries the per-request CSP nonce so it executes
// under 'nonce-<value>' instead of 'unsafe-inline'. The nonce is threaded in
// from res.locals.cspNonce by og-middleware.
function shell(inner: string, nonce: string = ""): string {
  // Nonce is optional: when set, it's applied to the inline <style> tag so
  // strict CSP can allow it; when empty, the style ships without a nonce
  // (compatible with the current CSP that still has 'unsafe-inline' for
  // style-src in some pre-Wave-6 deployments). The nonce is threaded from
  // res.locals.cspNonce by og-middleware.
  const nonceAttr = nonce ? ` nonce="${escapeHtml(nonce)}"` : "";
  return `<style${nonceAttr}>${STYLE}</style><div id="ssr-seo-content"><main class="ssr-wrap">${inner}</main></div>`;
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

// Resource links listed per taxonomy page, paginated via ?page=N so every
// resource is reachable (BUG-001/004/010). BUG-007 (audit 2): the SSR page
// size MUST equal the client's page size so the crawl pass and the hydrated
// page render the same slice (same count, same first item, no reflow).
// LOCKSTEP: client/src/pages/Category.tsx, Subcategory.tsx, SubSubcategory.tsx
// and Search.tsx all declare PAGE_SIZE = 24. Paginated URLs self-canonicalize
// (?page=N — set in og-middleware) and the sitemap lists them (routes.ts
// generateSitemap), keeping the indexable set equal to the sitemap set.
export const LISTING_PAGE_SIZE = 24;
const PAGE_SIZE = LISTING_PAGE_SIZE;

// BUG-007 (audit 2): ONE flatten order shared by the SSR taxonomy renderer
// (og-middleware) and the sitemap's per-node page counts (routes.ts), mirroring
// the client exactly. LOCKSTEP: client/src/pages/Category.tsx (treeResources
// memo), Subcategory.tsx / SubSubcategory.tsx (staticResources): order is the
// node's direct resources, then each subcategory's resources followed by that
// subcategory's sub-subcategories' resources; dedupe key is `id|url`.
export type ListingLevel = "category" | "subcategory" | "sub-subcategory";
export function flattenListingResources(node: any, level: ListingLevel): any[] {
  const flat: any[] =
    level === "category"
      ? [
          ...(node?.resources ?? []),
          ...((node?.subcategories ?? []) as any[]).flatMap((sub: any) => [
            ...(sub?.resources ?? []),
            ...((sub?.subSubcategories ?? []) as any[]).flatMap(
              (ss: any) => ss?.resources ?? [],
            ),
          ]),
        ]
      : level === "subcategory"
        ? [
            ...(node?.resources ?? []),
            ...((node?.subSubcategories ?? []) as any[]).flatMap(
              (ss: any) => ss?.resources ?? [],
            ),
          ]
        : [...(node?.resources ?? [])];
  const seen = new Set<string>();
  const out: any[] = [];
  for (const r of flat) {
    const key = `${r?.id ?? ""}|${r?.url ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

// Prev / numbered page links / Next navigation. Rendered only when there is
// more than one page. BUG-012 (audit 2): every page is a followable <a href>
// (current page is a non-link span), so crawlers reach any page in one hop
// instead of walking a rel=next chain — page 2+ URLs are indexable
// (self-canonical) and listed in the sitemap.
function paginationWithHref(
  href: (p: number) => string,
  page: number,
  totalPages: number,
): string {
  if (totalPages <= 1) return "";
  const parts: string[] = [];
  if (page > 1)
    parts.push(`<a href="${href(page - 1)}" rel="prev">← Previous</a>`);
  const nums: string[] = [];
  for (let p = 1; p <= totalPages; p++) {
    nums.push(
      p === page
        ? `<span class="ssr-page" aria-current="page">${p}</span>`
        : `<a href="${href(p)}">${p}</a>`,
    );
  }
  parts.push(`<span class="ssr-pages">${nums.join(" ")}</span>`);
  parts.push(`<span class="ssr-page">Page ${page} of ${totalPages}</span>`);
  if (page < totalPages)
    parts.push(`<a href="${href(page + 1)}" rel="next">Next →</a>`);
  return `<nav class="ssr-pagination" aria-label="Pagination">${parts.join(
    '<span class="ssr-sep">·</span>',
  )}</nav>`;
}

function pagination(
  basePath: string | undefined,
  page: number,
  totalPages: number,
): string {
  if (!basePath) return "";
  return paginationWithHref(
    (p: number) => internalHref(p <= 1 ? basePath : `${basePath}?page=${p}`),
    page,
    totalPages,
  );
}

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
  intro: string;
  introKind?: "taxonomy-intro" | "tag-intro";
  crumbs: Crumb[];
  childKind?: "subcategory" | "sub-subcategory";
  children?: { name: string; slug: string; count: number }[];
  relatedLinks?: { name: string; href: string; count?: number }[];
  resources?: { id: number; title: string; description?: string }[];
  /**
   * When present, `resources` is already the requested page slice and this is
   * the authoritative collection total. Taxonomy tree callers omit it and let
   * this renderer slice their complete flattened resource list.
   */
  totalResources?: number;
  page?: number;
  basePath?: string;
}): string {
  // BUG-006: hide empty child nodes from navigation (0-resource subcategories /
  // sub-subcategories). No-op on clean data; removes dead links on dirty data.
  const childLinks: LinkItem[] = (opts.children ?? [])
    .filter((c) => c.count > 0)
    .map((c) => ({
      href: internalHref(`/${opts.childKind}/${c.slug}`),
      label: c.name,
      meta: `${count(c.count)} resources`,
    }));
  const relatedLinks: LinkItem[] = (opts.relatedLinks ?? []).map((item) => ({
    href: internalHref(item.href),
    label: item.name,
    meta: typeof item.count === "number" ? `${count(item.count)} resources` : undefined,
  }));

  // BUG-001/004/010: paginate the resource list so ?page=N returns a distinct
  // slice and every resource is reachable (not just the first 100).
  const allRes = opts.resources ?? [];
  const hasPageSlice = typeof opts.totalResources === "number";
  const total = hasPageSlice ? Math.max(0, opts.totalResources ?? 0) : allRes.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, opts.page ?? 1), totalPages);
  const startIdx = (page - 1) * PAGE_SIZE;
  const pageRes = hasPageSlice
    ? allRes.slice(0, PAGE_SIZE)
    : allRes.slice(startIdx, startIdx + PAGE_SIZE);
  const resLinks: LinkItem[] = pageRes.map((r) => ({
    href: internalHref(`/resource/${r.id}`),
    label: r.title,
    desc: snippet(r.description),
  }));
  const childHeading =
    opts.childKind === "sub-subcategory" ? "Topics" : "Subcategories";
  const resHeading =
    total > 0
      ? `Resources <span class="ssr-meta">(showing ${count(
          startIdx + 1,
        )}–${count(startIdx + pageRes.length)} of ${count(total)})</span>`
      : "Resources";
  const pager = pagination(opts.basePath, page, totalPages);
  return shell(
    crumbsHtml(opts.crumbs) +
      `<h1>${escapeHtml(opts.heading)}</h1>` +
      `<p class="ssr-lead">${escapeHtml(opts.description)}</p>` +
      `<section data-seo-section="${opts.introKind ?? "taxonomy-intro"}"><h2>About this collection</h2><p>${escapeHtml(opts.intro)}</p></section>` +
      (childLinks.length ? `<h2>${childHeading}</h2>${linkList(childLinks)}` : "") +
      (relatedLinks.length ? `<section data-seo-section="related-topics"><h2>Explore related topics</h2>${linkList(relatedLinks)}</section>` : "") +
      (resLinks.length ? `<section data-seo-section="listing-resources"><h2>${resHeading}</h2>${linkList(resLinks)}${pager}</section>` : ""),
  );
}

// SSR search results (BUG-002). /search?q= is noindex, but crawlers and non-JS
// clients still get real results instead of an empty shell. The query is
// escaped; results are capped by the caller.
export function renderSearchContent(opts: {
  query: string;
  results: { id: number; title: string; description?: string }[];
  /**
   * BUG-007 (audit 2): the REAL total from the same query the client's
   * /api/resources?search=…&limit=24 call runs — not the length of the
   * rendered slice (the old code reported the capped slice length as the
   * result count). page/totalPages drive a query-preserving paginator so
   * ?page=N is honored exactly like the hydrated client page.
   */
  total?: number;
  page?: number;
  totalPages?: number;
}): string {
  const q = String(opts.query ?? "").trim();
  const heading = q ? `Search results for “${escapeHtml(q)}”` : "Search";
  const links: LinkItem[] = opts.results.map((r) => ({
    href: internalHref(`/resource/${r.id}`),
    label: r.title,
    desc: snippet(r.description),
  }));
  const total = opts.total ?? links.length;
  const page = opts.page ?? 1;
  const totalPages = opts.totalPages ?? 1;
  // ?q= is preserved in every page link (a page link that dropped the query
  // would land on the empty search page). internalHref escapes for HTML.
  const searchHref = (p: number) =>
    internalHref(
      p <= 1
        ? `/search?q=${encodeURIComponent(q)}`
        : `/search?q=${encodeURIComponent(q)}&page=${p}`,
    );
  const pager = q ? paginationWithHref(searchHref, page, totalPages) : "";
  const body = !q
    ? `<p class="ssr-lead">Enter a search term to find curated video development resources.</p>`
    : links.length
      ? `<p class="ssr-lead">${count(total)} result${
          total === 1 ? "" : "s"
        } for “${escapeHtml(q)}”.</p><h2>Results</h2>${linkList(links)}${pager}`
      : `<p class="ssr-lead">No results found for “${escapeHtml(
          q,
        )}”. Try a different term or browse the categories below.</p>`;
  return shell(
    `<h1>${heading}</h1>` +
      body +
      `<h2>Browse</h2>${linkList([
        { href: internalHref("/categories"), label: "All categories" },
        { href: internalHref("/journeys"), label: "Learning journeys" },
      ])}`,
  );
}

// SSR categories overview (BUG-007): a real /categories page listing every
// top-level category with its resource count.
export function renderCategoriesContent(opts: {
  heading: string;
  description: string;
  crumbs: Crumb[];
  categories: { name: string; slug: string; count: number }[];
}): string {
  const links: LinkItem[] = opts.categories.map((c) => ({
    href: internalHref(`/category/${c.slug}`),
    label: c.name,
    meta: `${count(c.count)} resources`,
  }));
  return shell(
    crumbsHtml(opts.crumbs) +
      `<h1>${escapeHtml(opts.heading)}</h1>` +
      `<p class="ssr-lead">${escapeHtml(opts.description)}</p>` +
      (links.length ? `<h2>All categories</h2>${linkList(links)}` : ""),
  );
}

export function renderResourceContent(opts: {
  heading: string;
  description: string;
  crumbs: Crumb[];
  url?: string;
  provider: string;
  format: string;
  skillLevel: string;
  tags?: string[];
  // BUG-007: related resource links injected into the SSR payload so
  // crawlers and link-graph extractors see internal links.
  related?: { id: number; title: string; description?: string }[];
}): string {
  const ext = externalHref(opts.url);
  const outbound = ext
    ? `<h2>URL</h2>${linkList([{ href: ext, label: "Visit resource" }], true)}`
    : "";
  const taxonomy = opts.crumbs.slice(1, -1).map((crumb) =>
    crumb.path
      ? `<a href="${internalHref(crumb.path)}">${escapeHtml(crumb.name)}</a>`
      : escapeHtml(crumb.name),
  ).join('<span class="ssr-sep">›</span>');
  const facts = [
    taxonomy ? `<dt>Category path</dt><dd>${taxonomy}</dd>` : "",
    `<dt>Provider</dt><dd>${escapeHtml(opts.provider)}</dd>`,
    `<dt>Format</dt><dd>${escapeHtml(opts.format)}</dd>`,
    `<dt>Skill level</dt><dd>${escapeHtml(opts.skillLevel)}</dd>`,
  ].join("");
  const tagItems = (opts.tags ?? []).map((tag) => ({
    href: internalHref(tagLandingPath(tag)),
    label: tag,
  }));
  const tags = tagItems.length
    ? `<section data-seo-section="resource-tags"><h2>Tags</h2>${linkList(tagItems)}</section>`
    : "";
  const factsSummary = resourceFactsSummary({
    title: opts.heading,
    taxonomy: opts.crumbs.slice(1, -1).map((crumb) => crumb.name),
    provider: opts.provider,
    format: opts.format,
    skillLevel: opts.skillLevel,
    tags: opts.tags,
  });
  // BUG-007: related resource links so non-JS crawlers see internal links out to
  // similar/prerequisite/next-step resources instead of a dead-end page.
  const relatedItems: LinkItem[] = (opts.related ?? []).map((r) => ({
    href: internalHref(`/resource/${r.id}`),
    label: r.title,
    desc: snippet(r.description),
  }));
  const related =
    relatedItems.length > 0
      ? `<h2>Related resources</h2>${linkList(relatedItems)}`
      : "";
  return shell(
    crumbsHtml(opts.crumbs) +
      `<h1>${escapeHtml(opts.heading)}</h1>` +
      `<h2>Description</h2><p class="ssr-lead">${escapeHtml(opts.description)}</p>` +
      `<section data-seo-section="resource-details"><h2>Resource details</h2><dl>${facts}</dl><p>${escapeHtml(factsSummary)}</p></section>` +
      outbound +
      tags +
      related,
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
  steps?: {
    stepNumber: number;
    title: string;
    description?: string;
    isOptional?: boolean;
    resources: { id: number; title: string; description?: string | null }[];
  }[];
}): string {
  const syllabus = (opts.steps ?? []).map((step) => {
    const resources = step.resources.map((resource) => ({
      href: internalHref(`/resource/${resource.id}`),
      label: resource.title,
      desc: snippet(resource.description),
    }));
    return `<section><h3>${escapeHtml(step.title)}${
      step.isOptional ? ' <span class="ssr-meta">(optional)</span>' : ""
    }</h3>${
      step.description ? `<p data-seo-step-description>${escapeHtml(step.description)}</p>` : ""
    }${resources.length ? linkList(resources) : ""}</section>`;
  }).join("");
  return shell(
    crumbsHtml(opts.crumbs) +
      `<h1>${escapeHtml(opts.heading)}</h1>` +
      `<p class="ssr-lead">${escapeHtml(opts.description)}</p>` +
      (syllabus ? `<div data-seo-section="journey-syllabus"><h2>Learning Path</h2>${syllabus}</div>` : "") +
      `<h2>More</h2>${linkList([{ href: internalHref("/journeys"), label: "All learning journeys" }])}`,
  );
}

export function renderStaticPageContent(opts: {
  heading: string;
  description: string;
  paragraphs?: string[];
  links?: { path: string; label: string }[];
  categories?: { name: string; slug: string; count: number }[];
  faqs?: { question: string; answer: string }[];
  form?: {
    action: string;
    heading?: string;
    submitLabel: string;
    /**
     * BUG-008 (audit 2): when set, the form renders read-only — fields inside
     * a <fieldset disabled>, NO action/method and NO submit control — plus a
     * sign-in prompt mirroring the logged-out React UI ("The form below is
     * read-only. Please log in…"). A no-JS visitor is never invited into a
     * POST that would be silently swallowed; crafted POSTs to page routes now
     * get an explicit 405 from the method guard in server/index.ts.
     */
    readOnly?: {
      notice: string;
      signInHref: string;
      signInLabel: string;
      signInSuffix?: string;
    };
    fields: {
      name: string;
      label: string;
      type?: "text" | "url" | "textarea" | "select";
      placeholder?: string;
      required?: boolean;
      options?: string[];
    }[];
  };
}): string {
  const nav: LinkItem[] = [
    { href: internalHref("/"), label: "Home — all categories" },
    { href: internalHref("/journeys"), label: "Learning journeys" },
    { href: internalHref("/about"), label: "About" },
    ...(opts.links ?? []).map((l) => ({
      href: internalHref(l.path),
      label: l.label,
    })),
  ];
  const cats: LinkItem[] = (opts.categories ?? []).map((c) => ({
    href: internalHref(`/category/${c.slug}`),
    label: c.name,
    meta: `${count(c.count)} resources`,
  }));
  const paras = (opts.paragraphs ?? [])
    .map((p) => `<p class="ssr-lead">${escapeHtml(p)}</p>`)
    .join("");
  const faqHtml = (opts.faqs ?? []).length
    ? `<h2>Frequently asked questions</h2>` +
      (opts.faqs ?? [])
        .map(
          (f) =>
            `<h3>${escapeHtml(f.question)}</h3><p>${escapeHtml(f.answer)}</p>`,
        )
        .join("")
    : "";
  // BUG-015: emit a real <form> so non-JS crawlers see the submission fields
  // (labels, inputs, select) rather than an empty SPA shell. The client
  // hydrates its own interactive form over this markup.
  const form = opts.form;
  const formFieldsHtml = !form
    ? ""
    : form.fields
        .map((f) => {
          const id = `ssr-${f.name}`;
          const req = f.required ? " required" : "";
          const label = `<label for="${id}">${escapeHtml(f.label)}</label>`;
          if (f.type === "textarea") {
            return `<p>${label}<textarea id="${id}" name="${escapeHtml(f.name)}" placeholder="${escapeHtml(f.placeholder ?? "")}"${req}></textarea></p>`;
          }
          if (f.type === "select") {
            const opts2 = (f.options ?? [])
              .map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`)
              .join("");
            return `<p>${label}<select id="${id}" name="${escapeHtml(f.name)}"${req}>${opts2}</select></p>`;
          }
          return `<p>${label}<input id="${id}" name="${escapeHtml(f.name)}" type="${escapeHtml(f.type ?? "text")}" placeholder="${escapeHtml(f.placeholder ?? "")}"${req} /></p>`;
        })
        .join("");
  const formHtml = !form
    ? ""
    : form.readOnly
      ? // BUG-008 (audit 2): read-only rendering — fieldset[disabled], no
        // action/method, no submit control. The fields stay readable for
        // crawlers, but a no-JS visitor cannot POST into the void; the notice
        // + sign-in link mirror the logged-out React UI copy exactly.
        `<h2>${escapeHtml(form.heading ?? "Submit a resource")}</h2>` +
        `<p class="ssr-form-notice">${escapeHtml(form.readOnly.notice)} <a href="${internalHref(
          form.readOnly.signInHref,
        )}">${escapeHtml(form.readOnly.signInLabel)}</a>${escapeHtml(
          form.readOnly.signInSuffix ?? ".",
        )}</p>` +
        `<form class="ssr-form" aria-disabled="true"><fieldset disabled>` +
        formFieldsHtml +
        `</fieldset></form>`
      : `<h2>${escapeHtml(form.heading ?? "Submit a resource")}</h2>` +
        `<form class="ssr-form" action="${escapeHtml(form.action)}" method="post">` +
        formFieldsHtml +
        `<p><button type="submit">${escapeHtml(form.submitLabel)}</button></p>` +
        `</form>`;
  return shell(
    `<h1>${escapeHtml(opts.heading)}</h1>` +
      `<p class="ssr-lead">${escapeHtml(opts.description)}</p>` +
      paras +
      formHtml +
      faqHtml +
      `<h2>Explore</h2>${linkList(nav)}` +
      (cats.length ? `<h2>Top categories</h2>${linkList(cats)}` : ""),
  );
}

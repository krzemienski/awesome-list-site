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
  // Run22 BUG-009: .ssr-h1 mirrors the h1 rule — main.tsx demotes the SSR <h1>
  // to <div class="ssr-h1"> when it moves this block into the hold overlay, so
  // the DOM never contains two H1s once React renders the page's real <h1>.
  "#ssr-seo-content h1,#ssr-seo-content .ssr-h1{font-size:2rem;font-weight:800;letter-spacing:-.02em;margin:0 0 .5rem;color:#fff}",
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

// Resource links listed per taxonomy page. Large taxonomy nodes are paginated
// via ?page=N (BUG-001/004/010) so every resource is reachable, not just the
// first 100. The canonical URL always points at page 1 (set in og-middleware).
const PAGE_SIZE = 100;

// Prev / "Page X of Y" / Next navigation with ?page=N links. Rendered only when
// a basePath is supplied and there is more than one page.
function pagination(
  basePath: string | undefined,
  page: number,
  totalPages: number,
): string {
  if (!basePath || totalPages <= 1) return "";
  const href = (p: number) =>
    internalHref(p <= 1 ? basePath : `${basePath}?page=${p}`);
  const parts: string[] = [];
  if (page > 1)
    parts.push(`<a href="${href(page - 1)}" rel="prev">← Previous</a>`);
  parts.push(`<span class="ssr-page">Page ${page} of ${totalPages}</span>`);
  if (page < totalPages)
    parts.push(`<a href="${href(page + 1)}" rel="next">Next →</a>`);
  return `<nav class="ssr-pagination" aria-label="Pagination">${parts.join(
    '<span class="ssr-sep">·</span>',
  )}</nav>`;
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
  crumbs: Crumb[];
  childKind?: "subcategory" | "sub-subcategory";
  children?: { name: string; slug: string; count: number }[];
  resources?: { id: number; title: string; description?: string }[];
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

  // BUG-001/004/010: paginate the resource list so ?page=N returns a distinct
  // slice and every resource is reachable (not just the first 100).
  const allRes = opts.resources ?? [];
  const total = allRes.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, opts.page ?? 1), totalPages);
  const startIdx = (page - 1) * PAGE_SIZE;
  const pageRes = allRes.slice(startIdx, startIdx + PAGE_SIZE);
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
      (childLinks.length ? `<h2>${childHeading}</h2>${linkList(childLinks)}` : "") +
      (resLinks.length ? `<h2>${resHeading}</h2>${linkList(resLinks)}${pager}` : ""),
  );
}

// SSR search results (BUG-002). /search?q= is noindex, but crawlers and non-JS
// clients still get real results instead of an empty shell. The query is
// escaped; results are capped by the caller.
export function renderSearchContent(opts: {
  query: string;
  results: { id: number; title: string; description?: string }[];
}): string {
  const q = String(opts.query ?? "").trim();
  const heading = q ? `Search results for “${escapeHtml(q)}”` : "Search";
  const links: LinkItem[] = opts.results.map((r) => ({
    href: internalHref(`/resource/${r.id}`),
    label: r.title,
    desc: snippet(r.description),
  }));
  const body = !q
    ? `<p class="ssr-lead">Enter a search term to find curated video development resources.</p>`
    : links.length
      ? `<p class="ssr-lead">${count(links.length)} result${
          links.length === 1 ? "" : "s"
        } for “${escapeHtml(q)}”.</p><h2>Results</h2>${linkList(links)}`
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
  // BUG-007: related resource links injected into the SSR payload so
  // crawlers and link-graph extractors see internal links.
  related?: { id: number; title: string; description?: string }[];
}): string {

  const ext = externalHref(opts.url);
  const outbound = ext
    ? `<h2>Link</h2>${linkList([{ href: ext, label: "Visit resource" }], true)}`
    : "";
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
      `<p class="ssr-lead">${escapeHtml(opts.description)}</p>` +
      outbound +
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
  paragraphs?: string[];
  links?: { path: string; label: string }[];
  categories?: { name: string; slug: string; count: number }[];
  faqs?: { question: string; answer: string }[];
  form?: {
    action: string;
    heading?: string;
    submitLabel: string;
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
  const formHtml = opts.form
    ? `<h2>${escapeHtml(opts.form.heading ?? "Submit a resource")}</h2>` +
      `<form class="ssr-form" action="${escapeHtml(opts.form.action)}" method="post">` +
      opts.form.fields
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
        .join("") +
      `<p><button type="submit">${escapeHtml(opts.form.submitLabel)}</button></p>` +
      `</form>`
    : "";
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

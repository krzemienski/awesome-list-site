// SEO snapshot harness (Task #332) — the regression gate for structured data
// and title/description templates.
//
// Fetches the FULL sitemap corpus as a non-JS crawler (plus noindex/404
// probes), extracts title / meta description / robots / canonical / JSON-LD
// from the raw server HTML (og-middleware's crawl-pass output), validates the
// schema shape per route type, and reports duplicate-title/description rates.
//
// Modes:
//   node scripts/validation/seo-snapshot.mjs                 # record (baseline/report only)
//   node scripts/validation/seo-snapshot.mjs --gate          # enforce acceptance rules (exit 1 on violation)
//   node scripts/validation/seo-snapshot.mjs --parity        # + hydrate a sample in Chromium and assert
//                                                            #   client/server title+description parity
//   node scripts/validation/seo-snapshot.mjs --out /tmp/x    # override output dir
//   node scripts/validation/seo-snapshot.mjs --limit 200     # sample first N sitemap URLs (quick run)
//
// Acceptance rules enforced by --gate (Task #332 "done" numbers):
//   * every indexable page: title ≤60 chars, description present ≤160, exact
//     indexable robots string, self-canonical (?page=N preserved), ≥1 valid
//     JSON-LD block, zero structural schema failures (pass rate == 100%)
//   * collection pages (categories hub, category, subcategory,
//     sub-subcategory, journeys hub): ItemList carries itemListElement
//     (position + item URL + name) for the current page's items
//   * resource pages: typed mainEntity (VideoObject/SoftwareApplication/…)
//     with name+url; journey pages: Course with provider (+ syllabus
//     aggregate: at least one journey in the corpus emits syllabusSections)
//   * duplicate-description rate < 10% and duplicate-title rate < 10%
//     across the corpus
//   * noindex probes: robots noindex + NO JSON-LD + NO canonical
//   * unknown-URL probes: HTTP 404 + noindex
//
// Output: <out>/snapshot.json (full per-URL data), <out>/report.md (summary),
// <out>/metrics.json (compact numbers for committed before/after reports).
// Writes stay in /tmp by default — never write into the repo while the dev
// server is live (Vite reload flake); copy committed reports out afterwards.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const BASE = (process.env.BASE_URL || process.env.AUDIT_BASE_URL || "http://127.0.0.1:5000").replace(/\/+$/, "");
const argv = process.argv.slice(2);
const GATE = argv.includes("--gate");
const PARITY = argv.includes("--parity");
const outIdx = argv.indexOf("--out");
const limitIdx = argv.indexOf("--limit");
const LIMIT = limitIdx >= 0 ? parseInt(argv[limitIdx + 1], 10) : 0;
const STAMP = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const OUT = outIdx >= 0 ? argv[outIdx + 1] : `/tmp/validation/seo-snapshot/${STAMP}`;
fs.mkdirSync(OUT, { recursive: true });

const CONCURRENCY = 12;
const UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html) seo-snapshot-harness";

// SERP budgets — mirror shared/seo-templates.ts (SEO_TITLE_MAX / SEO_DESCRIPTION_MAX).
const TITLE_MAX = 60;
const DESC_MAX = 160;
const PAGE_SIZE = 24; // server/seo-content.ts LISTING_PAGE_SIZE
const INDEXABLE_ROBOTS = "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
const decodeEntities = (s) =>
  String(s ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

function firstMatch(html, res) {
  for (const re of res) {
    const m = html.match(re);
    if (m) return decodeEntities(m[1]);
  }
  return null;
}

function metaContent(html, name, attr = "name") {
  return firstMatch(html, [
    new RegExp(`<meta[^>]*${attr}="${name}"[^>]*content="([^"]*)"`, "i"),
    new RegExp(`<meta[^>]*content="([^"]*)"[^>]*${attr}="${name}"`, "i"),
  ]);
}

function extractHead(html) {
  const title = firstMatch(html, [/<title[^>]*>([\s\S]*?)<\/title>/i]);
  const description = metaContent(html, "description");
  const robots = metaContent(html, "robots");
  const ogTitle = metaContent(html, "og:title", "property");
  const ogDescription = metaContent(html, "og:description", "property");
  const canonical = firstMatch(html, [
    /<link[^>]*rel="canonical"[^>]*href="([^"]*)"/i,
    /<link[^>]*href="([^"]*)"[^>]*rel="canonical"/i,
  ]);
  const ld = [];
  const ldErrors = [];
  const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      ld.push(JSON.parse(m[1]));
    } catch (e) {
      ldErrors.push(String(e.message).slice(0, 120));
    }
  }
  return { title, description, robots, canonical, ogTitle, ogDescription, ld, ldErrors };
}

function routeType(p) {
  if (p === "/" || p === "") return "home";
  if (p === "/categories") return "categories-hub";
  if (p === "/journeys") return "journeys-hub";
  if (p.startsWith("/category/")) return "category";
  if (p.startsWith("/subcategory/")) return "subcategory";
  if (p.startsWith("/sub-subcategory/")) return "sub-subcategory";
  if (p.startsWith("/resource/")) return "resource";
  if (p.startsWith("/journey/")) return "journey";
  return "static";
}
const COLLECTION_TYPES = new Set([
  "categories-hub",
  "journeys-hub",
  "category",
  "subcategory",
  "sub-subcategory",
]);
const RESOURCE_ENTITY_TYPES = new Set([
  "CreativeWork",
  "VideoObject",
  "SoftwareApplication",
  "SoftwareSourceCode",
  "Course",
  "TechArticle",
  "Article",
  "Book",
  "Dataset",
]);

// Flatten a JSON-LD block (plus nested @graph) into a list of typed nodes.
function ldNodes(block) {
  const out = [];
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(walk);
    if (node["@type"]) out.push(node);
    for (const v of Object.values(node)) if (v && typeof v === "object") walk(v);
  };
  walk(block);
  return out;
}
const topLevelTypes = (ldBlocks) => ldBlocks.map((b) => b?.["@type"]).filter(Boolean);
const findTop = (ldBlocks, type) => ldBlocks.find((b) => b?.["@type"] === type);
const isAbsUrl = (u) => typeof u === "string" && /^https?:\/\//i.test(u);

// ---------------------------------------------------------------------------
// corpus
// ---------------------------------------------------------------------------
async function waitForServer() {
  const deadline = Date.now() + 120_000;
  let lastErr = "";
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${BASE}/api/awesome-list`, { method: "HEAD" });
      if (r.ok || r.status === 405) return;
      lastErr = `status ${r.status}`;
    } catch (e) {
      lastErr = e.message;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  console.error(`FATAL: app not reachable at ${BASE} after 120s (${lastErr}) — start the "Start application" workflow`);
  process.exit(1);
}

async function loadCorpus() {
  const res = await fetch(`${BASE}/sitemap.xml`, { headers: { "user-agent": UA } });
  if (!res.ok) {
    console.error(`FATAL: sitemap.xml returned ${res.status}`);
    process.exit(1);
  }
  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decodeEntities(m[1].trim()));
  if (!locs.length) {
    console.error("FATAL: sitemap.xml contained no <loc> entries");
    process.exit(1);
  }
  const siteOrigin = new URL(locs[0]).origin;
  let entries = locs.map((loc) => {
    const u = new URL(loc);
    return {
      loc,
      pathq: u.pathname + u.search,
      path: u.pathname === "" ? "/" : u.pathname,
      page: parseInt(new URLSearchParams(u.search).get("page") || "1", 10) || 1,
      kind: "sitemap",
      type: routeType(u.pathname === "" ? "/" : u.pathname),
    };
  });
  if (LIMIT > 0) entries = entries.slice(0, LIMIT);
  // Probes — invariants that must hold OUTSIDE the sitemap set.
  const probes = [
    { pathq: "/search", kind: "noindex" },
    { pathq: "/sign-in", kind: "noindex" },
    { pathq: "/resource/999999999", kind: "404" },
    { pathq: "/journey/999999999", kind: "404" },
    { pathq: "/category/definitely-not-a-real-slug", kind: "404" },
    { pathq: "/totally-unknown-route-xyz", kind: "404" },
  ].map((p) => ({
    loc: siteOrigin + p.pathq,
    pathq: p.pathq,
    path: p.pathq.split("?")[0],
    page: 1,
    kind: p.kind,
    type: routeType(p.pathq.split("?")[0]),
  }));
  return { siteOrigin, entries: [...entries, ...probes] };
}

async function fetchOne(entry) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(BASE + entry.pathq, {
        headers: { "user-agent": UA, accept: "text/html" },
        redirect: "manual",
        signal: AbortSignal.timeout(20_000),
      });
      const html = await res.text();
      return { ...entry, status: res.status, ...extractHead(html), htmlBytes: html.length };
    } catch (e) {
      if (attempt === 2) return { ...entry, status: 0, fetchError: String(e.message).slice(0, 160) };
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

async function fetchAll(entries) {
  const results = new Array(entries.length);
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < entries.length) {
      const i = next++;
      results[i] = await fetchOne(entries[i]);
      done++;
      if (done % 250 === 0) console.log(`  fetched ${done}/${entries.length}…`);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return results;
}

// ---------------------------------------------------------------------------
// validation
// ---------------------------------------------------------------------------
function validatePage(r, siteOrigin, gate) {
  const issues = []; // hard failures
  const warns = [];
  const fail = (code, detail) => issues.push({ code, detail });
  const warn = (code, detail) => warns.push({ code, detail });

  if (r.fetchError || r.status === 0) {
    fail("fetch", r.fetchError || "no response");
    return { issues, warns };
  }

  if (r.kind === "404") {
    if (r.status !== 404) fail("probe-404-status", `expected 404, got ${r.status}`);
    if (!r.robots || !r.robots.includes("noindex")) fail("probe-404-robots", `robots=${r.robots}`);
    if (r.ld.length) fail("probe-404-jsonld", `soft-404 must ship no JSON-LD (got ${r.ld.length})`);
    if (r.canonical) fail("probe-404-canonical", `soft-404 must not canonicalize (${r.canonical})`);
    return { issues, warns };
  }
  if (r.kind === "noindex") {
    if (r.status !== 200) fail("probe-noindex-status", `expected 200, got ${r.status}`);
    if (!r.robots || !r.robots.includes("noindex")) fail("probe-noindex-robots", `robots=${r.robots}`);
    if (r.ld.length) fail("probe-noindex-jsonld", `noindex page must ship no JSON-LD (got ${r.ld.length})`);
    if (r.canonical) fail("probe-noindex-canonical", `noindex page must not canonicalize (${r.canonical})`);
    return { issues, warns };
  }

  // --- sitemap (indexable) URLs -------------------------------------------
  if (r.status !== 200) {
    fail("status", `expected 200, got ${r.status}`);
    return { issues, warns };
  }
  if (!r.title) fail("title-missing", "no <title>");
  else if (r.title.length > TITLE_MAX) fail("title-overflow", `${r.title.length} chars: "${r.title}"`);
  if (!r.description) fail("desc-missing", "no meta description");
  else if (r.description.length > DESC_MAX) fail("desc-overflow", `${r.description.length} chars`);
  if (r.robots !== INDEXABLE_ROBOTS) fail("robots", `got "${r.robots}"`);
  const expectedCanonical = siteOrigin + r.path + (r.page > 1 ? `?page=${r.page}` : "");
  if (!r.canonical) fail("canonical-missing", "indexable page without canonical");
  else if (r.canonical !== expectedCanonical) fail("canonical-mismatch", `got ${r.canonical}, want ${expectedCanonical}`);
  if (r.ogTitle && r.title && r.ogTitle !== r.title) fail("og-title-drift", `og:title differs from <title>`);
  if (r.ogDescription && r.description && r.ogDescription !== r.description)
    fail("og-desc-drift", "og:description differs from meta description");
  for (const e of r.ldErrors) fail("jsonld-parse", e);
  if (!r.ld.length) fail("jsonld-missing", "indexable page without JSON-LD");

  // generic node hygiene: every typed node needs non-empty name where a name
  // is semantically required, and URLs must be absolute.
  for (const block of r.ld) {
    if (!block["@context"]) fail("jsonld-context", `top-level block ${block["@type"] || "?"} missing @context`);
    for (const node of ldNodes(block)) {
      if ("url" in node && !isAbsUrl(node.url)) fail("jsonld-url", `${node["@type"]}.url not absolute: ${node.url}`);
      if ("item" in node && typeof node.item === "string" && !isAbsUrl(node.item))
        fail("jsonld-item-url", `${node["@type"]}.item not absolute: ${node.item}`);
    }
  }

  const types = topLevelTypes(r.ld);
  const breadcrumb = findTop(r.ld, "BreadcrumbList");
  const needsBreadcrumb = r.type !== "home";
  if (needsBreadcrumb && !breadcrumb) fail("breadcrumb-missing", `types=[${types.join(",")}]`);
  if (breadcrumb) {
    const items = breadcrumb.itemListElement || [];
    if (!Array.isArray(items) || items.length < 1) fail("breadcrumb-empty", "no itemListElement");
    items.forEach((it, i) => {
      if (it.position !== i + 1) fail("breadcrumb-position", `item ${i} position=${it.position}`);
      if (!it.name) fail("breadcrumb-name", `item ${i} missing name`);
    });
  }

  if (r.type === "home") {
    if (!findTop(r.ld, "WebSite")) fail("home-website", `types=[${types.join(",")}]`);
  } else if (COLLECTION_TYPES.has(r.type)) {
    const cp = findTop(r.ld, "CollectionPage");
    if (!cp) fail("collection-schema", `no CollectionPage; types=[${types.join(",")}]`);
    const list = cp?.mainEntity;
    if (list && list["@type"] !== "ItemList") fail("collection-mainentity", `mainEntity=${list["@type"]}`);
    const elements = list?.itemListElement;
    if (gate) {
      // Task #332 acceptance: collections must list the page's actual items.
      if (!Array.isArray(elements) || elements.length === 0) {
        fail("itemlist-empty", "ItemList without itemListElement");
      }
    }
    if (Array.isArray(elements)) {
      if (elements.length > PAGE_SIZE + 1) fail("itemlist-overflow", `${elements.length} elements (> page size)`);
      if (typeof list.numberOfItems === "number" && elements.length > list.numberOfItems)
        fail("itemlist-count", `${elements.length} elements > numberOfItems=${list.numberOfItems}`);
      let prev = 0;
      elements.forEach((el, i) => {
        if (el["@type"] !== "ListItem") fail("itemlist-elemtype", `element ${i} @type=${el["@type"]}`);
        if (typeof el.position !== "number" || el.position <= prev)
          fail("itemlist-position", `element ${i} position=${el.position} after ${prev}`);
        prev = typeof el.position === "number" ? el.position : prev;
        if (!el.name) fail("itemlist-name", `element ${i} missing name`);
        if (!isAbsUrl(el.item)) fail("itemlist-item", `element ${i} item=${JSON.stringify(el.item)}`);
      });
      if (r.page > 1 && elements.length && elements[0].position !== (r.page - 1) * PAGE_SIZE + 1) {
        fail(
          "itemlist-page-offset",
          `page ${r.page} starts at ${elements[0].position}, want ${(r.page - 1) * PAGE_SIZE + 1}`,
        );
      }
      if (cp?.url !== expectedCanonical) {
        fail("collection-url-mismatch", `CollectionPage.url=${cp?.url}, want ${expectedCanonical}`);
      }
    }
  } else if (r.type === "resource") {
    const wp = findTop(r.ld, "WebPage");
    const entity = wp?.mainEntity;
    if (!wp || !entity) fail("resource-schema", `no WebPage.mainEntity; types=[${types.join(",")}]`);
    else {
      if (!RESOURCE_ENTITY_TYPES.has(entity["@type"]))
        fail("resource-entity-type", `mainEntity @type=${entity["@type"]}`);
      if (!entity.name) fail("resource-entity-name", "mainEntity missing name");
      if (gate && !isAbsUrl(entity.url)) fail("resource-entity-url", `mainEntity.url=${entity.url}`);
    }
  } else if (r.type === "journey") {
    const wp = findTop(r.ld, "WebPage");
    const course = wp?.mainEntity;
    if (!wp || !course || course["@type"] !== "Course")
      fail("journey-schema", `mainEntity=${course?.["@type"]}; types=[${types.join(",")}]`);
    else {
      if (gate && !course.provider) fail("journey-provider", "Course missing provider");
      const syl = course.syllabusSections;
      if (syl != null) {
        if (!Array.isArray(syl) || !syl.length) fail("journey-syllabus-shape", "syllabusSections present but empty/non-array");
        else
          syl.forEach((s, i) => {
            if (s["@type"] !== "Syllabus") fail("journey-syllabus-type", `section ${i} @type=${s["@type"]}`);
            if (!s.name) fail("journey-syllabus-name", `section ${i} missing name`);
          });
      } else if (gate) {
        warn("journey-syllabus-missing", "Course without syllabusSections");
      }
    }
  } else if (r.type === "static") {
    if (!findTop(r.ld, "WebPage") && !findTop(r.ld, "FAQPage"))
      fail("static-schema", `types=[${types.join(",")}]`);
  }

  return { issues, warns };
}

// ---------------------------------------------------------------------------
// duplicate metrics
// ---------------------------------------------------------------------------
function dupStats(pages, key) {
  const groups = new Map();
  for (const p of pages) {
    const v = p[key];
    if (!v) continue;
    if (!groups.has(v)) groups.set(v, []);
    groups.get(v).push(p.pathq);
  }
  const dupGroups = [...groups.entries()].filter(([, urls]) => urls.length > 1);
  const dupUrlCount = dupGroups.reduce((n, [, urls]) => n + urls.length, 0);
  const clusters = dupGroups
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 20)
    .map(([value, urls]) => ({ count: urls.length, value: value.slice(0, 140), sample: urls.slice(0, 4) }));
  return {
    total: pages.length,
    dupUrlCount,
    rate: pages.length ? dupUrlCount / pages.length : 0,
    clusters,
  };
}

// ---------------------------------------------------------------------------
// hydration parity (client SEOHead vs server og-middleware) — sample-based
// ---------------------------------------------------------------------------
function chromePath() {
  const cache = path.join(ROOT, ".cache/ms-playwright");
  const dir = fs
    .readdirSync(cache)
    .filter((d) => /^chromium-\d+$/.test(d))
    .sort()
    .pop();
  if (!dir) throw new Error("No chromium-* dir in .cache/ms-playwright — run npx playwright install chromium");
  return path.join(cache, dir, "chrome-linux64/chrome");
}

function paritySample(pages) {
  const byType = new Map();
  for (const p of pages) {
    if (p.kind !== "sitemap" || p.status !== 200) continue;
    const key = p.type + (p.page > 1 ? "-paged" : "");
    if (!byType.has(key)) byType.set(key, []);
    byType.get(key).push(p);
  }
  const sample = [];
  for (const [key, list] of byType) {
    sample.push(list[0]);
    // two resources + two of each taxonomy level for better coverage
    if (["resource", "category", "subcategory", "sub-subcategory", "journey"].includes(key) && list.length > 1)
      sample.push(list[Math.floor(list.length / 2)]);
  }
  return sample;
}

async function runParity(pages) {
  const { chromium } = await import(path.join(ROOT, "node_modules/playwright/index.mjs"));
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const results = [];
  const sample = paritySample(pages);
  console.log(`parity: hydrating ${sample.length} sampled routes…`);
  for (const s of sample) {
    try {
      await page.goto(BASE + s.pathq, { waitUntil: "domcontentloaded", timeout: 30_000 });
      // Wait for helmet to commit a real (non-loading) head.
      await page
        .waitForFunction(
          () => document.title && !/^Loading/i.test(document.title),
          { timeout: 15_000 },
        )
        .catch(() => {});
      await page.waitForTimeout(1500); // settle async data → final head
      const dom = await page.evaluate(() => ({
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.getAttribute("content") ?? null,
        robots: document.querySelector('meta[name="robots"]')?.getAttribute("content") ?? null,
        canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null,
        jsonLdCount: document.querySelectorAll('script[type="application/ld+json"]').length,
      }));
      const canonPathq = (u) => {
        try {
          const x = new URL(u);
          return x.pathname + x.search;
        } catch {
          return u;
        }
      };
      const mismatches = [];
      if (dom.title !== s.title) mismatches.push(`title: server="${s.title}" client="${dom.title}"`);
      if (dom.description !== s.description)
        mismatches.push(`description: server="${s.description}" client="${dom.description}"`);
      if (dom.robots !== s.robots) mismatches.push(`robots: server="${s.robots}" client="${dom.robots}"`);
      // canonical: compare path+query (client origin may come from VITE_SITE_URL)
      if (s.canonical && (!dom.canonical || canonPathq(dom.canonical) !== canonPathq(s.canonical)))
        mismatches.push(`canonical: server="${s.canonical}" client="${dom.canonical}"`);
      if (dom.jsonLdCount !== s.ld.length)
        mismatches.push(`JSON-LD blocks: server=${s.ld.length} client=${dom.jsonLdCount}`);
      results.push({ pathq: s.pathq, type: s.type, page: s.page, ok: mismatches.length === 0, mismatches });
      console.log(`  ${mismatches.length === 0 ? "PASS" : "FAIL"} parity ${s.pathq}${mismatches.length ? " :: " + mismatches[0] : ""}`);
    } catch (e) {
      results.push({ pathq: s.pathq, type: s.type, ok: false, mismatches: [`error: ${e.message}`] });
      console.log(`  FAIL parity ${s.pathq} :: ${e.message}`);
    }
  }
  await browser.close();
  return results;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
console.log(`SEO snapshot — base=${BASE} gate=${GATE} parity=${PARITY} out=${OUT}`);
await waitForServer();
const { siteOrigin, entries } = await loadCorpus();
console.log(`corpus: ${entries.length} URLs (${entries.filter((e) => e.kind === "sitemap").length} sitemap + ${entries.filter((e) => e.kind !== "sitemap").length} probes), origin=${siteOrigin}`);
const t0 = Date.now();
const pages = await fetchAll(entries);
console.log(`fetched in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

const failures = [];
const warnings = [];
let syllabusJourneys = 0;
let journeyPages = 0;
const entityTypeCounts = {};
const enrichment = { providerCount: 0, keywordsCount: 0, aboutCount: 0, isPartOfCount: 0, itemListElementPages: 0 };

for (const r of pages) {
  const { issues, warns } = validatePage(r, siteOrigin, GATE);
  for (const i of issues) failures.push({ url: r.pathq, type: r.type, ...i });
  for (const w of warns) warnings.push({ url: r.pathq, type: r.type, ...w });
  r.issues = issues.map((i) => i.code);
  if (r.kind === "sitemap" && r.status === 200) {
    if (r.type === "journey") {
      journeyPages++;
      const course = findTop(r.ld ?? [], "WebPage")?.mainEntity;
      if (Array.isArray(course?.syllabusSections) && course.syllabusSections.length) syllabusJourneys++;
    }
    if (r.type === "resource") {
      const entity = findTop(r.ld ?? [], "WebPage")?.mainEntity;
      if (entity) {
        entityTypeCounts[entity["@type"]] = (entityTypeCounts[entity["@type"]] || 0) + 1;
        if (entity.provider) enrichment.providerCount++;
        if (entity.keywords) enrichment.keywordsCount++;
        if (entity.about) enrichment.aboutCount++;
        if (entity.isPartOf) enrichment.isPartOfCount++;
      }
    }
    if (COLLECTION_TYPES.has(r.type)) {
      const list = findTop(r.ld ?? [], "CollectionPage")?.mainEntity;
      if (Array.isArray(list?.itemListElement) && list.itemListElement.length) enrichment.itemListElementPages++;
    }
  }
}

const indexable = pages.filter((p) => p.kind === "sitemap" && p.status === 200);
const dupTitles = dupStats(indexable, "title");
const dupDescs = dupStats(indexable, "description");
const perType = {};
for (const p of indexable) {
  perType[p.type] ??= { urls: 0, withIssues: 0 };
  perType[p.type].urls++;
  if (p.issues.length) perType[p.type].withIssues++;
}
const schemaFailUrls = new Set(failures.filter((f) => f.url && !f.code.startsWith("probe-")).map((f) => f.url));
const schemaPassRate = indexable.length ? (indexable.length - schemaFailUrls.size) / indexable.length : 0;

let parityResults = null;
if (PARITY) parityResults = await runParity(pages);

// Aggregate gate: at least one journey must emit a syllabus (all published
// journeys have steps; a corpus-wide zero means the enrichment regressed).
if (GATE && journeyPages > 0 && syllabusJourneys === 0) {
  failures.push({ url: "(aggregate)", type: "journey", code: "journey-syllabus-zero", detail: "no journey page emits syllabusSections" });
}

const metrics = {
  generatedAt: new Date().toISOString(),
  base: BASE,
  siteOrigin,
  mode: { gate: GATE, parity: PARITY, limit: LIMIT || null },
  corpus: {
    total: pages.length,
    sitemap: pages.filter((p) => p.kind === "sitemap").length,
    probes: pages.filter((p) => p.kind !== "sitemap").length,
    fetchErrors: pages.filter((p) => p.status === 0).length,
    byType: Object.fromEntries(Object.entries(perType).map(([k, v]) => [k, v.urls])),
  },
  schema: {
    passRate: +schemaPassRate.toFixed(4),
    failingUrls: schemaFailUrls.size,
    failureCount: failures.length,
    warningCount: warnings.length,
    resourceEntityTypes: entityTypeCounts,
    journeysWithSyllabus: `${syllabusJourneys}/${journeyPages}`,
    collectionsWithItemListElement: enrichment.itemListElementPages,
    resourceEnrichment: enrichment,
  },
  duplicates: {
    titleRate: +dupTitles.rate.toFixed(4),
    titleDupUrls: dupTitles.dupUrlCount,
    descriptionRate: +dupDescs.rate.toFixed(4),
    descriptionDupUrls: dupDescs.dupUrlCount,
  },
  parity: parityResults
    ? { sampled: parityResults.length, failed: parityResults.filter((p) => !p.ok).length }
    : null,
};

// ---------------------------------------------------------------------------
// reports
// ---------------------------------------------------------------------------
const failuresByCode = {};
for (const f of failures) {
  failuresByCode[f.code] ??= { count: 0, samples: [] };
  failuresByCode[f.code].count++;
  if (failuresByCode[f.code].samples.length < 5) failuresByCode[f.code].samples.push(`${f.url} — ${f.detail}`);
}

const md = [];
md.push(`# SEO snapshot — ${metrics.generatedAt}`);
md.push(``);
md.push(`Mode: ${GATE ? "GATE" : "record"}${PARITY ? " + parity" : ""}${LIMIT ? ` (limit ${LIMIT})` : ""} · Base: ${BASE} · Origin: ${siteOrigin}`);
md.push(``);
md.push(`## Corpus`);
md.push(`- URLs fetched: **${metrics.corpus.total}** (${metrics.corpus.sitemap} sitemap + ${metrics.corpus.probes} probes), fetch errors: ${metrics.corpus.fetchErrors}`);
md.push(`- By type: ${Object.entries(metrics.corpus.byType).map(([k, v]) => `${k}=${v}`).join(", ")}`);
md.push(``);
md.push(`## Headline metrics`);
md.push(`| metric | value |`);
md.push(`|---|---|`);
md.push(`| schema validation pass rate | **${(schemaPassRate * 100).toFixed(2)}%** (${indexable.length - schemaFailUrls.size}/${indexable.length}) |`);
md.push(`| duplicate-title rate | **${(dupTitles.rate * 100).toFixed(2)}%** (${dupTitles.dupUrlCount} URLs) |`);
md.push(`| duplicate-description rate | **${(dupDescs.rate * 100).toFixed(2)}%** (${dupDescs.dupUrlCount} URLs) |`);
md.push(`| collections emitting itemListElement | ${enrichment.itemListElementPages} |`);
md.push(`| journeys with Course syllabus | ${syllabusJourneys}/${journeyPages} |`);
md.push(`| resource mainEntity types | ${Object.entries(entityTypeCounts).map(([k, v]) => `${k}=${v}`).join(", ") || "—"} |`);
md.push(`| resource enrichment (provider/keywords/about/isPartOf) | ${enrichment.providerCount}/${enrichment.keywordsCount}/${enrichment.aboutCount}/${enrichment.isPartOfCount} |`);
if (parityResults)
  md.push(`| hydration parity | ${parityResults.filter((p) => p.ok).length}/${parityResults.length} PASS |`);
md.push(``);
md.push(`## Failures by code (${failures.length})`);
if (!failures.length) md.push(`None. ✅`);
for (const [code, info] of Object.entries(failuresByCode).sort((a, b) => b[1].count - a[1].count)) {
  md.push(`- **${code}** ×${info.count}`);
  for (const s of info.samples) md.push(`  - ${s}`);
}
md.push(``);
md.push(`## Top duplicate description clusters`);
for (const c of dupDescs.clusters.slice(0, 10)) md.push(`- ×${c.count}: "${c.value}" (e.g. ${c.sample.slice(0, 2).join(", ")})`);
md.push(``);
md.push(`## Top duplicate title clusters`);
for (const c of dupTitles.clusters.slice(0, 10)) md.push(`- ×${c.count}: "${c.value}" (e.g. ${c.sample.slice(0, 2).join(", ")})`);
if (parityResults?.some((p) => !p.ok)) {
  md.push(``);
  md.push(`## Parity failures`);
  for (const p of parityResults.filter((x) => !x.ok)) md.push(`- ${p.pathq}: ${p.mismatches.join(" | ")}`);
}
md.push(``);

fs.writeFileSync(path.join(OUT, "snapshot.json"), JSON.stringify({ metrics, failures, warnings, parity: parityResults, pages: pages.map(({ ld, ...rest }) => rest) }, null, 1));
fs.writeFileSync(path.join(OUT, "metrics.json"), JSON.stringify(metrics, null, 2));
fs.writeFileSync(path.join(OUT, "report.md"), md.join("\n"));
console.log(md.join("\n"));
console.log(`\nreports written to ${OUT}`);

// ---------------------------------------------------------------------------
// exit policy
// ---------------------------------------------------------------------------
const fetchBroken = metrics.corpus.fetchErrors > Math.max(3, pages.length * 0.02);
if (!GATE) {
  process.exit(fetchBroken ? 1 : 0);
}
const gateViolations = [];
if (fetchBroken) gateViolations.push(`fetch errors: ${metrics.corpus.fetchErrors}`);
if (failures.length) gateViolations.push(`${failures.length} structural failures`);
if (schemaPassRate < 1) gateViolations.push(`schema pass rate ${(schemaPassRate * 100).toFixed(2)}% < 100%`);
if (dupDescs.rate >= 0.10) gateViolations.push(`duplicate-description rate ${(dupDescs.rate * 100).toFixed(2)}% ≥ 10%`);
if (dupTitles.rate >= 0.10) gateViolations.push(`duplicate-title rate ${(dupTitles.rate * 100).toFixed(2)}% ≥ 10%`);
if (parityResults && parityResults.some((p) => !p.ok)) gateViolations.push(`hydration parity failures: ${parityResults.filter((p) => !p.ok).length}`);
if (gateViolations.length) {
  console.error(`\nGATE FAILED:\n- ${gateViolations.join("\n- ")}`);
  process.exit(1);
}
console.log(`\nGATE PASSED ✅`);
process.exit(0);

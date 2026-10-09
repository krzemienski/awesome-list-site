// Live HTTP smoke probe for awesome.video (read-only, anonymous).
// Usage: node http-probe.mjs [baseUrl] > out.json
const BASE = process.argv[2] || "https://awesome.video";
const RES_KEYS = new Set([
  "id", "title", "url", "description", "category", "subcategory", "subSubcategory",
  "resourceFormat", "provider", "skillLevel", "kind", "status", "createdAt",
  "resourceId", "favoritedAt", "notes", "bookmarkedAt", "queueStatus", "archivedAt",
  "personalTags", "collectionIds", "metadata", "resolvedKind",
]);
const META_KEYS = new Set([
  "ogImage", "ogImageBlurhash", "favicon", "siteName", "author", "scrapedTitle",
  "scrapedDescription", "ogTitle", "ogDescription", "twitterCard", "tags", "featured", "urlScraped",
]);
const FORBIDDEN = new Set([
  "submittedBy", "approvedBy", "searchTsv", "search_tsv", "githubSynced", "lastSyncedAt",
  "contributorRejectionReason", "statusChangedAt", "approvedAt", "password", "email",
  "researchJobId", "discoveryId", "enrichmentError", "aiModel", "sourceList", "importedFrom",
]);

function scanLeaks(node, path = "$", out = []) {
  if (Array.isArray(node)) { node.forEach((v, i) => scanLeaks(v, `${path}[${i}]`, out)); return out; }
  if (!node || typeof node !== "object") return out;
  for (const k of Object.keys(node)) if (FORBIDDEN.has(k)) out.push(`${path}.${k} (forbidden key)`);
  const isResource = "url" in node && "title" in node && "id" in node && ("category" in node || "metadata" in node);
  if (isResource) {
    for (const k of Object.keys(node)) if (!RES_KEYS.has(k)) out.push(`${path}.${k} (non-allowlisted resource key)`);
    if (node.metadata && typeof node.metadata === "object") {
      for (const k of Object.keys(node.metadata)) if (!META_KEYS.has(k)) out.push(`${path}.metadata.${k} (non-allowlisted metadata key)`);
    }
  }
  for (const [k, v] of Object.entries(node)) if (v && typeof v === "object") scanLeaks(v, `${path}.${k}`, out);
  return out;
}

function shape(d) {
  if (Array.isArray(d)) return `array(${d.length})${d[0] && typeof d[0] === "object" ? ` of {${Object.keys(d[0]).slice(0, 12).join(",")}}` : ""}`;
  if (d && typeof d === "object") return `{${Object.keys(d).slice(0, 14).join(",")}}`;
  return typeof d;
}

async function probe(path, { expect = 200, html = false } = {}) {
  const t0 = performance.now();
  let res, text = "";
  try {
    res = await fetch(BASE + path, { redirect: "manual", headers: html ? {} : { Accept: "application/json" } });
    text = await res.text();
  } catch (e) {
    return { path, ok: false, error: String(e) };
  }
  const ms = Math.round(performance.now() - t0);
  const row = { path, status: res.status, ms, bytes: text.length, expect, ok: res.status === expect };
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("json")) {
    try {
      const d = JSON.parse(text);
      row.shape = shape(d);
      row.leaks = scanLeaks(d).slice(0, 20);
      if (row.leaks.length) row.ok = false;
      row._data = d;
    } catch { row.shape = "invalid json"; row.ok = false; }
  } else if (ct.includes("html")) {
    const title = text.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];
    const robots = text.match(/<meta[^>]+name="robots"[^>]+content="([^"]*)"/i)?.[1];
    const canonical = text.match(/<link[^>]+rel="canonical"[^>]+href="([^"]*)"/i)?.[1];
    const h1 = text.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, "").trim().slice(0, 80);
    const ld = (text.match(/application\/ld\+json/g) || []).length;
    Object.assign(row, { title, robots, canonical, h1, jsonLd: ld });
  } else {
    row.contentType = ct;
    row.head = text.slice(0, 80);
  }
  if (res.status >= 300 && res.status < 400) row.location = res.headers.get("location");
  return row;
}

const rows = [];
const add = async (p, o) => { const r = await probe(p, o); rows.push(r); return r; };

const health = await add("/api/health");
const nav = (await add("/api/awesome-list/nav"))._data;
const cat = nav.categories.find((c) => c.subcategories?.some((s) => s.subSubcategories?.length));
const sub = cat.subcategories.find((s) => s.subSubcategories?.length);
const subsub = sub.subSubcategories[0];
const list = (await add("/api/resources?limit=24"))._data;
const rid = list.resources[0].id;
const journeys = (await add("/api/journeys"))._data;
const jid = journeys[0].id;
const tags = (await add("/api/tags"))._data;
const tag = tags.tags.find((t) => t.count >= 5)?.tag || "ffmpeg";

await add("/api/categories");
await add(`/api/subcategories?category=${encodeURIComponent(cat.name)}`);
await add("/api/sub-subcategories");
await add(`/api/resources?category=${encodeURIComponent(cat.name)}&limit=24`);
await add(`/api/resources?tags=${encodeURIComponent(tag)}&limit=24`);
await add(`/api/resources/${rid}`);
await add(`/api/resources/${rid}/related`);
await add("/api/resources/999999999", { expect: 404 });
await add("/api/resources/kinds/counts");
await add("/api/search?q=ffmpeg");
await add("/api/search?q=hls%20player&category=" + encodeURIComponent(cat.name));
await add("/api/search?q=ffmpg"); // typo tolerance
await add(`/api/journeys/${jid}`);
await add("/api/journeys/999999", { expect: 404 });
await add("/api/journeys/not-a-number", { expect: 404 });
await add("/api/awesome-list");
await add("/api/public/resources?limit=5");
await add(`/api/public/resources/${rid}`);
await add("/api/public/categories");
await add("/api/public/tags");
await add("/api/auth/user");
await add("/api/bookmarks", { expect: 401 });
await add("/api/favorites", { expect: 401 });
await add("/api/admin/stats", { expect: 401 });
await add("/api/user/preferences", { expect: 401 });

// Pages (server-rendered shells / prerender)
const pages = [
  ["/", 200], [`/category/${cat.slug}`, 200], [`/subcategory/${sub.slug}`, 200],
  [`/sub-subcategory/${subsub.slug}`, 200], ["/categories", 200],
  ["/search?q=ffmpeg", 200], [`/search?q=player&category=${encodeURIComponent(cat.name)}`, 200],
  [`/resource/${rid}`, 200], ["/journeys", 200], [`/journey/${jid}`, 200],
  [`/tag/${encodeURIComponent(tag)}`, 200], ["/tag/zz-no-such-tag-578", 404],
  ["/sign-in", 200], ["/sign-up", 200], ["/about", 200], ["/advanced", 200], ["/submit", 200],
  ["/this-page-does-not-exist-578", 404], ["/resource/999999999", 404], ["/journey/999999", 404],
  ["/category/zz-no-such-cat-578", 404], ["/sitemap.xml", 200], ["/robots.txt", 200],
  ["/admin", 302], ["/bookmarks", 200], ["/profile", 302],
];
for (const [p, e] of pages) await add(p, { expect: e, html: true });

const summary = {
  base: BASE, at: new Date().toISOString(), sample: { cat: cat.slug, sub: sub.slug, subsub: subsub.slug, rid, jid, tag },
  total: rows.length, failing: rows.filter((r) => !r.ok).map((r) => r.path),
};
for (const r of rows) delete r._data;
console.log(JSON.stringify({ summary, rows }, null, 2));

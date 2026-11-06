import { register, pass, fail, info, verdict, type Ctx, type Result } from "../registry.ts";
import { GOOGLEBOT_UA } from "../lib/http.ts";
import { loadSitemap, pick, rngFor } from "../lib/sitemap.ts";

const HOUR_MS = 3_600_000;
const FRESH_SCAN_FAIL_H = 30;
const FRESH_SCAN_WARN_H = 26;
const RESEARCHER_OK = new Set(["completed", "cancelled", "budget_stopped"]);

const ageHours = (iso: string) => (Date.now() - new Date(iso).getTime()) / HOUR_MS;
const attr = (tag: string, name: string) => (new RegExp(`\\b${name}=("([^"]*)"|'([^']*)')`, "i").exec(tag))?.slice(2).find((v) => v !== undefined);
const sitemapResources = async (ctx: Ctx) => (await loadSitemap(ctx)).byType.get("resource") ?? [];

async function categorySum(ctx: Ctx): Promise<number> {
  const cats = (await ctx.http.get("/api/categories")).json<{ resourceCount: number }[]>();
  return cats.reduce((n, c) => n + c.resourceCount, 0);
}

function outboundLinks(html: string, baseHost: string): { href: string; rel: string }[] {
  return [...html.matchAll(/<a\b[^>]*>/gi)]
    .map((m) => ({ href: attr(m[0], "href") ?? "", rel: attr(m[0], "rel") ?? "" }))
    .filter(({ href }) => /^https:\/\//i.test(href) && new URL(href).host !== baseHost && !/github\.com\/krzemienski\//i.test(href));
}

async function checkResourcePage(ctx: Ctx, path: string): Promise<string[]> {
  const res = await ctx.http.get(path, { ua: GOOGLEBOT_UA });
  if (res.status !== 200) return [`${path} answered ${res.status}`];
  const problems: string[] = [];
  const h1 = (res.text.match(/<h1[\s>]/gi) ?? []).length;
  if (h1 !== 1) problems.push(`${path} has ${h1} <h1>`);
  const out = outboundLinks(res.text, new URL(ctx.base).host);
  if (!out.some((l) => /noopener/i.test(l.rel))) problems.push(`${path} has no outbound https link with rel=noopener (${out.length} outbound)`);
  return problems;
}

async function checkSeoPage(ctx: Ctx, path: string): Promise<string[]> {
  const res = await ctx.http.get(path, { ua: GOOGLEBOT_UA });
  if (res.status !== 200) return [`${path} answered ${res.status}`];
  const html = res.text;
  const problems: string[] = [];
  if (!/<title[^>]*>[^<]+<\/title>/i.test(html)) problems.push(`${path} missing <title>`);
  const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]);
  const meta = (key: string, val: string) => metas.find((m) => attr(m, key) === val);
  if (!attr(meta("name", "description") ?? "", "content")) problems.push(`${path} missing meta description`);
  if (!/<link\b[^>]*rel=["']canonical["'][^>]*>/i.test(html)) problems.push(`${path} missing canonical`);
  const og = attr(meta("property", "og:image") ?? "", "content");
  if (!og) problems.push(`${path} missing og:image`);
  else if ((await ctx.http.get(og)).status !== 200) problems.push(`${path} og:image does not return 200`);
  const blocks = [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  if (blocks.length === 0) problems.push(`${path} has no JSON-LD`);
  for (const b of blocks) {
    try {
      JSON.parse(b);
    } catch {
      problems.push(`${path} has JSON-LD that does not parse`);
    }
  }
  return problems;
}

async function newestResearcherJob(ctx: Ctx): Promise<Result> {
  const { jobs } = (await ctx.http.get("/api/researcher/jobs", { owner: true })).json<{ jobs: { id: number; status: string; error?: string | null; createdAt?: string }[] }>();
  if (!jobs.length) return info("no Researcher job exists");
  const job = jobs.reduce((a, b) => (b.id > a.id ? b : a));
  const problems: string[] = [];
  if (!RESEARCHER_OK.has(job.status)) problems.push(`newest job ${job.id} status ${job.status}`);
  if (job.error) problems.push(`newest job ${job.id} has an error`);
  const age = job.createdAt ? ageHours(job.createdAt) / 24 : 0;
  const values = { id: job.id, status: job.status, ageDays: Math.round(age * 10) / 10 };
  if (problems.length) return fail(problems.join("; "), values);
  return age > 14 ? info(`newest job ${job.id} (${job.status}) is ${values.ageDays} days old: none in 14 d`, values) : pass(`newest job ${job.id} ${job.status}`, values);
}

register(
  {
    id: "T1-02", tier: 1, kind: "api", blocking: true, needs: ["owner"],
    async run(ctx) {
      const inSitemap = (await sitemapResources(ctx)).length;
      const inCategories = await categorySum(ctx);
      const totalPublic = (await ctx.http.get("/api/admin/stats", { owner: true })).json<{ totalPublic: number }>().totalPublic;
      const values = { sitemap: inSitemap, categories: inCategories, totalPublic };
      return inSitemap === inCategories && inCategories === totalPublic
        ? pass(`sitemap = categories = totalPublic = ${totalPublic}`, values)
        : fail(`sitemap ${inSitemap}, categories ${inCategories}, totalPublic ${totalPublic}`, values);
    },
  },
  {
    id: "T1-03", tier: 1, kind: "api", blocking: true,
    async run(ctx) {
      const total = (await loadSitemap(ctx)).paths.length;
      return total >= 4000 ? pass(`${total} sitemap URLs`, { total }) : fail(`${total} sitemap URLs (floor 4000)`, { total });
    },
  },
  {
    id: "T1-04", tier: 1, kind: "api", blocking: true,
    async run(ctx) {
      const picks = pick(await loadSitemap(ctx), "resource", 3, rngFor(ctx.runId, "T1-04"));
      const problems = (await Promise.all(picks.map((p) => checkResourcePage(ctx, p)))).flat();
      return verdict(problems, `3 resource pages ok (${picks.join(", ")})`, { picks });
    },
  },
  {
    id: "T1-05", tier: 1, kind: "api", blocking: true,
    async run(ctx) {
      const total = (await ctx.http.get("/api/search?q=ffmpeg")).json<{ total: number }>().total;
      return total > 0 ? pass(`search ffmpeg total ${total}`, { total }) : fail("search ffmpeg returned 0");
    },
  },
  {
    id: "T1-07", tier: 1, kind: "api", blocking: true,
    async run(ctx) {
      const rng = rngFor(ctx.runId, "T1-07");
      const sitemap = await loadSitemap(ctx);
      const cats = (await ctx.http.get("/api/categories")).json<{ slug: string }[]>();
      const journeys = (await ctx.http.get("/api/journeys")).json<{ id: number }[]>();
      const paths = ["/", `/category/${cats[Math.floor(rng() * cats.length)].slug}`, pick(sitemap, "resource", 1, rng)[0], `/journey/${journeys[Math.floor(rng() * journeys.length)].id}`];
      const problems = (await Promise.all(paths.map((p) => checkSeoPage(ctx, p)))).flat();
      return verdict(problems, `4 page types ok (${paths.join(", ")})`, { paths });
    },
  },
  {
    id: "T1-08", tier: 1, kind: "api", blocking: true,
    async run(ctx) {
      const res = await ctx.http.get("/robots.txt");
      if (res.status !== 200) return fail(`robots.txt answered ${res.status}`);
      return /^Sitemap:/im.test(res.text) ? pass("robots.txt 200 with Sitemap:") : fail("robots.txt has no Sitemap: line");
    },
  },
  {
    id: "T1-09", tier: 1, kind: "api", blocking: true,
    async run(ctx) {
      const res = await ctx.http.get("/zz-not-a-route");
      return res.status === 404 ? pass("unknown route answers 404") : fail(`unknown route answered ${res.status}`);
    },
  },
  {
    id: "T1-14", tier: 1, kind: "api", blocking: true, needs: ["owner"],
    async run(ctx) {
      const res = await ctx.http.get("/api/admin/stats", { owner: true });
      return res.status === 200 ? pass("admin stats 200") : fail(`admin stats answered ${res.status}`);
    },
  },
  {
    id: "T1-15", tier: 1, kind: "api", blocking: true, needs: ["owner"],
    async run(ctx) {
      const res = await ctx.http.get("/api/admin/pending-resources", { owner: true });
      if (res.status !== 200) return fail(`pending-resources answered ${res.status}`);
      const body = res.json<{ resources?: unknown[]; total?: number }>();
      return Array.isArray(body.resources) && typeof body.total === "number" ? pass(`approvals readable, ${body.total} pending`, { total: body.total }) : fail("pending-resources lacks resources/total");
    },
  },
  {
    id: "T1-16", tier: 1, kind: "api", blocking: true, needs: ["owner"],
    async run(ctx) {
      const status = (await ctx.http.get("/api/admin/operations/health", { owner: true })).json<{ status: string }>().status;
      return status === "ready" ? pass("ops health ready") : fail(`ops health is ${status}`);
    },
  },
  {
    id: "T1-17", tier: 1, kind: "api", blocking: false, needs: ["owner"],
    async run(ctx) {
      const { backups } = (await ctx.http.get("/api/admin/database-backups", { owner: true })).json<{ backups: { completedAt: string }[] }>();
      if (!backups.length) return info("no backup listed");
      const newest = backups.map((b) => b.completedAt).sort().at(-1)!;
      const age = Math.round(ageHours(newest) * 10) / 10;
      return info(`newest backup ${age} h old (info only until backup scheduling ships)`, { completedAt: newest, ageHours: age });
    },
  },
  {
    id: "T1-18", tier: 1, kind: "api", blocking: true, needs: ["owner"],
    async run(ctx) {
      const { job } = (await ctx.http.get("/api/admin/link-health/status", { owner: true })).json<{ job: { id: number; status: string; completedAt: string } }>();
      if (job.status !== "completed") return fail(`newest link scan ${job.id} is ${job.status}`);
      const age = Math.round(ageHours(job.completedAt) * 10) / 10;
      const values = { id: job.id, ageHours: age };
      if (age > FRESH_SCAN_FAIL_H) return fail(`newest link scan ${job.id} finished ${age} h ago (limit ${FRESH_SCAN_FAIL_H})`, values);
      return age > FRESH_SCAN_WARN_H ? info(`link scan ${job.id} is ${age} h old: a scan is due`, values) : pass(`link scan ${job.id} completed ${age} h ago`, values);
    },
  },
  { id: "T1-19", tier: 1, kind: "api", blocking: true, needs: ["owner"], run: newestResearcherJob },
);

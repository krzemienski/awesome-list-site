import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { register, pass, fail, info, verdict, type Ctx, type Result } from "../registry.ts";
import { loadSitemap, pick, rngFor } from "../lib/sitemap.ts";
import { onPage, withVisitor } from "./tier1-browser.ts";

const DAY_MS = 86_400_000;
const COVERAGE_DROP_POINTS = 2;
const STALE_DIGEST_H = 24;
const get = <T>(ctx: Ctx, path: string, owner = false) => ctx.http.get(path, { owner }).then((r) => r.json<T>());

async function totalPublic(ctx: Ctx): Promise<number> {
  return (await get<{ totalPublic: number }>(ctx, "/api/admin/stats", true)).totalPublic;
}

async function stepsOf(ctx: Ctx, journeyPath: string): Promise<Result> {
  return withVisitor(ctx, (kit) =>
    onPage(ctx, kit, `T3-j2${journeyPath.replace(/\W/g, "-")}`, async (page) => {
      await kit.open(page, journeyPath);
      const h1 = await page.locator("h1").first().innerText();
      const steps = await page.locator('a[href^="/resource/"]').count();
      const outbound = await page.locator('a[href^="http"]').evaluateAll((els) =>
        els.map((e) => (e as HTMLAnchorElement).href).filter((h) => !/awesome\.video|krzemienski/.test(h)),
      );
      return verdict(
        [!h1 && `${journeyPath} has no h1`, !steps && `${journeyPath} has no step links`, !outbound.length && `${journeyPath} has no outbound links`].filter(Boolean) as string[],
        `${journeyPath}: "${h1}", ${steps} steps, ${outbound.length} outbound`,
      );
    }),
  );
}

function previousCoverage(ctx: Ctx): number | null {
  try {
    const dirs = readdirSync(ctx.outRoot).filter((d) => d !== ctx.runId).sort().reverse();
    for (const d of dirs) {
      const result = JSON.parse(readFileSync(join(ctx.outRoot, d, "result.json"), "utf8")) as { checks?: { id: string; values?: { coveragePct?: unknown } }[] };
      const value = result.checks?.find((c) => c.id === "T3-en")?.values?.coveragePct;
      if (typeof value === "number") return value;
    }
  } catch {
    /* no earlier result */
  }
  return null;
}

register(
  {
    id: "T3-j1", tier: 3, kind: "browser", blocking: false,
    async run(ctx) {
      const api = await get<unknown[]>(ctx, "/api/journeys");
      return withVisitor(ctx, (kit) => onPage(ctx, kit, "T3-j1", async (page) => {
        await kit.open(page, "/journeys");
        await page.locator('a[href^="/journey/"]').first().waitFor({ timeout: 10_000 }).catch(() => undefined);
        const cards = await page.locator('a[href^="/journey/"]').count();
        return cards === api.length ? pass(`${cards} journey cards = API ${api.length}`) : fail(`${cards} journey cards, API lists ${api.length}`);
      }));
    },
  },
  {
    id: "T3-j2", tier: 3, kind: "browser", blocking: false,
    async run(ctx) {
      const paths = pick(await loadSitemap(ctx), "journey", 2, rngFor(ctx.runId, "T3-j2"));
      const results = [];
      for (const p of paths) results.push(await stepsOf(ctx, p));
      const bad = results.filter((r) => r.status === "fail");
      return bad.length ? fail(bad.map((r) => r.detail).join("; ")) : pass(results.map((r) => r.detail).join(" | "), { paths });
    },
  },
  {
    id: "T3-t", tier: 3, kind: "browser", blocking: false,
    async run(ctx) {
      const tags = pick(await loadSitemap(ctx), "tag", 3, rngFor(ctx.runId, "T3-t"));
      return withVisitor(ctx, (kit) => onPage(ctx, kit, "T3-t", async (page) => {
        const problems: string[] = [];
        for (const tag of tags) {
          await kit.open(page, tag);
          if (!(await page.locator("h1").count())) problems.push(`${tag} has no h1`);
          if (!(await page.locator('a[href^="/resource/"]').count())) problems.push(`${tag} lists no resources`);
        }
        return verdict(problems, `3 tag pages render resources (${tags.join(", ")})`, { tags });
      }));
    },
  },
  {
    id: "T3-p1", tier: 3, kind: "api", blocking: false,
    async run(ctx) {
      const pub = (await get<{ categories: unknown[] }>(ctx, "/api/public/categories")).categories.length;
      const app = (await get<unknown[]>(ctx, "/api/categories")).length;
      return pub === app ? pass(`${pub} categories in both`) : fail(`public ${pub} != app ${app}`);
    },
  },
  {
    id: "T3-p2", tier: 3, kind: "api", blocking: false,
    async run(ctx) {
      const pub = await get<{ total: number; tags: unknown[] }>(ctx, "/api/public/tags");
      const app = await get<{ total: number }>(ctx, "/api/tags");
      return pub.total === app.total && pub.tags.length === pub.total ? pass(`${pub.total} tags`) : fail(`public ${pub.total} (${pub.tags.length} listed), app ${app.total}`);
    },
  },
  {
    id: "T3-p3", tier: 3, kind: "api", blocking: false, needs: ["owner"],
    async run(ctx) {
      const pub = (await get<{ total: number }>(ctx, "/api/public/resources?limit=1")).total;
      const admin = await totalPublic(ctx);
      const sitemap = ((await loadSitemap(ctx)).byType.get("resource") ?? []).length;
      return pub === admin && admin === sitemap ? pass(`public = admin = sitemap = ${pub}`) : fail(`public ${pub}, admin ${admin}, sitemap ${sitemap}`);
    },
  },
  {
    id: "T3-p4", tier: 3, kind: "api", blocking: false,
    async run(ctx) {
      const n = (await get<{ resources: unknown[] }>(ctx, "/api/public/resources?limit=100")).resources.length;
      return n === 100 ? pass("limit=100 returns 100") : fail(`limit=100 returned ${n}`);
    },
  },
  {
    id: "T3-p5", tier: 3, kind: "api", blocking: false,
    async run(ctx) {
      const path = pick(await loadSitemap(ctx), "resource", 1, rngFor(ctx.runId, "T3-p5"))[0];
      const res = await ctx.http.get(`/api/public/resources/${path.split("/").pop()}`);
      const body = res.status === 200 ? res.json<{ title?: string; url?: string }>() : {};
      return res.status === 200 && body.title && body.url ? pass(`${path} has title and url`) : fail(`public resource ${path} answered ${res.status}`);
    },
  },
  {
    id: "T3-p6", tier: 3, kind: "api", blocking: false,
    async run(ctx) {
      const res = await ctx.http.get("/api/public/me");
      return res.status === 401 ? pass("/api/public/me without a key is 401") : fail(`/api/public/me answered ${res.status}`);
    },
  },
  {
    id: "T3-en", tier: 3, kind: "api", blocking: false, needs: ["owner"],
    async run(ctx) {
      const cov = await get<{ approvedTotal: number; coveragePct: number }>(ctx, "/api/admin/enrichment/coverage", true);
      const expected = await totalPublic(ctx);
      const values = { coveragePct: cov.coveragePct, approvedTotal: cov.approvedTotal };
      if (cov.approvedTotal !== expected) return fail(`approvedTotal ${cov.approvedTotal} != totalPublic ${expected}`, values);
      const before = previousCoverage(ctx);
      if (before !== null && before - cov.coveragePct > COVERAGE_DROP_POINTS) return fail(`coverage fell ${before} -> ${cov.coveragePct}`, values);
      return info(`coverage ${cov.coveragePct}%${before === null ? " (no earlier run)" : ` (was ${before}%)`}`, values);
    },
  },
  {
    id: "T3-gh", tier: 3, kind: "api", blocking: false, needs: ["owner"],
    async run(ctx) {
      const rows = await get<{ direction: string; createdAt: string; status: string }[]>(ctx, "/api/github/sync-history", true);
      const exports = rows.filter((r) => r.direction === "export");
      if (!exports.length) return info("no export recorded");
      const newest = exports.reduce((a, b) => (b.createdAt > a.createdAt ? b : a));
      const days = Math.round((Date.now() - new Date(newest.createdAt).getTime()) / DAY_MS);
      return info(`newest GitHub export ${days} d ago (${newest.status}); ${exports.filter((e) => e.status === "failed").length} of ${exports.length} failed`, { days });
    },
  },
  {
    id: "T3-dg", tier: 3, kind: "api", blocking: false, needs: ["owner"],
    async run(ctx) {
      const d = await get<{ transport: { available: boolean }; recentFailureCodes: unknown[]; oldestQueuedAt: string | null }>(ctx, "/api/admin/digests/health", true);
      const problems: string[] = [];
      if (!d.transport.available) problems.push("digest transport unavailable");
      if (d.recentFailureCodes.length) problems.push(`${d.recentFailureCodes.length} recent failure codes`);
      if (d.oldestQueuedAt && Date.now() - new Date(d.oldestQueuedAt).getTime() > STALE_DIGEST_H * 3_600_000) problems.push(`queue item older than ${STALE_DIGEST_H} h`);
      return verdict(problems, "digest transport available, no failures, queue not stale");
    },
  },
  {
    id: "T3-adv", tier: 3, kind: "browser", blocking: false,
    async run(ctx) {
      const cats = await get<{ resourceCount: number }[]>(ctx, "/api/categories");
      const resources = cats.reduce((n, c) => n + c.resourceCount, 0);
      const tags = (await get<{ total: number }>(ctx, "/api/tags")).total;
      return withVisitor(ctx, (kit) => onPage(ctx, kit, "T3-adv", async (page) => {
        await kit.open(page, "/advanced");
        const text = (await page.locator("body").innerText()).replace(/\s+/g, " ");
        const shown = (label: string) => Number((new RegExp(`([\\d,]+) ${label}`).exec(text))?.[1].replace(/,/g, ""));
        const problems = [
          shown("CATEGORIES") !== cats.length && `categories ${shown("CATEGORIES")} != ${cats.length}`,
          shown("RESOURCES") !== resources && `resources ${shown("RESOURCES")} != ${resources}`,
          shown("UNIQUE TAGS") !== tags && `tags ${shown("UNIQUE TAGS")} != ${tags}`,
        ].filter(Boolean) as string[];
        return verdict(problems, `Explorer shows ${cats.length} categories, ${resources} resources, ${tags} tags`);
      }));
    },
  },
);

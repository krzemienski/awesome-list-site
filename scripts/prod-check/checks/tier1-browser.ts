import type { Page } from "playwright";
import { register, pass, fail, skip, verdict, type Ctx, type Result } from "../registry.ts";
import type { KitContext } from "../lib/browser.ts";
import { loadSitemap, pick, rngFor } from "../lib/sitemap.ts";
import { loadMemberStateCookies } from "../lib/audit-actor.ts";
import { redact } from "../lib/http.ts";

const RESOURCE_LINK = 'a[href^="/resource/"]';
const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 900 };
const TABLET = { width: 768, height: 1024 };
const CLS_LIMIT = 0.1;
const CLS_WINDOW_MS = 5_000;
const CLS_LOADS = 3;
const DECLINE_WATCH_MS = 10_000;
const ANALYTICS_HOST = /google-analytics|googletagmanager|mixpanel|posthog|amplitude/i;
const CLERK_CARD = ".cl-card, .cl-cardBox";
const RECOMMENDATIONS_PATH = /^\/api\/recommendations(\/|$)/;
const LOAD_POST_WATCH_MS = 5_000;
/** D1 (PR #321): the only opt-in to a paid Claude recommendation is `useAI: true` in the POST body; page-load POSTs carry `{}`. */
const AI_OPT_IN_FIELD = "useAI";

/** Opens a visitor context, runs fn, and always closes it. */
export async function withVisitor<T>(ctx: Ctx, fn: (kit: KitContext) => Promise<T>, viewport?: { width: number; height: number }): Promise<T> {
  const kit = await ctx.browser!.newContext("visitor", viewport);
  ctx.shared.set("visitorPagesOpened", true);
  try {
    return await fn(kit);
  } finally {
    await kit.close();
  }
}

/** Runs body against a fresh page; on failure or throw, saves a screenshot and attaches it to the result. */
export async function onPage(ctx: Ctx, kit: KitContext, id: string, body: (page: Page) => Promise<Result>): Promise<Result> {
  const page = await kit.newPage();
  try {
    const result = await body(page);
    if (result.status === "fail") result.evidence = [await ctx.browser!.screenshot(page, id)];
    return result;
  } catch (err) {
    await ctx.browser!.screenshot(page, id);
    throw err;
  } finally {
    await page.close();
  }
}

async function pagesToVisit(ctx: Ctx): Promise<string[]> {
  const rng = rngFor(ctx.runId, "T1-01");
  const sitemap = await loadSitemap(ctx);
  const cats = (await ctx.http.get("/api/categories")).json<{ slug: string }[]>();
  return ["/", ...cats.map((c) => `/category/${c.slug}`), ...pick(sitemap, "subcategory", 1, rng), ...pick(sitemap, "sub-subcategory", 1, rng)];
}

register(
  {
    id: "T1-01", tier: 1, kind: "browser", blocking: true,
    run: (ctx) =>
      withVisitor(ctx, (kit) =>
        onPage(ctx, kit, "T1-01", async (page) => {
          const paths = await pagesToVisit(ctx);
          const empty: string[] = [];
          for (const path of paths) {
            await kit.open(page, path);
            const found = await page.locator(RESOURCE_LINK).first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
            if (!found) empty.push(path);
          }
          return verdict(empty.map((p) => `${p} shows no resource link`), `${paths.length} pages show resources`, { paths });
        }),
      ),
  },
  {
    id: "T1-06", tier: 1, kind: "browser", blocking: true,
    run: (ctx) =>
      withVisitor(ctx, (kit) =>
        onPage(ctx, kit, "T1-06", async (page) => {
          await kit.open(page, "/");
          const box = page.getByRole("combobox");
          for (let attempt = 0; attempt < 3 && !(await box.isVisible()); attempt++) {
            await page.keyboard.press("ControlOrMeta+k");
            await box.waitFor({ timeout: 2_000 }).catch(() => undefined);
          }
          await box.fill("ffmpeg");
          const options = page.getByRole("option");
          await options.first().waitFor({ timeout: 10_000 }).catch(() => undefined);
          const n = await options.count();
          return n > 0 ? pass(`palette shows ${n} options for ffmpeg`, { options: n }) : fail("palette shows no options for ffmpeg");
        }),
      ),
  },
  {
    id: "T1-10", tier: 1, kind: "browser", blocking: true,
    run: (ctx) =>
      withVisitor(ctx, (kit) =>
        onPage(ctx, kit, "T1-10", async (page) => {
          await kit.open(page, "/sign-in");
          const input = page.locator('input[name="identifier"]');
          const shown = await input.waitFor({ timeout: 10_000 }).then(() => true, () => false);
          return shown ? pass("sign-in shows the Clerk identifier input") : fail("sign-in shows no identifier input");
        }),
      ),
  },
  {
    id: "T1-11", tier: 1, kind: "browser", blocking: true,
    run: (ctx) =>
      withVisitor(ctx, (kit) =>
        onPage(ctx, kit, "T1-11", async (page) => {
          await kit.open(page, "/profile");
          const redirected = await page.waitForURL(/\/sign-in\?redirect_url=%2Fprofile/, { timeout: 10_000 }).then(() => true, () => false);
          return redirected ? pass("/profile redirects to sign-in") : fail(`/profile stayed on ${new URL(page.url()).pathname}`);
        }),
      ),
  },
  {
    id: "T1-12", tier: 1, kind: "browser", blocking: true,
    run: (ctx) =>
      withVisitor(
        ctx,
        (kit) =>
          onPage(ctx, kit, "T1-12", async (page) => {
            const rng = rngFor(ctx.runId, "T1-12");
            const sitemap = await loadSitemap(ctx);
            const cats = (await ctx.http.get("/api/categories")).json<{ slug: string }[]>();
            const paths = ["/", `/category/${cats[Math.floor(rng() * cats.length)].slug}`, ...pick(sitemap, "resource", 1, rng)];
            const over: string[] = [];
            for (const path of paths) {
              await kit.open(page, path);
              const { scrollWidth, innerWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
              if (scrollWidth > innerWidth) over.push(`${path} scrollWidth ${scrollWidth} > ${innerWidth}`);
            }
            return verdict(over, `no horizontal overflow at 390 px on ${paths.join(", ")}`, { paths });
          }),
        MOBILE,
      ),
  },
  {
    id: "T1-13", tier: 1, kind: "browser", blocking: true,
    run(ctx) {
      if (!ctx.shared.get("visitorPagesOpened")) return Promise.resolve(skip("no visitor browser check ran before this one"));
      const errors = ctx.browser!.consoleErrors.filter((e) => e.auth === "visitor");
      return Promise.resolve(verdict(errors.slice(0, 5).map((e) => `${e.page}: ${e.text.slice(0, 120)}`), "0 console errors on visitor pages", { errors: errors.length }));
    },
  },
  {
    id: "C-01", tier: 1, kind: "browser", blocking: true,
    run: (ctx) =>
      withVisitor(ctx, (kit) =>
        onPage(ctx, kit, "C-01", async (page) => {
          const before = ctx.browser!.consoleErrors.length;
          await kit.open(page, "/search?q=hls");
          await page.locator(RESOURCE_LINK).first().waitFor({ timeout: 10_000 }).catch(() => undefined);
          const cards = await page.locator(RESOURCE_LINK).count();
          const errors = ctx.browser!.consoleErrors.slice(before);
          const problems = [
            ...(cards < 1 ? ["/search?q=hls shows no result card"] : []),
            ...errors.slice(0, 3).map((e) => `console error: ${e.text.slice(0, 120)}`),
          ];
          return verdict(problems, `/search?q=hls shows ${cards} result links, 0 console errors`, { cards, consoleErrors: errors.length });
        }),
        DESKTOP,
      ),
  },
  {
    id: "C-02", tier: 1, kind: "browser", blocking: true,
    run: (ctx) =>
      withVisitor(ctx, (kit) =>
        onPage(ctx, kit, "C-02", async (page) => {
          const rng = rngFor(ctx.runId, "C-02");
          const sitemap = await loadSitemap(ctx);
          const paths = [...pick(sitemap, "tag", 1, rng), ...pick(sitemap, "journey", 1, rng)];
          if (paths.length < 2) return fail(`sitemap lists ${paths.length} of the 2 wanted page types (tag, journey)`);
          const problems: string[] = [];
          for (const path of paths) {
            await kit.open(page, path);
            const found = await page.locator(RESOURCE_LINK).first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
            if (!found) problems.push(`${path} shows no resource link`);
          }
          return verdict(problems, `${paths.join(" and ")} answer 200 with resource links`, { paths });
        }),
      ),
  },
  {
    id: "C-03", tier: 1, kind: "browser", blocking: true,
    run: (ctx) =>
      withVisitor(ctx, async (kit) => {
        const targets = [{ path: "/", viewport: DESKTOP }, { path: "/subcategory/codecs", viewport: TABLET }];
        const measured: Record<string, number[]> = {};
        for (const { path, viewport } of targets) {
          const key = `${path}@${viewport.width}`;
          measured[key] = [];
          for (let i = 0; i < CLS_LOADS; i++) {
            const page = await kit.newPage();
            try {
              await page.setViewportSize(viewport);
              await page.addInitScript(() => {
                const w = window as unknown as { __cls: number };
                w.__cls = 0;
                new PerformanceObserver((list) => {
                  for (const e of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) if (!e.hadRecentInput) w.__cls += e.value;
                }).observe({ type: "layout-shift", buffered: true });
              });
              await kit.open(page, path);
              await page.waitForTimeout(CLS_WINDOW_MS);
              measured[key].push(Math.round((await page.evaluate(() => (window as unknown as { __cls: number }).__cls)) * 1000) / 1000);
            } finally {
              await page.close();
            }
          }
        }
        const over = Object.entries(measured).flatMap(([key, values]) => values.map((v, i) => ({ key, load: i + 1, v }))).filter((m) => m.v >= CLS_LIMIT);
        const summary = Object.entries(measured).map(([key, values]) => `${key} ${values.join("/")}`).join("; ");
        return verdict(over.map((m) => `${m.key} load ${m.load} CLS ${m.v} >= ${CLS_LIMIT}`), `CLS < ${CLS_LIMIT} on every load: ${summary}`, { measured });
      }),
  },
  {
    id: "C-04", tier: 1, kind: "browser", blocking: true,
    run: (ctx) =>
      withVisitor(ctx, (kit) =>
        onPage(ctx, kit, "C-04", async (page) => {
          await kit.open(page, "/");
          const banner = page.getByTestId("consent-banner");
          if (!(await banner.waitFor({ state: "visible", timeout: 15_000 }).then(() => true, () => false))) return fail("consent banner is not visible in a fresh context");
          const afterDecline: string[] = [];
          page.on("request", (req) => {
            const host = new URL(req.url()).host;
            if (ANALYTICS_HOST.test(host)) afterDecline.push(host);
          });
          await page.getByTestId("consent-decline").click();
          await page.waitForTimeout(DECLINE_WATCH_MS);
          const hosts = [...new Set(afterDecline)];
          return verdict(
            hosts.map((h) => `request to ${h} after Decline`),
            `0 analytics requests in ${DECLINE_WATCH_MS / 1000} s after Decline (navigator.webdriver suppresses the SDKs, so this proves Decline, not Accept)`,
            { hosts },
          );
        }),
      ),
  },
  {
    id: "C-05", tier: 1, kind: "browser", blocking: true,
    run: (ctx) =>
      withVisitor(
        ctx,
        (kit) =>
          onPage(ctx, kit, "C-05", async (page) => {
            const problems: string[] = [];
            const rects: Record<string, { left: number; right: number }> = {};
            for (const path of ["/sign-in", "/sign-up"]) {
              await kit.open(page, path);
              const card = page.locator(CLERK_CARD).first();
              if (!(await card.waitFor({ state: "visible", timeout: 15_000 }).then(() => true, () => false))) {
                problems.push(`${path}: no Clerk card rendered`);
                continue;
              }
              const { left, right } = await card.evaluate((el) => {
                const r = el.getBoundingClientRect();
                return { left: Math.round(r.left * 10) / 10, right: Math.round(r.right * 10) / 10 };
              });
              rects[path] = { left, right };
              if (left < 0 || right > MOBILE.width) problems.push(`${path}: Clerk card spans ${left}..${right}, viewport is 0..${MOBILE.width}`);
            }
            return verdict(problems, `Clerk card inside 0..${MOBILE.width} on /sign-in and /sign-up`, { rects });
          }),
        MOBILE,
      ),
  },
  {
    id: "C-07", tier: 1, kind: "browser", blocking: true,
    async run(ctx) {
      const cookies = loadMemberStateCookies();
      if (!cookies) return fail("audit member browser state is not readable");
      const kit = await ctx.browser!.newContext("auditMember", DESKTOP);
      try {
        await kit.context.addCookies(cookies);
        const posts: { path: string; ai: boolean; body: string }[] = [];
        const signedOut: string[] = [];
        const page = await kit.newPage();
        const host = new URL(ctx.base).host;
        // Registered after the context's own route, so it runs first: nothing but GETs and Clerk's own calls leaves this page.
        await page.route((url) => url.host === host && url.pathname.startsWith("/api/"), (route) => {
          const req = route.request();
          const { pathname } = new URL(req.url());
          if (req.method() === "GET" || req.method() === "HEAD" || pathname.startsWith("/api/__clerk/")) return route.fallback();
          const body = req.postData() ?? "";
          if (RECOMMENDATIONS_PATH.test(pathname)) posts.push({ path: `${req.method()} ${pathname}`, ai: carriesAiOptIn(body), body: redact(body).slice(0, 300) });
          return route.abort();
        });
        for (const path of ["/", "/profile"]) {
          await kit.open(page, path);
          await page.waitForTimeout(LOAD_POST_WATCH_MS);
          if (new URL(page.url()).pathname.startsWith("/sign-in")) signedOut.push(path);
        }
        await page.close();
        if (signedOut.length) return fail(`member session expired: refresh pp7b-member state (${signedOut.join(", ")} redirected to sign-in)`);
        const offending = posts.filter((p) => p.ai);
        const values = { recommendationPosts: posts.length, aiOptInPosts: posts.filter((p) => p.ai).length, posts: posts.map((p) => ({ request: p.path, useAI: p.ai, body: p.body })) };
        return offending.length
          ? fail(`${offending.length} POST /api/recommendations on page load (aborted before sending): ${offending.map((p) => p.path).join(", ")}`, values)
          : pass("0 POST /api/recommendations with an AI opt-in while loading / and /profile as the audit member", values);
      } finally {
        await kit.close();
      }
    },
  },
);

function carriesAiOptIn(body: string): boolean {
  try {
    return (JSON.parse(body) as Record<string, unknown>)[AI_OPT_IN_FIELD] === true;
  } catch {
    return false;
  }
}

import type { Page } from "playwright";
import { register, pass, fail, skip, verdict, type Ctx, type Result } from "../registry.ts";
import type { KitContext } from "../lib/browser.ts";
import { loadSitemap, pick, rngFor } from "../lib/sitemap.ts";

const RESOURCE_LINK = 'a[href^="/resource/"]';
const MOBILE = { width: 390, height: 844 };

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
);

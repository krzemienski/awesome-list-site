import type { Page } from "playwright";
import { register, pass, fail, verdict, type Ctx, type Result } from "../registry.ts";
import type { KitContext } from "../lib/browser.ts";
import { onPage, withVisitor } from "./tier1-browser.ts";

const ADMIN_TABS = ["overview", "approvals", "resources", "researcher", "database", "link-health"] as const;
const num = (s: string) => Number(s.replace(/,/g, ""));
const fmt = (n: number) => n.toLocaleString("en-US");

interface Stats {
  totalPublic: number;
  pendingApprovals: number;
  totalRejected: number;
}

async function withOwner<T>(ctx: Ctx, fn: (kit: KitContext) => Promise<T>): Promise<T> {
  ctx.http.ownerCookies();
  const kit = await ctx.browser!.newContext("owner");
  try {
    return await fn(kit);
  } finally {
    await kit.close();
  }
}

const stats = async (ctx: Ctx) => (await ctx.http.get("/api/admin/stats", { owner: true })).json<Stats>();
const bodyText = async (page: Page) => (await page.locator("body").innerText()).replace(/\s+/g, " ");

async function openTab(kit: KitContext, page: Page, tab: string, query = ""): Promise<string> {
  await kit.open(page, `/admin/${tab}${query}`);
  await page.getByText("Operations dashboard").waitFor({ timeout: 15_000 });
  await page.waitForTimeout(1_500);
  return bodyText(page);
}

/** Problems found on one admin tab, given its rendered text. */
async function tabProblems(ctx: Ctx, page: Page, tab: string, text: string, st: Stats): Promise<string[]> {
  const problems: string[] = [];
  if (await page.locator('[role="alert"]').count()) problems.push(`${tab}: error card shown`);
  const need = (cond: boolean, msg: string) => cond || problems.push(`${tab}: ${msg}`);
  if (tab === "overview") {
    need(text.includes(fmt(st.totalPublic)), `public total ${fmt(st.totalPublic)} not shown`);
    need(new RegExp(`PENDING APPROVALS ${st.pendingApprovals}\\b`, "i").test(text), `pending approvals ${st.pendingApprovals} not shown`);
    need((text.match(/TX#\d+/g) ?? []).length > 0, "activity feed has no events");
  } else if (tab === "approvals") {
    const rows = await page.getByRole("button", { name: /^Review details for/ }).count();
    need(rows === st.pendingApprovals, `${rows} rows, stats say ${st.pendingApprovals} pending`);
  } else if (tab === "resources") {
    need(text.includes(`of ${fmt(st.totalPublic)}`), `total "of ${fmt(st.totalPublic)}" not shown`);
  } else if (tab === "researcher") {
    need(await page.getByRole("button", { name: /Launch research run/ }).isVisible(), "run form not shown");
    need((await page.locator("tbody tr").count()) > 0, "no job rows");
  } else if (tab === "database") {
    need(text.includes('Key tables'), "key tables not shown");
    need((await page.locator("tbody tr").count()) > 0, "key tables empty");
  } else {
    problems.push(...(await linkHealthProblems(ctx, text)));
  }
  return problems;
}

async function linkHealthProblems(ctx: Ctx, text: string): Promise<string[]> {
  const cards = /Healthy ([\d,]+) Redirect ([\d,]+) Broken ([\d,]+) Timeout ([\d,]+) Suspect ([\d,]+)/.exec(text);
  if (!cards) return ["link-health: status cards not found"];
  const { job } = (await ctx.http.get("/api/admin/link-health/status", { owner: true })).json<{ job: { healthyLinks: number } }>();
  const { checks } = (await ctx.http.get("/api/admin/link-health/broken-links", { owner: true })).json<{ checks: { status: string }[] }>();
  const count = (...statuses: string[]) => checks.filter((c) => statuses.includes(c.status)).length;
  const problems: string[] = [];
  const expect = (label: string, shown: number, want: number) => shown === want || problems.push(`link-health: ${label} card ${shown}, API ${want}`);
  expect("Healthy", num(cards[1]), job.healthyLinks);
  expect("Broken", num(cards[3]), count("broken", "dns_failure"));
  expect("Suspect", num(cards[5]), count("suspect"));
  return problems;
}

async function resourceListTotal(page: Page): Promise<number | null> {
  const m = /Resources \((?:\d[\d,]*) of ([\d,]+)\)/.exec((await bodyText(page)));
  return m ? num(m[1]) : null;
}

async function resourcesTabProblems(ctx: Ctx, kit: KitContext, page: Page, st: Stats): Promise<string[]> {
  const problems: string[] = [];
  await openTab(kit, page, "resources");
  const sample = (await ctx.http.get("/api/public/resources?limit=1")).json<{ resources: { title: string }[] }>().resources[0].title;
  const search = page.getByRole("textbox", { name: /search/i }).or(page.getByPlaceholder("Search…")).first();
  await search.fill(sample);
  await page.getByRole("row").filter({ hasText: sample }).first().waitFor({ timeout: 10_000 }).catch(() => problems.push(`search for "${sample}" finds no row`));
  for (const [status, want] of [["pending", st.pendingApprovals], ["approved", st.totalPublic], ["rejected", st.totalRejected]] as const) {
    await openTab(kit, page, "resources", `?status=${status}`);
    const total = await resourceListTotal(page);
    if (total !== want) problems.push(`status=${status} shows ${total}, stats say ${want}`);
  }
  await openTab(kit, page, "resources");
  await page.locator('a[href*="page="]').filter({ hasText: /^Next$/ }).click();
  await page.waitForURL(/page=2/, { timeout: 10_000 }).catch(() => problems.push("Next did not move to page 2"));
  await openTab(kit, page, "resources", "?page=3");
  if (!/51\s*-\s*75|51–75/.test(await bodyText(page))) problems.push("reloading ?page=3 does not show rows 51-75");
  return problems;
}

async function dialogProblems(kit: KitContext, page: Page): Promise<string[]> {
  const problems: string[] = [];
  await openTab(kit, page, "approvals");
  await page.getByRole("button", { name: /^Review details for/ }).first().click();
  const review = page.getByRole("dialog");
  await review.waitFor({ timeout: 10_000 }).catch(() => problems.push("Review dialog did not open"));
  if (problems.length === 0 && !(await review.innerText()).includes('Resource Details')) problems.push("Review dialog is not populated");
  await page.keyboard.press("Escape");
  await openTab(kit, page, "resources");
  await page.getByRole("button", { name: /^Edit / }).first().click();
  const edit = page.getByRole("dialog");
  await edit.waitFor({ timeout: 10_000 }).catch(() => problems.push("Edit dialog did not open"));
  const fields = await edit.locator("input, textarea").evaluateAll((els) => els.filter((e) => (e as HTMLInputElement).value).length);
  if (fields < 2) problems.push(`Edit dialog has ${fields} populated fields`);
  await edit.getByRole("button", { name: "Cancel" }).click().catch(() => problems.push("Edit dialog has no Cancel button"));
  return problems;
}

register(
  {
    id: "NEW-1", tier: 1, kind: "browser", blocking: false, needs: ["owner"],
    run: (ctx) =>
      withOwner(ctx, (kit) =>
        onPage(ctx, kit, "NEW-1", async (page) => {
          const st = await stats(ctx);
          const problems: string[] = [];
          for (const tab of ADMIN_TABS) problems.push(...(await tabProblems(ctx, page, tab, await openTab(kit, page, tab), st)));
          return verdict(problems, `${ADMIN_TABS.length} admin tabs render and match their GETs`);
        }),
      ),
  },
  {
    id: "NEW-2", tier: 1, kind: "browser", blocking: false, needs: ["owner"],
    run: (ctx) => withOwner(ctx, (kit) => onPage(ctx, kit, "NEW-2", async (page) => {
      const problems = await resourcesTabProblems(ctx, kit, page, await stats(ctx));
      return verdict(problems, "Resources tab total, search, status filters, pager and deep links work");
    })),
  },
  {
    id: "NEW-3", tier: 1, kind: "browser", blocking: false, needs: ["owner"],
    run: (ctx) => withOwner(ctx, (kit) => onPage(ctx, kit, "NEW-3", async (page) => {
      const problems = await dialogProblems(kit, page);
      return verdict(problems, "Review and Edit dialogs open populated and close; nothing saved");
    })),
  },
  {
    id: "NEW-4", tier: 1, kind: "browser", blocking: false,
    run: (ctx) =>
      withVisitor(ctx, (kit) =>
        onPage(ctx, kit, "NEW-4", async (page): Promise<Result> => {
          const adminCalls: string[] = [];
          page.on("request", (r) => new URL(r.url()).pathname.startsWith("/api/admin") && adminCalls.push(r.url()));
          const problems: string[] = [];
          for (const path of ["/admin", "/admin/resources", "/admin/approvals"]) {
            await kit.open(page, path);
            await page.waitForURL(/\/sign-in\?redirect_url=/, { timeout: 10_000 }).catch(() => problems.push(`${path} did not redirect to sign-in`));
            if (await page.locator('[role="tab"]').count()) problems.push(`${path} shows admin tabs while signed out`);
          }
          if (adminCalls.length) problems.push(`${adminCalls.length} /api/admin requests while signed out`);
          return problems.length ? fail(problems.join("; ")) : pass("signed-out /admin redirects to sign-in with no admin data");
        }),
      ),
  },
);

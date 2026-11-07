/**
 * DOMAIN ROUTER: Member-feature usage, real vs test (#287)
 *
 *   GET /api/admin/usage   14 metrics x {w28, w90, all} x {real, test} as
 *                          {rows, users}, plus sign-ups by month
 *
 * One query per table (COUNT ... FILTER), run in parallel, memoised for 60 s.
 * A user is "test" when the name, the email domain or an email token matches
 * the heuristic below, or when the id is listed in env QA_CLEANUP_USER_IDS.
 * Only counts leave the server: never an email, a name or a user id.
 */
import type { Express, RequestHandler } from "express";
import { sql, type SQL } from "drizzle-orm";
import { db } from "../../db";
import { asyncHandler } from "../../middleware/asyncHandler";

interface AdminUsageContext {
  isAuthenticated: RequestHandler;
  isAdmin: RequestHandler;
}

const MEMO_TTL_MS = 60_000;
const SIGNUP_MONTHS = 24;

const TEST_NAME_RE = String.raw`^\s*\[(audit|qa)`;
const TEST_DOMAIN_RE =
  String.raw`^(mail\.tm|mailinator\.com|fldubai\.com|vqa.*|test\.com.*|example\.invalid)$|(^|\.)example\.(com|org|net)$`;
const TEST_LOCAL_PART_RE = String.raw`(^|[^a-z])(audit|qa)[-_.+0-9]`;

const WINDOWS = { w28: "28 days", w90: "90 days", all: null } as const;
type WindowKey = keyof typeof WINDOWS;
type Kind = "real" | "test";
interface Count { rows: number; users: number }
type MetricCounts = Record<WindowKey, Record<Kind, Count>>;

interface Metric {
  name: string;
  table: string;
  userColumn: string;
  /** Column the window applies to. */
  timeColumn: string;
  /** Extra row filter, e.g. only rows where the event happened. */
  where?: string;
}

const METRICS: Metric[] = [
  { name: "bookmarks", table: "user_bookmarks", userColumn: "user_id", timeColumn: "created_at" },
  { name: "favorites", table: "user_favorites", userColumn: "user_id", timeColumn: "created_at" },
  { name: "collections", table: "bookmark_collections", userColumn: "user_id", timeColumn: "created_at" },
  { name: "collection_items", table: "bookmark_collection_items", userColumn: "user_id", timeColumn: "created_at" },
  { name: "journey_enrolments", table: "user_journey_progress", userColumn: "user_id", timeColumn: "started_at" },
  { name: "journeys_completed", table: "user_journey_progress", userColumn: "user_id", timeColumn: "completed_at", where: "completed_at IS NOT NULL" },
  { name: "recommendation_feedback", table: "user_recommendation_feedback", userColumn: "user_id", timeColumn: "created_at" },
  { name: "submissions", table: "resources", userColumn: "submitted_by", timeColumn: "created_at" },
  { name: "edit_suggestions", table: "resource_edits", userColumn: "submitted_by", timeColumn: "created_at" },
  { name: "api_keys_created", table: "api_keys", userColumn: "user_id", timeColumn: "created_at" },
  { name: "api_keys_last_used", table: "api_keys", userColumn: "user_id", timeColumn: "last_used_at", where: "last_used_at IS NOT NULL" },
  { name: "digest_opt_ins", table: "notification_preferences", userColumn: "user_id", timeColumn: "email_opted_in_at", where: "email_opted_in_at IS NOT NULL" },
  { name: "notifications_read", table: "in_app_notifications", userColumn: "user_id", timeColumn: "read_at", where: "read_at IS NOT NULL" },
  { name: "interactions", table: "user_interactions", userColumn: "user_id", timeColumn: "timestamp" },
];

function allowedTestUserIds(): string[] {
  return (process.env.QA_CLEANUP_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

/** SQL boolean over the joined `users u` row; the single definition of "test". */
function testPredicate(): SQL {
  const ids = allowedTestUserIds();
  const idMatch = ids.length ? sql`u.id IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})` : sql`false`;
  return sql`(
    lower(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')) ~ ${TEST_NAME_RE}
    OR split_part(lower(coalesce(u.email, '')), '@', 2) ~ ${TEST_DOMAIN_RE}
    OR split_part(lower(coalesce(u.email, '')), '@', 1) ~ ${TEST_LOCAL_PART_RE}
    OR ${idMatch}
  )`;
}

const columnAlias = (w: WindowKey, kind: Kind, field: keyof Count): string => `${w}_${kind}_${field}`;

function windowCondition(metric: Metric, w: WindowKey): SQL {
  const interval = WINDOWS[w];
  const base = metric.where ? sql.raw(`(${metric.where})`) : sql`true`;
  if (!interval) return base;
  return sql`${base} AND t.${sql.raw(metric.timeColumn)} >= now() - ${interval}::interval`;
}

async function queryMetricTable(table: string, metrics: Metric[], test: SQL): Promise<Record<string, MetricCounts>> {
  const selects: SQL[] = [];
  for (const metric of metrics) {
    for (const w of Object.keys(WINDOWS) as WindowKey[]) {
      const cond = windowCondition(metric, w);
      for (const kind of ["real", "test"] as const) {
        const who = kind === "test" ? test : sql`NOT ${test}`;
        const filter = sql`FILTER (WHERE ${cond} AND ${who})`;
        selects.push(
          sql`(count(*) ${filter})::int AS ${sql.identifier(`${metric.name}__${columnAlias(w, kind, "rows")}`)}`,
          sql`(count(DISTINCT t.${sql.raw(metric.userColumn)}) ${filter})::int AS ${sql.identifier(`${metric.name}__${columnAlias(w, kind, "users")}`)}`,
        );
      }
    }
  }
  const result = await db.execute(sql`
    SELECT ${sql.join(selects, sql`, `)}
    FROM ${sql.identifier(table)} t
    JOIN users u ON u.id = t.${sql.raw(metrics[0].userColumn)}`);
  const row = (result.rows[0] ?? {}) as Record<string, number>;
  const out: Record<string, MetricCounts> = {};
  for (const metric of metrics) {
    const counts = {} as MetricCounts;
    for (const w of Object.keys(WINDOWS) as WindowKey[]) {
      counts[w] = {
        real: { rows: row[`${metric.name}__${columnAlias(w, "real", "rows")}`] ?? 0, users: row[`${metric.name}__${columnAlias(w, "real", "users")}`] ?? 0 },
        test: { rows: row[`${metric.name}__${columnAlias(w, "test", "rows")}`] ?? 0, users: row[`${metric.name}__${columnAlias(w, "test", "users")}`] ?? 0 },
      };
    }
    out[metric.name] = counts;
  }
  return out;
}

async function querySignups(test: SQL): Promise<{ month: string; real: number; test: number }[]> {
  const result = await db.execute(sql`
    SELECT to_char(date_trunc('month', u.created_at), 'YYYY-MM') AS month,
           (count(*) FILTER (WHERE NOT ${test}))::int AS real,
           (count(*) FILTER (WHERE ${test}))::int AS test
    FROM users u
    WHERE u.created_at >= date_trunc('month', now()) - ${`${SIGNUP_MONTHS - 1} months`}::interval
    GROUP BY 1 ORDER BY 1`);
  return result.rows as { month: string; real: number; test: number }[];
}

async function buildUsageReport() {
  const test = testPredicate();
  const byTable = new Map<string, Metric[]>();
  for (const metric of METRICS) byTable.set(metric.table, [...(byTable.get(metric.table) ?? []), metric]);

  const [signupsByMonth, ...tables] = await Promise.all([
    querySignups(test),
    ...[...byTable].map(([table, metrics]) => queryMetricTable(table, metrics, test)),
  ]);
  return {
    generatedAt: new Date().toISOString(),
    testDefinition: "heuristic",
    metrics: Object.assign({}, ...tables) as Record<string, MetricCounts>,
    signupsByMonth,
    notes: "Accounts that were deleted take their history with them (foreign keys cascade), so all-time counts are a floor.",
  };
}

let memo: { at: number; report: Promise<Awaited<ReturnType<typeof buildUsageReport>>> } | null = null;

function usageReport() {
  if (memo && Date.now() - memo.at < MEMO_TTL_MS) return memo.report;
  const report = buildUsageReport();
  const entry = { at: Date.now(), report };
  memo = entry;
  report.catch(() => { if (memo === entry) memo = null; });
  return report;
}

export function registerAdminUsageRoutes(app: Express, ctx: AdminUsageContext): void {
  app.get("/api/admin/usage", ctx.isAuthenticated, ctx.isAdmin, asyncHandler(async (_req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    res.json(await usageReport());
  }));
}

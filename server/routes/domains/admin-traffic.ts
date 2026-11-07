/**
 * DOMAIN ROUTER: First-party page-document traffic (W1)
 *
 *   GET /api/admin/traffic?days=28   totals per template x class, plus a
 *                                    per-day series, from `traffic_hourly`
 *
 * Counts only. Includes the current unflushed hour's rows once the 5-minute
 * flush has run. Days are UTC.
 */
import type { Express, RequestHandler } from "express";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db";
import { asyncHandler } from "../../middleware/asyncHandler";
import { TRAFFIC_RETENTION_DAYS } from "../../ops/trafficFlush";

interface AdminTrafficContext {
  isAuthenticated: RequestHandler;
  isAdmin: RequestHandler;
}

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(TRAFFIC_RETENTION_DAYS).default(28),
});

export function registerAdminTrafficRoutes(app: Express, ctx: AdminTrafficContext): void {
  app.get("/api/admin/traffic", ctx.isAuthenticated, ctx.isAdmin, asyncHandler(async (req, res) => {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ message: `days must be an integer from 1 to ${TRAFFIC_RETENTION_DAYS}` });
      return;
    }
    const { days } = parsed.data;
    const since = sql`now() - ${`${days} days`}::interval`;
    const [totals, series] = await Promise.all([
      db.execute(sql`
        SELECT template, class, status_class AS "statusClass", sum(count)::int AS count
        FROM traffic_hourly WHERE hour >= ${since}
        GROUP BY template, class, status_class ORDER BY template, class, status_class`),
      db.execute(sql`
        SELECT to_char(date_trunc('day', hour AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
               class, sum(count)::int AS count
        FROM traffic_hourly WHERE hour >= ${since}
        GROUP BY 1, class ORDER BY 1, class`),
    ]);
    res.setHeader("Cache-Control", "private, no-store");
    res.json({ days, totals: totals.rows, series: series.rows });
  }));
}

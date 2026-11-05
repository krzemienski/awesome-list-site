/**
 * Link-health remediation and schedule.
 *
 *   GET  /api/link-health/summary                     public: last scan time and counts
 *   GET  /api/admin/link-health/remediation           admin: schedule, mode, current plan
 *   POST /api/admin/link-health/remediation/apply     admin: apply the current plan
 *   POST /api/admin/link-health/resources/:id/ignore  admin: { ignored } skip or resume one link
 */
import type { Express, RequestHandler } from "express";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { linkHealthJobs } from "@shared/schema";
import { db } from "../../db";
import { asyncHandler } from "../../middleware/asyncHandler";
import { linkHealthIntervalHours } from "../../jobs/linkHealthScheduler";
import {
  applyRemediationPlan,
  buildRemediationPlan,
  remediationMode,
  setLinkHealthIgnored,
} from "../../services/linkRemediation";

interface LinkRemediationContext {
  isAuthenticated: RequestHandler;
  isAdmin: RequestHandler;
}

async function scheduleSnapshot() {
  const [latest] = await db.select().from(linkHealthJobs).orderBy(desc(linkHealthJobs.id)).limit(1);
  const [lastCompleted] = await db
    .select()
    .from(linkHealthJobs)
    .where(eq(linkHealthJobs.status, "completed"))
    .orderBy(desc(linkHealthJobs.id))
    .limit(1);
  const intervalHours = linkHealthIntervalHours();
  const nextDueAt = intervalHours && latest
    ? new Date(latest.createdAt.getTime() + intervalHours * 3600_000).toISOString()
    : null;
  return {
    intervalHours,
    mode: remediationMode(),
    nextDueAt,
    latestJob: latest ? { id: latest.id, status: latest.status, createdAt: latest.createdAt.toISOString() } : null,
    lastCompleted: lastCompleted
      ? {
          id: lastCompleted.id,
          completedAt: lastCompleted.completedAt?.toISOString() ?? null,
          checked: lastCompleted.checkedLinks,
          healthy: lastCompleted.healthyLinks,
          broken: lastCompleted.brokenLinks,
          suspect: lastCompleted.suspectLinks,
        }
      : null,
  };
}

const ignoreBody = z.object({ ignored: z.boolean() });

export function registerLinkRemediationRoutes(app: Express, { isAuthenticated, isAdmin }: LinkRemediationContext): void {
  app.get("/api/link-health/summary", asyncHandler(async (_req, res) => {
    res.set("Cache-Control", "no-store");
    res.json(await scheduleSnapshot());
  }));

  app.get("/api/admin/link-health/remediation", isAuthenticated, isAdmin, asyncHandler(async (_req, res) => {
    const [schedule, plan] = await Promise.all([scheduleSnapshot(), buildRemediationPlan()]);
    const counts: Record<string, number> = {};
    for (const a of plan.actions) counts[a.kind] = (counts[a.kind] ?? 0) + 1;
    res.set("Cache-Control", "no-store");
    res.json({ ...schedule, plan: { jobId: plan.jobId, counts, actions: plan.actions } });
  }));

  app.post("/api/admin/link-health/remediation/apply", isAuthenticated, isAdmin, asyncHandler(async (req, res) => {
    const result = await applyRemediationPlan(req.dbUser?.id);
    res.json(result);
  }));

  app.post("/api/admin/link-health/resources/:id/ignore", isAuthenticated, isAdmin, asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const body = ignoreBody.safeParse(req.body);
    if (!Number.isInteger(id) || id <= 0 || !body.success) {
      return res.status(400).json({ message: "Expected a resource id and { ignored: boolean }" });
    }
    try {
      await setLinkHealthIgnored(id, body.data.ignored, req.dbUser?.id);
    } catch (err) {
      if (err instanceof Error && err.message === "Resource not found") return res.status(404).json({ message: "Resource not found" });
      throw err;
    }
    res.json({ id, ignored: body.data.ignored });
  }));
}

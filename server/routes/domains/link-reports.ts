/**
 * DOMAIN ROUTER: Member dead-link reports
 *
 *   GET   /api/resources/:id/link-report    the signed-in member's report, or null
 *   POST  /api/resources/:id/link-report    report the resource's link as dead
 *   GET   /api/admin/link-reports           admin triage list (?status=open|resolved|dismissed)
 *   PATCH /api/admin/link-reports/:resourceId/:reporter   resolve or dismiss
 *         (`reporter` is the member's varchar user id; a name ending in "Id"
 *         would get the integer-id param validator)
 *
 * One row per member and resource. Re-reporting an open report is a no-op
 * that says so; re-reporting a handled one reopens it with the new note.
 */
import type { Express, RequestHandler } from "express";
import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  LINK_REPORT_NOTE_MAX,
  LINK_REPORT_STATUSES,
  resourceLinkReports,
  resources,
  users,
} from "@shared/schema";
import { asyncHandler } from "../../middleware/asyncHandler";

interface LinkReportsContext {
  isAuthenticated: RequestHandler;
  isAdmin: RequestHandler;
}

const reportBodySchema = z.object({
  note: z.string().trim().max(LINK_REPORT_NOTE_MAX).optional(),
}).strict();

const handleBodySchema = z.object({
  status: z.enum(["resolved", "dismissed"]),
}).strict();

function parseResourceId(raw: unknown): number | null {
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0 && String(value) === String(raw) ? value : null;
}

const reportFields = {
  status: resourceLinkReports.status,
  note: resourceLinkReports.note,
  createdAt: resourceLinkReports.createdAt,
  handledAt: resourceLinkReports.handledAt,
};

export function registerLinkReportRoutes(app: Express, ctx: LinkReportsContext): void {
  const { isAuthenticated, isAdmin } = ctx;

  app.get("/api/resources/:id/link-report", isAuthenticated, asyncHandler(async (req: any, res) => {
    const resourceId = parseResourceId(req.params.id);
    if (resourceId === null) return res.status(404).json({ message: "Resource not found" });
    const [report] = await db
      .select(reportFields)
      .from(resourceLinkReports)
      .where(and(eq(resourceLinkReports.resourceId, resourceId), eq(resourceLinkReports.userId, req.dbUser.id)));
    res.json({ report: report ?? null });
  }));

  app.post("/api/resources/:id/link-report", isAuthenticated, asyncHandler(async (req: any, res) => {
    const resourceId = parseResourceId(req.params.id);
    if (resourceId === null) return res.status(404).json({ message: "Resource not found" });
    const parsed = reportBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ message: `Note must be ${LINK_REPORT_NOTE_MAX} characters or less` });
    }
    const [resource] = await db
      .select({ id: resources.id, status: resources.status })
      .from(resources)
      .where(eq(resources.id, resourceId));
    if (!resource || resource.status !== "approved") {
      return res.status(404).json({ message: "Resource not found" });
    }
    const note = parsed.data.note ? parsed.data.note : null;
    const userId: string = req.dbUser.id;

    const [existing] = await db
      .select({ status: resourceLinkReports.status })
      .from(resourceLinkReports)
      .where(and(eq(resourceLinkReports.resourceId, resourceId), eq(resourceLinkReports.userId, userId)));
    if (existing?.status === "open") {
      const [report] = await db.select(reportFields).from(resourceLinkReports)
        .where(and(eq(resourceLinkReports.resourceId, resourceId), eq(resourceLinkReports.userId, userId)));
      return res.json({ alreadyReported: true, report });
    }

    const [report] = await db
      .insert(resourceLinkReports)
      .values({ resourceId, userId, note })
      .onConflictDoUpdate({
        target: [resourceLinkReports.resourceId, resourceLinkReports.userId],
        set: { status: "open", note, handledBy: null, handledAt: null, createdAt: sql`now()` },
      })
      .returning(reportFields);
    res.status(existing ? 200 : 201).json({ alreadyReported: false, report });
  }));

  app.get("/api/admin/link-reports", isAuthenticated, isAdmin, asyncHandler(async (req, res) => {
    const requested = typeof req.query.status === "string" ? req.query.status : "open";
    if (!(LINK_REPORT_STATUSES as readonly string[]).includes(requested)) {
      return res.status(400).json({ message: `status must be one of ${LINK_REPORT_STATUSES.join(", ")}` });
    }
    const status = requested as (typeof LINK_REPORT_STATUSES)[number];
    const rows = await db
      .select({
        resourceId: resourceLinkReports.resourceId,
        userId: resourceLinkReports.userId,
        status: resourceLinkReports.status,
        note: resourceLinkReports.note,
        createdAt: resourceLinkReports.createdAt,
        handledAt: resourceLinkReports.handledAt,
        resourceTitle: resources.title,
        resourceUrl: resources.url,
        reporterEmail: users.email,
        reporterFirstName: users.firstName,
        reporterLastName: users.lastName,
      })
      .from(resourceLinkReports)
      .innerJoin(resources, eq(resources.id, resourceLinkReports.resourceId))
      .innerJoin(users, eq(users.id, resourceLinkReports.userId))
      .where(eq(resourceLinkReports.status, status))
      .orderBy(desc(resourceLinkReports.createdAt))
      .limit(200);
    const [{ open }] = await db
      .select({ open: sql<number>`count(*)::int` })
      .from(resourceLinkReports)
      .where(eq(resourceLinkReports.status, "open"));
    res.json({ reports: rows, openCount: open });
  }));

  app.patch("/api/admin/link-reports/:resourceId/:reporter", isAuthenticated, isAdmin, asyncHandler(async (req: any, res) => {
    const resourceId = parseResourceId(req.params.resourceId);
    const userId = String(req.params.reporter ?? "");
    const parsed = handleBodySchema.safeParse(req.body ?? {});
    if (resourceId === null || !userId) return res.status(404).json({ message: "Report not found" });
    if (!parsed.success) return res.status(400).json({ message: "status must be resolved or dismissed" });
    const [report] = await db
      .update(resourceLinkReports)
      .set({ status: parsed.data.status, handledBy: req.dbUser.id, handledAt: sql`now()` })
      .where(and(eq(resourceLinkReports.resourceId, resourceId), eq(resourceLinkReports.userId, userId)))
      .returning(reportFields);
    if (!report) return res.status(404).json({ message: "Report not found" });
    res.json({ report });
  }));
}

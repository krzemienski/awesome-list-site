import crypto from "crypto";
import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNull,
  sql,
} from "drizzle-orm";
import {
  digestAttempts,
  digestJobs,
  digestUnsubscribeTokens,
  inAppNotifications,
  journeySteps,
  learningJourneys,
  notificationPreferences,
  resources,
  userJourneyProgress,
  userPreferences,
  users,
  type DigestJob,
  type NotificationPreferences,
} from "@shared/schema";
import type {
  DigestCadence,
  DigestChannel,
  DigestPreview,
  DigestPreviewItem,
  DigestPreviewSection,
  NotificationPreferencesResponse,
  NotificationPreferencesUpdate,
} from "@shared/notifications";
import { summarizeLogicalJourneySteps } from "@shared/journeyProgress";
import { db } from "../db";
import {
  probeEmailTransport,
  sendTransactionalEmail,
} from "../email";

const MAX_SELECTOR_ITEMS = 3;
const JOB_LEASE_MINUTES = 15;
const COMPLETED_RETENTION_DAYS = 90;
const NOTIFICATION_RETENTION_DAYS = 180;
const UNSUBSCRIBE_RETENTION_DAYS = 400;
const ENQUEUE_PAGE_SIZE = 250;

type RowResult<T> = { rows?: T[] };

function rowsOf<T>(result: unknown): T[] {
  return ((result as RowResult<T>)?.rows ?? []) as T[];
}

function defaultPreferences(userId: string): NotificationPreferences {
  const now = new Date();
  return {
    userId,
    emailDigestEnabled: false,
    inAppEnabled: false,
    includeNewResources: true,
    includeWatchNext: true,
    includeJourneyStep: true,
    cadence: "weekly",
    timezone: "UTC",
    policyVersion: 1,
    pausedUntil: null,
    emailOptedInAt: null,
    emailUnsubscribedAt: null,
    inAppOptedInAt: null,
    lastEmailDigestAt: null,
    lastInAppDigestAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

function preferenceResponse(
  preferences: NotificationPreferences,
): NotificationPreferencesResponse {
  return {
    emailDigestEnabled: preferences.emailDigestEnabled,
    inAppEnabled: preferences.inAppEnabled,
    includeNewResources: preferences.includeNewResources,
    includeWatchNext: preferences.includeWatchNext,
    includeJourneyStep: preferences.includeJourneyStep,
    cadence: preferences.cadence,
    timezone: preferences.timezone,
    pausedUntil: preferences.pausedUntil?.toISOString() ?? null,
    emailOptedInAt: preferences.emailOptedInAt?.toISOString() ?? null,
    emailUnsubscribedAt:
      preferences.emailUnsubscribedAt?.toISOString() ?? null,
    inAppOptedInAt: preferences.inAppOptedInAt?.toISOString() ?? null,
    updatedAt: preferences.updatedAt.toISOString(),
  };
}

export function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

function cadenceDays(cadence: DigestCadence): number {
  if (cadence === "biweekly") return 14;
  if (cadence === "monthly") return 31;
  return 7;
}

function zonedCalendarParts(
  at: Date,
  timeZone: string,
): { year: number; month: number; day: number } {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(at);
  } catch {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(at);
  }
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: read("year"), month: read("month"), day: read("day") };
}

function periodKey(
  cadence: DigestCadence,
  timeZone: string,
  at: Date,
): string {
  const { year, month, day } = zonedCalendarParts(at, timeZone);
  if (cadence === "monthly") {
    return `${year}-${String(month).padStart(2, "0")}`;
  }
  const dayNumber = Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
  const size = cadence === "biweekly" ? 14 : 7;
  return `${year}-p${Math.floor(dayNumber / size)}`;
}

function isDue(lastAt: Date | null, cadence: DigestCadence, now: Date): boolean {
  if (!lastAt) return true;
  return now.getTime() - lastAt.getTime() >= cadenceDays(cadence) * 86_400_000;
}

export async function getNotificationPreferences(
  userId: string,
): Promise<NotificationPreferencesResponse> {
  const [preferences] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);
  return preferenceResponse(preferences ?? defaultPreferences(userId));
}

export async function updateNotificationPreferences(
  userId: string,
  values: NotificationPreferencesUpdate,
): Promise<NotificationPreferencesResponse> {
  if (!isValidTimeZone(values.timezone)) {
    throw new Error("invalid_timezone");
  }
  const now = new Date();
  const pausedUntil = values.pausedUntil
    ? new Date(values.pausedUntil)
    : null;
  if (
    pausedUntil &&
    pausedUntil.getTime() > now.getTime() + 366 * 86_400_000
  ) {
    throw new Error("pause_too_long");
  }

  const [account, existing] = await Promise.all([
    db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .then((result) => result[0]),
    db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1)
      .then((result) => result[0]),
  ]);
  if (values.emailDigestEnabled && !account?.email) {
    throw new Error("email_required");
  }

  const emailJustEnabled =
    values.emailDigestEnabled && !existing?.emailDigestEnabled;
  const emailJustDisabled =
    !values.emailDigestEnabled && Boolean(existing?.emailDigestEnabled);
  const inAppJustEnabled = values.inAppEnabled && !existing?.inAppEnabled;
  const policyChanged =
    !existing ||
    existing.emailDigestEnabled !== values.emailDigestEnabled ||
    existing.inAppEnabled !== values.inAppEnabled ||
    existing.includeNewResources !== values.includeNewResources ||
    existing.includeWatchNext !== values.includeWatchNext ||
    existing.includeJourneyStep !== values.includeJourneyStep ||
    existing.cadence !== values.cadence ||
    existing.timezone !== values.timezone ||
    (existing.pausedUntil?.getTime() ?? null) !==
      (pausedUntil?.getTime() ?? null);

  const saved = await db.transaction(async (transaction) => {
    const [row] = await transaction
      .insert(notificationPreferences)
      .values({
        userId,
        ...values,
        pausedUntil,
        policyVersion: existing?.policyVersion ?? 1,
        emailOptedInAt: emailJustEnabled
          ? now
          : existing?.emailOptedInAt ?? null,
        emailUnsubscribedAt: emailJustDisabled
          ? now
          : values.emailDigestEnabled
            ? null
            : existing?.emailUnsubscribedAt ?? null,
        inAppOptedInAt: inAppJustEnabled
          ? now
          : existing?.inAppOptedInAt ?? null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: notificationPreferences.userId,
        set: {
          ...values,
          pausedUntil,
          policyVersion: policyChanged
            ? sql`${notificationPreferences.policyVersion} + 1`
            : sql`${notificationPreferences.policyVersion}`,
          emailOptedInAt: emailJustEnabled
            ? now
            : existing?.emailOptedInAt ?? null,
          emailUnsubscribedAt: emailJustDisabled
            ? now
            : values.emailDigestEnabled
              ? null
              : existing?.emailUnsubscribedAt ?? null,
          inAppOptedInAt: inAppJustEnabled
            ? now
            : existing?.inAppOptedInAt ?? null,
          updatedAt: now,
        },
      })
      .returning();

    if (policyChanged) {
      await transaction
        .update(digestJobs)
        .set({
          status: "skipped",
          completedAt: now,
          lastErrorCode: "preference_changed",
          updatedAt: now,
        })
        .where(
          and(
            eq(digestJobs.userId, userId),
            eq(digestJobs.status, "queued"),
          ),
        );
    }
    return row;
  });

  return preferenceResponse(saved);
}

async function selectNewResources(
  userId: string,
  preferences: NotificationPreferences,
  now: Date,
): Promise<DigestPreviewItem[]> {
  const [learningPreferences] = await db
    .select({ categories: userPreferences.preferredCategories })
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);
  const categories = (learningPreferences?.categories ?? []).filter(Boolean);
  if (categories.length === 0) return [];

  const cutoff = new Date(
    now.getTime() - cadenceDays(preferences.cadence) * 86_400_000,
  );
  const matches = await db
    .select({
      id: resources.id,
      title: resources.title,
      category: resources.category,
    })
    .from(resources)
    .where(
      and(
        eq(resources.status, "approved"),
        gte(resources.createdAt, cutoff),
        inArray(resources.category, categories),
      ),
    )
    .orderBy(desc(resources.createdAt), asc(resources.id))
    .limit(MAX_SELECTOR_ITEMS);
  return matches.map((resource) => ({
    kind: "new_resource",
    title: resource.title,
    description: `New in ${resource.category}`,
    href: `/resource/${resource.id}`,
    resourceId: resource.id,
  }));
}

async function selectWatchNext(userId: string): Promise<DigestPreviewItem[]> {
  const result = await db.execute(sql`
    SELECT
      r.id AS resource_id,
      r.title,
      chosen.collection_id,
      chosen.collection_name
    FROM user_bookmarks ub
    JOIN resources r
      ON r.id = ub.resource_id AND r.status = 'approved'
    LEFT JOIN LATERAL (
      SELECT bc.id AS collection_id, bc.name AS collection_name
      FROM bookmark_collection_items bci
      JOIN bookmark_collections bc
        ON bc.id = bci.collection_id
       AND bc.user_id = bci.user_id
       AND bc.archived_at IS NULL
      WHERE bci.user_id = ub.user_id
        AND bci.resource_id = ub.resource_id
      ORDER BY bc.position, bci.position, bc.id
      LIMIT 1
    ) chosen ON true
    WHERE ub.user_id = ${userId}
      AND ub.queue_status = 'watch-next'
      AND ub.archived_at IS NULL
    ORDER BY ub.created_at DESC, r.id
    LIMIT ${MAX_SELECTOR_ITEMS}
  `);
  return rowsOf<{
    resource_id: number;
    title: string;
    collection_id: number | null;
    collection_name: string | null;
  }>(result).map((row) => ({
    kind: "watch_next",
    title: row.title,
    description: row.collection_name
      ? `Watch next in ${row.collection_name}`
      : "Saved to Watch next",
    href: `/bookmarks/#bookmark-${row.resource_id}`,
    resourceId: Number(row.resource_id),
    ...(row.collection_id
      ? { collectionId: Number(row.collection_id) }
      : {}),
  }));
}

async function selectNextJourneyStep(
  userId: string,
): Promise<DigestPreviewItem[]> {
  const [active] = await db
    .select({
      progress: userJourneyProgress,
      journey: learningJourneys,
    })
    .from(userJourneyProgress)
    .innerJoin(
      learningJourneys,
      eq(userJourneyProgress.journeyId, learningJourneys.id),
    )
    .where(
      and(
        eq(userJourneyProgress.userId, userId),
        isNull(userJourneyProgress.completedAt),
        eq(learningJourneys.status, "published"),
      ),
    )
    .orderBy(
      desc(userJourneyProgress.lastAccessedAt),
      asc(userJourneyProgress.id),
    )
    .limit(1);
  if (!active) return [];

  const steps = await db
    .select()
    .from(journeySteps)
    .where(eq(journeySteps.journeyId, active.journey.id))
    .orderBy(asc(journeySteps.stepNumber), asc(journeySteps.id));
  const summary = summarizeLogicalJourneySteps(
    steps,
    new Set((active.progress.completedSteps ?? []).map(Number)),
  );
  if (!summary.nextStep) return [];
  return [
    {
      kind: "journey_step",
      title: summary.nextStep.title,
      description: `Next in ${active.journey.title}`,
      href: `/journey/${active.journey.id}#step-${summary.nextStep.stepNumber}`,
      journeyId: active.journey.id,
      stepNumber: summary.nextStep.stepNumber,
    },
  ];
}

export async function selectDigestContent(
  userId: string,
  now = new Date(),
): Promise<DigestPreview> {
  const [stored] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);
  const preferences = stored ?? defaultPreferences(userId);
  const selections = await Promise.all([
    preferences.includeNewResources
      ? selectNewResources(userId, preferences, now)
      : Promise.resolve([]),
    preferences.includeWatchNext
      ? selectWatchNext(userId)
      : Promise.resolve([]),
    preferences.includeJourneyStep
      ? selectNextJourneyStep(userId)
      : Promise.resolve([]),
  ]);
  const candidates: DigestPreviewSection[] = [
    { key: "new_resources", title: "New for you", items: selections[0] },
    { key: "watch_next", title: "Watch next", items: selections[1] },
    {
      key: "journey_step",
      title: "Continue your journey",
      items: selections[2],
    },
  ];
  const sections = candidates.filter((section) => section.items.length > 0);
  return {
    generatedAt: now.toISOString(),
    cadence: preferences.cadence,
    timezone: preferences.timezone,
    sections,
    itemCount: sections.reduce(
      (total, section) => total + section.items.length,
      0,
    ),
  };
}

export async function enqueueDueDigestJobs(now = new Date()): Promise<number> {
  let queued = 0;
  let afterUserId = "";
  while (true) {
    const candidates = await db
      .select({
        preferences: notificationPreferences,
        email: users.email,
      })
      .from(notificationPreferences)
      .innerJoin(users, eq(notificationPreferences.userId, users.id))
      .where(
        and(
          sql`${notificationPreferences.emailDigestEnabled} = true OR ${notificationPreferences.inAppEnabled} = true`,
          gt(notificationPreferences.userId, afterUserId),
        ),
      )
      .orderBy(asc(notificationPreferences.userId))
      .limit(ENQUEUE_PAGE_SIZE);
    if (candidates.length === 0) break;

    for (const { preferences, email } of candidates) {
      if (preferences.pausedUntil && preferences.pausedUntil > now) continue;
      const channels: Array<{
        channel: DigestChannel;
        enabled: boolean;
        lastAt: Date | null;
      }> = [
        {
          channel: "email",
          enabled: preferences.emailDigestEnabled && Boolean(email),
          lastAt: preferences.lastEmailDigestAt,
        },
        {
          channel: "in_app",
          enabled: preferences.inAppEnabled,
          lastAt: preferences.lastInAppDigestAt,
        },
      ];
      for (const candidate of channels) {
        if (
          !candidate.enabled ||
          !isDue(candidate.lastAt, preferences.cadence, now)
        ) {
          continue;
        }
        const period = periodKey(
          preferences.cadence,
          preferences.timezone,
          now,
        );
        const idempotencyKey = [
          preferences.userId,
          candidate.channel,
          `v${preferences.policyVersion}`,
          preferences.cadence,
          period,
        ].join(":");
        const inserted = await db
          .insert(digestJobs)
          .values({
            userId: preferences.userId,
            channel: candidate.channel,
            periodKey: period,
            policyVersion: preferences.policyVersion,
            idempotencyKey,
            status: "queued",
            scheduledFor: now,
            nextAttemptAt: now,
          })
          .onConflictDoNothing()
          .returning({ id: digestJobs.id });
        queued += inserted.length;
      }
    }
    afterUserId = candidates[candidates.length - 1].preferences.userId;
    if (candidates.length < ENQUEUE_PAGE_SIZE) break;
  }
  return queued;
}

async function claimNextJob(workerId: string): Promise<DigestJob | null> {
  const result = await db.execute(sql`
    WITH candidate AS (
      SELECT id
      FROM digest_jobs
      WHERE status = 'queued'
        AND next_attempt_at <= now()
        AND scheduled_for <= now()
      ORDER BY next_attempt_at, scheduled_for, id
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE digest_jobs job
    SET
      status = 'processing',
      claimed_at = now(),
      lease_expires_at = now() + interval '${sql.raw(
        String(JOB_LEASE_MINUTES),
      )} minutes',
      worker_id = ${workerId},
      attempt_count = job.attempt_count + 1,
      updated_at = now()
    FROM candidate
    WHERE job.id = candidate.id
    RETURNING job.*
  `);
  const row = rowsOf<Record<string, unknown>>(result)[0];
  if (!row) return null;
  const job = await db
    .select()
    .from(digestJobs)
    .where(eq(digestJobs.id, Number(row.id)))
    .limit(1);
  return job[0] ?? null;
}

async function startAttempt(job: DigestJob): Promise<void> {
  await db
    .insert(digestAttempts)
    .values({
      jobId: job.id,
      attemptNumber: job.attemptCount,
      outcome: "started",
    })
    .onConflictDoNothing();
}

async function completeAttempt(
  job: DigestJob,
  outcome: "sent" | "skipped",
  options: { errorCode?: string; providerMessageId?: string } = {},
): Promise<boolean> {
  const workerId = job.workerId;
  if (!workerId) return false;
  const now = new Date();
  return db.transaction(async (transaction) => {
    const owned = await transaction
      .update(digestJobs)
      .set({
        status: outcome === "sent" ? "sent" : "skipped",
        sentAt: outcome === "sent" ? now : null,
        completedAt: now,
        leaseExpiresAt: null,
        workerId: null,
        lastErrorCode: options.errorCode ?? null,
        updatedAt: now,
      })
      .where(
        and(
          eq(digestJobs.id, job.id),
          eq(digestJobs.status, "processing"),
          eq(digestJobs.workerId, workerId),
          sql`${digestJobs.leaseExpiresAt} > now()`,
        ),
      )
      .returning({ id: digestJobs.id });
    if (owned.length === 0) return false;

    await transaction
      .update(digestAttempts)
      .set({
        outcome,
        errorCode: options.errorCode,
        providerMessageId: options.providerMessageId,
        completedAt: now,
      })
      .where(
        and(
          eq(digestAttempts.jobId, job.id),
          eq(digestAttempts.attemptNumber, job.attemptCount),
          eq(digestAttempts.outcome, "started"),
        ),
      );
    if (outcome === "sent" || options.errorCode === "no_content") {
      await transaction
        .update(notificationPreferences)
        .set(
          job.channel === "email"
            ? { lastEmailDigestAt: now, updatedAt: now }
            : { lastInAppDigestAt: now, updatedAt: now },
        )
        .where(eq(notificationPreferences.userId, job.userId));
    }
    return true;
  });
}

async function failAttempt(job: DigestJob, errorCode: string): Promise<boolean> {
  const workerId = job.workerId;
  if (!workerId) return false;
  const now = new Date();
  const exhausted = job.attemptCount >= job.maxAttempts;
  const delayMinutes = Math.min(24 * 60, 15 * 2 ** (job.attemptCount - 1));
  const nextAttemptAt = new Date(now.getTime() + delayMinutes * 60_000);
  return db.transaction(async (transaction) => {
    const owned = await transaction
      .update(digestJobs)
      .set({
        status: exhausted ? "failed" : "queued",
        nextAttemptAt,
        completedAt: exhausted ? now : null,
        leaseExpiresAt: null,
        workerId: null,
        lastErrorCode: errorCode,
        updatedAt: now,
      })
      .where(
        and(
          eq(digestJobs.id, job.id),
          eq(digestJobs.status, "processing"),
          eq(digestJobs.workerId, workerId),
          sql`${digestJobs.leaseExpiresAt} > now()`,
        ),
      )
      .returning({ id: digestJobs.id });
    if (owned.length === 0) return false;

    await transaction
      .update(digestAttempts)
      .set({ outcome: "failed", errorCode, completedAt: now })
      .where(
        and(
          eq(digestAttempts.jobId, job.id),
          eq(digestAttempts.attemptNumber, job.attemptCount),
          eq(digestAttempts.outcome, "started"),
        ),
      );
    return true;
  });
}

async function markDeliveryUnknownAttempt(
  job: DigestJob,
  errorCode: string,
): Promise<boolean> {
  const workerId = job.workerId;
  if (!workerId) return false;
  const now = new Date();
  return db.transaction(async (transaction) => {
    const owned = await transaction
      .update(digestJobs)
      .set({
        status: "failed",
        completedAt: now,
        leaseExpiresAt: null,
        workerId: null,
        lastErrorCode: errorCode,
        updatedAt: now,
      })
      .where(
        and(
          eq(digestJobs.id, job.id),
          eq(digestJobs.status, "processing"),
          eq(digestJobs.workerId, workerId),
          sql`${digestJobs.leaseExpiresAt} > now()`,
        ),
      )
      .returning({ id: digestJobs.id });
    if (owned.length === 0) return false;

    await transaction
      .update(digestAttempts)
      .set({
        outcome: "delivery_unknown",
        errorCode,
        completedAt: now,
      })
      .where(
        and(
          eq(digestAttempts.jobId, job.id),
          eq(digestAttempts.attemptNumber, job.attemptCount),
          eq(digestAttempts.outcome, "started"),
        ),
      );
    await transaction
      .update(notificationPreferences)
      .set(
        job.channel === "email"
          ? { lastEmailDigestAt: now, updatedAt: now }
          : { lastInAppDigestAt: now, updatedAt: now },
      )
      .where(eq(notificationPreferences.userId, job.userId));
    return true;
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function siteUrl(path: string): string {
  let base = process.env.PUBLIC_SITE_URL || "https://awesome.video";
  try {
    base = new URL(base).origin;
  } catch {
    base = "https://awesome.video";
  }
  return `${base}${path}`;
}

function buildDigestEmail(
  preview: DigestPreview,
  unsubscribeUrl: string,
): { subject: string; text: string; html: string } {
  const subject = "Your Awesome Video learning digest";
  const textSections = preview.sections
    .map(
      (section) =>
        `${section.title}\n${section.items
          .map(
            (item) =>
              `• ${item.title} — ${item.description}\n  ${siteUrl(item.href)}`,
          )
          .join("\n")}`,
    )
    .join("\n\n");
  const text =
    `${subject}\n\n${textSections}\n\n` +
    `You explicitly opted in to this digest. Unsubscribe from email digests in one click:\n${unsubscribeUrl}`;
  const htmlSections = preview.sections
    .map(
      (section) =>
        `<section style="margin:0 0 28px"><h2 style="font-size:18px;margin:0 0 12px">${escapeHtml(
          section.title,
        )}</h2><ul style="list-style:none;padding:0;margin:0">${section.items
          .map(
            (item) =>
              `<li style="border-top:1px solid #ddd;padding:12px 0"><a href="${escapeHtml(
                siteUrl(item.href),
              )}" style="color:#b42336;font-weight:700;text-decoration:none">${escapeHtml(
                item.title,
              )}</a><br><span style="color:#555;font-size:14px">${escapeHtml(
                item.description,
              )}</span></li>`,
          )
          .join("")}</ul></section>`,
    )
    .join("");
  const html =
    `<!doctype html><html><body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#111;max-width:620px;margin:0 auto;padding:24px">` +
    `<p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#b42336">Awesome Video</p>` +
    `<h1 style="font-size:28px;margin:0 0 24px">Your learning digest</h1>` +
    htmlSections +
    `<p style="border-top:1px solid #ddd;padding-top:18px;color:#666;font-size:12px">You explicitly opted in to this digest. <a href="${escapeHtml(
      unsubscribeUrl,
    )}">Unsubscribe from email digests</a>.</p></body></html>`;
  return { subject, text, html };
}

async function createUnsubscribeUrl(userId: string): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");
  const expiresAt = new Date(
    Date.now() + UNSUBSCRIBE_RETENTION_DAYS * 86_400_000,
  );
  await db
    .insert(digestUnsubscribeTokens)
    .values({ userId, tokenHash, expiresAt });
  return siteUrl(`/unsubscribe/digest/${rawToken}`);
}

async function createInAppNotifications(
  job: DigestJob,
  preview: DigestPreview,
): Promise<void> {
  const expiresAt = new Date(Date.now() + NOTIFICATION_RETENTION_DAYS * 86_400_000);
  const items = preview.sections.flatMap((section) => section.items);
  await db.transaction(async (transaction) => {
    for (const item of items) {
      const target =
        item.resourceId ?? `${item.journeyId ?? "none"}:${item.stepNumber ?? 0}`;
      await transaction
        .insert(inAppNotifications)
        .values({
          userId: job.userId,
          kind: item.kind,
          title: item.title,
          description: item.description,
          href: item.href,
          resourceId: item.resourceId,
          collectionId: item.collectionId,
          journeyId: item.journeyId,
          stepNumber: item.stepNumber,
          idempotencyKey: `${job.id}:${item.kind}:${target}`,
          expiresAt,
        })
        .onConflictDoNothing({
          target: inAppNotifications.idempotencyKey,
        });
    }
  });
}

async function renewJobLease(job: DigestJob): Promise<boolean> {
  if (!job.workerId) return false;
  const renewed = await db
    .update(digestJobs)
    .set({
      leaseExpiresAt: new Date(
        Date.now() + JOB_LEASE_MINUTES * 60_000,
      ),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(digestJobs.id, job.id),
        eq(digestJobs.status, "processing"),
        eq(digestJobs.workerId, job.workerId),
        sql`${digestJobs.leaseExpiresAt} > now()`,
      ),
    )
    .returning({ id: digestJobs.id });
  return renewed.length > 0;
}

async function withLeaseHeartbeat<T>(
  job: DigestJob,
  operation: () => Promise<T>,
): Promise<{ owned: false } | { owned: true; value: T }> {
  if (!(await renewJobLease(job))) return { owned: false };
  let heartbeat = Promise.resolve(true);
  const timer = setInterval(() => {
    heartbeat = heartbeat
      .then(() => renewJobLease(job))
      .catch(() => false);
  }, Math.max(60_000, Math.floor((JOB_LEASE_MINUTES * 60_000) / 3)));
  timer.unref();
  try {
    return { owned: true, value: await operation() };
  } finally {
    clearInterval(timer);
    await heartbeat;
  }
}

async function processClaimedJob(job: DigestJob): Promise<void> {
  await startAttempt(job);
  let emailDeliveryAttempted = false;
  try {
    const [preferences, account] = await Promise.all([
      db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, job.userId))
        .limit(1)
        .then((rows) => rows[0]),
      db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, job.userId))
        .limit(1)
        .then((rows) => rows[0]),
    ]);
    const enabled =
      job.channel === "email"
        ? preferences?.emailDigestEnabled
        : preferences?.inAppEnabled;
    if (
      !preferences ||
      !enabled ||
      preferences.policyVersion !== job.policyVersion
    ) {
      await completeAttempt(job, "skipped", {
        errorCode: !enabled ? "consent_disabled" : "preference_changed",
      });
      return;
    }
    if (preferences.pausedUntil && preferences.pausedUntil > new Date()) {
      await completeAttempt(job, "skipped", { errorCode: "paused" });
      return;
    }

    const preview = await selectDigestContent(job.userId);
    if (preview.itemCount === 0) {
      await completeAttempt(job, "skipped", { errorCode: "no_content" });
      return;
    }

    if (job.channel === "in_app") {
      await createInAppNotifications(job, preview);
      await completeAttempt(job, "sent");
      return;
    }

    if (!account?.email) {
      await completeAttempt(job, "skipped", { errorCode: "email_missing" });
      return;
    }
    const unsubscribeUrl = await createUnsubscribeUrl(job.userId);
    const message = buildDigestEmail(preview, unsubscribeUrl);
    emailDeliveryAttempted = true;
    const delivery = await withLeaseHeartbeat(job, () =>
      sendTransactionalEmail({
        to: account.email!,
        ...message,
        messageId: `digest-${job.id}`,
        unsubscribeUrl,
      }),
    );
    if (!delivery.owned) return;
    const result = delivery.value;
    if (result.status === "delivery_unknown") {
      await markDeliveryUnknownAttempt(
        job,
        result.errorCode ?? "transport_delivery_unknown",
      );
      return;
    }
    if (!result.delivered) {
      await failAttempt(
        job,
        result.errorCode ??
          (result.status === "unavailable"
            ? "transport_unavailable"
            : "transport_send_failed"),
      );
      return;
    }
    await completeAttempt(job, "sent", {
      providerMessageId: result.providerMessageId,
    });
  } catch (error) {
    console.error(
      `[digest] Job ${job.id} failed (${error instanceof Error ? error.name : "unknown"})`,
    );
    if (job.channel === "email" && emailDeliveryAttempted) {
      await markDeliveryUnknownAttempt(job, "post_send_processing_error");
    } else {
      await failAttempt(job, "internal_processing_error");
    }
  }
}

export async function recoverStaleDigestJobs(): Promise<number> {
  return db.transaction(async (transaction) => {
    const stale = await transaction.execute(sql`
      SELECT id, user_id, channel, attempt_count
      FROM digest_jobs
      WHERE status = 'processing'
        AND lease_expires_at < now()
      FOR UPDATE
    `);
    const rows = rowsOf<{
      id: number;
      user_id: string;
      channel: DigestChannel;
      attempt_count: number;
    }>(stale);
    let recovered = 0;
    for (const row of rows) {
      const now = new Date();
      const owned = await transaction
        .update(digestJobs)
        .set({
          status: "failed",
          completedAt: now,
          leaseExpiresAt: null,
          workerId: null,
          lastErrorCode: "delivery_unknown_after_worker_restart",
          updatedAt: now,
        })
        .where(
          and(
            eq(digestJobs.id, Number(row.id)),
            eq(digestJobs.status, "processing"),
            sql`${digestJobs.leaseExpiresAt} < now()`,
          ),
        )
        .returning({ id: digestJobs.id });
      if (owned.length === 0) continue;

      await transaction
        .update(digestAttempts)
        .set({
          outcome: "delivery_unknown",
          errorCode: "worker_lease_expired",
          completedAt: now,
        })
        .where(
          and(
            eq(digestAttempts.jobId, Number(row.id)),
            eq(digestAttempts.attemptNumber, Number(row.attempt_count)),
            eq(digestAttempts.outcome, "started"),
          ),
        );
      // The worker may have died after Gmail accepted the message. Treat the
      // period as delivered for scheduling purposes while reporting the job
      // as delivery_unknown; automatically retrying could duplicate email.
      await transaction
        .update(notificationPreferences)
        .set(
          row.channel === "email"
            ? { lastEmailDigestAt: now, updatedAt: now }
            : { lastInAppDigestAt: now, updatedAt: now },
        )
        .where(eq(notificationPreferences.userId, row.user_id));
      recovered += 1;
    }
    return recovered;
  });
}

export async function dispatchDigestBatch(
  workerId: string,
  limit = 20,
): Promise<number> {
  let processed = 0;
  for (let index = 0; index < Math.max(1, Math.min(limit, 100)); index += 1) {
    const job = await claimNextJob(workerId);
    if (!job) break;
    await processClaimedJob(job);
    processed += 1;
  }
  return processed;
}

export async function cleanupDigestRetention(): Promise<{
  notifications: number;
  jobs: number;
  tokens: number;
}> {
  const notificationCutoff = new Date(
    Date.now() - NOTIFICATION_RETENTION_DAYS * 86_400_000,
  );
  const jobCutoff = new Date(
    Date.now() - COMPLETED_RETENTION_DAYS * 86_400_000,
  );
  const [notificationsDeleted, jobsDeleted, tokensDeleted] = await Promise.all([
    db
      .delete(inAppNotifications)
      .where(
        sql`${inAppNotifications.expiresAt} < now() OR ${inAppNotifications.createdAt} < ${notificationCutoff}`,
      )
      .returning({ id: inAppNotifications.id }),
    db
      .delete(digestJobs)
      .where(
        and(
          inArray(digestJobs.status, ["sent", "failed", "skipped"]),
          sql`${digestJobs.completedAt} < ${jobCutoff}`,
        ),
      )
      .returning({ id: digestJobs.id }),
    db
      .delete(digestUnsubscribeTokens)
      .where(sql`${digestUnsubscribeTokens.expiresAt} < now()`)
      .returning({ id: digestUnsubscribeTokens.id }),
  ]);
  return {
    notifications: notificationsDeleted.length,
    jobs: jobsDeleted.length,
    tokens: tokensDeleted.length,
  };
}

export async function runDigestCycle(options: {
  workerId?: string;
  limit?: number;
} = {}): Promise<{
  recovered: number;
  queued: number;
  processed: number;
  cleaned: { notifications: number; jobs: number; tokens: number };
}> {
  const workerId =
    options.workerId ?? `digest-${process.pid}-${crypto.randomUUID().slice(0, 8)}`;
  const recovered = await recoverStaleDigestJobs();
  const queued = await enqueueDueDigestJobs();
  const processed = await dispatchDigestBatch(workerId, options.limit ?? 20);
  const cleaned = await cleanupDigestRetention();
  return { recovered, queued, processed, cleaned };
}

export async function listNotifications(
  userId: string,
  limit = 50,
): Promise<{
  notifications: Array<{
    id: number;
    kind: string;
    title: string;
    description: string;
    href: string;
    readAt: string | null;
    createdAt: string;
  }>;
  unreadCount: number;
}> {
  const [rows, unread] = await Promise.all([
    db
      .select({
        id: inAppNotifications.id,
        kind: inAppNotifications.kind,
        title: inAppNotifications.title,
        description: inAppNotifications.description,
        href: inAppNotifications.href,
        readAt: inAppNotifications.readAt,
        createdAt: inAppNotifications.createdAt,
      })
      .from(inAppNotifications)
      .where(
        and(
          eq(inAppNotifications.userId, userId),
          sql`${inAppNotifications.expiresAt} > now()`,
        ),
      )
      .orderBy(desc(inAppNotifications.createdAt), desc(inAppNotifications.id))
      .limit(Math.max(1, Math.min(limit, 100))),
    db.execute(sql`
      SELECT count(*)::int AS count
      FROM in_app_notifications
      WHERE user_id = ${userId}
        AND read_at IS NULL
        AND expires_at > now()
    `),
  ]);
  return {
    notifications: rows.map((row) => ({
      ...row,
      readAt: row.readAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    })),
    unreadCount: Number(rowsOf<{ count: number }>(unread)[0]?.count ?? 0),
  };
}

export async function markNotificationRead(
  userId: string,
  notificationId: number,
): Promise<boolean> {
  const updated = await db
    .update(inAppNotifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(inAppNotifications.id, notificationId),
        eq(inAppNotifications.userId, userId),
      ),
    )
    .returning({ id: inAppNotifications.id });
  return updated.length > 0;
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const updated = await db
    .update(inAppNotifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(inAppNotifications.userId, userId),
        isNull(inAppNotifications.readAt),
      ),
    )
    .returning({ id: inAppNotifications.id });
  return updated.length;
}

export async function unsubscribeDigestToken(rawToken: string): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(rawToken)) return false;
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  return db.transaction(async (transaction) => {
    const now = new Date();
    const [token] = await transaction
      .update(digestUnsubscribeTokens)
      .set({ usedAt: now })
      .where(
        and(
          eq(digestUnsubscribeTokens.tokenHash, tokenHash),
          sql`${digestUnsubscribeTokens.expiresAt} > now()`,
          isNull(digestUnsubscribeTokens.usedAt),
        ),
      )
      .returning({ userId: digestUnsubscribeTokens.userId });
    if (!token) return false;
    await transaction
      .update(notificationPreferences)
      .set({
        emailDigestEnabled: false,
        emailUnsubscribedAt: now,
        policyVersion: sql`${notificationPreferences.policyVersion} + 1`,
        updatedAt: now,
      })
      .where(eq(notificationPreferences.userId, token.userId));
    await transaction
      .update(digestJobs)
      .set({
        status: "skipped",
        completedAt: now,
        lastErrorCode: "unsubscribed",
        updatedAt: now,
      })
      .where(
        and(
          eq(digestJobs.userId, token.userId),
          eq(digestJobs.channel, "email"),
          eq(digestJobs.status, "queued"),
        ),
      );
    return true;
  });
}

export async function getDigestQueueHealth(): Promise<{
  transport: { available: boolean; errorCode?: string };
  queue: Record<string, Record<string, number>>;
  recentFailureCodes: Array<{ code: string; count: number }>;
  oldestQueuedAt: string | null;
}> {
  const [transport, counts, failures, oldest] = await Promise.all([
    probeEmailTransport(),
    db.execute(sql`
      SELECT channel, status, count(*)::int AS count
      FROM digest_jobs
      GROUP BY channel, status
      ORDER BY channel, status
    `),
    db.execute(sql`
      SELECT coalesce(last_error_code, 'unknown') AS code, count(*)::int AS count
      FROM digest_jobs
      WHERE status = 'failed'
        AND completed_at > now() - interval '7 days'
      GROUP BY coalesce(last_error_code, 'unknown')
      ORDER BY count(*) DESC, code
      LIMIT 12
    `),
    db.execute(sql`
      SELECT min(created_at) AS oldest
      FROM digest_jobs
      WHERE status = 'queued'
    `),
  ]);
  const queue: Record<string, Record<string, number>> = {};
  for (const row of rowsOf<{
    channel: string;
    status: string;
    count: number;
  }>(counts)) {
    queue[row.channel] ??= {};
    queue[row.channel][row.status] = Number(row.count);
  }
  const oldestValue = rowsOf<{ oldest: Date | string | null }>(oldest)[0]
    ?.oldest;
  return {
    transport,
    queue,
    recentFailureCodes: rowsOf<{ code: string; count: number }>(failures).map(
      (row) => ({ code: row.code, count: Number(row.count) }),
    ),
    oldestQueuedAt: oldestValue ? new Date(oldestValue).toISOString() : null,
  };
}
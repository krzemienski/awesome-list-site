/**
 * ============================================================================
 * LEARNING JOURNEY REPOSITORY - Learning Journey Data Access Layer
 * ============================================================================
 *
 * This module provides the data access layer for learning journey operations.
 * It encapsulates all database queries related to learning journeys, journey
 * steps, and user progress tracking.
 *
 * KEY OPERATIONS:
 * - Learning Journeys: CRUD operations for journeys
 * - Journey Steps: CRUD operations for journey steps
 * - User Progress: Track user progress through journeys
 *
 * DESIGN NOTES:
 * - Journeys contain multiple steps in a specific order
 * - Steps can be required or optional
 * - User progress tracks completed steps and journey completion
 * - Uses Drizzle ORM for type-safe database operations
 * ============================================================================
 */

import {
  learningJourneys,
  journeySteps,
  userJourneyProgress,
  resources,
  resourceAuditLog,
  type LearningJourney,
  type InsertLearningJourney,
  type JourneyStep,
  type InsertJourneyStep,
  type UserJourneyProgress,
} from "@shared/schema";
import {
  areAllLogicalJourneyStepsComplete,
  groupLogicalJourneySteps,
  isLogicalJourneyStepComplete,
} from "@shared/journeyProgress";
import { db } from "../db";
import { eq, and, asc, desc, inArray, getTableColumns, sql } from "drizzle-orm";
import { type ResourceKind } from "../lib/resourceKinds";
import { stripInternalResourceFields } from "../lib/publicResource";

/** Public projection of a step's linked resource (never the raw row). */
export interface JourneyStepResource {
  id: number;
  title: string;
  url: string;
  description: string | null;
  kind: ResourceKind | null;
  resolvedKind: ResourceKind;
}

export type JourneyStartResult = {
  progress: UserJourneyProgress;
  created: boolean;
};

export type JourneyProgressUpdateResult = {
  progress: UserJourneyProgress | undefined;
  logicalStepBecameComplete: boolean;
  journeyBecameComplete: boolean;
};

/**
 * Repository class for learning journey-related database operations
 */
/**
 * Admin actor context for journey edits. When supplied, the repository writes
 * the journey.* audit entry inside the SAME transaction as the edit, so a
 * failed edit never leaves a success entry and a committed edit always has one.
 */
export interface JourneyAuditContext {
  actorId: string | undefined;
}

type JourneyTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function stepSummary(step: Pick<JourneyStep, "id" | "stepNumber" | "title" | "resourceId" | "isOptional"> & { description?: string | null }) {
  return {
    id: step.id,
    stepNumber: step.stepNumber,
    title: step.title,
    description: step.description ?? null,
    resourceId: step.resourceId ?? null,
    isOptional: step.isOptional ?? false,
  };
}

async function writeJourneyAudit(
  tx: JourneyTx,
  audit: JourneyAuditContext,
  journeyId: number,
  action: string,
  changes: Record<string, unknown>,
  notes: string,
): Promise<void> {
  const [journey] = await tx
    .select({ id: learningJourneys.id, title: learningJourneys.title })
    .from(learningJourneys)
    .where(eq(learningJourneys.id, journeyId));
  const label = journey?.title ?? `Journey #${journeyId}`;
  await tx.insert(resourceAuditLog).values({
    resourceId: null,
    originalResourceId: null,
    action,
    performedBy: audit.actorId,
    changes: { target: { type: "journey", id: journeyId, title: journey?.title ?? null, label }, ...changes },
    notes: `${notes} — ${label}`,
  });
}

export class LearningJourneyRepository {
  /**
   * Bounded source rows for the Continue Learning dashboard. The LEFT JOIN is
   * intentional: if legacy/stale progress survives a content change, callers
   * can render an unavailable-content fallback instead of throwing.
   */
  async listContinueLearningProgress(
    userId: string,
    limit = 24,
  ): Promise<Array<{ progress: UserJourneyProgress; journey: LearningJourney | null }>> {
    const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 50);
    return db
      .select({
        progress: userJourneyProgress,
        journey: learningJourneys,
      })
      .from(userJourneyProgress)
      .leftJoin(
        learningJourneys,
        eq(userJourneyProgress.journeyId, learningJourneys.id),
      )
      .where(eq(userJourneyProgress.userId, userId))
      .orderBy(
        desc(userJourneyProgress.lastAccessedAt),
        desc(userJourneyProgress.id),
      )
      .limit(safeLimit);
  }

  /**
   * Bounded published candidates. Personal scoring happens after this query so
   * preference values never become dynamic SQL.
   */
  async listContinueLearningCandidates(limit = 24): Promise<LearningJourney[]> {
    const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 50);
    return db
      .select()
      .from(learningJourneys)
      .where(eq(learningJourneys.status, "published"))
      .orderBy(
        asc(learningJourneys.orderIndex),
        asc(learningJourneys.id),
      )
      .limit(safeLimit);
  }

  /**
   * List all published learning journeys
   * @param category - Optional category filter
   * @returns Array of learning journeys ordered by index
   */
  async listLearningJourneys(category?: string): Promise<LearningJourney[]> {
    const conditions = [eq(learningJourneys.status, 'published')];
    if (category) {
      conditions.push(eq(learningJourneys.category, category));
    }

    return await db
      .select()
      .from(learningJourneys)
      .where(and(...conditions))
      .orderBy(asc(learningJourneys.orderIndex));
  }

  /**
   * List all learning journeys regardless of status (admin use).
   * Orders by orderIndex then id so unset orderIndex values are stable.
   */
  async listAllLearningJourneys(): Promise<LearningJourney[]> {
    return await db
      .select()
      .from(learningJourneys)
      .orderBy(asc(learningJourneys.orderIndex), asc(learningJourneys.id));
  }

  /**
   * Reorder steps for a journey.
   * Accepts an array of step IDs in their new order and rewrites
   * the stepNumber on each one (1-based). Performs the update inside
   * a single transaction so partial reorders cannot leak.
   *
   * @param journeyId - Journey owning the steps
   * @param orderedStepIds - Step IDs in their new desired order
   * @returns The journey's steps after reordering
   */
  async reorderJourneySteps(
    journeyId: number,
    orderedStepIds: number[],
  ): Promise<JourneyStep[]> {
    if (orderedStepIds.length === 0) {
      return this.listJourneySteps(journeyId);
    }

    // Verify every id belongs to this journey before touching anything.
    const existing = await db
      .select()
      .from(journeySteps)
      .where(eq(journeySteps.journeyId, journeyId));
    const existingIds = new Set(existing.map((s) => s.id));
    for (const id of orderedStepIds) {
      if (!existingIds.has(id)) {
        throw new Error(`Step ${id} does not belong to journey ${journeyId}`);
      }
    }

    await db.transaction(async (tx) => {
      // Two-phase update to avoid temporary uniqueness collisions if a
      // future migration adds a unique constraint on (journeyId, stepNumber).
      for (let i = 0; i < orderedStepIds.length; i++) {
        await tx
          .update(journeySteps)
          .set({ stepNumber: -(i + 1) })
          .where(eq(journeySteps.id, orderedStepIds[i]));
      }
      for (let i = 0; i < orderedStepIds.length; i++) {
        await tx
          .update(journeySteps)
          .set({ stepNumber: i + 1 })
          .where(eq(journeySteps.id, orderedStepIds[i]));
      }
      await tx
        .update(learningJourneys)
        .set({ updatedAt: new Date() })
        .where(eq(learningJourneys.id, journeyId));
    });

    return this.listJourneySteps(journeyId);
  }

  /**
   * Run16 BUG-013: set explicit stepNumbers on a journey's rows.
   * The data model stores up to 3 rows per LOGICAL step (one per linked
   * resource), so multiple rows legitimately share a stepNumber. Row-based
   * renumbering (1..N per row) would explode 6 logical steps into 18 —
   * callers pass group-preserving assignments instead.
   * Two-phase transactional update, same collision-safety as reorder.
   *
   * @param journeyId - Journey owning the steps
   * @param assignments - Explicit { id, stepNumber } pairs (ids must belong to the journey)
   * @returns The journey's steps after renumbering
   */
  async setJourneyStepNumbers(
    journeyId: number,
    assignments: { id: number; stepNumber: number }[],
    audit?: JourneyAuditContext,
  ): Promise<JourneyStep[]> {
    if (assignments.length === 0) {
      return this.listJourneySteps(journeyId);
    }

    const existing = await db
      .select()
      .from(journeySteps)
      .where(eq(journeySteps.journeyId, journeyId));
    const existingIds = new Set(existing.map((s) => s.id));
    for (const { id } of assignments) {
      if (!existingIds.has(id)) {
        throw new Error(`Step ${id} does not belong to journey ${journeyId}`);
      }
    }

    await db.transaction(async (tx) => {
      for (const { id, stepNumber } of assignments) {
        await tx
          .update(journeySteps)
          .set({ stepNumber: -stepNumber })
          .where(eq(journeySteps.id, id));
      }
      for (const { id, stepNumber } of assignments) {
        await tx
          .update(journeySteps)
          .set({ stepNumber })
          .where(eq(journeySteps.id, id));
      }
      await tx
        .update(learningJourneys)
        .set({ updatedAt: new Date() })
        .where(eq(learningJourneys.id, journeyId));
      if (audit) {
        const byId = new Map(existing.map((step) => [step.id, step]));
        await writeJourneyAudit(tx, audit, journeyId, "journey.steps_reordered", {
          before: [...existing]
            .sort((a, b) => a.stepNumber - b.stepNumber || a.id - b.id)
            .map((step) => ({ id: step.id, stepNumber: step.stepNumber, title: step.title })),
          after: [...assignments]
            .sort((a, b) => a.stepNumber - b.stepNumber || a.id - b.id)
            .map(({ id, stepNumber }) => ({ id, stepNumber, title: byId.get(id)?.title ?? null })),
        }, `Reordered ${assignments.length} step row(s)`);
      }
    });

    return this.listJourneySteps(journeyId);
  }

  /**
   * Get a learning journey by its ID
   * @param id - Journey ID
   * @returns Journey object or undefined if not found
   */
  async getLearningJourney(id: number): Promise<LearningJourney | undefined> {
    const [journey] = await db.select().from(learningJourneys).where(eq(learningJourneys.id, id));
    return journey;
  }

  /**
   * Create a new learning journey
   * @param journey - Journey data to create
   * @returns The created journey
   */
  async createLearningJourney(journey: InsertLearningJourney): Promise<LearningJourney> {
    const [newJourney] = await db.insert(learningJourneys).values(journey).returning();
    return newJourney;
  }

  /**
   * Update an existing learning journey
   * @param id - Journey ID to update
   * @param journey - Partial journey data to update
   * @returns The updated journey
   */
  async updateLearningJourney(
    id: number,
    journey: Partial<InsertLearningJourney>,
    audit?: JourneyAuditContext,
  ): Promise<LearningJourney> {
    return db.transaction(async (tx) => {
      const [before] = await tx.select().from(learningJourneys).where(eq(learningJourneys.id, id)).for('update');
      const [updatedJourney] = await tx
        .update(learningJourneys)
        .set({ ...journey, updatedAt: new Date() })
        .where(eq(learningJourneys.id, id))
        .returning();
      if (audit && before && updatedJourney) {
        const fields = Object.keys(journey) as (keyof LearningJourney)[];
        const pick = (row: LearningJourney) =>
          Object.fromEntries(fields.map((field) => [field, row[field] ?? null]));
        await writeJourneyAudit(tx, audit, id, "journey.updated", {
          fields,
          before: pick(before),
          after: pick(updatedJourney),
        }, `Updated ${fields.join(", ")}`);
      }
      return updatedJourney;
    });
  }

  /**
   * Delete a learning journey
   * @param id - Journey ID to delete
   */
  async deleteLearningJourney(id: number): Promise<void> {
    await db.delete(learningJourneys).where(eq(learningJourneys.id, id));
  }

  /**
   * List all steps for a journey
   * @param journeyId - Journey ID
   * @returns Array of journey steps ordered by step number
   */
  async listJourneySteps(
    journeyId: number,
    includeUnapproved = false,
  ): Promise<(JourneyStep & { resource?: JourneyStepResource })[]> {
    // Hydrate each step with its linked resource so the journey detail UI can
    // render real, clickable resource links (the frontend reads step.resource).
    // kind/metadata/taxonomy are selected only to resolve the public kind
    // fields (design parity) and are not sent as-is.
    const rows = await db
      .select({
        step: journeySteps,
        resource: {
          id: resources.id,
          title: resources.title,
          url: resources.url,
          description: resources.description,
          kind: resources.kind,
          metadata: resources.metadata,
          category: resources.category,
          subcategory: resources.subcategory,
          subSubcategory: resources.subSubcategory,
        },
      })
      .from(journeySteps)
      .leftJoin(resources, and(
        eq(journeySteps.resourceId, resources.id),
        includeUnapproved ? undefined : eq(resources.status, 'approved'),
      ))
      .where(eq(journeySteps.journeyId, journeyId))
      // Run22 BUG-034: deterministic within-step ordering — rows sharing a
      // stepNumber (multi-part resources) must always come back in id order,
      // not whatever the planner happens to emit.
      .orderBy(asc(journeySteps.stepNumber), asc(journeySteps.id));

    return rows.map((r) => ({
      ...r.step,
      resource:
        r.resource && r.resource.id != null
          ? stripInternalResourceFields(r.resource)
          : undefined,
    }));
  }

  /**
   * Create a new journey step
   * @param step - Step data to create
   * @returns The created step
   */
  async createJourneyStep(step: InsertJourneyStep, audit?: JourneyAuditContext): Promise<JourneyStep> {
    return db.transaction(async (tx) => {
      await tx.select({ id: learningJourneys.id }).from(learningJourneys)
        .where(eq(learningJourneys.id, step.journeyId)).for('update');
      if (step.resourceId != null) {
        const [resource] = await tx.select({ id: resources.id }).from(resources)
          .where(and(eq(resources.id, step.resourceId), eq(resources.status, 'approved'))).for('share');
        if (!resource) throw Object.assign(new Error('Selected resource no longer exists or is not approved. Choose another resource.'), { code: 'INVALID_STEP_RESOURCE' });
      }
      const [newStep] = await tx.insert(journeySteps).values(step).returning();
      await tx
        .update(learningJourneys)
        .set({ updatedAt: new Date() })
        .where(eq(learningJourneys.id, step.journeyId));
      if (audit) {
        await writeJourneyAudit(tx, audit, step.journeyId, "journey.step_created", {
          before: null,
          after: stepSummary(newStep),
        }, `Added step ${newStep.stepNumber} "${newStep.title}"`);
      }
      return newStep;
    });
  }

  /**
   * Update an existing journey step
   * @param id - Step ID to update
   * @param step - Partial step data to update
   * @returns The updated step
   */
  async updateJourneyStep(
    id: number,
    step: Partial<InsertJourneyStep>,
    wholeGroup = false,
    audit?: JourneyAuditContext,
  ): Promise<JourneyStep> {
    return db.transaction(async (tx) => {
      const [anchor] = await tx.select().from(journeySteps).where(eq(journeySteps.id, id));
      if (!anchor) throw Object.assign(new Error('Step no longer exists. Reload the steps.'), { code: 'STEP_CONFLICT' });
      await tx.select({ id: learningJourneys.id }).from(learningJourneys)
        .where(eq(learningJourneys.id, anchor.journeyId)).for('update');
      const [existing] = await tx.select().from(journeySteps).where(eq(journeySteps.id, id)).for('update');
      if (!existing) throw Object.assign(new Error('Step no longer exists. Reload the steps.'), { code: 'STEP_CONFLICT' });
      if (step.resourceId != null) {
        const [resource] = await tx.select({ id: resources.id }).from(resources)
          .where(and(eq(resources.id, step.resourceId), eq(resources.status, 'approved'))).for('share');
        if (!resource) throw Object.assign(new Error('Selected resource no longer exists or is not approved. Choose another resource.'), { code: 'INVALID_STEP_RESOURCE' });
      }
      const scope = wholeGroup
        ? and(eq(journeySteps.journeyId, existing.journeyId), eq(journeySteps.stepNumber, existing.stepNumber))
        : eq(journeySteps.id, id);
      const beforeRows = audit ? await tx.select().from(journeySteps).where(scope) : [];
      const updatedRows = await tx
        .update(journeySteps)
        .set(step)
        .where(scope)
        .returning();
      // Keep the historical contract: the anchor row (or first row) is returned.
      const updatedStep = updatedRows.find((row) => row.id === id) ?? updatedRows[0];
      if (updatedStep) {
        await tx
          .update(learningJourneys)
          .set({ updatedAt: new Date() })
          .where(eq(learningJourneys.id, updatedStep.journeyId));
        if (audit) {
          await writeJourneyAudit(
            tx,
            audit,
            updatedStep.journeyId,
            wholeGroup ? "journey.step_group_updated" : "journey.step_updated",
            {
              fields: Object.keys(step),
              before: beforeRows.map(stepSummary),
              after: updatedRows.map(stepSummary),
            },
            `Edited step ${existing.stepNumber}${wholeGroup ? ` (${updatedRows.length} row group)` : ""}`,
          );
        }
      }
      return updatedStep;
    });
  }

  /**
   * Delete a journey step
   * @param id - Step ID to delete
   */
  async deleteJourneyStep(id: number, wholeGroup = false, audit?: JourneyAuditContext): Promise<void> {
    await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(journeySteps).where(eq(journeySteps.id, id));
      if (!existing) return;
      await tx.select({ id: learningJourneys.id }).from(learningJourneys)
        .where(eq(learningJourneys.id, existing.journeyId)).for('update');
      const steps = await tx.select().from(journeySteps)
        .where(eq(journeySteps.journeyId, existing.journeyId)).for('update');
      const current = steps.find(s => s.id === id);
      if (!current) return;
      const removed = new Set(steps.filter(s => wholeGroup ? s.stepNumber === current.stepNumber : s.id === id).map(s => s.id));
      const remaining = steps.filter(s => !removed.has(s.id));
      const progressRows = await tx.select().from(userJourneyProgress)
        .where(eq(userJourneyProgress.journeyId, existing.journeyId)).for('update');
      for (const progress of progressRows) {
        const completedSteps = (progress.completedSteps ?? []).map(Number).filter(sid => !removed.has(sid));
        await tx.update(userJourneyProgress).set({
          completedSteps,
          completedAt: areAllLogicalJourneyStepsComplete(remaining, new Set(completedSteps)) ? progress.completedAt ?? new Date() : null,
          currentStepId: progress.currentStepId != null && removed.has(progress.currentStepId) ? null : progress.currentStepId,
        }).where(eq(userJourneyProgress.id, progress.id));
      }
      if (removed.size) await tx.delete(journeySteps).where(inArray(journeySteps.id, [...removed]));
      const numbers = [...new Set(remaining.map(s => s.stepNumber))].sort((a, b) => a - b);
      for (const step of remaining) {
        await tx.update(journeySteps).set({ stepNumber: numbers.indexOf(step.stepNumber) + 1 }).where(eq(journeySteps.id, step.id));
      }
      await tx.update(learningJourneys).set({ updatedAt: new Date() }).where(eq(learningJourneys.id, existing.journeyId));
      if (audit && removed.size) {
        await writeJourneyAudit(
          tx,
          audit,
          existing.journeyId,
          wholeGroup ? "journey.step_group_deleted" : "journey.step_deleted",
          {
            before: steps.filter((s) => removed.has(s.id)).map(stepSummary),
            after: null,
            remainingRows: remaining.length,
          },
          `Removed step ${current.stepNumber} "${current.title}"${wholeGroup ? ` (${removed.size} row group)` : ""}`,
        );
      }
    });
  }

  /**
   * Get steps for multiple journeys in a single batch query
   * Optimized for loading steps for many journeys at once
   * @param journeyIds - Array of journey IDs
   * @returns Map of journey ID to array of steps
   */
  async listJourneyStepsBatch(journeyIds: number[]): Promise<Map<number, JourneyStep[]>> {
    if (journeyIds.length === 0) {
      return new Map();
    }

    const steps = await db
      .select()
      .from(journeySteps)
      .where(inArray(journeySteps.journeyId, journeyIds))
      // Run22 BUG-034: same deterministic tiebreaker as listJourneySteps.
      .orderBy(asc(journeySteps.stepNumber), asc(journeySteps.id));

    // Group steps by journeyId
    const grouped = new Map<number, JourneyStep[]>();
    for (const step of steps) {
      if (!grouped.has(step.journeyId)) {
        grouped.set(step.journeyId, []);
      }
      grouped.get(step.journeyId)!.push(step);
    }

    return grouped;
  }

  /**
   * Start a user's journey
   * Creates or updates progress tracking for the user on a specific journey
   * @param userId - User ID
   * @param journeyId - Journey ID
   * @returns The created or updated progress record
   */
  async startUserJourney(userId: string, journeyId: number): Promise<JourneyStartResult> {
    // `xmax = 0` is evaluated by PostgreSQL in the same UPSERT that creates or
    // resumes progress. A client-side !isEnrolled check races stale tabs; this
    // authoritative flag does not (only the INSERT winner sees created=true).
    const [row] = await db
      .insert(userJourneyProgress)
      .values({
        userId,
        journeyId,
        completedSteps: []
      })
      .onConflictDoUpdate({
        target: [userJourneyProgress.userId, userJourneyProgress.journeyId],
        set: { lastAccessedAt: new Date() }
      })
      .returning({
        ...getTableColumns(userJourneyProgress),
        created: sql<boolean>`(xmax = 0)`,
      });

    const { created, ...progress } = row;
    return { progress: progress as UserJourneyProgress, created };
  }

  /**
   * Update user's journey progress
   * Marks a step as completed and checks if journey is finished
   * @param userId - User ID
   * @param journeyId - Journey ID
   * @param stepId - Step ID that was just completed
   * @returns The updated progress record
   */
  async updateUserJourneyProgress(userId: string, journeyId: number, stepId: number): Promise<UserJourneyProgress> {
    const result = await this.updateUserJourneyProgressBatch(userId, journeyId, [stepId]);
    if (!result.progress) {
      throw new Error('Journey progress does not exist');
    }
    return result.progress;
  }

  /**
   * Batch-update user's journey progress in a single read+write (Run17 BUG-016:
   * a logical step maps to up to 3 rows sharing a stepNumber; completing it
   * previously issued one PUT per row — 3 round trips and 3 UPDATEs).
   * @param stepIds - All step row ids of the logical step being toggled
   * @param completed - Explicit target state; when omitted, each id is toggled
   *                    (back-compat with the single-step API contract).
   */
  async updateUserJourneyProgressBatch(
    userId: string,
    journeyId: number,
    stepIds: number[],
    completed?: boolean,
  ): Promise<JourneyProgressUpdateResult> {
    // Run22 BUG-006: a step id sent to journey N's progress endpoint must
    // actually belong to journey N — otherwise a client can pollute progress
    // with foreign step ids (breaking completion math on BOTH journeys' UIs).
    // Validate BEFORE any write and surface a typed error for the route to
    // map to a 4xx.
    return db.transaction(async (tx) => {
      // Share the journey lock with structural edits before reading row membership.
      await tx.select({ id: learningJourneys.id }).from(learningJourneys)
        .where(eq(learningJourneys.id, journeyId)).for('share');
      const allSteps = await tx.select().from(journeySteps).where(eq(journeySteps.journeyId, journeyId));
      const validIds = new Set(allSteps.map((s) => s.id));
      const foreign = stepIds.filter((id) => !validIds.has(id));
      if (foreign.length > 0) {
        const err: any = new Error(
          `Step id(s) ${foreign.join(', ')} do not belong to journey ${journeyId}`,
        );
        err.code = 'FOREIGN_STEP';
        err.foreignStepIds = foreign;
        throw err;
      }

      // Serialize same-user/journey writes. This avoids lost JSONB updates and
      // makes each transition flag truthful across stale tabs and devices.
      const [current] = await tx
        .select()
        .from(userJourneyProgress)
        .where(
          and(
            eq(userJourneyProgress.userId, userId),
            eq(userJourneyProgress.journeyId, journeyId)
          )
        )
        .for('update');

      if (!current) {
        return {
          progress: undefined,
          logicalStepBecameComplete: false,
          journeyBecameComplete: false,
        };
      }

      const beforeCompletedSet = new Set(
        (current.completedSteps ?? []).map((id) => Number(id)).filter((id) => validIds.has(id)),
      );
      const completedSet = new Set(beforeCompletedSet);
      for (const stepId of stepIds) {
        if (completed === true) {
          completedSet.add(stepId);
        } else if (completed === false) {
          completedSet.delete(stepId);
        } else if (completedSet.has(stepId)) {
          completedSet.delete(stepId);
        } else {
          completedSet.add(stepId);
        }
      }
      const completedSteps = Array.from(completedSet);
      const wasJourneyComplete = areAllLogicalJourneyStepsComplete(allSteps, beforeCompletedSet);
      const allCompleted = areAllLogicalJourneyStepsComplete(allSteps, completedSet);
      const touchedStepIds = new Set(stepIds);
      const logicalStepBecameComplete =
        completed === true &&
        groupLogicalJourneySteps(allSteps)
          .filter(({ rows }) => rows.some((row) => touchedStepIds.has(row.id)))
          .some(
            ({ rows }) =>
              !isLogicalJourneyStepComplete(rows, beforeCompletedSet) &&
              isLogicalJourneyStepComplete(rows, completedSet),
          );

      const [updated] = await tx
        .update(userJourneyProgress)
        .set({
          currentStepId: stepIds[stepIds.length - 1],
          completedSteps,
          lastAccessedAt: new Date(),
          completedAt: allCompleted ? new Date() : null
        })
        .where(
          and(
            eq(userJourneyProgress.userId, userId),
            eq(userJourneyProgress.journeyId, journeyId)
          )
        )
        .returning();

      return {
        progress: updated,
        logicalStepBecameComplete,
        journeyBecameComplete: !wasJourneyComplete && allCompleted,
      };
    });
  }

  /**
   * Get user's progress for a specific journey
   * @param userId - User ID
   * @param journeyId - Journey ID
   * @returns Progress record or undefined if not found
   */
  async getUserJourneyProgress(userId: string, journeyId: number): Promise<UserJourneyProgress | undefined> {
    const [progress] = await db
      .select()
      .from(userJourneyProgress)
      .where(
        and(
          eq(userJourneyProgress.userId, userId),
          eq(userJourneyProgress.journeyId, journeyId)
        )
      );

    // Normalize completedSteps to numbers and exclude any orphan ids that do
    // not belong to this journey (Run22 BUG-006: rows written before the
    // foreign-step guard existed, or steps since deleted, must not surface).
    if (progress && progress.completedSteps) {
      const validIds = new Set((await this.listJourneySteps(journeyId)).map((s) => s.id));
      progress.completedSteps = progress.completedSteps
        .map(id => Number(id))
        .filter(id => validIds.has(id));
    }

    return progress;
  }

  /**
   * List all journey progress for a user
   * @param userId - User ID
   * @returns Array of progress records ordered by last access
   */
  async listUserJourneyProgress(userId: string): Promise<UserJourneyProgress[]> {
    const progressList = await db
      .select()
      .from(userJourneyProgress)
      .where(eq(userJourneyProgress.userId, userId))
      .orderBy(desc(userJourneyProgress.lastAccessedAt));

    // Normalize completedSteps to numbers and exclude orphan ids that do not
    // belong to each row's journey (Run22 BUG-006 — same exclusion as the
    // single-journey read so every view agrees).
    const stepsMap = await this.listJourneyStepsBatch(
      progressList.map((p) => p.journeyId),
    );
    return progressList.map(progress => {
      const validIds = new Set((stepsMap.get(progress.journeyId) ?? []).map((s) => s.id));
      return {
        ...progress,
        completedSteps: progress.completedSteps
          ? progress.completedSteps.map(id => Number(id)).filter(id => validIds.has(id))
          : []
      };
    });
  }
}

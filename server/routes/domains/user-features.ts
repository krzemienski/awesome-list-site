/**
 * ----------------------------------------------------------------------------
 * DOMAIN ROUTER: User Features
 * ----------------------------------------------------------------------------
 *
 * Task #303 (safer modular API architecture): this module owns the
 * user-interaction surface that previously lived inline in server/routes.ts
 * (favorites, bookmarks, bookmark collections & learning queue, account
 * management — password/API keys/profile/deletion request, learning
 * preferences / optional onboarding, contributions dashboard, and the
 * user-scoped journey/continue-learning summaries).
 *
 * The handlers and their registration order are copied verbatim from
 * server/routes.ts (former lines ~2472-3864) so status codes, response
 * bodies, middleware chains and Express declaration order are byte-for-byte
 * identical. Everything the block depends on (repositories, middleware,
 * limiters, helpers) is injected through an explicit context object rather
 * than reaching for module-level singletons, keeping the domain router
 * decoupled from the composition root in server/routes.ts.
 * ----------------------------------------------------------------------------
 */
import type { Express, Response } from "express";
import { z } from "zod";
import { sql } from "drizzle-orm";
import {
  UserRepository,
  ResourceRepository,
  CategoryRepository,
  LearningJourneyRepository,
  UserFeatureRepository,
  CollectionRepository,
  AuditRepository,
  CollectionNotFoundError,
} from "../../repositories";
import { storage } from "../../storage";
import { comparePassword, hashPassword, validateNewPassword } from "../../passwordUtils";
import { db } from "../../db";
import {
  DEFAULT_LEARNING_PREFERENCES,
  completedLearningPreferencesSchema,
  learningPreferencesUpdateSchema,
  type LearningPreferencesValues,
  type OnboardingStatus,
} from "@shared/onboarding";
import type {
  ContinueLearningJourney,
  ContinueLearningSummary,
} from "@shared/continueLearning";
import { summarizeLogicalJourneySteps } from "@shared/journeyProgress";
import { parseIntInRange } from "@shared/validation";
import { displayNameSchema } from "@shared/validation";
import {
  bookmarkQueueStatusSchema,
  collectionNameSchema,
  collectionShareIdSchema,
  personalTagSchema,
  personalTagsSchema,
} from "@shared/bookmarkCollections";
import { PG_INT_MAX } from "../../validation/inputs";

/**
 * Everything the user-features handlers need from the composition root.
 * The shared bookmark/collection/display-name validation schemas and the
 * CollectionNotFoundError sentinel are static @shared/server imports (not
 * runtime-configurable), so they are imported directly above; only the
 * request-scoped singletons (repositories, middleware, SITE_URL, the bounded
 * int parser) are injected here so this module never reaches for the route
 * composition root.
 */
export interface UserFeaturesContext {
  isAuthenticated: any;
  userRepo: UserRepository;
  resourceRepo: ResourceRepository;
  categoryRepo: CategoryRepository;
  learningJourneyRepo: LearningJourneyRepository;
  userFeatureRepo: UserFeatureRepository;
  collectionRepo: CollectionRepository;
  auditRepo: AuditRepository;
  SITE_URL: string;
  parseBoundedInt: (value: unknown) => number | null;
}

export function registerUserFeatureRoutes(
  app: Express,
  ctx: UserFeaturesContext,
): void {
  const {
    isAuthenticated,
    userRepo,
    resourceRepo,
    categoryRepo,
    learningJourneyRepo,
    userFeatureRepo,
    collectionRepo,
    auditRepo,
    SITE_URL,
  } = ctx;

  // --- User Interaction Routes ---

  // POST /api/favorites/:resourceId - Add favorite
  app.post('/api/favorites/:resourceId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const resourceId = parseInt(req.params.resourceId);
      
      await userFeatureRepo.addFavorite(userId, resourceId);
      res.json({ message: 'Favorite added successfully' });
    } catch (error) {
      console.error('Error adding favorite:', error);
      res.status(500).json({ message: 'Failed to add favorite' });
    }
  });
  
  // DELETE /api/favorites/:resourceId - Remove favorite
  app.delete('/api/favorites/:resourceId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const resourceId = parseInt(req.params.resourceId);
      
      await userFeatureRepo.removeFavorite(userId, resourceId);
      res.json({ message: 'Favorite removed successfully' });
    } catch (error) {
      console.error('Error removing favorite:', error);
      res.status(500).json({ message: 'Failed to remove favorite' });
    }
  });
  
  // GET /api/favorites - Get user's favorites
  app.get('/api/favorites', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const favorites = await userFeatureRepo.getUserFavorites(userId);
      res.json(favorites);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      res.status(500).json({ message: 'Failed to fetch favorites' });
    }
  });
  
  // POST /api/bookmarks/:resourceId - Add bookmark
  app.post('/api/bookmarks/:resourceId', isAuthenticated, async (req: any, res, next) => {
    // Express matches in declaration order. Let the reserved segment reach the
    // additive bulk handler registered below instead of parsing it as an ID.
    if (req.params.resourceId === "bulk") return next("route");
    try {
      const userId = req.user.claims.sub;
      const resourceId = parseInt(req.params.resourceId);
      const { notes } = req.body;
      
      // BUG-021: echo the canonical saved state so surfaces holding local
      // bookmark state (e.g. BookmarkButton) can sync notes after an edit.
      const saved = await userFeatureRepo.addBookmark(userId, resourceId, notes);
      res.json({ message: 'Bookmark added successfully', isBookmarked: true, notes: saved.notes ?? '' });
    } catch (error) {
      console.error('Error adding bookmark:', error);
      res.status(500).json({ message: 'Failed to add bookmark' });
    }
  });
  
  // DELETE /api/bookmarks/:resourceId - Remove bookmark
  app.delete('/api/bookmarks/:resourceId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const resourceId = parseInt(req.params.resourceId);
      
      await userFeatureRepo.removeBookmark(userId, resourceId);
      res.json({ message: 'Bookmark removed successfully' });
    } catch (error) {
      console.error('Error removing bookmark:', error);
      res.status(500).json({ message: 'Failed to remove bookmark' });
    }
  });
  
  // GET /api/bookmarks - Get user's bookmarks
  app.get('/api/bookmarks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookmarks = await userFeatureRepo.getUserBookmarks(userId);
      res.json(bookmarks);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      res.status(500).json({ message: 'Failed to fetch bookmarks' });
    }
  });

  // --- Bookmark Collections & Learning Queue (Task #295) ---
  // Additive to the existing bookmark routes above: user_bookmarks remains the
  // one save/note record; collections only organize those rows.
  const collectionIdSchema = z.number().int().min(1).max(PG_INT_MAX);
  const collectionCreateSchema = z.object({
    name: collectionNameSchema,
  }).strict();
  const collectionPatchSchema = z.object({
    name: collectionNameSchema.optional(),
    archived: z.boolean().optional(),
  }).strict().refine(
    (value) => value.name !== undefined || value.archived !== undefined,
    "At least one collection field is required",
  );
  const collectionReorderSchema = z.object({
    orderedIds: z.array(collectionIdSchema).max(500).refine(
      (ids) => new Set(ids).size === ids.length,
      "Collection IDs must be unique",
    ),
  }).strict();
  const bookmarkStateSchema = z.object({
    queueStatus: bookmarkQueueStatusSchema.optional(),
    archived: z.boolean().optional(),
    personalTags: personalTagsSchema.optional(),
  }).strict().refine(
    (value) =>
      value.queueStatus !== undefined ||
      value.archived !== undefined ||
      value.personalTags !== undefined,
    "At least one bookmark field is required",
  );
  const bookmarkBulkSchema = z.object({
    resourceIds: z
      .array(z.number().int().min(1).max(PG_INT_MAX))
      .min(1)
      .max(100)
      .refine((ids) => new Set(ids).size === ids.length, "Resource IDs must be unique"),
    action: z.discriminatedUnion("type", [
      z.object({
        type: z.literal("status"),
        status: bookmarkQueueStatusSchema,
      }).strict(),
      z.object({
        type: z.literal("archive"),
        archived: z.boolean(),
      }).strict(),
      z.object({
        type: z.literal("tag"),
        tag: personalTagSchema,
        mode: z.enum(["add", "remove"]),
      }).strict(),
      z.object({
        type: z.literal("move"),
        destinationCollectionId: collectionIdSchema,
        sourceCollectionId: collectionIdSchema.nullish(),
      }).strict(),
    ]),
  }).strict();

  const parseCollectionId = (value: unknown) =>
    parseIntInRange(value, { min: 1, max: PG_INT_MAX });
  const collectionResponse = (collection: any) => ({
    ...collection,
    publicUrl:
      collection.publishedAt && collection.shareId
        ? `${SITE_URL.replace(/\/+$/, "")}/collection/${collection.shareId}`
        : null,
  });
  const validationError = (res: Response, parsed: { error: z.ZodError }) =>
    res.status(400).json({
      message: parsed.error.issues[0]?.message || "Invalid request",
      errors: parsed.error.issues,
    });

  app.get('/api/collections', isAuthenticated, async (req: any, res) => {
    try {
      if (
        req.query.includeArchived !== undefined &&
        req.query.includeArchived !== "true" &&
        req.query.includeArchived !== "false"
      ) {
        return res.status(400).json({ message: "includeArchived must be true or false" });
      }
      const collections = await collectionRepo.listCollections(
        req.user.claims.sub,
        req.query.includeArchived === "true",
      );
      res.json(collections.map(collectionResponse));
    } catch (error) {
      console.error('Error fetching bookmark collections:', error);
      res.status(500).json({ message: 'Failed to fetch collections' });
    }
  });

  app.post('/api/collections', isAuthenticated, async (req: any, res) => {
    const parsed = collectionCreateSchema.safeParse(req.body ?? {});
    if (!parsed.success) return validationError(res, parsed);
    try {
      const collection = await collectionRepo.createCollection(
        req.user.claims.sub,
        parsed.data.name,
      );
      res.status(201).json(collectionResponse({ ...collection, itemCount: 0 }));
    } catch (error) {
      console.error('Error creating bookmark collection:', error);
      res.status(500).json({ message: 'Failed to create collection' });
    }
  });

  app.put('/api/collections/reorder', isAuthenticated, async (req: any, res) => {
    const parsed = collectionReorderSchema.safeParse(req.body ?? {});
    if (!parsed.success) return validationError(res, parsed);
    try {
      const reordered = await collectionRepo.reorderCollections(
        req.user.claims.sub,
        parsed.data.orderedIds,
      );
      if (!reordered) return res.status(404).json({ message: 'Collection not found' });
      res.json({ orderedIds: parsed.data.orderedIds });
    } catch (error) {
      console.error('Error reordering bookmark collections:', error);
      res.status(500).json({ message: 'Failed to reorder collections' });
    }
  });

  app.patch('/api/collections/:collectionId', isAuthenticated, async (req: any, res) => {
    const collectionId = parseCollectionId(req.params.collectionId);
    if (!collectionId) return res.status(400).json({ message: 'Invalid collection ID' });
    const parsed = collectionPatchSchema.safeParse(req.body ?? {});
    if (!parsed.success) return validationError(res, parsed);
    try {
      const collection = await collectionRepo.updateCollection(
        req.user.claims.sub,
        collectionId,
        parsed.data,
      );
      if (!collection) return res.status(404).json({ message: 'Collection not found' });
      res.json(collectionResponse(collection));
    } catch (error) {
      console.error('Error updating bookmark collection:', error);
      res.status(500).json({ message: 'Failed to update collection' });
    }
  });

  app.delete('/api/collections/:collectionId', isAuthenticated, async (req: any, res) => {
    const collectionId = parseCollectionId(req.params.collectionId);
    if (!collectionId) return res.status(400).json({ message: 'Invalid collection ID' });
    try {
      const deleted = await collectionRepo.deleteCollection(req.user.claims.sub, collectionId);
      if (!deleted) return res.status(404).json({ message: 'Collection not found' });
      res.json({ message: 'Collection deleted; bookmarks were preserved' });
    } catch (error) {
      console.error('Error deleting bookmark collection:', error);
      res.status(500).json({ message: 'Failed to delete collection' });
    }
  });

  app.post(
    '/api/collections/:collectionId/items/:resourceId',
    isAuthenticated,
    async (req: any, res) => {
      const collectionId = parseCollectionId(req.params.collectionId);
      const resourceId = parseIntInRange(req.params.resourceId, { min: 1, max: PG_INT_MAX });
      if (!collectionId || !resourceId) {
        return res.status(400).json({ message: 'Invalid collection or resource ID' });
      }
      try {
        const result = await collectionRepo.addMembership(
          req.user.claims.sub,
          collectionId,
          resourceId,
        );
        if (result === "collection-not-found") {
          return res.status(404).json({ message: 'Collection not found' });
        }
        if (result === "not-bookmarked") {
          return res.status(409).json({ message: 'Bookmark the resource before adding it to a collection' });
        }
        res.status(result === "added" ? 201 : 200).json({ collectionId, resourceId, result });
      } catch (error) {
        console.error('Error adding bookmark to collection:', error);
        res.status(500).json({ message: 'Failed to add bookmark to collection' });
      }
    },
  );

  app.delete(
    '/api/collections/:collectionId/items/:resourceId',
    isAuthenticated,
    async (req: any, res) => {
      const collectionId = parseCollectionId(req.params.collectionId);
      const resourceId = parseIntInRange(req.params.resourceId, { min: 1, max: PG_INT_MAX });
      if (!collectionId || !resourceId) {
        return res.status(400).json({ message: 'Invalid collection or resource ID' });
      }
      try {
        const result = await collectionRepo.removeMembership(
          req.user.claims.sub,
          collectionId,
          resourceId,
        );
        if (result === "collection-not-found") {
          return res.status(404).json({ message: 'Collection not found' });
        }
        res.json({ collectionId, resourceId, result });
      } catch (error) {
        console.error('Error removing bookmark from collection:', error);
        res.status(500).json({ message: 'Failed to remove bookmark from collection' });
      }
    },
  );

  app.post('/api/collections/:collectionId/publish', isAuthenticated, async (req: any, res) => {
    const collectionId = parseCollectionId(req.params.collectionId);
    if (!collectionId) return res.status(400).json({ message: 'Invalid collection ID' });
    try {
      const collection = await collectionRepo.publishCollection(req.user.claims.sub, collectionId);
      if (!collection) return res.status(404).json({ message: 'Collection not found' });
      res.json(collectionResponse(collection));
    } catch (error) {
      console.error('Error publishing bookmark collection:', error);
      res.status(500).json({ message: 'Failed to publish collection' });
    }
  });

  app.delete('/api/collections/:collectionId/publish', isAuthenticated, async (req: any, res) => {
    const collectionId = parseCollectionId(req.params.collectionId);
    if (!collectionId) return res.status(400).json({ message: 'Invalid collection ID' });
    try {
      const collection = await collectionRepo.unpublishCollection(req.user.claims.sub, collectionId);
      if (!collection) return res.status(404).json({ message: 'Collection not found' });
      res.json(collectionResponse(collection));
    } catch (error) {
      console.error('Error unpublishing bookmark collection:', error);
      res.status(500).json({ message: 'Failed to unpublish collection' });
    }
  });

  app.patch('/api/bookmarks/:resourceId/state', isAuthenticated, async (req: any, res) => {
    const resourceId = parseIntInRange(req.params.resourceId, { min: 1, max: PG_INT_MAX });
    if (!resourceId) return res.status(400).json({ message: 'Invalid resource ID' });
    const parsed = bookmarkStateSchema.safeParse(req.body ?? {});
    if (!parsed.success) return validationError(res, parsed);
    try {
      const bookmark = await collectionRepo.updateBookmarkState(
        req.user.claims.sub,
        resourceId,
        parsed.data,
      );
      if (!bookmark) return res.status(404).json({ message: 'Bookmark not found' });
      res.json(bookmark);
    } catch (error) {
      console.error('Error updating bookmark state:', error);
      res.status(500).json({ message: 'Failed to update bookmark state' });
    }
  });

  app.post('/api/bookmarks/bulk', isAuthenticated, async (req: any, res) => {
    const parsed = bookmarkBulkSchema.safeParse(req.body ?? {});
    if (!parsed.success) return validationError(res, parsed);
    try {
      const result = await collectionRepo.bulkUpdate(
        req.user.claims.sub,
        parsed.data.resourceIds,
        parsed.data.action,
      );
      const status = result.succeeded.length === 0 ? 400 : result.failed.length > 0 ? 207 : 200;
      res.status(status).json(result);
    } catch (error) {
      if (error instanceof CollectionNotFoundError) {
        return res.status(404).json({ message: 'Collection not found' });
      }
      console.error('Error applying bulk bookmark action:', error);
      res.status(500).json({ message: 'Failed to update bookmarks' });
    }
  });

  app.get('/api/public/collections/:shareId', async (req, res) => {
    const parsed = collectionShareIdSchema.safeParse(req.params.shareId);
    if (!parsed.success) return res.status(404).json({ message: 'Collection not found' });
    try {
      const collection = await collectionRepo.getPublicCollection(parsed.data);
      if (!collection) return res.status(404).json({ message: 'Collection not found' });
      res.json(collection);
    } catch (error) {
      console.error('Error fetching public bookmark collection:', error);
      res.status(500).json({ message: 'Failed to fetch collection' });
    }
  });

  // --- User Profile & Progress Routes ---

  // GET /api/user/progress - Get user's learning progress
  // Change the current user's password and invalidate their OTHER sessions.
  // Additive: requires an authenticated session; verifies the current password before changing.
  app.post('/api/user/change-password', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { currentPassword, newPassword } = req.body ?? {};

      if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
        return res.status(400).json({ message: 'Current and new password are required' });
      }

      const user = await userRepo.getUser(userId);
      if (!user || !user.password) {
        return res.status(400).json({ message: 'Password change is not available for this account' });
      }

      const currentValid = await comparePassword(currentPassword, user.password as string);
      if (!currentValid) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }

      // Run15 BUG-029: "changing" to the identical password is always a user
      // error — reject it explicitly instead of silently succeeding.
      if (newPassword === currentPassword) {
        return res.status(400).json({ message: 'New password must be different from your current password' });
      }

      const pwCheck = validateNewPassword(newPassword);
      if (!pwCheck.valid) {
        return res.status(400).json({ message: pwCheck.error || 'Invalid new password' });
      }

      const hashed = await hashPassword(newPassword);
      await userRepo.upsertUser({ id: user.id, email: user.email, password: hashed, role: user.role });

      // Invalidate every OTHER session for this user; keep the current one so the caller stays signed in.
      // Session userId lives at sess->'passport'->'user'->'claims'->>'sub'.
      const currentSid = req.sessionID;
      const deleted = await db.execute(sql`
        DELETE FROM sessions
        WHERE sess->'passport'->'user'->'claims'->>'sub' = ${userId}
          AND sid <> ${currentSid}
      `);

      return res.status(200).json({
        message: 'Password changed successfully',
        otherSessionsInvalidated: (deleted as any).rowCount ?? null,
      });
    } catch (error) {
      console.error('[/api/user/change-password] Error:', error);
      return res.status(500).json({ message: 'Failed to change password' });
    }
  });

  // ---- API key management (session-authed) -------------------------------
  // POST /api/user/api-keys — create a key; the plaintext is returned ONCE.
  app.post('/api/user/api-keys', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name, scopes, expiresInDays } = req.body ?? {};

      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ message: 'A non-empty "name" is required' });
      }
      if (scopes !== undefined && (!Array.isArray(scopes) || scopes.some((s: unknown) => typeof s !== 'string'))) {
        return res.status(400).json({ message: '"scopes" must be an array of strings' });
      }
      let expiresAt: Date | null = null;
      if (expiresInDays !== undefined && expiresInDays !== null) {
        const days = Number(expiresInDays);
        if (!Number.isFinite(days) || days <= 0) {
          return res.status(400).json({ message: '"expiresInDays" must be a positive number' });
        }
        expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      }

      const { apiKey, plaintextKey } = await storage.createApiKey({
        userId,
        name: name.trim(),
        scopes: scopes ?? [],
        expiresAt,
      });

      return res.status(201).json({
        message: 'API key created. Copy it now — it will not be shown again.',
        key: plaintextKey,
        apiKey: {
          id: apiKey.id,
          name: apiKey.name,
          scopes: apiKey.scopes,
          createdAt: apiKey.createdAt,
          expiresAt: apiKey.expiresAt,
        },
      });
    } catch (error) {
      console.error('[POST /api/user/api-keys] Error:', error);
      return res.status(500).json({ message: 'Failed to create API key' });
    }
  });

  // GET /api/user/api-keys — list the caller's keys (never returns the secret).
  app.get('/api/user/api-keys', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const keys = await storage.listApiKeys(userId);
      return res.json({ apiKeys: keys });
    } catch (error) {
      console.error('[GET /api/user/api-keys] Error:', error);
      return res.status(500).json({ message: 'Failed to list API keys' });
    }
  });

  // DELETE /api/user/api-keys/:id — revoke one of the caller's keys.
  app.delete('/api/user/api-keys/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const revoked = await storage.revokeApiKey(req.params.id, userId);
      if (!revoked) {
        return res.status(404).json({ message: 'API key not found' });
      }
      return res.json({ message: 'API key revoked' });
    } catch (error) {
      console.error('[DELETE /api/user/api-keys/:id] Error:', error);
      return res.status(500).json({ message: 'Failed to revoke API key' });
    }
  });

  // PATCH /api/user/profile — self-service display-name edit (Run15 BUG-049).
  // Only firstName/lastName; email/password/role have their own guarded flows.
  app.patch('/api/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // Run17 BUG-012: cap at 50; Run21 R4-049: shared displayNameSchema also
      // strips zero-width chars and rejects names with NO visible characters
      // (a ZWSP-only name used to render as an invisible identity).
      const nameField = displayNameSchema.optional();
      const profileSchema = z
        .object({ firstName: nameField, lastName: nameField })
        .refine((v) => v.firstName !== undefined || v.lastName !== undefined, {
          message: 'Provide firstName or lastName',
        })
        // Run17 BUG-011: clearing BOTH names in one request is rejected — the
        // old behavior 200'd and silently fell back to the email local-part.
        .refine(
          (v) => !(v.firstName !== undefined && v.lastName !== undefined &&
                   v.firstName === '' && v.lastName === ''),
          { message: 'Enter at least a first or last name' },
        );
      const parsed = profileSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0]?.message || 'Invalid profile data' });
      }
      // Empty string clears the field (stored as NULL, matching OAuth-created rows).
      const toValue = (v: string | undefined) => (v === undefined ? undefined : v === '' ? null : v);
      const updated = await userRepo.updateUserProfile(userId, {
        firstName: toValue(parsed.data.firstName),
        lastName: toValue(parsed.data.lastName),
      });
      if (!updated) {
        return res.status(404).json({ message: 'User not found' });
      }
      return res.json({
        id: updated.id,
        email: updated.email,
        firstName: updated.firstName,
        lastName: updated.lastName,
        role: updated.role,
      });
    } catch (error) {
      console.error('[PATCH /api/user/profile] Error:', error);
      return res.status(500).json({ message: 'Failed to update profile' });
    }
  });

  // POST /api/user/deletion-request — Run22 BUG-020: private account/data
  // deletion channel. Authenticated (session), so no personal data ever has
  // to be posted in a public GitHub issue. Idempotent: re-requesting keeps
  // the original request timestamp. Admins see the pending marker in the
  // users table and action it via the existing guarded delete-user flow.
  app.post('/api/user/deletion-request', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await userRepo.getUser(userId);
      if (!existing) {
        return res.status(404).json({ message: 'User not found' });
      }
      const alreadyRequested = !!existing.deletionRequestedAt;
      const updated = alreadyRequested
        ? existing
        : await userRepo.setDeletionRequested(userId, true);
      return res.status(alreadyRequested ? 200 : 201).json({
        deletionRequestedAt: updated?.deletionRequestedAt,
        alreadyRequested,
        message: alreadyRequested
          ? 'Your deletion request is already pending.'
          : 'Deletion request received. A maintainer will process it privately.',
      });
    } catch (error) {
      console.error('[POST /api/user/deletion-request] Error:', error);
      return res.status(500).json({ message: 'Failed to submit deletion request' });
    }
  });

  // DELETE /api/user/deletion-request — withdraw a pending deletion request.
  app.delete('/api/user/deletion-request', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await userRepo.getUser(userId);
      if (!existing) {
        return res.status(404).json({ message: 'User not found' });
      }
      if (!existing.deletionRequestedAt) {
        return res.status(409).json({ message: 'No pending deletion request to withdraw' });
      }
      await userRepo.setDeletionRequested(userId, false);
      return res.json({ message: 'Deletion request withdrawn.' });
    } catch (error) {
      console.error('[DELETE /api/user/deletion-request] Error:', error);
      return res.status(500).json({ message: 'Failed to withdraw deletion request' });
    }
  });

  // journey_steps stores multiple rows per logical stepNumber. The imported
  // helper is shared with write-time completion and Journey Detail so grouped
  // progress cannot drift across surfaces.
  function countLogicalJourneySteps(
    steps: Array<{ id: number; stepNumber: number | string; isOptional?: boolean | null }>,
    completedRowIds: Set<number>,
  ): { totalSteps: number; completedSteps: number } {
    const { totalSteps, completedSteps } = summarizeLogicalJourneySteps(
      steps,
      completedRowIds,
    );
    return { totalSteps, completedSteps };
  }

  app.get('/api/user/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Get total resources in catalog
      const totalResourcesResult = await resourceRepo.listResources({ status: 'approved', limit: 1 });
      const totalResources = totalResourcesResult.total;

      // Get user's journey progress to count completed resources
      const journeyProgress = await learningJourneyRepo.listUserJourneyProgress(userId);
      const completedResources = journeyProgress.filter(p => p.completedAt !== null).length;

      // Get current learning path — the most recently accessed journey that
      // is NOT yet completed. Run22 BUG-042: journeyProgress[0] used to win
      // even when it was a finished journey, so "Current Learning Path"
      // showed a completed path. Completed journeys are never "current"; if
      // every enrolled journey is done, no current path is reported.
      let currentPath: string | undefined;
      const activeJourneys = journeyProgress.filter(p => !p.completedAt);
      if (activeJourneys.length > 0) {
        const journey = await learningJourneyRepo.getLearningJourney(activeJourneys[0].journeyId);
        currentPath = journey?.title;
      }

      // Run22 BUG-043: totalTimeSpent was hardcoded '0h 0m' even with real
      // completions. Definition (no wall-clock tracking exists): estimated
      // learning time = for each enrolled journey, the midpoint of its
      // estimated_duration ("8-10 hours" → 9h) scaled by the fraction of step
      // rows completed; a journey with completedAt counts in full.
      const enrolledIds = journeyProgress.map(p => p.journeyId);
      const stepsByJourney = await learningJourneyRepo.listJourneyStepsBatch(enrolledIds);
      const journeyMeta = await Promise.all(
        enrolledIds.map(id => learningJourneyRepo.getLearningJourney(id)),
      );
      const parseDurationHours = (text?: string | null): number => {
        if (!text) return 0;
        const m = text.match(/(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?\s*(hours?|hrs?|minutes?|mins?)/i);
        if (!m) return 0;
        const lo = parseFloat(m[1]);
        const hi = m[2] ? parseFloat(m[2]) : lo;
        const mid = (lo + hi) / 2;
        return /min/i.test(m[3]) ? mid / 60 : mid;
      };
      let estimatedHours = 0;
      for (const p of journeyProgress) {
        const journey = journeyMeta.find(j => j?.id === p.journeyId);
        const durationHours = parseDurationHours(journey?.estimatedDuration);
        if (!durationHours) continue;
        // BUG-063 (run25): the fraction used to divide completed step ROWS by
        // total rows while the journeys UI counts LOGICAL steps (grouped by
        // stepNumber) — the two surfaces disagreed whenever a stepNumber has
        // multiple rows. Use the same shared logical-step accounting.
        const { totalSteps, completedSteps } = countLogicalJourneySteps(
          stepsByJourney.get(p.journeyId) ?? [],
          new Set<number>(p.completedSteps ?? []),
        );
        const fraction = p.completedAt
          ? 1
          : totalSteps > 0
            ? Math.min(1, completedSteps / totalSteps)
            : 0;
        estimatedHours += durationHours * fraction;
      }
      const totalMinutes = Math.round(estimatedHours * 60);
      const totalTimeSpent = `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;

      // Calculate streak days from favorites and bookmarks
      const favorites = await userFeatureRepo.getUserFavorites(userId);
      const bookmarks = await userFeatureRepo.getUserBookmarks(userId);
      
      // Debug: Log sample data to verify timestamps are available
      if (favorites.length > 0) {
        console.log('Favorites sample:', favorites[0]);
      }
      if (bookmarks.length > 0) {
        console.log('Bookmarks sample:', bookmarks[0]);
      }
      
      // Get all activity dates from favorites and bookmarks
      const activityDates: Date[] = [];
      
      // Add favorite dates (now using favoritedAt from junction table)
      favorites.forEach(f => {
        if (f.favoritedAt) activityDates.push(new Date(f.favoritedAt));
      });
      
      // Add bookmark dates (now using bookmarkedAt from junction table)
      bookmarks.forEach(b => {
        if (b.bookmarkedAt) activityDates.push(new Date(b.bookmarkedAt));
      });

      // Calculate streak
      let streakDays = 0;
      if (activityDates.length > 0) {
        // Sort dates descending
        activityDates.sort((a, b) => b.getTime() - a.getTime());
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let currentDate = new Date(today);
        streakDays = 0;
        
        for (const activityDate of activityDates) {
          const activity = new Date(activityDate);
          activity.setHours(0, 0, 0, 0);
          
          const diffDays = Math.floor((currentDate.getTime() - activity.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays === 0) {
            streakDays = Math.max(streakDays, 1);
          } else if (diffDays === streakDays) {
            streakDays++;
          }
        }
      }

      // Get skill level from user preferences
      let skillLevel = 'beginner';
      try {
        const userPrefs = await userFeatureRepo.getUserPreferences(userId);
        if (userPrefs?.skillLevel) {
          skillLevel = userPrefs.skillLevel;
        }
      } catch (error) {
        console.log('User preferences not found, using default skill level');
      }

      const progressData = {
        totalResources,
        completedResources,
        currentPath,
        streakDays,
        totalTimeSpent,
        skillLevel
      };

      res.json(progressData);
    } catch (error) {
      console.error('Error fetching user progress:', error);
      res.status(500).json({ message: 'Failed to fetch user progress' });
    }
  });

  // --- Learning preferences / optional onboarding ---

  // GET does not create a row. A missing row is meaningful: the user has not
  // started onboarding and can be invited without being blocked from browsing.
  app.get('/api/user/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const preferences = await userFeatureRepo.getUserPreferences(userId);
      const isCleared =
        preferences?.onboardingStatus === 'not_started' &&
        preferences.preferredCategories.length === 0 &&
        preferences.learningGoals.length === 0 &&
        preferences.preferredResourceTypes.length === 0;
      res.set('Cache-Control', 'private, no-store');
      res.json({
        preferences: isCleared ? null : preferences ?? null,
        // A cleared row remains hidden from the form model but its version
        // prevents a stale tab from resurrecting pre-reset values.
        revision: preferences?.revision ?? null,
      });
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      res.status(500).json({ message: 'Failed to fetch learning preferences' });
    }
  });

  // PUT is an idempotent upsert into the user_id-unique preference row. Draft
  // saves may be partial; a completed profile must satisfy the full contract.
  app.put('/api/user/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const parsed = learningPreferencesUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: 'Please check your learning preferences',
          errors: parsed.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }

      const current = await userFeatureRepo.getUserPreferences(userId);
      const expectedRevision =
        parsed.data.expectedRevision === undefined
          ? undefined
          : parsed.data.expectedRevision === null
            ? null
            : parsed.data.expectedRevision;
      if (
        expectedRevision !== undefined &&
        ((current === undefined && expectedRevision !== null) ||
          (current !== undefined &&
            (expectedRevision === null ||
              current.revision !== expectedRevision)))
      ) {
        return res.status(409).json({
          message:
            'Your learning preferences changed in another tab. Reload before saving again.',
        });
      }
      const dedupe = <T,>(items: T[]): T[] => [...new Set(items)];
      const values: LearningPreferencesValues = {
        preferredCategories: dedupe(
          parsed.data.preferredCategories ??
            current?.preferredCategories ??
            DEFAULT_LEARNING_PREFERENCES.preferredCategories,
        ),
        skillLevel:
          parsed.data.skillLevel ??
          current?.skillLevel ??
          DEFAULT_LEARNING_PREFERENCES.skillLevel,
        learningGoals: dedupe(
          parsed.data.learningGoals ??
            current?.learningGoals ??
            DEFAULT_LEARNING_PREFERENCES.learningGoals,
        ),
        preferredResourceTypes: dedupe(
          parsed.data.preferredResourceTypes ??
            current?.preferredResourceTypes ??
            DEFAULT_LEARNING_PREFERENCES.preferredResourceTypes,
        ),
        timeCommitment:
          parsed.data.timeCommitment ??
          current?.timeCommitment ??
          DEFAULT_LEARNING_PREFERENCES.timeCommitment,
      };

      // Taxonomy values are intentionally resolved at write time. A stale tab
      // cannot persist a deleted/renamed category, and no hard-coded client list
      // can drift from the catalog.
      if (parsed.data.preferredCategories !== undefined) {
        const knownCategories = new Set(
          (await categoryRepo.listCategories()).map((category) => category.name),
        );
        const unknown = values.preferredCategories.filter(
          (category) => !knownCategories.has(category),
        );
        if (unknown.length > 0) {
          return res.status(400).json({
            message: 'One or more selected topics are no longer available. Refresh and choose again.',
          });
        }
      }

      const onboardingStatus: OnboardingStatus =
        parsed.data.onboardingStatus ??
        current?.onboardingStatus ??
        'not_started';
      const onboardingStep =
        parsed.data.onboardingStep ?? current?.onboardingStep ?? 1;

      if (onboardingStatus === 'completed') {
        const completed = completedLearningPreferencesSchema.safeParse(values);
        if (!completed.success) {
          return res.status(400).json({
            message: 'Complete each preference section before saving',
            errors: completed.error.issues.map((issue) => ({
              field: issue.path.join('.'),
              message: issue.message,
            })),
          });
        }
      }

      const now = new Date();
      const preferences = await userFeatureRepo.upsertUserPreferences(
        userId,
        {
          ...values,
          onboardingStatus,
          onboardingStep: onboardingStatus === 'completed' ? 5 : onboardingStep,
          onboardingCompletedAt:
            onboardingStatus === 'completed'
              ? current?.onboardingCompletedAt ?? now
              : null,
          onboardingDismissedAt:
            onboardingStatus === 'dismissed'
              ? current?.onboardingDismissedAt ?? now
              : null,
        },
        expectedRevision,
      );
      if (!preferences) {
        return res.status(409).json({
          message:
            'Your learning preferences changed in another tab. Reload before saving again.',
        });
      }

      res.set('Cache-Control', 'private, no-store');
      res.json({
        preferences,
        revision: preferences.revision,
      });
    } catch (error) {
      console.error('Error saving user preferences:', error);
      res.status(500).json({ message: 'Failed to save learning preferences' });
    }
  });

  app.delete('/api/user/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const rawExpected = req.body?.expectedRevision;
      if (
        rawExpected !== undefined &&
        rawExpected !== null &&
        (!Number.isInteger(rawExpected) || rawExpected < 1)
      ) {
        return res.status(400).json({ message: 'expectedRevision must be a positive integer or null' });
      }
      const reset = await userFeatureRepo.resetUserPreferences(
        userId,
        rawExpected,
      );
      if (!reset) {
        return res.status(409).json({
          message:
            'Your learning preferences changed in another tab. Reload before resetting.',
        });
      }
      res.set('Cache-Control', 'private, no-store');
      res.json({
        preferences: null,
        revision: reset.revision,
      });
    } catch (error) {
      console.error('Error resetting user preferences:', error);
      res.status(500).json({ message: 'Failed to reset learning preferences' });
    }
  });

  const contributionQuerySchema = z.object({
    type: z.enum(['all', 'resource', 'edit']).default('all'),
    status: z
      .enum(['all', 'pending', 'approved', 'rejected', 'withdrawn', 'superseded'])
      .default('all'),
    sort: z.enum(['newest', 'oldest']).default('newest'),
    q: z.string().trim().max(100, 'Search must be 100 characters or fewer').default(''),
    page: z.coerce.number().int().min(1).max(PG_INT_MAX).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12),
  });

  // GET /api/user/contributions - One ownership-scoped, safely serialized
  // timeline for resource submissions and edit suggestions.
  app.get('/api/user/contributions', isAuthenticated, async (req: any, res) => {
    try {
      const parsed = contributionQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({
          message: parsed.error.issues[0]?.message || 'Invalid contribution filters',
        });
      }

      const userId = req.user.claims.sub;
      const { type, status, sort, q, page, limit } = parsed.data;
      const dashboard = await auditRepo.getContributorDashboardData(userId);
      const statusCounts = {
        pending: 0,
        approved: 0,
        rejected: 0,
        withdrawn: 0,
        superseded: 0,
      };
      for (const item of dashboard.items) statusCounts[item.status]++;

      const normalizedQuery = q.toLocaleLowerCase();
      const filtered = dashboard.items.filter((item) => {
        if (type !== 'all' && item.kind !== type) return false;
        if (status !== 'all' && item.status !== status) return false;
        if (!normalizedQuery) return true;
        const searchable = [
          item.title,
          item.submission?.url,
          item.submission?.description,
          item.submission?.category,
          ...(item.changes ?? []).flatMap((change) => [
            change.field,
            String(change.new ?? ''),
          ]),
        ]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase();
        return searchable.includes(normalizedQuery);
      });

      filtered.sort((a, b) => {
        const byTime = a.changedAt.getTime() - b.changedAt.getTime();
        if (byTime !== 0) return sort === 'oldest' ? byTime : -byTime;
        if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
        return b.id - a.id;
      });

      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const effectivePage = Math.min(page, totalPages);
      const offset = (effectivePage - 1) * limit;

      res.set('Cache-Control', 'private, no-store');
      return res.json({
        items: filtered.slice(offset, offset + limit),
        pagination: {
          page: effectivePage,
          requestedPage: page,
          limit,
          total,
          totalPages,
        },
        summary: {
          total: dashboard.items.length,
          ...statusCounts,
          ...dashboard.impact,
        },
        definitions: {
          acceptedContributions:
            'Resource submissions and edit suggestions that moderators approved.',
          publicResources:
            'Currently public resources you submitted or improved with an approved edit. Each resource is counted once.',
          recordedViews:
            'Distinct signed-in accounts with a recorded resource detail view across those currently public resources. Each account is counted once.',
        },
      });
    } catch (error) {
      console.error('Error fetching contributor dashboard:', error);
      return res.status(500).json({ message: 'Failed to fetch contributions' });
    }
  });

  // Compatibility endpoint for older profile clients. It is still
  // ownership-scoped, but new clients use the paginated safe serializer above.
  app.get('/api/user/submissions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const dashboard = await auditRepo.getContributorDashboardData(userId);
      const resourceItems = dashboard.items.filter((item) => item.kind === 'resource');
      const editItems = dashboard.items.filter((item) => item.kind === 'edit');

      res.set('Cache-Control', 'private, no-store');
      return res.json({
        resources: resourceItems.map((item) => ({
          id: item.id,
          title: item.title,
          url: item.submission?.url,
          description: item.submission?.description,
          category: item.submission?.category,
          status: item.status,
          createdAt: item.submittedAt,
          changedAt: item.changedAt,
          rejectionReason: item.rejectionReason,
          publicResource: item.publicResource,
        })),
        edits: editItems.map((item) => ({
          id: item.id,
          title: item.title,
          status: item.status,
          proposedChanges: Object.fromEntries(
            (item.changes ?? []).map((change) => [
              change.field,
              { old: change.old, new: change.new },
            ]),
          ),
          createdAt: item.submittedAt,
          changedAt: item.changedAt,
          rejectionReason: item.rejectionReason,
          publicResource: item.publicResource,
        })),
        totalResources: resourceItems.length,
        totalEdits: editItems.length,
      });
    } catch (error) {
      console.error('Error fetching user submissions:', error);
      return res.status(500).json({ message: 'Failed to fetch user submissions' });
    }
  });

  const withdrawContribution = async (
    req: any,
    res: Response,
    forcedKind?: 'resource' | 'edit',
  ) => {
    try {
      const userId = req.user.claims.sub;
      const contributionId = parseInt(req.params.id);
      const kind = forcedKind ?? req.params.kind;

      if (!['resource', 'edit'].includes(kind) || isNaN(contributionId)) {
        return res.status(400).json({ message: 'Invalid contribution' });
      }

      if (kind === 'resource') {
        const withdrawn = await resourceRepo.withdrawPendingSubmission(
          contributionId,
          userId,
        );
        if (withdrawn) {
          return res.json({
            message: 'Resource submission withdrawn',
            current: {
              id: withdrawn.id,
              kind,
              status: 'withdrawn',
              changedAt: withdrawn.statusChangedAt,
            },
          });
        }

        const current = await resourceRepo.getResource(contributionId);
        // A missing row and another user's row are intentionally identical:
        // ownership is never disclosed.
        if (!current || current.submittedBy !== userId) {
          return res.status(404).json({ message: 'Contribution not found' });
        }
        const currentStatus = [
          'pending',
          'approved',
          'rejected',
          'withdrawn',
        ].includes(current.status ?? '')
          ? current.status
          : 'superseded';
        return res.status(409).json({
          message: `This contribution is already ${currentStatus}. The timeline has been refreshed.`,
          current: { id: current.id, kind, status: currentStatus },
        });
      }

      const withdrawn = await auditRepo.withdrawPendingResourceEdit(
        contributionId,
        userId,
      );
      if (withdrawn) {
        return res.json({
          message: 'Edit suggestion withdrawn',
          current: {
            id: withdrawn.id,
            kind,
            status: 'withdrawn',
            changedAt: withdrawn.withdrawnAt,
          },
        });
      }

      const current = await auditRepo.getResourceEdit(contributionId);
      if (!current || current.submittedBy !== userId) {
        return res.status(404).json({ message: 'Contribution not found' });
      }
      const dashboard = await auditRepo.getContributorDashboardData(userId);
      const currentItem = dashboard.items.find(
        (item) => item.kind === 'edit' && item.id === contributionId,
      );
      const currentStatus = currentItem?.status ?? current.status;
      return res.status(409).json({
        message: `This contribution is already ${currentStatus}. The timeline has been refreshed.`,
        current: { id: current.id, kind, status: currentStatus },
      });
    } catch (error) {
      console.error('Error withdrawing contribution:', error);
      return res.status(500).json({ message: 'Failed to withdraw contribution' });
    }
  };

  // POST is the canonical action. The old DELETE path remains as a
  // compatibility alias, but now performs the same durable soft withdrawal.
  app.post(
    '/api/user/contributions/:kind(resource|edit)/:id/withdraw',
    isAuthenticated,
    (req, res) => withdrawContribution(req, res),
  );
  app.delete('/api/user/submissions/:id', isAuthenticated, (req, res) => {
    return withdrawContribution(req, res, 'resource');
  });

  // GET /api/user/journeys - Get user's learning journeys with details
  app.get('/api/user/journeys', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // NB-018 (run23): per-user progress must never come from the browser's
      // HTTP cache — Express's default ETag + no Cache-Control let the browser
      // intermittently serve a stale 200 from disk cache, so progress made in
      // another tab/session looked lost until a hard reload.
      res.set('Cache-Control', 'no-store');

      // Get user's journey progress
      const journeyProgress = await learningJourneyRepo.listUserJourneyProgress(userId);

      // Fetch journey details for each progress entry
      const journeysWithDetails = await Promise.all(
        journeyProgress.map(async (progress) => {
          const journey = await learningJourneyRepo.getLearningJourney(progress.journeyId);
          return {
            ...progress,
            journey
          };
        })
      );

      res.json(journeysWithDetails);
    } catch (error) {
      console.error('Error fetching user journeys:', error);
      res.status(500).json({ message: 'Failed to fetch user journeys' });
    }
  });

  // GET /api/user/continue-learning - One bounded, user-scoped resume summary.
  app.get('/api/user/continue-learning', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      res.set('Cache-Control', 'no-store');

      const [progressRows, recentViews, preferences, candidates] = await Promise.all([
        learningJourneyRepo.listContinueLearningProgress(userId, 24),
        userFeatureRepo.getRecentResourceViews(userId, 8),
        userFeatureRepo.getUserPreferences(userId),
        learningJourneyRepo.listContinueLearningCandidates(24),
      ]);

      const stepsByJourney = await learningJourneyRepo.listJourneyStepsBatch(
        progressRows.map(({ progress }) => progress.journeyId),
      );

      const summarized: ContinueLearningJourney[] = progressRows.map(
        ({ progress, journey }) => {
          const completedRowIds = new Set(
            (progress.completedSteps ?? []).map(Number),
          );
          const logical = summarizeLogicalJourneySteps(
            stepsByJourney.get(progress.journeyId) ?? [],
            completedRowIds,
          );
          const isAvailable = journey?.status === 'published';
          const progressPercent = progress.completedAt
            ? 100
            : logical.totalSteps > 0
              ? Math.min(
                  100,
                  Math.round(
                    (logical.completedSteps / logical.totalSteps) * 100,
                  ),
                )
              : 0;
          const nextHref =
            isAvailable && logical.nextStep
              ? `/journey/${progress.journeyId}#step-${logical.nextStep.stepNumber}`
              : isAvailable
                ? `/journey/${progress.journeyId}`
                : '/journeys';

          return {
            progressId: progress.id,
            journeyId: progress.journeyId,
            title: journey?.title || 'Unavailable learning journey',
            description:
              journey?.description ||
              'This journey is no longer available. Browse current journeys to keep learning.',
            category: journey?.category || 'Learning',
            difficulty: journey?.difficulty || 'unknown',
            estimatedDuration: journey?.estimatedDuration ?? null,
            isAvailable,
            totalSteps: logical.totalSteps,
            completedSteps: logical.completedSteps,
            progressPercent,
            startedAt: (progress.startedAt ?? new Date(0)).toISOString(),
            lastAccessedAt: (progress.lastAccessedAt ?? progress.startedAt ?? new Date(0)).toISOString(),
            completedAt: progress.completedAt?.toISOString() ?? null,
            href: isAvailable ? `/journey/${progress.journeyId}` : '/journeys',
            nextStep:
              isAvailable && logical.nextStep
                ? {
                    ...logical.nextStep,
                    href: nextHref,
                  }
                : null,
          };
        },
      );

      const activeJourneys = summarized.filter((item) => !item.completedAt);
      const completedMilestones = summarized
        .filter((item) => !!item.completedAt)
        .sort((a, b) => {
          const byCompleted =
            new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime();
          return byCompleted || b.progressId - a.progressId;
        });

      const preferredCategories = (preferences?.preferredCategories ?? [])
        .filter((value) => typeof value === 'string' && !!value.trim())
        .slice(0, 6);
      const learningGoals = (preferences?.learningGoals ?? [])
        .filter((value) => !!value.trim())
        .slice(0, 6);
      const preferredCategorySet = new Set(
        preferredCategories.map((value) => value.trim().toLowerCase()),
      );
      const goalTerms = learningGoals.map((value) => value.trim().toLowerCase());
      const startedJourneyIds = new Set(
        progressRows.map(({ progress }) => progress.journeyId),
      );

      const suggestedJourneys = candidates
        .filter((journey) => !startedJourneyIds.has(journey.id))
        .map((journey) => {
          const categoryMatch = preferredCategorySet.has(
            journey.category.trim().toLowerCase(),
          );
          const skillMatch =
            !!preferences?.skillLevel &&
            journey.difficulty === preferences.skillLevel;
          const searchable =
            `${journey.title} ${journey.description} ${journey.category}`.toLowerCase();
          const goalMatchCount = goalTerms.filter((term) => searchable.includes(term)).length;
          const score =
            (categoryMatch ? 4 : 0) +
            (skillMatch ? 2 : 0) +
            Math.min(goalMatchCount, 2);
          const reason = categoryMatch
            ? `Matches your ${journey.category} interest`
            : goalMatchCount > 0
              ? 'Matches one of your learning goals'
              : skillMatch
                ? `Fits your ${preferences!.skillLevel} level`
                : 'A useful next learning journey';
          return { journey, score, reason };
        })
        .sort((a, b) => {
          return (
            b.score - a.score ||
            (a.journey.orderIndex ?? Number.MAX_SAFE_INTEGER) -
              (b.journey.orderIndex ?? Number.MAX_SAFE_INTEGER) ||
            a.journey.id - b.journey.id
          );
        })
        .slice(0, 3)
        .map(({ journey, reason }) => ({
          journeyId: journey.id,
          title: journey.title,
          description: journey.description,
          category: journey.category,
          difficulty: journey.difficulty || 'beginner',
          estimatedDuration: journey.estimatedDuration ?? null,
          reason,
          href: `/journey/${journey.id}`,
        }));

      const summary: ContinueLearningSummary = {
        activeJourneys,
        recentResources: recentViews.map((view) => {
          const isAvailable = view.resource?.status === 'approved';
          return {
            resourceId: view.resourceId,
            title: view.resource?.title || 'Unavailable resource',
            category: view.resource?.category || 'Resource',
            viewedAt: view.viewedAt.toISOString(),
            isAvailable,
            href: isAvailable ? `/resource/${view.resourceId}` : '/search',
          };
        }),
        completedMilestones,
        suggestedJourneys,
        emptyState: {
          skillLevel: preferences?.skillLevel ?? null,
          preferredCategories,
          learningGoals,
        },
      };

      return res.json(summary);
    } catch (error) {
      console.error('Error fetching Continue Learning summary:', error);
      return res.status(500).json({ message: 'Failed to load your learning summary' });
    }
  });
}

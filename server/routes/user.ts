// User Profile & Progress Routes extracted from registerRoutes (behavior-preserving).
import type { Express } from "express";
import passport from "passport";
import { db } from "../db";
import { comparePassword, hashPassword, validatePassword } from "../passwordUtils";
import { isAuthenticated } from "../session";
import { sql } from "drizzle-orm";
import { auditRepo, learningJourneyRepo, resourceRepo, userFeatureRepo, userRepo } from "./deps";

export function registerUserRoutes(app: Express): void {
  // ============= User Profile & Progress Routes =============

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

      const pwCheck = validatePassword(newPassword);
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

  app.get('/api/user/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Get total resources in catalog
      const totalResourcesResult = await resourceRepo.listResources({ status: 'approved', limit: 1 });
      const totalResources = totalResourcesResult.total;

      // Get user's journey progress to count completed resources
      const journeyProgress = await learningJourneyRepo.listUserJourneyProgress(userId);
      const completedResources = journeyProgress.filter(p => p.completedAt !== null).length;

      // Get current learning path (most recently accessed journey)
      let currentPath: string | undefined;
      if (journeyProgress.length > 0) {
        const latestJourney = journeyProgress[0];
        const journey = await learningJourneyRepo.getLearningJourney(latestJourney.journeyId);
        currentPath = journey?.title;
      }

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
        totalTimeSpent: '0h 0m',
        skillLevel
      };

      res.json(progressData);
    } catch (error) {
      console.error('Error fetching user progress:', error);
      res.status(500).json({ message: 'Failed to fetch user progress' });
    }
  });

  // GET /api/user/submissions - Get user's submitted resources and edits
  app.get('/api/user/submissions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Get user's submitted resources
      const submittedResources = await resourceRepo.listResources({
        userId,
        page: 1,
        limit: 100
      });

      // Get user's suggested edits
      const resourceEdits = await auditRepo.getResourceEditsByUser(userId);

      res.json({
        resources: submittedResources.resources,
        edits: resourceEdits,
        totalResources: submittedResources.total,
        totalEdits: resourceEdits.length
      });
    } catch (error) {
      console.error('Error fetching user submissions:', error);
      res.status(500).json({ message: 'Failed to fetch user submissions' });
    }
  });

  // GET /api/user/journeys - Get user's learning journeys with details
  app.get('/api/user/journeys', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

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

}

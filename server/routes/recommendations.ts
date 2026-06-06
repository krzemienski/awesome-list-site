// AI Recommendation Routes extracted from registerRoutes (behavior-preserving).
import type { Express } from "express";
import { learningPathGenerator } from "../ai/learningPathGenerator";
import { recommendationEngine, UserProfile as AIUserProfile } from "../ai/recommendationEngine";

export function registerRecommendationRoutes(app: Express): void {
  // ============= AI Recommendation Routes =============

  // GET /api/recommendations/init - Initialize recommendation engine
  app.get("/api/recommendations/init", async (req, res) => {
    try {
      res.json({ status: 'ready', message: 'Recommendation engine initialized' });
    } catch (error) {
      console.error('Error initializing recommendations:', error);
      res.status(500).json({ error: 'Failed to initialize recommendations' });
    }
  });

  // GET /api/recommendations - Get personalized recommendations
  app.get("/api/recommendations", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      
      // Create a user profile for anonymous users from query params
      const userProfile: AIUserProfile = {
        userId: 'anonymous',
        preferredCategories: (req.query.categories as string)?.split(',').filter(Boolean) || [],
        skillLevel: (req.query.skillLevel as string || 'intermediate') as 'beginner' | 'intermediate' | 'advanced',
        learningGoals: (req.query.goals as string)?.split(',').filter(Boolean) || [],
        preferredResourceTypes: (req.query.types as string)?.split(',').filter(Boolean) || [],
        timeCommitment: (req.query.timeCommitment as string || 'flexible') as 'daily' | 'weekly' | 'flexible',
        viewHistory: [],
        bookmarks: [],
        completedResources: [],
        ratings: {}
      };

      const result = await recommendationEngine.generateRecommendations(
        userProfile,
        limit,
        false
      );

      res.json(result.recommendations || []);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      res.status(500).json({ error: 'Failed to generate recommendations' });
    }
  });

  // POST /api/recommendations - Get personalized recommendations for authenticated users
  app.post("/api/recommendations", async (req, res) => {
    try {
      const userProfile: AIUserProfile = req.body;
      const limit = parseInt(req.query.limit as string) || 10;
      const forceRefresh = req.query.refresh === 'true';

      const result = await recommendationEngine.generateRecommendations(
        userProfile,
        limit,
        forceRefresh
      );

      res.json(result.recommendations || []);
    } catch (error) {
      console.error('Error generating AI recommendations:', error);
      res.status(500).json({ error: 'Failed to generate recommendations' });
    }
  });

  // POST /api/recommendations/feedback - Record user feedback on recommendations
  app.post("/api/recommendations/feedback", async (req, res) => {
    try {
      const { userId, resourceId, feedback, rating } = req.body;
      
      if (!userId || !resourceId || !feedback) {
        return res.status(400).json({ error: 'userId, resourceId, and feedback are required' });
      }

      // Record the feedback
      await recommendationEngine.recordFeedback(
        userId,
        resourceId,
        feedback as 'clicked' | 'dismissed' | 'completed',
        rating
      );

      res.json({ status: 'success', message: 'Feedback recorded' });
    } catch (error) {
      console.error('Error recording recommendation feedback:', error);
      res.status(500).json({ error: 'Failed to record feedback' });
    }
  });

  // GET /api/learning-paths/suggested - Get suggested learning paths
  app.get("/api/learning-paths/suggested", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      
      // Create a basic user profile from query params
      const userProfile: AIUserProfile = {
        userId: req.query.userId as string || 'anonymous',
        preferredCategories: (req.query.categories as string)?.split(',') || [],
        skillLevel: (req.query.skillLevel as string || 'intermediate') as 'beginner' | 'intermediate' | 'advanced',
        learningGoals: (req.query.goals as string)?.split(',') || [],
        preferredResourceTypes: [],
        timeCommitment: (req.query.timeCommitment as string || 'flexible') as 'daily' | 'weekly' | 'flexible',
        viewHistory: [],
        bookmarks: [],
        completedResources: [],
        ratings: {}
      };

      const paths = await learningPathGenerator.getSuggestedPaths(userProfile, limit);
      
      res.json(paths);
    } catch (error) {
      console.error('Error generating suggested learning paths:', error);
      res.status(500).json({ error: 'Failed to generate suggested learning paths' });
    }
  });

  // POST /api/learning-paths/generate - Generate custom learning path
  app.post("/api/learning-paths/generate", async (req, res) => {
    try {
      const { userProfile, category, customGoals } = req.body;
      
      if (!userProfile) {
        return res.status(400).json({ error: 'User profile is required' });
      }

      const path = await learningPathGenerator.generateLearningPath(
        userProfile,
        category,
        customGoals
      );

      res.json(path);
    } catch (error) {
      console.error('Error generating custom learning path:', error);
      res.status(500).json({ error: 'Failed to generate custom learning path' });
    }
  });

  // POST /api/learning-paths - Legacy route for compatibility
  app.post("/api/learning-paths", async (req, res) => {
    try {
      const userProfile: AIUserProfile = req.body;
      const limit = parseInt(req.query.limit as string) || 5;

      const paths = await learningPathGenerator.getSuggestedPaths(userProfile, limit);
      
      res.json(paths);
    } catch (error) {
      console.error('Error generating AI learning paths:', error);
      res.status(500).json({ error: 'Failed to generate learning paths' });
    }
  });

  // Track user interaction for improving recommendations
  app.post("/api/interactions", async (req, res) => {
    try {
      const { userId, resourceId, interactionType, interactionValue, metadata } = req.body;
      
      // Store interaction data (in a real app, this would go to database)
      // For now, we'll just acknowledge the interaction
      console.log(`User interaction: ${userId} ${interactionType} ${resourceId}`);
      
      res.json({ status: "recorded" });
    } catch (error) {
      console.error('Error recording interaction:', error);
      res.status(500).json({ error: 'Failed to record interaction' });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // JSON 404 fallback for unmatched /api/* routes.
  // Must be registered after all other /api/* handlers so it only catches
  // requests that no real route handled. Without this, unknown /api paths
  // would fall through to Vite's HTML catch-all and return a 200 with the
  // React app's HTML, masking client routing typos.
}

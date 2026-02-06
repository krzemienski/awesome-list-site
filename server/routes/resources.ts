/**
 * ============================================================================
 * RESOURCES ROUTES - Resource CRUD Operations
 * ============================================================================
 *
 * This module handles all /api/resources/* endpoints for managing video resources.
 *
 * PUBLIC ROUTES:
 * - GET /api/resources - List approved resources with pagination and filtering
 * - GET /api/resources/check-url - Check if a URL already exists
 * - GET /api/resources/:id - Get a single resource by ID
 * - GET /api/resources/:id/related - Get AI-powered similar resources
 *
 * AUTHENTICATED ROUTES:
 * - POST /api/resources - Submit a new resource (requires auth)
 * - POST /api/resources/:id/edits - Submit edit suggestion (requires auth)
 *
 * ADMIN ROUTES:
 * - GET /api/resources/pending - List pending resources (admin only)
 * - PUT /api/resources/:id/approve - Approve a resource (admin only)
 * - PUT /api/resources/:id/reject - Reject a resource (admin only)
 *
 * ============================================================================
 */

import type { Express, Response } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { insertResourceSchema } from "@shared/schema";
import { z } from "zod";
import { recommendationEngine, UserProfile as AIUserProfile } from "../ai/recommendationEngine";
import { claudeService } from "../ai/claudeService";

// Middleware to check if user is admin
const isAdmin = async (req: any, res: Response, next: any) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await storage.getUser(userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: "Error checking admin status" });
  }
};

/**
 * Register all resource routes on the Express app
 */
export function registerResourceRoutes(app: Express) {
  // GET /api/resources - List approved resources (public)
  app.get('/api/resources', async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const category = req.query.category as string;
      const subcategory = req.query.subcategory as string;
      const search = req.query.search as string;

      const result = await storage.listResources({
        page,
        limit,
        status: 'approved',
        category,
        subcategory,
        search
      });

      res.json(result);
    } catch (error) {
      console.error('Error fetching resources:', error);
      res.status(500).json({ message: 'Failed to fetch resources' });
    }
  });

  // GET /api/resources/check-url - Check if URL already exists (public)
  app.get('/api/resources/check-url', async (req, res) => {
    try {
      const url = req.query.url as string;

      if (!url) {
        return res.status(400).json({ message: 'URL parameter is required' });
      }

      const existingResource = await storage.getResourceByUrl(url);

      if (existingResource) {
        return res.json({
          exists: true,
          resource: {
            id: existingResource.id,
            title: existingResource.title,
            status: existingResource.status,
            category: existingResource.category,
            subcategory: existingResource.subcategory
          }
        });
      }

      res.json({ exists: false });
    } catch (error) {
      console.error('Error checking URL:', error);
      res.status(500).json({ message: 'Failed to check URL' });
    }
  });

  // GET /api/resources/:id - Get single resource
  app.get('/api/resources/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const resource = await storage.getResource(id);

      if (!resource) {
        return res.status(404).json({ message: 'Resource not found' });
      }

      res.json(resource);
    } catch (error) {
      console.error('Error fetching resource:', error);
      res.status(500).json({ message: 'Failed to fetch resource' });
    }
  });

  // GET /api/resources/:id/related - Get AI-powered similar resources
  app.get('/api/resources/:id/related', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string) || 5;

      // Get the source resource
      const resource = await storage.getResource(id);
      if (!resource) {
        return res.status(404).json({ message: 'Resource not found' });
      }

      // Create a synthetic user profile based on the resource's attributes
      const userProfile: AIUserProfile = {
        userId: 'anonymous',
        preferredCategories: resource.category ? [resource.category] : [],
        skillLevel: 'intermediate',
        learningGoals: [],
        preferredResourceTypes: [],
        timeCommitment: 'flexible',
        viewHistory: [resource.url], // Exclude this resource from results
        bookmarks: [],
        completedResources: [],
        ratings: {}
      };

      // Generate recommendations
      const result = await recommendationEngine.generateRecommendations(
        userProfile,
        limit + 1, // Request one more to account for filtering
        false
      );

      // Filter out the source resource and limit results
      const relatedResources = result.recommendations
        .filter(rec => rec.resource.id !== id)
        .slice(0, limit)
        .map(rec => ({
          ...rec.resource,
          score: rec.confidence,
          reasons: [rec.reason]
        }));

      res.json({ resources: relatedResources });
    } catch (error) {
      console.error('Error fetching related resources:', error);
      res.status(500).json({ message: 'Failed to fetch related resources' });
    }
  });

  // POST /api/resources - Submit new resource (authenticated)
  app.post('/api/resources', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const resourceData = insertResourceSchema.parse(req.body);

      const resource = await storage.createResource({
        ...resourceData,
        submittedBy: userId,
        status: 'pending'
      });

      res.status(201).json(resource);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid resource data', errors: error.errors });
      }
      console.error('Error creating resource:', error);
      res.status(500).json({ message: 'Failed to create resource' });
    }
  });

  // GET /api/resources/pending - List pending resources (admin only)
  app.get('/api/resources/pending', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await storage.listResources({
        page,
        limit,
        status: 'pending'
      });

      res.json(result);
    } catch (error) {
      console.error('Error fetching pending resources:', error);
      res.status(500).json({ message: 'Failed to fetch pending resources' });
    }
  });

  // PUT /api/resources/:id/approve - Approve resource (admin)
  app.put('/api/resources/:id/approve', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;

      const resource = await storage.updateResourceStatus(id, 'approved', userId);
      res.json(resource);
    } catch (error) {
      console.error('Error approving resource:', error);
      res.status(500).json({ message: 'Failed to approve resource' });
    }
  });

  // PUT /api/resources/:id/reject - Reject resource (admin)
  app.put('/api/resources/:id/reject', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;

      const resource = await storage.updateResourceStatus(id, 'rejected', userId);
      res.json(resource);
    } catch (error) {
      console.error('Error rejecting resource:', error);
      res.status(500).json({ message: 'Failed to reject resource' });
    }
  });

  // POST /api/resources/:id/edits - Submit edit suggestion for a resource (authenticated)
  app.post('/api/resources/:id/edits', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const resourceId = parseInt(req.params.id);
      const { proposedChanges, proposedData, claudeMetadata, triggerClaudeAnalysis } = req.body;

      if (isNaN(resourceId)) {
        return res.status(400).json({ message: 'Invalid resource ID' });
      }

      const resource = await storage.getResource(resourceId);
      if (!resource) {
        return res.status(404).json({ message: 'Resource not found' });
      }

      if (!proposedChanges || !proposedData) {
        return res.status(400).json({ message: 'proposedChanges and proposedData are required' });
      }

      // SECURITY FIX: Whitelist of editable fields only (ISSUE 1)
      const EDITABLE_FIELDS = ['title', 'description', 'url', 'tags', 'category', 'subcategory', 'subSubcategory'];

      // Sanitize proposedData - only allow whitelisted fields
      const sanitizedProposedData: Record<string, any> = {};
      for (const field of EDITABLE_FIELDS) {
        if (proposedData && field in proposedData) {
          sanitizedProposedData[field] = proposedData[field];
        }
      }

      // Sanitize proposedChanges
      const sanitizedChanges: Record<string, any> = {};
      for (const field of EDITABLE_FIELDS) {
        if (proposedChanges && field in proposedChanges) {
          sanitizedChanges[field] = proposedChanges[field];
        }
      }

      // SECURITY FIX: Validate field sizes (ISSUE 5)
      if (sanitizedProposedData.title && sanitizedProposedData.title.length > 200) {
        return res.status(400).json({ message: 'Title too long (max 200 characters)' });
      }

      if (sanitizedProposedData.description && sanitizedProposedData.description.length > 2000) {
        return res.status(400).json({ message: 'Description too long (max 2000 characters)' });
      }

      if (sanitizedProposedData.tags && Array.isArray(sanitizedProposedData.tags) && sanitizedProposedData.tags.length > 20) {
        return res.status(400).json({ message: 'Too many tags (max 20)' });
      }

      let aiMetadata = claudeMetadata;
      if (triggerClaudeAnalysis && resource.url) {
        try {
          aiMetadata = await claudeService.analyzeURL(resource.url);
        } catch (error) {
          console.error('Error analyzing URL with Claude:', error);
        }
      }

      // Use sanitized versions in createResourceEdit call
      const edit = await storage.createResourceEdit({
        resourceId,
        submittedBy: userId,
        status: 'pending',
        originalResourceUpdatedAt: resource.updatedAt ?? new Date(),
        proposedChanges: sanitizedChanges,
        proposedData: sanitizedProposedData,
        claudeMetadata: aiMetadata,
        claudeAnalyzedAt: aiMetadata ? new Date() : undefined,
      });

      res.status(201).json(edit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid edit data', errors: error.errors });
      }
      console.error('Error creating edit suggestion:', error);
      res.status(500).json({ message: 'Failed to create edit suggestion' });
    }
  });
}

/**
 * ============================================================================
 * RESOURCES MODULE ROUTES - Resource Management Endpoints
 * ============================================================================
 *
 * This module defines all resource-related API endpoints including CRUD
 * operations, approval workflows, and edit suggestions.
 *
 * ENDPOINTS:
 * - GET  /api/resources           - List resources with pagination and filters (public)
 * - GET  /api/resources/check-url - Check if URL already exists (public)
 * - GET  /api/resources/pending   - List pending resources (admin only)
 * - GET  /api/resources/:id       - Get single resource by ID (public)
 * - POST /api/resources           - Submit new resource (authenticated)
 * - POST /api/resources/:id/edits - Submit edit suggestion (authenticated)
 * - PUT  /api/resources/:id/approve - Approve pending resource (admin)
 * - PUT  /api/resources/:id/reject  - Reject pending resource (admin)
 *
 * AUTHENTICATION:
 * - Public routes: listing, viewing, URL checking
 * - Auth required: creating resources, submitting edits
 * - Admin required: approval/rejection, viewing pending resources
 *
 * RESOURCE LIFECYCLE:
 * 1. User submits resource → status: 'pending'
 * 2. Admin reviews → approve or reject
 * 3. Approved resources appear in public lists
 * 4. Users can suggest edits to existing resources
 *
 * VALIDATION:
 * - URL format and uniqueness checking
 * - Required fields enforcement via Zod schema
 * - Tag limits and description length constraints
 * - Security field whitelisting for edits
 *
 * ERROR HANDLING:
 * - 400 Bad Request: Invalid data or validation errors
 * - 401 Unauthorized: Authentication required
 * - 403 Forbidden: Admin access required
 * - 404 Not Found: Resource doesn't exist
 * - 500 Internal Server Error: Server-side errors
 *
 * See /docs/API.md for complete endpoint documentation.
 * ============================================================================
 */

import type { Express, Response } from 'express';
import type { AuthenticatedRequest, Module } from '../types';
import { storage } from '../../storage';
import { isAuthenticated, isAdmin, sendError, sendSuccess } from '../middleware';
import { insertResourceSchema } from '@shared/schema';
import { z } from 'zod';
import { claudeService } from '../../ai/claudeService';

/**
 * GET /api/resources - List resources with pagination and filters
 *
 * Supports filtering by category, subcategory, search term, and status.
 * Returns paginated results with total count.
 *
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - category: Filter by category slug
 * - subcategory: Filter by subcategory slug
 * - search: Full-text search term
 *
 * @returns 200 - Paginated list of resources
 * @returns 500 - Server error
 */
async function listResources(req: AuthenticatedRequest, res: Response) {
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
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to fetch resources', error);
  }
}

/**
 * GET /api/resources/check-url - Check if URL already exists
 *
 * Used for duplicate detection when submitting new resources.
 * Returns resource details if URL exists.
 *
 * Query params:
 * - url: The URL to check (required)
 *
 * @returns 200 - { exists: boolean, resource?: object }
 * @returns 400 - Missing URL parameter
 * @returns 500 - Server error
 */
async function checkUrl(req: AuthenticatedRequest, res: Response) {
  try {
    const url = req.query.url as string;

    if (!url) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'URL parameter is required');
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
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to check URL', error);
  }
}

/**
 * GET /api/resources/:id - Get single resource by ID
 *
 * Returns complete resource details including metadata.
 *
 * @param id - Resource ID (path parameter)
 * @returns 200 - Resource object
 * @returns 404 - Resource not found
 * @returns 500 - Server error
 */
async function getResource(req: AuthenticatedRequest, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const resource = await storage.getResource(id);

    if (!resource) {
      return sendError(res, 404, 'NOT_FOUND', 'Resource not found');
    }

    res.json(resource);
  } catch (error) {
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to fetch resource', error);
  }
}

/**
 * POST /api/resources - Submit new resource
 *
 * Creates a new resource with status 'pending' for admin review.
 * Requires authentication.
 *
 * @body Resource data (validated via insertResourceSchema)
 * @returns 201 - Created resource
 * @returns 400 - Validation error
 * @returns 401 - Not authenticated
 * @returns 500 - Server error
 */
async function createResource(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.claims?.sub;

    if (!userId) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    }

    const resourceData = insertResourceSchema.parse(req.body);

    const resource = await storage.createResource({
      ...resourceData,
      submittedBy: userId,
      status: 'pending'
    });

    res.status(201).json(resource);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid resource data', error.errors);
    }
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to create resource', error);
  }
}

/**
 * GET /api/resources/pending - List pending resources
 *
 * Returns resources awaiting admin approval.
 * Admin-only endpoint.
 *
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 *
 * @returns 200 - Paginated list of pending resources
 * @returns 401 - Not authenticated
 * @returns 403 - Not admin
 * @returns 500 - Server error
 */
async function listPendingResources(req: AuthenticatedRequest, res: Response) {
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
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to fetch pending resources', error);
  }
}

/**
 * PUT /api/resources/:id/approve - Approve pending resource
 *
 * Changes resource status from 'pending' to 'approved'.
 * Admin-only endpoint.
 *
 * @param id - Resource ID (path parameter)
 * @returns 200 - Updated resource
 * @returns 401 - Not authenticated
 * @returns 403 - Not admin
 * @returns 500 - Server error
 */
async function approveResource(req: AuthenticatedRequest, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const userId = req.user?.claims?.sub;

    if (!userId) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    }

    const resource = await storage.updateResourceStatus(id, 'approved', userId);
    res.json(resource);
  } catch (error) {
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to approve resource', error);
  }
}

/**
 * PUT /api/resources/:id/reject - Reject pending resource
 *
 * Changes resource status from 'pending' to 'rejected'.
 * Admin-only endpoint.
 *
 * @param id - Resource ID (path parameter)
 * @returns 200 - Updated resource
 * @returns 401 - Not authenticated
 * @returns 403 - Not admin
 * @returns 500 - Server error
 */
async function rejectResource(req: AuthenticatedRequest, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const userId = req.user?.claims?.sub;

    if (!userId) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    }

    const resource = await storage.updateResourceStatus(id, 'rejected', userId);
    res.json(resource);
  } catch (error) {
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to reject resource', error);
  }
}

/**
 * POST /api/resources/:id/edits - Submit edit suggestion for resource
 *
 * Allows authenticated users to propose changes to existing resources.
 * Edits go through approval workflow similar to new resources.
 *
 * Security features:
 * - Field whitelisting (only editable fields allowed)
 * - Field size validation
 * - Optional Claude AI analysis
 *
 * @param id - Resource ID (path parameter)
 * @body proposedChanges - Object with changed fields
 * @body proposedData - Complete proposed resource data
 * @body claudeMetadata - Optional AI analysis metadata
 * @body triggerClaudeAnalysis - Whether to analyze URL with Claude
 *
 * @returns 201 - Created edit suggestion
 * @returns 400 - Validation error or invalid data
 * @returns 401 - Not authenticated
 * @returns 404 - Resource not found
 * @returns 500 - Server error
 */
async function createResourceEdit(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.claims?.sub;

    if (!userId) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    }

    const resourceId = parseInt(req.params.id);
    const { proposedChanges, proposedData, claudeMetadata, triggerClaudeAnalysis } = req.body;

    if (isNaN(resourceId)) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid resource ID');
    }

    const resource = await storage.getResource(resourceId);
    if (!resource) {
      return sendError(res, 404, 'NOT_FOUND', 'Resource not found');
    }

    if (!proposedChanges || !proposedData) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'proposedChanges and proposedData are required');
    }

    // SECURITY: Whitelist of editable fields only
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

    // SECURITY: Validate field sizes
    if (sanitizedProposedData.title && sanitizedProposedData.title.length > 200) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Title too long (max 200 characters)');
    }

    if (sanitizedProposedData.description && sanitizedProposedData.description.length > 2000) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Description too long (max 2000 characters)');
    }

    if (sanitizedProposedData.tags && Array.isArray(sanitizedProposedData.tags) && sanitizedProposedData.tags.length > 20) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Too many tags (max 20)');
    }

    // Optional Claude AI analysis
    let aiMetadata = claudeMetadata;
    if (triggerClaudeAnalysis && resource.url) {
      try {
        aiMetadata = await claudeService.analyzeURL(resource.url);
      } catch (error) {
        // Non-fatal: continue without AI metadata if analysis fails
      }
    }

    // Create edit suggestion with sanitized data
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
      return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid edit data', error.errors);
    }
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to create edit suggestion', error);
  }
}

/**
 * Register all resource routes with the Express app
 *
 * Routes are registered in order:
 * 1. Special routes first (check-url, pending) to avoid path conflicts
 * 2. Public routes (list, get)
 * 3. Authenticated routes (create, edit)
 * 4. Admin routes (approve, reject)
 *
 * @param app - Express application instance
 */
function registerRoutes(app: Express): void {
  // Public routes
  app.get('/api/resources', listResources);
  app.get('/api/resources/check-url', checkUrl);

  // Admin routes (must come before /:id to avoid route conflicts)
  app.get('/api/resources/pending', isAuthenticated, isAdmin, listPendingResources);

  // Public single resource route
  app.get('/api/resources/:id', getResource);

  // Authenticated routes
  app.post('/api/resources', isAuthenticated, createResource);
  app.post('/api/resources/:id/edits', isAuthenticated, createResourceEdit);

  // Admin approval routes
  app.put('/api/resources/:id/approve', isAuthenticated, isAdmin, approveResource);
  app.put('/api/resources/:id/reject', isAuthenticated, isAdmin, rejectResource);

  console.log('[Resources Module] Routes registered: 8 resource endpoints');
}

/**
 * Resources module export
 * Implements the Module interface for registration with the module system
 */
export const resourcesModule: Module = {
  name: 'resources',
  description: 'Resource management and CRUD operations',
  version: '1.0.0',
  registerRoutes,
};

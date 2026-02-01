/**
 * ============================================================================
 * CATEGORIES MODULE ROUTES - Category Hierarchy Endpoints
 * ============================================================================
 *
 * This module defines all category-related API endpoints for browsing the
 * three-tier category hierarchy used to organize resources.
 *
 * ENDPOINTS:
 * - GET /api/categories          - List all top-level categories (public)
 * - GET /api/subcategories       - List subcategories with optional filter (public)
 * - GET /api/sub-subcategories   - List sub-subcategories with optional filter (public)
 *
 * HIERARCHY STRUCTURE:
 * - Categories (Level 1): Top-level groupings (e.g., "Infrastructure & Delivery")
 * - Subcategories (Level 2): Refinements under categories (e.g., "CDN & Edge Delivery")
 * - Sub-subcategories (Level 3): Specific topics (e.g., "Multi-CDN Solutions")
 *
 * AUTHENTICATION:
 * - All routes are public (no authentication required)
 * - Data is read-only for browsing resources
 *
 * QUERY PARAMETERS:
 * - /api/subcategories?categoryId=123 - Filter subcategories by parent category
 * - /api/sub-subcategories?subcategoryId=456 - Filter by parent subcategory
 *
 * VALIDATION:
 * - ID parameters validated as positive integers
 * - Malformed IDs return 400 Bad Request with detailed error messages
 *
 * ERROR HANDLING:
 * - 400 Bad Request: Invalid query parameters
 * - 500 Internal Server Error: Server-side errors
 *
 * See /docs/API.md for complete endpoint documentation.
 * ============================================================================
 */

import type { Express, Response } from 'express';
import type { AuthenticatedRequest, Module } from '../types';
import { storage } from '../../storage';
import { sendError } from '../middleware';
import { z } from 'zod';

/**
 * GET /api/categories - List all top-level categories
 *
 * Returns all top-level categories in the hierarchy. Each category
 * contains its subcategories and associated resource counts.
 *
 * @returns 200 - Array of category objects with nested subcategories
 * @returns 500 - Server error
 */
async function listCategories(req: AuthenticatedRequest, res: Response) {
  try {
    const categories = await storage.listCategories();
    res.json(categories);
  } catch (error) {
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to fetch categories', error);
  }
}

/**
 * GET /api/subcategories - List subcategories
 *
 * Returns subcategories, optionally filtered by parent category ID.
 * If no categoryId is provided, returns all subcategories.
 *
 * Query params:
 * - categoryId: Optional parent category ID (must be positive integer)
 *
 * @returns 200 - Array of subcategory objects
 * @returns 400 - Invalid categoryId parameter
 * @returns 500 - Server error
 */
async function listSubcategories(req: AuthenticatedRequest, res: Response) {
  try {
    let categoryId: number | undefined = undefined;

    // Validate categoryId query parameter if provided
    if (req.query.categoryId) {
      const categoryIdSchema = z.string().regex(/^\d+$/, "categoryId must be a valid number");
      const validation = categoryIdSchema.safeParse(req.query.categoryId);

      if (!validation.success) {
        return sendError(
          res,
          400,
          'VALIDATION_ERROR',
          'Invalid categoryId parameter',
          validation.error.errors
        );
      }

      categoryId = parseInt(validation.data);

      if (isNaN(categoryId) || categoryId < 1) {
        return sendError(
          res,
          400,
          'VALIDATION_ERROR',
          'categoryId must be a positive number'
        );
      }
    }

    const subcategories = await storage.listSubcategories(categoryId);
    res.json(subcategories);
  } catch (error) {
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to fetch subcategories', error);
  }
}

/**
 * GET /api/sub-subcategories - List sub-subcategories
 *
 * Returns sub-subcategories (level 3), optionally filtered by parent
 * subcategory ID. If no subcategoryId is provided, returns all.
 *
 * Query params:
 * - subcategoryId: Optional parent subcategory ID (must be positive integer)
 *
 * @returns 200 - Array of sub-subcategory objects
 * @returns 400 - Invalid subcategoryId parameter
 * @returns 500 - Server error
 */
async function listSubSubcategories(req: AuthenticatedRequest, res: Response) {
  try {
    let subcategoryId: number | undefined = undefined;

    // Validate subcategoryId query parameter if provided
    if (req.query.subcategoryId) {
      const subcategoryIdSchema = z.string().regex(/^\d+$/, "subcategoryId must be a valid number");
      const validation = subcategoryIdSchema.safeParse(req.query.subcategoryId);

      if (!validation.success) {
        return sendError(
          res,
          400,
          'VALIDATION_ERROR',
          'Invalid subcategoryId parameter',
          validation.error.errors
        );
      }

      subcategoryId = parseInt(validation.data);

      if (isNaN(subcategoryId) || subcategoryId < 1) {
        return sendError(
          res,
          400,
          'VALIDATION_ERROR',
          'subcategoryId must be a positive number'
        );
      }
    }

    const subSubcategories = await storage.listSubSubcategories(subcategoryId);
    res.json(subSubcategories);
  } catch (error) {
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to fetch sub-subcategories', error);
  }
}

/**
 * Register all category routes with the Express app
 *
 * All routes are public (no authentication required) and support
 * hierarchical browsing of the three-tier category structure.
 *
 * @param app - Express application instance
 */
function registerRoutes(app: Express): void {
  // Public category routes
  app.get('/api/categories', listCategories);
  app.get('/api/subcategories', listSubcategories);
  app.get('/api/sub-subcategories', listSubSubcategories);

  console.log('[Categories Module] Routes registered: GET /api/categories, /api/subcategories, /api/sub-subcategories');
}

/**
 * Categories module export
 * Implements the Module interface for registration with the module system
 */
export const categoriesModule: Module = {
  name: 'categories',
  description: 'Category hierarchy browsing and management',
  version: '1.0.0',
  registerRoutes,
};

/**
 * ============================================================================
 * PUBLIC.TS - Public API Routes Module
 * ============================================================================
 *
 * This module contains all public-facing API endpoints that can be accessed
 * by developers using API keys. These endpoints provide read-only access to
 * approved resources, categories, and tags.
 *
 * FEATURES:
 * - Rate-limited access (60 requests/hour for free tier by default)
 * - API key authentication support (optional, can also be accessed without auth)
 * - Pagination support for resource listings
 * - Search and filtering capabilities
 *
 * ENDPOINTS:
 * - GET /api/public/resources - List approved resources with pagination and filters
 * - GET /api/public/resources/:id - Get a single approved resource by ID
 * - GET /api/public/categories - List all categories with hierarchy
 * - GET /api/public/tags - List all tags with usage counts
 *
 * AUTHENTICATION:
 * - These routes can be accessed without authentication
 * - API keys can be used for higher rate limits (via requireApiKey middleware)
 * - All routes are rate-limited to prevent abuse
 *
 * See /docs/API.md and /api/docs for complete API documentation.
 * ============================================================================
 */

import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { freeTierLimiter } from "../middleware/rateLimit";

/**
 * Register all public API routes
 *
 * This function sets up the public API endpoints that external developers
 * can use to access resource data programmatically.
 *
 * @param app - Express application instance
 */
export function registerPublicApiRoutes(app: Express): void {
  // ============= Public Resource Routes =============

  /**
   * @swagger
   * /api/public/resources:
   *   get:
   *     summary: List approved resources
   *     description: Retrieve a paginated list of approved resources with optional filtering and search
   *     tags:
   *       - Resources
   *     security:
   *       - BearerAuth: []
   *       - {}
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: Page number (starts at 1)
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *         description: Items per page (max 100)
   *       - in: query
   *         name: category
   *         schema:
   *           type: string
   *         description: Filter by category name
   *       - in: query
   *         name: subcategory
   *         schema:
   *           type: string
   *         description: Filter by subcategory name
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Search query for title/description
   *     responses:
   *       200:
   *         description: Successful response with paginated resources
   *         headers:
   *           RateLimit-Limit:
   *             description: Maximum requests per hour
   *             schema:
   *               type: integer
   *           RateLimit-Remaining:
   *             description: Remaining requests in current window
   *             schema:
   *               type: integer
   *           RateLimit-Reset:
   *             description: Time when rate limit resets (Unix timestamp)
   *             schema:
   *               type: integer
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/PaginatedResourcesResponse'
   *       400:
   *         description: Bad request (invalid parameters)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       429:
   *         description: Too many requests (rate limit exceeded)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *
   * GET /api/public/resources
   * List approved resources with pagination, search, and filtering
   *
   * Query Parameters:
   * - page: Page number (default: 1)
   * - limit: Items per page (default: 20, max: 100)
   * - category: Filter by category name
   * - subcategory: Filter by subcategory name
   * - search: Search query for title/description
   *
   * Response:
   * {
   *   resources: Resource[],
   *   total: number,
   *   page: number,
   *   limit: number,
   *   totalPages: number
   * }
   */
  app.get('/api/public/resources', freeTierLimiter, async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
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
      console.error('Error fetching public resources:', error);
      res.status(500).json({ message: 'Failed to fetch resources' });
    }
  });

  /**
   * @swagger
   * /api/public/resources/{id}:
   *   get:
   *     summary: Get resource by ID
   *     description: Retrieve a single approved resource by its ID
   *     tags:
   *       - Resources
   *     security:
   *       - BearerAuth: []
   *       - {}
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Resource ID
   *     responses:
   *       200:
   *         description: Successful response with resource details
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Resource'
   *       400:
   *         description: Invalid resource ID
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: Resource not found or not approved
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       429:
   *         description: Too many requests (rate limit exceeded)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *
   * GET /api/public/resources/:id
   * Get a single approved resource by ID
   *
   * Path Parameters:
   * - id: Resource ID
   *
   * Response:
   * - 200: Resource object
   * - 404: Resource not found or not approved
   * - 500: Server error
   */
  app.get('/api/public/resources/:id', freeTierLimiter, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid resource ID' });
      }

      const resource = await storage.getResource(id);

      if (!resource) {
        return res.status(404).json({ message: 'Resource not found' });
      }

      // Only return approved resources via public API
      if (resource.status !== 'approved') {
        return res.status(404).json({ message: 'Resource not found' });
      }

      res.json(resource);
    } catch (error) {
      console.error('Error fetching public resource:', error);
      res.status(500).json({ message: 'Failed to fetch resource' });
    }
  });

  // ============= Public Category Routes =============

  /**
   * @swagger
   * /api/public/categories:
   *   get:
   *     summary: List all categories
   *     description: Retrieve all categories with their hierarchy
   *     tags:
   *       - Categories
   *     security:
   *       - BearerAuth: []
   *       - {}
   *     responses:
   *       200:
   *         description: Successful response with categories list
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/CategoriesResponse'
   *       429:
   *         description: Too many requests (rate limit exceeded)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *
   * GET /api/public/categories
   * List all categories with their hierarchy
   *
   * Response:
   * {
   *   categories: Category[]
   * }
   */
  app.get('/api/public/categories', freeTierLimiter, async (req: Request, res: Response) => {
    try {
      const categories = await storage.listCategories();
      res.json({ categories });
    } catch (error) {
      console.error('Error fetching public categories:', error);
      res.status(500).json({ message: 'Failed to fetch categories' });
    }
  });

  // ============= Public Tag Routes =============

  /**
   * @swagger
   * /api/public/tags:
   *   get:
   *     summary: List all tags
   *     description: Retrieve all tags with usage counts
   *     tags:
   *       - Tags
   *     security:
   *       - BearerAuth: []
   *       - {}
   *     responses:
   *       200:
   *         description: Successful response with tags list
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/TagsResponse'
   *       429:
   *         description: Too many requests (rate limit exceeded)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *
   * GET /api/public/tags
   * List all tags with usage counts
   *
   * Response:
   * {
   *   tags: Tag[]
   * }
   */
  app.get('/api/public/tags', freeTierLimiter, async (req: Request, res: Response) => {
    try {
      const tags = await storage.listTags();
      res.json({ tags });
    } catch (error) {
      console.error('Error fetching public tags:', error);
      res.status(500).json({ message: 'Failed to fetch tags' });
    }
  });
}

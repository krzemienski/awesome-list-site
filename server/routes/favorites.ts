/**
 * ============================================================================
 * FAVORITES ROUTES - User Favorites Management
 * ============================================================================
 *
 * Endpoints for managing user favorite resources.
 * All routes require authentication.
 *
 * ROUTES:
 * - POST /:resourceId - Add resource to favorites
 * - DELETE /:resourceId - Remove resource from favorites
 * - GET / - Get user's favorite resources
 * ============================================================================
 */

import { Router } from "express";
import type { Response } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";

const router = Router();

// POST /:resourceId - Add favorite
router.post('/:resourceId', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const resourceId = parseInt(req.params.resourceId);

    await storage.addFavorite(userId, resourceId);
    res.json({ message: 'Favorite added successfully' });
  } catch (error) {
    console.error('Error adding favorite:', error);
    res.status(500).json({ message: 'Failed to add favorite' });
  }
});

// DELETE /:resourceId - Remove favorite
router.delete('/:resourceId', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const resourceId = parseInt(req.params.resourceId);

    await storage.removeFavorite(userId, resourceId);
    res.json({ message: 'Favorite removed successfully' });
  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).json({ message: 'Failed to remove favorite' });
  }
});

// GET / - Get user's favorites
router.get('/', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const favorites = await storage.getUserFavorites(userId);
    res.json(favorites);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ message: 'Failed to fetch favorites' });
  }
});

export default router;

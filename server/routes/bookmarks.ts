/**
 * ============================================================================
 * BOOKMARKS ROUTES - User Bookmarks Management
 * ============================================================================
 *
 * Endpoints for managing user bookmarked resources with optional notes.
 * All routes require authentication.
 *
 * ROUTES:
 * - POST /:resourceId - Add resource to bookmarks
 * - DELETE /:resourceId - Remove resource from bookmarks
 * - GET / - Get user's bookmarked resources
 * ============================================================================
 */

import { Router } from "express";
import type { Response } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";

const router = Router();

// POST /:resourceId - Add bookmark
router.post('/:resourceId', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const resourceId = parseInt(req.params.resourceId);
    const { notes } = req.body;

    await storage.addBookmark(userId, resourceId, notes);
    res.json({ message: 'Bookmark added successfully' });
  } catch (error) {
    console.error('Error adding bookmark:', error);
    res.status(500).json({ message: 'Failed to add bookmark' });
  }
});

// DELETE /:resourceId - Remove bookmark
router.delete('/:resourceId', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const resourceId = parseInt(req.params.resourceId);

    await storage.removeBookmark(userId, resourceId);
    res.json({ message: 'Bookmark removed successfully' });
  } catch (error) {
    console.error('Error removing bookmark:', error);
    res.status(500).json({ message: 'Failed to remove bookmark' });
  }
});

// GET / - Get user's bookmarks
router.get('/', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const bookmarks = await storage.getUserBookmarks(userId);
    res.json(bookmarks);
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    res.status(500).json({ message: 'Failed to fetch bookmarks' });
  }
});

export default router;

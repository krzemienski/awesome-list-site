/**
 * Admin Resource Edit Management Routes
 */
import type { Express } from "express";
import { storage } from "../../storage";
import { isAuthenticated } from "../../replitAuth";
import { isAdmin } from "../auth";

export function registerEditRoutes(app: Express): void {
  // GET /api/admin/resource-edits - Get all pending resource edits (admin only)
  app.get('/api/admin/resource-edits', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const edits = await storage.getPendingResourceEdits();

      const editsWithResources = await Promise.all(
        edits.map(async (edit) => {
          const resource = await storage.getResource(edit.resourceId);
          return {
            ...edit,
            resource
          };
        })
      );

      res.json(editsWithResources);
    } catch (error) {
      console.error('Error fetching pending edits:', error);
      res.status(500).json({ message: 'Failed to fetch pending edits' });
    }
  });

  // POST /api/admin/resource-edits/:id/approve - Approve an edit (admin only)
  app.post('/api/admin/resource-edits/:id/approve', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const editId = parseInt(req.params.id);
      const userId = req.user.claims.sub;

      if (isNaN(editId)) {
        return res.status(400).json({ message: 'Invalid edit ID' });
      }

      await storage.approveResourceEdit(editId, userId);

      res.json({ message: 'Edit approved and merged successfully' });
    } catch (error: any) {
      console.error('Error approving edit:', error);

      if (error.message && error.message.includes('Conflict detected')) {
        return res.status(409).json({
          message: error.message,
          conflict: true
        });
      }

      res.status(500).json({ message: error.message || 'Failed to approve edit' });
    }
  });

  // POST /api/admin/resource-edits/:id/reject - Reject an edit (admin only)
  app.post('/api/admin/resource-edits/:id/reject', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const editId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const { reason } = req.body;

      if (isNaN(editId)) {
        return res.status(400).json({ message: 'Invalid edit ID' });
      }

      if (!reason || reason.trim().length < 10) {
        return res.status(400).json({ message: 'Rejection reason is required (minimum 10 characters)' });
      }

      await storage.rejectResourceEdit(editId, userId, reason);

      res.json({ message: 'Edit rejected successfully' });
    } catch (error: any) {
      console.error('Error rejecting edit:', error);
      res.status(500).json({ message: error.message || 'Failed to reject edit' });
    }
  });
}

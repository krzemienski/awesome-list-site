// Resource Edit Management Routes extracted from registerRoutes (behavior-preserving).
import type { Express } from "express";
import { claudeService } from "../ai/claudeService";
import { isAuthenticated } from "../session";
import { auditRepo, isAdmin, resourceRepo } from "./deps";

export function registerResourceEditRoutes(app: Express): void {
  // ============= Resource Edit Management Routes =============
  
  // GET /api/admin/resource-edits - Get all pending resource edits (admin only)
  app.get('/api/admin/resource-edits', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const edits = await auditRepo.getPendingResourceEdits();
      
      const editsWithResources = await Promise.all(
        edits.map(async (edit) => {
          const resource = await resourceRepo.getResource(edit.resourceId);
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
      
      await auditRepo.approveResourceEdit(editId, userId);
      
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
      
      await auditRepo.rejectResourceEdit(editId, userId, reason);
      
      res.json({ message: 'Edit rejected successfully' });
    } catch (error: any) {
      console.error('Error rejecting edit:', error);
      res.status(500).json({ message: error.message || 'Failed to reject edit' });
    }
  });
  
  // POST /api/claude/analyze - Analyze URL with Claude AI (authenticated)
  app.post('/api/claude/analyze', isAuthenticated, async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ message: 'URL is required' });
      }
      
      if (!claudeService.isAvailable()) {
        return res.status(503).json({ 
          message: 'Claude AI service is not available',
          available: false
        });
      }
      
      const analysis = await claudeService.analyzeURL(url);
      
      if (!analysis) {
        return res.status(500).json({ message: 'Failed to analyze URL' });
      }
      
      res.json(analysis);
    } catch (error) {
      console.error('Error analyzing URL:', error);
      res.status(500).json({ message: 'Failed to analyze URL' });
    }
  });

}

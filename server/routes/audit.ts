// Audit Log Routes extracted from registerRoutes (behavior-preserving).
import type { Express } from "express";
import { isAuthenticated } from "../session";
import { auditRepo, isAdmin } from "./deps";

export function registerAuditRoutes(app: Express): void {
  // ============= Audit Log Routes =============

  // GET /api/admin/audit-logs - List audit log entries
  app.get('/api/admin/audit-logs', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const resourceId = req.query.resourceId ? parseInt(req.query.resourceId as string) : null;
      
      const logs = await auditRepo.getResourceAuditLog(
        resourceId && !isNaN(resourceId) ? resourceId : null,
        limit
      );
      res.json({ logs, total: logs.length });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({ message: 'Failed to fetch audit logs' });
    }
  });

}

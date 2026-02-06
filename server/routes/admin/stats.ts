/**
 * Admin Dashboard Statistics Routes
 */
import type { Express } from "express";
import { storage } from "../../storage";
import { isAuthenticated } from "../../replitAuth";
import { isAdmin } from "../auth";

export function registerStatsRoutes(app: Express): void {
  // GET /api/admin/stats - Dashboard statistics
  app.get('/api/admin/stats', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json({
        users: stats.totalUsers,
        resources: stats.totalResources,
        journeys: stats.totalJourneys,
        pendingApprovals: stats.pendingResources,
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      res.status(500).json({ message: 'Failed to fetch admin statistics' });
    }
  });
}

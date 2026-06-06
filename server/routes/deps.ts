// Shared route dependencies: repository singletons + common middleware.
//
// These were previously declared at the top of server/routes.ts. They live
// here so that domain route modules (server/routes/<domain>.ts) can import the
// SAME singleton instances without importing from routes.ts itself — importing
// from routes.ts would create a circular dependency (routes.ts imports the
// domain modules) and risk `undefined` repos at module-init time.
import type { Response } from "express";
import {
  UserRepository,
  ResourceRepository,
  CategoryRepository,
  TagRepository,
  LearningJourneyRepository,
  UserFeatureRepository,
  AuditRepository,
  GithubSyncRepository,
  EnrichmentRepository,
  AdminRepository,
  LegacyRepository,
} from "../repositories";

export const userRepo = new UserRepository();
export const resourceRepo = new ResourceRepository();
export const categoryRepo = new CategoryRepository();
export const tagRepo = new TagRepository();
export const learningJourneyRepo = new LearningJourneyRepository();
export const userFeatureRepo = new UserFeatureRepository();
export const auditRepo = new AuditRepository();
export const githubSyncRepo = new GithubSyncRepository();
export const enrichmentRepo = new EnrichmentRepository();
export const adminRepo = new AdminRepository();
export const legacyRepo = new LegacyRepository();

// Middleware to check if the authenticated user is an admin.
export const isAdmin = async (req: any, res: Response, next: any) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await userRepo.getUser(userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: "Error checking admin status" });
  }
};

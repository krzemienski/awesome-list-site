// Awesome List Export & Validation Routes extracted from registerRoutes (behavior-preserving).
import type { Express } from "express";
import { AwesomeListFormatter } from "../github/formatter";
import { isAuthenticated } from "../session";
import { formatValidationReport, validateAwesomeList } from "../validation/awesomeLint";
import { checkResourceLinks, formatLinkCheckReport } from "../validation/linkChecker";
import { adminRepo, categoryRepo, githubSyncRepo, isAdmin, learningJourneyRepo, resourceRepo, tagRepo, userRepo } from "./deps";

export function registerExportRoutes(app: Express): void {
  // ============= Awesome List Export & Validation Routes =============

  // POST /api/admin/export - Generate and download awesome list markdown
  app.post('/api/admin/export', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      // Get all approved resources
      const resources = await resourceRepo.getAllApprovedResources();
      
      // Get export options from request body
      // NOTE: websiteUrl is undefined by default to avoid including internal dev URLs
      // NOTE: includeLicense defaults to false because awesome-lint forbids inline license sections
      const {
        title = 'Awesome Video',
        description = 'A curated list of awesome video resources, tools, frameworks, and learning materials.',
        includeContributing = false, // References CONTRIBUTING.md which may not exist
        includeLicense = false, // awesome-lint forbids inline license sections
        websiteUrl = undefined, // Don't include dev URLs in exports
        repoUrl = process.env.GITHUB_REPO_URL
      } = req.body;

      // Create formatter with options
      const formatter = new AwesomeListFormatter(resources, {
        title,
        description,
        includeContributing,
        includeLicense,
        websiteUrl,
        repoUrl
      });

      // Generate the markdown
      const markdown = formatter.generate();
      
      // Set headers for file download
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', 'attachment; filename="awesome-list.md"');
      
      res.send(markdown);
    } catch (error) {
      console.error('Error generating awesome list export:', error);
      res.status(500).json({ message: 'Failed to generate awesome list export' });
    }
  });

  // GET /api/admin/export-json - Export full database as JSON for backup
  app.get('/api/admin/export-json', isAuthenticated, isAdmin, async (req, res) => {
    try {
      // Get ALL data from database (not just approved resources)
      const [
        allResources,
        categories,
        subcategories,
        subSubcategories,
        tags,
        learningJourneys,
        syncQueue,
        users
      ] = await Promise.all([
        resourceRepo.listResources({ limit: 100000 }), // Get all resources regardless of status
        categoryRepo.listCategories(),
        categoryRepo.listSubcategories(),
        categoryRepo.listSubSubcategories(),
        tagRepo.listTags(),
        learningJourneyRepo.listLearningJourneys(),
        githubSyncRepo.getGithubSyncQueue(),
        userRepo.listUsers(1, 10000)
      ]);
      
      const resources = allResources.resources;
      const usersList = users.users;

      // Get journey steps for each journey
      const journeyIds = learningJourneys.map((j: any) => j.id);
      const stepsMap = await learningJourneyRepo.listJourneyStepsBatch(journeyIds);
      
      // Attach steps to journeys
      const journeysWithSteps = learningJourneys.map((journey: any) => ({
        ...journey,
        steps: stepsMap.get(journey.id) || []
      }));

      // Build hierarchy structure
      const categoryHierarchy = categories.map((cat: any) => ({
        ...cat,
        subcategories: subcategories
          .filter((sub: any) => sub.categoryId === cat.id)
          .map((sub: any) => ({
            ...sub,
            subSubcategories: subSubcategories.filter(
              (ssub: any) => ssub.subcategoryId === sub.id
            )
          }))
      }));

      // Count resources by status
      const resourcesByStatus = resources.reduce((acc: Record<string, number>, r: any) => {
        acc[r.status || 'unknown'] = (acc[r.status || 'unknown'] || 0) + 1;
        return acc;
      }, {});
      
      // Sanitize users for export (remove sensitive data)
      const sanitizedUsers = usersList.map((u: any) => ({
        id: u.id,
        username: u.username,
        role: u.role,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt
      }));

      const exportData = {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        schema: {
          resources: "id, title, url, description, category, subcategory, subSubcategory, status, submittedBy, approvedBy, approvedAt, githubSynced, lastSyncedAt, metadata, createdAt, updatedAt",
          categories: "id, name, slug",
          subcategories: "id, name, slug, categoryId",
          subSubcategories: "id, name, slug, subcategoryId",
          tags: "id, name, slug",
          learningJourneys: "id, title, description, category, difficulty, estimatedHours, createdBy, createdAt, updatedAt"
        },
        stats: {
          resources: resources.length,
          resourcesByStatus,
          categories: categories.length,
          subcategories: subcategories.length,
          subSubcategories: subSubcategories.length,
          tags: tags.length,
          learningJourneys: learningJourneys.length,
          users: usersList.length,
          syncQueueItems: syncQueue.length
        },
        data: {
          resources,
          categoryHierarchy,
          tags,
          learningJourneys: journeysWithSteps,
          syncQueue,
          users: sanitizedUsers
        }
      };

      // Set headers for JSON download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="awesome-list-backup-${new Date().toISOString().split('T')[0]}.json"`);
      
      res.json(exportData);
    } catch (error) {
      console.error('Error generating JSON export:', error);
      res.status(500).json({ message: 'Failed to generate JSON export' });
    }
  });

  // POST /api/admin/validate - Run awesome-lint validation on current data
  app.post('/api/admin/validate', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      // Get all approved resources
      const resources = await resourceRepo.getAllApprovedResources();
      
      // Get export options from request body
      // NOTE: websiteUrl undefined to avoid including dev URLs; includeLicense false per awesome-lint
      const {
        title = 'Awesome Video',
        description = 'A curated list of awesome video resources, tools, frameworks, and learning materials.',
        includeContributing = false,
        includeLicense = false,
        websiteUrl = undefined,
        repoUrl = process.env.GITHUB_REPO_URL
      } = req.body;

      // Create formatter and generate markdown
      const formatter = new AwesomeListFormatter(resources, {
        title,
        description,
        includeContributing,
        includeLicense,
        websiteUrl,
        repoUrl
      });

      const markdown = formatter.generate();
      
      // Validate the generated markdown
      const validationResult = validateAwesomeList(markdown);
      
      // Store validation result for later retrieval
      await adminRepo.storeValidationResult({
        type: 'awesome-lint',
        result: validationResult,
        markdown,
        timestamp: new Date().toISOString()
      });
      
      // Return validation results
      res.json({
        valid: validationResult.valid,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        stats: validationResult.stats,
        report: formatValidationReport(validationResult)
      });
    } catch (error) {
      console.error('Error validating awesome list:', error);
      res.status(500).json({ message: 'Failed to validate awesome list' });
    }
  });

  // POST /api/admin/check-links - Run link checker on all resources
  app.post('/api/admin/check-links', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      // Get all approved resources
      const resources = await resourceRepo.getAllApprovedResources();
      
      // Get check options from request body
      const {
        timeout = 10000,
        concurrent = 5,
        retryCount = 1
      } = req.body;

      // Prepare resources for link checking
      const resourcesToCheck = resources.map(r => ({
        id: r.id,
        title: r.title,
        url: r.url
      }));

      // Check links
      const linkCheckReport = await checkResourceLinks(resourcesToCheck, {
        timeout,
        concurrent,
        retryCount
      });
      
      // Store link check result for later retrieval
      await adminRepo.storeValidationResult({
        type: 'link-check',
        result: linkCheckReport,
        timestamp: linkCheckReport.timestamp
      });
      
      // Return link check results
      res.json({
        totalLinks: linkCheckReport.totalLinks,
        validLinks: linkCheckReport.validLinks,
        brokenLinks: linkCheckReport.brokenLinks,
        redirects: linkCheckReport.redirects,
        errors: linkCheckReport.errors,
        summary: linkCheckReport.summary,
        report: formatLinkCheckReport(linkCheckReport),
        brokenResources: linkCheckReport.results.filter(r => !r.valid && r.status >= 400)
      });
    } catch (error) {
      console.error('Error checking links:', error);
      res.status(500).json({ message: 'Failed to check links' });
    }
  });

  // GET /api/admin/validation-status - Get last validation results
  app.get('/api/admin/validation-status', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const fn = (adminRepo as any).getLatestValidationResults;
      const validationResults = typeof fn === 'function'
        ? await fn.call(adminRepo)
        : { awesomeLint: null, linkCheck: null, lastUpdated: null };
      res.json({
        awesomeLint: validationResults?.awesomeLint ?? null,
        linkCheck: validationResults?.linkCheck ?? null,
        lastUpdated: validationResults?.lastUpdated ?? null,
      });
    } catch (error) {
      console.error('Error fetching validation status:', error);
      res.json({ awesomeLint: null, linkCheck: null, lastUpdated: null });
    }
  });

}

/**
 * Admin Export & Validation Routes
 */
import type { Express } from "express";
import { storage } from "../../storage";
import { isAuthenticated } from "../../replitAuth";
import { isAdmin } from "../auth";
import { AwesomeListFormatter } from "../../github/formatter";
import { validateAwesomeList, formatValidationReport } from "../../validation/awesomeLint";
import { checkResourceLinks, formatLinkCheckReport } from "../../validation/linkChecker";

export function registerExportRoutes(app: Express): void {
  // POST /api/admin/export - Generate and download awesome list markdown
  app.post('/api/admin/export', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const resources = await storage.getAllApprovedResources();

      const {
        title = 'Awesome Video',
        description = 'A curated list of awesome video resources, tools, frameworks, and learning materials.',
        includeContributing = false,
        includeLicense = false,
        websiteUrl = undefined,
        repoUrl = process.env.GITHUB_REPO_URL
      } = req.body;

      const formatter = new AwesomeListFormatter(resources, {
        title,
        description,
        includeContributing,
        includeLicense,
        websiteUrl,
        repoUrl
      });

      const markdown = formatter.generate();

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
        storage.listResources({ limit: 100000 }),
        storage.listCategories(),
        storage.listSubcategories(),
        storage.listSubSubcategories(),
        storage.listTags(),
        storage.listLearningJourneys(),
        storage.getGithubSyncQueue(),
        storage.listUsers(1, 10000)
      ]);

      const resources = allResources.resources;
      const usersList = users.users;

      const journeyIds = learningJourneys.map((j: any) => j.id);
      const stepsMap = await storage.listJourneyStepsBatch(journeyIds);

      const journeysWithSteps = learningJourneys.map((journey: any) => ({
        ...journey,
        steps: stepsMap.get(journey.id) || []
      }));

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

      const resourcesByStatus = resources.reduce((acc: Record<string, number>, r: any) => {
        acc[r.status || 'unknown'] = (acc[r.status || 'unknown'] || 0) + 1;
        return acc;
      }, {});

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
      const resources = await storage.getAllApprovedResources();

      const {
        title = 'Awesome Video',
        description = 'A curated list of awesome video resources, tools, frameworks, and learning materials.',
        includeContributing = false,
        includeLicense = false,
        websiteUrl = undefined,
        repoUrl = process.env.GITHUB_REPO_URL
      } = req.body;

      const formatter = new AwesomeListFormatter(resources, {
        title,
        description,
        includeContributing,
        includeLicense,
        websiteUrl,
        repoUrl
      });

      const markdown = formatter.generate();
      const validationResult = validateAwesomeList(markdown);

      await storage.storeValidationResult({
        type: 'awesome-lint',
        result: validationResult,
        markdown,
        timestamp: new Date().toISOString()
      });

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
      const resources = await storage.getAllApprovedResources();

      const {
        timeout = 10000,
        concurrent = 5,
        retryCount = 1
      } = req.body;

      const resourcesToCheck = resources.map(r => ({
        id: r.id,
        title: r.title,
        url: r.url
      }));

      const linkCheckReport = await checkResourceLinks(resourcesToCheck, {
        timeout,
        concurrent,
        retryCount
      });

      await storage.storeValidationResult({
        type: 'link-check',
        result: linkCheckReport,
        timestamp: linkCheckReport.timestamp
      });

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
      const validationResults = await storage.getLatestValidationResults();

      res.json({
        awesomeLint: validationResults.awesomeLint || null,
        linkCheck: validationResults.linkCheck || null,
        lastUpdated: validationResults.lastUpdated || null
      });
    } catch (error) {
      console.error('Error fetching validation status:', error);
      res.status(500).json({ message: 'Failed to fetch validation status' });
    }
  });
}

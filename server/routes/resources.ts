// Resource routes: public listing/detail/related, submission, approval, edits.
// Extracted verbatim from registerRoutes. Registration ORDER is load-bearing:
// /api/resources/check-url must precede /api/resources/:id, and
// /api/resources/pending intentionally remains shadowed by :id (pre-existing).
import type { Express } from "express";
import { z } from "zod";
import { insertResourceSchema, EDITABLE_RESOURCE_FIELDS } from "@shared/schema";
import { ensureSubSubcategoryExists } from "../repositories/ensureSubSubcategory";
import { claudeService } from "../ai/claudeService";
import { isAuthenticated } from "../session";
import { resourceRepo, categoryRepo, auditRepo, isAdmin } from "./deps";

export function registerResourceRoutes(app: Express): void {
  // ============= Resource Routes =============
  
  // GET /api/resources - List approved resources (public)
  app.get('/api/resources', async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const category = req.query.category as string;
      const subcategory = req.query.subcategory as string;
      const subSubcategory = req.query.subSubcategory as string;
      const search = req.query.search as string;
      // Tag filter: ?tag=foo OR ?tag=foo,bar (CSV = OR semantics, union).
      const tagRaw = (req.query.tag as string) || undefined;

      const result = await resourceRepo.listResources({
        page,
        limit,
        status: 'approved',
        category,
        subcategory,
        subSubcategory,
        search,
        tag: tagRaw,
      });

      res.json(result);
    } catch (error) {
      console.error('Error fetching resources:', error);
      res.status(500).json({ message: 'Failed to fetch resources' });
    }
  });

  // GET /api/resources/check-url - Check if URL already exists (public)
  app.get('/api/resources/check-url', async (req, res) => {
    try {
      const url = req.query.url as string;

      if (!url) {
        return res.status(400).json({ message: 'URL parameter is required' });
      }

      const existingResource = await resourceRepo.getResourceByUrl(url);

      if (existingResource) {
        return res.json({
          exists: true,
          resource: {
            id: existingResource.id,
            title: existingResource.title,
            status: existingResource.status,
            category: existingResource.category,
            subcategory: existingResource.subcategory
          }
        });
      }

      res.json({ exists: false });
    } catch (error) {
      console.error('Error checking URL:', error);
      res.status(500).json({ message: 'Failed to check URL' });
    }
  });

  // GET /api/resources/:id - Get single resource
  app.get('/api/resources/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(404).json({ message: 'Resource not found' });
      }
      const resource = await resourceRepo.getResource(id);

      if (!resource) {
        return res.status(404).json({ message: 'Resource not found' });
      }

      res.json(resource);
    } catch (error) {
      console.error('Error fetching resource:', error);
      res.status(500).json({ message: 'Failed to fetch resource' });
    }
  });

  app.get('/api/resources/:id/related', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) {
        return res.json({ resources: [] });
      }
      const resource = await resourceRepo.getResource(id);
      if (!resource) {
        return res.json({ resources: [] });
      }
      const { resources: pool } = await resourceRepo.listResources({
        page: 1,
        limit: 7,
        status: 'approved',
        category: resource.category ?? undefined,
      });
      const related = pool.filter(r => r.id !== id).slice(0, 6);
      res.json({ resources: related });
    } catch (error) {
      console.error('Error fetching related resources:', error);
      res.json({ resources: [] });
    }
  });

  // POST /api/resources - Submit new resource (authenticated)
  app.post('/api/resources', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const resourceData = insertResourceSchema.parse(req.body);

      await ensureSubSubcategoryExists(
        categoryRepo,
        resourceData.category,
        resourceData.subcategory,
        resourceData.subSubcategory,
      );

      const resource = await resourceRepo.createResource({
        ...resourceData,
        submittedBy: userId,
        status: 'pending'
      });
      
      res.status(201).json(resource);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid resource data', errors: error.errors });
      }
      console.error('Error creating resource:', error);
      res.status(500).json({ message: 'Failed to create resource' });
    }
  });
  
  // GET /api/resources/pending - List pending resources (admin only)
  app.get('/api/resources/pending', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const result = await resourceRepo.listResources({
        page,
        limit,
        status: 'pending'
      });
      
      res.json(result);
    } catch (error) {
      console.error('Error fetching pending resources:', error);
      res.status(500).json({ message: 'Failed to fetch pending resources' });
    }
  });
  
  // PUT /api/resources/:id/approve - Approve resource (admin)
  app.put('/api/resources/:id/approve', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      const resource = await resourceRepo.updateResourceStatus(id, 'approved', userId);
      res.json(resource);
    } catch (error) {
      console.error('Error approving resource:', error);
      res.status(500).json({ message: 'Failed to approve resource' });
    }
  });
  
  // PUT /api/resources/:id/reject - Reject resource (admin)
  app.put('/api/resources/:id/reject', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      const resource = await resourceRepo.updateResourceStatus(id, 'rejected', userId);
      res.json(resource);
    } catch (error) {
      console.error('Error rejecting resource:', error);
      res.status(500).json({ message: 'Failed to reject resource' });
    }
  });
  
  // POST /api/resources/:id/edits - Submit edit suggestion for a resource (authenticated)
  app.post('/api/resources/:id/edits', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const resourceId = parseInt(req.params.id);
      const { proposedChanges, proposedData, claudeMetadata, triggerClaudeAnalysis } = req.body;
      
      if (isNaN(resourceId)) {
        return res.status(400).json({ message: 'Invalid resource ID' });
      }
      
      const resource = await resourceRepo.getResource(resourceId);
      if (!resource) {
        return res.status(404).json({ message: 'Resource not found' });
      }
      
      if (!proposedChanges || !proposedData) {
        return res.status(400).json({ message: 'proposedChanges and proposedData are required' });
      }
      
      // SECURITY FIX: Whitelist of editable fields only (ISSUE 1)
      // Shared with AuditRepository merge path — see @shared/schema EDITABLE_RESOURCE_FIELDS
      const sanitizedProposedData: Record<string, any> = {};
      for (const field of EDITABLE_RESOURCE_FIELDS) {
        if (proposedData && field in proposedData) {
          sanitizedProposedData[field] = proposedData[field];
        }
      }
      
      // Sanitize proposedChanges
      const sanitizedChanges: Record<string, any> = {};
      for (const field of EDITABLE_RESOURCE_FIELDS) {
        if (proposedChanges && field in proposedChanges) {
          sanitizedChanges[field] = proposedChanges[field];
        }
      }
      
      // SECURITY FIX: Validate field sizes (ISSUE 5)
      if (sanitizedProposedData.title && sanitizedProposedData.title.length > 200) {
        return res.status(400).json({ message: 'Title too long (max 200 characters)' });
      }
      
      if (sanitizedProposedData.description && sanitizedProposedData.description.length > 2000) {
        return res.status(400).json({ message: 'Description too long (max 2000 characters)' });
      }
      
      if (sanitizedProposedData.tags && Array.isArray(sanitizedProposedData.tags) && sanitizedProposedData.tags.length > 20) {
        return res.status(400).json({ message: 'Too many tags (max 20)' });
      }
      
      let aiMetadata = claudeMetadata;
      if (triggerClaudeAnalysis && resource.url) {
        try {
          aiMetadata = await claudeService.analyzeURL(resource.url);
        } catch (error) {
          console.error('Error analyzing URL with Claude:', error);
        }
      }
      
      // Use sanitized versions in createResourceEdit call
      const edit = await auditRepo.createResourceEdit({
        resourceId,
        submittedBy: userId,
        status: 'pending',
        originalResourceUpdatedAt: resource.updatedAt ?? new Date(),
        proposedChanges: sanitizedChanges,
        proposedData: sanitizedProposedData,
        claudeMetadata: aiMetadata,
        claudeAnalyzedAt: aiMetadata ? new Date() : undefined,
      });
      
      res.status(201).json(edit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid edit data', errors: error.errors });
      }
      console.error('Error creating edit suggestion:', error);
      res.status(500).json({ message: 'Failed to create edit suggestion' });
    }
  });

}

// Resource Approval Routes extracted from registerRoutes (behavior-preserving).
import type { Express } from "express";
import { ensureSubSubcategoryExists } from "../repositories/ensureSubSubcategory";
import { isAuthenticated } from "../session";
import { insertResourceSchema } from "@shared/schema";
import { auditRepo, categoryRepo, isAdmin, resourceRepo, tagRepo } from "./deps";

export function registerResourceApprovalRoutes(app: Express): void {
  // ============= Resource Approval Routes =============
  
  // GET /api/admin/pending-resources - Get all pending resources for approval
  app.get('/api/admin/pending-resources', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const result = await resourceRepo.getPendingResources();
      
      res.json(result);
    } catch (error) {
      console.error('Error fetching pending resources:', error);
      res.status(500).json({ message: 'Failed to fetch pending resources' });
    }
  });
  
  // POST /api/admin/resources/:id/approve - Approve a pending resource
  // :id is constrained to digits so it cannot shadow the literal /resources/bulk/* routes
  // registered later (Express matches first-registered; an unconstrained :id would capture "bulk").
  app.post('/api/admin/resources/:id(\\d+)/approve', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const resourceId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      if (isNaN(resourceId)) {
        return res.status(400).json({ message: 'Invalid resource ID' });
      }
      
      const updatedResource = await resourceRepo.approveResource(resourceId, userId);
      
      res.json(updatedResource);
    } catch (error) {
      console.error('Error approving resource:', error);
      res.status(500).json({ message: 'Failed to approve resource' });
    }
  });
  
  // POST /api/admin/resources/:id/reject - Reject a pending resource
  // :id constrained to digits so it cannot shadow the literal /resources/bulk/* routes.
  app.post('/api/admin/resources/:id(\\d+)/reject', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const resourceId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const { reason } = req.body;
      
      if (isNaN(resourceId)) {
        return res.status(400).json({ message: 'Invalid resource ID' });
      }
      
      if (!reason || reason.trim().length < 10) {
        return res.status(400).json({ message: 'Rejection reason is required (minimum 10 characters)' });
      }
      
      await resourceRepo.rejectResource(resourceId, userId, reason);
      const updatedResource = await resourceRepo.getResource(resourceId);
      
      res.json(updatedResource);
    } catch (error) {
      console.error('Error rejecting resource:', error);
      res.status(500).json({ message: 'Failed to reject resource' });
    }
  });

  // PUT /api/admin/resources/:id - Update a resource (admin only)
  app.put('/api/admin/resources/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const resourceId = parseInt(req.params.id);
      const userId = req.user.claims.sub;

      if (isNaN(resourceId)) {
        return res.status(400).json({ message: 'Invalid resource ID' });
      }

      const resource = await resourceRepo.getResource(resourceId);
      if (!resource) {
        return res.status(404).json({ message: 'Resource not found' });
      }

      const updateSchema = insertResourceSchema.partial();
      const validationResult = updateSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: validationResult.error.errors
        });
      }

      const validatedData = validationResult.data;
      const updateData: Record<string, any> = {};

      if (validatedData.title !== undefined) updateData.title = validatedData.title;
      if (validatedData.url !== undefined) updateData.url = validatedData.url;
      if (validatedData.description !== undefined) updateData.description = validatedData.description;
      if (validatedData.category !== undefined) updateData.category = validatedData.category;
      if (validatedData.subcategory !== undefined) updateData.subcategory = validatedData.subcategory;
      if (validatedData.subSubcategory !== undefined) updateData.subSubcategory = validatedData.subSubcategory;
      if (validatedData.status !== undefined) updateData.status = validatedData.status;

      // Auto-create the implied sub_subcategories row so the resource never
      // disappears from the category drilldown (task #57). Uses the post-update
      // hierarchy values: prefer the incoming value, fall back to the resource's
      // existing value.
      await ensureSubSubcategoryExists(
        categoryRepo,
        updateData.category ?? resource.category,
        updateData.subcategory ?? resource.subcategory,
        updateData.subSubcategory ?? resource.subSubcategory,
      );

      const updatedResource = await resourceRepo.updateResource(resourceId, updateData);

      // Tag upsert: if `tags` array supplied, create any missing tags and
      // replace the resource's tag set (idempotent — duplicate links are
      // ignored by the junction PK). Empty array means "remove all tags".
      let tagChangeApplied = false;
      if (Array.isArray(req.body?.tags)) {
        const desired = req.body.tags
          .map((t: unknown) => (typeof t === "string" ? t.trim() : ""))
          .filter((t: string) => t.length > 0);
        const allTagRows = await tagRepo.listTags();
        const byName = new Map(allTagRows.map(t => [t.name.toLowerCase(), t]));
        const bySlug = new Map(allTagRows.map(t => [t.slug.toLowerCase(), t]));
        const wantedIds: number[] = [];
        for (const raw of desired) {
          const slug = raw.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
          let tag = bySlug.get(slug) || byName.get(raw.toLowerCase());
          if (!tag) {
            try {
              tag = await tagRepo.createTag({ name: raw, slug });
            } catch {
              // Race: another admin just created it; fall through and look it up.
              const fresh = await tagRepo.listTags();
              tag = fresh.find(t => t.slug === slug) || fresh.find(t => t.name.toLowerCase() === raw.toLowerCase());
            }
            if (tag) {
              byName.set(tag.name.toLowerCase(), tag);
              bySlug.set(tag.slug.toLowerCase(), tag);
            }
          }
          if (tag) wantedIds.push(tag.id);
        }
        const currentLinks = await tagRepo.getResourceTags(resourceId);
        const currentIds = new Set(currentLinks.map(t => t.id));
        const wanted = new Set(wantedIds);
        for (const id of wanted) {
          if (!currentIds.has(id)) {
            try { await tagRepo.addTagToResource(resourceId, id); tagChangeApplied = true; } catch {}
          }
        }
        for (const id of currentIds) {
          if (!wanted.has(id)) {
            try { await tagRepo.removeTagFromResource(resourceId, id); tagChangeApplied = true; } catch {}
          }
        }
        updateData.tags = desired;
      }

      await auditRepo.logResourceAudit(
        resourceId,
        'updated',
        userId,
        updateData,
        'Resource updated by admin'
      );

      res.json({ ...updatedResource, tagsChanged: tagChangeApplied });
    } catch (error) {
      console.error('Error updating resource:', error);
      res.status(500).json({ message: 'Failed to update resource' });
    }
  });

  // DELETE /api/admin/resources/:id - Delete a resource (admin only)
  app.delete('/api/admin/resources/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const resourceId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      if (isNaN(resourceId)) {
        return res.status(400).json({ message: 'Invalid resource ID' });
      }
      
      const resource = await resourceRepo.getResource(resourceId);
      if (!resource) {
        return res.status(404).json({ message: 'Resource not found' });
      }
      
      // deleteResource writes the 'deleted' audit row itself, before the row is
      // removed, so the audit FK stays valid. Logging again here would insert a row
      // referencing the now-deleted resource and throw, masking a successful delete
      // as a 500.
      await resourceRepo.deleteResource(resourceId, userId);

      res.json({ message: 'Resource deleted successfully' });
    } catch (error) {
      console.error('Error deleting resource:', error);
      res.status(500).json({ message: 'Failed to delete resource' });
    }
  });

  // POST /api/admin/resources/bulk/approve - Bulk approve resources
  app.post('/api/admin/resources/bulk/approve', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { ids } = req.body as { ids?: unknown };

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: 'ids must be a non-empty array of resource IDs' });
      }

      const numericIds = ids
        .map((id) => (typeof id === 'number' ? id : parseInt(String(id), 10)))
        .filter((id) => !Number.isNaN(id));

      if (numericIds.length === 0) {
        return res.status(400).json({ message: 'No valid resource IDs provided' });
      }

      const results = await Promise.allSettled(
        numericIds.map((id) => resourceRepo.approveResource(id, userId))
      );

      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.length - succeeded;

      res.json({ message: `Approved ${succeeded} resource(s)`, succeeded, failed });
    } catch (error) {
      console.error('Error in bulk approve:', error);
      res.status(500).json({ message: 'Failed to bulk approve resources' });
    }
  });

  // POST /api/admin/resources/bulk/reject - Bulk reject resources
  app.post('/api/admin/resources/bulk/reject', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { ids, reason } = req.body as { ids?: unknown; reason?: string };

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: 'ids must be a non-empty array of resource IDs' });
      }

      if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
        return res.status(400).json({ message: 'Rejection reason is required (minimum 10 characters)' });
      }

      const numericIds = ids
        .map((id) => (typeof id === 'number' ? id : parseInt(String(id), 10)))
        .filter((id) => !Number.isNaN(id));

      if (numericIds.length === 0) {
        return res.status(400).json({ message: 'No valid resource IDs provided' });
      }

      const results = await Promise.allSettled(
        numericIds.map((id) => resourceRepo.rejectResource(id, userId, reason))
      );

      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.length - succeeded;

      res.json({ message: `Rejected ${succeeded} resource(s)`, succeeded, failed });
    } catch (error) {
      console.error('Error in bulk reject:', error);
      res.status(500).json({ message: 'Failed to bulk reject resources' });
    }
  });

  // POST /api/admin/resources/bulk/delete - Bulk delete resources
  app.post('/api/admin/resources/bulk/delete', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { ids } = req.body as { ids?: unknown };

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: 'ids must be a non-empty array of resource IDs' });
      }

      const numericIds = ids
        .map((id) => (typeof id === 'number' ? id : parseInt(String(id), 10)))
        .filter((id) => !Number.isNaN(id));

      if (numericIds.length === 0) {
        return res.status(400).json({ message: 'No valid resource IDs provided' });
      }

      let succeeded = 0;
      let failed = 0;
      for (const id of numericIds) {
        try {
          const resource = await resourceRepo.getResource(id);
          if (!resource) {
            failed++;
            continue;
          }
          // deleteResource records the 'deleted' audit row before removing the row,
          // keeping the audit FK valid; a second log here would reference the deleted
          // id and throw.
          await resourceRepo.deleteResource(id, userId);
          succeeded++;
        } catch (err) {
          console.error(`Error deleting resource ${id} in bulk:`, err);
          failed++;
        }
      }

      res.json({ message: `Deleted ${succeeded} resource(s)`, succeeded, failed });
    } catch (error) {
      console.error('Error in bulk delete:', error);
      res.status(500).json({ message: 'Failed to bulk delete resources' });
    }
  });

  // GET /api/admin/resources - Get all resources for admin (with pagination and filters)
  app.get('/api/admin/resources', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const search = req.query.search as string;
      const category = req.query.category as string;
      const status = req.query.status as string;
      
      const result = await resourceRepo.listResources({
        page,
        limit,
        search,
        category,
        status: status || undefined
      });
      
      res.json({
        resources: result.resources,
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit)
      });
    } catch (error) {
      console.error('Error fetching admin resources:', error);
      res.status(500).json({ message: 'Failed to fetch resources' });
    }
  });

  // POST /api/admin/resources - Create a new resource (admin only)
  app.post('/api/admin/resources', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const createSchema = insertResourceSchema.extend({
        title: insertResourceSchema.shape.title.min(1, 'Title is required'),
        url: insertResourceSchema.shape.url.min(1, 'URL is required'),
      });
      
      const validationResult = createSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: validationResult.error.errors 
        });
      }
      
      const validatedData = validationResult.data;

      const resolvedCategory = validatedData.category || 'General Tools';
      const resolvedSubcategory = validatedData.subcategory || null;
      const resolvedSubSubcategory = validatedData.subSubcategory || null;

      await ensureSubSubcategoryExists(
        categoryRepo,
        resolvedCategory,
        resolvedSubcategory,
        resolvedSubSubcategory,
      );

      const newResource = await resourceRepo.createResource({
        title: validatedData.title,
        url: validatedData.url,
        description: validatedData.description || '',
        category: resolvedCategory,
        subcategory: resolvedSubcategory,
        subSubcategory: resolvedSubSubcategory,
        status: validatedData.status || 'approved',
        submittedBy: userId
      });
      
      await auditRepo.logResourceAudit(
        newResource.id,
        'created',
        userId,
        { title: validatedData.title, url: validatedData.url },
        'Resource created by admin'
      );
      
      res.status(201).json(newResource);
    } catch (error) {
      console.error('Error creating resource:', error);
      res.status(500).json({ message: 'Failed to create resource' });
    }
  });
  
}

// Sub-subcategory Management Routes extracted from registerRoutes (behavior-preserving).
import type { Express } from "express";
import { isAuthenticated } from "../session";
import { auditRepo, categoryRepo, isAdmin } from "./deps";

export function registerSubSubcategoryMgmtRoutes(app: Express): void {
  // ============= Sub-subcategory Management Routes =============
  
  // GET /api/admin/sub-subcategories - List all sub-subcategories (optionally filtered by subcategory)
  app.get('/api/admin/sub-subcategories', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const subcategoryId = req.query.subcategoryId ? parseInt(req.query.subcategoryId as string) : undefined;
      
      const subSubcategories = await categoryRepo.listSubSubcategories(subcategoryId);
      
      const subSubcategoriesWithCounts = await Promise.all(
        subSubcategories.map(async (subSub) => {
          const count = await categoryRepo.getSubSubcategoryResourceCount(subSub.name);
          return { ...subSub, resourceCount: count };
        })
      );
      
      res.json(subSubcategoriesWithCounts);
    } catch (error) {
      console.error('Error fetching sub-subcategories:', error);
      res.status(500).json({ message: 'Failed to fetch sub-subcategories' });
    }
  });
  
  // POST /api/admin/sub-subcategories - Create a new sub-subcategory
  app.post('/api/admin/sub-subcategories', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { insertSubSubcategorySchema } = await import('@shared/schema');
      
      const validationResult = insertSubSubcategorySchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: validationResult.error.errors 
        });
      }
      
      const subcategoryId = validationResult.data.subcategoryId;
      if (!subcategoryId) {
        return res.status(400).json({ message: 'Subcategory ID is required' });
      }
      
      const subcategory = await categoryRepo.getSubcategory(subcategoryId);
      if (!subcategory) {
        return res.status(404).json({ message: 'Parent subcategory not found' });
      }
      
      const newSubSubcategory = await categoryRepo.createSubSubcategory(validationResult.data);
      
      await auditRepo.logResourceAudit(
        null,
        'sub_subcategory_created',
        req.user.claims.sub,
        { subSubcategory: newSubSubcategory },
        `Created sub-subcategory: ${newSubSubcategory.name} under ${subcategory.name}`
      );
      
      res.status(201).json(newSubSubcategory);
    } catch (error) {
      console.error('Error creating sub-subcategory:', error);
      
      if (error instanceof Error && error.message.includes('already exists')) {
        return res.status(409).json({ message: error.message });
      }
      
      res.status(500).json({ message: 'Failed to create sub-subcategory' });
    }
  });
  
  // PATCH /api/admin/sub-subcategories/:id - Update a sub-subcategory
  app.patch('/api/admin/sub-subcategories/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const subSubcategoryId = parseInt(req.params.id);
      
      if (isNaN(subSubcategoryId)) {
        return res.status(400).json({ message: 'Invalid sub-subcategory ID' });
      }
      
      const { updateSubSubcategorySchema } = await import('@shared/schema');
      
      const validationResult = updateSubSubcategorySchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: validationResult.error.errors 
        });
      }
      
      const existingSubSubcategory = await categoryRepo.getSubSubcategory(subSubcategoryId);
      if (!existingSubSubcategory) {
        return res.status(404).json({ message: 'Sub-subcategory not found' });
      }
      
      if (validationResult.data.subcategoryId !== undefined && validationResult.data.subcategoryId !== null) {
        const subcategory = await categoryRepo.getSubcategory(validationResult.data.subcategoryId);
        if (!subcategory) {
          return res.status(404).json({ message: 'Parent subcategory not found' });
        }
      }
      
      const updatedSubSubcategory = await categoryRepo.updateSubSubcategory(subSubcategoryId, validationResult.data);
      
      await auditRepo.logResourceAudit(
        null,
        'sub_subcategory_updated',
        req.user.claims.sub,
        { before: existingSubSubcategory, after: updatedSubSubcategory },
        `Updated sub-subcategory: ${existingSubSubcategory.name}`
      );
      
      res.json(updatedSubSubcategory);
    } catch (error) {
      console.error('Error updating sub-subcategory:', error);
      res.status(500).json({ message: 'Failed to update sub-subcategory' });
    }
  });
  
  // DELETE /api/admin/sub-subcategories/:id - Delete a sub-subcategory
  app.delete('/api/admin/sub-subcategories/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const subSubcategoryId = parseInt(req.params.id);
      
      if (isNaN(subSubcategoryId)) {
        return res.status(400).json({ message: 'Invalid sub-subcategory ID' });
      }
      
      const subSubcategory = await categoryRepo.getSubSubcategory(subSubcategoryId);
      if (!subSubcategory) {
        return res.status(404).json({ message: 'Sub-subcategory not found' });
      }
      
      const resourceCount = await categoryRepo.getSubSubcategoryResourceCount(subSubcategory.name);
      if (resourceCount > 0) {
        return res.status(400).json({ 
          message: `Cannot delete sub-subcategory with ${resourceCount} resources. Please reassign or delete resources first.` 
        });
      }
      
      await categoryRepo.deleteSubSubcategory(subSubcategoryId);
      
      await auditRepo.logResourceAudit(
        null,
        'sub_subcategory_deleted',
        req.user.claims.sub,
        { subSubcategory },
        `Deleted sub-subcategory: ${subSubcategory.name}`
      );
      
      res.json({ message: 'Sub-subcategory deleted successfully' });
    } catch (error) {
      console.error('Error deleting sub-subcategory:', error);
      res.status(500).json({ message: 'Failed to delete sub-subcategory' });
    }
  });
  
}

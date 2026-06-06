// Subcategory Management Routes extracted from registerRoutes (behavior-preserving).
import type { Express } from "express";
import { isAuthenticated } from "../session";
import { auditRepo, categoryRepo, isAdmin } from "./deps";

export function registerSubcategoryMgmtRoutes(app: Express): void {
  // ============= Subcategory Management Routes =============
  
  // GET /api/admin/subcategories - List all subcategories (optionally filtered by category)
  app.get('/api/admin/subcategories', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
      
      const subcategories = await categoryRepo.listSubcategories(categoryId);
      
      const subcategoriesWithCounts = await Promise.all(
        subcategories.map(async (sub) => {
          const count = await categoryRepo.getSubcategoryResourceCount(sub.name);
          return { ...sub, resourceCount: count };
        })
      );
      
      res.json(subcategoriesWithCounts);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      res.status(500).json({ message: 'Failed to fetch subcategories' });
    }
  });
  
  // POST /api/admin/subcategories - Create a new subcategory
  app.post('/api/admin/subcategories', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { insertSubcategorySchema } = await import('@shared/schema');
      
      const validationResult = insertSubcategorySchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: validationResult.error.errors 
        });
      }
      
      const categoryId = validationResult.data.categoryId;
      if (!categoryId) {
        return res.status(400).json({ message: 'Category ID is required' });
      }
      
      const category = await categoryRepo.getCategory(categoryId);
      if (!category) {
        return res.status(404).json({ message: 'Parent category not found' });
      }
      
      const newSubcategory = await categoryRepo.createSubcategory(validationResult.data);
      
      await auditRepo.logResourceAudit(
        null,
        'subcategory_created',
        req.user.claims.sub,
        { subcategory: newSubcategory },
        `Created subcategory: ${newSubcategory.name} under ${category.name}`
      );
      
      res.status(201).json(newSubcategory);
    } catch (error) {
      console.error('Error creating subcategory:', error);
      
      if (error instanceof Error && error.message.includes('already exists')) {
        return res.status(409).json({ message: error.message });
      }
      
      res.status(500).json({ message: 'Failed to create subcategory' });
    }
  });
  
  // PATCH /api/admin/subcategories/:id - Update a subcategory
  app.patch('/api/admin/subcategories/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const subcategoryId = parseInt(req.params.id);
      
      if (isNaN(subcategoryId)) {
        return res.status(400).json({ message: 'Invalid subcategory ID' });
      }
      
      const { updateSubcategorySchema } = await import('@shared/schema');
      
      const validationResult = updateSubcategorySchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: validationResult.error.errors 
        });
      }
      
      const existingSubcategory = await categoryRepo.getSubcategory(subcategoryId);
      if (!existingSubcategory) {
        return res.status(404).json({ message: 'Subcategory not found' });
      }
      
      if (validationResult.data.categoryId !== undefined && validationResult.data.categoryId !== null) {
        const category = await categoryRepo.getCategory(validationResult.data.categoryId);
        if (!category) {
          return res.status(404).json({ message: 'Parent category not found' });
        }
      }
      
      const updatedSubcategory = await categoryRepo.updateSubcategory(subcategoryId, validationResult.data);
      
      await auditRepo.logResourceAudit(
        null,
        'subcategory_updated',
        req.user.claims.sub,
        { before: existingSubcategory, after: updatedSubcategory },
        `Updated subcategory: ${existingSubcategory.name}`
      );
      
      res.json(updatedSubcategory);
    } catch (error) {
      console.error('Error updating subcategory:', error);
      res.status(500).json({ message: 'Failed to update subcategory' });
    }
  });
  
  // DELETE /api/admin/subcategories/:id - Delete a subcategory
  app.delete('/api/admin/subcategories/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const subcategoryId = parseInt(req.params.id);
      
      if (isNaN(subcategoryId)) {
        return res.status(400).json({ message: 'Invalid subcategory ID' });
      }
      
      const subcategory = await categoryRepo.getSubcategory(subcategoryId);
      if (!subcategory) {
        return res.status(404).json({ message: 'Subcategory not found' });
      }
      
      const resourceCount = await categoryRepo.getSubcategoryResourceCount(subcategory.name);
      if (resourceCount > 0) {
        return res.status(400).json({ 
          message: `Cannot delete subcategory with ${resourceCount} resources. Please reassign or delete resources first.` 
        });
      }
      
      await categoryRepo.deleteSubcategory(subcategoryId);
      
      await auditRepo.logResourceAudit(
        null,
        'subcategory_deleted',
        req.user.claims.sub,
        { subcategory },
        `Deleted subcategory: ${subcategory.name}`
      );
      
      res.json({ message: 'Subcategory deleted successfully' });
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      res.status(500).json({ message: 'Failed to delete subcategory' });
    }
  });
  
}

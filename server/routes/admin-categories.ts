// Category Management Routes extracted from registerRoutes (behavior-preserving).
import type { Express } from "express";
import { isAuthenticated } from "../session";
import { auditRepo, categoryRepo, isAdmin } from "./deps";

export function registerCategoryMgmtRoutes(app: Express): void {
  // ============= Category Management Routes =============
  
  // GET /api/admin/categories - List all categories
  app.get('/api/admin/categories', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const categories = await categoryRepo.listCategories();
      
      const categoriesWithCounts = await Promise.all(
        categories.map(async (cat) => {
          const count = await categoryRepo.getCategoryResourceCount(cat.name);
          return { ...cat, resourceCount: count };
        })
      );
      
      res.json(categoriesWithCounts);
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ message: 'Failed to fetch categories' });
    }
  });
  
  // POST /api/admin/categories - Create a new category
  app.post('/api/admin/categories', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { insertCategorySchema } = await import('@shared/schema');
      
      const validationResult = insertCategorySchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: validationResult.error.errors 
        });
      }
      
      const newCategory = await categoryRepo.createCategory(validationResult.data);
      
      await auditRepo.logResourceAudit(
        null,
        'category_created',
        req.user.claims.sub,
        { category: newCategory },
        `Created category: ${newCategory.name}`
      );
      
      res.status(201).json(newCategory);
    } catch (error) {
      console.error('Error creating category:', error);
      
      if (error instanceof Error && error.message.includes('already exists')) {
        return res.status(409).json({ message: error.message });
      }
      
      res.status(500).json({ message: 'Failed to create category' });
    }
  });
  
  // PATCH /api/admin/categories/:id - Update a category
  app.patch('/api/admin/categories/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      
      if (isNaN(categoryId)) {
        return res.status(400).json({ message: 'Invalid category ID' });
      }
      
      const { updateCategorySchema } = await import('@shared/schema');
      
      const validationResult = updateCategorySchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: validationResult.error.errors 
        });
      }
      
      const existingCategory = await categoryRepo.getCategory(categoryId);
      if (!existingCategory) {
        return res.status(404).json({ message: 'Category not found' });
      }
      
      const updatedCategory = await categoryRepo.updateCategory(categoryId, validationResult.data);
      
      await auditRepo.logResourceAudit(
        null,
        'category_updated',
        req.user.claims.sub,
        { before: existingCategory, after: updatedCategory },
        `Updated category: ${existingCategory.name}`
      );
      
      res.json(updatedCategory);
    } catch (error) {
      console.error('Error updating category:', error);
      res.status(500).json({ message: 'Failed to update category' });
    }
  });
  
  // DELETE /api/admin/categories/:id - Delete a category
  app.delete('/api/admin/categories/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      
      if (isNaN(categoryId)) {
        return res.status(400).json({ message: 'Invalid category ID' });
      }
      
      const category = await categoryRepo.getCategory(categoryId);
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }
      
      const resourceCount = await categoryRepo.getCategoryResourceCount(category.name);
      if (resourceCount > 0) {
        return res.status(400).json({ 
          message: `Cannot delete category with ${resourceCount} resources. Please reassign or delete resources first.` 
        });
      }
      
      await categoryRepo.deleteCategory(categoryId);
      
      await auditRepo.logResourceAudit(
        null,
        'category_deleted',
        req.user.claims.sub,
        { category },
        `Deleted category: ${category.name}`
      );
      
      res.json({ message: 'Category deleted successfully' });
    } catch (error) {
      console.error('Error deleting category:', error);
      res.status(500).json({ message: 'Failed to delete category' });
    }
  });
  
}

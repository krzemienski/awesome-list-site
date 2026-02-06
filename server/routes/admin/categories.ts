/**
 * Admin Category Hierarchy Management Routes
 */
import type { Express } from "express";
import { storage } from "../../storage";
import { isAuthenticated } from "../../replitAuth";
import { isAdmin } from "../auth";

export function registerCategoryRoutes(app: Express): void {
  // ===== CATEGORY ROUTES =====

  // GET /api/admin/categories - List all categories
  app.get('/api/admin/categories', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const categories = await storage.listCategories();
      const categoriesWithCounts = await Promise.all(
        categories.map(async (cat) => {
          const count = await storage.getCategoryResourceCount(cat.name);
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

      const newCategory = await storage.createCategory(validationResult.data);

      await storage.logResourceAudit(
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

      const existingCategory = await storage.getCategory(categoryId);
      if (!existingCategory) {
        return res.status(404).json({ message: 'Category not found' });
      }

      const updatedCategory = await storage.updateCategory(categoryId, validationResult.data);

      await storage.logResourceAudit(
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

      const category = await storage.getCategory(categoryId);
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }

      const resourceCount = await storage.getCategoryResourceCount(category.name);
      if (resourceCount > 0) {
        return res.status(400).json({
          message: `Cannot delete category with ${resourceCount} resources. Please reassign or delete resources first.`
        });
      }

      await storage.deleteCategory(categoryId);

      await storage.logResourceAudit(
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

  // ===== SUBCATEGORY ROUTES =====

  // GET /api/admin/subcategories - List all subcategories (optionally filtered by category)
  app.get('/api/admin/subcategories', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
      const subcategories = await storage.listSubcategories(categoryId);

      const subcategoriesWithCounts = await Promise.all(
        subcategories.map(async (sub) => {
          const count = await storage.getSubcategoryResourceCount(sub.name);
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

      const category = await storage.getCategory(categoryId);
      if (!category) {
        return res.status(404).json({ message: 'Parent category not found' });
      }

      const newSubcategory = await storage.createSubcategory(validationResult.data);

      await storage.logResourceAudit(
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

      const existingSubcategory = await storage.getSubcategory(subcategoryId);
      if (!existingSubcategory) {
        return res.status(404).json({ message: 'Subcategory not found' });
      }

      if (validationResult.data.categoryId !== undefined && validationResult.data.categoryId !== null) {
        const category = await storage.getCategory(validationResult.data.categoryId);
        if (!category) {
          return res.status(404).json({ message: 'Parent category not found' });
        }
      }

      const updatedSubcategory = await storage.updateSubcategory(subcategoryId, validationResult.data);

      await storage.logResourceAudit(
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

      const subcategory = await storage.getSubcategory(subcategoryId);
      if (!subcategory) {
        return res.status(404).json({ message: 'Subcategory not found' });
      }

      const resourceCount = await storage.getSubcategoryResourceCount(subcategory.name);
      if (resourceCount > 0) {
        return res.status(400).json({
          message: `Cannot delete subcategory with ${resourceCount} resources. Please reassign or delete resources first.`
        });
      }

      await storage.deleteSubcategory(subcategoryId);

      await storage.logResourceAudit(
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

  // ===== SUB-SUBCATEGORY ROUTES =====

  // GET /api/admin/sub-subcategories - List all sub-subcategories (optionally filtered by subcategory)
  app.get('/api/admin/sub-subcategories', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const subcategoryId = req.query.subcategoryId ? parseInt(req.query.subcategoryId as string) : undefined;
      const subSubcategories = await storage.listSubSubcategories(subcategoryId);

      const subSubcategoriesWithCounts = await Promise.all(
        subSubcategories.map(async (subSub) => {
          const count = await storage.getSubSubcategoryResourceCount(subSub.name);
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

      const subcategory = await storage.getSubcategory(subcategoryId);
      if (!subcategory) {
        return res.status(404).json({ message: 'Parent subcategory not found' });
      }

      const newSubSubcategory = await storage.createSubSubcategory(validationResult.data);

      await storage.logResourceAudit(
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

      const existingSubSubcategory = await storage.getSubSubcategory(subSubcategoryId);
      if (!existingSubSubcategory) {
        return res.status(404).json({ message: 'Sub-subcategory not found' });
      }

      if (validationResult.data.subcategoryId !== undefined && validationResult.data.subcategoryId !== null) {
        const subcategory = await storage.getSubcategory(validationResult.data.subcategoryId);
        if (!subcategory) {
          return res.status(404).json({ message: 'Parent subcategory not found' });
        }
      }

      const updatedSubSubcategory = await storage.updateSubSubcategory(subSubcategoryId, validationResult.data);

      await storage.logResourceAudit(
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

      const subSubcategory = await storage.getSubSubcategory(subSubcategoryId);
      if (!subSubcategory) {
        return res.status(404).json({ message: 'Sub-subcategory not found' });
      }

      const resourceCount = await storage.getSubSubcategoryResourceCount(subSubcategory.name);
      if (resourceCount > 0) {
        return res.status(400).json({
          message: `Cannot delete sub-subcategory with ${resourceCount} resources. Please reassign or delete resources first.`
        });
      }

      await storage.deleteSubSubcategory(subSubcategoryId);

      await storage.logResourceAudit(
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

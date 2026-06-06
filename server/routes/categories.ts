// Category Routes extracted from registerRoutes (behavior-preserving).
import type { Express } from "express";
import { z } from "zod";
import { categoryRepo } from "./deps";

export function registerCategoryRoutes(app: Express): void {
  // ============= Category Routes =============
  
  // GET /api/categories - List all categories (public)
  app.get('/api/categories', async (req, res) => {
    try {
      const categories = await categoryRepo.listCategories();
      // Attach the authoritative approved-resource count per category (single
      // GROUP BY query) so the nav and landing page show DB-accurate counts
      // instead of client-side static-tree sums.
      const counts = await categoryRepo.getResourceCountsByCategory();
      const enriched = categories.map((cat) => ({
        ...cat,
        resourceCount: counts[cat.name] ?? 0,
      }));
      res.json(enriched);
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ message: 'Failed to fetch categories' });
    }
  });

  // GET /api/subcategories - List all subcategories (public)
  app.get('/api/subcategories', async (req, res) => {
    try {
      let categoryId: number | undefined = undefined;
      
      // Validate categoryId query parameter if provided
      if (req.query.categoryId) {
        const categoryIdSchema = z.string().regex(/^\d+$/, "categoryId must be a valid number");
        const validation = categoryIdSchema.safeParse(req.query.categoryId);
        
        if (!validation.success) {
          return res.status(400).json({ 
            message: 'Invalid categoryId parameter', 
            errors: validation.error.errors 
          });
        }
        
        categoryId = parseInt(validation.data);
        
        if (isNaN(categoryId) || categoryId < 1) {
          return res.status(400).json({ 
            message: 'categoryId must be a positive number' 
          });
        }
      }
      
      const subcategories = await categoryRepo.listSubcategories(categoryId);
      res.json(subcategories);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      res.status(500).json({ message: 'Failed to fetch subcategories' });
    }
  });

  // GET /api/sub-subcategories - List all sub-subcategories (public)
  app.get('/api/sub-subcategories', async (req, res) => {
    try {
      let subcategoryId: number | undefined = undefined;
      
      // Validate subcategoryId query parameter if provided
      if (req.query.subcategoryId) {
        const subcategoryIdSchema = z.string().regex(/^\d+$/, "subcategoryId must be a valid number");
        const validation = subcategoryIdSchema.safeParse(req.query.subcategoryId);
        
        if (!validation.success) {
          return res.status(400).json({ 
            message: 'Invalid subcategoryId parameter', 
            errors: validation.error.errors 
          });
        }
        
        subcategoryId = parseInt(validation.data);
        
        if (isNaN(subcategoryId) || subcategoryId < 1) {
          return res.status(400).json({ 
            message: 'subcategoryId must be a positive number' 
          });
        }
      }
      
      const subSubcategories = await categoryRepo.listSubSubcategories(subcategoryId);
      res.json(subSubcategories);
    } catch (error) {
      console.error('Error fetching sub-subcategories:', error);
      res.status(500).json({ message: 'Failed to fetch sub-subcategories' });
    }
  });

}

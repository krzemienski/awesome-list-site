import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupLocalAuth } from "./localAuth";
import passport from "passport";
import { fetchAwesomeList } from "./parser";
import { fetchAwesomeVideoData } from "./awesome-video-parser-clean";
import { RecommendationEngine, UserProfile } from "./recommendation-engine";
import { fetchAwesomeLists, searchAwesomeLists } from "./github-api";
import { insertResourceSchema } from "@shared/schema";
import { z } from "zod";
import { syncService } from "./github/syncService";
import { recommendationEngine, UserProfile as AIUserProfile } from "./ai/recommendationEngine";
import { learningPathGenerator } from "./ai/learningPathGenerator";
import { claudeService } from "./ai/claudeService";
import { AwesomeListFormatter } from "./github/formatter";
import { validateAwesomeList, formatValidationReport } from "./validation/awesomeLint";
import { checkResourceLinks, formatLinkCheckReport } from "./validation/linkChecker";
import { seedDatabase } from "./seed";
import { enrichmentService } from "./ai/enrichmentService";

const AWESOME_RAW_URL = process.env.AWESOME_RAW_URL || "https://raw.githubusercontent.com/avelino/awesome-go/main/README.md";

// Middleware to check if user is admin
const isAdmin = async (req: any, res: Response, next: any) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const user = await storage.getUser(userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ message: "Error checking admin status" });
  }
};

// SEO route handlers - now uses database-driven data
async function generateSitemap(req: any, res: any) {
  try {
    const awesomeListData = await storage.getAwesomeListFromDatabase();
    
    if (!awesomeListData || !awesomeListData.categories.length) {
      return res.status(404).send('Sitemap not available - database empty');
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const currentDate = new Date().toISOString().split('T')[0];

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/advanced</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;

    // Add category URLs from database
    awesomeListData.categories.forEach(category => {
      sitemap += `
  <url>
    <loc>${baseUrl}/category/${category.slug}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
      
      // Add subcategory URLs
      category.subcategories?.forEach(subcategory => {
        sitemap += `
  <url>
    <loc>${baseUrl}/subcategory/${subcategory.slug}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
        
        // Add sub-subcategory URLs
        subcategory.subSubcategories?.forEach(subSubcategory => {
          sitemap += `
  <url>
    <loc>${baseUrl}/sub-subcategory/${subSubcategory.slug}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`;
        });
      });
    });

    sitemap += `
</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
}

async function generateOpenGraphImage(req: any, res: any) {
  try {
    const { title, category, resourceCount } = req.query;
    
    // Use database count if not provided in query
    let count = resourceCount;
    let pageTitle = title;
    
    if (!count || !pageTitle) {
      try {
        const awesomeListData = await storage.getAwesomeListFromDatabase();
        if (!pageTitle) pageTitle = awesomeListData?.title || 'Awesome Video';
        if (!count) count = awesomeListData?.resources?.length?.toString() || '2600+';
      } catch {
        pageTitle = pageTitle || 'Awesome Video';
        count = count || '2600+';
      }
    }

    const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#dc2626;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#991b1b;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <g transform="translate(80, 120)">
    <rect width="80" height="80" rx="12" fill="white"/>
    <path d="M20 20L40 10L60 20V50C60 53.314 57.314 56 54 56H26C22.686 56 20 53.314 20 50V20Z" fill="#dc2626"/>
    <text x="120" y="50" font-family="system-ui" font-size="72" font-weight="bold" fill="white">
      ${pageTitle.length > 20 ? pageTitle.substring(0, 17) + '...' : pageTitle}
    </text>
    <text x="120" y="100" font-family="system-ui" font-size="36" fill="rgba(255,255,255,0.9)">
      ${category ? `${category} Resources` : 'Curated Developer Resources'}
    </text>
    <text x="120" y="180" font-family="system-ui" font-size="32" font-weight="bold" fill="white">
      ${count} Resources
    </text>
  </g>
</svg>`;

    res.set('Content-Type', 'image/svg+xml');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(svg);
  } catch (error) {
    console.error('Error generating OG image:', error);
    res.status(500).send('Error generating image');
  }
}

// Helper functions to convert slugs back to original titles
function getCategoryTitleFromSlug(slug: string): string {
  const categoryMap: { [key: string]: string } = {
    'community-events': 'Community & Events',
    'encoding-codecs': 'Encoding & Codecs',
    'general-tools': 'General Tools',
    'infrastructure-delivery': 'Infrastructure & Delivery',
    'intro-learning': 'Intro & Learning',
    'media-tools': 'Media Tools',
    'players-clients': 'Players & Clients',
    'protocols-transport': 'Protocols & Transport',
    'standards-industry': 'Standards & Industry'
  };
  return categoryMap[slug] || slug;
}

function getSubcategoryTitleFromSlug(slug: string): string {
  const subcategoryMap: { [key: string]: string } = {
    'community-groups': 'Community Groups',
    'events-conferences': 'Events & Conferences',
    'codecs': 'Codecs',
    'encoding-tools': 'Encoding Tools',
    'drm': 'DRM',
    'ffmpeg-tools': 'FFMPEG & Tools',
    'cloud-cdn': 'Cloud & CDN',
    'streaming-servers': 'Streaming Servers',
    'introduction': 'Introduction',
    'learning-resources': 'Learning Resources',
    'tutorials-case-studies': 'Tutorials & Case Studies',
    'ads-qoe': 'Ads & QoE',
    'audio-subtitles': 'Audio & Subtitles',
    'hardware-players': 'Hardware Players',
    'mobile-web-players': 'Mobile & Web Players',
    'adaptive-streaming': 'Adaptive Streaming',
    'transport-protocols': 'Transport Protocols',
    'specs-standards': 'Specs & Standards',
    'vendors-hdr': 'Vendors & HDR'
  };
  return subcategoryMap[slug] || slug;
}

function getSubSubcategoryTitleFromSlug(slug: string): string {
  const subSubcategoryMap: { [key: string]: string } = {
    'online-forums': 'Online Forums',
    'slack-meetups': 'Slack & Meetups',
    'conferences': 'Conferences',
    'podcasts-webinars': 'Podcasts & Webinars',
    'av1': 'AV1',
    'hevc': 'HEVC',
    'vp9': 'VP9',
    'ffmpeg': 'FFMPEG',
    'other-encoders': 'Other Encoders',
    'cdn-integration': 'CDN Integration',
    'cloud-platforms': 'Cloud Platforms',
    'origin-servers': 'Origin Servers',
    'storage-solutions': 'Storage Solutions',
    'advertising': 'Advertising',
    'quality-testing': 'Quality & Testing',
    'audio': 'Audio',
    'subtitles-captions': 'Subtitles & Captions',
    'chromecast': 'Chromecast',
    'roku': 'Roku',
    'smart-tv': 'Smart TVs',
    'android': 'Android',
    'ios-tvos': 'iOS/tvOS',
    'web-players': 'Web Players',
    'dash': 'DASH',
    'hls': 'HLS',
    'rist': 'RIST',
    'rtmp': 'RTMP',
    'srt': 'SRT',
    'mpeg-forums': 'MPEG & Forums',
    'official-specs': 'Official Specs',
    'hdr-guidelines': 'HDR Guidelines',
    'vendor-docs': 'Vendor Docs'
  };
  return subSubcategoryMap[slug] || slug;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication (OAuth and local)
  await setupAuth(app);
  setupLocalAuth();

  // Local authentication routes
  app.post("/api/auth/local/login", (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        console.log('[local/login] Authentication error:', err);
        return res.status(500).json({ message: "Internal server error" });
      }
      
      if (!user) {
        console.log('[local/login] Authentication failed:', info?.message);
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      
      console.log('[local/login] User authenticated, establishing session for:', user.claims?.sub);
      
      req.logIn(user, async (err) => {
        if (err) {
          console.log('[local/login] Login failed:', err);
          return res.status(500).json({ message: "Login failed" });
        }
        
        console.log('[local/login] Session established, saving to store...');
        
        // Explicitly save the session to ensure it's persisted before sending response
        req.session.save(async (saveErr) => {
          if (saveErr) {
            console.log('[local/login] Session save failed:', saveErr);
            return res.status(500).json({ message: "Failed to save session" });
          }
          
          console.log('[local/login] Session saved successfully, session ID:', req.sessionID);
          
          // Fetch user from database to get the role
          const dbUser = await storage.getUser(user.claims.sub);
          
          console.log('[local/login] Returning user response with role:', dbUser?.role);
          
          return res.json({
            user: {
              id: user.claims.sub,
              email: user.claims.email,
              firstName: user.claims.first_name,
              lastName: user.claims.last_name,
              profileImageUrl: user.claims.profile_image_url,
              role: dbUser?.role || 'user',
            }
          });
        });
      });
    })(req, res, next);
  });

  // Note: Database seeding and data initialization moved to runBackgroundInitialization()
  // This ensures the server starts quickly for production deployments

  // ============= Auth Routes (from Replit Auth blueprint) =============
  
  // GET /api/auth/user - Get current user (public endpoint)
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      console.log('[/api/auth/user] Request received');
      console.log('[/api/auth/user] isAuthenticated:', req.isAuthenticated?.());
      console.log('[/api/auth/user] req.user?.dbUser:', req.user?.dbUser);
      console.log('[/api/auth/user] req.user?.claims?.sub:', req.user?.claims?.sub);
      
      // Check if user is authenticated
      if (!req.isAuthenticated() || !req.user?.claims?.sub) {
        console.log('[/api/auth/user] User not authenticated, returning null');
        return res.json({ user: null, isAuthenticated: false });
      }

      // Use DB user from session (populated by deserializeUser) or fetch if not available
      let dbUser = req.user.dbUser;
      if (!dbUser) {
        const userId = req.user.claims.sub;
        console.log('[/api/auth/user] dbUser not in session, fetching from DB, userId:', userId);
        dbUser = await storage.getUser(userId);
      }
      
      if (!dbUser) {
        console.log('[/api/auth/user] User not found in DB');
        return res.json({ user: null, isAuthenticated: false });
      }

      console.log('[/api/auth/user] DB user found:', {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role
      });

      // Map database fields to frontend-expected format
      const user = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.firstName && dbUser.lastName 
          ? `${dbUser.firstName} ${dbUser.lastName}` 
          : dbUser.firstName || dbUser.email?.split('@')[0] || 'User',
        avatar: dbUser.profileImageUrl,
        role: dbUser.role,
        createdAt: dbUser.createdAt,
      };

      console.log('[/api/auth/user] Returning user:', user);
      res.json({ user, isAuthenticated: true });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  // POST /api/auth/logout - Logout user
  app.post('/api/auth/logout', async (req: any, res) => {
    try {
      req.logout(() => {
        res.json({ success: true });
      });
    } catch (error) {
      console.error("Error logging out:", error);
      res.status(500).json({ message: "Failed to logout" });
    }
  });
  
  // Note: /api/login, /api/callback are set up in setupAuth()

  // ============= Resource Routes =============
  
  // GET /api/resources - List approved resources (public)
  app.get('/api/resources', async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const category = req.query.category as string;
      const subcategory = req.query.subcategory as string;
      const search = req.query.search as string;
      
      const result = await storage.listResources({
        page,
        limit,
        status: 'approved',
        category,
        subcategory,
        search
      });
      
      res.json(result);
    } catch (error) {
      console.error('Error fetching resources:', error);
      res.status(500).json({ message: 'Failed to fetch resources' });
    }
  });
  
  // GET /api/resources/:id - Get single resource
  app.get('/api/resources/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const resource = await storage.getResource(id);
      
      if (!resource) {
        return res.status(404).json({ message: 'Resource not found' });
      }
      
      res.json(resource);
    } catch (error) {
      console.error('Error fetching resource:', error);
      res.status(500).json({ message: 'Failed to fetch resource' });
    }
  });
  
  // POST /api/resources - Submit new resource (authenticated)
  app.post('/api/resources', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const resourceData = insertResourceSchema.parse(req.body);
      
      const resource = await storage.createResource({
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
      
      const result = await storage.listResources({
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
      
      const resource = await storage.updateResourceStatus(id, 'approved', userId);
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
      
      const resource = await storage.updateResourceStatus(id, 'rejected', userId);
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
      
      const resource = await storage.getResource(resourceId);
      if (!resource) {
        return res.status(404).json({ message: 'Resource not found' });
      }
      
      if (!proposedChanges || !proposedData) {
        return res.status(400).json({ message: 'proposedChanges and proposedData are required' });
      }
      
      // SECURITY FIX: Whitelist of editable fields only (ISSUE 1)
      const EDITABLE_FIELDS = ['title', 'description', 'url', 'tags', 'category', 'subcategory', 'subSubcategory'];
      
      // Sanitize proposedData - only allow whitelisted fields
      const sanitizedProposedData: Record<string, any> = {};
      for (const field of EDITABLE_FIELDS) {
        if (proposedData && field in proposedData) {
          sanitizedProposedData[field] = proposedData[field];
        }
      }
      
      // Sanitize proposedChanges
      const sanitizedChanges: Record<string, any> = {};
      for (const field of EDITABLE_FIELDS) {
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
      const edit = await storage.createResourceEdit({
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

  // ============= Category Routes =============
  
  // GET /api/categories - List all categories (public)
  app.get('/api/categories', async (req, res) => {
    try {
      const categories = await storage.listCategories();
      res.json(categories);
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
      
      const subcategories = await storage.listSubcategories(categoryId);
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
      
      const subSubcategories = await storage.listSubSubcategories(subcategoryId);
      res.json(subSubcategories);
    } catch (error) {
      console.error('Error fetching sub-subcategories:', error);
      res.status(500).json({ message: 'Failed to fetch sub-subcategories' });
    }
  });

  // ============= User Interaction Routes =============
  
  // POST /api/favorites/:resourceId - Add favorite
  app.post('/api/favorites/:resourceId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const resourceId = parseInt(req.params.resourceId);
      
      await storage.addFavorite(userId, resourceId);
      res.json({ message: 'Favorite added successfully' });
    } catch (error) {
      console.error('Error adding favorite:', error);
      res.status(500).json({ message: 'Failed to add favorite' });
    }
  });
  
  // DELETE /api/favorites/:resourceId - Remove favorite
  app.delete('/api/favorites/:resourceId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const resourceId = parseInt(req.params.resourceId);
      
      await storage.removeFavorite(userId, resourceId);
      res.json({ message: 'Favorite removed successfully' });
    } catch (error) {
      console.error('Error removing favorite:', error);
      res.status(500).json({ message: 'Failed to remove favorite' });
    }
  });
  
  // GET /api/favorites - Get user's favorites
  app.get('/api/favorites', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const favorites = await storage.getUserFavorites(userId);
      res.json(favorites);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      res.status(500).json({ message: 'Failed to fetch favorites' });
    }
  });
  
  // POST /api/bookmarks/:resourceId - Add bookmark
  app.post('/api/bookmarks/:resourceId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const resourceId = parseInt(req.params.resourceId);
      const { notes } = req.body;
      
      await storage.addBookmark(userId, resourceId, notes);
      res.json({ message: 'Bookmark added successfully' });
    } catch (error) {
      console.error('Error adding bookmark:', error);
      res.status(500).json({ message: 'Failed to add bookmark' });
    }
  });
  
  // DELETE /api/bookmarks/:resourceId - Remove bookmark
  app.delete('/api/bookmarks/:resourceId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const resourceId = parseInt(req.params.resourceId);
      
      await storage.removeBookmark(userId, resourceId);
      res.json({ message: 'Bookmark removed successfully' });
    } catch (error) {
      console.error('Error removing bookmark:', error);
      res.status(500).json({ message: 'Failed to remove bookmark' });
    }
  });
  
  // GET /api/bookmarks - Get user's bookmarks
  app.get('/api/bookmarks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookmarks = await storage.getUserBookmarks(userId);
      res.json(bookmarks);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      res.status(500).json({ message: 'Failed to fetch bookmarks' });
    }
  });

  // ============= User Profile & Progress Routes =============

  // GET /api/user/progress - Get user's learning progress
  app.get('/api/user/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Get total resources in catalog
      const totalResourcesResult = await storage.listResources({ status: 'approved', limit: 1 });
      const totalResources = totalResourcesResult.total;

      // Get user's journey progress to count completed resources
      const journeyProgress = await storage.listUserJourneyProgress(userId);
      const completedResources = journeyProgress.filter(p => p.completedAt !== null).length;

      // Get current learning path (most recently accessed journey)
      let currentPath: string | undefined;
      if (journeyProgress.length > 0) {
        const latestJourney = journeyProgress[0];
        const journey = await storage.getLearningJourney(latestJourney.journeyId);
        currentPath = journey?.title;
      }

      // Calculate streak days from favorites and bookmarks
      const favorites = await storage.getUserFavorites(userId);
      const bookmarks = await storage.getUserBookmarks(userId);
      
      // Debug: Log sample data to verify timestamps are available
      if (favorites.length > 0) {
        console.log('Favorites sample:', favorites[0]);
      }
      if (bookmarks.length > 0) {
        console.log('Bookmarks sample:', bookmarks[0]);
      }
      
      // Get all activity dates from favorites and bookmarks
      const activityDates: Date[] = [];
      
      // Add favorite dates (now using favoritedAt from junction table)
      favorites.forEach(f => {
        if (f.favoritedAt) activityDates.push(new Date(f.favoritedAt));
      });
      
      // Add bookmark dates (now using bookmarkedAt from junction table)
      bookmarks.forEach(b => {
        if (b.bookmarkedAt) activityDates.push(new Date(b.bookmarkedAt));
      });

      // Calculate streak
      let streakDays = 0;
      if (activityDates.length > 0) {
        // Sort dates descending
        activityDates.sort((a, b) => b.getTime() - a.getTime());
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let currentDate = new Date(today);
        streakDays = 0;
        
        for (const activityDate of activityDates) {
          const activity = new Date(activityDate);
          activity.setHours(0, 0, 0, 0);
          
          const diffDays = Math.floor((currentDate.getTime() - activity.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays === 0) {
            streakDays = Math.max(streakDays, 1);
          } else if (diffDays === streakDays) {
            streakDays++;
          }
        }
      }

      // Get skill level from user preferences
      let skillLevel = 'beginner';
      try {
        const userPrefs = await storage.getUserPreferences(userId);
        if (userPrefs?.skillLevel) {
          skillLevel = userPrefs.skillLevel;
        }
      } catch (error) {
        console.log('User preferences not found, using default skill level');
      }

      const progressData = {
        totalResources,
        completedResources,
        currentPath,
        streakDays,
        totalTimeSpent: '0h 0m',
        skillLevel
      };

      res.json(progressData);
    } catch (error) {
      console.error('Error fetching user progress:', error);
      res.status(500).json({ message: 'Failed to fetch user progress' });
    }
  });

  // GET /api/user/submissions - Get user's submitted resources and edits
  app.get('/api/user/submissions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Get user's submitted resources
      const submittedResources = await storage.listResources({
        userId,
        page: 1,
        limit: 100
      });

      // Get user's suggested edits
      const resourceEdits = await storage.getResourceEditsByUser(userId);

      res.json({
        resources: submittedResources.resources,
        edits: resourceEdits,
        totalResources: submittedResources.total,
        totalEdits: resourceEdits.length
      });
    } catch (error) {
      console.error('Error fetching user submissions:', error);
      res.status(500).json({ message: 'Failed to fetch user submissions' });
    }
  });

  // GET /api/user/journeys - Get user's learning journeys with details
  app.get('/api/user/journeys', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Get user's journey progress
      const journeyProgress = await storage.listUserJourneyProgress(userId);

      // Fetch journey details for each progress entry
      const journeysWithDetails = await Promise.all(
        journeyProgress.map(async (progress) => {
          const journey = await storage.getLearningJourney(progress.journeyId);
          return {
            ...progress,
            journey
          };
        })
      );

      res.json(journeysWithDetails);
    } catch (error) {
      console.error('Error fetching user journeys:', error);
      res.status(500).json({ message: 'Failed to fetch user journeys' });
    }
  });

  // ============= Learning Journey Routes =============
  
  // GET /api/journeys - List all journeys
  app.get('/api/journeys', async (req: any, res) => {
    try {
      const category = req.query.category as string;
      const journeys = await storage.listLearningJourneys(category);
      
      // Early return if no journeys
      if (journeys.length === 0) {
        return res.json([]);
      }
      
      // BATCH FETCH: Single query for all steps
      const journeyIds = journeys.map(j => j.id);
      const stepsMap = await storage.listJourneyStepsBatch(journeyIds);
      
      // If user is authenticated, batch fetch all progress
      if (req.user?.claims?.sub) {
        const userId = req.user.claims.sub;
        const allProgress = await storage.listUserJourneyProgress(userId);
        
        // Create progress map for O(1) lookup
        const progressMap = new Map();
        allProgress.forEach(p => {
          progressMap.set(p.journeyId, p);
        });
        
        // Enrich journeys with steps and progress
        const enrichedJourneys = journeys.map(journey => {
          const steps = stepsMap.get(journey.id) || [];
          const progress = progressMap.get(journey.id);
          
          // Count distinct stepNumbers instead of total database rows (defensive: handle both strings and numbers)
          const uniqueStepNumbers = new Set(
            steps
              .map(s => typeof s.stepNumber === 'number' ? s.stepNumber : parseInt(s.stepNumber, 10))
              .filter(n => !isNaN(n))
          );
          
          return {
            ...journey,
            stepCount: uniqueStepNumbers.size,
            completedStepCount: progress?.completedSteps?.length || 0,
            isEnrolled: !!progress
          };
        });
        
        res.json(enrichedJourneys);
      } else {
        // For unauthenticated users
        const enrichedJourneys = journeys.map(journey => {
          const steps = stepsMap.get(journey.id) || [];
          
          // Count distinct stepNumbers instead of total database rows (defensive: handle both strings and numbers)
          const uniqueStepNumbers = new Set(
            steps
              .map(s => typeof s.stepNumber === 'number' ? s.stepNumber : parseInt(s.stepNumber, 10))
              .filter(n => !isNaN(n))
          );
          
          return {
            ...journey,
            stepCount: uniqueStepNumbers.size,
            completedStepCount: 0,
            isEnrolled: false
          };
        });
        
        res.json(enrichedJourneys);
      }
    } catch (error) {
      console.error('Error fetching journeys:', error);
      res.status(500).json({ message: 'Failed to fetch journeys' });
    }
  });
  
  // GET /api/journeys/:id - Get journey details
  app.get('/api/journeys/:id', async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const journey = await storage.getLearningJourney(id);
      
      if (!journey) {
        return res.status(404).json({ message: 'Journey not found' });
      }
      
      const steps = await storage.listJourneySteps(id);
      
      // Count distinct stepNumbers for accurate step count (defensive: handle both strings and numbers)
      const uniqueStepNumbers = new Set(
        steps
          .map(s => typeof s.stepNumber === 'number' ? s.stepNumber : parseInt(s.stepNumber, 10))
          .filter(n => !isNaN(n))
      );
      const stepCount = uniqueStepNumbers.size;
      
      // If user is authenticated, get their progress
      let progress = null;
      if (req.user?.claims?.sub) {
        progress = await storage.getUserJourneyProgress(req.user.claims.sub, id);
      }
      
      res.json({
        ...journey,
        stepCount,
        steps,
        progress: progress ? {
          completedSteps: progress.completedSteps || [],
          currentStepId: progress.currentStepId,
          completedAt: progress.completedAt
        } : null
      });
    } catch (error) {
      console.error('Error fetching journey:', error);
      res.status(500).json({ message: 'Failed to fetch journey' });
    }
  });
  
  // POST /api/journeys/:id/start - Start journey
  app.post('/api/journeys/:id/start', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const journeyId = parseInt(req.params.id);
      
      const progress = await storage.startUserJourney(userId, journeyId);
      res.json(progress);
    } catch (error) {
      console.error('Error starting journey:', error);
      res.status(500).json({ message: 'Failed to start journey' });
    }
  });
  
  // PUT /api/journeys/:id/progress - Update progress
  app.put('/api/journeys/:id/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const journeyId = parseInt(req.params.id);
      const { stepId } = req.body;
      
      if (!stepId) {
        return res.status(400).json({ message: 'Step ID is required' });
      }
      
      const progress = await storage.updateUserJourneyProgress(userId, journeyId, stepId);
      res.json(progress);
    } catch (error) {
      console.error('Error updating journey progress:', error);
      res.status(500).json({ message: 'Failed to update journey progress' });
    }
  });
  
  // GET /api/journeys/:id/progress - Get user's progress
  app.get('/api/journeys/:id/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const journeyId = parseInt(req.params.id);
      
      const progress = await storage.getUserJourneyProgress(userId, journeyId);
      
      if (!progress) {
        return res.status(404).json({ message: 'Progress not found' });
      }
      
      res.json(progress);
    } catch (error) {
      console.error('Error fetching journey progress:', error);
      res.status(500).json({ message: 'Failed to fetch journey progress' });
    }
  });

  // ============= Admin Routes =============
  
  // GET /api/admin/stats - Dashboard statistics
  app.get('/api/admin/stats', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      // Map backend property names to frontend expectations
      res.json({
        users: stats.totalUsers,
        resources: stats.totalResources,
        journeys: stats.totalJourneys,
        pendingApprovals: stats.pendingResources,
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      res.status(500).json({ message: 'Failed to fetch admin statistics' });
    }
  });
  
  // GET /api/admin/users - List users
  app.get('/api/admin/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const result = await storage.listUsers(page, limit);
      res.json(result);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });
  
  // PUT /api/admin/users/:id/role - Change user role
  app.put('/api/admin/users/:id/role', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const { role } = req.body;
      
      if (!role || !['user', 'admin', 'moderator'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }
      
      const user = await storage.updateUserRole(userId, role);
      res.json(user);
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({ message: 'Failed to update user role' });
    }
  });
  
  // ============= Resource Approval Routes =============
  
  // GET /api/admin/pending-resources - Get all pending resources for approval
  app.get('/api/admin/pending-resources', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const result = await storage.getPendingResources();
      
      res.json(result);
    } catch (error) {
      console.error('Error fetching pending resources:', error);
      res.status(500).json({ message: 'Failed to fetch pending resources' });
    }
  });
  
  // POST /api/admin/resources/:id/approve - Approve a pending resource
  app.post('/api/admin/resources/:id/approve', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const resourceId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      if (isNaN(resourceId)) {
        return res.status(400).json({ message: 'Invalid resource ID' });
      }
      
      const updatedResource = await storage.approveResource(resourceId, userId);
      
      res.json(updatedResource);
    } catch (error) {
      console.error('Error approving resource:', error);
      res.status(500).json({ message: 'Failed to approve resource' });
    }
  });
  
  // POST /api/admin/resources/:id/reject - Reject a pending resource
  app.post('/api/admin/resources/:id/reject', isAuthenticated, isAdmin, async (req: any, res) => {
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
      
      await storage.rejectResource(resourceId, userId, reason);
      const updatedResource = await storage.getResource(resourceId);
      
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
      
      const resource = await storage.getResource(resourceId);
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
      
      const updatedResource = await storage.updateResource(resourceId, updateData);
      
      await storage.logResourceAudit(
        resourceId,
        'updated',
        userId,
        updateData,
        'Resource updated by admin'
      );
      
      res.json(updatedResource);
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
      
      const resource = await storage.getResource(resourceId);
      if (!resource) {
        return res.status(404).json({ message: 'Resource not found' });
      }
      
      const resourceSnapshot = { title: resource.title, url: resource.url, category: resource.category };
      
      await storage.deleteResource(resourceId);
      
      await storage.logResourceAudit(
        resourceId,
        'deleted',
        userId,
        resourceSnapshot,
        'Resource deleted by admin'
      );
      
      res.json({ message: 'Resource deleted successfully' });
    } catch (error) {
      console.error('Error deleting resource:', error);
      res.status(500).json({ message: 'Failed to delete resource' });
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
      
      const result = await storage.listResources({
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
      
      const newResource = await storage.createResource({
        title: validatedData.title,
        url: validatedData.url,
        description: validatedData.description || '',
        category: validatedData.category || 'General Tools',
        subcategory: validatedData.subcategory || null,
        subSubcategory: validatedData.subSubcategory || null,
        status: validatedData.status || 'approved',
        submittedBy: userId
      });
      
      await storage.logResourceAudit(
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
  
  // ============= Resource Edit Management Routes =============
  
  // GET /api/admin/resource-edits - Get all pending resource edits (admin only)
  app.get('/api/admin/resource-edits', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const edits = await storage.getPendingResourceEdits();
      
      const editsWithResources = await Promise.all(
        edits.map(async (edit) => {
          const resource = await storage.getResource(edit.resourceId);
          return {
            ...edit,
            resource
          };
        })
      );
      
      res.json(editsWithResources);
    } catch (error) {
      console.error('Error fetching pending edits:', error);
      res.status(500).json({ message: 'Failed to fetch pending edits' });
    }
  });
  
  // POST /api/admin/resource-edits/:id/approve - Approve an edit (admin only)
  app.post('/api/admin/resource-edits/:id/approve', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const editId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      if (isNaN(editId)) {
        return res.status(400).json({ message: 'Invalid edit ID' });
      }
      
      await storage.approveResourceEdit(editId, userId);
      
      res.json({ message: 'Edit approved and merged successfully' });
    } catch (error: any) {
      console.error('Error approving edit:', error);
      
      if (error.message && error.message.includes('Conflict detected')) {
        return res.status(409).json({ 
          message: error.message,
          conflict: true
        });
      }
      
      res.status(500).json({ message: error.message || 'Failed to approve edit' });
    }
  });
  
  // POST /api/admin/resource-edits/:id/reject - Reject an edit (admin only)
  app.post('/api/admin/resource-edits/:id/reject', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const editId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const { reason } = req.body;
      
      if (isNaN(editId)) {
        return res.status(400).json({ message: 'Invalid edit ID' });
      }
      
      if (!reason || reason.trim().length < 10) {
        return res.status(400).json({ message: 'Rejection reason is required (minimum 10 characters)' });
      }
      
      await storage.rejectResourceEdit(editId, userId, reason);
      
      res.json({ message: 'Edit rejected successfully' });
    } catch (error: any) {
      console.error('Error rejecting edit:', error);
      res.status(500).json({ message: error.message || 'Failed to reject edit' });
    }
  });
  
  // POST /api/claude/analyze - Analyze URL with Claude AI (authenticated)
  app.post('/api/claude/analyze', isAuthenticated, async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ message: 'URL is required' });
      }
      
      if (!claudeService.isAvailable()) {
        return res.status(503).json({ 
          message: 'Claude AI service is not available',
          available: false
        });
      }
      
      const analysis = await claudeService.analyzeURL(url);
      
      if (!analysis) {
        return res.status(500).json({ message: 'Failed to analyze URL' });
      }
      
      res.json(analysis);
    } catch (error) {
      console.error('Error analyzing URL:', error);
      res.status(500).json({ message: 'Failed to analyze URL' });
    }
  });

  // ============= Category Management Routes =============
  
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
  
  // ============= Subcategory Management Routes =============
  
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
  
  // ============= Sub-subcategory Management Routes =============
  
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
  
  // ============= GitHub Sync Routes =============
  
  // POST /api/github/configure - Configure GitHub repository
  app.post('/api/github/configure', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { repositoryUrl, token } = req.body;
      
      if (!repositoryUrl) {
        return res.status(400).json({ message: 'Repository URL is required' });
      }
      
      const result = await syncService.configureRepository(repositoryUrl, token);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error configuring GitHub repository:', error);
      res.status(500).json({ message: 'Failed to configure GitHub repository' });
    }
  });
  
  // POST /api/github/import - Import resources from GitHub awesome list
  app.post('/api/github/import', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { repositoryUrl, options = {} } = req.body;
      
      if (!repositoryUrl) {
        return res.status(400).json({ message: 'Repository URL is required' });
      }
      
      // Add to queue for processing
      const queueItem = await storage.addToGithubSyncQueue({
        repositoryUrl,
        action: 'import',
        status: 'pending',
        resourceIds: [],
        metadata: options
      });
      
      // Process immediately in background
      syncService.importFromGitHub(repositoryUrl, options)
        .then(result => {
          console.log('GitHub import completed:', result);
        })
        .catch(error => {
          console.error('GitHub import failed:', error);
        });
      
      res.json({
        message: 'Import started',
        queueId: queueItem.id,
        status: 'processing'
      });
    } catch (error) {
      console.error('Error starting GitHub import:', error);
      res.status(500).json({ message: 'Failed to start GitHub import' });
    }
  });
  
  // POST /api/github/export - Export approved resources to GitHub
  app.post('/api/github/export', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { repositoryUrl, options = {} } = req.body;
      
      if (!repositoryUrl) {
        return res.status(400).json({ message: 'Repository URL is required' });
      }
      
      // Add to queue for processing
      const queueItem = await storage.addToGithubSyncQueue({
        repositoryUrl,
        action: 'export',
        status: 'pending',
        resourceIds: [],
        metadata: options
      });
      
      // Process immediately in background
      syncService.exportToGitHub(repositoryUrl, options)
        .then(result => {
          console.log('GitHub export completed:', result);
        })
        .catch(error => {
          console.error('GitHub export failed:', error);
        });
      
      res.json({
        message: 'Export started',
        queueId: queueItem.id,
        status: 'processing'
      });
    } catch (error) {
      console.error('Error starting GitHub export:', error);
      res.status(500).json({ message: 'Failed to start GitHub export' });
    }
  });
  
  // GET /api/github/sync-status - Check sync queue status
  app.get('/api/github/sync-status', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const status = req.query.status as string;
      const queueItems = await storage.getGithubSyncQueue(status);
      
      res.json({
        total: queueItems.length,
        items: queueItems
      });
    } catch (error) {
      console.error('Error fetching sync status:', error);
      res.status(500).json({ message: 'Failed to fetch sync status' });
    }
  });
  
  // GET /api/github/sync-status/:id - Get specific sync item status
  app.get('/api/github/sync-status/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const queueItems = await storage.getGithubSyncQueue();
      const item = queueItems.find(q => q.id === id);
      
      if (!item) {
        return res.status(404).json({ message: 'Sync item not found' });
      }
      
      res.json(item);
    } catch (error) {
      console.error('Error fetching sync item:', error);
      res.status(500).json({ message: 'Failed to fetch sync item' });
    }
  });
  
  // GET /api/github/sync-history - Get all sync history
  app.get('/api/github/sync-history', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const history = await storage.getSyncHistory();
      
      res.json(history.sort((a, b) => 
        new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
      ));
    } catch (error) {
      console.error('Error fetching sync history:', error);
      res.status(500).json({ message: 'Failed to fetch sync history' });
    }
  });
  
  // POST /api/github/process-queue - Manually trigger queue processing
  app.post('/api/github/process-queue', isAuthenticated, isAdmin, async (req, res) => {
    try {
      // Process queue in background
      syncService.processQueue()
        .then(() => {
          console.log('GitHub sync queue processing completed');
        })
        .catch(error => {
          console.error('GitHub sync queue processing failed:', error);
        });
      
      res.json({
        message: 'Queue processing started',
        status: 'processing'
      });
    } catch (error) {
      console.error('Error starting queue processing:', error);
      res.status(500).json({ message: 'Failed to start queue processing' });
    }
  });

  // ============= Awesome List Export & Validation Routes =============

  // POST /api/admin/export - Generate and download awesome list markdown
  app.post('/api/admin/export', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      // Get all approved resources
      const resources = await storage.getAllApprovedResources();
      
      // Get export options from request body
      const {
        title = 'Awesome Video',
        description = 'A curated list of awesome video resources, tools, frameworks, and learning materials.',
        includeContributing = true,
        includeLicense = true,
        websiteUrl = req.protocol + '://' + req.get('host'),
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

  // POST /api/admin/validate - Run awesome-lint validation on current data
  app.post('/api/admin/validate', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      // Get all approved resources
      const resources = await storage.getAllApprovedResources();
      
      // Get export options from request body
      const {
        title = 'Awesome Video',
        description = 'A curated list of awesome video resources, tools, frameworks, and learning materials.',
        includeContributing = true,
        includeLicense = true,
        websiteUrl = req.protocol + '://' + req.get('host'),
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
      await storage.storeValidationResult({
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
      const resources = await storage.getAllApprovedResources();
      
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
      await storage.storeValidationResult({
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

  // POST /api/admin/seed-database - Manual database seeding (optional)
  // Note: Database is automatically seeded on first startup. This endpoint is for:
  // - Re-seeding after data changes
  // - Clearing and rebuilding the database
  // - Manual admin intervention when needed
  app.post('/api/admin/seed-database', isAuthenticated, isAdmin, async (req, res) => {
    try {
      console.log('Starting manual database seeding...');
      
      // Get options from request body
      const { clearExisting = false } = req.body;
      
      // Run seeding
      const result = await seedDatabase({ clearExisting });
      
      // Return results
      res.json({
        success: true,
        message: 'Database seeding completed successfully',
        counts: {
          categoriesInserted: result.categoriesInserted,
          subcategoriesInserted: result.subcategoriesInserted,
          subSubcategoriesInserted: result.subSubcategoriesInserted,
          resourcesInserted: result.resourcesInserted,
        },
        errors: result.errors,
        totalErrors: result.errors.length
      });
    } catch (error: any) {
      console.error('Error seeding database:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to seed database',
        error: error.message 
      });
    }
  });

  // POST /api/admin/import-github - Import awesome list from GitHub URL
  app.post('/api/admin/import-github', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { repoUrl, dryRun = false } = req.body;
      
      if (!repoUrl) {
        return res.status(400).json({ message: 'Repository URL is required' });
      }

      console.log(`Starting GitHub import from: ${repoUrl}`);
      
      // Use the sync service to import
      const result = await syncService.importFromGitHub(repoUrl, { dryRun });
      
      console.log(`GitHub import completed: ${result.imported} imported, ${result.updated} updated, ${result.skipped} skipped`);
      
      res.json({
        success: true,
        imported: result.imported,
        updated: result.updated,
        skipped: result.skipped,
        errors: result.errors,
        message: `Successfully imported ${result.imported} resources from ${repoUrl}`
      });
    } catch (error: any) {
      console.error('Error importing from GitHub:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to import from GitHub',
        error: error.message 
      });
    }
  });

  // ============= Enrichment API Routes =============
  
  // POST /api/enrichment/start - Start batch enrichment job
  app.post('/api/enrichment/start', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { filter = 'unenriched', batchSize = 10 } = req.body;
      const userId = req.user?.claims?.sub;
      
      const jobId = await enrichmentService.queueBatchEnrichment({
        filter,
        batchSize,
        startedBy: userId
      });
      
      res.json({
        success: true,
        jobId,
        message: 'Batch enrichment job started successfully'
      });
    } catch (error: any) {
      console.error('Error starting enrichment job:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start enrichment job',
        error: error.message
      });
    }
  });
  
  // GET /api/enrichment/jobs - List all enrichment jobs
  app.get('/api/enrichment/jobs', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const jobs = await storage.listEnrichmentJobs(limit);
      
      res.json({
        success: true,
        jobs
      });
    } catch (error: any) {
      console.error('Error listing enrichment jobs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list enrichment jobs',
        error: error.message
      });
    }
  });
  
  // GET /api/enrichment/jobs/:id - Get job status with progress
  app.get('/api/enrichment/jobs/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      
      if (isNaN(jobId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid job ID'
        });
      }
      
      const job = await storage.getEnrichmentJob(jobId);
      
      if (!job) {
        return res.json({
          success: false,
          message: 'Job not found'
        });
      }
      
      res.json({
        success: true,
        job
      });
    } catch (error: any) {
      console.error('Error getting job status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get job status',
        error: error.message
      });
    }
  });
  
  // DELETE /api/enrichment/jobs/:id - Cancel a job
  app.delete('/api/enrichment/jobs/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      
      if (isNaN(jobId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid job ID'
        });
      }
      
      await enrichmentService.cancelJob(jobId);
      
      res.json({
        success: true,
        message: `Enrichment job ${jobId} cancelled successfully`
      });
    } catch (error: any) {
      console.error('Error cancelling job:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel job',
        error: error.message
      });
    }
  });

  // ============= Database-Driven Routes =============

  // API routes for awesome list - NOW SERVED FROM DATABASE
  app.get("/api/awesome-list", async (req, res) => {
    try {
      // Use database-driven hierarchy (replaces static JSON)
      const data = await storage.getAwesomeListFromDatabase();
      
      if (!data || !data.resources || data.resources.length === 0) {
        console.warn('⚠️ No resources in database - database may need seeding');
        return res.status(500).json({ error: 'No awesome list data available' });
      }

      // Extract query parameters for filtering
      const { category, subcategory, subSubcategory } = req.query;
      
      let filteredResources = data.resources;

      // Apply filtering based on query parameters
      if (category) {
        // Convert category slug back to title for filtering
        const categoryTitle = getCategoryTitleFromSlug(category as string);
        filteredResources = filteredResources.filter((resource: any) => 
          resource.category === categoryTitle
        );
        console.log(`📁 Filtered by category "${categoryTitle}": ${filteredResources.length} resources`);
      }

      if (subcategory) {
        // Convert subcategory slug back to title for filtering
        const subcategoryTitle = getSubcategoryTitleFromSlug(subcategory as string);
        filteredResources = filteredResources.filter((resource: any) => 
          resource.subcategory === subcategoryTitle
        );
        console.log(`📂 Filtered by subcategory "${subcategoryTitle}": ${filteredResources.length} resources`);
      }

      if (subSubcategory) {
        // Convert sub-subcategory slug back to title for filtering
        const subSubcategoryTitle = getSubSubcategoryTitleFromSlug(subSubcategory as string);
        filteredResources = filteredResources.filter((resource: any) => 
          resource.subSubcategory === subSubcategoryTitle
        );
        console.log(`🎯 Filtered by sub-subcategory "${subSubcategoryTitle}": ${filteredResources.length} resources`);
      }

      // Return filtered data
      const filteredData = {
        ...data,
        resources: filteredResources
      };
      
      console.log(`📊 /api/awesome-list: ${filteredResources.length} resources, ${data.categories.length} categories`);
      res.json(filteredData);
    } catch (error) {
      console.error('Error processing awesome list:', error);
      res.status(500).json({ error: 'Failed to process awesome list' });
    }
  });

  // New endpoint to switch lists
  app.post("/api/switch-list", async (req, res) => {
    try {
      const { rawUrl } = req.body;
      
      if (!rawUrl) {
        return res.status(400).json({ error: 'Raw URL is required' });
      }
      
      console.log(`Switching to list: ${rawUrl}`);
      const data = await fetchAwesomeList(rawUrl);
      storage.setAwesomeListData(data);
      
      console.log(`Successfully switched to list with ${data.resources.length} resources`);
      res.json(data);
    } catch (error) {
      console.error('Error switching list:', error);
      res.status(500).json({ error: 'Failed to switch list' });
    }
  });

  // GitHub awesome lists discovery routes
  app.get("/api/github/awesome-lists", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const perPage = parseInt(req.query.per_page as string) || 30;
      
      const result = await fetchAwesomeLists(page, perPage);
      res.json(result);
    } catch (error) {
      console.error('Error fetching awesome lists from GitHub:', error);
      res.status(500).json({ error: 'Failed to fetch awesome lists' });
    }
  });

  app.get("/api/github/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      const page = parseInt(req.query.page as string) || 1;
      
      if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
      }
      
      const result = await searchAwesomeLists(query, page);
      res.json(result);
    } catch (error) {
      console.error('Error searching awesome lists:', error);
      res.status(500).json({ error: 'Failed to search awesome lists' });
    }
  });

  // SEO routes
  app.get("/sitemap.xml", generateSitemap);
  app.get("/og-image.svg", generateOpenGraphImage);

  // ============= AI Recommendation Routes =============

  // GET /api/recommendations/init - Initialize recommendation engine
  app.get("/api/recommendations/init", async (req, res) => {
    try {
      res.json({ status: 'ready', message: 'Recommendation engine initialized' });
    } catch (error) {
      console.error('Error initializing recommendations:', error);
      res.status(500).json({ error: 'Failed to initialize recommendations' });
    }
  });

  // GET /api/recommendations - Get personalized recommendations
  app.get("/api/recommendations", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      
      // Create a user profile for anonymous users from query params
      const userProfile: AIUserProfile = {
        userId: 'anonymous',
        preferredCategories: (req.query.categories as string)?.split(',').filter(Boolean) || [],
        skillLevel: (req.query.skillLevel as string || 'intermediate') as 'beginner' | 'intermediate' | 'advanced',
        learningGoals: (req.query.goals as string)?.split(',').filter(Boolean) || [],
        preferredResourceTypes: (req.query.types as string)?.split(',').filter(Boolean) || [],
        timeCommitment: (req.query.timeCommitment as string || 'flexible') as 'daily' | 'weekly' | 'flexible',
        viewHistory: [],
        bookmarks: [],
        completedResources: [],
        ratings: {}
      };

      const result = await recommendationEngine.generateRecommendations(
        userProfile,
        limit,
        false
      );

      res.json(result.recommendations || []);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      res.status(500).json({ error: 'Failed to generate recommendations' });
    }
  });

  // POST /api/recommendations - Get personalized recommendations for authenticated users
  app.post("/api/recommendations", async (req, res) => {
    try {
      const userProfile: AIUserProfile = req.body;
      const limit = parseInt(req.query.limit as string) || 10;
      const forceRefresh = req.query.refresh === 'true';

      const result = await recommendationEngine.generateRecommendations(
        userProfile,
        limit,
        forceRefresh
      );

      res.json(result.recommendations || []);
    } catch (error) {
      console.error('Error generating AI recommendations:', error);
      res.status(500).json({ error: 'Failed to generate recommendations' });
    }
  });

  // POST /api/recommendations/feedback - Record user feedback on recommendations
  app.post("/api/recommendations/feedback", async (req, res) => {
    try {
      const { userId, resourceId, feedback, rating } = req.body;
      
      if (!userId || !resourceId || !feedback) {
        return res.status(400).json({ error: 'userId, resourceId, and feedback are required' });
      }

      // Record the feedback
      await recommendationEngine.recordFeedback(
        userId,
        resourceId,
        feedback as 'clicked' | 'dismissed' | 'completed',
        rating
      );

      res.json({ status: 'success', message: 'Feedback recorded' });
    } catch (error) {
      console.error('Error recording recommendation feedback:', error);
      res.status(500).json({ error: 'Failed to record feedback' });
    }
  });

  // GET /api/learning-paths/suggested - Get suggested learning paths
  app.get("/api/learning-paths/suggested", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      
      // Create a basic user profile from query params
      const userProfile: AIUserProfile = {
        userId: req.query.userId as string || 'anonymous',
        preferredCategories: (req.query.categories as string)?.split(',') || [],
        skillLevel: (req.query.skillLevel as string || 'intermediate') as 'beginner' | 'intermediate' | 'advanced',
        learningGoals: (req.query.goals as string)?.split(',') || [],
        preferredResourceTypes: [],
        timeCommitment: (req.query.timeCommitment as string || 'flexible') as 'daily' | 'weekly' | 'flexible',
        viewHistory: [],
        bookmarks: [],
        completedResources: [],
        ratings: {}
      };

      const paths = await learningPathGenerator.getSuggestedPaths(userProfile, limit);
      
      res.json(paths);
    } catch (error) {
      console.error('Error generating suggested learning paths:', error);
      res.status(500).json({ error: 'Failed to generate suggested learning paths' });
    }
  });

  // POST /api/learning-paths/generate - Generate custom learning path
  app.post("/api/learning-paths/generate", async (req, res) => {
    try {
      const { userProfile, category, customGoals } = req.body;
      
      if (!userProfile) {
        return res.status(400).json({ error: 'User profile is required' });
      }

      const path = await learningPathGenerator.generateLearningPath(
        userProfile,
        category,
        customGoals
      );

      res.json(path);
    } catch (error) {
      console.error('Error generating custom learning path:', error);
      res.status(500).json({ error: 'Failed to generate custom learning path' });
    }
  });

  // POST /api/learning-paths - Legacy route for compatibility
  app.post("/api/learning-paths", async (req, res) => {
    try {
      const userProfile: AIUserProfile = req.body;
      const limit = parseInt(req.query.limit as string) || 5;

      const paths = await learningPathGenerator.getSuggestedPaths(userProfile, limit);
      
      res.json(paths);
    } catch (error) {
      console.error('Error generating AI learning paths:', error);
      res.status(500).json({ error: 'Failed to generate learning paths' });
    }
  });

  // Track user interaction for improving recommendations
  app.post("/api/interactions", async (req, res) => {
    try {
      const { userId, resourceId, interactionType, interactionValue, metadata } = req.body;
      
      // Store interaction data (in a real app, this would go to database)
      // For now, we'll just acknowledge the interaction
      console.log(`User interaction: ${userId} ${interactionType} ${resourceId}`);
      
      res.json({ status: "recorded" });
    } catch (error) {
      console.error('Error recording interaction:', error);
      res.status(500).json({ error: 'Failed to record interaction' });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  const httpServer = createServer(app);
  return httpServer;
}

/**
 * Run background initialization tasks AFTER the server has started listening.
 * This ensures fast startup for production deployments.
 * These tasks are non-blocking and run in the background.
 * 
 * NOTE: /api/awesome-list now serves data from the PostgreSQL database
 * directly via storage.getAwesomeListFromDatabase(). No static JSON loading required.
 */
export async function runBackgroundInitialization(): Promise<void> {
  const isProduction = process.env.NODE_ENV === 'production';
  
  console.log(`🔄 Running background initialization (${isProduction ? 'production' : 'development'} mode)...`);
  console.log('📊 Note: /api/awesome-list now serves from PostgreSQL database');

  // Both dev and production: Check and seed database if needed
  // This ensures data consistency across environments
  try {
    console.log('Checking if database needs seeding...');
    const categories = await storage.listCategories();
    
    // Query database DIRECTLY for actual resource count (not via API that depends on mapCategoryName)
    // This prevents false-positive reseeding when category mapping isn't working yet
    const actualResourceCount = await storage.getResourceCount();
    
    // Only reseed if database is truly empty (both categories AND resources missing)
    // Don't reseed just because user added/removed items - preserve user changes
    const needsReseeding = (categories.length === 0 && actualResourceCount === 0);
    
    if (needsReseeding) {
      console.log(`📦 Database needs seeding (categories: ${categories.length}, resources: ${actualResourceCount})...`);
      console.log(`⚙️  Running database seeding in ${isProduction ? 'production' : 'development'} mode...`);
      const seedResult = await seedDatabase({ clearExisting: actualResourceCount > 0 ? true : false });
      
      console.log('✅ Auto-seeding completed successfully:');
      console.log(`   - Categories: ${seedResult.categoriesInserted}`);
      console.log(`   - Subcategories: ${seedResult.subcategoriesInserted}`);
      console.log(`   - Sub-subcategories: ${seedResult.subSubcategoriesInserted}`);
      console.log(`   - Resources: ${seedResult.resourcesInserted}`);
      
      if (seedResult.errors.length > 0) {
        console.warn(`⚠️  Seeding completed with ${seedResult.errors.length} errors`);
      }
    } else {
      console.log(`✓ Database already populated: ${categories.length} categories, ${actualResourceCount} resources`);
    }
  } catch (error) {
    console.error('❌ Error during auto-seeding (non-fatal):', error);
    console.log('Server will continue without seeding. You can manually seed via /api/admin/seed-database');
  }
  
  console.log('✅ Background initialization complete');
}
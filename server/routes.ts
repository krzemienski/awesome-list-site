import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
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

// SEO route handlers
function generateSitemap(req: any, res: any) {
  try {
    const awesomeListData = storage.getAwesomeListData();
    
    if (!awesomeListData) {
      return res.status(404).send('Sitemap not available - no data loaded');
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

    const categories = storage.getCategories();
    categories.forEach(category => {
      const categorySlug = category.name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      sitemap += `
  <url>
    <loc>${baseUrl}/category/${categorySlug}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
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

function generateOpenGraphImage(req: any, res: any) {
  try {
    const { title, category, resourceCount } = req.query;
    const awesomeListData = storage.getAwesomeListData();
    
    const pageTitle = title || awesomeListData?.title || 'Awesome List';
    const count = resourceCount || awesomeListData?.resources?.length || '2750+';

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
  // Set up authentication
  await setupAuth(app);

  // Initialize awesome video data
  try {
    console.log('Fetching awesome-video data from JSON source');
    const awesomeVideoData = await fetchAwesomeVideoData();
    storage.setAwesomeListData(awesomeVideoData);
    console.log(`Successfully fetched awesome-video with ${awesomeVideoData.resources.length} resources`);
  } catch (error) {
    console.error(`Error fetching awesome-video data: ${error}`);
  }

  // Auto-seed database on first startup
  try {
    console.log('Checking if database needs seeding...');
    const categories = await storage.listCategories();
    const resourcesResult = await storage.listResources({ page: 1, limit: 1, status: 'approved' });
    
    if (categories.length === 0 || resourcesResult.total === 0) {
      console.log('📦 Database needs seeding (categories: ${categories.length}, resources: ${resourcesResult.total})...');
      const seedResult = await seedDatabase({ clearExisting: false });
      
      console.log('✅ Auto-seeding completed successfully:');
      console.log(`   - Categories: ${seedResult.categoriesInserted}`);
      console.log(`   - Subcategories: ${seedResult.subcategoriesInserted}`);
      console.log(`   - Sub-subcategories: ${seedResult.subSubcategoriesInserted}`);
      console.log(`   - Resources: ${seedResult.resourcesInserted}`);
      
      if (seedResult.errors.length > 0) {
        console.warn(`⚠️  Seeding completed with ${seedResult.errors.length} errors`);
      }
    } else {
      console.log(`✓ Database already populated: ${categories.length} categories, ${resourcesResult.total} resources`);
    }
  } catch (error) {
    console.error('❌ Error during auto-seeding (non-fatal):', error);
    console.log('Server will continue without seeding. You can manually seed via /api/admin/seed-database');
  }

  // ============= Auth Routes (from Replit Auth blueprint) =============
  
  // GET /api/auth/user - Get current user (public endpoint)
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated() || !req.user?.claims?.sub) {
        return res.json({ user: null, isAuthenticated: false });
      }

      const userId = req.user.claims.sub;
      const dbUser = await storage.getUser(userId);
      
      if (!dbUser) {
        return res.json({ user: null, isAuthenticated: false });
      }

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
  
  // POST /api/resources/:id/edit - Suggest edit to existing resource (authenticated)
  app.post('/api/resources/:id/edit', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const resourceData = insertResourceSchema.parse(req.body);
      
      // Create a new pending resource with the edit suggestions
      const resource = await storage.createResource({
        ...resourceData,
        submittedBy: userId,
        status: 'pending',
        metadata: {
          editOf: id,
          editType: 'suggestion'
        }
      });
      
      res.status(201).json(resource);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid resource data', errors: error.errors });
      }
      console.error('Error creating edit suggestion:', error);
      res.status(500).json({ message: 'Failed to create edit suggestion' });
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

  // ============= Learning Journey Routes =============
  
  // GET /api/journeys - List all journeys
  app.get('/api/journeys', async (req, res) => {
    try {
      const category = req.query.category as string;
      const journeys = await storage.listLearningJourneys(category);
      res.json(journeys);
    } catch (error) {
      console.error('Error fetching journeys:', error);
      res.status(500).json({ message: 'Failed to fetch journeys' });
    }
  });
  
  // GET /api/journeys/:id - Get journey details
  app.get('/api/journeys/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const journey = await storage.getLearningJourney(id);
      
      if (!journey) {
        return res.status(404).json({ message: 'Journey not found' });
      }
      
      // Get journey steps
      const steps = await storage.listJourneySteps(id);
      
      res.json({ ...journey, steps });
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
  
  // GET /api/github/history - Get sync history for a repository
  app.get('/api/github/history', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { repositoryUrl } = req.query;
      
      if (!repositoryUrl) {
        return res.status(400).json({ message: 'Repository URL is required' });
      }
      
      const history = await syncService.getSyncHistory(repositoryUrl as string);
      
      res.json({
        total: history.length,
        history: history.sort((a, b) => 
          new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
        )
      });
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

  // ============= Legacy Routes (from existing code) =============

  // API routes for awesome list (legacy)
  app.get("/api/awesome-list", (req, res) => {
    try {
      const data = storage.getAwesomeListData();
      
      if (!data) {
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

  // GET /api/recommendations - Get personalized recommendations (enhanced AI-powered)
  app.get("/api/recommendations", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      
      // Create a mock user profile for non-authenticated users
      // In production, you'd get this from the authenticated user's data
      const userProfile: AIUserProfile = {
        userId: 'anonymous',
        preferredCategories: (req.query.categories as string)?.split(',') || [],
        skillLevel: (req.query.skillLevel as string || 'intermediate') as 'beginner' | 'intermediate' | 'advanced',
        learningGoals: (req.query.goals as string)?.split(',') || [],
        preferredResourceTypes: (req.query.types as string)?.split(',') || [],
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

      res.json(result);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      res.status(500).json({ error: 'Failed to generate recommendations' });
    }
  });

  // POST /api/recommendations - Get personalized recommendations for authenticated user
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

      res.json(result);
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
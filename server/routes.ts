import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { fetchAwesomeList } from "./parser";
import { fetchAwesomeVideoList } from "./awesome-video-parser";
import { processAwesomeListData } from "../client/src/lib/parser";
import { fetchAwesomeLists, searchAwesomeLists } from "./github-api";

const AWESOME_RAW_URL = process.env.AWESOME_RAW_URL || "https://raw.githubusercontent.com/avelino/awesome-go/main/README.md";

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

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize awesome-go data
  try {
    console.log('Fetching awesome-go data from markdown source');
    const awesomeGoData = await fetchAwesomeList(AWESOME_RAW_URL);
    storage.setAwesomeListData(awesomeGoData);
    console.log(`Successfully fetched awesome-go with ${awesomeGoData.resources.length} resources`);
  } catch (error) {
    console.error(`Error fetching awesome-go data: ${error}`);
    // Fallback to awesome-video if awesome-go fails
    try {
      console.log('Falling back to awesome-video data');
      const awesomeVideoData = await fetchAwesomeVideoList();
      storage.setAwesomeListData(awesomeVideoData);
      console.log(`Successfully fetched awesome-video with ${awesomeVideoData.resources.length} resources`);
    } catch (fallbackError) {
      console.error(`Error fetching fallback data: ${fallbackError}`);
    }
  }

  // API routes
  app.get("/api/awesome-list", (req, res) => {
    try {
      const data = storage.getAwesomeListData();
      
      if (!data) {
        return res.status(500).json({ error: 'No awesome list data available' });
      }
      
      // Process the data to match the expected frontend format
      const processedData = processAwesomeListData(data);
      res.json(processedData);
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
      
      const processedData = processAwesomeListData(data);
      console.log(`Successfully switched to list with ${data.resources.length} resources`);
      res.json(processedData);
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

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  const httpServer = createServer(app);
  return httpServer;
}

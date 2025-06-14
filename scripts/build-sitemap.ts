/**
 * Sitemap Generation Script for Awesome Video Static Site
 * Generates sitemap.json for static deployment
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface SitemapEntry {
  url: string;
  lastModified: string;
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

interface AwesomeVideoProject {
  title: string;
  homepage: string;
  description?: string;
  category?: string[];
  tags?: string[];
}

interface AwesomeVideoData {
  projects: AwesomeVideoProject[];
}

async function generateSitemap() {
  const baseUrl = process.env.VITE_SITE_URL || 'https://krzemienski.github.io/awesome-list-site';
  const currentDate = new Date().toISOString();
  
  console.log('🗺️  Generating sitemap for deployment...');
  
  const sitemap: SitemapEntry[] = [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 1.0
    },
    {
      url: `${baseUrl}/about`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8
    },
    {
      url: `${baseUrl}/advanced`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7
    }
  ];

  // Load awesome-video data
  const dataPath = join(process.cwd(), 'client/public/data/awesome-list.json');
  
  if (existsSync(dataPath)) {
    try {
      const rawData = readFileSync(dataPath, 'utf-8');
      const data: AwesomeVideoData = JSON.parse(rawData);
      
      // Extract unique categories
      const categories = new Set<string>();
      
      data.projects.forEach(project => {
        if (project.category && Array.isArray(project.category)) {
          project.category.forEach(cat => {
            if (cat && cat.trim()) {
              categories.add(cat.toLowerCase().replace(/\s+/g, '-'));
            }
          });
        }
      });

      // Add category pages to sitemap
      categories.forEach(category => {
        sitemap.push({
          url: `${baseUrl}/category/${category}`,
          lastModified: currentDate,
          changeFrequency: 'weekly',
          priority: 0.9
        });
      });

      console.log(`✅ Generated sitemap with ${sitemap.length} entries`);
      console.log(`📊 Categories found: ${categories.size}`);
      
    } catch (error) {
      console.warn('⚠️  Could not process awesome-list data for sitemap:', error);
    }
  } else {
    console.warn('⚠️  awesome-list.json not found, generating basic sitemap');
  }

  // Write sitemap.json
  const sitemapPath = join(process.cwd(), 'client/public/data/sitemap.json');
  writeFileSync(sitemapPath, JSON.stringify(sitemap, null, 2));
  
  console.log(`📝 Sitemap written to ${sitemapPath}`);
  
  // Also generate XML sitemap for better SEO
  const xmlSitemap = generateXMLSitemap(sitemap);
  const xmlPath = join(process.cwd(), 'client/public/sitemap.xml');
  writeFileSync(xmlPath, xmlSitemap);
  
  console.log(`🌐 XML sitemap written to ${xmlPath}`);
}

function generateXMLSitemap(entries: SitemapEntry[]): string {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(entry => `  <url>
    <loc>${entry.url}</loc>
    <lastmod>${entry.lastModified}</lastmod>
    <changefreq>${entry.changeFrequency}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
  
  return xml;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateSitemap().catch(console.error);
}

export { generateSitemap };
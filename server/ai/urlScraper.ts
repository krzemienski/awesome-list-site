import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export interface UrlMetadata {
  title?: string;
  description?: string;
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  twitterCard?: string;
  twitterImage?: string;
  favicon?: string;
  author?: string;
  publishedDate?: string;
  keywords?: string[];
  error?: string;
}

export async function fetchUrlMetadata(url: string, timeout: number = 10000): Promise<UrlMetadata> {
  try {
    // Validate URL
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { error: 'Invalid protocol - only HTTP/HTTPS supported' };
    }

    // Fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AwesomeVideoBot/1.0; +https://awesome-video.repl.co)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
      redirect: 'follow',
      size: 5 * 1024 * 1024 // 5MB max
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { error: `HTTP ${response.status}: ${response.statusText}` };
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return { error: `Not HTML content: ${contentType}` };
    }

    const html = await response.text();
    return parseHtmlMetadata(html, url);

  } catch (error: any) {
    if (error.name === 'AbortError') {
      return { error: 'Request timeout' };
    }
    return { error: error.message || 'Unknown error' };
  }
}

function parseHtmlMetadata(html: string, baseUrl: string): UrlMetadata {
  const $ = cheerio.load(html);
  const metadata: UrlMetadata = {};

  // Basic metadata
  metadata.title = $('title').first().text().trim() || undefined;
  metadata.description = $('meta[name="description"]').attr('content')?.trim() || undefined;
  metadata.author = $('meta[name="author"]').attr('content')?.trim() || undefined;
  
  const keywordsContent = $('meta[name="keywords"]').attr('content');
  metadata.keywords = keywordsContent 
    ? keywordsContent.split(',').map(k => k.trim()).filter(Boolean)
    : undefined;

  // Open Graph
  metadata.ogTitle = $('meta[property="og:title"]').attr('content')?.trim() || undefined;
  metadata.ogDescription = $('meta[property="og:description"]').attr('content')?.trim() || undefined;
  metadata.ogImage = $('meta[property="og:image"]').attr('content')?.trim() || undefined;

  // Twitter Card
  metadata.twitterCard = $('meta[name="twitter:card"]').attr('content')?.trim() || undefined;
  metadata.twitterImage = $('meta[name="twitter:image"]').attr('content')?.trim() || undefined;

  // Favicon
  const favicon = $('link[rel="icon"]').attr('href') || $('link[rel="shortcut icon"]').attr('href');
  if (favicon) {
    metadata.favicon = new URL(favicon, baseUrl).href;
  }

  // Relative to absolute URLs for images
  if (metadata.ogImage && !metadata.ogImage.startsWith('http')) {
    metadata.ogImage = new URL(metadata.ogImage, baseUrl).href;
  }
  if (metadata.twitterImage && !metadata.twitterImage.startsWith('http')) {
    metadata.twitterImage = new URL(metadata.twitterImage, baseUrl).href;
  }

  return metadata;
}

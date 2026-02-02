/**
 * Web Research Module
 *
 * Provides web search and scraping capabilities for AI research jobs.
 * Features:
 * - Web search via fetch (using search APIs or scraping)
 * - Enhanced URL scraping with metadata extraction
 * - Source credibility validation
 * - 24-hour response caching
 * - Robots.txt respect
 * - Rate limiting
 */

import * as cheerio from 'cheerio';

// Cache for scraped content (24-hour TTL)
interface ScrapedContent {
  url: string;
  title: string;
  description: string;
  content: string; // Main text content
  metadata: {
    ogImage?: string;
    ogTitle?: string;
    ogDescription?: string;
    author?: string;
    publishedDate?: string;
    lastModified?: string;
  };
  scrapedAt: Date;
  statusCode: number;
}

interface WebSearchResult {
  url: string;
  title: string;
  snippet: string;
  source: string;
}

interface SourceCredibility {
  score: number; // 0-100
  factors: {
    domainTrust: number;
    hasHttps: boolean;
    hasAuthor: boolean;
    hasDate: boolean;
    contentLength: number;
  };
  warnings: string[];
}

// Domain trust scores (higher = more trusted)
const DOMAIN_TRUST_SCORES: Record<string, number> = {
  'github.com': 95,
  'stackoverflow.com': 90,
  'developer.mozilla.org': 95,
  'arxiv.org': 90,
  'medium.com': 60,
  'dev.to': 70,
  'wikipedia.org': 85,
  'reddit.com': 55,
  'hackernews.com': 75,
  'techcrunch.com': 70,
  'wired.com': 75,
  'arstechnica.com': 80,
  'theverge.com': 70,
  'smashingmagazine.com': 80,
  'css-tricks.com': 85,
  'nodejs.org': 95,
  'reactjs.org': 95,
  'vuejs.org': 95,
};

export class WebResearchService {
  private static instance: WebResearchService;
  private scrapeCache: Map<string, { content: ScrapedContent; expiry: number }> = new Map();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly SCRAPE_TIMEOUT = 15000; // 15 seconds
  private readonly MAX_CONTENT_LENGTH = 100000; // 100KB text
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_DELAY = 500; // 500ms between requests

  private constructor() {}

  public static getInstance(): WebResearchService {
    if (!WebResearchService.instance) {
      WebResearchService.instance = new WebResearchService();
    }
    return WebResearchService.instance;
  }

  /**
   * Scrape a URL and extract content with caching
   */
  public async scrapeUrl(url: string, forceRefresh = false): Promise<ScrapedContent | null> {
    // Check cache first
    if (!forceRefresh) {
      const cached = this.scrapeCache.get(url);
      if (cached && cached.expiry > Date.now()) {
        return cached.content;
      }
    }

    // Apply rate limiting
    await this.applyRateLimit();

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'AwesomeListBot/1.0 (Research; +https://awesome-list.example.com)',
          'Accept': 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(this.SCRAPE_TIMEOUT),
      });

      if (!response.ok) {
        return {
          url,
          title: '',
          description: '',
          content: '',
          metadata: {},
          scrapedAt: new Date(),
          statusCode: response.status,
        };
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Extract metadata
      const content: ScrapedContent = {
        url,
        title: $('title').text().trim() || $('h1').first().text().trim() || '',
        description: $('meta[name="description"]').attr('content') ||
                     $('meta[property="og:description"]').attr('content') || '',
        content: this.extractMainContent($, html),
        metadata: {
          ogImage: $('meta[property="og:image"]').attr('content'),
          ogTitle: $('meta[property="og:title"]').attr('content'),
          ogDescription: $('meta[property="og:description"]').attr('content'),
          author: $('meta[name="author"]').attr('content') ||
                  $('[rel="author"]').text().trim(),
          publishedDate: $('meta[property="article:published_time"]').attr('content') ||
                         $('time[datetime]').attr('datetime'),
          lastModified: response.headers.get('last-modified') || undefined,
        },
        scrapedAt: new Date(),
        statusCode: response.status,
      };

      // Cache the result
      this.scrapeCache.set(url, {
        content,
        expiry: Date.now() + this.CACHE_TTL,
      });

      return content;
    } catch (error: any) {
      console.error(`Failed to scrape ${url}:`, error.message);
      return null;
    }
  }

  /**
   * Extract main content from HTML
   */
  private extractMainContent($: cheerio.CheerioAPI, html: string): string {
    // Remove scripts, styles, nav, footer, etc.
    $('script, style, nav, footer, header, aside, .sidebar, .comments, .ads').remove();

    // Try to find main content area
    let content = $('main').text() ||
                  $('article').text() ||
                  $('[role="main"]').text() ||
                  $('body').text();

    // Clean up whitespace
    content = content.replace(/\s+/g, ' ').trim();

    // Truncate if too long
    if (content.length > this.MAX_CONTENT_LENGTH) {
      content = content.substring(0, this.MAX_CONTENT_LENGTH) + '...';
    }

    return content;
  }

  /**
   * Validate source credibility
   */
  public validateSourceCredibility(url: string, content: ScrapedContent): SourceCredibility {
    const warnings: string[] = [];
    let domainTrust = 50; // Default

    try {
      const parsedUrl = new URL(url);
      const domain = parsedUrl.hostname.replace('www.', '');

      // Check domain trust
      for (const [trustedDomain, score] of Object.entries(DOMAIN_TRUST_SCORES)) {
        if (domain === trustedDomain || domain.endsWith(`.${trustedDomain}`)) {
          domainTrust = score;
          break;
        }
      }

      const hasHttps = parsedUrl.protocol === 'https:';
      const hasAuthor = !!content.metadata.author;
      const hasDate = !!content.metadata.publishedDate;
      const contentLength = content.content.length;

      if (!hasHttps) warnings.push('Not served over HTTPS');
      if (!hasAuthor) warnings.push('No author attribution');
      if (!hasDate) warnings.push('No publication date');
      if (contentLength < 500) warnings.push('Very short content');

      // Calculate overall score
      let score = domainTrust;
      if (!hasHttps) score -= 10;
      if (!hasAuthor) score -= 5;
      if (!hasDate) score -= 5;
      if (contentLength < 500) score -= 10;

      return {
        score: Math.max(0, Math.min(100, score)),
        factors: {
          domainTrust,
          hasHttps,
          hasAuthor,
          hasDate,
          contentLength,
        },
        warnings,
      };
    } catch (error) {
      return {
        score: 0,
        factors: {
          domainTrust: 0,
          hasHttps: false,
          hasAuthor: false,
          hasDate: false,
          contentLength: 0,
        },
        warnings: ['Invalid URL'],
      };
    }
  }

  /**
   * Check if URL respects robots.txt (basic check)
   */
  public async checkRobotsTxt(url: string): Promise<boolean> {
    try {
      const parsedUrl = new URL(url);
      const robotsUrl = `${parsedUrl.origin}/robots.txt`;

      const response = await fetch(robotsUrl, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) return true; // No robots.txt = allowed

      const robotsTxt = await response.text();
      const userAgentSection = robotsTxt.toLowerCase().includes('user-agent: *');
      const disallowAll = robotsTxt.toLowerCase().includes('disallow: /');

      // Very basic check - if disallow all for *, respect it
      if (userAgentSection && disallowAll) {
        return false;
      }

      return true;
    } catch {
      return true; // On error, assume allowed
    }
  }

  /**
   * Apply rate limiting between requests
   */
  private async applyRateLimit(): Promise<void> {
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;
    if (timeSinceLastRequest < this.MIN_REQUEST_DELAY) {
      await new Promise(resolve =>
        setTimeout(resolve, this.MIN_REQUEST_DELAY - timeSinceLastRequest)
      );
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * Clear the scrape cache
   */
  public clearCache(): void {
    this.scrapeCache.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; oldestEntry: Date | null } {
    let oldest: Date | null = null;
    for (const entry of Array.from(this.scrapeCache.values())) {
      const scrapedAt = entry.content.scrapedAt;
      if (!oldest || scrapedAt < oldest) {
        oldest = scrapedAt;
      }
    }
    return {
      size: this.scrapeCache.size,
      oldestEntry: oldest,
    };
  }
}

export const webResearchService = WebResearchService.getInstance();

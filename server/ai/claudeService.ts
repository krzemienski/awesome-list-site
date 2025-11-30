import Anthropic from '@anthropic-ai/sdk';
import Redis from 'ioredis';

// <important_do_not_delete>
const DEFAULT_MODEL_STR = "claude-haiku-4-5"; // Claude Haiku 4.5 (October 2025) - 4-5x faster, 1/3 cost
// </important_do_not_delete>

/**
 * Trusted domains for Claude URL analysis (video streaming related)
 * This allowlist approach provides complete SSRF protection by only allowing
 * known, trusted domains for video streaming and development resources.
 */
const ALLOWED_DOMAINS = [
  'github.com',
  'youtube.com',
  'youtu.be',
  'vimeo.com',
  'twitch.tv',
  'dailymotion.com',
  'bitmovin.com',
  'cloudflare.com',
  'akamai.com',
  'fastly.com',
  'wowza.com',
  'encoding.com',
  'zencoder.com',
  'mux.com',
  'jwplayer.com',
  'videojs.com',
  'npmjs.com',
  'unpkg.com',
  'cdn.jsdelivr.net',
  'stackoverflow.com',
  'medium.com',
  'dev.to',
  'docs.microsoft.com',
  'developer.mozilla.org',
  'w3.org',
  'ietf.org',
  'whatwg.org'
];

interface CacheEntry {
  response: string;
  timestamp: number;
}

interface AnalysisCache {
  result: any;
  timestamp: number;
}

export class ClaudeService {
  private static instance: ClaudeService;
  private anthropic: Anthropic | null = null;
  private redis: Redis | null = null;
  private responseCache: Map<string, CacheEntry>;
  private analysisCache: Map<string, AnalysisCache>;
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour cache
  private readonly ANALYSIS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hour cache for URL analysis
  private readonly MAX_CACHE_SIZE = 100;
  private requestCount = 0;
  private lastRequestTime = 0;
  private readonly RATE_LIMIT_DELAY = 1000; // 1 second between requests

  private constructor() {
    this.responseCache = new Map();
    this.analysisCache = new Map();
    this.initializeRedis();
    this.initializeClient();
  }

  /**
   * Initialize Redis client if REDIS_URL is available
   */
  private initializeRedis(): void {
    if (process.env.REDIS_URL) {
      try {
        this.redis = new Redis(process.env.REDIS_URL);
        this.redis.on('error', (err) => {
          console.error('Redis error:', err);
          this.redis = null; // Fallback to in-memory
        });
        this.redis.on('connect', () => {
          console.log('✅ Redis cache connected for ClaudeService');
        });
      } catch (error) {
        console.error('Failed to initialize Redis:', error);
        this.redis = null;
      }
    } else {
      console.log('Redis not configured - using in-memory cache only');
    }
  }

  public static getInstance(): ClaudeService {
    if (!ClaudeService.instance) {
      ClaudeService.instance = new ClaudeService();
    }
    return ClaudeService.instance;
  }

  /**
   * Initialize the Anthropic client if API key is available
   */
  private initializeClient(): void {
    const apiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
    const baseURL = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;

    if (apiKey) {
      try {
        this.anthropic = new Anthropic({
          apiKey,
          ...(baseURL && { baseURL })
        });
        console.log('Claude service initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Claude service:', error);
        this.anthropic = null;
      }
    } else {
      console.log('Claude API key not found - AI features will use fallback methods');
    }
  }

  /**
   * Check if the Claude service is available
   */
  public isAvailable(): boolean {
    return this.anthropic !== null;
  }

  /**
   * Generate a response using Claude with caching and rate limiting
   */
  public async generateResponse(
    prompt: string,
    maxTokens: number = 1000,
    systemPrompt?: string
  ): Promise<string | null> {
    if (!this.isAvailable()) {
      console.log('Claude service not available, returning null');
      return null;
    }

    // Create cache key from prompt
    const cacheKey = this.createCacheKey(prompt + (systemPrompt || ''));

    // Check cache first
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      console.log('Returning cached Claude response');
      return cached;
    }

    // Apply rate limiting
    await this.applyRateLimit();

    try {
      console.log('Generating new Claude response...');
      const response = await this.anthropic!.messages.create({
        model: DEFAULT_MODEL_STR,
        system: systemPrompt || "You are a helpful AI assistant specializing in video development and streaming technologies.",
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: maxTokens
      });

      const responseText = (response.content[0] as any).text || '';

      // Cache the response
      await this.addToCache(cacheKey, responseText);

      // Update request tracking
      this.requestCount++;
      this.lastRequestTime = Date.now();

      return responseText;

    } catch (error: any) {
      console.error('Claude API error:', error.message || error);
      
      // Handle specific error types
      if (error.status === 429) {
        console.log('Rate limited by Claude API, backing off...');
        // Exponential backoff could be implemented here
      } else if (error.status === 401) {
        console.error('Invalid API key - disabling Claude service');
        this.anthropic = null;
      }

      return null;
    }
  }

  /**
   * Generate embeddings for semantic similarity (if supported)
   */
  public async generateEmbedding(text: string): Promise<number[] | null> {
    // Note: Claude doesn't directly support embeddings
    // This is a placeholder for potential future implementation
    // or integration with a different embedding service
    console.log('Embedding generation not implemented for Claude');
    return null;
  }

  /**
   * Apply rate limiting to prevent API throttling
   */
  private async applyRateLimit(): Promise<void> {
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;
    if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
      const delay = this.RATE_LIMIT_DELAY - timeSinceLastRequest;
      console.log(`Rate limiting: waiting ${delay}ms before next request`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  /**
   * Create a cache key from the prompt
   */
  private createCacheKey(prompt: string): string {
    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < prompt.length; i++) {
      const char = prompt.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `claude_${hash}`;
  }

  /**
   * Get a response from cache if valid (tries Redis first, then in-memory)
   */
  private async getFromCache(key: string): Promise<string | null> {
    // Try Redis first
    if (this.redis) {
      try {
        const cached = await this.redis.get(`claude:response:${key}`);
        if (cached) {
          console.log('Redis cache HIT');
          return cached;
        }
      } catch (error) {
        console.warn('Redis get failed, falling back to memory:', error);
      }
    }

    // Fallback to in-memory
    const entry = this.responseCache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > this.CACHE_TTL) {
      this.responseCache.delete(key);
      return null;
    }

    return entry.response;
  }

  /**
   * Add a response to cache (writes to both Redis and in-memory)
   */
  private async addToCache(key: string, response: string): Promise<void> {
    // Store in Redis with TTL
    if (this.redis) {
      try {
        await this.redis.setex(
          `claude:response:${key}`,
          Math.floor(this.CACHE_TTL / 1000), // TTL in seconds
          response
        );
      } catch (error) {
        console.warn('Redis set failed:', error);
      }
    }

    // Also store in memory as fallback
    if (this.responseCache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.responseCache.keys().next().value;
      if (oldestKey) {
        this.responseCache.delete(oldestKey);
      }
    }

    this.responseCache.set(key, {
      response,
      timestamp: Date.now()
    });
  }

  /**
   * Clear the cache
   */
  public clearCache(): void {
    this.responseCache.clear();
  }

  /**
   * Get service statistics
   */
  public getStats(): {
    available: boolean;
    requestCount: number;
    cacheSize: number;
    cacheHitRate: number;
  } {
    return {
      available: this.isAvailable(),
      requestCount: this.requestCount,
      cacheSize: this.responseCache.size,
      cacheHitRate: 0 // Could implement proper tracking
    };
  }

  /**
   * Validate and test the Claude connection
   */
  public async testConnection(): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      const response = await this.generateResponse(
        'Say "Hello" in one word',
        10,
        'You are a test assistant. Respond with exactly one word.'
      );
      return response !== null && response.length > 0;
    } catch (error) {
      console.error('Claude connection test failed:', error);
      return false;
    }
  }

  /**
   * Batch process multiple prompts efficiently
   */
  public async batchProcess(
    prompts: string[],
    maxTokensPerPrompt: number = 500,
    systemPrompt?: string
  ): Promise<(string | null)[]> {
    const results: (string | null)[] = [];

    for (const prompt of prompts) {
      const response = await this.generateResponse(prompt, maxTokensPerPrompt, systemPrompt);
      results.push(response);
      
      // Add delay between batch requests to respect rate limits
      if (prompts.indexOf(prompt) < prompts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY));
      }
    }

    return results;
  }

  /**
   * Get cached analysis result
   */
  private getCachedAnalysis(url: string): any | null {
    const entry = this.analysisCache.get(url);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > this.ANALYSIS_CACHE_TTL) {
      this.analysisCache.delete(url);
      return null;
    }

    return entry.result;
  }

  /**
   * Cache analysis result
   */
  private cacheAnalysis(url: string, result: any): void {
    if (this.analysisCache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.analysisCache.keys().next().value;
      if (oldestKey) {
        this.analysisCache.delete(oldestKey);
      }
    }

    this.analysisCache.set(url, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Analyze a URL and extract metadata for video streaming resources
   * Uses domain allowlist for SSRF protection
   */
  public async analyzeURL(url: string): Promise<{
    suggestedTitle: string;
    suggestedDescription: string;
    suggestedTags: string[];
    suggestedCategory: string;
    suggestedSubcategory?: string;
    confidence: number;
    keyTopics: string[];
  } | null> {
    if (!this.isAvailable()) {
      console.log('Claude service not available for URL analysis');
      return null;
    }

    // Parse and validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch (error) {
      throw new Error('Invalid URL format');
    }

    // Only allow HTTPS (not http, file://, ftp://, etc.)
    if (parsedUrl.protocol !== 'https:') {
      throw new Error('Only HTTPS URLs are allowed');
    }

    // SECURITY: Domain allowlist (eliminates ALL SSRF risks)
    const hostname = parsedUrl.hostname.toLowerCase();
    const isAllowed = ALLOWED_DOMAINS.some(allowedDomain => {
      // Match exact domain or subdomain
      return hostname === allowedDomain || 
             hostname === `www.${allowedDomain}` ||
             hostname.endsWith(`.${allowedDomain}`);
    });

    if (!isAllowed) {
      throw new Error(
        `Domain "${hostname}" is not in the allowlist of trusted video streaming domains. ` +
        `Allowed domains include: ${ALLOWED_DOMAINS.slice(0, 5).join(', ')}, etc.`
      );
    }

    // Check cache
    const cached = this.getCachedAnalysis(url);
    if (cached) {
      console.log('Returning cached URL analysis');
      return cached;
    }

    try {
      let pageContent = '';
      
      try {
        const fetch = (await import('node-fetch')).default;
        
        // Fetch with safeguards - timeout handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'AwesomeVideoBot/1.0',
          },
          redirect: 'follow',
          follow: 5
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch URL: ${response.status}`);
        }
        
        // Size limit check
        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
          throw new Error('Content too large (max 5MB)');
        }
        
        const html = await response.text();
        
        // Additional size check after fetching
        if (html.length > 5 * 1024 * 1024) {
          throw new Error('Content too large (max 5MB)');
        }
        
        // Extract text content from HTML
        pageContent = html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 5000);
      } catch (fetchError: any) {
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        console.error('Error fetching URL:', fetchError);
        pageContent = `URL: ${url}`;
      }

      const categories = [
        'Community & Events',
        'Encoding & Codecs',
        'General Tools',
        'Infrastructure & Delivery',
        'Intro & Learning',
        'Media Tools',
        'Players & Clients',
        'Protocols & Transport',
        'Standards & Industry'
      ];

      const prompt = `Analyze this video streaming/development resource webpage and extract structured metadata.

URL: ${url}

Page Content Preview:
${pageContent}

Extract the following information in JSON format:
1. suggestedTitle: A concise, descriptive title (max 100 chars) - focus on what this resource does/provides
2. suggestedDescription: A clear 2-3 sentence description of the resource's purpose and key features
3. suggestedTags: Array of 3-5 relevant technical tags (e.g., "HLS", "FFmpeg", "DASH", "WebRTC")
4. suggestedCategory: Best fitting category from this list: ${categories.join(', ')}
5. suggestedSubcategory: If applicable, suggest a subcategory (optional)
6. confidence: Your confidence score (0.0-1.0) in these suggestions
7. keyTopics: Array of 3-5 key topics or technologies covered

Return ONLY valid JSON with this structure:
{
  "suggestedTitle": "...",
  "suggestedDescription": "...",
  "suggestedTags": ["...", "..."],
  "suggestedCategory": "...",
  "suggestedSubcategory": "...",
  "confidence": 0.0,
  "keyTopics": ["...", "..."]
}`;

      const response = await this.generateResponse(
        prompt,
        2000,
        'You are an expert in video streaming technologies, codecs, protocols, and development tools. Analyze resources accurately and return structured JSON metadata.'
      );

      if (!response) {
        return null;
      }

      let jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON found in Claude response');
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // SANITIZE Claude response before caching/returning
      const sanitizedResult = {
        suggestedTitle: (parsed.suggestedTitle || '').substring(0, 200),
        suggestedDescription: (parsed.suggestedDescription || '').substring(0, 2000),
        suggestedTags: Array.isArray(parsed.suggestedTags) 
          ? parsed.suggestedTags.slice(0, 20).map((tag: any) => String(tag).substring(0, 50))
          : [],
        suggestedCategory: parsed.suggestedCategory || '',
        suggestedSubcategory: parsed.suggestedSubcategory,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
        keyTopics: Array.isArray(parsed.keyTopics)
          ? parsed.keyTopics.slice(0, 10).map((topic: any) => String(topic).substring(0, 100))
          : []
      };

      // Cache sanitized result
      this.cacheAnalysis(url, sanitizedResult);

      console.log('URL analysis completed:', { url, confidence: sanitizedResult.confidence });
      return sanitizedResult;

    } catch (error) {
      console.error('Error analyzing URL:', error);
      return null;
    }
  }
}

// Export singleton instance
export const claudeService = ClaudeService.getInstance();
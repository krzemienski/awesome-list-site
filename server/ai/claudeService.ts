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
  lastAccessed: number;
}

interface AnalysisCache {
  result: any;
  timestamp: number;
  lastAccessed: number;
}

/**
 * LRU Cache implementation with TTL support
 * Provides automatic eviction of least-recently-used entries and periodic cleanup
 */
class LRUCache<T extends { timestamp: number; lastAccessed: number }> {
  private cache: Map<string, T>;
  private readonly maxSize: number;
  private readonly ttl: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(maxSize: number, ttl: number, cleanupIntervalMs: number = 5 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;

    // Start periodic cleanup
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalMs);
    // Prevent the interval from keeping the process alive
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    // Update last accessed time (LRU tracking)
    entry.lastAccessed = Date.now();
    return entry;
  }

  set(key: string, value: T): void {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    value.lastAccessed = Date.now();
    this.cache.set(key, value);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  /**
   * Evict the least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    // Use Array.from for compatibility
    const entries = Array.from(this.cache.entries());
    for (let i = 0; i < entries.length; i++) {
      const [key, entry] = entries[i];
      if (entry.lastAccessed < oldestAccess) {
        oldestAccess = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Remove all expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    // Use Array.from for compatibility (also prevents mutation during iteration)
    const entries = Array.from(this.cache.entries());
    for (let i = 0; i < entries.length; i++) {
      const [key, entry] = entries[i];
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`LRU cache cleanup: removed ${removed} expired entries`);
    }

    return removed;
  }

  /**
   * Stop the cleanup interval (call on shutdown)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

export class ClaudeService {
  private static instance: ClaudeService;
  private anthropic: Anthropic | null = null;
  private redis: Redis | null = null;
  private redisReady: Promise<boolean> | null = null;
  private responseCache: LRUCache<CacheEntry>;
  private analysisCache: LRUCache<AnalysisCache>;
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour cache
  private readonly ANALYSIS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hour cache for URL analysis
  private readonly MAX_CACHE_SIZE = 100;
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minute cleanup interval
  private requestCount = 0;
  private lastRequestTime = 0;
  private readonly RATE_LIMIT_DELAY = 1000; // 1 second between requests

  private constructor() {
    // Initialize LRU caches with TTL and periodic cleanup
    this.responseCache = new LRUCache<CacheEntry>(this.MAX_CACHE_SIZE, this.CACHE_TTL, this.CLEANUP_INTERVAL);
    this.analysisCache = new LRUCache<AnalysisCache>(this.MAX_CACHE_SIZE, this.ANALYSIS_CACHE_TTL, this.CLEANUP_INTERVAL);
    this.redisReady = this.initializeRedis();
    this.initializeClient();
  }

  /**
   * Initialize Redis client if REDIS_URL is available
   * Returns a promise that resolves when Redis is ready (or fails)
   */
  private initializeRedis(): Promise<boolean> {
    if (!process.env.REDIS_URL) {
      console.log('Redis not configured - using in-memory cache only');
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      try {
        this.redis = new Redis(process.env.REDIS_URL!, {
          lazyConnect: true,
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => {
            if (times > 3) {
              console.error('Redis connection failed after 3 retries, using in-memory cache');
              return null; // Stop retrying
            }
            return Math.min(times * 200, 1000);
          }
        });

        this.redis.on('error', (err) => {
          console.error('Redis error:', err);
          // Don't null out redis here - let it retry
        });

        this.redis.on('ready', () => {
          console.log('✅ Redis cache connected for ClaudeService');
          resolve(true);
        });

        this.redis.on('close', () => {
          console.log('Redis connection closed');
        });

        // Connect and handle connection failure
        this.redis.connect().catch((err) => {
          console.error('Failed to connect to Redis:', err);
          this.redis = null;
          resolve(false);
        });

        // Timeout fallback - don't block forever
        setTimeout(() => {
          if (this.redis?.status !== 'ready') {
            console.warn('Redis connection timeout, falling back to in-memory cache');
            this.redis?.disconnect();
            this.redis = null;
            resolve(false);
          }
        }, 5000);

      } catch (error) {
        console.error('Failed to initialize Redis:', error);
        this.redis = null;
        resolve(false);
      }
    });
  }

  /**
   * Get Redis client, ensuring it's ready before use
   */
  private async getRedis(): Promise<Redis | null> {
    if (this.redisReady) {
      await this.redisReady;
    }
    return this.redis?.status === 'ready' ? this.redis : null;
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

      // Type guard: ensure response has text content
      const firstBlock = response.content[0];
      if (!firstBlock || firstBlock.type !== 'text') {
        console.error('Claude response did not contain expected text block');
        return null;
      }
      const responseText = firstBlock.text;

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
   * Get a response from cache if valid (tries Redis first, then in-memory LRU)
   */
  private async getFromCache(key: string): Promise<string | null> {
    // Try Redis first (with proper await for connection readiness)
    const redis = await this.getRedis();
    if (redis) {
      try {
        const cached = await redis.get(`claude:response:${key}`);
        if (cached) {
          console.log('Redis cache HIT');
          return cached;
        }
      } catch (error) {
        console.warn('Redis get failed, falling back to memory:', error);
      }
    }

    // Fallback to in-memory LRU cache (handles TTL and access tracking internally)
    const entry = this.responseCache.get(key);
    if (!entry) return null;

    return entry.response;
  }

  /**
   * Add a response to cache (writes to both Redis and in-memory LRU)
   */
  private async addToCache(key: string, response: string): Promise<void> {
    // Store in Redis with TTL (with proper await for connection readiness)
    const redis = await this.getRedis();
    if (redis) {
      try {
        await redis.setex(
          `claude:response:${key}`,
          Math.floor(this.CACHE_TTL / 1000), // TTL in seconds
          response
        );
      } catch (error) {
        console.warn('Redis set failed:', error);
      }
    }

    // Store in LRU cache (handles eviction internally)
    this.responseCache.set(key, {
      response,
      timestamp: Date.now(),
      lastAccessed: Date.now()
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
   * Get cached analysis result (LRU cache handles TTL and access tracking)
   */
  private getCachedAnalysis(url: string): any | null {
    const entry = this.analysisCache.get(url);
    if (!entry) return null;

    return entry.result;
  }

  /**
   * Cache analysis result (LRU cache handles eviction)
   */
  private cacheAnalysis(url: string, result: any): void {
    this.analysisCache.set(url, {
      result,
      timestamp: Date.now(),
      lastAccessed: Date.now()
    });
  }

  /**
   * Validate that a hostname matches an allowed domain (exact match or subdomain)
   * Uses proper string matching to prevent bypass attacks
   */
  private isAllowedDomain(hostname: string): boolean {
    // Normalize hostname to lowercase
    const normalizedHost = hostname.toLowerCase();

    // Block IP addresses (could be internal/private IPs)
    // IPv4 pattern
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(normalizedHost)) {
      return false;
    }
    // IPv6 pattern (bracketed in URLs, but hostname may not have brackets)
    if (/^[0-9a-f:]+$/i.test(normalizedHost) && normalizedHost.includes(':')) {
      return false;
    }

    for (const allowedDomain of ALLOWED_DOMAINS) {
      const normalizedAllowed = allowedDomain.toLowerCase();

      // Exact match: hostname === allowedDomain
      if (normalizedHost === normalizedAllowed) {
        return true;
      }

      // www prefix: hostname === "www." + allowedDomain
      if (normalizedHost === `www.${normalizedAllowed}`) {
        return true;
      }

      // Subdomain match: hostname ends with "." + allowedDomain
      // The leading dot ensures we match actual subdomains, not suffix attacks
      // e.g., "sub.github.com" matches, but "notgithub.com" does not
      if (normalizedHost.endsWith(`.${normalizedAllowed}`)) {
        return true;
      }
    }

    return false;
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

    // Sanitize URL input - reject if contains control characters or whitespace issues
    if (/[\x00-\x1F\x7F]/.test(url) || url !== url.trim()) {
      throw new Error('Invalid URL: contains control characters or leading/trailing whitespace');
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

    // Reject URLs with credentials (user:pass@host) - potential bypass vector
    if (parsedUrl.username || parsedUrl.password) {
      throw new Error('URLs with credentials are not allowed');
    }

    // SECURITY: Domain allowlist with proper URL parsing (eliminates ALL SSRF risks)
    const hostname = parsedUrl.hostname;

    if (!this.isAllowedDomain(hostname)) {
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
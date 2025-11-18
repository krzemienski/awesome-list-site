import Anthropic from '@anthropic-ai/sdk';

// <important_do_not_delete>
const DEFAULT_MODEL_STR = "claude-3-5-sonnet-20241022";
// </important_do_not_delete>

interface CacheEntry {
  response: string;
  timestamp: number;
}

export class ClaudeService {
  private static instance: ClaudeService;
  private anthropic: Anthropic | null = null;
  private responseCache: Map<string, CacheEntry>;
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour cache
  private readonly MAX_CACHE_SIZE = 100;
  private requestCount = 0;
  private lastRequestTime = 0;
  private readonly RATE_LIMIT_DELAY = 1000; // 1 second between requests

  private constructor() {
    this.responseCache = new Map();
    this.initializeClient();
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
    const cached = this.getFromCache(cacheKey);
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
      this.addToCache(cacheKey, responseText);
      
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
   * Get a response from cache if valid
   */
  private getFromCache(key: string): string | null {
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
   * Add a response to cache
   */
  private addToCache(key: string, response: string): void {
    // Implement LRU cache by removing oldest entries if cache is full
    if (this.responseCache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.responseCache.keys().next().value;
      this.responseCache.delete(oldestKey);
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
}

// Export singleton instance
export const claudeService = ClaudeService.getInstance();
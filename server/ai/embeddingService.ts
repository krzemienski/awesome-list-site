/**
 * ============================================================================
 * EMBEDDING SERVICE - OpenAI Vector Embeddings for Semantic Similarity
 * ============================================================================
 *
 * This service provides OpenAI integration for generating vector embeddings
 * that power semantic similarity-based resource recommendations.
 *
 * CAPABILITIES:
 * - Single Embedding Generation: Convert text to vector representation
 * - Batch Embedding Generation: Process multiple texts efficiently
 * - Embedding Dimensions: 1536-dimensional vectors (text-embedding-3-small)
 *
 * SECURITY:
 * - API key managed through environment variables
 * - Input validation and sanitization
 * - Error handling for rate limits and API failures
 *
 * CACHING:
 * - Embedding cache (7 day TTL): Stores generated embeddings
 * - LRU eviction when cache exceeds MAX_CACHE_SIZE
 * - Cache key based on text content hash
 *
 * RATE LIMITING:
 * - Request counting for usage monitoring
 * - Configurable delays between batch requests
 * - Graceful handling of API rate limit errors
 *
 * COST OPTIMIZATION:
 * - Uses text-embedding-3-small (lowest cost, good performance)
 * - Caching reduces redundant API calls
 * - Batch processing minimizes API overhead
 *
 * MODEL SELECTION:
 * - text-embedding-3-small: 1536 dimensions, $0.02 per 1M tokens
 * - Optimal balance of cost, speed, and accuracy for our use case
 *
 * See /docs/ADMIN-GUIDE.md for embedding generation workflow.
 * ============================================================================
 */

import OpenAI from 'openai';

// <important_do_not_delete>
const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small"; // 1536 dimensions, cost-effective
const EMBEDDING_DIMENSIONS = 1536;
// </important_do_not_delete>

interface EmbeddingCacheEntry {
  embedding: number[];
  timestamp: number;
}

export class EmbeddingService {
  private static instance: EmbeddingService;
  private openai: OpenAI | null = null;
  private embeddingCache: Map<string, EmbeddingCacheEntry>;
  private readonly CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days cache
  private readonly MAX_CACHE_SIZE = 1000;
  private requestCount = 0;
  private lastRequestTime = 0;
  private readonly RATE_LIMIT_DELAY = 500; // 500ms between requests

  private constructor() {
    this.embeddingCache = new Map();
    this.initializeClient();
  }

  public static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }

  /**
   * Initialize the OpenAI client if API key is available
   */
  private initializeClient(): void {
    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

    if (apiKey) {
      try {
        this.openai = new OpenAI({
          apiKey,
          ...(baseURL && { baseURL })
        });
        console.log('OpenAI embedding service initialized successfully');
      } catch (error) {
        console.error('Failed to initialize OpenAI embedding service:', error);
        this.openai = null;
      }
    } else {
      console.log('OpenAI API key not found - embedding features will be unavailable');
    }
  }

  /**
   * Check if the embedding service is available
   */
  public isAvailable(): boolean {
    return this.openai !== null;
  }

  /**
   * Generate a single embedding for the given text
   *
   * @param text - The text to generate an embedding for
   * @param model - The embedding model to use (default: text-embedding-3-small)
   * @returns The embedding vector (1536 dimensions) or null if unavailable
   */
  public async generateEmbedding(
    text: string,
    model: string = DEFAULT_EMBEDDING_MODEL
  ): Promise<number[] | null> {
    if (!this.isAvailable()) {
      console.log('OpenAI embedding service not available, returning null');
      return null;
    }

    // Validate input
    if (!text || text.trim() === '') {
      console.error('Cannot generate embedding for empty text');
      return null;
    }

    // Truncate text if too long (OpenAI has token limits)
    const truncatedText = this.truncateText(text, 8000);

    // Create cache key from text content
    const cacheKey = this.createCacheKey(truncatedText + model);

    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log('Returning cached embedding');
      return cached;
    }

    // Apply rate limiting
    await this.applyRateLimit();

    try {
      console.log('Generating new embedding...');
      const response = await this.openai!.embeddings.create({
        model,
        input: truncatedText,
        encoding_format: 'float'
      });

      if (!response.data || response.data.length === 0) {
        console.error('OpenAI API returned no embedding data');
        return null;
      }

      const embedding = response.data[0].embedding;

      // Validate embedding dimensions
      if (embedding.length !== EMBEDDING_DIMENSIONS) {
        console.error(`Unexpected embedding dimensions: ${embedding.length} (expected ${EMBEDDING_DIMENSIONS})`);
        return null;
      }

      // Cache the embedding
      this.addToCache(cacheKey, embedding);

      // Update request tracking
      this.requestCount++;
      this.lastRequestTime = Date.now();

      return embedding;

    } catch (error: any) {
      console.error('OpenAI API error:', error.message || error);

      // Handle specific error types
      if (error.status === 429) {
        console.error('Rate limit exceeded - please try again later');
      } else if (error.status === 401) {
        console.error('Invalid API key - please check your OpenAI credentials');
      } else if (error.status === 400) {
        console.error('Invalid request - text may be too long or contain invalid characters');
      }

      return null;
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   * Processes texts sequentially with rate limiting
   *
   * @param texts - Array of texts to generate embeddings for
   * @param model - The embedding model to use
   * @param onProgress - Optional callback for progress updates (current, total)
   * @returns Array of embeddings (null for any that failed)
   */
  public async batchGenerateEmbeddings(
    texts: string[],
    model: string = DEFAULT_EMBEDDING_MODEL,
    onProgress?: (current: number, total: number) => void
  ): Promise<Array<number[] | null>> {
    if (!this.isAvailable()) {
      console.log('OpenAI embedding service not available');
      return texts.map(() => null);
    }

    const embeddings: Array<number[] | null> = [];
    const total = texts.length;

    console.log(`Starting batch embedding generation for ${total} texts...`);

    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      const embedding = await this.generateEmbedding(text, model);
      embeddings.push(embedding);

      if (onProgress) {
        onProgress(i + 1, total);
      }

      // Add delay between requests to avoid rate limits
      if (i < texts.length - 1) {
        await this.delay(this.RATE_LIMIT_DELAY);
      }
    }

    const successCount = embeddings.filter(e => e !== null).length;
    console.log(`Batch embedding generation complete: ${successCount}/${total} successful`);

    return embeddings;
  }

  /**
   * Prepare text for embedding generation
   * Combines resource metadata into a single text representation
   *
   * @param title - Resource title
   * @param description - Resource description
   * @param tags - Resource tags
   * @param category - Resource category
   * @returns Combined text optimized for embedding
   */
  public prepareResourceText(
    title: string,
    description?: string,
    tags?: string[],
    category?: string
  ): string {
    const parts: string[] = [];

    // Add title (weighted most heavily)
    if (title) {
      parts.push(`Title: ${title}`);
    }

    // Add description
    if (description && description.trim() !== '') {
      parts.push(`Description: ${description}`);
    }

    // Add category
    if (category) {
      parts.push(`Category: ${category}`);
    }

    // Add tags
    if (tags && tags.length > 0) {
      parts.push(`Tags: ${tags.join(', ')}`);
    }

    return parts.join('\n');
  }

  /**
   * Get service statistics
   */
  public getStats() {
    return {
      requestCount: this.requestCount,
      cacheSize: this.embeddingCache.size,
      lastRequestTime: this.lastRequestTime,
      isAvailable: this.isAvailable()
    };
  }

  /**
   * Clear the embedding cache
   */
  public clearCache(): void {
    this.embeddingCache.clear();
    console.log('Embedding cache cleared');
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Create a cache key from text content
   */
  private createCacheKey(text: string): string {
    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `emb_${hash}`;
  }

  /**
   * Get embedding from cache if valid
   */
  private getFromCache(key: string): number[] | null {
    const entry = this.embeddingCache.get(key);
    if (!entry) {
      return null;
    }

    const age = Date.now() - entry.timestamp;
    if (age > this.CACHE_TTL) {
      // Cache expired
      this.embeddingCache.delete(key);
      return null;
    }

    return entry.embedding;
  }

  /**
   * Add embedding to cache with LRU eviction
   */
  private addToCache(key: string, embedding: number[]): void {
    // LRU eviction if cache is full
    if (this.embeddingCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.embeddingCache.keys().next().value;
      if (firstKey) {
        this.embeddingCache.delete(firstKey);
      }
    }

    this.embeddingCache.set(key, {
      embedding,
      timestamp: Date.now()
    });
  }

  /**
   * Apply rate limiting between requests
   */
  private async applyRateLimit(): Promise<void> {
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;
    if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
      const delayNeeded = this.RATE_LIMIT_DELAY - timeSinceLastRequest;
      await this.delay(delayNeeded);
    }
  }

  /**
   * Delay execution for specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Truncate text to maximum character length
   * OpenAI has token limits (~8000 tokens ≈ 32000 characters)
   */
  private truncateText(text: string, maxChars: number): string {
    if (text.length <= maxChars) {
      return text;
    }

    console.warn(`Truncating text from ${text.length} to ${maxChars} characters`);
    return text.substring(0, maxChars);
  }
}

// Export singleton instance getter
export const embeddingService = EmbeddingService.getInstance();

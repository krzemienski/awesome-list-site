/**
 * ============================================================================
 * CLAUDE SERVICE - AI-Powered Resource Analysis
 * ============================================================================
 *
 * Single-shot Claude calls (URL analysis, health checks, journey seeding).
 * Endpoint, credentials and model ids all come from ./anthropicConfig so this
 * service follows the same configuration as every other AI call in the app
 * (router base URL + bearer token, tier → model mapping).
 *
 * CAPABILITIES:
 * - URL Content Analysis: structured-output extraction of title, description,
 *   tags, category hints and key topics from a fetched page
 * - Free-form generation with caching, pacing and cost tracking
 * - Connection test for the admin AI health check
 *
 * SECURITY:
 * - ALLOWED_DOMAINS allowlist prevents SSRF in analyzeURL
 * - Credentials are managed through Replit secrets / env, never in code
 *
 * CACHING:
 * - Response cache (1 hour TTL): deduplicates identical prompts
 * - Analysis cache (24 hour TTL): stores URL analysis results
 * - LRU eviction when a cache exceeds MAX_CACHE_SIZE
 *
 * ACCURACY:
 * - analyzeURL uses the Messages API structured-output format (schema-
 *   constrained JSON validated with zod) instead of regexing braces out of
 *   free text; truncation/refusal surface as explicit errors.
 *
 * See /docs/AI-SERVICES.md for the configuration contract.
 * ============================================================================
 */

import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import {
  createStructuredMessage,
  describeAnthropicConfig,
  getAnthropicClient,
  resolveFlowModel,
  resolveTierModel,
  StructuredOutputError,
  type ModelTier,
} from './anthropicConfig';

/**
 * Model tiers callers may request. Ids are resolved from the environment at
 * call time (ANTHROPIC_DEFAULT_<TIER>_MODEL → first-party default) so a router
 * deployment and a first-party deployment run the same code. Prices are
 * first-party list prices per 1M tokens and only feed the admin cost readout.
 */
export const CLAUDE_MODELS = {
  haiku: { tier: 'haiku' as ModelTier, inputCost: 1.0, outputCost: 5.0, maxTokens: 8192 },
  sonnet: { tier: 'sonnet' as ModelTier, inputCost: 3.0, outputCost: 15.0, maxTokens: 16384 },
  opus: { tier: 'opus' as ModelTier, inputCost: 15.0, outputCost: 75.0, maxTokens: 16384 },
} as const;

export type ClaudeModelKey = keyof typeof CLAUDE_MODELS;
export const DEFAULT_MODEL: ClaudeModelKey = 'haiku';

const emptyCostTable = () => ({
  haiku: { calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 },
  sonnet: { calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 },
  opus: { calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 },
});

/** Schema for analyzeURL — enforced server-side by the API's structured output. */
const UrlAnalysisSchema = z.object({
  suggestedTitle: z.string().describe('Concise, descriptive title (max 100 chars) focused on what the resource does'),
  suggestedDescription: z.string().describe('Clear 2-3 sentence description of purpose and key features'),
  suggestedTags: z.array(z.string()).describe('3-5 technical tags, e.g. "HLS", "FFmpeg", "DASH", "WebRTC"'),
  suggestedCategory: z.string().describe('Best fitting category from the provided list, verbatim'),
  suggestedSubcategory: z.string().nullable().describe('Optional subcategory, or null'),
  suggestedSubSubcategory: z.string().nullable().describe('Optional level-3 hint such as "HLS", "FFMPEG", "iOS/tvOS", or null'),
  confidence: z.number().describe('Confidence in these suggestions, 0.0-1.0'),
  keyTopics: z.array(z.string()).describe('3-5 key topics or technologies covered'),
});

export type UrlAnalysis = {
  suggestedTitle: string;
  suggestedDescription: string;
  suggestedTags: string[];
  suggestedCategory: string;
  suggestedSubcategory?: string;
  suggestedSubSubcategory?: string;
  confidence: number;
  keyTopics: string[];
};

/**
 * Trusted domains for Claude URL analysis
 * Expanded for AI research capabilities including:
 * - Developer resources (repos, packages, docs)
 * - News and blogs (tech news, developer blogs)
 * - Academic (papers, standards)
 * - Video/streaming (original focus)
 */
const ALLOWED_DOMAINS = [
  // Code repositories
  'github.com',
  'gitlab.com',
  'bitbucket.org',
  'codeberg.org',
  'sr.ht',

  // Package registries
  'npmjs.com',
  'pypi.org',
  'crates.io',
  'rubygems.org',
  'packagist.org',
  'nuget.org',
  'pkg.go.dev',
  'hex.pm',
  'pub.dev',

  // CDNs
  'unpkg.com',
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com',

  // Developer Q&A
  'stackoverflow.com',
  'stackexchange.com',
  'serverfault.com',
  'superuser.com',

  // Developer blogs/platforms
  'medium.com',
  'dev.to',
  'hashnode.dev',
  'hackernoon.com',
  'freecodecamp.org',
  'css-tricks.com',
  'smashingmagazine.com',

  // Documentation sites
  'developer.mozilla.org',
  'docs.microsoft.com',
  'learn.microsoft.com',
  'cloud.google.com',
  'aws.amazon.com',
  'docs.aws.amazon.com',
  'firebase.google.com',
  'developer.apple.com',
  'developers.google.com',
  'reactjs.org',
  'vuejs.org',
  'angular.io',
  'svelte.dev',
  'nextjs.org',
  'nodejs.org',
  'python.org',
  'rust-lang.org',
  'go.dev',
  'typescriptlang.org',

  // Standards organizations
  'w3.org',
  'ietf.org',
  'whatwg.org',
  'ecma-international.org',

  // Academic/research
  'arxiv.org',
  'acm.org',
  'dl.acm.org',
  'ieee.org',
  'ieeexplore.ieee.org',
  'researchgate.net',
  'scholar.google.com',

  // Tech news
  'techcrunch.com',
  'wired.com',
  'arstechnica.com',
  'theverge.com',
  'infoq.com',
  'thenewstack.io',

  // Community/social
  'reddit.com',
  'news.ycombinator.com',
  'lobste.rs',
  'twitter.com',
  'x.com',

  // Video/streaming (original focus)
  'youtube.com',
  'youtu.be',
  'vimeo.com',
  'twitch.tv',
  'dailymotion.com',

  // Video streaming tech
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
  'brightcove.com',
  'kaltura.com',

  // Cloud providers
  'vercel.com',
  'netlify.com',
  'heroku.com',
  'digitalocean.com',
  'render.com',
  'railway.app',
  'fly.io',

  // AI/ML
  'openai.com',
  'anthropic.com',
  'huggingface.co',
  'tensorflow.org',
  'pytorch.org',
];

interface CacheEntry {
  response: string;
  timestamp: number;
}

interface AnalysisCache {
  result: any;
  timestamp: number;
}

export interface APICallResult<T = string> {
  data: T | null;
  usage: {
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    model: ClaudeModelKey;
  } | null;
  cached: boolean;
  error?: string;
}

export class ClaudeService {
  private static instance: ClaudeService;
  private anthropic: Anthropic | null = null;
  private responseCache: Map<string, CacheEntry>;
  private analysisCache: Map<string, AnalysisCache>;
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour cache
  private readonly ANALYSIS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hour cache for URL analysis
  private readonly MAX_CACHE_SIZE = 100;
  private requestCount = 0;
  private lastRequestTime = 0;
  private readonly RATE_LIMIT_DELAY = 1000; // 1 second between requests
  private totalCosts: { [key in ClaudeModelKey]: { calls: number; inputTokens: number; outputTokens: number; costUsd: number } };

  private constructor() {
    this.responseCache = new Map();
    this.analysisCache = new Map();
    this.totalCosts = emptyCostTable();
    this.initializeClient();
  }

  public static getInstance(): ClaudeService {
    if (!ClaudeService.instance) {
      ClaudeService.instance = new ClaudeService();
    }
    return ClaudeService.instance;
  }

  /**
   * Initialize the shared Anthropic client from the central config
   * (router → managed integration → direct key). Logs a secret-free summary.
   */
  private initializeClient(): void {
    try {
      this.anthropic = getAnthropicClient();
    } catch (error) {
      console.error('Failed to initialize Claude service:', error);
      this.anthropic = null;
    }
    const cfg = describeAnthropicConfig();
    if (this.anthropic) {
      console.log(
        `Claude service initialized: ${cfg.label}; models haiku=${cfg.models.haiku} sonnet=${cfg.models.sonnet} opus=${cfg.models.opus}; primary=${cfg.primaryModel}`,
      );
    } else {
      console.log('Claude credentials not found - AI features will use fallback methods');
    }
  }

  /** Secret-free view of the active endpoint + model mapping (admin health). */
  public describeConfig() {
    return describeAnthropicConfig();
  }

  /**
   * Check if the Claude service is available
   */
  public isAvailable(): boolean {
    return this.anthropic !== null;
  }

  /**
   * Calculate cost for a given model and token usage
   */
  public calculateCost(model: ClaudeModelKey, inputTokens: number, outputTokens: number): number {
    const pricing = CLAUDE_MODELS[model];
    return (inputTokens * pricing.inputCost / 1_000_000) + (outputTokens * pricing.outputCost / 1_000_000);
  }

  /** Accumulate per-tier usage; returns the estimated cost of this call. */
  private recordUsage(model: ClaudeModelKey, inputTokens: number, outputTokens: number): number {
    const costUsd = this.calculateCost(model, inputTokens, outputTokens);
    this.totalCosts[model].calls++;
    this.totalCosts[model].inputTokens += inputTokens;
    this.totalCosts[model].outputTokens += outputTokens;
    this.totalCosts[model].costUsd += costUsd;
    this.requestCount++;
    this.lastRequestTime = Date.now();
    return costUsd;
  }

  /**
   * Generate a response using Claude with caching, rate limiting, and cost tracking
   */
  public async generateResponse(
    prompt: string,
    maxTokens: number = 1000,
    systemPrompt?: string,
    model?: ClaudeModelKey
  ): Promise<APICallResult<string>> {
    const selectedModel = model || DEFAULT_MODEL;
    const modelConfig = CLAUDE_MODELS[selectedModel];

    if (!this.isAvailable()) {
      console.log('Claude service not available, returning null');
      return {
        data: null,
        usage: null,
        cached: false,
        error: 'Claude service not available'
      };
    }

    // Create cache key from prompt and model
    const cacheKey = this.createCacheKey(prompt + (systemPrompt || '') + selectedModel);

    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log('Returning cached Claude response');
      return {
        data: cached,
        usage: null,
        cached: true
      };
    }

    // Apply rate limiting
    await this.applyRateLimit();

    try {
      console.log(`Generating new Claude response using ${selectedModel}...`);

      // Opus needs longer; the SDK option aborts the underlying request on
      // timeout (Promise.race left the HTTP call running in the background).
      const timeout = selectedModel === 'opus' ? 120_000 : 60_000;

      const response = await this.anthropic!.messages.create({
        model: resolveTierModel(modelConfig.tier),
        system: [{
          type: 'text',
          text: systemPrompt || "You are a helpful AI assistant specializing in video development and streaming technologies.",
        }],
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: Math.min(maxTokens, modelConfig.maxTokens)
      }, { timeout });

      const responseText = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');
      if (response.stop_reason === 'max_tokens') {
        console.warn(`Claude response truncated at max_tokens=${Math.min(maxTokens, modelConfig.maxTokens)} (${selectedModel})`);
      }

      // Extract usage information
      const inputTokens = response.usage.input_tokens || 0;
      const outputTokens = response.usage.output_tokens || 0;
      const costUsd = this.recordUsage(selectedModel, inputTokens, outputTokens);

      // Cache the response
      this.addToCache(cacheKey, responseText);

      return {
        data: responseText,
        usage: {
          inputTokens,
          outputTokens,
          costUsd,
          model: selectedModel
        },
        cached: false
      };

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

      return {
        data: null,
        usage: null,
        cached: false,
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Get cumulative cost statistics
   */
  public getCostStats(): typeof this.totalCosts {
    return { ...this.totalCosts };
  }

  /**
   * Reset cost statistics
   */
  public resetCostStats(): void {
    this.totalCosts = emptyCostTable();
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
      // Direct call (no response cache) so a deep health check always proves
      // the configured endpoint answers right now.
      const response = await this.anthropic!.messages.create({
        model: resolveTierModel(CLAUDE_MODELS[DEFAULT_MODEL].tier),
        system: 'You are a test assistant. Respond with exactly one word.',
        messages: [{ role: 'user', content: 'Say "Hello" in one word' }],
        max_tokens: 64,
      }, { timeout: 30_000 });
      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('')
        .trim();
      this.recordUsage(DEFAULT_MODEL, response.usage.input_tokens || 0, response.usage.output_tokens || 0);
      return text.length > 0;
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
    systemPrompt?: string,
    model?: ClaudeModelKey
  ): Promise<APICallResult<string>[]> {
    const results: APICallResult<string>[] = [];

    for (const prompt of prompts) {
      const response = await this.generateResponse(prompt, maxTokensPerPrompt, systemPrompt, model);
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
  public async analyzeURL(url: string): Promise<UrlAnalysis | null> {
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
        // R5-030 (run24): a URL we cannot retrieve must NOT silently fall
        // through to a paid Claude call analyzing zero content (the old
        // fallback also produced confidently-wrong metadata). Throw a
        // recognizable error so callers map it to a 4xx.
        console.error('Error fetching URL:', fetchError);
        throw new Error(
          `URL fetch failed: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`
        );
      }

      const categories = [
        'Community & Events',
        'Encoding & Codecs',
        'General Tools',
        'Infrastructure & Delivery',
        'Intro & Learning', // BUG-025: match DB-canonical category name
        'Media Tools',
        'Players & Clients',
        'Protocols & Transport',
        'Standards & Industry'
      ];

      const prompt = `Analyze this video streaming/development resource webpage and extract structured metadata.

URL: ${url}

Page Content Preview:
${pageContent}

Guidance:
- suggestedTitle: concise and descriptive (max 100 chars) — what this resource does/provides.
- suggestedDescription: 2-3 clear sentences on purpose and key features.
- suggestedTags: 3-5 relevant technical tags (e.g. "HLS", "FFmpeg", "DASH", "WebRTC").
- suggestedCategory: choose exactly one of: ${categories.join(', ')}.
- suggestedSubcategory / suggestedSubSubcategory: only when clearly applicable, otherwise null.
- confidence: 0.0-1.0 for the whole suggestion set.
- keyTopics: 3-5 key topics or technologies covered.`;

      await this.applyRateLimit();
      const model = resolveFlowModel('urlAnalysis');
      let parsed: z.infer<typeof UrlAnalysisSchema>;
      try {
        const structured = await createStructuredMessage(UrlAnalysisSchema, {
          model,
          system: 'You are an expert in video streaming technologies, codecs, protocols, and development tools. Analyze resources accurately.',
          user: prompt,
          maxTokens: 2000,
        });
        parsed = structured.data;
        this.recordUsage('haiku', structured.usage.inputTokens, structured.usage.outputTokens);
      } catch (error: any) {
        if (error instanceof StructuredOutputError) {
          console.error(`URL analysis structured output failed (${error.reason}):`, error.message);
          return null;
        }
        if (error?.status === 401) {
          console.error('Anthropic rejected the credentials (401) - disabling Claude service');
          this.anthropic = null;
        }
        throw error;
      }

      // SANITIZE Claude response before caching/returning
      const sanitizedResult: UrlAnalysis = {
        suggestedTitle: (parsed.suggestedTitle || '').substring(0, 200),
        suggestedDescription: (parsed.suggestedDescription || '').substring(0, 2000),
        suggestedTags: parsed.suggestedTags.slice(0, 20).map((tag) => String(tag).substring(0, 50)),
        suggestedCategory: parsed.suggestedCategory || '',
        suggestedSubcategory: parsed.suggestedSubcategory ?? undefined,
        suggestedSubSubcategory: parsed.suggestedSubSubcategory ?? undefined,
        confidence: Math.max(0, Math.min(1, typeof parsed.confidence === 'number' ? parsed.confidence : 0.5)),
        keyTopics: parsed.keyTopics.slice(0, 10).map((topic) => String(topic).substring(0, 100)),
      };

      // Cache sanitized result
      this.cacheAnalysis(url, sanitizedResult);

      console.log('URL analysis completed:', { url, confidence: sanitizedResult.confidence });
      return sanitizedResult;

    } catch (error) {
      // Retrieval failures are the caller's to report (they map to a 4xx with
      // a "fill it in manually" hint); only model-side failures degrade to null.
      const msg = error instanceof Error ? error.message : String(error);
      if (msg === 'Request timeout' || msg.startsWith('URL fetch failed') || msg.includes('Content too large')) {
        throw error;
      }
      console.error('Error analyzing URL:', error);
      return null;
    }
  }
}

// Export singleton instance
export const claudeService = ClaudeService.getInstance();

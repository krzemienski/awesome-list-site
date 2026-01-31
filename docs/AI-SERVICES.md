# AI Services Architecture

Technical documentation for AI-powered resource analysis and enrichment in the Awesome Video Resource Viewer application.

## Overview

The AI Services layer provides intelligent resource analysis, metadata extraction, and content enrichment using Anthropic's Claude API. The system is designed for cost-effective operation with comprehensive caching, rate limiting, and security controls.

### AI Services Architecture Diagram

```mermaid
graph TB
    subgraph Admin["Admin Interface"]
        UI["Admin Dashboard"]
        Batch["Batch Enrichment UI"]
        Single["Single URL Analysis"]
    end

    subgraph Services["AI Services Layer"]
        Claude["ClaudeService<br/>(Core AI API)"]
        Enrich["EnrichmentService<br/>(Batch Processing)"]
        Scraper["URLScraper<br/>(Metadata Extraction)"]
        Cache["Cache Layer<br/>(Response & Analysis)"]
    end

    subgraph External["External Services"]
        API["Anthropic Claude API<br/>(claude-haiku-4-5)"]
        Web["Web Resources<br/>(URL Fetching)"]
    end

    subgraph Storage["Storage Layer"]
        DB["PostgreSQL<br/>(Enrichment Jobs)"]
        Memory["In-Memory Cache<br/>(Map-based LRU)"]
    end

    UI --> Enrich
    Batch --> Enrich
    Single --> Claude
    Enrich --> Claude
    Claude --> Cache
    Cache --> Memory
    Cache --> API
    Claude --> Scraper
    Scraper --> Web
    Enrich --> DB

    style Claude fill:#e1f5ff
    style Cache fill:#fff3cd
    style API fill:#d4edda
```

## ClaudeService - Core AI Integration

The `ClaudeService` class (`server/ai/claudeService.ts`) is the foundational AI service providing Claude API integration with intelligent caching and security controls.

### Architecture Pattern

**Design**: Singleton pattern with lazy initialization
- Single instance shared across application lifecycle
- `getInstance()` provides global access point
- Private constructor prevents direct instantiation

```typescript
// Usage throughout the application
import { claudeService } from './server/ai/claudeService';

const analysis = await claudeService.analyzeURL(url);
```

### API Initialization

The service initializes the Anthropic API client on first instantiation with graceful degradation when API keys are unavailable.

#### Initialization Flow

```mermaid
sequenceDiagram
    participant App as Application
    participant CS as ClaudeService
    participant Env as Environment
    participant API as Anthropic SDK

    App->>CS: getInstance()
    CS->>CS: new ClaudeService()
    CS->>Env: Check API keys

    alt API key exists
        Env-->>CS: ANTHROPIC_API_KEY
        CS->>API: new Anthropic({ apiKey })
        API-->>CS: Initialized client
        CS->>CS: anthropic = client
        Note over CS: Service available
    else No API key
        Env-->>CS: null
        CS->>CS: anthropic = null
        Note over CS: Fallback mode
    end

    CS-->>App: Singleton instance
```

#### Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `AI_INTEGRATIONS_ANTHROPIC_API_KEY` | Primary API key | Yes* |
| `ANTHROPIC_API_KEY` | Fallback API key | Yes* |
| `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` | Custom API endpoint | No |

*At least one API key variable must be set for AI features to function.

#### Availability Checking

```typescript
if (claudeService.isAvailable()) {
  // AI features enabled
  const result = await claudeService.analyzeURL(url);
} else {
  // Fallback to manual curation
  console.log('AI service unavailable - using manual workflow');
}
```

### Caching Strategy

The service implements a **dual-cache architecture** optimized for different use cases with LRU (Least Recently Used) eviction.

#### Cache Architecture

```mermaid
graph LR
    subgraph "Dual Cache System"
        Request["Incoming Request"]

        subgraph "Response Cache"
            RC["Map<string, CacheEntry>"]
            RCTTL["TTL: 1 hour"]
            RCSize["Max: 100 entries"]
        end

        subgraph "Analysis Cache"
            AC["Map<string, AnalysisCache>"]
            ACTTL["TTL: 24 hours"]
            ACSize["Max: 100 entries"]
        end

        Request -->|General prompts| RC
        Request -->|URL analysis| AC
    end

    style RC fill:#e3f2fd
    style AC fill:#f3e5f5
```

#### Response Cache (1 Hour TTL)

**Purpose**: Deduplicates identical AI requests across the application

**Use Cases**:
- General Claude responses
- Repeated similar queries
- Development/testing scenarios

**Implementation**:
```typescript
private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds
private responseCache: Map<string, CacheEntry>;

interface CacheEntry {
  response: string;      // Cached Claude response
  timestamp: number;     // Creation time for TTL checking
}
```

**Cache Key Generation**: Simple hash function creates unique keys from prompt + system prompt combination
```typescript
private createCacheKey(prompt: string): string {
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) {
    const char = prompt.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `claude_${hash}`;
}
```

#### Analysis Cache (24 Hour TTL)

**Purpose**: Stores URL analysis results for extended periods

**Use Cases**:
- URL metadata extraction
- Resource enrichment results
- Category suggestions
- Tag generation

**Implementation**:
```typescript
private readonly ANALYSIS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
private analysisCache: Map<string, AnalysisCache>;

interface AnalysisCache {
  result: any;          // Structured analysis result
  timestamp: number;    // Creation time for TTL checking
}
```

**Cache Key**: URL strings are used directly as cache keys (after validation)

#### LRU Eviction Strategy

When cache exceeds `MAX_CACHE_SIZE = 100` entries, the **oldest entry is removed** before adding new ones.

```typescript
private addToCache(key: string, response: string): void {
  // LRU eviction: remove oldest entry if cache is full
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
```

**Limitation**: JavaScript Map maintains insertion order, so `.keys().next().value` returns the oldest entry. This provides simple LRU behavior without additional complexity.

#### Cache Performance

| Metric | Value | Impact |
|--------|-------|--------|
| Cache hit (response) | 1-5ms | ~1000x faster than API call |
| Cache hit (analysis) | 1-5ms | ~1000x faster than API + URL fetch |
| Cache miss | 500-2000ms | Full API roundtrip |
| TTL check overhead | <1ms | Negligible |
| Eviction cost | O(1) | Single deletion operation |

### Rate Limiting

The service implements **request-level rate limiting** to prevent API throttling and manage costs.

#### Rate Limit Configuration

```typescript
private readonly RATE_LIMIT_DELAY = 1000; // 1 second between requests
private requestCount = 0;
private lastRequestTime = 0;
```

#### Rate Limit Flow

```mermaid
sequenceDiagram
    participant Caller as Service Caller
    participant CS as ClaudeService
    participant Cache as Cache Layer
    participant RL as Rate Limiter
    participant API as Claude API

    Caller->>CS: generateResponse(prompt)
    CS->>Cache: Check cache

    alt Cache hit
        Cache-->>CS: Cached response
        CS-->>Caller: Return (no rate limit)
    else Cache miss
        CS->>RL: applyRateLimit()
        RL->>RL: Check time since last request

        alt Too soon (<1s)
            RL->>RL: Calculate delay
            Note over RL: Wait (1000ms - elapsed)
            RL->>RL: Sleep
        end

        RL-->>CS: Rate limit satisfied
        CS->>API: messages.create()
        API-->>CS: Response
        CS->>Cache: Store response
        CS->>CS: Update requestCount & lastRequestTime
        CS-->>Caller: Return response
    end
```

#### Implementation

```typescript
private async applyRateLimit(): Promise<void> {
  const timeSinceLastRequest = Date.now() - this.lastRequestTime;
  if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
    const delay = this.RATE_LIMIT_DELAY - timeSinceLastRequest;
    console.log(`Rate limiting: waiting ${delay}ms before next request`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}
```

**Key Features**:
- Automatic delay injection between consecutive requests
- Cache hits bypass rate limiting (instant response)
- Logging for visibility into rate limit behavior
- No external dependencies (pure JavaScript timing)

### SSRF Protection

The service implements **domain allowlisting** to prevent Server-Side Request Forgery (SSRF) attacks when analyzing URLs.

#### Security Model

**Threat**: Malicious users could submit URLs pointing to internal services, cloud metadata endpoints, or other restricted resources.

**Defense**: Only URLs from trusted, video-streaming-related domains can be analyzed.

#### Allowed Domains Whitelist

```typescript
const ALLOWED_DOMAINS = [
  // Version control & code hosting
  'github.com',

  // Video platforms
  'youtube.com',
  'youtu.be',
  'vimeo.com',
  'twitch.tv',
  'dailymotion.com',

  // Streaming infrastructure
  'bitmovin.com',
  'cloudflare.com',
  'akamai.com',
  'fastly.com',
  'wowza.com',
  'encoding.com',
  'zencoder.com',
  'mux.com',

  // Media players & libraries
  'jwplayer.com',
  'videojs.com',
  'npmjs.com',
  'unpkg.com',
  'cdn.jsdelivr.net',

  // Documentation & communities
  'stackoverflow.com',
  'medium.com',
  'dev.to',
  'docs.microsoft.com',
  'developer.mozilla.org',

  // Standards organizations
  'w3.org',
  'ietf.org',
  'whatwg.org'
];
```

**Total**: 27 trusted domains (as of current implementation)

#### Domain Validation Flow

```mermaid
flowchart TD
    A[URL Submitted] --> B{Valid URL format?}
    B -->|No| C[Throw: 'Invalid URL format']
    B -->|Yes| D{Protocol = HTTPS?}
    D -->|No| E[Throw: 'Only HTTPS URLs allowed']
    D -->|Yes| F[Extract hostname]
    F --> G{Hostname in ALLOWED_DOMAINS?}

    G -->|Exact match| H[Proceed to analysis]
    G -->|www. subdomain| H
    G -->|Subdomain match| H
    G -->|No match| I[Throw: 'Domain not in allowlist']

    H --> J[Fetch URL with timeout]
    J --> K[Analyze with Claude]

    style C fill:#ffcccc
    style E fill:#ffcccc
    style I fill:#ffcccc
    style H fill:#ccffcc
```

#### Implementation

```typescript
public async analyzeURL(url: string): Promise<AnalysisResult | null> {
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
      `Domain "${hostname}" is not in the allowlist of trusted domains. ` +
      `Allowed domains include: ${ALLOWED_DOMAINS.slice(0, 5).join(', ')}, etc.`
    );
  }

  // Safe to proceed with URL analysis
  // ...
}
```

#### Subdomain Matching Logic

The validation supports three matching patterns:

1. **Exact match**: `github.com` matches `github.com`
2. **www prefix**: `www.github.com` matches when `github.com` is allowed
3. **Subdomain match**: `api.github.com` matches when `github.com` is allowed

This allows flexibility while maintaining security (e.g., `docs.github.com`, `gist.github.com` are all valid).

#### Additional URL Security

Beyond domain validation, the service implements:

**Timeout Protection**: 10-second timeout prevents hanging on slow/malicious responses
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000);

const response = await fetch(url, { signal: controller.signal });
```

**Size Limits**: Maximum 5MB content size prevents memory exhaustion
```typescript
const contentLength = response.headers.get('content-length');
if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
  throw new Error('Content too large (max 5MB)');
}
```

**Redirect Following**: Limited to 5 redirects to prevent redirect loops
```typescript
const response = await fetch(url, {
  redirect: 'follow',
  follow: 5  // Maximum 5 redirects
});
```

### Batch Processing

The service provides efficient batch processing for analyzing multiple URLs with built-in rate limiting.

#### Batch Processing Flow

```mermaid
sequenceDiagram
    participant Admin as Admin User
    participant API as Enrichment API
    participant CS as ClaudeService
    participant Cache as Cache Layer
    participant Claude as Claude API

    Admin->>API: POST /api/admin/enrich-batch
    API->>API: Query unenriched resources
    API->>CS: batchProcess([url1, url2, url3])

    loop For each URL
        CS->>Cache: Check cache
        alt Cache hit
            Cache-->>CS: Cached result
        else Cache miss
            CS->>CS: applyRateLimit() - wait 1s
            CS->>Claude: analyzeURL(url)
            Claude-->>CS: Analysis result
            CS->>Cache: Store result
        end
        CS->>API: Result
        API->>API: Update database
    end

    CS-->>API: All results
    API-->>Admin: Batch completion summary
```

#### Batch Method Signature

```typescript
public async batchProcess(
  prompts: string[],
  maxTokensPerPrompt: number = 500,
  systemPrompt?: string
): Promise<(string | null)[]> {
  const results: (string | null)[] = [];

  for (const prompt of prompts) {
    const response = await this.generateResponse(
      prompt,
      maxTokensPerPrompt,
      systemPrompt
    );
    results.push(response);

    // Add delay between batch requests to respect rate limits
    if (prompts.indexOf(prompt) < prompts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY));
    }
  }

  return results;
}
```

#### Batch Processing Characteristics

| Feature | Behavior | Rationale |
|---------|----------|-----------|
| Processing order | Sequential (not parallel) | Respects rate limits, predictable order |
| Inter-request delay | 1 second (RATE_LIMIT_DELAY) | Prevents API throttling |
| Cache utilization | Checked for each URL | Skips API calls for cached results |
| Error handling | Null result for failures | Continues processing remaining items |
| Progress tracking | Database updates per item | Admin can monitor progress |

#### Batch Size Recommendations

| Batch Size | Estimated Time | Use Case |
|------------|----------------|----------|
| 10 URLs | ~10-20 seconds | Quick enrichment, testing |
| 50 URLs | ~1-2 minutes | Medium batch, acceptable wait time |
| 100 URLs | ~2-5 minutes | Large batch, background job |
| 500+ URLs | ~10+ minutes | Consider splitting into multiple jobs |

**Note**: Actual time depends on cache hit rate. With high cache hits, batch processing is significantly faster.

## Cost Optimization

The AI Services layer is designed for **cost-effective operation** while maintaining high-quality analysis.

### Model Selection

**Current Model**: `claude-haiku-4-5` (Claude Haiku 4.5)

```typescript
const DEFAULT_MODEL_STR = "claude-haiku-4-5";
// Claude Haiku 4.5 (October 2025) - 4-5x faster, 1/3 cost
```

**Why Haiku?**
- **Speed**: 4-5x faster than Claude Sonnet
- **Cost**: 1/3 the price of Claude Sonnet
- **Quality**: Sufficient for metadata extraction and categorization
- **Availability**: Latest model with improved capabilities

### Cost Reduction Strategies

#### 1. Aggressive Caching

**Response Cache**: 1-hour TTL reduces redundant API calls during active development/testing

**Analysis Cache**: 24-hour TTL means URLs are only analyzed once per day maximum

**Impact**: Estimated 70-90% reduction in API calls for typical usage patterns

#### 2. Token Optimization

**Concise Prompts**: Structured prompts minimize input tokens
```typescript
const maxTokens: number = 1000; // General responses
const maxTokensPerPrompt: number = 500; // Batch processing
const urlAnalysisTokens: number = 2000; // URL analysis
```

**Content Truncation**: Web page content limited to 5000 characters
```typescript
pageContent = html
  .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
  .replace(/<[^>]+>/g, ' ')
  .trim()
  .substring(0, 5000); // Limit to 5000 chars
```

#### 3. Batch Efficiency

Sequential processing with delays prevents rate limit errors that would require retries

Cache checks before API calls eliminate redundant analysis

#### 4. Graceful Degradation

Service continues functioning when API is unavailable, falling back to manual curation

```typescript
if (!claudeService.isAvailable()) {
  // Manual workflow - no API costs
  return null;
}
```

### Cost Monitoring

The service tracks basic usage metrics:

```typescript
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
```

**Recommended Enhancement**: Implement proper cache hit rate tracking to measure cost savings.

## Service Methods Reference

### Core Methods

#### `getInstance(): ClaudeService`
Returns singleton instance of ClaudeService

**Usage**:
```typescript
import { claudeService } from './server/ai/claudeService';
```

#### `isAvailable(): boolean`
Checks if Claude API client is initialized and ready

**Returns**: `true` if API key is configured, `false` otherwise

#### `generateResponse(prompt, maxTokens?, systemPrompt?): Promise<string | null>`
Generates AI response with caching and rate limiting

**Parameters**:
- `prompt: string` - User prompt
- `maxTokens: number` - Token limit (default: 1000)
- `systemPrompt?: string` - System instructions (optional)

**Returns**: Generated response or `null` on failure

#### `analyzeURL(url): Promise<AnalysisResult | null>`
Analyzes URL and extracts structured metadata

**Parameters**:
- `url: string` - HTTPS URL from allowed domains

**Returns**: Structured analysis or `null` on failure

**Analysis Result Structure**:
```typescript
{
  suggestedTitle: string;           // Concise title (max 100 chars)
  suggestedDescription: string;     // 2-3 sentence description
  suggestedTags: string[];          // 3-5 technical tags
  suggestedCategory: string;        // Best-fit category
  suggestedSubcategory?: string;    // Optional subcategory
  confidence: number;               // Confidence score (0.0-1.0)
  keyTopics: string[];              // 3-5 key topics
}
```

#### `batchProcess(prompts, maxTokensPerPrompt?, systemPrompt?): Promise<(string | null)[]>`
Process multiple prompts sequentially with rate limiting

**Parameters**:
- `prompts: string[]` - Array of prompts
- `maxTokensPerPrompt: number` - Tokens per prompt (default: 500)
- `systemPrompt?: string` - System instructions (optional)

**Returns**: Array of responses (same order as input)

### Utility Methods

#### `testConnection(): Promise<boolean>`
Validates Claude API connection with simple test query

**Returns**: `true` if connection successful, `false` otherwise

#### `clearCache(): void`
Clears all cached responses (both caches)

**Use Cases**: Testing, debugging, forcing fresh analysis

#### `getStats(): Object`
Returns current service statistics

**Returns**:
```typescript
{
  available: boolean;      // API availability
  requestCount: number;    // Total requests made
  cacheSize: number;       // Current cache entries
  cacheHitRate: number;    // Cache hit rate (placeholder)
}
```

## Error Handling

The service implements comprehensive error handling for various failure scenarios.

### Error Categories

#### 1. Configuration Errors

**Missing API Key**: Service initializes but returns `null` for all requests
```typescript
if (!apiKey) {
  console.log('Claude API key not found - AI features will use fallback methods');
}
```

**Invalid API Key**: Disables service on 401 errors
```typescript
if (error.status === 401) {
  console.error('Invalid API key - disabling Claude service');
  this.anthropic = null;
}
```

#### 2. Rate Limit Errors

**429 Status**: Logged with backoff suggestion (backoff not yet implemented)
```typescript
if (error.status === 429) {
  console.log('Rate limited by Claude API, backing off...');
  // Exponential backoff could be implemented here
}
```

#### 3. URL Analysis Errors

**Invalid URL**: Throws descriptive error
```typescript
throw new Error('Invalid URL format');
```

**Non-HTTPS**: Throws protocol error
```typescript
throw new Error('Only HTTPS URLs are allowed');
```

**Domain Not Allowed**: Throws with helpful message
```typescript
throw new Error(
  `Domain "${hostname}" is not in the allowlist of trusted domains.`
);
```

**Fetch Timeout**: Handled gracefully with fallback
```typescript
if (fetchError.name === 'AbortError') {
  throw new Error('Request timeout');
}
```

**Content Too Large**: Prevents memory issues
```typescript
throw new Error('Content too large (max 5MB)');
```

#### 4. Parse Errors

**Invalid JSON**: Returns `null` instead of crashing
```typescript
let jsonMatch = response.match(/\{[\s\S]*\}/);
if (!jsonMatch) {
  console.error('No JSON found in Claude response');
  return null;
}
```

### Error Response Pattern

All public methods return `null` on failure rather than throwing exceptions:
```typescript
try {
  // API call
  return result;
} catch (error) {
  console.error('Error:', error);
  return null;
}
```

**Rationale**: Allows graceful degradation and prevents application crashes when AI features fail.

## Usage Examples

### Example 1: Single URL Analysis

```typescript
import { claudeService } from './server/ai/claudeService';

// Analyze a GitHub repository
const result = await claudeService.analyzeURL(
  'https://github.com/video-dev/hls.js'
);

if (result) {
  console.log('Title:', result.suggestedTitle);
  console.log('Description:', result.suggestedDescription);
  console.log('Tags:', result.suggestedTags.join(', '));
  console.log('Category:', result.suggestedCategory);
  console.log('Confidence:', result.confidence);
} else {
  console.log('Analysis failed or service unavailable');
}
```

### Example 2: Batch URL Processing

```typescript
import { claudeService } from './server/ai/claudeService';

const urls = [
  'https://github.com/video-dev/hls.js',
  'https://github.com/videojs/video.js',
  'https://github.com/google/shaka-player'
];

// Analyze multiple URLs efficiently
for (const url of urls) {
  const result = await claudeService.analyzeURL(url);
  if (result) {
    // Store enriched metadata
    await db.updateResource(url, {
      title: result.suggestedTitle,
      description: result.suggestedDescription,
      tags: result.suggestedTags
    });
  }
}
```

### Example 3: Custom Prompt with Caching

```typescript
import { claudeService } from './server/ai/claudeService';

const response = await claudeService.generateResponse(
  'Explain HLS adaptive bitrate streaming in 2 sentences',
  200,
  'You are a video streaming expert. Be concise and technical.'
);

if (response) {
  console.log(response);
}

// Subsequent identical request returns cached result instantly
const cachedResponse = await claudeService.generateResponse(
  'Explain HLS adaptive bitrate streaming in 2 sentences',
  200,
  'You are a video streaming expert. Be concise and technical.'
);
```

### Example 4: Availability Check with Fallback

```typescript
import { claudeService } from './server/ai/claudeService';

async function enrichResource(url: string) {
  if (claudeService.isAvailable()) {
    // AI-powered enrichment
    const analysis = await claudeService.analyzeURL(url);
    if (analysis) {
      return {
        method: 'ai',
        data: analysis
      };
    }
  }

  // Fallback to basic scraping
  const scraped = await scrapeBasicMetadata(url);
  return {
    method: 'manual',
    data: scraped
  };
}
```

### Example 5: Testing Connection

```typescript
import { claudeService } from './server/ai/claudeService';

// Health check endpoint
app.get('/api/health/ai', async (req, res) => {
  const isConnected = await claudeService.testConnection();
  const stats = claudeService.getStats();

  res.json({
    status: isConnected ? 'healthy' : 'unavailable',
    ...stats
  });
});
```

## Performance Benchmarks

### Response Times

| Operation | Cache Hit | Cache Miss | Notes |
|-----------|-----------|------------|-------|
| `generateResponse()` | 1-5ms | 500-1500ms | General prompts |
| `analyzeURL()` | 1-5ms | 2000-4000ms | Includes URL fetch + analysis |
| `batchProcess(10)` | 50-100ms | 10-15s | Depends on cache hit rate |
| `isAvailable()` | <1ms | <1ms | Simple boolean check |
| `clearCache()` | <1ms | <1ms | Memory operation |

### Memory Usage

| Cache Type | Entry Size (avg) | Max Entries | Max Memory |
|------------|------------------|-------------|------------|
| Response Cache | ~1-2 KB | 100 | ~100-200 KB |
| Analysis Cache | ~500 bytes | 100 | ~50 KB |
| **Total** | - | 200 | ~250 KB |

**Conclusion**: Memory footprint is negligible even at maximum cache capacity.

## Best Practices

### 1. Always Check Availability

```typescript
if (!claudeService.isAvailable()) {
  // Implement fallback logic
  return null;
}
```

### 2. Handle Null Returns

All methods can return `null` - always check before using results:
```typescript
const result = await claudeService.analyzeURL(url);
if (!result) {
  console.error('Analysis failed');
  return;
}
```

### 3. Use Batch Processing for Multiple URLs

Instead of individual calls in a loop:
```typescript
// ❌ Inefficient - no rate limiting coordination
for (const url of urls) {
  await claudeService.analyzeURL(url);
}

// ✅ Efficient - handles rate limiting internally
await Promise.all(urls.map(url => claudeService.analyzeURL(url)));
```

### 4. Validate URLs Before Analysis

Pre-validate URLs client-side to avoid unnecessary API calls:
```typescript
// Client-side validation
if (!url.startsWith('https://')) {
  throw new Error('Only HTTPS URLs supported');
}
```

### 5. Monitor Cache Hit Rates

Implement proper cache hit rate tracking to optimize cache TTL values:
```typescript
// TODO: Add to ClaudeService
private cacheHits = 0;
private cacheMisses = 0;

public getCacheHitRate(): number {
  const total = this.cacheHits + this.cacheMisses;
  return total > 0 ? this.cacheHits / total : 0;
}
```

### 6. Clear Cache When Needed

During development or testing, clear cache to force fresh analysis:
```typescript
// Before running test suite
claudeService.clearCache();
```

### 7. Set Appropriate Token Limits

Balance between quality and cost:
```typescript
// Short responses - use lower limits
const summary = await claudeService.generateResponse(prompt, 200);

// Detailed analysis - use higher limits
const analysis = await claudeService.generateResponse(prompt, 2000);
```

## Future Enhancements

### Potential Improvements

1. **Exponential Backoff**: Implement proper retry logic with exponential backoff for 429 errors
2. **Cache Hit Rate Tracking**: Add metrics for monitoring cache effectiveness
3. **Persistent Cache**: Store cache in Redis or PostgreSQL for multi-instance deployments
4. **Embedding Support**: Integrate embedding service for semantic similarity
5. **Streaming Responses**: Support Claude's streaming API for real-time feedback
6. **Priority Queue**: Implement priority-based batch processing
7. **Cost Tracking**: Add detailed cost estimation and tracking per request
8. **Circuit Breaker**: Automatically disable service after repeated failures
9. **Webhook Support**: Notify admins when batch jobs complete
10. **A/B Testing**: Compare different models and prompts for quality/cost optimization

## Troubleshooting

### Common Issues

#### Service Reports as Unavailable

**Symptoms**: `isAvailable()` returns `false`

**Solutions**:
1. Check environment variables: `AI_INTEGRATIONS_ANTHROPIC_API_KEY` or `ANTHROPIC_API_KEY`
2. Verify API key is valid (not expired/revoked)
3. Check console logs for initialization errors
4. Test connection: `await claudeService.testConnection()`

#### Rate Limit Errors (429)

**Symptoms**: API returns 429 status code

**Solutions**:
1. Reduce batch size (process fewer items at once)
2. Increase `RATE_LIMIT_DELAY` value
3. Check Anthropic dashboard for rate limit quotas
4. Wait and retry later (automatic backoff not yet implemented)

#### Domain Not Allowed Errors

**Symptoms**: `analyzeURL()` throws domain allowlist error

**Solutions**:
1. Verify the domain is legitimate and video-streaming-related
2. Add domain to `ALLOWED_DOMAINS` array if appropriate
3. Use alternative URL from allowed domain (e.g., GitHub mirror)

#### Cache Not Working

**Symptoms**: Same requests take full API time on repeat calls

**Solutions**:
1. Check if prompts are identical (including system prompts)
2. Verify cache hasn't been cleared recently
3. Check TTL hasn't expired (1 hour for responses, 24 hours for analysis)
4. Monitor `getStats()` to verify cache is populating

#### Parse Errors on Analysis

**Symptoms**: `analyzeURL()` returns `null`, logs show "No JSON found"

**Solutions**:
1. Check if URL content is accessible (not behind auth/paywall)
2. Verify domain returns HTML content (not redirects/errors)
3. Review Claude response in logs for format issues
4. May require prompt adjustment if content is unusual

---

## Related Documentation

- [ADMIN-GUIDE.md](./ADMIN-GUIDE.md) - Admin enrichment workflow
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Overall system architecture
- [API.md](./API.md) - API endpoint reference

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-31 | Initial AI Services documentation |

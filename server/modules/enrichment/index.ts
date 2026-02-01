/**
 * ============================================================================
 * ENRICHMENT MODULE - AI-Powered Resource Enrichment
 * ============================================================================
 *
 * This module provides AI-powered analysis and metadata enrichment for
 * resources using Claude and other AI services.
 *
 * FEATURES:
 * - URL Content Analysis: Extract metadata from web pages
 * - Category Suggestion: Recommend appropriate categories
 * - Quality Scoring: Evaluate resource relevance (1-10 scale)
 * - Tag Generation: Auto-generate relevant tags
 * - Description Enhancement: Improve resource descriptions
 * - Batch Processing: Sequential processing with rate limiting
 *
 * AI CAPABILITIES:
 * - Title extraction and normalization
 * - Description summarization (2-3 sentences)
 * - Technical tag identification
 * - Category and subcategory matching
 * - Confidence scoring for suggestions
 * - Key topic extraction
 *
 * URL ANALYSIS WORKFLOW:
 * 1. Validate URL format and domain allowlist
 * 2. Fetch page content with timeout safeguards
 * 3. Extract text from HTML (strip scripts/styles)
 * 4. Send to Claude API for analysis
 * 5. Parse and sanitize AI response
 * 6. Cache results for deduplication
 * 7. Return structured metadata
 *
 * SECURITY:
 * - ALLOWED_DOMAINS whitelist prevents SSRF attacks
 * - HTTPS-only URL validation
 * - Content size limits (5MB max)
 * - Request timeout enforcement (10s)
 * - API key rotation and management
 *
 * CACHING:
 * - Response cache (1 hour TTL): Deduplicates identical requests
 * - Analysis cache (24 hour TTL): Stores URL analysis results
 * - LRU eviction when cache exceeds MAX_CACHE_SIZE
 * - Cache invalidation on demand
 *
 * RATE LIMITING:
 * - Request counting for usage monitoring
 * - Configurable delays between batch requests
 * - Graceful handling of API rate limit errors
 * - Exponential backoff on failures
 *
 * COST OPTIMIZATION:
 * - Uses Claude Haiku 4.5 (fastest, cheapest model)
 * - Aggressive caching reduces redundant API calls
 * - Batch mode processes resources efficiently
 * - Prompt optimization for token reduction
 *
 * QUALITY CONTROL:
 * - Response sanitization and validation
 * - Field length enforcement
 * - Confidence threshold filtering
 * - Manual review flag for low confidence
 *
 * See /docs/ADMIN-GUIDE.md for enrichment workflow documentation.
 * ============================================================================
 */

export { enrichmentModule } from './routes';

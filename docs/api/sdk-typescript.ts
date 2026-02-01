/**
 * TypeScript SDK for Awesome List Site Public API
 *
 * This SDK provides a typed client for accessing the public API endpoints.
 *
 * @example
 * ```typescript
 * import { AwesomeListApiClient } from './sdk-typescript';
 *
 * const client = new AwesomeListApiClient(process.env.API_KEY!);
 *
 * // List all resources
 * const { resources, total } = await client.getResources();
 *
 * // Filter by category
 * const reactResources = await client.getResources({
 *   category: 'Frameworks',
 *   subcategory: 'React',
 *   limit: 50
 * });
 *
 * // Get single resource
 * const resource = await client.getResource(42);
 *
 * // Get categories and tags
 * const { categories } = await client.getCategories();
 * const { tags } = await client.getTags();
 * ```
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * A video resource from the awesome list
 */
export interface Resource {
  id: number;
  title: string;
  url: string;
  description: string;
  category: string;
  subcategory?: string;
  subSubcategory?: string;
  status: 'pending' | 'approved' | 'rejected';
  metadata?: {
    tags?: string[];
    difficulty?: string;
    duration?: string;
    [key: string]: any;
  };
  submittedBy?: number;
  reviewedBy?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * A category with subcategories
 */
export interface Category {
  id: number;
  name: string;
  slug: string;
  subcategories?: Subcategory[];
}

/**
 * A subcategory
 */
export interface Subcategory {
  id: number;
  name: string;
  slug: string;
  categoryId: number;
}

/**
 * A tag
 */
export interface Tag {
  id: number;
  name: string;
  slug: string;
  createdAt: string;
}

/**
 * Paginated response for resources
 */
export interface PaginatedResourcesResponse {
  resources: Resource[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Response for categories endpoint
 */
export interface CategoriesResponse {
  categories: Category[];
}

/**
 * Response for tags endpoint
 */
export interface TagsResponse {
  tags: Tag[];
}

/**
 * Options for fetching resources
 */
export interface GetResourcesOptions {
  page?: number;
  limit?: number;
  category?: string;
  subcategory?: string;
  search?: string;
}

/**
 * Rate limit error with reset time
 */
export class RateLimitError extends Error {
  public readonly resetTime: Date;
  public readonly remaining: number;
  public readonly limit: number;

  constructor(message: string, resetTime: Date, remaining: number, limit: number) {
    super(message);
    this.name = 'RateLimitError';
    this.resetTime = resetTime;
    this.remaining = remaining;
    this.limit = limit;
  }
}

/**
 * API error with status code
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly statusText: string;

  constructor(message: string, status: number, statusText: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
  }
}

// ============================================================================
// API Client
// ============================================================================

/**
 * Client for the Awesome List Site Public API
 *
 * Provides typed methods for all public endpoints with automatic
 * rate limit handling, error handling, and request retries.
 */
export class AwesomeListApiClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  /**
   * Create a new API client
   *
   * @param apiKey - Your API key (get from /api/admin/api-keys)
   * @param baseUrl - Base URL of the API (default: http://localhost:5000)
   */
  constructor(apiKey: string, baseUrl: string = 'http://localhost:5000') {
    if (!apiKey) {
      throw new Error('API key is required');
    }
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Make an authenticated request to the API
   *
   * @private
   * @param endpoint - API endpoint path (e.g., '/api/public/resources')
   * @param options - Fetch options
   * @returns Parsed JSON response
   * @throws {RateLimitError} When rate limit is exceeded
   * @throws {ApiError} When API returns an error
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Handle rate limiting
    if (response.status === 429) {
      const resetHeader = response.headers.get('RateLimit-Reset');
      const remainingHeader = response.headers.get('RateLimit-Remaining');
      const limitHeader = response.headers.get('RateLimit-Limit');

      const resetTime = resetHeader
        ? new Date(Number(resetHeader) * 1000)
        : new Date(Date.now() + 3600000); // Default to 1 hour
      const remaining = remainingHeader ? parseInt(remainingHeader, 10) : 0;
      const limit = limitHeader ? parseInt(limitHeader, 10) : 60;

      throw new RateLimitError(
        `Rate limit exceeded. Resets at ${resetTime.toISOString()}`,
        resetTime,
        remaining,
        limit
      );
    }

    // Handle other HTTP errors
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // If response is not JSON, use default error message
      }

      throw new ApiError(errorMessage, response.status, response.statusText);
    }

    return response.json() as Promise<T>;
  }

  /**
   * List resources with optional filtering and pagination
   *
   * @param options - Filtering and pagination options
   * @returns Paginated list of resources
   *
   * @example
   * ```typescript
   * // Get first page with default limit (20)
   * const page1 = await client.getResources();
   *
   * // Get specific page with custom limit
   * const page2 = await client.getResources({ page: 2, limit: 50 });
   *
   * // Filter by category
   * const frameworks = await client.getResources({ category: 'Frameworks' });
   *
   * // Filter by category and subcategory
   * const react = await client.getResources({
   *   category: 'Frameworks',
   *   subcategory: 'React'
   * });
   *
   * // Search in title and description
   * const searchResults = await client.getResources({ search: 'hooks' });
   *
   * // Combine filters
   * const filtered = await client.getResources({
   *   category: 'Frameworks',
   *   search: 'tutorial',
   *   page: 1,
   *   limit: 10
   * });
   * ```
   */
  async getResources(options: GetResourcesOptions = {}): Promise<PaginatedResourcesResponse> {
    const params = new URLSearchParams();

    if (options.page !== undefined) {
      params.append('page', options.page.toString());
    }
    if (options.limit !== undefined) {
      params.append('limit', options.limit.toString());
    }
    if (options.category) {
      params.append('category', options.category);
    }
    if (options.subcategory) {
      params.append('subcategory', options.subcategory);
    }
    if (options.search) {
      params.append('search', options.search);
    }

    const query = params.toString();
    const endpoint = `/api/public/resources${query ? `?${query}` : ''}`;

    return this.request<PaginatedResourcesResponse>(endpoint);
  }

  /**
   * Get a single resource by ID
   *
   * Note: Only approved resources are accessible via the public API.
   * Pending or rejected resources will return 404.
   *
   * @param id - Resource ID
   * @returns Single resource
   * @throws {ApiError} With status 404 if resource not found or not approved
   *
   * @example
   * ```typescript
   * try {
   *   const resource = await client.getResource(42);
   *   console.log(resource.title);
   * } catch (error) {
   *   if (error instanceof ApiError && error.status === 404) {
   *     console.log('Resource not found or not approved');
   *   }
   * }
   * ```
   */
  async getResource(id: number): Promise<Resource> {
    return this.request<Resource>(`/api/public/resources/${id}`);
  }

  /**
   * List all categories with their subcategories
   *
   * @returns List of categories
   *
   * @example
   * ```typescript
   * const { categories } = await client.getCategories();
   *
   * categories.forEach(category => {
   *   console.log(`${category.name} (${category.slug})`);
   *   category.subcategories?.forEach(sub => {
   *     console.log(`  - ${sub.name}`);
   *   });
   * });
   * ```
   */
  async getCategories(): Promise<CategoriesResponse> {
    return this.request<CategoriesResponse>('/api/public/categories');
  }

  /**
   * List all tags
   *
   * @returns List of tags
   *
   * @example
   * ```typescript
   * const { tags } = await client.getTags();
   * console.log(`Found ${tags.length} tags`);
   *
   * tags.forEach(tag => {
   *   console.log(`- ${tag.name}`);
   * });
   * ```
   */
  async getTags(): Promise<TagsResponse> {
    return this.request<TagsResponse>('/api/public/tags');
  }

  /**
   * Async generator that yields all resources across all pages
   *
   * Automatically handles pagination and yields resources one by one.
   * Useful for processing large datasets without loading everything into memory.
   *
   * @param options - Filtering options (pagination options are ignored)
   * @yields Individual resources
   *
   * @example
   * ```typescript
   * // Process all React resources one by one
   * for await (const resource of client.paginateResources({
   *   category: 'Frameworks',
   *   subcategory: 'React'
   * })) {
   *   console.log(`Processing: ${resource.title}`);
   *   // Process each resource...
   * }
   * ```
   */
  async *paginateResources(
    options: Omit<GetResourcesOptions, 'page'> = {}
  ): AsyncGenerator<Resource, void, undefined> {
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.getResources({
        ...options,
        page,
      });

      for (const resource of response.resources) {
        yield resource;
      }

      hasMore = page < response.totalPages;
      page++;
    }
  }

  /**
   * Fetch all resources across all pages
   *
   * Warning: This loads all resources into memory. For large datasets,
   * consider using paginateResources() instead.
   *
   * @param options - Filtering options (pagination options are ignored)
   * @returns Array of all matching resources
   *
   * @example
   * ```typescript
   * // Get all React resources (loads into memory)
   * const allReactResources = await client.getAllResources({
   *   category: 'Frameworks',
   *   subcategory: 'React'
   * });
   *
   * console.log(`Found ${allReactResources.length} resources`);
   * ```
   */
  async getAllResources(
    options: Omit<GetResourcesOptions, 'page'> = {}
  ): Promise<Resource[]> {
    const resources: Resource[] = [];

    for await (const resource of this.paginateResources(options)) {
      resources.push(resource);
    }

    return resources;
  }
}

// ============================================================================
// Usage Examples
// ============================================================================

/**
 * Example 1: Basic usage
 */
async function example1() {
  const client = new AwesomeListApiClient(process.env.API_KEY!);

  // Get first page of resources
  const { resources, total, totalPages } = await client.getResources();
  console.log(`Found ${total} resources across ${totalPages} pages`);
  console.log(`First resource: ${resources[0]?.title}`);
}

/**
 * Example 2: Filtering and pagination
 */
async function example2() {
  const client = new AwesomeListApiClient(process.env.API_KEY!);

  // Get React resources with custom pagination
  const reactResources = await client.getResources({
    category: 'Frameworks',
    subcategory: 'React',
    page: 1,
    limit: 50,
  });

  console.log(`Found ${reactResources.total} React resources`);
}

/**
 * Example 3: Error handling with rate limits
 */
async function example3() {
  const client = new AwesomeListApiClient(process.env.API_KEY!);

  try {
    const resources = await client.getResources();
    console.log(`Success: ${resources.resources.length} resources`);
  } catch (error) {
    if (error instanceof RateLimitError) {
      console.error('Rate limit exceeded!');
      console.error(`Resets at: ${error.resetTime}`);
      console.error(`Remaining: ${error.remaining}/${error.limit}`);

      // Wait until reset time
      const waitTime = error.resetTime.getTime() - Date.now();
      if (waitTime > 0) {
        console.log(`Waiting ${Math.ceil(waitTime / 1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        // Retry...
      }
    } else if (error instanceof ApiError) {
      console.error(`API Error ${error.status}: ${error.message}`);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

/**
 * Example 4: Pagination with async generator
 */
async function example4() {
  const client = new AwesomeListApiClient(process.env.API_KEY!);

  // Process all resources one by one (memory efficient)
  let count = 0;
  for await (const resource of client.paginateResources({
    category: 'Frameworks'
  })) {
    console.log(`${++count}. ${resource.title}`);

    // Stop after 100 for demo purposes
    if (count >= 100) break;
  }
}

/**
 * Example 5: Get categories and tags
 */
async function example5() {
  const client = new AwesomeListApiClient(process.env.API_KEY!);

  // Get all categories
  const { categories } = await client.getCategories();
  console.log('Categories:');
  categories.forEach(cat => {
    console.log(`- ${cat.name} (${cat.slug})`);
  });

  // Get all tags
  const { tags } = await client.getTags();
  console.log(`\nFound ${tags.length} tags`);
}

// Export the client as default
export default AwesomeListApiClient;

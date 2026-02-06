# API Usage Examples

This guide provides practical examples for using the Awesome List Site Public API in different programming languages and scenarios.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [Examples by Endpoint](#examples-by-endpoint)
5. [Language-Specific Examples](#language-specific-examples)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)

---

## Getting Started

### Prerequisites

- **API Key**: Log in to the site and navigate to the admin panel to create an API key
- **Base URL**:
  - Development: `http://localhost:5000`
  - Production: `https://api.example.com` (replace with actual production URL)

### Quick Start

```bash
# Test the API without authentication (limited rate)
curl http://localhost:5000/api/public/resources

# Test with authentication (better rate limits)
curl -H "Authorization: Bearer YOUR_API_KEY" \
  http://localhost:5000/api/public/resources
```

---

## Authentication

### Getting an API Key

1. Log in to your account
2. Navigate to the Admin Panel
3. Click "Create API Key"
4. Give your key a descriptive name (e.g., "My IDE Extension")
5. Copy the key immediately - **it will only be shown once**
6. Store the key securely (use environment variables, never commit to version control)

### Using Your API Key

Include your API key in the `Authorization` header as a Bearer token:

```
Authorization: Bearer YOUR_API_KEY
```

**Note**: Most endpoints work without authentication, but you'll have very limited rate limits (60 requests/hour).

---

## Rate Limiting

All API endpoints are rate-limited to prevent abuse. Rate limit information is included in response headers:

| Header | Description |
|--------|-------------|
| `RateLimit-Limit` | Maximum requests per hour for your tier |
| `RateLimit-Remaining` | Requests remaining in current window |
| `RateLimit-Reset` | Unix timestamp when the limit resets |

### Rate Limit Tiers

| Tier | Requests/Hour | How to Get |
|------|---------------|------------|
| **Free** | 60 | Default for all API keys |
| **Standard** | 1,000 | Contact support for upgrade |
| **Premium** | 10,000 | Contact support for upgrade |

### Handling Rate Limits

When you exceed your rate limit, you'll receive a `429 Too Many Requests` response:

```json
{
  "message": "Too many requests, please try again later."
}
```

**Best Practice**: Check the `RateLimit-Remaining` header and implement exponential backoff when approaching the limit.

---

## Examples by Endpoint

### 1. List Resources

Get a paginated list of approved resources with optional filtering.

**Endpoint**: `GET /api/public/resources`

**Query Parameters**:
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20, max: 100) - Items per page
- `category` (string) - Filter by category name
- `subcategory` (string) - Filter by subcategory name
- `search` (string) - Search in title and description

#### cURL

```bash
# Basic request - first page with default limit (20)
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "http://localhost:5000/api/public/resources"

# With pagination
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "http://localhost:5000/api/public/resources?page=2&limit=50"

# Filter by category
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "http://localhost:5000/api/public/resources?category=Frameworks"

# Filter by category and subcategory
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "http://localhost:5000/api/public/resources?category=Frameworks&subcategory=React"

# Search query
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "http://localhost:5000/api/public/resources?search=hooks"

# Combine filters and search
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "http://localhost:5000/api/public/resources?category=Frameworks&search=tutorial&page=1&limit=10"
```

#### JavaScript (fetch)

```javascript
const API_KEY = process.env.API_KEY;
const BASE_URL = 'http://localhost:5000';

async function getResources(options = {}) {
  const { page = 1, limit = 20, category, subcategory, search } = options;

  // Build query string
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (category) params.append('category', category);
  if (subcategory) params.append('subcategory', subcategory);
  if (search) params.append('search', search);

  const response = await fetch(
    `${BASE_URL}/api/public/resources?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  // Check rate limit headers
  const remaining = response.headers.get('RateLimit-Remaining');
  console.log(`Rate limit remaining: ${remaining}`);

  return await response.json();
}

// Usage examples
const allResources = await getResources();
const reactResources = await getResources({
  category: 'Frameworks',
  subcategory: 'React',
  limit: 50
});
const searchResults = await getResources({ search: 'hooks' });
```

#### Node.js (axios)

```javascript
const axios = require('axios');

const API_KEY = process.env.API_KEY;
const BASE_URL = 'http://localhost:5000';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
  },
});

async function getResources(options = {}) {
  try {
    const response = await apiClient.get('/api/public/resources', {
      params: options,
    });

    // Check rate limit headers
    console.log('Rate limit remaining:', response.headers['ratelimit-remaining']);
    console.log('Rate limit resets at:', new Date(response.headers['ratelimit-reset'] * 1000));

    return response.data;
  } catch (error) {
    if (error.response?.status === 429) {
      console.error('Rate limit exceeded!');
      const resetTime = new Date(error.response.headers['ratelimit-reset'] * 1000);
      console.error(`Try again after: ${resetTime}`);
    }
    throw error;
  }
}

// Usage examples
(async () => {
  const allResources = await getResources();
  const page2 = await getResources({ page: 2, limit: 50 });
  const filtered = await getResources({
    category: 'Frameworks',
    subcategory: 'React'
  });
})();
```

#### Python (requests)

```python
import os
import requests
from typing import Optional, Dict, Any

API_KEY = os.getenv('API_KEY')
BASE_URL = 'http://localhost:5000'

def get_resources(
    page: int = 1,
    limit: int = 20,
    category: Optional[str] = None,
    subcategory: Optional[str] = None,
    search: Optional[str] = None
) -> Dict[str, Any]:
    """Fetch resources from the API with optional filters."""

    headers = {
        'Authorization': f'Bearer {API_KEY}'
    }

    params = {
        'page': page,
        'limit': limit,
    }

    if category:
        params['category'] = category
    if subcategory:
        params['subcategory'] = subcategory
    if search:
        params['search'] = search

    response = requests.get(
        f'{BASE_URL}/api/public/resources',
        headers=headers,
        params=params
    )

    # Check rate limit headers
    print(f"Rate limit remaining: {response.headers.get('RateLimit-Remaining')}")

    response.raise_for_status()  # Raise exception for 4xx/5xx status codes
    return response.json()

# Usage examples
if __name__ == '__main__':
    # Get first page
    data = get_resources()
    print(f"Total resources: {data['total']}")
    print(f"Total pages: {data['totalPages']}")

    # Get specific page with larger limit
    page2 = get_resources(page=2, limit=50)

    # Filter by category
    frameworks = get_resources(category='Frameworks')

    # Filter by category and subcategory
    react_resources = get_resources(category='Frameworks', subcategory='React')

    # Search
    search_results = get_resources(search='hooks')
```

**Response**:

```json
{
  "resources": [
    {
      "id": 42,
      "title": "Introduction to React Hooks",
      "url": "https://www.youtube.com/watch?v=example",
      "description": "A comprehensive guide to React Hooks...",
      "category": "Frameworks",
      "subcategory": "React",
      "subSubcategory": "Hooks",
      "status": "approved",
      "metadata": {
        "tags": ["react", "hooks", "frontend"],
        "difficulty": "intermediate"
      },
      "createdAt": "2024-01-10T08:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20,
  "totalPages": 8
}
```

---

### 2. Get Resource by ID

Retrieve a single approved resource by its ID.

**Endpoint**: `GET /api/public/resources/:id`

#### cURL

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "http://localhost:5000/api/public/resources/42"
```

#### JavaScript (fetch)

```javascript
async function getResource(id) {
  const response = await fetch(
    `${BASE_URL}/api/public/resources/${id}`,
    {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      },
    }
  );

  if (response.status === 404) {
    throw new Error('Resource not found or not approved');
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

// Usage
const resource = await getResource(42);
console.log(resource.title);
```

#### Python (requests)

```python
def get_resource(resource_id: int) -> Dict[str, Any]:
    """Fetch a single resource by ID."""

    headers = {
        'Authorization': f'Bearer {API_KEY}'
    }

    response = requests.get(
        f'{BASE_URL}/api/public/resources/{resource_id}',
        headers=headers
    )

    if response.status_code == 404:
        raise ValueError('Resource not found or not approved')

    response.raise_for_status()
    return response.json()

# Usage
resource = get_resource(42)
print(f"Title: {resource['title']}")
print(f"URL: {resource['url']}")
```

**Response**:

```json
{
  "id": 42,
  "title": "Introduction to React Hooks",
  "url": "https://www.youtube.com/watch?v=example",
  "description": "A comprehensive guide to React Hooks...",
  "category": "Frameworks",
  "subcategory": "React",
  "status": "approved",
  "createdAt": "2024-01-10T08:00:00Z"
}
```

---

### 3. List Categories

Get all categories with their hierarchy.

**Endpoint**: `GET /api/public/categories`

#### cURL

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "http://localhost:5000/api/public/categories"
```

#### JavaScript (fetch)

```javascript
async function getCategories() {
  const response = await fetch(
    `${BASE_URL}/api/public/categories`,
    {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

// Usage
const { categories } = await getCategories();
categories.forEach(cat => {
  console.log(`${cat.name} (${cat.slug})`);
});
```

#### Python (requests)

```python
def get_categories() -> Dict[str, Any]:
    """Fetch all categories."""

    headers = {
        'Authorization': f'Bearer {API_KEY}'
    }

    response = requests.get(
        f'{BASE_URL}/api/public/categories',
        headers=headers
    )

    response.raise_for_status()
    return response.json()

# Usage
data = get_categories()
for category in data['categories']:
    print(f"{category['name']} ({category['slug']})")
```

**Response**:

```json
{
  "categories": [
    {
      "id": 1,
      "name": "Frameworks",
      "slug": "frameworks"
    },
    {
      "id": 2,
      "name": "Tools",
      "slug": "tools"
    }
  ]
}
```

---

### 4. List Tags

Get all tags with usage counts.

**Endpoint**: `GET /api/public/tags`

#### cURL

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "http://localhost:5000/api/public/tags"
```

#### JavaScript (fetch)

```javascript
async function getTags() {
  const response = await fetch(
    `${BASE_URL}/api/public/tags`,
    {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

// Usage
const { tags } = await getTags();
console.log(`Found ${tags.length} tags`);
```

#### Python (requests)

```python
def get_tags() -> Dict[str, Any]:
    """Fetch all tags."""

    headers = {
        'Authorization': f'Bearer {API_KEY}'
    }

    response = requests.get(
        f'{BASE_URL}/api/public/tags',
        headers=headers
    )

    response.raise_for_status()
    return response.json()

# Usage
data = get_tags()
print(f"Found {len(data['tags'])} tags")
```

**Response**:

```json
{
  "tags": [
    {
      "id": 1,
      "name": "react",
      "slug": "react",
      "createdAt": "2024-01-01T00:00:00Z"
    },
    {
      "id": 2,
      "name": "hooks",
      "slug": "hooks",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

## Language-Specific Examples

### Complete TypeScript SDK Example

```typescript
interface Resource {
  id: number;
  title: string;
  url: string;
  description: string;
  category: string;
  subcategory?: string;
  status: string;
  createdAt: string;
}

interface PaginatedResponse {
  resources: Resource[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class AwesomeListApiClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = 'http://localhost:5000') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        ...options.headers,
      },
    });

    // Handle rate limiting
    if (response.status === 429) {
      const resetTime = response.headers.get('RateLimit-Reset');
      throw new Error(
        `Rate limit exceeded. Resets at ${new Date(Number(resetTime) * 1000)}`
      );
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async getResources(options: {
    page?: number;
    limit?: number;
    category?: string;
    subcategory?: string;
    search?: string;
  } = {}): Promise<PaginatedResponse> {
    const params = new URLSearchParams();

    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.category) params.append('category', options.category);
    if (options.subcategory) params.append('subcategory', options.subcategory);
    if (options.search) params.append('search', options.search);

    const query = params.toString();
    const endpoint = `/api/public/resources${query ? `?${query}` : ''}`;

    return this.request<PaginatedResponse>(endpoint);
  }

  async getResource(id: number): Promise<Resource> {
    return this.request<Resource>(`/api/public/resources/${id}`);
  }

  async getCategories(): Promise<{ categories: Array<{ id: number; name: string; slug: string }> }> {
    return this.request('/api/public/categories');
  }

  async getTags(): Promise<{ tags: Array<{ id: number; name: string; slug: string }> }> {
    return this.request('/api/public/tags');
  }
}

// Usage
const client = new AwesomeListApiClient(process.env.API_KEY!);

// Get all resources
const allResources = await client.getResources();

// Get filtered resources
const reactResources = await client.getResources({
  category: 'Frameworks',
  subcategory: 'React',
  page: 1,
  limit: 50,
});

// Get single resource
const resource = await client.getResource(42);

// Get categories and tags
const { categories } = await client.getCategories();
const { tags } = await client.getTags();
```

### Complete Python SDK Example

```python
import os
import requests
from typing import Optional, Dict, Any, List
from datetime import datetime

class AwesomeListApiClient:
    """Python SDK for Awesome List Site API"""

    def __init__(self, api_key: str, base_url: str = 'http://localhost:5000'):
        self.api_key = api_key
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {api_key}'
        })

    def _request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make an HTTP request and handle errors."""
        response = self.session.request(
            method,
            f'{self.base_url}{endpoint}',
            **kwargs
        )

        # Handle rate limiting
        if response.status_code == 429:
            reset_time = int(response.headers.get('RateLimit-Reset', 0))
            reset_date = datetime.fromtimestamp(reset_time)
            raise Exception(f'Rate limit exceeded. Resets at {reset_date}')

        response.raise_for_status()
        return response.json()

    def get_resources(
        self,
        page: int = 1,
        limit: int = 20,
        category: Optional[str] = None,
        subcategory: Optional[str] = None,
        search: Optional[str] = None
    ) -> Dict[str, Any]:
        """Fetch resources with optional filtering and pagination."""

        params = {
            'page': page,
            'limit': limit,
        }

        if category:
            params['category'] = category
        if subcategory:
            params['subcategory'] = subcategory
        if search:
            params['search'] = search

        return self._request('GET', '/api/public/resources', params=params)

    def get_resource(self, resource_id: int) -> Dict[str, Any]:
        """Fetch a single resource by ID."""
        return self._request('GET', f'/api/public/resources/{resource_id}')

    def get_categories(self) -> Dict[str, List[Dict[str, Any]]]:
        """Fetch all categories."""
        return self._request('GET', '/api/public/categories')

    def get_tags(self) -> Dict[str, List[Dict[str, Any]]]:
        """Fetch all tags."""
        return self._request('GET', '/api/public/tags')

    def paginate_resources(self, **kwargs):
        """Generator that yields all resources across all pages."""
        page = 1
        while True:
            data = self.get_resources(page=page, **kwargs)

            for resource in data['resources']:
                yield resource

            # Check if there are more pages
            if page >= data['totalPages']:
                break

            page += 1

# Usage
if __name__ == '__main__':
    client = AwesomeListApiClient(os.getenv('API_KEY'))

    # Get paginated resources
    page1 = client.get_resources(page=1, limit=20)
    print(f"Total resources: {page1['total']}")

    # Get filtered resources
    react_resources = client.get_resources(
        category='Frameworks',
        subcategory='React'
    )

    # Get single resource
    resource = client.get_resource(42)
    print(f"Resource: {resource['title']}")

    # Iterate through all resources (automatic pagination)
    for resource in client.paginate_resources(category='Frameworks'):
        print(f"- {resource['title']}")
```

---

## Error Handling

### Common Error Codes

| Status Code | Meaning | How to Handle |
|-------------|---------|---------------|
| `400` | Bad Request | Check your query parameters (invalid format) |
| `401` | Unauthorized | Check your API key is valid and not revoked |
| `404` | Not Found | Resource doesn't exist or is not approved |
| `429` | Too Many Requests | You've exceeded rate limit - wait and retry |
| `500` | Internal Server Error | Server issue - retry with exponential backoff |

### Retry Logic Example (JavaScript)

```javascript
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        // Rate limit - exponential backoff
        const resetTime = parseInt(response.headers.get('RateLimit-Reset'));
        const waitTime = (resetTime * 1000) - Date.now();

        if (waitTime > 0 && i < maxRetries - 1) {
          console.log(`Rate limited. Waiting ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }

      if (response.status >= 500 && i < maxRetries - 1) {
        // Server error - exponential backoff
        const delay = Math.pow(2, i) * 1000;
        console.log(`Server error. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      // Network error - retry
      const delay = Math.pow(2, i) * 1000;
      console.log(`Network error. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

---

## Best Practices

### 1. Store API Keys Securely

**Never** hardcode API keys in your source code:

```javascript
// ❌ BAD - Don't do this!
const API_KEY = 'sk_live_abc123...';

// ✅ GOOD - Use environment variables
const API_KEY = process.env.API_KEY;
```

### 2. Respect Rate Limits

Always check rate limit headers and implement backoff:

```javascript
function checkRateLimit(response) {
  const remaining = parseInt(response.headers.get('RateLimit-Remaining'));
  const limit = parseInt(response.headers.get('RateLimit-Limit'));

  if (remaining < limit * 0.1) {
    console.warn('Approaching rate limit! Consider slowing down requests.');
  }
}
```

### 3. Use Pagination Efficiently

Don't fetch all pages if you only need specific data:

```javascript
// ❌ BAD - Fetches all 1000 resources
const allResources = await getAllPages();

// ✅ GOOD - Use search/filter to reduce results
const filteredResources = await getResources({
  category: 'Frameworks',
  subcategory: 'React',
  search: 'hooks',
  limit: 50
});
```

### 4. Cache Responses

Cache API responses to reduce requests:

```javascript
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedResources(options) {
  const cacheKey = JSON.stringify(options);
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const data = await getResources(options);
  cache.set(cacheKey, { data, timestamp: Date.now() });

  return data;
}
```

### 5. Handle Errors Gracefully

Always implement proper error handling:

```python
try:
    resource = client.get_resource(42)
except requests.HTTPError as e:
    if e.response.status_code == 404:
        print("Resource not found")
    elif e.response.status_code == 429:
        print("Rate limit exceeded")
    else:
        print(f"Error: {e}")
except Exception as e:
    print(f"Unexpected error: {e}")
```

---

## Additional Resources

- **API Documentation**: Visit `/api/docs` for interactive Swagger UI
- **OpenAPI Spec**: Download the [OpenAPI specification](./openapi.yaml)
- **Support**: Contact us at api@example.com
- **GitHub**: [Report issues or contribute](https://github.com/example/awesome-list-site)

---

## Need Help?

If you encounter issues or have questions:

1. Check the [Swagger UI documentation](/api/docs)
2. Review this examples guide
3. Check rate limit headers in your responses
4. Contact support with your API key ID (never send the actual key!)

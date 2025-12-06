# Import Feature - API Reference

**Version**: v1.1.0
**Base URL**: `http://localhost:3000` (local) or `https://your-domain.com` (production)
**Authentication**: Required for all import/export endpoints
**Rate Limiting**: 100 requests per 15 minutes (public endpoints)

---

## Import Endpoints

### POST /api/github/import

Import resources from a GitHub awesome list repository (background processing).

**Authentication:** Required (Admin only)

**Request:**
```http
POST /api/github/import
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "repositoryUrl": "https://github.com/owner/repository",
  "options": {
    "forceOverwrite": false
  }
}
```

**Request Body Schema:**
```typescript
{
  repositoryUrl: string;  // GitHub repo URL (full or owner/repo format)
  options?: {
    forceOverwrite?: boolean;  // If true, updates existing resources even if unchanged (default: false)
    dryRun?: boolean;  // If true, analyzes but doesn't import (not implemented)
  }
}
```

**Response (Success - 200 OK):**
```json
{
  "message": "Import started",
  "queueId": "uuid-string",
  "status": "processing"
}
```

**Response (Error - 400 Bad Request):**
```json
{
  "message": "Invalid import configuration",
  "errors": [
    {
      "field": "repositoryUrl",
      "message": "Must be a valid GitHub repository URL"
    }
  ]
}
```

**Response (Error - 401 Unauthorized):**
```json
{
  "message": "Unauthorized"
}
```

**Response (Error - 500 Internal Server Error):**
```json
{
  "message": "Failed to start GitHub import"
}
```

**Background Processing:**
- Import runs asynchronously (doesn't block response)
- Check status via: GET /api/github/sync-status
- Check history via: GET /api/github/sync-history

**Example:**
```bash
curl -X POST http://localhost:3000/api/github/import \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "repositoryUrl": "https://github.com/krzemienski/awesome-video",
    "options": {
      "forceOverwrite": false
    }
  }'
```

---

### POST /api/github/import-stream

Import resources with real-time progress updates via Server-Sent Events.

**Authentication:** Required (Admin only)

**Request:**
```http
POST /api/github/import-stream
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "repositoryUrl": "https://github.com/owner/repository",
  "options": {
    "forceOverwrite": false
  }
}
```

**Response (SSE Stream):**
```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: {"status":"fetching","progress":10,"message":"Fetching README from GitHub..."}

data: {"status":"parsing","progress":30,"message":"Parsing awesome list structure..."}

data: {"status":"analyzing","progress":40,"message":"Analyzing format deviations...","deviations":[],"warnings":["Uses 2-level hierarchy"]}

data: {"status":"creating_hierarchy","progress":50,"message":"Creating category hierarchy..."}

data: {"status":"importing_resources","progress":75,"current":500,"total":751,"imported":42,"updated":15,"skipped":443,"message":"Importing resources: 500/751..."}

data: {"status":"complete","progress":100,"message":"Import complete!","imported":42,"updated":15,"skipped":694,"total":751}
```

**Event Data Schema:**
```typescript
interface ProgressEvent {
  status: 'fetching' | 'parsing' | 'analyzing' | 'creating_hierarchy' | 'importing_resources' | 'complete' | 'error';
  progress: number;  // 0-100
  message: string;
  
  // During analysis:
  deviations?: string[];
  warnings?: string[];
  
  // During resource import:
  current?: number;
  total?: number;
  imported?: number;
  updated?: number;
  skipped?: number;
}
```

**Client-Side Consumption:**
```typescript
const response = await fetch('/api/github/import-stream', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    repositoryUrl: 'https://github.com/owner/repo',
    options: {}
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      console.log(`Progress: ${data.progress}% - ${data.message}`);
      
      if (data.status === 'complete') {
        console.log(`Import complete! Imported: ${data.imported}, Updated: ${data.updated}, Skipped: ${data.skipped}`);
      }
    }
  }
}
```

**Error Handling:**
```javascript
// Server sends error event:
data: {"status":"error","progress":0,"message":"Failed to fetch README from GitHub"}

// Client should:
if (data.status === 'error') {
  console.error('Import failed:', data.message);
  // Show error to user
  // Close SSE connection
}
```

---

## Export Endpoints

### POST /api/github/export

Export approved resources to GitHub repository.

**Authentication:** Required (Admin only)

**Request:**
```http
POST /api/github/export
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "repositoryUrl": "https://github.com/owner/repository",
  "options": {
    "createPullRequest": false,
    "branchName": "awesome-list-update",
    "githubToken": "ghp_xxx..."
  }
}
```

**Request Body Schema:**
```typescript
{
  repositoryUrl: string;
  options?: {
    dryRun?: boolean;  // Preview without pushing
    forceOverwrite?: boolean;  // Overwrite without checking
    createPullRequest?: boolean;  // Create PR instead of direct push
    branchName?: string;  // Custom branch name
    githubToken?: string;  // Override default token
  }
}
```

**Response (Success - 200 OK):**
```json
{
  "message": "Export started",
  "queueId": "uuid-string",
  "status": "processing"
}
```

**Background Processing:**
- Generates README.md and CONTRIBUTING.md
- Commits to repository
- Updates sync history

**Note:** Requires GITHUB_TOKEN with write access to repository

---

### POST /api/admin/export

Download awesome list markdown file (no GitHub push).

**Authentication:** Required (Admin only)

**Request:**
```http
POST /api/admin/export
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "title": "Awesome Video",
  "description": "A curated list...",
  "includeContributing": true,
  "includeLicense": true
}
```

**Response (Success - 200 OK):**
```http
HTTP/1.1 200 OK
Content-Type: text/markdown
Content-Disposition: attachment; filename="awesome-list.md"

# Awesome Video
...
[markdown content]
...
```

**Response Headers:**
```
Content-Type: text/markdown; charset=utf-8
Content-Disposition: attachment; filename="awesome-list-{timestamp}.md"
Content-Length: 744097
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/admin/export \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Awesome Video","includeContributing":true}' \
  -o export.md
```

---

## Status Endpoints

### GET /api/github/sync-history

Get import/export history.

**Authentication:** Required (Admin only)

**Request:**
```http
GET /api/github/sync-history
Authorization: Bearer {JWT_TOKEN}
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "repositoryUrl": "https://github.com/krzemienski/awesome-video",
    "direction": "import",
    "commitSha": null,
    "commitMessage": null,
    "resourcesAdded": 751,
    "resourcesUpdated": 0,
    "resourcesRemoved": 0,
    "totalResources": 751,
    "createdAt": "2025-12-03T22:50:55.875Z"
  },
  ...
]
```

**Response Schema:**
```typescript
interface SyncHistory {
  id: number;
  repositoryUrl: string;
  direction: 'import' | 'export';
  commitSha?: string;  // For exports
  commitMessage?: string;  // For exports
  commitUrl?: string;  // For exports
  resourcesAdded: number;
  resourcesUpdated: number;
  resourcesRemoved: number;
  totalResources: number;
  snapshot?: any;  // Full snapshot of resources at time of sync
  metadata?: any;  // Additional sync metadata
  createdAt: string;
}
```

**Filtering:**
```bash
# Filter by repository:
curl "http://localhost:3000/api/github/sync-history?repository=awesome-video" \
  -H "Authorization: Bearer $TOKEN"

# Filter by direction:
curl "http://localhost:3000/api/github/sync-history?direction=import" \
  -H "Authorization: Bearer $TOKEN"
```

---

### GET /api/github/sync-status

Get current sync queue status.

**Authentication:** Required (Admin only)

**Request:**
```http
GET /api/github/sync-status
Authorization: Bearer {JWT_TOKEN}
```

**Response (200 OK):**
```json
{
  "total": 51,
  "items": [
    {
      "id": "uuid",
      "repositoryUrl": "https://github.com/...",
      "action": "import",
      "status": "completed",
      "resourceIds": [...],
      "metadata": {...},
      "errorMessage": null,
      "createdAt": "2025-12-03T22:50:00.000Z",
      "processedAt": "2025-12-03T22:50:25.000Z"
    },
    ...
  ]
}
```

**Response Schema:**
```typescript
interface SyncQueueResponse {
  total: number;
  items: SyncQueueItem[];
}

interface SyncQueueItem {
  id: string;
  repositoryUrl: string;
  action: 'import' | 'export';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  resourceIds: string[];
  metadata: any;
  errorMessage?: string;
  createdAt: string;
  processedAt?: string;
}
```

**Status Values:**
- `pending`: Queued, not started
- `processing`: Currently running
- `completed`: Finished successfully
- `failed`: Error occurred (check errorMessage)

**Known Issue:** Items may show "processing" perpetually (cosmetic bug, doesn't affect imports)

---

## Resource Endpoints (Enhanced)

### GET /api/resources

List resources with filtering (enhanced with subSubcategory support in v1.1.0).

**Authentication:** None required (public endpoint)
**Rate Limit:** 100 requests per 15 minutes per IP

**Request:**
```http
GET /api/resources?page=1&limit=20&status=approved&category=Applications&subcategory=Games&subSubcategory=iOS/tvOS&search=puzzle
```

**Query Parameters:**
```typescript
{
  page?: number;  // Page number (default: 1)
  limit?: number;  // Resources per page (default: 20, max: 10000)
  status?: 'approved' | 'pending' | 'rejected';  // Filter by status (default: all)
  category?: string;  // Exact match on category name
  subcategory?: string;  // Exact match on subcategory name
  subSubcategory?: string;  // Exact match on sub-subcategory name (NEW in v1.1.0)
  search?: string;  // LIKE match on title and description
}
```

**Response (200 OK):**
```json
{
  "resources": [
    {
      "id": "uuid",
      "title": "Resource Title",
      "url": "https://github.com/...",
      "description": "Resource description...",
      "category": "Applications",
      "subcategory": "Games",
      "subSubcategory": "iOS/tvOS",
      "status": "approved",
      "submittedBy": null,
      "approvedBy": null,
      "approvedAt": null,
      "githubSynced": true,
      "lastSyncedAt": null,
      "metadata": {...},
      "createdAt": "2025-12-03T22:56:46.866Z",
      "updatedAt": "2025-12-03T22:56:46.866Z"
    },
    ...
  ],
  "total": 30
}
```

**Caching:**
- TTL: 300 seconds (5 minutes)
- Cache key includes: page, limit, status, category, subcategory, subSubcategory, search
- Header: `X-Cache: HIT` or `X-Cache: MISS`

**Examples:**

```bash
# Get all approved resources (first page):
curl "http://localhost:3000/api/resources?status=approved&limit=20"

# Get resources in specific category:
curl "http://localhost:3000/api/resources?category=Video+Players+%26+Playback+Libraries&status=approved"

# Get resources in subcategory:
curl "http://localhost:3000/api/resources?subcategory=Mobile+Players&status=approved"

# Get resources in sub-subcategory (v1.1.0 bug fix):
curl "http://localhost:3000/api/resources?subSubcategory=iOS%2FtvOS&status=approved"

# Search across all resources:
curl "http://localhost:3000/api/resources?search=player&status=approved"

# Combined filters:
curl "http://localhost:3000/api/resources?category=Applications&search=game&status=approved&limit=10"
```

**Performance:**
- Typical response time: <200ms (with cache)
- Response size: ~400KB for 10000 limit, ~8KB for 20 limit
- With indexes: <100ms for filtered queries

**Bug Fix (v1.1.0):**
- Added: `subSubcategory` parameter support
- Before: Parameter ignored, returned all resources (bug!)
- After: Filters correctly by sub-subcategory value
- Commit: 23bdbab

---

## Hierarchy Endpoints

### GET /api/categories

Get all categories with full hierarchy (subcategories and sub-subcategories nested).

**Authentication:** None required

**Request:**
```http
GET /api/categories
```

**Response (200 OK):**
```json
[
  {
    "id": "uuid",
    "name": "Applications",
    "slug": "applications",
    "count": 794,
    "subcategories": [
      {
        "id": "uuid",
        "name": "Games",
        "slug": "games",
        "count": 49,
        "subSubcategories": [
          {
            "id": "uuid",
            "name": "Puzzle",
            "slug": "puzzle",
            "count": 12
          }
        ]
      }
    ]
  },
  ...
]
```

**Response Size:** ~38KB (full hierarchy tree)
**Cache TTL:** 3600 seconds (1 hour)

**Example:**
```bash
curl http://localhost:3000/api/categories | jq
```

---

### GET /api/subcategories

Get all subcategories (flat list, not nested).

**Authentication:** None required

**Request:**
```http
GET /api/subcategories
```

**Response (200 OK):**
```json
[
  {
    "id": "uuid",
    "name": "Games",
    "slug": "games",
    "categoryId": "parent-category-uuid"
  },
  ...
]
```

---

### GET /api/sub-subcategories

Get all sub-subcategories (flat list).

**Authentication:** None required

**Request:**
```http
GET /api/sub-subcategories
```

**Response (200 OK):**
```json
[
  {
    "id": "uuid",
    "name": "iOS/tvOS",
    "slug": "iostvos",
    "subcategoryId": "parent-subcategory-uuid"
  },
  ...
]
```

---

## Rate Limiting

**Public Endpoints:**
- Limit: 100 requests per 15 minutes per IP
- Headers returned:
  ```
  RateLimit-Limit: 100
  RateLimit-Remaining: 95
  RateLimit-Reset: 900  // seconds until reset
  ```

**Admin Endpoints:**
- No rate limit (authenticated)
- But: GitHub API has limits (5000 req/hour with token)

**Exceeded:**
```json
HTTP/1.1 429 Too Many Requests
{
  "message": "Too many requests, please try again later."
}
```

---

## Error Codes

| Code | Meaning | Common Cause | Solution |
|------|---------|--------------|----------|
| 400 | Bad Request | Invalid URL format, missing required fields | Check request body schema |
| 401 | Unauthorized | Not logged in or invalid token | Login and get valid JWT |
| 403 | Forbidden | Not admin role | Check user role in database |
| 404 | Not Found | Repository or README not found | Verify repo exists and is public |
| 429 | Too Many Requests | Rate limit exceeded | Wait for reset period |
| 500 | Internal Server Error | Server-side error (parsing, database, etc.) | Check logs, report bug |
| 504 | Gateway Timeout | Import took >5 minutes | Increase timeout or import smaller repo |

---

## Webhook Events (Future)

**Not implemented in v1.1.0**

**Planned for v2.0.0:**

```http
POST /webhooks/github
X-GitHub-Event: push
X-Hub-Signature: sha256=...
Content-Type: application/json

{
  "repository": {
    "full_name": "owner/repo",
    "html_url": "https://github.com/owner/repo"
  },
  "commits": [
    {
      "modified": ["README.md"]
    }
  ]
}
```

**Behavior:**
- Auto-trigger import when README.md changes
- Validate signature
- Add to import queue
- Process in background

---

## Pagination

**Request:**
```http
GET /api/resources?page=2&limit=50&status=approved
```

**Response includes pagination metadata:**
```json
{
  "resources": [...],
  "total": 4273,
  "page": 2,
  "limit": 50,
  "totalPages": 86
}
```

**Calculation:**
- `totalPages = Math.ceil(total / limit)`
- `offset = (page - 1) * limit`

**Limits:**
- Min page: 1
- Max page: 10000 (safety limit)
- Min limit: 1
- Max limit: 10000

---

## Headers

### Request Headers

**Required for authenticated endpoints:**
```http
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

**Optional:**
```http
X-Request-ID: custom-request-id  // For tracking
```

### Response Headers

**Standard:**
```http
Content-Type: application/json; charset=utf-8
X-Request-ID: uuid  // Request tracking
X-Cache: HIT | MISS  // Cache status
```

**Rate Limiting:**
```http
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 900
```

**Security:**
```http
Strict-Transport-Security: max-age=63072000
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import { z } from 'zod';

// Import a repository:
async function importRepository(repoUrl: string, token: string) {
  const response = await fetch('http://localhost:3000/api/github/import', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      repositoryUrl: repoUrl,
      options: { forceOverwrite: false }
    })
  });
  
  if (!response.ok) {
    throw new Error(`Import failed: ${response.statusText}`);
  }
  
  const data = await response.json();
  console.log(`Import started: ${data.queueId}`);
  return data;
}

// Import with progress tracking:
async function importWithProgress(repoUrl: string, token: string, onProgress: (event: any) => void) {
  const response = await fetch('http://localhost:3000/api/github/import-stream', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      repositoryUrl: repoUrl,
      options: {}
    })
  });
  
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        onProgress(data);
        
        if (data.status === 'complete') {
          console.log(`Complete! Imported: ${data.imported}, Updated: ${data.updated}, Skipped: ${data.skipped}`);
          return data;
        } else if (data.status === 'error') {
          throw new Error(data.message);
        }
      }
    }
  }
}

// Usage:
await importWithProgress(
  'https://github.com/sindresorhus/awesome',
  token,
  (event) => {
    console.log(`${event.progress}%: ${event.message}`);
    if (event.deviations) {
      console.log('Deviations:', event.deviations);
    }
  }
);
```

### Python

```python
import requests
import json

def import_repository(repo_url, token):
    """Import an awesome list repository."""
    response = requests.post(
        'http://localhost:3000/api/github/import',
        headers={
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        },
        json={
            'repositoryUrl': repo_url,
            'options': {'forceOverwrite': False}
        }
    )
    response.raise_for_status()
    return response.json()

def import_with_progress(repo_url, token):
    """Import with SSE progress tracking."""
    response = requests.post(
        'http://localhost:3000/api/github/import-stream',
        headers={
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        },
        json={'repositoryUrl': repo_url, 'options': {}},
        stream=True
    )
    
    for line in response.iter_lines():
        if line:
            decoded = line.decode('utf-8')
            if decoded.startsWith('data: '):
                data = json.loads(decoded[6:])
                print(f"{data['progress']}%: {data['message']}")
                
                if data['status'] == 'complete':
                    print(f"Complete! Imported: {data['imported']}")
                    return data
                elif data['status'] == 'error':
                    raise Exception(data['message'])

# Usage:
import_with_progress(
    'https://github.com/sindresorhus/awesome',
    'your-jwt-token'
)
```

### cURL

```bash
# Simple import:
curl -X POST http://localhost:3000/api/github/import \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"repositoryUrl":"https://github.com/owner/repo"}'

# Streaming import with progress:
curl -X POST http://localhost:3000/api/github/import-stream \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"repositoryUrl":"https://github.com/owner/repo"}' \
  -N  # Disable buffering for SSE

# Export to file:
curl -X POST http://localhost:3000/api/admin/export \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"My Awesome List"}' \
  -o awesome-list.md
```

---

## Change Log

### v1.1.0 (2025-12-05)

**New Endpoints:**
- POST /api/github/import-stream (SSE progress tracking)

**Enhanced Endpoints:**
- GET /api/resources (added subSubcategory parameter support)

**Bug Fixes:**
- Sub-subcategory filtering now works (was completely broken)

**New Features:**
- Real-time progress tracking
- Format deviation detection
- AI-assisted parsing (opt-in)

### v1.0.0 (2025-12-02)

**Initial Endpoints:**
- POST /api/github/import
- POST /api/github/export
- POST /api/admin/export
- GET /api/github/sync-history
- GET /api/github/sync-status
- GET /api/resources (without subSubcategory)

---

## Support

**API Issues:** Report in GitHub repository issues
**Rate Limiting:** Contact admin to increase limits
**Feature Requests:** GitHub discussions or issues

**Documentation:**
- User Guide: docs/GITHUB_IMPORT_GUIDE.md
- Technical Architecture: docs/TECHNICAL_ARCHITECTURE_IMPORT.md
- FAQ: docs/FAQ_IMPORT_FEATURE.md

---

**API Reference Version**: 1.0
**Last Updated**: 2025-12-05
**Covers**: v1.1.0 import feature APIs

# API Reference

**Awesome Video Resources Platform**

Complete API documentation for all 70 endpoints with authentication requirements, request/response schemas, and usage examples.

**Base URL**: `http://localhost:3000/api` (development) or your production URL

---

## Table of Contents

1. [Authentication](#authentication)
2. [Rate Limiting](#rate-limiting)
3. [Error Handling](#error-handling)
4. [Endpoints](#endpoints)
   - [Authentication Routes](#authentication-routes)
   - [Resource Routes](#resource-routes)
   - [Category Routes](#category-routes)
   - [User Interaction Routes](#user-interaction-routes)
   - [User Profile & Progress Routes](#user-profile--progress-routes)
   - [Learning Journey Routes](#learning-journey-routes)
   - [Admin Routes](#admin-routes)
   - [Resource Approval Routes](#resource-approval-routes)
   - [Resource Edit Management Routes](#resource-edit-management-routes)
   - [Claude AI Routes](#claude-ai-routes)
   - [GitHub Sync Routes](#github-sync-routes)
   - [Awesome List Export & Validation Routes](#awesome-list-export--validation-routes)
   - [Enrichment API Routes](#enrichment-api-routes)
   - [GitHub Discovery Routes](#github-discovery-routes)
   - [AI Recommendation Routes](#ai-recommendation-routes)
   - [Learning Path Routes](#learning-path-routes)
   - [Cache Management Routes](#cache-management-routes)
   - [SEO Routes](#seo-routes)
   - [Health Check](#health-check)

---

## Authentication

This API uses **Supabase Auth** with JWT tokens. Authentication is handled client-side via the Supabase SDK.

### Headers

For authenticated endpoints, include the JWT token:

```
Authorization: Bearer <supabase-jwt-token>
```

### Auth Levels

| Level | Description |
|-------|-------------|
| **Public** | No authentication required |
| **Authenticated** | Valid JWT token required |
| **Admin** | JWT token with admin role in metadata |

---

## Rate Limiting

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Public API | 100 requests | 15 minutes |
| AI Recommendations | 30 requests | 15 minutes |

Rate limit headers returned:
- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Requests remaining
- `RateLimit-Reset`: Time until limit resets

---

## Error Handling

### Error Response Format

```json
{
  "message": "Error description",
  "errors": [
    {
      "field": "fieldName",
      "message": "Validation error message"
    }
  ]
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation errors) |
| 401 | Unauthorized |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict |
| 429 | Too Many Requests |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

---

## Endpoints

---

### Authentication Routes

#### GET /api/auth/user

Get current authenticated user information.

**Auth**: Public (returns null for unauthenticated)

**Response** (authenticated):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "avatar": "https://...",
    "role": "user"
  },
  "isAuthenticated": true
}
```

**Response** (unauthenticated):
```json
{
  "user": null,
  "isAuthenticated": false
}
```

---

### Resource Routes

#### GET /api/resources

List approved resources with pagination and filtering.

**Auth**: Public (rate limited)

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number (max: 10000) |
| limit | integer | 20 | Results per page (max: 100) |
| category | string | - | Filter by category name |
| subcategory | string | - | Filter by subcategory name |
| search | string | - | Search query |

**Response**:
```json
{
  "resources": [
    {
      "id": "uuid",
      "title": "Resource Title",
      "url": "https://example.com",
      "description": "Description text",
      "category": "Category Name",
      "subcategory": "Subcategory Name",
      "subSubcategory": "Sub-subcategory Name",
      "status": "approved",
      "submittedBy": "uuid",
      "approvedBy": "uuid",
      "approvedAt": "2024-01-01T00:00:00Z",
      "githubSynced": false,
      "lastSyncedAt": null,
      "metadata": {},
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 2647,
  "page": 1,
  "limit": 20,
  "totalPages": 133
}
```

---

#### GET /api/resources/:id

Get a single resource by ID.

**Auth**: Public

**Path Parameters**:
- `id` (uuid): Resource ID

**Response**:
```json
{
  "id": "uuid",
  "title": "Resource Title",
  "url": "https://example.com",
  "description": "Description text",
  "category": "Category Name",
  "subcategory": "Subcategory Name",
  "subSubcategory": null,
  "status": "approved",
  "submittedBy": "uuid",
  "approvedBy": "uuid",
  "approvedAt": "2024-01-01T00:00:00Z",
  "githubSynced": false,
  "lastSyncedAt": null,
  "metadata": {},
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

---

#### POST /api/resources

Submit a new resource for approval.

**Auth**: Authenticated

**Request Body**:
```json
{
  "title": "Resource Title",
  "url": "https://example.com",
  "description": "Optional description",
  "category": "Category Name",
  "subcategory": "Optional subcategory",
  "subSubcategory": "Optional sub-subcategory",
  "metadata": {}
}
```

**Validation**:
- `title`: 3-200 characters
- `url`: Valid URL starting with http:// or https://, max 2048 characters
- `description`: Max 2000 characters
- `category`: 1-100 characters (required)
- `subcategory`: Max 100 characters (optional)
- `subSubcategory`: Max 100 characters (optional)

**Response** (201 Created):
```json
{
  "id": "uuid",
  "title": "Resource Title",
  "url": "https://example.com",
  "description": "Optional description",
  "category": "Category Name",
  "subcategory": "Optional subcategory",
  "subSubcategory": null,
  "status": "pending",
  "submittedBy": "uuid",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

---

#### GET /api/resources/pending

List pending resources awaiting approval.

**Auth**: Admin

**Query Parameters**:
- `page` (integer, default: 1)
- `limit` (integer, default: 20)

**Response**: Same format as GET /api/resources

---

#### PUT /api/resources/:id/approve

Approve a pending resource.

**Auth**: Admin

**Path Parameters**:
- `id` (uuid): Resource ID

**Response**:
```json
{
  "id": "uuid",
  "status": "approved",
  "approvedBy": "uuid",
  "approvedAt": "2024-01-01T00:00:00Z"
  // ... other resource fields
}
```

---

#### PUT /api/resources/:id/reject

Reject a pending resource.

**Auth**: Admin

**Path Parameters**:
- `id` (uuid): Resource ID

**Response**: Same as approve endpoint with status "rejected"

---

#### POST /api/resources/:id/edits

Submit an edit suggestion for a resource.

**Auth**: Authenticated

**Path Parameters**:
- `id` (uuid): Resource ID

**Request Body**:
```json
{
  "proposedChanges": {
    "title": {
      "old": "Old Title",
      "new": "New Title"
    }
  },
  "proposedData": {
    "title": "New Title",
    "description": "Updated description"
  },
  "triggerClaudeAnalysis": false,
  "claudeMetadata": null
}
```

**Validation**:
- `proposedData.title`: 3-200 characters
- `proposedData.description`: Max 2000 characters
- `proposedData.url`: Valid URL format
- `proposedData.tags`: Max 20 tags, each max 50 characters

**Response** (201 Created):
```json
{
  "id": "uuid",
  "resourceId": "uuid",
  "submittedBy": "uuid",
  "status": "pending",
  "proposedChanges": {...},
  "proposedData": {...},
  "claudeMetadata": null,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

### Category Routes

#### GET /api/categories

Get hierarchical categories with nested subcategories.

**Auth**: Public (rate limited, cached)

**Response**:
```json
[
  {
    "id": "uuid",
    "name": "Category Name",
    "slug": "category-name",
    "subcategories": [
      {
        "id": "uuid",
        "name": "Subcategory Name",
        "slug": "subcategory-name",
        "categoryId": "uuid",
        "subSubcategories": [
          {
            "id": "uuid",
            "name": "Sub-subcategory Name",
            "slug": "sub-subcategory-name",
            "subcategoryId": "uuid"
          }
        ]
      }
    ]
  }
]
```

---

#### GET /api/subcategories

List all subcategories.

**Auth**: Public (cached)

**Query Parameters**:
- `categoryId` (uuid, optional): Filter by parent category

**Response**:
```json
[
  {
    "id": "uuid",
    "name": "Subcategory Name",
    "slug": "subcategory-name",
    "categoryId": "uuid"
  }
]
```

---

#### GET /api/sub-subcategories

List all sub-subcategories.

**Auth**: Public (cached)

**Query Parameters**:
- `subcategoryId` (uuid, optional): Filter by parent subcategory

**Response**:
```json
[
  {
    "id": "uuid",
    "name": "Sub-subcategory Name",
    "slug": "sub-subcategory-name",
    "subcategoryId": "uuid"
  }
]
```

---

### User Interaction Routes

#### POST /api/favorites/:resourceId

Add a resource to favorites.

**Auth**: Authenticated

**Path Parameters**:
- `resourceId` (uuid): Resource ID

**Response**:
```json
{
  "message": "Favorite added successfully"
}
```

---

#### DELETE /api/favorites/:resourceId

Remove a resource from favorites.

**Auth**: Authenticated

**Path Parameters**:
- `resourceId` (uuid): Resource ID

**Response**:
```json
{
  "message": "Favorite removed successfully"
}
```

---

#### GET /api/favorites

Get user's favorite resources.

**Auth**: Authenticated

**Response**:
```json
[
  {
    "id": "uuid",
    "title": "Resource Title",
    "url": "https://example.com",
    "description": "Description",
    "category": "Category Name",
    "favoritedAt": "2024-01-01T00:00:00Z"
    // ... other resource fields
  }
]
```

---

#### POST /api/bookmarks/:resourceId

Add a bookmark with optional notes.

**Auth**: Authenticated

**Path Parameters**:
- `resourceId` (uuid): Resource ID

**Request Body**:
```json
{
  "notes": "Optional notes about this resource"
}
```

**Validation**:
- `notes`: Max 1000 characters (optional)

**Response**:
```json
{
  "message": "Bookmark added successfully"
}
```

---

#### DELETE /api/bookmarks/:resourceId

Remove a bookmark.

**Auth**: Authenticated

**Path Parameters**:
- `resourceId` (uuid): Resource ID

**Response**:
```json
{
  "message": "Bookmark removed successfully"
}
```

---

#### GET /api/bookmarks

Get user's bookmarked resources.

**Auth**: Authenticated

**Response**:
```json
[
  {
    "id": "uuid",
    "title": "Resource Title",
    "url": "https://example.com",
    "description": "Description",
    "category": "Category Name",
    "notes": "User's notes",
    "bookmarkedAt": "2024-01-01T00:00:00Z"
    // ... other resource fields
  }
]
```

---

### User Profile & Progress Routes

#### GET /api/user/progress

Get user's learning progress summary.

**Auth**: Authenticated

**Response**:
```json
{
  "totalResources": 2647,
  "completedResources": 15,
  "currentPath": "Video Streaming Fundamentals",
  "streakDays": 5,
  "totalTimeSpent": "0h 0m",
  "skillLevel": "intermediate"
}
```

---

#### GET /api/user/submissions

Get user's submitted resources and edit suggestions.

**Auth**: Authenticated

**Response**:
```json
{
  "resources": [
    {
      "id": "uuid",
      "title": "Submitted Resource",
      "status": "pending"
      // ... resource fields
    }
  ],
  "edits": [
    {
      "id": "uuid",
      "resourceId": "uuid",
      "status": "pending"
      // ... edit fields
    }
  ],
  "totalResources": 3,
  "totalEdits": 2
}
```

---

#### GET /api/user/journeys

Get user's learning journeys with progress.

**Auth**: Authenticated

**Response**:
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "journeyId": "uuid",
    "currentStepId": "uuid",
    "completedSteps": ["step-uuid-1", "step-uuid-2"],
    "startedAt": "2024-01-01T00:00:00Z",
    "lastAccessedAt": "2024-01-15T00:00:00Z",
    "completedAt": null,
    "journey": {
      "id": "uuid",
      "title": "Journey Title",
      "description": "Journey description",
      "difficulty": "beginner",
      "estimatedDuration": "10 hours",
      "category": "Video Streaming"
    }
  }
]
```

---

### Learning Journey Routes

#### GET /api/journeys

List all learning journeys.

**Auth**: Public

**Query Parameters**:
- `category` (string, optional): Filter by category

**Response**:
```json
[
  {
    "id": "uuid",
    "title": "Journey Title",
    "description": "Journey description",
    "difficulty": "beginner",
    "estimatedDuration": "10 hours",
    "icon": "play",
    "orderIndex": 1,
    "category": "Video Streaming",
    "status": "published",
    "stepCount": 12,
    "completedStepCount": 0,
    "isEnrolled": false,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
]
```

---

#### GET /api/journeys/:id

Get journey details with steps.

**Auth**: Public

**Path Parameters**:
- `id` (uuid): Journey ID

**Response**:
```json
{
  "id": "uuid",
  "title": "Journey Title",
  "description": "Journey description",
  "difficulty": "beginner",
  "estimatedDuration": "10 hours",
  "icon": "play",
  "category": "Video Streaming",
  "status": "published",
  "stepCount": 12,
  "steps": [
    {
      "id": "uuid",
      "journeyId": "uuid",
      "resourceId": "uuid",
      "stepNumber": 1,
      "title": "Introduction to Video Streaming",
      "description": "Step description",
      "isOptional": false,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "progress": {
    "completedSteps": ["step-uuid-1"],
    "currentStepId": "step-uuid-2",
    "completedAt": null
  }
}
```

---

#### POST /api/journeys/:id/start

Start a learning journey (enroll).

**Auth**: Authenticated

**Path Parameters**:
- `id` (uuid): Journey ID

**Response**:
```json
{
  "id": "uuid",
  "userId": "uuid",
  "journeyId": "uuid",
  "currentStepId": null,
  "completedSteps": [],
  "startedAt": "2024-01-01T00:00:00Z",
  "lastAccessedAt": "2024-01-01T00:00:00Z",
  "completedAt": null
}
```

---

#### PUT /api/journeys/:id/progress

Update journey progress (mark step complete).

**Auth**: Authenticated

**Path Parameters**:
- `id` (uuid): Journey ID

**Request Body**:
```json
{
  "stepId": "step-uuid"
}
```

**Validation**:
- `stepId`: Valid UUID (required)

**Response**:
```json
{
  "id": "uuid",
  "userId": "uuid",
  "journeyId": "uuid",
  "currentStepId": "next-step-uuid",
  "completedSteps": ["step-uuid-1", "step-uuid-2"],
  "lastAccessedAt": "2024-01-01T00:00:00Z",
  "completedAt": null
}
```

---

#### GET /api/journeys/:id/progress

Get user's progress on a specific journey.

**Auth**: Authenticated

**Path Parameters**:
- `id` (uuid): Journey ID

**Response**: Same as PUT /api/journeys/:id/progress

---

### Admin Routes

#### GET /api/admin/resources

List all resources with advanced filtering (includes pending, rejected, archived).

**Auth**: Admin

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number |
| limit | integer | 50 | Results per page (max: 100) |
| status | string | all | Filter: pending, approved, rejected, archived, all |
| category | string | - | Filter by category |
| subcategory | string | - | Filter by subcategory |
| search | string | - | Search query |
| submittedBy | string | - | Filter by submitter ID |
| dateFrom | ISO date | - | Start date filter |
| dateTo | ISO date | - | End date filter |

**Response**: Same format as GET /api/resources with all statuses

---

#### PUT /api/admin/resources/:id

Update any resource field.

**Auth**: Admin

**Path Parameters**:
- `id` (uuid): Resource ID

**Request Body**:
```json
{
  "title": "Updated Title",
  "url": "https://updated-url.com",
  "description": "Updated description",
  "category": "New Category",
  "subcategory": "New Subcategory",
  "status": "approved",
  "metadata": {}
}
```

**Validation**:
- `title`: 3-200 characters
- `url`: Valid URL format
- `description`: Max 2000 characters
- `category`: 1-100 characters
- `status`: pending | approved | rejected | archived

**Response**: Updated resource object

---

#### POST /api/admin/resources/bulk

Bulk operations on multiple resources.

**Auth**: Admin

**Request Body**:
```json
{
  "action": "approve",
  "resourceIds": ["uuid-1", "uuid-2", "uuid-3"],
  "data": {
    "tags": ["tag1", "tag2"]
  }
}
```

**Validation**:
- `action`: approve | reject | archive | delete | tag
- `resourceIds`: 1-100 UUIDs
- `data.tags`: Max 20 tags (for tag action)

**Response**:
```json
{
  "success": true,
  "processed": 3,
  "failed": 0
}
```

---

#### DELETE /api/admin/resources/:id

Archive a resource.

**Auth**: Admin

**Path Parameters**:
- `id` (uuid): Resource ID

**Response**:
```json
{
  "success": true,
  "resource": {...}
}
```

---

#### GET /api/admin/stats

Get dashboard statistics.

**Auth**: Admin

**Response**:
```json
{
  "users": 150,
  "resources": 2647,
  "journeys": 12,
  "pendingApprovals": 5
}
```

---

#### GET /api/admin/users

List all users.

**Auth**: Admin

**Query Parameters**:
- `page` (integer, default: 1)
- `limit` (integer, default: 20)

**Response**:
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "role": "user",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20
}
```

---

#### PUT /api/admin/users/:id/role

Change user role.

**Auth**: Admin

**Path Parameters**:
- `id` (uuid): User ID

**Request Body**:
```json
{
  "role": "admin"
}
```

**Validation**:
- `role`: user | admin | moderator

**Response**:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "admin"
}
```

---

### Resource Approval Routes

#### GET /api/admin/pending-resources

Get all pending resources for approval.

**Auth**: Admin

**Query Parameters**:
- `page` (integer, default: 1)
- `limit` (integer, default: 50)

**Response**: Same format as GET /api/resources with status "pending"

---

#### POST /api/admin/resources/:id/approve

Approve a pending resource with audit logging.

**Auth**: Admin

**Path Parameters**:
- `id` (uuid): Resource ID

**Response**: Updated resource with status "approved"

---

#### POST /api/admin/resources/:id/reject

Reject a pending resource with reason.

**Auth**: Admin

**Path Parameters**:
- `id` (uuid): Resource ID

**Request Body**:
```json
{
  "reason": "Does not meet quality standards. Please provide more detailed description."
}
```

**Validation**:
- `reason`: 10-1000 characters (required)

**Response**: Updated resource with status "rejected"

---

### Resource Edit Management Routes

#### GET /api/admin/resource-edits

Get all pending edit suggestions.

**Auth**: Admin

**Response**:
```json
[
  {
    "id": "uuid",
    "resourceId": "uuid",
    "submittedBy": "uuid",
    "status": "pending",
    "proposedChanges": {
      "title": {
        "old": "Old Title",
        "new": "New Title"
      }
    },
    "proposedData": {...},
    "claudeMetadata": null,
    "createdAt": "2024-01-01T00:00:00Z",
    "resource": {
      "id": "uuid",
      "title": "Current Title"
      // ... resource fields
    }
  }
]
```

---

#### POST /api/admin/resource-edits/:id/approve

Approve and merge an edit suggestion.

**Auth**: Admin

**Path Parameters**:
- `id` (uuid): Edit ID

**Response**:
```json
{
  "message": "Edit approved and merged successfully"
}
```

**Error Response** (409 Conflict):
```json
{
  "message": "Conflict detected: resource was modified after edit was submitted",
  "conflict": true
}
```

---

#### POST /api/admin/resource-edits/:id/reject

Reject an edit suggestion.

**Auth**: Admin

**Path Parameters**:
- `id` (uuid): Edit ID

**Request Body**:
```json
{
  "reason": "Changes do not improve the resource quality."
}
```

**Validation**:
- `reason`: 10-1000 characters (required)

**Response**:
```json
{
  "message": "Edit rejected successfully"
}
```

---

### Claude AI Routes

#### POST /api/claude/analyze

Analyze a URL using Claude AI for metadata enrichment.

**Auth**: Authenticated

**Request Body**:
```json
{
  "url": "https://example.com/resource"
}
```

**Validation**:
- `url`: Valid URL starting with http:// or https://

**Response**:
```json
{
  "suggestedTitle": "Analyzed Title",
  "suggestedDescription": "AI-generated description",
  "suggestedTags": ["tag1", "tag2", "tag3"],
  "suggestedCategory": "Category Name",
  "suggestedSubcategory": "Subcategory Name",
  "confidence": 0.85,
  "keyTopics": ["topic1", "topic2"]
}
```

**Error Response** (503 Service Unavailable):
```json
{
  "message": "Claude AI service is not available",
  "available": false
}
```

---

### GitHub Sync Routes

#### POST /api/github/configure

Configure GitHub repository for sync.

**Auth**: Admin

**Request Body**:
```json
{
  "repositoryUrl": "https://github.com/owner/repo",
  "token": "ghp_xxxxxxxxxxxx"
}
```

**Validation**:
- `repositoryUrl`: Valid GitHub repository URL
- `token`: Max 500 characters (optional)

**Response**:
```json
{
  "success": true,
  "message": "Repository configured successfully"
}
```

---

#### POST /api/github/import

Import resources from GitHub awesome list.

**Auth**: Admin

**Request Body**:
```json
{
  "repositoryUrl": "https://github.com/owner/awesome-repo",
  "options": {
    "dryRun": false,
    "clearExisting": false,
    "branch": "main"
  }
}
```

**Response**:
```json
{
  "message": "Import started",
  "queueId": "uuid",
  "status": "processing"
}
```

---

#### POST /api/github/export

Export approved resources to GitHub.

**Auth**: Admin

**Request Body**: Same as import

**Response**:
```json
{
  "message": "Export started",
  "queueId": "uuid",
  "status": "processing"
}
```

---

#### GET /api/github/sync-status

Check sync queue status.

**Auth**: Admin

**Query Parameters**:
- `status` (string, optional): Filter by status

**Response**:
```json
{
  "total": 3,
  "items": [
    {
      "id": "uuid",
      "repositoryUrl": "https://github.com/owner/repo",
      "action": "import",
      "status": "completed",
      "createdAt": "2024-01-01T00:00:00Z",
      "processedAt": "2024-01-01T00:01:00Z"
    }
  ]
}
```

---

#### GET /api/github/sync-status/:id

Get specific sync item status.

**Auth**: Admin

**Path Parameters**:
- `id` (uuid): Sync queue item ID

**Response**: Single sync queue item object

---

#### GET /api/github/sync-history

Get all sync history.

**Auth**: Admin

**Response**:
```json
[
  {
    "id": "uuid",
    "repositoryUrl": "https://github.com/owner/repo",
    "direction": "import",
    "commitSha": "abc123",
    "commitMessage": "Sync from awesome-video",
    "commitUrl": "https://github.com/...",
    "resourcesAdded": 50,
    "resourcesUpdated": 10,
    "resourcesRemoved": 2,
    "totalResources": 2647,
    "performedBy": "uuid",
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

---

#### POST /api/github/process-queue

Manually trigger queue processing.

**Auth**: Admin

**Response**:
```json
{
  "message": "Queue processing started",
  "status": "processing"
}
```

---

### Awesome List Export & Validation Routes

#### POST /api/admin/export

Generate and download awesome list markdown.

**Auth**: Admin

**Request Body**:
```json
{
  "title": "Awesome Video",
  "description": "A curated list of awesome video resources",
  "includeContributing": true,
  "includeLicense": true,
  "websiteUrl": "https://awesome-video.example.com",
  "repoUrl": "https://github.com/owner/awesome-video"
}
```

**Response**: Markdown file download (`Content-Type: text/markdown`)

---

#### POST /api/admin/validate

Run awesome-lint validation on current data.

**Auth**: Admin

**Request Body**: Same as export

**Response**:
```json
{
  "valid": true,
  "errors": [],
  "warnings": ["Warning message"],
  "stats": {
    "categories": 21,
    "resources": 2647,
    "links": 2647
  },
  "report": "Validation Report\n================\n..."
}
```

---

#### POST /api/admin/check-links

Run link checker on all resources.

**Auth**: Admin

**Request Body**:
```json
{
  "timeout": 10000,
  "concurrent": 5,
  "retryCount": 1
}
```

**Validation**:
- `timeout`: 1000-60000 ms
- `concurrent`: 1-20
- `retryCount`: 0-5

**Response**:
```json
{
  "totalLinks": 2647,
  "validLinks": 2600,
  "brokenLinks": 47,
  "redirects": 120,
  "errors": 5,
  "summary": "Link Check Summary...",
  "report": "Detailed Report...",
  "brokenResources": [
    {
      "id": "uuid",
      "title": "Broken Resource",
      "url": "https://broken-link.com",
      "status": 404
    }
  ]
}
```

---

#### GET /api/admin/validation-status

Get last validation results.

**Auth**: Admin

**Response**:
```json
{
  "awesomeLint": {
    "valid": true,
    "timestamp": "2024-01-01T00:00:00Z"
  },
  "linkCheck": {
    "totalLinks": 2647,
    "brokenLinks": 47,
    "timestamp": "2024-01-01T00:00:00Z"
  },
  "lastUpdated": "2024-01-01T00:00:00Z"
}
```

---

#### POST /api/admin/seed-database

Manual database seeding.

**Auth**: Admin

**Request Body**:
```json
{
  "clearExisting": false
}
```

**Response**:
```json
{
  "success": true,
  "message": "Database seeding completed successfully",
  "counts": {
    "categoriesInserted": 21,
    "subcategoriesInserted": 102,
    "subSubcategoriesInserted": 90,
    "resourcesInserted": 2647
  },
  "errors": [],
  "totalErrors": 0
}
```

---

#### POST /api/admin/import-github

Import awesome list from GitHub URL.

**Auth**: Admin

**Request Body**:
```json
{
  "repositoryUrl": "https://github.com/owner/awesome-repo",
  "options": {
    "dryRun": false
  }
}
```

**Response**:
```json
{
  "success": true,
  "imported": 500,
  "updated": 100,
  "skipped": 50,
  "errors": [],
  "message": "Successfully imported 500 resources from https://github.com/..."
}
```

---

### Enrichment API Routes

#### POST /api/enrichment/start

Start batch AI enrichment job.

**Auth**: Admin

**Request Body**:
```json
{
  "filter": "unenriched",
  "batchSize": 10
}
```

**Validation**:
- `filter`: all | unenriched
- `batchSize`: 1-100

**Response**:
```json
{
  "success": true,
  "jobId": "uuid",
  "message": "Batch enrichment job started successfully"
}
```

---

#### GET /api/enrichment/jobs

List all enrichment jobs.

**Auth**: Admin

**Query Parameters**:
- `limit` (integer, default: 50)

**Response**:
```json
{
  "success": true,
  "jobs": [
    {
      "id": "uuid",
      "status": "completed",
      "filter": "unenriched",
      "batchSize": 10,
      "totalResources": 100,
      "processedResources": 100,
      "successfulResources": 95,
      "failedResources": 5,
      "skippedResources": 0,
      "startedAt": "2024-01-01T00:00:00Z",
      "completedAt": "2024-01-01T00:10:00Z"
    }
  ]
}
```

---

#### GET /api/enrichment/jobs/:id

Get specific job status with progress.

**Auth**: Admin

**Path Parameters**:
- `id` (uuid): Job ID

**Response**:
```json
{
  "success": true,
  "job": {
    "id": "uuid",
    "status": "processing",
    "totalResources": 100,
    "processedResources": 45,
    "successfulResources": 43,
    "failedResources": 2,
    "processedResourceIds": ["uuid-1", "uuid-2"],
    "failedResourceIds": ["uuid-3"]
  }
}
```

---

#### DELETE /api/enrichment/jobs/:id

Cancel an enrichment job.

**Auth**: Admin

**Path Parameters**:
- `id` (uuid): Job ID

**Response**:
```json
{
  "success": true,
  "message": "Enrichment job uuid cancelled successfully"
}
```

---

#### POST /api/enrichment/cleanup

Delete old enrichment jobs.

**Auth**: Admin

**Request Body**:
```json
{
  "daysOld": 30
}
```

**Validation**:
- `daysOld`: 1-365

**Response**:
```json
{
  "success": true,
  "deletedCount": 15,
  "message": "Deleted 15 enrichment jobs older than 30 days"
}
```

---

### GitHub Discovery Routes

#### GET /api/github/awesome-lists

Discover awesome lists on GitHub.

**Auth**: Public

**Query Parameters**:
- `page` (integer, default: 1)
- `per_page` (integer, default: 30)

**Response**:
```json
{
  "items": [
    {
      "name": "awesome-video",
      "full_name": "owner/awesome-video",
      "description": "A curated list of video resources",
      "html_url": "https://github.com/owner/awesome-video",
      "stargazers_count": 5000,
      "forks_count": 500
    }
  ],
  "total_count": 1000
}
```

---

#### GET /api/github/search

Search awesome lists on GitHub.

**Auth**: Public

**Query Parameters**:
- `q` (string, required): Search query
- `page` (integer, default: 1)

**Response**: Same format as GET /api/github/awesome-lists

---

### AI Recommendation Routes

#### GET /api/recommendations

Get personalized recommendations (anonymous/basic).

**Auth**: Public (rate limited)

**Query Parameters**:
- `limit` (integer, default: 10)
- `categories` (string): Comma-separated categories
- `skillLevel` (string): beginner | intermediate | advanced
- `goals` (string): Comma-separated learning goals
- `types` (string): Comma-separated resource types
- `timeCommitment` (string): daily | weekly | flexible

**Response**:
```json
{
  "recommendations": [
    {
      "resource": {
        "id": "uuid",
        "title": "Recommended Resource",
        "url": "https://example.com"
      },
      "score": 0.95,
      "reasons": [
        "Matches your skill level",
        "Aligns with learning goals"
      ]
    }
  ],
  "generated": "2024-01-01T00:00:00Z"
}
```

---

#### POST /api/recommendations

Get personalized recommendations with full user profile.

**Auth**: Public (rate limited)

**Query Parameters**:
- `limit` (integer, default: 10)
- `refresh` (boolean, default: false): Force refresh cached recommendations

**Request Body**:
```json
{
  "userId": "user-id",
  "preferredCategories": ["Video Streaming", "Encoding"],
  "skillLevel": "intermediate",
  "learningGoals": ["Master HLS streaming", "Learn video compression"],
  "preferredResourceTypes": ["tutorial", "documentation"],
  "timeCommitment": "weekly",
  "viewHistory": ["resource-uuid-1", "resource-uuid-2"],
  "bookmarks": ["resource-uuid-3"],
  "completedResources": ["resource-uuid-4"],
  "ratings": {
    "resource-uuid-5": 5
  }
}
```

**Validation**:
- `userId`: Max 100 characters
- `preferredCategories`: Max 20 items, each max 100 characters
- `skillLevel`: beginner | intermediate | advanced
- `learningGoals`: Max 10 items, each max 200 characters
- `preferredResourceTypes`: Max 10 items
- `timeCommitment`: daily | weekly | flexible

**Response**: Same as GET /api/recommendations

---

#### POST /api/recommendations/feedback

Record user feedback on recommendations.

**Auth**: Public

**Request Body**:
```json
{
  "userId": "user-id",
  "resourceId": "resource-uuid",
  "feedback": "clicked",
  "rating": 5
}
```

**Validation**:
- `userId`: 1-100 characters (required)
- `resourceId`: Valid UUID (required)
- `feedback`: clicked | dismissed | completed
- `rating`: 1-5 (optional)

**Response**:
```json
{
  "status": "success",
  "message": "Feedback recorded"
}
```

---

### Learning Path Routes

#### GET /api/learning-paths/suggested

Get suggested learning paths.

**Auth**: Public

**Query Parameters**:
- `limit` (integer, default: 5)
- `userId` (string): User ID
- `categories` (string): Comma-separated categories
- `skillLevel` (string): beginner | intermediate | advanced
- `goals` (string): Comma-separated learning goals
- `timeCommitment` (string): daily | weekly | flexible

**Response**:
```json
[
  {
    "title": "Video Streaming Mastery",
    "description": "Complete path to master video streaming",
    "difficulty": "intermediate",
    "estimatedDuration": "20 hours",
    "steps": [
      {
        "title": "Introduction to Streaming",
        "resources": [...]
      }
    ]
  }
]
```

---

#### POST /api/learning-paths/generate

Generate custom learning path.

**Auth**: Public

**Request Body**:
```json
{
  "userProfile": {
    "userId": "user-id",
    "skillLevel": "intermediate",
    "preferredCategories": ["Video Streaming"]
  },
  "category": "Video Streaming",
  "customGoals": ["Learn HLS", "Master adaptive bitrate"]
}
```

**Validation**:
- `userProfile`: UserProfile object (see POST /api/recommendations)
- `category`: Max 100 characters (optional)
- `customGoals`: Max 10 items, each max 200 characters

**Response**: Single learning path object

---

#### POST /api/learning-paths

Legacy route for generating learning paths (redirects to suggested).

**Auth**: Public

**Request Body**: UserProfile object

**Response**: Array of learning paths

---

#### POST /api/interactions

Track user interaction for improving recommendations.

**Auth**: Public

**Request Body**:
```json
{
  "userId": "user-id",
  "resourceId": "resource-uuid",
  "interactionType": "view",
  "interactionValue": 5,
  "metadata": {}
}
```

**Validation**:
- `userId`: 1-100 characters (required)
- `resourceId`: Valid UUID (required)
- `interactionType`: view | click | bookmark | rate | complete
- `interactionValue`: 1-5 (optional, for ratings)

**Response**:
```json
{
  "status": "recorded"
}
```

---

### Cache Management Routes

#### POST /api/admin/cache/clear

Clear cache by type.

**Auth**: Admin

**Request Body**:
```json
{
  "type": "all"
}
```

**Validation**:
- `type`: all | resources | categories | journeys | stats

**Response**:
```json
{
  "success": true,
  "message": "Cache all cleared",
  "stats": {
    "hits": 1000,
    "misses": 200,
    "hitRate": "83.33%",
    "keysCount": 0,
    "memoryUsage": "0 MB"
  }
}
```

---

#### GET /api/admin/cache/stats

Get cache statistics.

**Auth**: Admin

**Response**:
```json
{
  "hits": 5000,
  "misses": 1000,
  "hitRate": "83.33%",
  "keysCount": 150,
  "memoryUsage": "25 MB"
}
```

---

### SEO Routes

#### GET /sitemap.xml

Generate XML sitemap.

**Auth**: Public

**Response**: XML sitemap with all categories and pages

---

#### GET /og-image.svg

Generate Open Graph image for social sharing.

**Auth**: Public

**Query Parameters**:
- `title` (string): Page title
- `category` (string): Category name
- `resourceCount` (integer): Number of resources

**Response**: SVG image (`Content-Type: image/svg+xml`)

---

### Health Check

#### GET /api/health

Health check endpoint.

**Auth**: Public

**Response**:
```json
{
  "status": "ok",
  "cache": {
    "available": true,
    "hits": 5000,
    "misses": 1000,
    "hitRate": "83.33%",
    "keys": 150,
    "memory": "25 MB"
  }
}
```

---

## Response Type Definitions

### Resource

```typescript
interface Resource {
  id: string;                    // UUID
  title: string;
  url: string;
  description: string;
  category: string;
  subcategory: string | null;
  subSubcategory: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'archived';
  submittedBy: string | null;    // UUID
  approvedBy: string | null;     // UUID
  approvedAt: string | null;     // ISO timestamp
  githubSynced: boolean;
  lastSyncedAt: string | null;   // ISO timestamp
  metadata: Record<string, any>;
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
}
```

### Category

```typescript
interface Category {
  id: string;      // UUID
  name: string;
  slug: string;
  subcategories?: Subcategory[];
}
```

### Subcategory

```typescript
interface Subcategory {
  id: string;           // UUID
  name: string;
  slug: string;
  categoryId: string;   // UUID
  subSubcategories?: SubSubcategory[];
}
```

### SubSubcategory

```typescript
interface SubSubcategory {
  id: string;            // UUID
  name: string;
  slug: string;
  subcategoryId: string; // UUID
}
```

### LearningJourney

```typescript
interface LearningJourney {
  id: string;                        // UUID
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: string | null;
  icon: string | null;
  orderIndex: number | null;
  category: string;
  status: 'draft' | 'published' | 'archived';
  createdAt: string;                 // ISO timestamp
  updatedAt: string;                 // ISO timestamp
}
```

### JourneyStep

```typescript
interface JourneyStep {
  id: string;              // UUID
  journeyId: string;       // UUID
  resourceId: string | null; // UUID
  stepNumber: number;
  title: string;
  description: string | null;
  isOptional: boolean;
  createdAt: string;       // ISO timestamp
}
```

### UserJourneyProgress

```typescript
interface UserJourneyProgress {
  id: string;                // UUID
  userId: string;            // UUID
  journeyId: string;         // UUID
  currentStepId: string | null; // UUID
  completedSteps: string[];  // Array of step UUIDs
  startedAt: string;         // ISO timestamp
  lastAccessedAt: string;    // ISO timestamp
  completedAt: string | null; // ISO timestamp
}
```

### ResourceEdit

```typescript
interface ResourceEdit {
  id: string;                           // UUID
  resourceId: string;                   // UUID
  submittedBy: string;                  // UUID
  status: 'pending' | 'approved' | 'rejected';
  originalResourceUpdatedAt: string;    // ISO timestamp
  proposedChanges: Record<string, { old: any; new: any }>;
  proposedData: Partial<Resource>;
  claudeMetadata: ClaudeMetadata | null;
  claudeAnalyzedAt: string | null;      // ISO timestamp
  handledBy: string | null;             // UUID
  handledAt: string | null;             // ISO timestamp
  rejectionReason: string | null;
  createdAt: string;                    // ISO timestamp
  updatedAt: string;                    // ISO timestamp
}
```

### ClaudeMetadata

```typescript
interface ClaudeMetadata {
  suggestedTitle?: string;
  suggestedDescription?: string;
  suggestedTags?: string[];
  suggestedCategory?: string;
  suggestedSubcategory?: string;
  confidence?: number;        // 0-1
  keyTopics?: string[];
}
```

### UserProfile (for AI endpoints)

```typescript
interface UserProfile {
  userId: string;
  preferredCategories: string[];
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  learningGoals: string[];
  preferredResourceTypes: string[];
  timeCommitment: 'daily' | 'weekly' | 'flexible';
  viewHistory: string[];      // Resource UUIDs
  bookmarks: string[];        // Resource UUIDs
  completedResources: string[]; // Resource UUIDs
  ratings: Record<string, number>; // Resource UUID -> rating (1-5)
}
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-01 | Initial documentation covering all 70 endpoints |

---

*Generated for Awesome Video Resources Platform*

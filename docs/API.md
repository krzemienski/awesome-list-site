# API Reference

Complete API documentation for the Awesome Video Resource Viewer application.

**Base URL**: `http://localhost:5000/api` (development) or `https://your-domain.replit.app/api` (production)

## Authentication

The API supports two authentication methods:

### Replit OAuth
- Login: `GET /api/login` - Redirects to Replit OAuth
- Callback: `GET /api/callback` - OAuth callback handler

### Local Authentication (Development/Admin)
- Login: `POST /api/auth/local/login`
  - Body: `{ "email": string, "password": string }`
  - Returns: User object with session cookie

### Session Management
- Get Current User: `GET /api/auth/user`
  - Returns: `{ user: User | null, isAuthenticated: boolean }`
- Logout: `POST /api/auth/logout`
  - Returns: `{ success: true }`

---

## Public Endpoints

### Resources

#### List Resources
```
GET /api/resources
```
Query parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20) |
| category | string | Filter by category name |
| subcategory | string | Filter by subcategory name |
| search | string | Search in title/description |

Response:
```json
{
  "resources": [...],
  "total": 1949,
  "page": 1,
  "limit": 20
}
```

#### Get Single Resource
```
GET /api/resources/:id
```
Returns full resource object including metadata.

### Awesome List (Database-Driven)
```
GET /api/awesome-list
```
Query parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| category | string | Filter by category slug |
| subcategory | string | Filter by subcategory slug |
| subSubcategory | string | Filter by sub-subcategory slug |

Returns hierarchical structure with categories, subcategories, and resources.

### Categories
```
GET /api/categories          # List all categories
GET /api/subcategories       # List subcategories (optional: ?categoryId=)
GET /api/sub-subcategories   # List sub-subcategories (optional: ?subcategoryId=)
```

### Learning Journeys
```
GET /api/journeys            # List all journeys (optional: ?category=)
GET /api/journeys/:id        # Get specific journey with steps
```

### GitHub Discovery
```
GET /api/github/awesome-lists   # Browse awesome lists (?page=, ?per_page=)
GET /api/github/search          # Search awesome lists (?q=)
```

### SEO
```
GET /sitemap.xml             # Dynamic sitemap
GET /og-image.svg            # Dynamic Open Graph image
```

### Health Check
```
GET /api/health              # Returns { status: "ok" }
```

---

## Authenticated Endpoints

These endpoints require a valid session (user must be logged in).

### Resource Submission
```
POST /api/resources
```
Body:
```json
{
  "title": "Resource Title",
  "url": "https://example.com",
  "description": "Description",
  "category": "General Tools",
  "subcategory": "DRM"
}
```
Status: Created as "pending" for admin review.

### Edit Suggestions
```
POST /api/resources/:id/edits
```
Body:
```json
{
  "proposedChanges": { "title": { "from": "Old", "to": "New" } },
  "proposedData": { "title": "New Title" },
  "triggerClaudeAnalysis": true
}
```
Editable fields (whitelisted): `title`, `description`, `url`, `tags`, `category`, `subcategory`, `subSubcategory`

### Favorites & Bookmarks
```
POST /api/favorites/:resourceId      # Add favorite
DELETE /api/favorites/:resourceId    # Remove favorite
GET /api/favorites                   # List favorites

POST /api/bookmarks/:resourceId      # Add bookmark
DELETE /api/bookmarks/:resourceId    # Remove bookmark
GET /api/bookmarks                   # List bookmarks
```

### User Progress & Journeys
```
GET /api/user/progress              # Get learning progress
GET /api/user/submissions           # Get submitted resources
GET /api/user/journeys              # Get started journeys

POST /api/journeys/:id/start        # Start a journey
PUT /api/journeys/:id/progress      # Update progress { stepId }
GET /api/journeys/:id/progress      # Get journey progress
```

### AI Analysis
```
POST /api/claude/analyze
```
Body: `{ "url": "https://example.com" }`
Returns AI-generated metadata analysis.

---

## Admin Endpoints

All admin endpoints require both authentication and admin role.

### Dashboard & Statistics
```
GET /api/admin/stats
```
Response:
```json
{
  "users": 3,
  "resources": 1949,
  "journeys": 0,
  "pendingApprovals": 5
}
```

### User Management
```
GET /api/admin/users                    # List users (?page=, ?limit=)
PUT /api/admin/users/:id/role           # Change role { "role": "admin|user|moderator" }
```

### Resource Management
```
GET /api/admin/resources                # List all resources (with filters)
POST /api/admin/resources               # Create resource
PUT /api/admin/resources/:id            # Update resource
DELETE /api/admin/resources/:id         # Delete resource

GET /api/admin/pending-resources        # List pending resources
POST /api/admin/resources/:id/approve   # Approve resource
POST /api/admin/resources/:id/reject    # Reject resource { "reason": "..." }
```

### Edit Suggestion Management
```
GET /api/admin/resource-edits                 # List pending edits
POST /api/admin/resource-edits/:id/approve    # Approve edit
POST /api/admin/resource-edits/:id/reject     # Reject edit { "reason": "..." }
```

### Category Management
```
GET /api/admin/categories                # List with resource counts
POST /api/admin/categories               # Create category
PATCH /api/admin/categories/:id          # Update category
DELETE /api/admin/categories/:id         # Delete category (must be empty)

GET /api/admin/subcategories             # List subcategories
POST /api/admin/subcategories            # Create subcategory
PATCH /api/admin/subcategories/:id       # Update subcategory
DELETE /api/admin/subcategories/:id      # Delete subcategory

GET /api/admin/sub-subcategories         # List sub-subcategories
POST /api/admin/sub-subcategories        # Create sub-subcategory
PATCH /api/admin/sub-subcategories/:id   # Update sub-subcategory
DELETE /api/admin/sub-subcategories/:id  # Delete sub-subcategory
```

### GitHub Sync
```
POST /api/github/configure              # Configure sync { repoUrl, branch, token }
POST /api/github/import                 # Import from GitHub
POST /api/github/export                 # Export to GitHub
GET /api/github/sync-status             # Get sync queue status
GET /api/github/sync-status/:id         # Get specific sync item
GET /api/github/sync-history            # Get sync history
POST /api/github/process-queue          # Trigger queue processing
```

### Import/Export
```
POST /api/admin/export                  # Export markdown (awesome-list format)
GET /api/admin/export-json              # Export full database backup (JSON)
POST /api/admin/import-github           # Import from GitHub URL
POST /api/admin/seed-database           # Manual database seeding
```

### Validation
```
POST /api/admin/validate                # Run awesome-lint validation
POST /api/admin/check-links             # Check all resource links
GET /api/admin/validation-status        # Get latest validation results
```

### Enrichment (AI Batch Processing)
```
POST /api/enrichment/start              # Start batch enrichment job
GET /api/enrichment/jobs                # List enrichment jobs
GET /api/enrichment/jobs/:id            # Get job status
DELETE /api/enrichment/jobs/:id         # Cancel job
```

---

## AI-Powered Endpoints

### Recommendations
```
GET /api/recommendations/init           # Initialize recommendation engine
GET /api/recommendations                # Get personalized recommendations
POST /api/recommendations               # Get recommendations for profile
POST /api/recommendations/feedback      # Submit feedback on recommendations
```

### Learning Paths
```
GET /api/learning-paths/suggested       # Get suggested learning paths
POST /api/learning-paths/generate       # Generate custom learning path
POST /api/learning-paths                # Create learning path
```

### Interactions
```
POST /api/interactions                  # Record user interaction
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "message": "Error description",
  "errors": [...]  // Optional: validation errors
}
```

Common HTTP status codes:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate entry)
- `500` - Internal Server Error

---

## Rate Limiting

- Public endpoints: No explicit rate limiting
- AI endpoints (Claude/Anthropic): Subject to Anthropic API limits
- GitHub API: Subject to GitHub rate limits

---

## Data Models

### Resource
```typescript
{
  id: number;
  title: string;
  url: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  subSubcategory: string | null;
  status: 'pending' | 'approved' | 'rejected';
  submittedBy: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  metadata: {
    tags: string[];
    scrapedAt: string;
    ogImage: string | null;
    favicon: string | null;
    // ... additional scraped metadata
  } | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### User
```typescript
{
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  role: 'user' | 'admin' | 'moderator';
  createdAt: Date;
  updatedAt: Date;
}
```

### Category/Subcategory/SubSubcategory
```typescript
{
  id: number;
  name: string;
  slug: string;
  categoryId?: number;    // For subcategories
  subcategoryId?: number; // For sub-subcategories
}
```

### Learning Journey
```typescript
{
  id: number;
  title: string;
  description: string | null;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedHours: number;
  steps: JourneyStep[];
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

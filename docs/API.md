# API Reference

REST API for the Awesome Video Resource Viewer.

- **Base URL**: `http://localhost:5000/api` (dev) / `https://<your-domain>/api` (prod)
- **Live, always-current spec**: the app serves interactive docs at **`/api/docs`**
  and the machine-readable OpenAPI 3.0 document at **`/api/openapi.json`**.
  Both are generated from `server/openapi.ts` and are the source of truth for the
  **public** API. This page is a curated human overview; when in doubt, trust the
  live spec.

The server registers ~145 routes. This document covers the **public API** in
full plus a verified map of the authenticated and admin surface — it does not
enumerate every internal route. Use `/api/docs` for the exact request/response
schemas.

---

## Public API (`/api/public/*`)

Read-only, rate-limited endpoints for external consumers. They work without
authentication (free tier) or with an API key for higher limits. Only
`approved` resources are exposed. Source: `server/api/public.ts`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/public/resources` | List approved resources (paginated, filterable) |
| GET | `/api/public/resources/:id` | Get one approved resource by numeric ID |
| GET | `/api/public/categories` | List all categories |
| GET | `/api/public/tags` | List all tags |
| GET | `/api/public/me` | Verify an API key (requires `Authorization` header) |

### List resources — query parameters

| Parameter | Type | Default | Notes |
|-----------|------|---------|-------|
| `page` | integer ≥ 1 | 1 | Invalid values → `400` |
| `limit` | integer 1–100 | 20 | Clamped to 100 |
| `category` | string | – | Filter by category name |
| `subcategory` | string | – | Filter by subcategory name |
| `search` | string | – | Search title/description |

Response envelope:

```json
{
  "resources": [ /* Resource[] */ ],
  "total": 2282,
  "page": 1,
  "limit": 20,
  "totalPages": 115
}
```

### Authentication (API keys)

Create a key from your account (`POST /api/user/api-keys`) and send it as a
Bearer token:

```
Authorization: Bearer YOUR_API_KEY
```

Unauthenticated requests are allowed but rate-limited (free tier, 60 req/hour).
Rate-limit headers are returned on every response: `RateLimit-Limit`,
`RateLimit-Remaining`, `RateLimit-Reset`.

### Examples

```bash
# List (no auth)
curl "http://localhost:5000/api/public/resources?limit=5"

# With API key + filters
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "http://localhost:5000/api/public/resources?category=Encoding%20%26%20Codecs&page=2"

# Single resource
curl "http://localhost:5000/api/public/resources/42"

# Verify a key
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "http://localhost:5000/api/public/me"
```

```javascript
const res = await fetch(
  "http://localhost:5000/api/public/resources?search=hls",
  { headers: { Authorization: `Bearer ${process.env.API_KEY}` } }
);
const { resources, total, totalPages } = await res.json();
```

```python
import os, requests
r = requests.get(
    "http://localhost:5000/api/public/resources",
    headers={"Authorization": f"Bearer {os.environ['API_KEY']}"},
    params={"category": "Players & Clients", "limit": 50},
)
r.raise_for_status()
data = r.json()
```

---

## Authentication endpoints

Session-based auth (cookies). Local email/password auth is always available;
Replit OAuth is enabled when `REPL_ID`/`ISSUER_URL` are configured.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/local/login` | Email/password login (rate-limited) |
| GET | `/api/auth/user` | Current user (returns `null` when anonymous) |
| GET | `/api/login`, `/api/callback` | Replit OAuth flow (when configured) |

> Logout is handled through the OAuth/session flow; check `/api/docs` and
> `server/routes.ts` for the exact logout route for your auth mode.

---

## Content endpoints (public reads)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/resources` | List resources (in-app catalog) |
| GET | `/api/resources/:id` | Single resource (numeric ID) |
| GET | `/api/resources/:id/related` | Related resources |
| GET | `/api/awesome-list` | Hierarchical list (categories → resources); filters: `category`, `subcategory`, `subSubcategory` |
| GET | `/api/awesome-list/nav` | Navigation tree |
| GET | `/api/categories` | List categories |
| GET | `/api/subcategories` | List subcategories (`?categoryId=`) |
| GET | `/api/sub-subcategories` | List sub-subcategories (`?subcategoryId=`) |
| GET | `/api/journeys` | List learning journeys (`?category=`) |
| GET | `/api/journeys/:id` | Journey with steps |
| GET | `/api/github/awesome-lists` | Browse awesome lists (discovery) |

### SEO / crawler endpoints (non-`/api`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/sitemap.xml` | Dynamic sitemap |
| GET | `/og-image.svg`, `/og-image.png` | Dynamic Open Graph images |

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Liveness — returns `{ "status": "ok" }` |
| GET | `/api/health/ai` | AI service status (deep checks are admin-only) |

> Note: there is **no** `/health` route — use `/api/health`.

---

## Authenticated endpoints (logged-in user)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/resources` | Submit a resource (created as `pending`) |
| POST | `/api/resources/:id/edits` | Suggest an edit to a resource |
| GET/POST/DELETE | `/api/favorites`, `/api/favorites/:resourceId` | Manage favorites |
| GET/POST/DELETE | `/api/bookmarks`, `/api/bookmarks/:resourceId` | Manage bookmarks |
| GET | `/api/user/progress` | Learning progress |
| GET | `/api/user/submissions` | Submitted resources |
| GET | `/api/user/journeys` | Started journeys |
| POST | `/api/journeys/:id/start` | Start a journey |
| PUT/GET | `/api/journeys/:id/progress` | Update / read journey progress |
| GET/POST/DELETE | `/api/user/api-keys`, `/api/user/api-keys/:id` | Manage API keys |
| POST | `/api/user/change-password` | Change password |
| PATCH | `/api/user/profile` | Update profile |
| POST | `/api/claude/analyze` | AI URL analysis (rate-limited) |
| GET/POST | `/api/recommendations`, `/api/recommendations/feedback` | Recommendations |
| GET/POST | `/api/learning-paths/suggested`, `/api/learning-paths/generate` | Learning paths |
| POST | `/api/interactions` | Record a user interaction |

Edit suggestions accept a whitelisted set of fields: `title`, `description`,
`url`, `tags`, `category`, `subcategory`, `subSubcategory`.

---

## Admin endpoints (`isAdmin` required)

All require an authenticated admin session. A representative map (see `/api/docs`
and `server/routes.ts` for the complete set):

**Dashboard & users**

| Method | Path |
|--------|------|
| GET | `/api/admin/stats` |
| GET | `/api/admin/users` |
| PUT | `/api/admin/users/:id/role` |
| PATCH | `/api/admin/users/:id/name` |
| DELETE | `/api/admin/users/:id` |
| GET | `/api/admin/audit-logs` |

**Resources & moderation**

| Method | Path |
|--------|------|
| GET | `/api/admin/resources`, `/api/admin/pending-resources` |
| POST | `/api/admin/resources` |
| PUT/DELETE | `/api/admin/resources/:id` |
| POST | `/api/admin/resources/:id/approve` \| `/reject` \| `/unapprove` |
| POST | `/api/admin/resources/bulk/approve` \| `/reject` \| `/delete` |
| GET | `/api/admin/resource-edits` |
| POST | `/api/admin/resource-edits/:id/approve` \| `/reject` |

**Taxonomy** (`categories`, `subcategories`, `sub-subcategories`)

| Method | Path |
|--------|------|
| GET | `/api/admin/categories` (with resource counts) |
| POST | `/api/admin/categories` |
| PATCH | `/api/admin/categories/:id` |
| DELETE | `/api/admin/categories/:id` (must be empty) |

The same GET/POST/PATCH/DELETE pattern applies to
`/api/admin/subcategories/*` and `/api/admin/sub-subcategories/*`.

**Import / export / validation**

| Method | Path |
|--------|------|
| POST | `/api/admin/export` (markdown) |
| GET | `/api/admin/export-json` (full backup) |
| POST | `/api/admin/import-github`, `/api/admin/seed-database` |
| POST | `/api/admin/validate` (awesome-lint), `/api/admin/check-links` |
| GET | `/api/admin/validation-status`, `/api/admin/link-health/*` |

**GitHub sync**

| Method | Path |
|--------|------|
| POST | `/api/github/configure`, `/api/github/import`, `/api/github/export`, `/api/github/process-queue` |
| GET | `/api/github/sync-status`, `/api/github/sync-status/:id`, `/api/github/sync-history`, `/api/github/search` |

**AI enrichment & researcher**

| Method | Path |
|--------|------|
| POST | `/api/enrichment/start` |
| GET | `/api/enrichment/jobs`, `/api/enrichment/jobs/:id` |
| DELETE | `/api/enrichment/jobs/:id` |
| POST | `/api/researcher/start` |
| GET | `/api/researcher/jobs`, `/api/researcher/jobs/:id`, `/api/researcher/discoveries` |
| DELETE | `/api/researcher/jobs/:id` |
| POST | `/api/researcher/discoveries/:id/approve` \| `/reject` |

See [RESEARCH_FEATURE.md](../RESEARCH_FEATURE.md) and
[AI-SERVICES.md](./AI-SERVICES.md) for the researcher/enrichment workflows.

---

## Error responses

Errors are JSON with a `message` field (and optional `errors` for validation):

```json
{ "message": "Error description", "errors": [] }
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request / validation error |
| 401 | Not authenticated |
| 403 | Authenticated but not authorized (e.g. non-admin) |
| 404 | Not found (or resource not `approved` on the public API) |
| 409 | Conflict (duplicate) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## Data models (summary)

Authoritative types live in [`shared/schema.ts`](../shared/schema.ts); the public
shapes are documented in `/api/openapi.json`.

```typescript
// Resource (public fields; internal fields are stripped by the public API)
interface Resource {
  id: number;
  title: string;
  url: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  subSubcategory: string | null;
  status: 'pending' | 'approved' | 'rejected';
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

interface Category { id: number; name: string; slug: string }
interface Tag { id: number; name: string; slug: string; createdAt: string }
```

---

## Rate limiting

- Public API: free tier ≈ 60 requests/hour; API keys can raise the limit.
- AI endpoints (`/api/claude/*`, `/api/learning-paths/generate`): additionally
  gated by an AI rate limiter and by upstream Anthropic/OpenAI limits.
- GitHub endpoints: subject to GitHub API limits.

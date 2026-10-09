# API Reference

REST API for the Awesome Video Resource Viewer.

- **Base URL**: `http://localhost:5000/api` (dev) / `https://<your-domain>/api` (prod)
- **Live, always-current spec**: the app serves interactive docs at **`/api/docs`**
  and the machine-readable OpenAPI 3.0 document at **`/api/openapi.json`**.
  Both are generated from the named runtime contracts in `server/contracts/`
  after the domain registrars mount. They are the source of truth for the full
  API. This page is a curated human overview; when in doubt, trust the
  live spec.

This document covers the public developer API in full and gives a navigational
map of the larger application API. It deliberately does not freeze a total route
count or duplicate every internal operation; use generated OpenAPI for exact
methods, auth, parameters, and schemas.

---

## Public API (`/api/public/*`)

Read-only, rate-limited endpoints for external consumers. They work without
authentication (free tier) or with an API key (standard tier, own bucket).
Only `approved` resources are exposed, through the same public field
allowlist as the in-app catalog. Source: `server/api/public.ts`.

The key, tier and cache rules below cover the developer endpoints in this
table plus `GET /api/public/me`. `GET /api/public/collections/:shareId` is a
site endpoint behind the shared-collection page: it is unmetered by API tier,
ignores `Authorization` entirely (a key neither helps nor is rejected) and is
listed with the site endpoints further down.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/public/resources` | List approved resources (paginated, filterable) |
| GET | `/api/public/resources/:id` | Get one approved resource by numeric ID |
| GET | `/api/public/categories` | List all categories |
| GET | `/api/public/tags` | Approved-resource tags with usage counts |
| GET | `/api/public/me` | Verify an API key (requires `Authorization` header) |

`GET /api/public/tags` shares the catalog `/api/tags` contract:
`{ "total": number, "tags": [{ "tag": string, "count": number }] }`.
Tags come from approved resources' `metadata.tags`, with lowercase and
whitespace/underscore-to-hyphen normalization. Results are ordered by count
descending, then tag ascending. Use a returned tag with
`GET /api/resources?tags=open-source` to browse matching resources.

### List resources — query parameters

| Parameter | Type | Default | Notes |
|-----------|------|---------|-------|
| `page` | integer ≥ 1 | 1 | Invalid values → `400` |
| `limit` | positive integer | 20 | Values above 100 are clamped to 100; invalid/non-positive values → `400` |
| `category` | string | – | Filter by category name |
| `subcategory` | string | – | Filter by subcategory name |
| `search` | string | – | Search title/description |

Response envelope:

```json
{
  "resources": [ /* Resource[] */ ],
  "total": 123,
  "page": 1,
  "limit": 20,
  "totalPages": 7
}
```

### Authentication (API keys)

Create a key from your account (`POST /api/user/api-keys`) and send it as a
Bearer token:

```
Authorization: Bearer YOUR_API_KEY
```

| Caller | Tier | Limit | Bucket |
|--------|------|-------|--------|
| No `Authorization` header | free | 60 requests/hour | per client IP |
| Valid API key | standard | 1,000 requests/hour | per key (independent of your IP) |

- The tier is assigned by the server. Every valid key is `standard`; there is
  no premium tier, and key `scopes` are your own labels — they grant nothing.
  Creating a key with a reserved tier name (`free`, `standard`, `premium`)
  as a scope is rejected with `400`.
- A presented key that is invalid, revoked or expired returns `401` with a
  `message` naming the reason — it is never silently downgraded to the free
  tier. Remove the header to call anonymously.
- `GET /api/public/me` echoes the key's `tier` and `rateLimit`
  (`{ limit, windowSeconds }`).
- Rate-limit headers are returned on every response: `RateLimit-Limit`,
  `RateLimit-Remaining`, `RateLimit-Reset`; a `429` also carries
  `Retry-After`.
- Caching: anonymous responses are `Cache-Control: public, max-age=60`;
  responses to a valid key are `private, no-store`, and key errors (`401`)
  are `no-store`. Every developer-endpoint response sends
  `Vary: Authorization`, so a cached anonymous answer is never reused for a
  keyed request (an anonymous cached hit does not count against the 60/hour
  bucket).

### Examples

```bash
# List (no auth)
curl "http://localhost:5000/api/public/resources?limit=5"

# With API key + filters
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "http://localhost:5000/api/public/resources?category=Encoding%20%26%20Codecs&page=2"

# Single resource
curl "http://localhost:5000/api/public/resources/185125"

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

Authentication is handled by Clerk (session tokens). The old local
email/password login endpoint was removed.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/user` | Always `200`; `{ user: null, isAuthenticated: false }` when anonymous |
| GET | `/api/auth/me` | Deprecated current-user alias (401 when anonymous) |
| GET | `/api/auth/status` | Deprecated lightweight auth probe |
| POST | `/api/auth/logout-all` | Revoke all active Clerk sessions for the caller |

> Sign-in, sign-out, and session management go through Clerk's hosted flow;
> check `/api/docs` and `server/routes/domains/auth-user.ts` for the current
> application identity routes.

---

## Content endpoints (public reads)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/resources` | List resources (in-app catalog); `?kind=` filters by **resolved** kind (see below); the response also carries `X-Total-Count` |
| GET | `/api/resources/kinds/counts` | Full-set counts per resolved kind over approved resources (see below) |
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
| GET | `/api/public/collections/:shareId` | Read a published bookmark collection (each resource carries `kind` + `resolvedKind`; never `metadata`). Not part of the developer API: no API-key handling or tier limit |

### Catalog filters (`/api/resources`, `/api/search`)

The exact parameter list, enums and bounds are in `/api/openapi.json`
(`ResourcesQuery`, `SearchQuery`, `AwesomeListListingQuery`). Summary:

| Parameter | `/api/resources` | `/api/search` | Notes |
|-----------|:---:|:---:|-------|
| `q` / `search` | ✓ | ✓ | Full-text. On `/api/resources` `search` wins when both are sent; on `/api/search` `q` wins. Too-short queries behave like no query |
| `category`, `subcategory` | ✓ | – | Display name or URL slug |
| `subSubcategory` | ✓ | – | Display name |
| `generalScope` | ✓ | – | `category` \| `subcategory` |
| `tags` / `tag` | ✓ | – | 1–10 comma-separated or repeated values |
| `provider`, `format`, `skillLevel`, `kind` | ✓ | – | Controlled values, case-insensitive; unknown → `400 invalid_<param>` with `allowed` |
| `sort` | ✓ | – | `relevance`, `name-asc`, `name-desc`, `newest`, `oldest`; unknown → `400 invalid_sort` |
| `facets` | ✓ | – | `true` adds facet counts |
| `page`, `limit` (1–100), `offset`, `cursor` | ✓ | – | `cursor` aliases `offset`; out-of-range → `400` |
| `limit`, `offset` | – | ✓ | `limit` defaults to 100 and is clamped to 1–200; non-numeric → `400` |

`GET /api/awesome-list/listing` takes `level`, `slug`, `page`, `subcategory`,
`subSubcategory`, `general=1` and `kind`.

```bash
curl "http://localhost:5000/api/resources?q=hls&kind=tools&sort=name-asc&limit=5"
curl "http://localhost:5000/api/resources?tags=open-source&facets=true&limit=1"
curl "http://localhost:5000/api/search?q=webrtc&limit=5"
curl "http://localhost:5000/api/awesome-list/listing?level=category&slug=encoding-codecs&kind=tools"
```

### Resource kinds

Every public resource payload (list, detail, related, search, tag landing, the
`/api/awesome-list` tree and `/listing` pages, `/api/public/resources`, journey
step resources, recommendations, published bookmark collections) carries two
additive fields:

| Field | Type | Meaning |
|-------|------|---------|
| `kind` | `"tools" \| "libraries" \| "standards" \| "events" \| "protocols" \| "other" \| null` | The stored, admin-editable column. `null` until an admin sets one. |
| `resolvedKind` | same enum, never null | What the read-time resolver decided: the stored value if present, else a tag mapping from `metadata.tags`, else a category mapping, else `"other"`. UI must render this one. |

Resolution is deterministic and configured in `awesome-list.config.yaml`
(`resource_kinds.tag_mappings`, `resource_kinds.category_mappings`); the
precedence rules are recorded in
[`docs/parity/assumptions/kind-api.md`](parity/assumptions/kind-api.md).

`GET /api/resources/kinds/counts` answers in one grouped SQL statement (no
per-resource work) and is cached for 60 s like the other catalog aggregates:

```json
{ "tools": 23, "libraries": 61, "standards": 47, "events": 18, "protocols": 11, "other": 1656, "total": 1816 }
```

`total` always equals `SELECT count(*) FROM resources WHERE status = 'approved'`
(scoped by `?category=<slug or exact name>` when given). An unknown category
returns all zeros with `Cache-Control: max-age=0`; an empty, repeated or
over-long `category` is rejected with `400` (`validation_failed` from the query
contract, `invalid_category` for a blank or >200-character value).

`GET /api/resources?kind=events` applies the same resolver server-side (stored
**or** inferred), keeps every other filter, the sort and the pagination, and its
`total` / `X-Total-Count` equal the matching bucket of the counts endpoint. An
unknown kind is `400 invalid_kind` with the allowed values.

### SEO / crawler endpoints (non-`/api`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/sitemap.xml` | Dynamic sitemap |
| GET | `/og-image.svg`, `/og-image.png` | Dynamic Open Graph images |

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Compatibility liveness — process health only |
| GET | `/api/health/live` | Liveness — process health only, never touches the database |
| GET | `/api/health/ready` | Readiness — migrations complete plus a bounded catalog-database probe |
| GET | `/api/health/ai` | AI service status (deep checks are admin-only) |

> Note: there is **no** `/health` route — use `/api/health`.

### Catalog/database resilience policy

- Public catalog representations use one process-local cache with schema
  version `public-v1`, explicit public-only namespaces, 30–60 second TTLs, a
  512-entry/24 MiB committed-value bound, a 64-rebuild in-flight bound, and one
  coalesced rebuild per key/generation.
- Every successful resource, taxonomy, or tag mutation advances the generation.
  An older in-flight rebuild is discarded and retried, so a completed mutation
  is immediately visible. Failed rebuilds are never cached and stale data is
  never returned as a fresh success.
- The PostgreSQL pool remains capped at three connections. Pool acquisition,
  statements, locks, and idle transactions have bounded deadlines; transient
  failures return a redacted `503` with `Retry-After: 1`.
- Admins can inspect bounded aggregate pool/query/endpoint/cache/heavy-work
  telemetry at `GET /api/admin/operations/health`. SQL text, parameters,
  request bodies, row values, IDs, and connection details are not retained.

---

## Authenticated endpoints (logged-in user)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/resources` | Submit a resource (created as `pending`) |
| POST | `/api/resources/:id/edits` | Suggest an edit to a resource |
| GET/POST/DELETE | `/api/favorites`, `/api/favorites/:resourceId` | Manage favorites |
| GET/POST/DELETE | `/api/bookmarks`, `/api/bookmarks/:resourceId` | Manage bookmarks |
| GET/POST/PATCH/DELETE | `/api/collections`, `/api/collections/:collectionId` | Manage bookmark collections |
| PUT | `/api/collections/reorder` | Reorder collections |
| POST/DELETE | `/api/collections/:collectionId/items/:resourceId` | Manage collection membership |
| POST/DELETE | `/api/collections/:collectionId/publish` | Publish or unpublish a collection |
| PATCH/POST | `/api/bookmarks/:resourceId/state`, `/api/bookmarks/bulk` | Bookmark queue/bulk actions |
| GET/PUT | `/api/notification-preferences` | Reminder/digest preferences |
| GET/PATCH/POST | `/api/notifications`, `/api/notifications/:id/read`, `/api/notifications/read-all` | Notification inbox |
| GET | `/api/digests/preview` | Preview the caller's next digest |
| GET | `/api/user/progress` | Learning progress |
| GET | `/api/user/submissions` | Submitted resources |
| GET | `/api/user/contributions` | Contribution history |
| GET | `/api/user/journeys` | Started journeys |
| POST | `/api/journeys/:id/start` | Start a journey |
| PUT/GET | `/api/journeys/:id/progress` | Update / read journey progress |
| GET/POST/DELETE | `/api/user/api-keys`, `/api/user/api-keys/:id` | Manage API keys |
| PATCH | `/api/user/profile` | Update profile |
| POST | `/api/claude/analyze` | AI URL analysis (rate-limited) |
| GET/POST | `/api/recommendations` | Recommendations |
| GET/PUT/POST | `/api/recommendations/feedback`, `/api/recommendations/:resourceId/feedback` | Recommendation feedback |
| POST | `/api/interactions` | Record a user interaction |

Edit suggestions accept a whitelisted set of fields: `title`, `description`,
`url`, `tags`, `category`, `subcategory`, `subSubcategory`.

---

## Admin endpoints (`isAdmin` required)

All require an authenticated admin session. A representative map (see `/api/docs`
and `server/routes/domains/` for the complete set):

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
| PATCH | `/api/admin/resources/:id/kind` — body `{ "kind": ResourceKind \| null }`, sets or clears the stored kind (audit-logged) |
| PATCH | `/api/admin/resources/:id/featured` — body `{ "featured": boolean }`, toggles `metadata.featured` (audit-logged) |
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
| POST | `/api/researcher/start`, `/api/researcher/discoveries/approve-all` |
| GET | `/api/researcher/brief` |
| GET | `/api/researcher/jobs`, `/api/researcher/jobs/:id`, `/api/researcher/discoveries` |
| DELETE | `/api/researcher/jobs/:id` |
| POST | `/api/researcher/discoveries/:id/approve` \| `/reject` |

See [RESEARCH_FEATURE.md](../RESEARCH_FEATURE.md) and
[AI-SERVICES.md](./AI-SERVICES.md) for the researcher/enrichment workflows.

---

## Error responses

Errors are JSON with a `message` field (and optional `errors` for validation):

Validation failures use one field-level envelope:

```json
{
  "error": "validation_failed",
  "message": "Validation failed",
  "fieldErrors": { "url": "Must be a valid public URL" },
  "errors": []
}
```

Authentication, authorization, not-found, conflict, rate-limit, and server
errors retain their documented status-specific JSON bodies.

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
  status: 'pending' | 'approved' | 'rejected' | 'archived';
  kind: ResourceKind | null;      // stored, admin-editable
  resolvedKind: ResourceKind;     // stored → inferred → 'other'
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

type ResourceKind = 'tools' | 'libraries' | 'standards' | 'events' | 'protocols' | 'other';

interface Category { id: number; name: string; slug: string }
interface Tag { id: number; name: string; slug: string; createdAt: string }
```

---

## Rate limiting

- Public API: 60 requests/hour per IP without a key; 1,000 requests/hour per
  valid API key (server-assigned standard tier). See "Authentication (API keys)".
- AI endpoints (`/api/claude/*`): additionally
  gated by an AI rate limiter and by upstream Anthropic/OpenAI limits.
- GitHub endpoints: subject to GitHub API limits.

# Awesome List Management Platform - Technical Specification

> **Generated**: 2026-02-02
> **Source**: Comprehensive codebase analysis via parallel research agents
> **Status**: Current State Documentation

---

## Table of Contents

- [Section A: System Overview](#section-a-system-overview)
- [Section B: Data Model Specification](#section-b-data-model-specification)
- [Section C: API Specification](#section-c-api-specification)
- [Section D: Frontend Specification](#section-d-frontend-specification)
- [Section E: Background Jobs Specification](#section-e-background-jobs-specification)
- [Section F: Admin Panel Specification](#section-f-admin-panel-specification)
- [Section G: AI Services Specification](#section-g-ai-services-specification)

---

## Section A: System Overview

### A.1 Application Purpose and Scope

The Awesome List Management Platform is a **full-stack web application** for curating, managing, and discovering developer resources from "awesome lists" (curated lists of resources for specific topics). It provides:

- **Resource Curation**: CRUD operations for links/resources with 3-tier categorization
- **AI-Powered Enrichment**: Automated metadata extraction and tagging via Claude AI
- **Personalized Discovery**: AI-powered recommendations and learning paths
- **GitHub Synchronization**: Bidirectional sync with awesome-list repositories
- **User Engagement**: Bookmarks, favorites, progress tracking, journeys
- **Admin Management**: Approval workflows, moderation, analytics

### A.2 Current Feature Set

| Category | Features | Status |
|----------|----------|--------|
| **Core CRUD** | Resources, Categories (3-tier), Tags | ✅ Complete |
| **User Features** | Auth, Bookmarks, Favorites, Preferences | ✅ Complete |
| **AI Features** | Enrichment, Recommendations, Learning Paths | ✅ Complete |
| **GitHub Sync** | Import, Export, Conflict Resolution | ✅ Complete |
| **Admin** | Dashboard, Moderation, Bulk Operations | ✅ Complete |
| **Background Jobs** | Enrichment Queue, GitHub Sync Queue | ✅ Complete |
| **Link Health** | URL Monitoring | ❌ Disabled (stub) |

### A.3 Technology Stack

| Layer | Technology | Version/Details |
|-------|------------|-----------------|
| **Frontend** | React + TypeScript | React 18, Vite, Wouter |
| **Backend** | Express + TypeScript | Node.js, Express 4 |
| **Database** | PostgreSQL | Neon Serverless |
| **ORM** | Drizzle ORM | Type-safe queries |
| **AI** | Claude (Anthropic) | claude-haiku-4-5 |
| **Auth** | Passport.js | Session + API Key |
| **Styling** | Tailwind CSS | OKLCH color space |
| **State** | TanStack Query | Server state management |
| **SSR** | Vite SSR | Server-side rendering |

### A.4 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLIENT (React/Vite)                             │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Pages (16)  │  Components (92)  │  Hooks (14)  │  Analytics    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ HTTP/REST (46+ endpoints)
┌───────────────────────────────────▼─────────────────────────────────────┐
│                         EXPRESS SERVER                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Middleware: JSON, Session, Passport, Rate Limiting, Logging     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    ROUTE MODULES (8)                             │   │
│  │  auth │ resources │ categories │ user │ journeys │ admin │      │   │
│  │  github-sync │ enrichment                                        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    SERVICE LAYER                                 │   │
│  │  ClaudeService │ EnrichmentService │ RecommendationEngine │     │   │
│  │  LearningPathGenerator │ GitHubSyncService │ Storage            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                  REPOSITORY LAYER (12 repos)                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ Drizzle ORM
┌───────────────────────────────────▼─────────────────────────────────────┐
│                      POSTGRESQL (Neon Serverless)                        │
│                         20+ Tables, JSONB fields                         │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
┌───────────────────────────────────┴─────────────────────────────────────┐
│                      EXTERNAL SERVICES                                   │
│  Anthropic Claude API  │  GitHub API  │  Replit OAuth                   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Section B: Data Model Specification

### B.1 Entity Relationship Diagram

```
┌─────────────┐       ┌──────────────┐       ┌─────────────────┐
│    users    │───┬───│ userFavorites│       │   resources     │
│             │   │   └──────────────┘       │                 │
│  id (PK)    │   │   ┌──────────────┐   ┌───│  id (PK)        │
│  username   │   ├───│userBookmarks │   │   │  name           │
│  email      │   │   └──────────────┘   │   │  url            │
│  password   │   │   ┌──────────────┐   │   │  description    │
│  role       │   ├───│userPreferences   │   │  categoryId (FK)│───┐
│  ...        │   │   └──────────────┘   │   │  subcategoryId  │   │
└─────────────┘   │   ┌──────────────┐   │   │  subSubcatId    │   │
                  └───│userInteractions──┘   │  status         │   │
                      └──────────────┘       │  metadata (JSON)│   │
                                             └─────────────────┘   │
                                                     │             │
┌─────────────┐       ┌──────────────┐       ┌──────▼──────────┐   │
│    tags     │◄──────│ resourceTags │───────│  categories     │◄──┘
│             │       └──────────────┘       │                 │
│  id (PK)    │                              │  id (PK)        │
│  name       │                              │  name           │
│  slug       │                              │  slug           │
└─────────────┘                              │  description    │
                                             └────────┬────────┘
                                                      │
                                             ┌────────▼────────┐
                                             │ subcategories   │
                                             │                 │
                                             │  id (PK)        │
                                             │  categoryId (FK)│
                                             │  name, slug     │
                                             └────────┬────────┘
                                                      │
                                             ┌────────▼────────┐
                                             │subSubcategories │
                                             │                 │
                                             │  id (PK)        │
                                             │  subcategoryId  │
                                             │  name, slug     │
                                             └─────────────────┘

┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ learningJourneys│───────│  journeySteps   │       │userJourneyProgress│
│                 │       │                 │       │                 │
│  id (PK)        │       │  id (PK)        │       │  id (PK)        │
│  title          │       │  journeyId (FK) │       │  userId (FK)    │
│  difficulty     │       │  resourceId(FK) │       │  journeyId (FK) │
│  duration       │       │  order          │       │  completedSteps │
│  category       │       │  ...            │       │  startedAt      │
└─────────────────┘       └─────────────────┘       └─────────────────┘

┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ enrichmentJobs  │───────│ enrichmentQueue │       │ resourceEdits   │
│                 │       │                 │       │                 │
│  id (PK)        │       │  id (PK)        │       │  id (PK)        │
│  status         │       │  jobId (FK)     │       │  resourceId (FK)│
│  totalResources │       │  resourceId(FK) │       │  userId (FK)    │
│  processed      │       │  status         │       │  editType       │
│  startedBy      │       │  retryCount     │       │  proposedChanges│
└─────────────────┘       └─────────────────┘       │  aiAnalysis     │
                                                    └─────────────────┘

┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    apiKeys      │       │ githubSyncQueue │       │githubSyncHistory│
│                 │       │                 │       │                 │
│  id (PK)        │       │  id (PK)        │       │  id (PK)        │
│  userId (FK)    │       │  repositoryUrl  │       │  action         │
│  keyHash        │       │  action         │       │  commitSha      │
│  scopes         │       │  status         │       │  resourceCount  │
│  expiresAt      │       │  ...            │       │  snapshot (JSON)│
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

### B.2 Table Specifications

#### B.2.1 Core Entities

##### users
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(255) | PK | User identifier (UUID or OAuth ID) |
| username | VARCHAR(255) | UNIQUE, NOT NULL | Display name |
| email | VARCHAR(255) | UNIQUE | Email address |
| password | VARCHAR(255) | | bcrypt hash (local auth only) |
| firstName | VARCHAR(255) | | First name |
| lastName | VARCHAR(255) | | Last name |
| profileImageUrl | VARCHAR(500) | | Avatar URL |
| role | ENUM | DEFAULT 'user' | user, admin, moderator |
| createdAt | TIMESTAMP | DEFAULT NOW() | Account creation |
| updatedAt | TIMESTAMP | | Last update |

##### resources
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | Auto-increment ID |
| name | VARCHAR(255) | NOT NULL | Resource title (max 200) |
| url | VARCHAR(500) | NOT NULL | Resource URL |
| description | TEXT | | Description (max 2000) |
| categoryId | INTEGER | FK → categories | Top-level category |
| subcategoryId | INTEGER | FK → subcategories | Second-level category |
| subSubcategoryId | INTEGER | FK → subSubcategories | Third-level category |
| status | ENUM | DEFAULT 'pending' | pending, approved, rejected |
| metadata | JSONB | DEFAULT '{}' | AI enrichment data |
| sourceListId | INTEGER | FK → awesomeLists | Import source |
| githubSyncStatus | ENUM | | synced, modified, pending |
| lastGithubSync | TIMESTAMP | | Last sync time |
| createdAt | TIMESTAMP | DEFAULT NOW() | Creation time |
| updatedAt | TIMESTAMP | | Last update |

**metadata JSONB Structure:**
```json
{
  "aiEnriched": true,
  "aiEnrichedAt": "2024-01-15T10:30:00Z",
  "suggestedTags": ["HLS", "streaming", "video"],
  "suggestedCategory": "Protocols & Transport",
  "confidence": 0.85,
  "aiModel": "claude-haiku-4-5",
  "urlScraped": true,
  "scrapedTitle": "Original Page Title",
  "ogImage": "https://...",
  "ogImageBlurhash": "LEHV6nWB2yk8pyo0adR*.7kCMdnj"
}
```

##### categories
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | Auto-increment ID |
| name | VARCHAR(255) | UNIQUE, NOT NULL | Category name |
| slug | VARCHAR(255) | UNIQUE, NOT NULL | URL-safe identifier |
| description | TEXT | | Category description |
| iconName | VARCHAR(100) | | Lucide icon name |
| displayOrder | INTEGER | DEFAULT 0 | Sort order |
| createdAt | TIMESTAMP | DEFAULT NOW() | Creation time |

##### subcategories
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | Auto-increment ID |
| categoryId | INTEGER | FK → categories, NOT NULL | Parent category |
| name | VARCHAR(255) | NOT NULL | Subcategory name |
| slug | VARCHAR(255) | NOT NULL | URL-safe identifier |
| description | TEXT | | Description |
| displayOrder | INTEGER | DEFAULT 0 | Sort order |

**Constraint:** UNIQUE(categoryId, slug)

##### subSubcategories
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | Auto-increment ID |
| subcategoryId | INTEGER | FK → subcategories, NOT NULL | Parent subcategory |
| name | VARCHAR(255) | NOT NULL | Sub-subcategory name |
| slug | VARCHAR(255) | NOT NULL | URL-safe identifier |
| description | TEXT | | Description |
| displayOrder | INTEGER | DEFAULT 0 | Sort order |

**Constraint:** UNIQUE(subcategoryId, slug)

#### B.2.2 User Interaction Tables

##### userFavorites
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| userId | VARCHAR(255) | PK (composite), FK → users | User ID |
| resourceId | INTEGER | PK (composite), FK → resources | Resource ID |
| createdAt | TIMESTAMP | DEFAULT NOW() | Favorited time |

##### userBookmarks
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | Auto-increment ID |
| userId | VARCHAR(255) | FK → users, NOT NULL | User ID |
| resourceId | INTEGER | FK → resources, NOT NULL | Resource ID |
| notes | TEXT | | User notes |
| createdAt | TIMESTAMP | DEFAULT NOW() | Bookmarked time |

**Constraint:** UNIQUE(userId, resourceId)

##### userPreferences
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | Auto-increment ID |
| userId | VARCHAR(255) | FK → users, UNIQUE, NOT NULL | User ID |
| skillLevel | ENUM | DEFAULT 'intermediate' | beginner, intermediate, advanced |
| learningGoals | TEXT[] | DEFAULT '{}' | Array of goal strings |
| preferredCategories | INTEGER[] | DEFAULT '{}' | Category IDs |
| weeklyTimeCommitment | INTEGER | | Hours per week |
| emailNotifications | BOOLEAN | DEFAULT true | Notification preference |
| updatedAt | TIMESTAMP | | Last update |

##### userInteractions
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | Auto-increment ID |
| userId | VARCHAR(255) | FK → users | User ID (nullable for anonymous) |
| resourceId | INTEGER | FK → resources, NOT NULL | Resource ID |
| interactionType | ENUM | NOT NULL | view, click, bookmark, rate, complete |
| value | INTEGER | | Rating value (1-5) or completion % |
| metadata | JSONB | DEFAULT '{}' | Additional context |
| createdAt | TIMESTAMP | DEFAULT NOW() | Interaction time |

**Indexes:** (userId, resourceId, interactionType), (resourceId), (userId)

#### B.2.3 Learning Journey Tables

##### learningJourneys
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | Auto-increment ID |
| title | VARCHAR(255) | NOT NULL | Journey title |
| description | TEXT | | Journey description |
| difficulty | ENUM | NOT NULL | beginner, intermediate, advanced |
| estimatedDuration | VARCHAR(100) | | e.g., "4 weeks" |
| category | VARCHAR(255) | | Focus area |
| isPublic | BOOLEAN | DEFAULT true | Visibility |
| createdBy | VARCHAR(255) | FK → users | Creator |
| status | ENUM | DEFAULT 'draft' | draft, published, archived |
| generationType | ENUM | DEFAULT 'manual' | manual, ai, template |
| createdAt | TIMESTAMP | DEFAULT NOW() | Creation time |
| updatedAt | TIMESTAMP | | Last update |

##### journeySteps
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | Auto-increment ID |
| journeyId | INTEGER | FK → learningJourneys, NOT NULL | Parent journey |
| resourceId | INTEGER | FK → resources | Linked resource (optional) |
| title | VARCHAR(255) | NOT NULL | Step title |
| description | TEXT | | Step description |
| order | INTEGER | NOT NULL | Sequence order |
| estimatedMinutes | INTEGER | | Time estimate |
| isOptional | BOOLEAN | DEFAULT false | Required or optional |

##### userJourneyProgress
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | Auto-increment ID |
| userId | VARCHAR(255) | FK → users, NOT NULL | User ID |
| journeyId | INTEGER | FK → learningJourneys, NOT NULL | Journey ID |
| status | ENUM | DEFAULT 'in_progress' | not_started, in_progress, completed, abandoned |
| completedSteps | INTEGER[] | DEFAULT '{}' | Completed step IDs |
| currentStepId | INTEGER | FK → journeySteps | Current position |
| startedAt | TIMESTAMP | DEFAULT NOW() | Start time |
| completedAt | TIMESTAMP | | Completion time |
| lastActivityAt | TIMESTAMP | | Last activity |

**Constraint:** UNIQUE(userId, journeyId)

#### B.2.4 AI & Enrichment Tables

##### enrichmentJobs
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | Auto-increment ID |
| status | ENUM | DEFAULT 'pending' | pending, processing, completed, failed, cancelled |
| totalResources | INTEGER | NOT NULL | Total to process |
| processedCount | INTEGER | DEFAULT 0 | Successfully processed |
| failedCount | INTEGER | DEFAULT 0 | Failed count |
| skippedCount | INTEGER | DEFAULT 0 | Skipped count |
| filter | ENUM | NOT NULL | all, unenriched |
| batchSize | INTEGER | DEFAULT 10 | Batch size |
| startedBy | VARCHAR(255) | | Admin who started |
| errorLog | JSONB | DEFAULT '[]' | Error details |
| startedAt | TIMESTAMP | | Processing start |
| completedAt | TIMESTAMP | | Processing end |
| createdAt | TIMESTAMP | DEFAULT NOW() | Creation time |

##### enrichmentQueue
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | Auto-increment ID |
| jobId | INTEGER | FK → enrichmentJobs, NOT NULL | Parent job |
| resourceId | INTEGER | FK → resources, NOT NULL | Resource to enrich |
| status | ENUM | DEFAULT 'pending' | pending, processing, completed, failed, skipped |
| retryCount | INTEGER | DEFAULT 0 | Retry attempts (max 3) |
| errorMessage | TEXT | | Last error |
| processedAt | TIMESTAMP | | Processing time |
| createdAt | TIMESTAMP | DEFAULT NOW() | Queue time |

**Indexes:** (jobId, status), (resourceId)

##### resourceEdits
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | Auto-increment ID |
| resourceId | INTEGER | FK → resources, NOT NULL | Target resource |
| userId | VARCHAR(255) | FK → users | Submitter (nullable for anon) |
| editType | ENUM | NOT NULL | correction, enhancement, report |
| proposedChanges | JSONB | NOT NULL | Field changes |
| justification | TEXT | | Reason for edit |
| status | ENUM | DEFAULT 'pending' | pending, approved, rejected |
| aiAnalysis | JSONB | | Claude's assessment |
| reviewedBy | VARCHAR(255) | FK → users | Reviewer |
| reviewedAt | TIMESTAMP | | Review time |
| reviewNotes | TEXT | | Reviewer comments |
| createdAt | TIMESTAMP | DEFAULT NOW() | Submission time |

#### B.2.5 Integration Tables

##### apiKeys
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | Auto-increment ID |
| userId | VARCHAR(255) | FK → users, NOT NULL | Owner |
| name | VARCHAR(255) | NOT NULL | Key name/label |
| keyHash | VARCHAR(255) | UNIQUE, NOT NULL | SHA-256 hash |
| keyPrefix | VARCHAR(10) | NOT NULL | First 8 chars (display) |
| scopes | TEXT[] | DEFAULT '{}' | Permissions array |
| tier | ENUM | DEFAULT 'free' | free, standard, premium |
| expiresAt | TIMESTAMP | | Expiration (nullable = never) |
| lastUsedAt | TIMESTAMP | | Last usage |
| revokedAt | TIMESTAMP | | Revocation time |
| createdAt | TIMESTAMP | DEFAULT NOW() | Creation time |

**Indexes:** (keyHash), (userId)

##### githubSyncQueue
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | Auto-increment ID |
| repositoryUrl | VARCHAR(500) | NOT NULL | GitHub repo URL |
| action | ENUM | NOT NULL | import, export |
| status | ENUM | DEFAULT 'pending' | pending, processing, completed, failed |
| priority | INTEGER | DEFAULT 0 | Processing priority |
| startedBy | VARCHAR(255) | FK → users | Initiator |
| errorMessage | TEXT | | Last error |
| processedAt | TIMESTAMP | | Processing time |
| createdAt | TIMESTAMP | DEFAULT NOW() | Queue time |

##### githubSyncHistory
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | Auto-increment ID |
| repositoryUrl | VARCHAR(500) | NOT NULL | GitHub repo URL |
| action | ENUM | NOT NULL | import, export |
| status | ENUM | NOT NULL | success, partial, failed |
| commitSha | VARCHAR(40) | | Git commit SHA |
| resourcesAdded | INTEGER | DEFAULT 0 | New resources |
| resourcesUpdated | INTEGER | DEFAULT 0 | Updated resources |
| resourcesRemoved | INTEGER | DEFAULT 0 | Removed resources |
| conflictsResolved | INTEGER | DEFAULT 0 | Conflicts handled |
| snapshot | JSONB | | State snapshot |
| errorLog | JSONB | DEFAULT '[]' | Errors |
| startedBy | VARCHAR(255) | FK → users | Initiator |
| duration | INTEGER | | Processing time (ms) |
| createdAt | TIMESTAMP | DEFAULT NOW() | Sync time |

#### B.2.6 Support Tables

##### tags
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | Auto-increment ID |
| name | VARCHAR(100) | UNIQUE, NOT NULL | Tag name |
| slug | VARCHAR(100) | UNIQUE, NOT NULL | URL-safe identifier |
| description | TEXT | | Tag description |
| usageCount | INTEGER | DEFAULT 0 | Resource count |
| createdAt | TIMESTAMP | DEFAULT NOW() | Creation time |

##### resourceTags
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| resourceId | INTEGER | PK (composite), FK → resources | Resource ID |
| tagId | INTEGER | PK (composite), FK → tags | Tag ID |
| createdAt | TIMESTAMP | DEFAULT NOW() | Association time |

##### sessions
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| sid | VARCHAR(255) | PK | Session ID |
| sess | JSONB | NOT NULL | Session data |
| expire | TIMESTAMP | NOT NULL | Expiration |

**Index:** (expire) for cleanup

##### resourceAuditLog
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | Auto-increment ID |
| resourceId | INTEGER | NOT NULL | Resource ID (no FK - preserves after delete) |
| action | ENUM | NOT NULL | create, update, delete, approve, reject |
| userId | VARCHAR(255) | | Actor |
| previousState | JSONB | | Before state |
| newState | JSONB | | After state |
| metadata | JSONB | DEFAULT '{}' | Additional context |
| createdAt | TIMESTAMP | DEFAULT NOW() | Action time |

**Index:** (resourceId), (userId), (action)

##### awesomeLists
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | Auto-increment ID |
| name | VARCHAR(255) | NOT NULL | List name |
| url | VARCHAR(500) | UNIQUE, NOT NULL | Repository URL |
| description | TEXT | | List description |
| lastImported | TIMESTAMP | | Last import time |
| resourceCount | INTEGER | DEFAULT 0 | Imported resources |
| status | ENUM | DEFAULT 'active' | active, archived, failed |
| createdAt | TIMESTAMP | DEFAULT NOW() | Creation time |

---

## Section C: API Specification

### C.1 Authentication

#### Session-Based Authentication (Primary)

**Login Flow:**
```
POST /api/auth/login
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "password": "password123"
}

Response (200):
{
  "user": {
    "id": "user_123",
    "username": "johndoe",
    "email": "user@example.com",
    "role": "user"
  }
}

Response (401):
{
  "error": "Invalid credentials"
}
```

**Session Check:**
```
GET /api/auth/user

Response (200 - Authenticated):
{
  "user": { ... }
}

Response (200 - Not Authenticated):
{
  "user": null
}
```

**Logout:**
```
POST /api/auth/logout

Response (200):
{
  "message": "Logged out successfully"
}
```

#### API Key Authentication (Secondary)

**Header Format:**
```
Authorization: Bearer al_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Rate Limits by Tier:**
| Tier | Requests/Hour | Endpoints |
|------|---------------|-----------|
| free | 60 | Read-only |
| standard | 1,000 | Read + Write |
| premium | 10,000 | Full access |

### C.2 Endpoint Inventory

#### Auth Module (3 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | None | User login |
| POST | `/api/auth/logout` | Session | User logout |
| GET | `/api/auth/user` | Optional | Get current user |

#### Resources Module (8 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/resources` | None | List resources (paginated) |
| GET | `/api/resources/:id` | None | Get resource details |
| POST | `/api/resources` | User | Create resource (pending approval) |
| PUT | `/api/resources/:id` | Admin | Update resource |
| DELETE | `/api/resources/:id` | Admin | Delete resource |
| POST | `/api/resources/:id/approve` | Admin | Approve pending resource |
| POST | `/api/resources/:id/reject` | Admin | Reject pending resource |
| POST | `/api/resources/:id/edit` | User | Submit edit suggestion |

**List Resources Request:**
```
GET /api/resources?page=1&limit=20&category=1&status=approved&search=video

Query Parameters:
- page: number (default: 1)
- limit: number (default: 20, max: 100)
- category: number (category ID)
- subcategory: number (subcategory ID)
- subSubcategory: number (sub-subcategory ID)
- status: string (pending, approved, rejected)
- search: string (full-text search)
- sortBy: string (name, createdAt, updatedAt)
- sortOrder: string (asc, desc)
```

**List Resources Response:**
```json
{
  "resources": [
    {
      "id": 1,
      "name": "HLS.js",
      "url": "https://github.com/video-dev/hls.js",
      "description": "JavaScript HLS client using Media Source Extensions",
      "categoryId": 3,
      "subcategoryId": 12,
      "status": "approved",
      "metadata": {
        "aiEnriched": true,
        "suggestedTags": ["HLS", "streaming"]
      },
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2650,
    "totalPages": 133
  }
}
```

#### Categories Module (3 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/categories` | None | List all categories with hierarchy |
| GET | `/api/categories/:id` | None | Get category with subcategories |
| GET | `/api/categories/:id/resources` | None | Get resources in category |

**Categories Response:**
```json
{
  "categories": [
    {
      "id": 1,
      "name": "Video Players",
      "slug": "video-players",
      "description": "Web and native video player implementations",
      "resourceCount": 45,
      "subcategories": [
        {
          "id": 10,
          "name": "Web Players",
          "slug": "web-players",
          "resourceCount": 28,
          "subSubcategories": [
            {
              "id": 100,
              "name": "React Players",
              "slug": "react-players",
              "resourceCount": 12
            }
          ]
        }
      ]
    }
  ]
}
```

#### User Module (8 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/user/favorites` | User | Get user's favorites |
| POST | `/api/user/favorites/:resourceId` | User | Add favorite |
| DELETE | `/api/user/favorites/:resourceId` | User | Remove favorite |
| GET | `/api/user/bookmarks` | User | Get user's bookmarks |
| POST | `/api/user/bookmarks/:resourceId` | User | Add bookmark |
| DELETE | `/api/user/bookmarks/:resourceId` | User | Remove bookmark |
| GET | `/api/user/preferences` | User | Get preferences |
| PUT | `/api/user/preferences` | User | Update preferences |

**Preferences Request/Response:**
```json
{
  "skillLevel": "intermediate",
  "learningGoals": ["Build streaming app", "Learn video encoding"],
  "preferredCategories": [1, 3, 7],
  "weeklyTimeCommitment": 10,
  "emailNotifications": true
}
```

#### Journeys Module (5 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/journeys` | None | List public journeys |
| GET | `/api/journeys/:id` | None | Get journey with steps |
| POST | `/api/journeys/:id/start` | User | Start a journey |
| PUT | `/api/journeys/:id/progress` | User | Update progress |
| GET | `/api/user/journeys` | User | Get user's journeys |

**Journey Response:**
```json
{
  "id": 1,
  "title": "Video Streaming Fundamentals",
  "description": "Learn the basics of video streaming from encoding to delivery",
  "difficulty": "beginner",
  "estimatedDuration": "4 weeks",
  "category": "Streaming",
  "steps": [
    {
      "id": 1,
      "order": 1,
      "title": "Understanding Video Codecs",
      "description": "Learn about H.264, H.265, VP9, and AV1",
      "resourceId": 42,
      "resource": { ... },
      "estimatedMinutes": 30
    }
  ],
  "userProgress": {
    "status": "in_progress",
    "completedSteps": [1, 2],
    "currentStepId": 3,
    "startedAt": "2024-01-10T00:00:00Z"
  }
}
```

#### Admin Module (6 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/stats` | Admin | Dashboard statistics |
| GET | `/api/admin/users` | Admin | List all users |
| PUT | `/api/admin/users/:id/role` | Admin | Update user role |
| GET | `/api/admin/pending` | Admin | Get pending resources |
| GET | `/api/admin/edits` | Admin | Get pending edits |
| POST | `/api/admin/edits/:id/review` | Admin | Review edit |

**Admin Stats Response:**
```json
{
  "totalResources": 2650,
  "pendingResources": 15,
  "totalUsers": 1250,
  "activeUsers": 340,
  "totalCategories": 12,
  "pendingEdits": 8,
  "enrichmentStats": {
    "enriched": 2400,
    "pending": 250,
    "lastJobAt": "2024-01-15T10:30:00Z"
  },
  "recentActivity": [...]
}
```

#### GitHub Sync Module (9 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/github/import` | Admin | Start import from repo |
| POST | `/api/github/export` | Admin | Start export to repo |
| GET | `/api/github/queue` | Admin | Get sync queue |
| GET | `/api/github/queue/:id` | Admin | Get queue item status |
| DELETE | `/api/github/queue/:id` | Admin | Cancel queue item |
| GET | `/api/github/history` | Admin | Get sync history |
| GET | `/api/github/repositories` | Admin | Get configured repos |
| POST | `/api/github/repositories` | Admin | Add repository |
| DELETE | `/api/github/repositories/:id` | Admin | Remove repository |

**Import Request:**
```json
{
  "repositoryUrl": "https://github.com/sindresorhus/awesome-nodejs",
  "options": {
    "conflictResolution": "skip",
    "validateLinks": true,
    "autoApprove": false
  }
}
```

**Import Response:**
```json
{
  "queueId": 42,
  "status": "pending",
  "message": "Import queued successfully"
}
```

#### Enrichment Module (4 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/enrichment/start` | Admin | Start batch enrichment |
| GET | `/api/enrichment/jobs` | Admin | List enrichment jobs |
| GET | `/api/enrichment/jobs/:id` | Admin | Get job status |
| DELETE | `/api/enrichment/jobs/:id` | Admin | Cancel job |

**Start Enrichment Request:**
```json
{
  "filter": "unenriched",
  "batchSize": 10
}
```

**Job Status Response:**
```json
{
  "id": 5,
  "status": "processing",
  "filter": "unenriched",
  "batchSize": 10,
  "totalResources": 250,
  "processedCount": 87,
  "failedCount": 3,
  "skippedCount": 5,
  "progress": 34.8,
  "estimatedTimeRemaining": "45 minutes",
  "startedAt": "2024-01-15T10:30:00Z",
  "errors": [
    {
      "resourceId": 123,
      "error": "URL timeout",
      "timestamp": "2024-01-15T10:35:00Z"
    }
  ]
}
```

### C.3 Error Response Format

All errors follow a consistent format:

```json
{
  "error": "Error message description",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional context if applicable"
  }
}
```

**Common Error Codes:**
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Not authenticated |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid input |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Section D: Frontend Specification

### D.1 Pages Inventory

| Route | Component | Auth | Description |
|-------|-----------|------|-------------|
| `/` | Home | None | Landing page with featured resources |
| `/category/:slug` | Category | None | Category view with resources |
| `/category/:cat/:sub` | Subcategory | None | Subcategory view |
| `/category/:cat/:sub/:subsub` | SubSubcategory | None | Sub-subcategory view |
| `/resource/:id` | ResourceDetail | None | Single resource detail |
| `/about` | About | None | About page |
| `/advanced` | Advanced | None | Advanced search |
| `/submit` | SubmitResource | None | Submit new resource |
| `/journeys` | Journeys | None | Learning journeys list |
| `/journeys/:id` | JourneyDetail | None | Journey detail with steps |
| `/login` | Login | None | Login page |
| `/profile` | Profile | User | User profile (AuthGuard) |
| `/bookmarks` | Bookmarks | User | User bookmarks (AuthGuard) |
| `/admin` | AdminDashboard | Admin | Admin panel (AdminGuard) |
| `/error` | ErrorPage | None | Error display |
| `*` | NotFound | None | 404 page |

### D.2 Component Architecture

#### Layout Components

**MainLayout** (`components/layout/new/MainLayout.tsx`)
- Wraps all pages with consistent structure
- Contains: TopBar, ModernSidebar, Footer
- Manages sidebar open/close state
- Implements skip-to-content accessibility

**TopBar** (`components/layout/TopBar.tsx`)
- Logo and navigation
- Search trigger (Ctrl+K)
- User menu (auth state)
- Mobile menu toggle

**ModernSidebar** (`components/layout/ModernSidebar.tsx`)
- Collapsible navigation
- Category tree
- Quick links
- Mobile responsive (sheet on small screens)

#### Admin Components

**GenericCrudManager** (`components/admin/GenericCrudManager.tsx`)
- **Lines:** 3,393
- **Purpose:** Reusable CRUD interface for any entity
- **Features:**
  - Type-safe configuration via `CrudConfig<T>`
  - 7 field types: text, number, textarea, select, multiselect, file, richtext
  - Validation: required, minLength, maxLength, pattern, custom
  - Cascading dropdowns (Platform → Category → Subcategory)
  - Auto-generation (slug from name)
  - Bulk operations (delete, export)
  - Undo/redo history
  - Audit trail

**Usage Example:**
```tsx
<GenericCrudManager<Category>
  config={{
    display: {
      entityName: "Category",
      icon: FolderIcon,
      columns: ["name", "resourceCount"]
    },
    endpoints: {
      list: "/api/admin/categories",
      create: "/api/admin/categories",
      update: "/api/admin/categories/:id",
      delete: "/api/admin/categories/:id"
    },
    fields: [
      {
        name: "name",
        type: "text",
        label: "Category Name",
        validation: { required: true, maxLength: 100 }
      },
      {
        name: "slug",
        type: "text",
        autoGenerateFrom: "name",
        transform: (v) => slugify(v)
      }
    ]
  }}
/>
```

#### UI Components (71 total)

**Primitives (shadcn/ui):**
- button, input, textarea, select
- card, dialog, sheet, popover
- tabs, accordion, collapsible
- table, pagination
- toast, alert, badge
- checkbox, radio, switch
- dropdown-menu, context-menu
- avatar, separator, skeleton

**Custom Components:**
- search-dialog (Ctrl+K command palette)
- analytics-dashboard (charts, metrics)
- resource-card (resource display)
- category-tree (hierarchical nav)
- theme-selector (dark mode only)

### D.3 State Management

#### TanStack Query (Server State)
```tsx
// Configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      retry: false
    }
  }
});

// Usage Pattern
const { data, isLoading, error } = useQuery({
  queryKey: ['/api/resources', filters],
  queryFn: () => apiRequest(`/api/resources?${params}`)
});

// Mutations with Invalidation
const mutation = useMutation({
  mutationFn: (data) => apiRequest('/api/resources', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
    toast.success('Resource created');
  }
});
```

#### Context (UI State Only)
| Context | Purpose |
|---------|---------|
| ThemeProviderContext | Dark mode (forced) |
| SidebarContext | Sidebar open/close |
| FormFieldContext | Form validation |

#### localStorage (Persistence)
```tsx
// User Profile (useUserProfile hook)
{
  userId: "user_<timestamp>_<random>",
  preferredCategories: [],
  skillLevel: "intermediate",
  viewHistory: [], // Last 100
  bookmarks: [],
  completedResources: [],
  ratings: {}
}

// AI Recommendations Cache (5-min TTL)
{
  recommendations: [...],
  timestamp: 1705312200000
}
```

### D.4 Styling System

#### Design Tokens (CSS Variables)
```css
/* Primary Colors (OKLCH) */
--primary: oklch(0.75 0.3225 328.3634);     /* Pink/Magenta */
--accent: oklch(0.7072 0.1679 242.0420);    /* Blue */
--background: oklch(0 0 0);                  /* Pure Black */
--foreground: oklch(1.0000 0 0);             /* Pure White */
--card: oklch(0.1684 0 0);                   /* Dark Gray */
--border: oklch(0.3211 0 0);                 /* Medium Gray */

/* Design Characteristics */
--radius: 0rem;        /* Sharp corners (terminal aesthetic) */
--font-sans: JetBrains Mono;
--font-mono: JetBrains Mono;
```

#### Mobile Optimizations
- Touch targets: 44px minimum
- Safe area insets for notch/home indicator
- Font-size: 16px on inputs (prevents iOS zoom)
- Hardware-accelerated animations
- Respects prefers-reduced-motion

---

## Section E: Background Jobs Specification

### E.1 Enrichment Job System

**Purpose:** Batch AI-powered metadata extraction and tagging

**Job Lifecycle:**
```
pending → processing → completed/failed/cancelled
```

**Trigger:** Manual via Admin UI or API
```
POST /api/enrichment/start
{ "filter": "unenriched", "batchSize": 10 }
```

**Processing Logic:**
1. Create `enrichmentJobs` record with status='pending'
2. Query resources matching filter (all or unenriched)
3. Create `enrichmentQueue` items for each resource
4. Update job status to 'processing'
5. Process in batches:
   - For each resource:
     a. Fetch URL metadata via `urlScraper`
     b. Call Claude AI for tags/categories via `tagging`
     c. Merge results into `resource.metadata`
     d. Update `enrichmentQueue` status
   - 2-second delay between batches
   - Rate limit: 1 request/second to Claude
6. Update job counters (processed, failed, skipped)
7. Set final status (completed/failed)

**Retry Logic:**
- Max 3 retries per resource
- Exponential backoff: 1s, 2s, 3s
- Permanent failure after 3 attempts

**Skip Conditions:**
- Invalid URL format
- URL not in allowed domains
- Resource marked as manually curated

**Output (resource.metadata):**
```json
{
  "aiEnriched": true,
  "aiEnrichedAt": "2024-01-15T10:30:00Z",
  "suggestedTags": ["HLS", "streaming", "video"],
  "suggestedCategory": "Protocols & Transport",
  "confidence": 0.85,
  "aiModel": "claude-haiku-4-5",
  "urlScraped": true,
  "scrapedTitle": "HLS.js - HTTP Live Streaming for JavaScript",
  "ogImage": "https://...",
  "ogImageBlurhash": "LEHV6n..."
}
```

### E.2 GitHub Sync Queue

**Purpose:** Bidirectional synchronization with GitHub awesome-list repositories

**Actions:**
| Action | Direction | Description |
|--------|-----------|-------------|
| import | GitHub → DB | Parse README.md, extract resources |
| export | DB → GitHub | Generate README.md, create commit |

**Import Flow:**
1. Fetch raw README.md from GitHub API
2. Validate format with awesome-lint
3. Parse markdown sections into structured data
4. Match existing resources by URL
5. Resolve conflicts (skip/update/create)
6. Ensure category hierarchy exists
7. Insert/update resources
8. Record in `githubSyncHistory`

**Export Flow:**
1. Fetch all approved resources
2. Calculate diff from last snapshot
3. Generate awesome-lint compliant markdown
4. Validate generated content
5. Create Git commit via GitHub API
6. Update `resource.githubSyncStatus`
7. Store history with snapshot

**Conflict Resolution:**
| Scenario | Action |
|----------|--------|
| New URL | Create resource |
| Same URL, different content | Update (merge descriptions) |
| Same URL, same content | Skip |
| Deleted from GitHub | Flag for review (don't auto-delete) |

### E.3 Link Health Scheduler (Disabled)

**Current Status:** Stub implementation only

**Planned Purpose:** Periodic URL health monitoring

**Planned Logic:**
```typescript
// Every 24 hours
1. Select resources not checked in 7 days
2. For each URL:
   - HEAD request with 10s timeout
   - Record status code
   - Flag dead links (4xx, 5xx, timeout)
3. Update resource.metadata.linkHealth
4. Notify admins of broken links
```

---

## Section F: Admin Panel Specification

### F.1 Admin Dashboard

**Route:** `/admin`
**Guard:** AdminGuard (role === 'admin')

**Sections:**

#### Statistics Overview
| Metric | Source |
|--------|--------|
| Total Resources | COUNT(resources) |
| Pending Resources | COUNT(resources WHERE status='pending') |
| Total Users | COUNT(users) |
| Active Users (30d) | COUNT(users WHERE lastActive > 30d ago) |
| Pending Edits | COUNT(resourceEdits WHERE status='pending') |
| Enriched Resources | COUNT(resources WHERE metadata->>'aiEnriched' = 'true') |

#### Quick Actions
- Start Enrichment Job
- View Pending Resources
- View Pending Edits
- Export Resources

### F.2 Resource Management

**Component:** `ResourceManager.tsx` (uses GenericCrudManager)

**Capabilities:**
| Feature | Description |
|---------|-------------|
| List | Paginated with filters (status, category, search) |
| Create | Form with category cascade |
| Edit | All fields editable |
| Delete | Soft delete with audit |
| Approve | Change status pending → approved |
| Reject | Change status pending → rejected |
| Bulk Delete | Multi-select with confirmation |
| Export | CSV/JSON download |

### F.3 Category Management

**Component:** `CategoryManager.tsx`

**Hierarchy Management:**
- Categories (top-level)
- Subcategories (linked to categories)
- Sub-subcategories (linked to subcategories)

**Each Level Supports:**
- CRUD operations
- Reordering (displayOrder)
- Icon assignment (iconName)
- Description editing

### F.4 User Management

**Capabilities:**
| Action | Description |
|--------|-------------|
| List Users | Paginated with search |
| View Profile | User details, activity |
| Change Role | user ↔ moderator ↔ admin |
| Disable Account | Soft ban |

### F.5 Moderation Queue

**Pending Resources:**
- Review submitted resources
- Preview with metadata
- Approve/Reject with notes

**Pending Edits:**
- View proposed changes (diff view)
- See AI analysis recommendation
- Approve/Reject with feedback

### F.6 GitHub Sync Panel

**Features:**
| Feature | Description |
|---------|-------------|
| Configure Repos | Add/remove sync targets |
| Manual Import | Trigger import from specific repo |
| Manual Export | Trigger export to specific repo |
| View Queue | Monitor pending sync operations |
| View History | Audit trail of past syncs |

### F.7 Enrichment Panel

**Features:**
| Feature | Description |
|---------|-------------|
| Start Job | Configure filter and batch size |
| Monitor Progress | Real-time progress bar |
| View Errors | Error log with resource links |
| Cancel Job | Stop in-progress job |
| Job History | Past jobs with statistics |

---

## Section G: AI Services Specification

### G.1 Claude Service

**File:** `server/ai/claudeService.ts`
**Pattern:** Singleton
**Model:** claude-haiku-4-5 (cost: $0.25/1M input, $1.25/1M output)

**Capabilities:**
| Method | Purpose | Cache TTL |
|--------|---------|-----------|
| `generateResponse()` | General prompts | 1 hour |
| `analyzeURL()` | Extract metadata | 24 hours |
| `batchProcess()` | Sequential batch | N/A |
| `testConnection()` | Health check | N/A |

**Security - Domain Allowlist (78 domains):**
```
github.com, gitlab.com, bitbucket.org
npmjs.com, pypi.org, crates.io
stackoverflow.com, medium.com, dev.to
youtube.com, vimeo.com, twitch.tv
developer.mozilla.org, w3.org
... (78 total)
```

**Rate Limiting:**
- 1 second delay between requests
- Exponential backoff on 429

### G.2 Enrichment Service

**File:** `server/ai/enrichmentService.ts`

**Input:**
```typescript
{
  filter: 'all' | 'unenriched',
  batchSize: number,  // default: 10
  startedBy?: string
}
```

**Output (per resource):**
```typescript
{
  aiEnriched: boolean,
  aiEnrichedAt: string,
  suggestedTags: string[],
  suggestedCategory: string,
  confidence: number,
  aiModel: string,
  // URL scraping
  urlScraped: boolean,
  scrapedTitle: string,
  ogImage: string,
  ogImageBlurhash: string
}
```

### G.3 Recommendation Engine

**File:** `server/ai/recommendationEngine.ts`

**Input (User Profile):**
```typescript
{
  userId: string,
  preferredCategories: string[],
  skillLevel: 'beginner' | 'intermediate' | 'advanced',
  learningGoals: string[],
  viewHistory: string[],
  bookmarks: string[],
  completedResources: string[],
  ratings: Record<string, number>,
  completedJourneys: number[],
  journeyProgress: Array<{...}>
}
```

**Output:**
```typescript
{
  resource: Resource,
  confidence: number,      // 0-100
  reason: string,          // Human-readable explanation
  type: 'ai_powered' | 'rule_based' | 'hybrid'
}[]
```

**Algorithm:**
1. Fetch user's full profile from database
2. Apply skill level filter
3. Exclude already completed resources
4. Score by category preference
5. Score by learning goal relevance
6. Apply recency boost for updated resources
7. Apply popularity boost
8. Return top 10 with explanations

**Cache:** 5 minutes per user

### G.4 Learning Path Generator

**File:** `server/ai/learningPathGenerator.ts`

**Input:**
```typescript
{
  topic: string,
  skillLevel: 'beginner' | 'intermediate' | 'advanced',
  timeCommitment: number,  // hours per week
  existingKnowledge?: string[]
}
```

**Output:**
```typescript
{
  id: string,
  title: string,
  description: string,
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  estimatedDuration: string,
  category: string,
  resources: Resource[],
  milestones: Array<{
    title: string,
    description: string,
    resourceIds: number[]
  }>,
  prerequisites: string[],
  learningObjectives: string[],
  generationType: 'ai' | 'rule-based' | 'template'
}
```

**Templates (Pre-defined):**
| Template | Difficulty | Duration |
|----------|------------|----------|
| Video Encoding Fundamentals | beginner | 4 weeks |
| Advanced Video Encoding | advanced | 6 weeks |
| Live Streaming Basics | beginner | 3 weeks |
| Web Video Player Development | intermediate | 5 weeks |

### G.5 Related Resources Engine

**File:** `server/ai/relatedResourcesEngine.ts`

**Purpose:** Find similar resources based on content, tags, and user behavior

**Similarity Factors:**
| Factor | Weight |
|--------|--------|
| Same subcategory | 30% |
| Shared tags | 25% |
| Co-viewed (users who viewed A also viewed B) | 20% |
| Text similarity (title + description) | 15% |
| Same category | 10% |

**Output:** Top 5 related resources with similarity scores

---

## Appendix A: Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Authentication
SESSION_SECRET=<random-string>
REPL_ID=<replit-app-id>
ISSUER_URL=https://replit.com/oidc

# AI Services
ANTHROPIC_API_KEY=sk-ant-...

# GitHub Integration
GITHUB_TOKEN=ghp_...
GITHUB_WEBHOOK_SECRET=<random-string>

# Analytics (optional)
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Server
PORT=5000
NODE_ENV=production
```

---

## Appendix B: File Structure

```
awesome-list-site/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/          # Admin panel components
│   │   │   ├── ai/             # AI feature components
│   │   │   ├── animations/     # Animation utilities
│   │   │   ├── auth/           # Auth guards
│   │   │   ├── layout/         # Layout components
│   │   │   ├── resource/       # Resource components
│   │   │   └── ui/             # UI primitives (71)
│   │   ├── hooks/              # Custom hooks (14)
│   │   ├── lib/                # Utilities
│   │   ├── pages/              # Page components (16)
│   │   ├── styles/             # CSS files
│   │   ├── App.tsx             # Root component
│   │   ├── main.tsx            # Client entry
│   │   └── entry-server.tsx    # SSR entry
│   └── index.html
├── server/
│   ├── ai/                     # AI services
│   │   ├── claudeService.ts
│   │   ├── enrichmentService.ts
│   │   ├── recommendationEngine.ts
│   │   ├── learningPathGenerator.ts
│   │   └── ...
│   ├── db/                     # Database
│   │   ├── index.ts
│   │   └── migrations/
│   ├── github/                 # GitHub sync
│   │   └── syncService.ts
│   ├── middleware/             # Express middleware
│   │   ├── apiAuth.ts
│   │   └── rateLimit.ts
│   ├── modules/                # Route modules (8)
│   │   ├── auth/
│   │   ├── resources/
│   │   ├── categories/
│   │   ├── user/
│   │   ├── journeys/
│   │   ├── admin/
│   │   ├── github-sync/
│   │   └── enrichment/
│   ├── repositories/           # Data access (12)
│   ├── routes.ts               # Legacy routes
│   └── index.ts                # Server entry
├── shared/
│   └── schema.ts               # Drizzle schema
├── docs/
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── CODE-MAP.md
│   ├── COMPONENT-LIBRARY.md
│   └── DESIGN-SYSTEM.md
└── package.json
```

---

## Appendix C: Key Metrics

| Metric | Value |
|--------|-------|
| **Total Resources** | ~2,650 |
| **Categories** | 12 top-level |
| **API Endpoints** | 46+ |
| **React Components** | 92 |
| **TypeScript Files** | 149 (client) |
| **Database Tables** | 20+ |
| **Custom Hooks** | 14 |
| **Lines of Code** | ~50,000 |
| **Documentation** | 29,100 lines |

---

*This specification was generated through comprehensive codebase analysis on 2026-02-02. It reflects the current state of the Awesome List Management Platform and should be updated as the codebase evolves.*

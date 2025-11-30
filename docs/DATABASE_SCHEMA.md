# Database Schema Documentation

**Last Updated**: 2025-11-30
**Database**: PostgreSQL 15 via Supabase
**ORM**: Drizzle ORM with TypeScript
**Schema File**: `/shared/schema.ts`

---

## Overview

### Key Statistics
- **Total Tables**: 21 tables
- **Total Resources**: 2,644+ video development resources
- **Primary Key Type**: UUID (via `uuid_generate_v4()`)
- **Authentication**: Supabase Auth (replaces local `users` table)
- **Row-Level Security**: Enabled on user-facing tables

### Database Architecture

```
Core Content (6 tables)
├─ categories (9 rows)
├─ subcategories (~30-40 rows)
├─ sub_subcategories (~60-80 rows)
├─ resources (2,644+ rows)
├─ tags (~100-200 rows)
└─ resource_tags (junction)

User Data (7 tables)
├─ users (legacy, to be replaced by auth.users)
├─ user_favorites
├─ user_bookmarks
├─ user_preferences
├─ user_interactions
├─ user_journey_progress
└─ sessions (legacy, to be removed)

Learning System (3 tables)
├─ learning_journeys
├─ journey_steps
└─ awesome_lists

GitHub Integration (3 tables)
├─ github_sync_queue
├─ github_sync_history
└─ resource_audit_log

AI Processing (3 tables)
├─ enrichment_jobs
├─ enrichment_queue
└─ resource_edits
```

---

## Table Relationships

### Hierarchical Content Structure
The database implements a 3-level category hierarchy for organizing video resources:

1. **Categories** → Subcategories → Sub-subcategories → Resources
   - Example: "Encoding & Codecs" → "Codecs" → "AV1" → [av1dec, rav1e, dav1d]

2. **Tags** provide cross-cutting classification via many-to-many relationships
   - Resources can have multiple tags
   - Tags can be applied to multiple resources

### User-Resource Relationships
Users interact with resources through multiple relationship types:

- **Favorites** (user_favorites): Quick-access bookmarking
- **Bookmarks** (user_bookmarks): Saved resources with notes
- **Interactions** (user_interactions): Analytics tracking (views, clicks, ratings)
- **Journey Progress** (user_journey_progress): Learning path completion tracking
- **Submissions** (resources.submitted_by): User-contributed resources
- **Edit Suggestions** (resource_edits): Community-suggested improvements

### Learning Journey Flow
```
learning_journeys (1) → (many) journey_steps → (1) resources
                    ↓
        user_journey_progress (tracks completion)
```

### GitHub Sync Workflow
```
github_sync_queue (pending operations)
        ↓ process
github_sync_history (completed syncs)
        ↓ audit trail
resource_audit_log (detailed change tracking)
```

### AI Enrichment Pipeline
```
enrichment_jobs (batch operations)
        ↓ creates
enrichment_queue (individual tasks)
        ↓ updates
resources.metadata (AI-generated tags, categories)
```

---

## Core Tables

### resources
**Purpose**: Main resource catalog with approval workflow

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT uuid_generate_v4() | Unique identifier |
| title | text | NOT NULL | Resource name/title |
| url | text | NOT NULL | Resource URL (must be valid HTTP/HTTPS) |
| description | text | NOT NULL, DEFAULT '' | Detailed description |
| category | text | NOT NULL | Top-level category (denormalized) |
| subcategory | text | NULLABLE | Second-level category |
| sub_subcategory | text | NULLABLE | Third-level category |
| status | text | DEFAULT 'approved' | pending/approved/rejected/archived |
| submitted_by | varchar | FK → users.id, ON DELETE CASCADE | User who submitted |
| approved_by | varchar | FK → users.id | Admin who approved |
| approved_at | timestamptz | NULLABLE | Approval timestamp |
| github_synced | boolean | DEFAULT false | Whether synced to GitHub |
| last_synced_at | timestamptz | NULLABLE | Last GitHub sync time |
| metadata | jsonb | DEFAULT '{}' | AI-generated metadata, tags, enrichment data |
| created_at | timestamptz | DEFAULT NOW() | Creation timestamp |
| updated_at | timestamptz | DEFAULT NOW() | Last update timestamp |

**Indexes**:
- `idx_resources_status` (status)
- `idx_resources_status_category` (status, category) - **Critical for filtering approved resources**
- `idx_resources_category` (category)

**Relationships**:
- `submitted_by` → `users.id` (ON DELETE CASCADE)
- `approved_by` → `users.id`
- ← `resource_tags.resource_id` (many-to-many tags)
- ← `user_favorites.resource_id`
- ← `user_bookmarks.resource_id`
- ← `user_interactions.resource_id`
- ← `journey_steps.resource_id`
- ← `enrichment_queue.resource_id`
- ← `resource_edits.resource_id`
- ← `resource_audit_log.resource_id`

**Sample Queries**:
```sql
-- Get all approved resources in a category
SELECT * FROM resources
WHERE status = 'approved' AND category = 'Encoding & Codecs'
ORDER BY created_at DESC;

-- Get pending resources for admin approval
SELECT r.*, u.email as submitted_by_email
FROM resources r
LEFT JOIN users u ON r.submitted_by = u.id
WHERE r.status = 'pending'
ORDER BY r.created_at ASC;

-- Full-text search (requires tsvector column)
SELECT * FROM resources
WHERE search_vector @@ to_tsquery('english', 'ffmpeg & encoding')
AND status = 'approved'
ORDER BY ts_rank(search_vector, to_tsquery('english', 'ffmpeg & encoding')) DESC;
```

---

### categories
**Purpose**: Top-level resource categories (9 entries)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT uuid_generate_v4() | Unique identifier |
| name | text | NOT NULL, UNIQUE | Category display name |
| slug | text | NOT NULL, UNIQUE | URL-friendly identifier |

**Relationships**:
- ← `subcategories.category_id` (one-to-many)

**Sample Data**:
```sql
INSERT INTO categories (name, slug) VALUES
('Encoding & Codecs', 'encoding-codecs'),
('Players', 'players'),
('Streaming', 'streaming'),
('Learning Resources', 'learning-resources');
```

**Sample Queries**:
```sql
-- Get all categories with resource counts
SELECT c.name, c.slug, COUNT(r.id) as resource_count
FROM categories c
LEFT JOIN resources r ON r.category = c.name AND r.status = 'approved'
GROUP BY c.id, c.name, c.slug
ORDER BY c.name;
```

---

### subcategories
**Purpose**: Second-level categories (30-40 entries estimated)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT uuid_generate_v4() | Unique identifier |
| name | text | NOT NULL | Subcategory display name |
| slug | text | NOT NULL | URL-friendly identifier |
| category_id | uuid | FK → categories.id, ON DELETE CASCADE | Parent category |

**Relationships**:
- `category_id` → `categories.id` (ON DELETE CASCADE)
- ← `sub_subcategories.subcategory_id` (one-to-many)

**Sample Queries**:
```sql
-- Get subcategories for a category
SELECT sc.* FROM subcategories sc
JOIN categories c ON sc.category_id = c.id
WHERE c.slug = 'encoding-codecs'
ORDER BY sc.name;

-- Get subcategory with resource count
SELECT sc.name, sc.slug, COUNT(r.id) as resource_count
FROM subcategories sc
LEFT JOIN resources r ON r.subcategory = sc.name AND r.status = 'approved'
WHERE sc.category_id = 'category-uuid-here'
GROUP BY sc.id, sc.name, sc.slug;
```

---

### sub_subcategories
**Purpose**: Third-level categories (60-80 entries estimated)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT uuid_generate_v4() | Unique identifier |
| name | text | NOT NULL | Sub-subcategory display name |
| slug | text | NOT NULL | URL-friendly identifier |
| subcategory_id | uuid | FK → subcategories.id, ON DELETE CASCADE | Parent subcategory |

**Relationships**:
- `subcategory_id` → `subcategories.id` (ON DELETE CASCADE)

**Sample Queries**:
```sql
-- Get full category hierarchy for a resource
SELECT
  c.name as category,
  sc.name as subcategory,
  ssc.name as sub_subcategory,
  r.title
FROM resources r
JOIN categories c ON r.category = c.name
LEFT JOIN subcategories sc ON r.subcategory = sc.name AND sc.category_id = c.id
LEFT JOIN sub_subcategories ssc ON r.sub_subcategory = ssc.name AND ssc.subcategory_id = sc.id
WHERE r.id = 'resource-uuid-here';
```

---

### tags
**Purpose**: Cross-cutting resource classification (100-200 tags estimated)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT uuid_generate_v4() | Unique identifier |
| name | text | NOT NULL, UNIQUE | Tag display name |
| slug | text | NOT NULL, UNIQUE | URL-friendly identifier |
| created_at | timestamptz | DEFAULT NOW() | Creation timestamp |

**Relationships**:
- ← `resource_tags.tag_id` (many-to-many via junction)

**Sample Tags**:
- `open-source`, `commercial`, `library`, `tool`, `beginner-friendly`, `advanced`, `tutorial`, `documentation`

**Sample Queries**:
```sql
-- Get all tags with usage counts
SELECT t.name, t.slug, COUNT(rt.resource_id) as usage_count
FROM tags t
LEFT JOIN resource_tags rt ON t.id = rt.tag_id
GROUP BY t.id, t.name, t.slug
ORDER BY usage_count DESC;

-- Get resources by tag
SELECT r.*
FROM resources r
JOIN resource_tags rt ON r.id = rt.resource_id
JOIN tags t ON rt.tag_id = t.id
WHERE t.slug = 'open-source' AND r.status = 'approved';
```

---

### resource_tags
**Purpose**: Many-to-many junction table for resource-tag relationships

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| resource_id | uuid | FK → resources.id, ON DELETE CASCADE | Resource reference |
| tag_id | uuid | FK → tags.id, ON DELETE CASCADE | Tag reference |

**Constraints**:
- `PRIMARY KEY (resource_id, tag_id)` - Prevents duplicate tag assignments

**Sample Queries**:
```sql
-- Add tags to a resource
INSERT INTO resource_tags (resource_id, tag_id)
SELECT 'resource-uuid', id FROM tags WHERE slug IN ('open-source', 'library', 'video-encoding');

-- Get all tags for a resource
SELECT t.* FROM tags t
JOIN resource_tags rt ON t.id = rt.tag_id
WHERE rt.resource_id = 'resource-uuid';

-- Remove all tags from a resource (cascade handles this on resource deletion)
DELETE FROM resource_tags WHERE resource_id = 'resource-uuid';
```

---

## User Data Tables

### users (Legacy - To Be Replaced)
**Purpose**: Local user accounts (will be replaced by Supabase `auth.users`)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | varchar | PK, DEFAULT gen_random_uuid() | Unique identifier |
| email | varchar | UNIQUE | User email address |
| password | varchar | NULLABLE | Bcrypt hashed password (for local auth) |
| first_name | varchar | NULLABLE | User's first name |
| last_name | varchar | NULLABLE | User's last name |
| profile_image_url | varchar | NULLABLE | Avatar URL |
| role | text | DEFAULT 'user' | user/admin/moderator |
| created_at | timestamptz | DEFAULT NOW() | Account creation |
| updated_at | timestamptz | DEFAULT NOW() | Last profile update |

**Migration Note**: This table will be removed during Supabase migration. All foreign keys will point to `auth.users` instead.

**Relationships**:
- ← `resources.submitted_by`
- ← `resources.approved_by`
- ← `user_favorites.user_id`
- ← `user_bookmarks.user_id`
- ← `user_preferences.user_id`
- ← `user_interactions.user_id`
- ← `user_journey_progress.user_id`
- ← `resource_edits.submitted_by`
- ← `resource_audit_log.performed_by`
- ← `enrichment_jobs.started_by`
- ← `github_sync_history.performed_by`

---

### user_favorites
**Purpose**: Quick-access bookmarking (simpler than bookmarks, no notes)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| user_id | varchar | FK → users.id, ON DELETE CASCADE | User reference |
| resource_id | uuid | FK → resources.id, ON DELETE CASCADE | Resource reference |
| created_at | timestamptz | DEFAULT NOW() | Favorite timestamp |

**Constraints**:
- `PRIMARY KEY (user_id, resource_id)` - Prevents duplicate favorites

**Sample Queries**:
```sql
-- Add favorite
INSERT INTO user_favorites (user_id, resource_id)
VALUES ('user-uuid', 'resource-uuid')
ON CONFLICT DO NOTHING;

-- Remove favorite
DELETE FROM user_favorites
WHERE user_id = 'user-uuid' AND resource_id = 'resource-uuid';

-- Get user's favorites
SELECT r.* FROM resources r
JOIN user_favorites uf ON r.id = uf.resource_id
WHERE uf.user_id = 'user-uuid'
ORDER BY uf.created_at DESC;
```

---

### user_bookmarks
**Purpose**: Saved resources with optional notes (heavier than favorites)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| user_id | varchar | FK → users.id, ON DELETE CASCADE | User reference |
| resource_id | uuid | FK → resources.id, ON DELETE CASCADE | Resource reference |
| notes | text | NULLABLE | User's personal notes |
| created_at | timestamptz | DEFAULT NOW() | Bookmark timestamp |

**Constraints**:
- `PRIMARY KEY (user_id, resource_id)` - Prevents duplicate bookmarks

**Sample Queries**:
```sql
-- Add bookmark with notes
INSERT INTO user_bookmarks (user_id, resource_id, notes)
VALUES ('user-uuid', 'resource-uuid', 'Watch this tutorial on FFmpeg filters')
ON CONFLICT (user_id, resource_id) DO UPDATE SET notes = EXCLUDED.notes;

-- Get bookmarks with notes
SELECT r.*, ub.notes, ub.created_at as bookmarked_at
FROM resources r
JOIN user_bookmarks ub ON r.id = ub.resource_id
WHERE ub.user_id = 'user-uuid'
ORDER BY ub.created_at DESC;
```

---

### user_preferences
**Purpose**: User personalization settings for AI recommendations

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT uuid_generate_v4() | Unique identifier |
| user_id | varchar | FK → users.id, ON DELETE CASCADE, UNIQUE | User reference (one-to-one) |
| preferred_categories | jsonb | DEFAULT '[]' | Array of category slugs |
| skill_level | text | NOT NULL, DEFAULT 'beginner' | beginner/intermediate/advanced |
| learning_goals | jsonb | DEFAULT '[]' | Array of goal strings |
| preferred_resource_types | jsonb | DEFAULT '[]' | Array of types (tutorial, documentation, tool, etc.) |
| time_commitment | text | DEFAULT 'flexible' | daily/weekly/flexible |
| created_at | timestamptz | DEFAULT NOW() | Preferences created |
| updated_at | timestamptz | DEFAULT NOW() | Last update |

**Indexes**:
- `idx_user_preferences_user_id` (user_id)
- `user_preferences_user_id_unique` (user_id) - Enforces one-to-one relationship

**Sample Data**:
```json
{
  "preferred_categories": ["encoding-codecs", "streaming"],
  "skill_level": "intermediate",
  "learning_goals": ["Learn FFmpeg", "Build video streaming app"],
  "preferred_resource_types": ["tutorial", "documentation"],
  "time_commitment": "weekly"
}
```

**Sample Queries**:
```sql
-- Get or create user preferences
INSERT INTO user_preferences (user_id, skill_level)
VALUES ('user-uuid', 'beginner')
ON CONFLICT (user_id) DO NOTHING
RETURNING *;

-- Update preferences
UPDATE user_preferences
SET
  preferred_categories = '["encoding-codecs", "players"]',
  skill_level = 'intermediate',
  updated_at = NOW()
WHERE user_id = 'user-uuid';
```

---

### user_interactions
**Purpose**: Analytics tracking for user behavior (used by AI recommendation engine)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT uuid_generate_v4() | Unique identifier |
| user_id | varchar | FK → users.id, ON DELETE CASCADE | User reference |
| resource_id | uuid | FK → resources.id, ON DELETE CASCADE | Resource reference |
| interaction_type | text | NOT NULL | view/click/bookmark/rate/complete |
| interaction_value | integer | NULLABLE | Rating (1-5) or time spent (seconds) |
| metadata | jsonb | DEFAULT '{}' | Additional context (device, referrer, etc.) |
| timestamp | timestamptz | DEFAULT NOW() | Interaction time |

**Indexes**:
- `idx_user_interactions_user_id` (user_id)
- `idx_user_interactions_resource_id` (resource_id)
- `idx_user_interactions_type` (interaction_type)

**Interaction Types**:
- **view**: User viewed resource detail page
- **click**: User clicked external link
- **bookmark**: User bookmarked resource
- **rate**: User rated resource (1-5 stars)
- **complete**: User marked resource as completed

**Sample Queries**:
```sql
-- Track resource view
INSERT INTO user_interactions (user_id, resource_id, interaction_type, metadata)
VALUES (
  'user-uuid',
  'resource-uuid',
  'view',
  '{"device": "mobile", "referrer": "search"}'
);

-- Get popular resources (most viewed last 7 days)
SELECT r.title, COUNT(ui.id) as view_count
FROM resources r
JOIN user_interactions ui ON r.id = ui.resource_id
WHERE ui.interaction_type = 'view'
  AND ui.timestamp > NOW() - INTERVAL '7 days'
GROUP BY r.id, r.title
ORDER BY view_count DESC
LIMIT 10;

-- Get user's interaction history
SELECT r.title, ui.interaction_type, ui.timestamp
FROM user_interactions ui
JOIN resources r ON ui.resource_id = r.id
WHERE ui.user_id = 'user-uuid'
ORDER BY ui.timestamp DESC;
```

---

### user_journey_progress
**Purpose**: Track user's progress through learning journeys

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT uuid_generate_v4() | Unique identifier |
| user_id | varchar | FK → users.id, ON DELETE CASCADE | User reference |
| journey_id | uuid | FK → learning_journeys.id, ON DELETE CASCADE | Journey reference |
| current_step_id | uuid | FK → journey_steps.id, NULLABLE | Current step (null if completed) |
| completed_steps | jsonb | DEFAULT '[]' | Array of completed step IDs |
| started_at | timestamptz | DEFAULT NOW() | Journey start time |
| last_accessed_at | timestamptz | DEFAULT NOW() | Last activity |
| completed_at | timestamptz | NULLABLE | Journey completion time |

**Indexes**:
- `idx_user_journey_progress_user_id` (user_id)
- `idx_user_journey_progress_journey_id` (journey_id)
- `user_journey_unique` (user_id, journey_id) - Prevents duplicate enrollments

**Sample Queries**:
```sql
-- Enroll in journey
INSERT INTO user_journey_progress (user_id, journey_id, current_step_id)
SELECT
  'user-uuid',
  'journey-uuid',
  (SELECT id FROM journey_steps WHERE journey_id = 'journey-uuid' ORDER BY step_number LIMIT 1)
ON CONFLICT (user_id, journey_id) DO NOTHING;

-- Mark step complete
UPDATE user_journey_progress
SET
  completed_steps = jsonb_insert(completed_steps, '{-1}', '"step-uuid"'),
  current_step_id = (
    SELECT id FROM journey_steps
    WHERE journey_id = 'journey-uuid' AND step_number > (
      SELECT step_number FROM journey_steps WHERE id = 'current-step-uuid'
    )
    ORDER BY step_number LIMIT 1
  ),
  last_accessed_at = NOW()
WHERE user_id = 'user-uuid' AND journey_id = 'journey-uuid';

-- Get user's journey progress
SELECT
  lj.title,
  ujp.started_at,
  ujp.completed_at,
  jsonb_array_length(ujp.completed_steps) as completed_step_count,
  (SELECT COUNT(*) FROM journey_steps WHERE journey_id = lj.id) as total_steps
FROM user_journey_progress ujp
JOIN learning_journeys lj ON ujp.journey_id = lj.id
WHERE ujp.user_id = 'user-uuid';
```

---

### sessions (Legacy - To Be Removed)
**Purpose**: PostgreSQL session storage for Replit Auth (will be removed during migration)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| sid | varchar | PK | Session ID (unique identifier) |
| sess | jsonb | NOT NULL | Session data (user info, tokens) |
| expire | timestamptz | NOT NULL | Expiration timestamp |

**Indexes**:
- `IDX_session_expire` (expire) - For cleanup queries

**Migration Note**: This table will be completely removed. Supabase Auth uses JWT tokens (stateless), not server-side sessions.

---

## Learning System Tables

### learning_journeys
**Purpose**: Structured learning paths with curated resources

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT uuid_generate_v4() | Unique identifier |
| title | text | NOT NULL | Journey display name |
| description | text | NOT NULL | Journey overview |
| difficulty | text | DEFAULT 'beginner' | beginner/intermediate/advanced |
| estimated_duration | text | NULLABLE | e.g., "20 hours", "3 weeks" |
| icon | text | NULLABLE | Emoji or icon name |
| order_index | integer | NULLABLE | Display order on homepage |
| category | text | NOT NULL | Primary category |
| status | text | DEFAULT 'published' | draft/published/archived |
| created_at | timestamptz | DEFAULT NOW() | Creation timestamp |
| updated_at | timestamptz | DEFAULT NOW() | Last update |

**Sample Data**:
```sql
INSERT INTO learning_journeys (title, description, difficulty, estimated_duration, icon, category, order_index)
VALUES (
  'FFmpeg Fundamentals',
  'Master video encoding, filtering, and streaming with FFmpeg from basics to advanced techniques.',
  'beginner',
  '15 hours',
  '🎬',
  'Encoding & Codecs',
  1
);
```

**Sample Queries**:
```sql
-- Get published journeys by difficulty
SELECT * FROM learning_journeys
WHERE status = 'published' AND difficulty = 'beginner'
ORDER BY order_index;

-- Get journeys with step count
SELECT lj.*, COUNT(js.id) as step_count
FROM learning_journeys lj
LEFT JOIN journey_steps js ON lj.id = js.journey_id
WHERE lj.status = 'published'
GROUP BY lj.id
ORDER BY lj.order_index;
```

---

### journey_steps
**Purpose**: Individual steps within a learning journey

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT uuid_generate_v4() | Unique identifier |
| journey_id | uuid | FK → learning_journeys.id, ON DELETE CASCADE | Parent journey |
| resource_id | uuid | FK → resources.id, ON DELETE CASCADE, NULLABLE | Associated resource (can be null for text-only steps) |
| step_number | integer | NOT NULL | Sequential step order (1, 2, 3...) |
| title | text | NOT NULL | Step name |
| description | text | NULLABLE | Step details/instructions |
| is_optional | boolean | DEFAULT false | Whether step can be skipped |
| created_at | timestamptz | DEFAULT NOW() | Creation timestamp |

**Indexes**:
- `idx_journey_steps_journey_id` (journey_id)
- `idx_journey_steps_resource_id` (resource_id)

**Sample Queries**:
```sql
-- Get journey steps in order
SELECT js.*, r.title as resource_title, r.url as resource_url
FROM journey_steps js
LEFT JOIN resources r ON js.resource_id = r.id
WHERE js.journey_id = 'journey-uuid'
ORDER BY js.step_number;

-- Add step to journey
INSERT INTO journey_steps (journey_id, resource_id, step_number, title, description)
VALUES (
  'journey-uuid',
  'resource-uuid',
  (SELECT COALESCE(MAX(step_number), 0) + 1 FROM journey_steps WHERE journey_id = 'journey-uuid'),
  'Install FFmpeg',
  'Download and install FFmpeg on your system'
);
```

---

### awesome_lists
**Purpose**: Track imported awesome list repositories

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT uuid_generate_v4() | Unique identifier |
| title | text | NOT NULL | Awesome list title |
| description | text | NOT NULL, DEFAULT '' | List description |
| repo_url | text | NOT NULL | GitHub repository URL |
| source_url | text | NOT NULL | Raw README.md URL |

**Sample Data**:
```sql
INSERT INTO awesome_lists (title, description, repo_url, source_url)
VALUES (
  'awesome-video',
  'A curated list of awesome video development resources',
  'https://github.com/krzemienski/awesome-video',
  'https://raw.githubusercontent.com/krzemienski/awesome-video/master/README.md'
);
```

---

## GitHub Integration Tables

### github_sync_queue
**Purpose**: Queue for pending GitHub import/export operations

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT uuid_generate_v4() | Unique identifier |
| repository_url | text | NOT NULL | GitHub repository URL |
| branch | text | DEFAULT 'main' | Target branch |
| resource_ids | jsonb | DEFAULT '[]' | Array of affected resource UUIDs |
| action | text | NOT NULL | import/export |
| status | text | DEFAULT 'pending' | pending/processing/completed/failed |
| error_message | text | NULLABLE | Error details if failed |
| metadata | jsonb | DEFAULT '{}' | Operation-specific data |
| created_at | timestamptz | DEFAULT NOW() | Queue entry time |
| processed_at | timestamptz | NULLABLE | Processing completion time |

**Indexes**:
- `idx_github_sync_queue_status` (status)

**Sample Queries**:
```sql
-- Queue export operation
INSERT INTO github_sync_queue (repository_url, action, status, metadata)
VALUES (
  'https://github.com/user/awesome-video',
  'export',
  'pending',
  '{"dry_run": false, "include_contributing": true}'
);

-- Get pending operations
SELECT * FROM github_sync_queue
WHERE status = 'pending'
ORDER BY created_at ASC;

-- Mark operation complete
UPDATE github_sync_queue
SET status = 'completed', processed_at = NOW()
WHERE id = 'queue-item-uuid';
```

---

### github_sync_history
**Purpose**: Audit trail of completed GitHub sync operations with snapshots

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT uuid_generate_v4() | Unique identifier |
| repository_url | text | NOT NULL | GitHub repository URL |
| direction | text | NOT NULL | export/import |
| commit_sha | text | NULLABLE | Git commit hash (for exports) |
| commit_message | text | NULLABLE | Commit message |
| commit_url | text | NULLABLE | GitHub commit URL |
| resources_added | integer | DEFAULT 0 | Number of resources added |
| resources_updated | integer | DEFAULT 0 | Number of resources updated |
| resources_removed | integer | DEFAULT 0 | Number of resources removed |
| total_resources | integer | DEFAULT 0 | Total resources after sync |
| performed_by | varchar | FK → users.id, NULLABLE | Admin who performed sync |
| snapshot | jsonb | DEFAULT '{}' | Resource state snapshot for diffing |
| metadata | jsonb | DEFAULT '{}' | Additional sync details |
| created_at | timestamptz | DEFAULT NOW() | Sync completion time |

**Indexes**:
- `idx_github_sync_history_repo` (repository_url)
- `idx_github_sync_history_direction` (direction)

**Sample Queries**:
```sql
-- Get sync history for repository
SELECT * FROM github_sync_history
WHERE repository_url = 'https://github.com/krzemienski/awesome-video'
ORDER BY created_at DESC;

-- Get latest export snapshot
SELECT snapshot FROM github_sync_history
WHERE repository_url = 'repo-url' AND direction = 'export'
ORDER BY created_at DESC LIMIT 1;

-- Calculate diff between syncs
SELECT
  h1.created_at as from_date,
  h2.created_at as to_date,
  h2.resources_added,
  h2.resources_updated,
  h2.resources_removed
FROM github_sync_history h2
LEFT JOIN github_sync_history h1 ON h1.id = (
  SELECT id FROM github_sync_history
  WHERE repository_url = h2.repository_url
  AND created_at < h2.created_at
  ORDER BY created_at DESC LIMIT 1
)
WHERE h2.repository_url = 'repo-url'
ORDER BY h2.created_at DESC;
```

---

### resource_audit_log
**Purpose**: Detailed audit trail for all resource changes

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT uuid_generate_v4() | Unique identifier |
| resource_id | uuid | FK → resources.id, ON DELETE CASCADE, NULLABLE | Resource reference (null for bulk operations) |
| action | text | NOT NULL | created/updated/approved/rejected/synced/deleted |
| performed_by | varchar | FK → users.id, ON DELETE CASCADE, NULLABLE | User who performed action |
| changes | jsonb | NULLABLE | Field-level diff (old vs new values) |
| notes | text | NULLABLE | Admin notes |
| created_at | timestamptz | DEFAULT NOW() | Action timestamp |

**Sample Data**:
```jsonb
// changes column example
{
  "title": { "old": "FFmpeg Tutorial", "new": "Complete FFmpeg Guide" },
  "status": { "old": "pending", "new": "approved" },
  "category": { "old": "Tools", "new": "Encoding & Codecs" }
}
```

**Sample Queries**:
```sql
-- Log resource approval
INSERT INTO resource_audit_log (resource_id, action, performed_by, changes, notes)
VALUES (
  'resource-uuid',
  'approved',
  'admin-user-uuid',
  '{"status": {"old": "pending", "new": "approved"}}',
  'High-quality tutorial, approved for publishing'
);

-- Get audit history for resource
SELECT
  ral.action,
  ral.created_at,
  u.email as performed_by,
  ral.changes,
  ral.notes
FROM resource_audit_log ral
LEFT JOIN users u ON ral.performed_by = u.id
WHERE ral.resource_id = 'resource-uuid'
ORDER BY ral.created_at DESC;

-- Get admin activity report
SELECT
  u.email,
  ral.action,
  COUNT(*) as action_count
FROM resource_audit_log ral
JOIN users u ON ral.performed_by = u.id
WHERE ral.created_at > NOW() - INTERVAL '30 days'
GROUP BY u.email, ral.action
ORDER BY u.email, action_count DESC;
```

---

## AI Processing Tables

### enrichment_jobs
**Purpose**: Batch AI metadata enrichment job tracking

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT uuid_generate_v4() | Unique identifier |
| status | text | NOT NULL, DEFAULT 'pending' | pending/processing/completed/failed/cancelled |
| filter | text | DEFAULT 'all' | all/unenriched (which resources to process) |
| batch_size | integer | DEFAULT 10 | Resources per batch |
| total_resources | integer | DEFAULT 0 | Total resources to process |
| processed_resources | integer | DEFAULT 0 | Number processed so far |
| successful_resources | integer | DEFAULT 0 | Successfully enriched |
| failed_resources | integer | DEFAULT 0 | Failed enrichment |
| skipped_resources | integer | DEFAULT 0 | Skipped (already enriched) |
| processed_resource_ids | jsonb | DEFAULT '[]' | Array of processed UUIDs |
| failed_resource_ids | jsonb | DEFAULT '[]' | Array of failed UUIDs |
| error_message | text | NULLABLE | Job-level error message |
| metadata | jsonb | DEFAULT '{}' | Job configuration, logs |
| started_by | varchar | FK → users.id, NULLABLE | Admin who started job |
| started_at | timestamptz | NULLABLE | Job start time |
| completed_at | timestamptz | NULLABLE | Job completion time |
| created_at | timestamptz | DEFAULT NOW() | Job creation time |
| updated_at | timestamptz | DEFAULT NOW() | Last status update |

**Indexes**:
- `idx_enrichment_jobs_status` (status)
- `idx_enrichment_jobs_started_by` (started_by)

**Sample Queries**:
```sql
-- Create enrichment job
INSERT INTO enrichment_jobs (filter, batch_size, started_by, total_resources)
VALUES (
  'unenriched',
  20,
  'admin-user-uuid',
  (SELECT COUNT(*) FROM resources WHERE metadata->>'enriched' IS NULL)
)
RETURNING *;

-- Update job progress
UPDATE enrichment_jobs
SET
  processed_resources = processed_resources + 1,
  successful_resources = successful_resources + 1,
  processed_resource_ids = processed_resource_ids || '["resource-uuid"]',
  updated_at = NOW()
WHERE id = 'job-uuid';

-- Get active jobs
SELECT * FROM enrichment_jobs
WHERE status IN ('pending', 'processing')
ORDER BY created_at DESC;

-- Get job statistics
SELECT
  status,
  COUNT(*) as job_count,
  SUM(total_resources) as total_resources,
  SUM(successful_resources) as successful_resources,
  AVG(successful_resources::float / NULLIF(total_resources, 0)) as success_rate
FROM enrichment_jobs
GROUP BY status;
```

---

### enrichment_queue
**Purpose**: Individual resource enrichment tasks (queue items for batch jobs)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT uuid_generate_v4() | Unique identifier |
| job_id | uuid | FK → enrichment_jobs.id, ON DELETE CASCADE | Parent job |
| resource_id | uuid | FK → resources.id, ON DELETE CASCADE | Resource to enrich |
| status | text | NOT NULL, DEFAULT 'pending' | pending/processing/completed/failed/skipped |
| retry_count | integer | DEFAULT 0 | Number of retry attempts |
| max_retries | integer | DEFAULT 3 | Maximum retry limit |
| error_message | text | NULLABLE | Task-level error message |
| ai_metadata | jsonb | NULLABLE | Claude analysis results |
| processed_at | timestamptz | NULLABLE | Task completion time |
| created_at | timestamptz | DEFAULT NOW() | Task creation time |
| updated_at | timestamptz | DEFAULT NOW() | Last status update |

**Indexes**:
- `idx_enrichment_queue_job_id` (job_id)
- `idx_enrichment_queue_resource_id` (resource_id)
- `idx_enrichment_queue_status` (status)

**AI Metadata Schema**:
```jsonb
{
  "suggestedTitle": "Complete FFmpeg Encoding Guide",
  "suggestedDescription": "Comprehensive tutorial covering video encoding...",
  "suggestedTags": ["ffmpeg", "encoding", "tutorial", "video"],
  "suggestedCategory": "Encoding & Codecs",
  "suggestedSubcategory": "Tools",
  "confidence": 0.95,
  "keyTopics": ["video encoding", "codecs", "ffmpeg filters"]
}
```

**Sample Queries**:
```sql
-- Add resources to queue
INSERT INTO enrichment_queue (job_id, resource_id)
SELECT 'job-uuid', id FROM resources
WHERE metadata->>'enriched' IS NULL
LIMIT 20;

-- Get pending tasks for processing
SELECT eq.*, r.url
FROM enrichment_queue eq
JOIN resources r ON eq.resource_id = r.id
WHERE eq.job_id = 'job-uuid' AND eq.status = 'pending'
ORDER BY eq.created_at ASC
LIMIT 10;

-- Mark task complete with AI metadata
UPDATE enrichment_queue
SET
  status = 'completed',
  ai_metadata = '{
    "suggestedTitle": "...",
    "confidence": 0.92,
    "suggestedTags": ["tag1", "tag2"]
  }',
  processed_at = NOW(),
  updated_at = NOW()
WHERE id = 'task-uuid';

-- Retry failed tasks
UPDATE enrichment_queue
SET
  status = 'pending',
  retry_count = retry_count + 1,
  updated_at = NOW()
WHERE job_id = 'job-uuid'
  AND status = 'failed'
  AND retry_count < max_retries;
```

---

### resource_edits
**Purpose**: User-suggested edits to existing resources (approval workflow)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT uuid_generate_v4() | Unique identifier |
| resource_id | uuid | FK → resources.id | Resource being edited |
| submitted_by | varchar | FK → users.id | User who suggested edit |
| status | text | DEFAULT 'pending' | pending/approved/rejected |
| original_resource_updated_at | timestamptz | NOT NULL | For conflict detection |
| proposed_changes | jsonb | NOT NULL | Field-level diff (old vs new) |
| proposed_data | jsonb | NOT NULL | Complete updated resource data |
| claude_metadata | jsonb | NULLABLE | AI analysis of proposed changes |
| claude_analyzed_at | timestamptz | NULLABLE | AI analysis timestamp |
| handled_by | varchar | FK → users.id, NULLABLE | Admin who reviewed edit |
| handled_at | timestamptz | NULLABLE | Review timestamp |
| rejection_reason | text | NULLABLE | Why edit was rejected |
| created_at | timestamptz | DEFAULT NOW() | Submission time |
| updated_at | timestamptz | DEFAULT NOW() | Last update |

**Indexes**:
- `idx_resource_edits_resource_id` (resource_id)
- `idx_resource_edits_status` (status)
- `idx_resource_edits_submitted_by` (submitted_by)

**Proposed Changes Schema**:
```jsonb
{
  "title": {
    "old": "FFmpeg Tutorial",
    "new": "Complete FFmpeg Encoding Guide"
  },
  "description": {
    "old": "Learn FFmpeg basics",
    "new": "Comprehensive tutorial covering FFmpeg encoding, filtering, and streaming"
  }
}
```

**Claude Metadata Schema**:
```jsonb
{
  "suggestedTitle": "Complete FFmpeg Encoding Guide",
  "suggestedDescription": "...",
  "suggestedTags": ["ffmpeg", "tutorial"],
  "confidence": 0.88,
  "keyTopics": ["video encoding", "ffmpeg"]
}
```

**Sample Queries**:
```sql
-- Submit edit suggestion
INSERT INTO resource_edits (
  resource_id,
  submitted_by,
  original_resource_updated_at,
  proposed_changes,
  proposed_data
)
SELECT
  'resource-uuid',
  'user-uuid',
  r.updated_at,
  '{"title": {"old": "' || r.title || '", "new": "New Title"}}',
  jsonb_build_object(
    'title', 'New Title',
    'description', r.description,
    'category', r.category
  )
FROM resources r WHERE r.id = 'resource-uuid';

-- Get pending edits for review
SELECT
  re.*,
  r.title as current_title,
  u.email as submitted_by_email
FROM resource_edits re
JOIN resources r ON re.resource_id = r.id
JOIN users u ON re.submitted_by = u.id
WHERE re.status = 'pending'
ORDER BY re.created_at ASC;

-- Approve edit (merge changes)
UPDATE resources
SET
  title = (re.proposed_data->>'title'),
  description = (re.proposed_data->>'description'),
  updated_at = NOW()
FROM resource_edits re
WHERE resources.id = re.resource_id
  AND re.id = 'edit-uuid';

UPDATE resource_edits
SET status = 'approved', handled_by = 'admin-uuid', handled_at = NOW()
WHERE id = 'edit-uuid';

-- Reject edit
UPDATE resource_edits
SET
  status = 'rejected',
  handled_by = 'admin-uuid',
  handled_at = NOW(),
  rejection_reason = 'Changes not verified, please provide sources'
WHERE id = 'edit-uuid';
```

---

## Row-Level Security (RLS) Policies

### Design Philosophy
**Users own their data, admins see everything, public sees approved content**

### Policy Implementation Status

| Table | RLS Enabled | Public Read | User Read Own | Admin Full Access |
|-------|-------------|-------------|---------------|-------------------|
| resources | ✅ | ✅ (approved only) | ✅ | ✅ |
| user_favorites | ✅ | ❌ | ✅ | ✅ |
| user_bookmarks | ✅ | ❌ | ✅ | ✅ |
| user_preferences | ✅ | ❌ | ✅ | ✅ |
| user_interactions | ✅ | ❌ | ✅ | ✅ |
| user_journey_progress | ✅ | ❌ | ✅ | ✅ |
| resource_edits | ✅ | ❌ | ✅ (own submissions) | ✅ |
| resource_audit_log | ✅ | ❌ | ❌ | ✅ |
| enrichment_jobs | ❌ | ❌ | ❌ | Service role only |
| enrichment_queue | ❌ | ❌ | ❌ | Service role only |
| github_sync_queue | ❌ | ❌ | ❌ | Service role only |
| github_sync_history | ✅ | ❌ | ❌ | ✅ |

### Example Policies

**Resources - Public Read Approved**:
```sql
CREATE POLICY "public_read_approved_resources"
ON resources FOR SELECT
TO anon, authenticated
USING (status = 'approved');
```

**Resources - Admin Full Access**:
```sql
CREATE POLICY "admin_full_access_resources"
ON resources FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' = 'admin'
  )
);
```

**User Favorites - Ownership**:
```sql
CREATE POLICY "user_favorites_ownership"
ON user_favorites FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

**Resource Edits - Users See Own Submissions**:
```sql
CREATE POLICY "resource_edits_user_read_own"
ON resource_edits FOR SELECT
TO authenticated
USING (submitted_by = auth.uid());

CREATE POLICY "resource_edits_admin_full_access"
ON resource_edits FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' = 'admin'
  )
);
```

---

## Indexes & Performance

### Critical Indexes

**High-Impact Indexes** (required for performance):
```sql
-- Resources: Filter approved resources by category
CREATE INDEX idx_resources_status_category ON resources(status, category);

-- Resources: Full-text search (requires tsvector column)
CREATE INDEX idx_resources_search USING GIN(search_vector);

-- Enrichment: Job monitoring
CREATE INDEX idx_enrichment_queue_job_id ON enrichment_queue(job_id);

-- Analytics: User behavior tracking
CREATE INDEX idx_user_interactions_user_id ON user_interactions(user_id);

-- GitHub: Sync history lookup
CREATE INDEX idx_github_sync_history_repo ON github_sync_history(repository_url);
```

**Index Maintenance**:
```sql
-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Rebuild bloated indexes
REINDEX INDEX idx_resources_status_category;
REINDEX TABLE resources;
```

---

## Database Migrations

### Migration Strategy

**Approach**: SQL-based migrations via Supabase CLI

**Migration Files** (`supabase/migrations/`):
```
supabase/migrations/
├─ 20250101000001_initial_schema.sql
├─ 20250101000002_add_rls_policies.sql
├─ 20250101000003_add_indexes.sql
├─ 20250101000004_add_full_text_search.sql
└─ 20250101000005_seed_categories.sql
```

### Applying Migrations

**Local Development**:
```bash
# Install Supabase CLI
npm install -g supabase

# Initialize project (first time)
supabase init

# Link to cloud project
supabase link --project-ref jeyldoypdkgsrfdhdcmm

# Apply migrations
supabase db push

# Generate migration from schema changes
supabase db diff --schema public --file new_migration

# Reset database (destructive!)
supabase db reset
```

**Production Deployment**:
```bash
# Test migrations locally first
supabase db reset
supabase db push

# Deploy to production (via Supabase dashboard)
# OR via CLI after testing
supabase db push --db-url $PRODUCTION_DATABASE_URL
```

### Migration Best Practices

1. **Always use transactions**:
```sql
BEGIN;

CREATE TABLE new_table (...);
CREATE INDEX idx_new_table ON new_table(...);

COMMIT;
```

2. **Include rollback instructions** (in comments):
```sql
-- Rollback:
-- DROP TABLE new_table;
```

3. **Test migrations on staging database first**

4. **Never modify existing migrations** (create new ones instead)

5. **Use timestamps for migration filenames** (`YYYYMMDDHHMMSS_description.sql`)

---

## Backup & Recovery

### Supabase Automatic Backups
- **Frequency**: Daily (configurable in dashboard)
- **Retention**: 7 days (free tier), 30+ days (paid tiers)
- **Location**: Supabase cloud storage
- **Access**: Project Settings → Database → Backups

### Manual Backup

**Export Schema**:
```bash
supabase db dump --schema public > schema_backup.sql
```

**Export Data**:
```bash
# Export all tables
supabase db dump --data-only > data_backup.sql

# Export specific table
pg_dump -h db.jeyldoypdkgsrfdhdcmm.supabase.co \
  -U postgres \
  -t resources \
  --data-only \
  > resources_backup.sql
```

### Restore from Backup

**Restore Schema**:
```bash
psql $DATABASE_URL < schema_backup.sql
```

**Restore Data**:
```bash
psql $DATABASE_URL < data_backup.sql
```

**Point-in-Time Recovery** (Enterprise plan only):
- Access via Supabase dashboard
- Restore to any point in last 7-30 days

---

## Query Performance Tips

### Common Query Patterns

**1. Filter approved resources by category** (most common):
```sql
-- ✅ GOOD: Uses idx_resources_status_category
SELECT * FROM resources
WHERE status = 'approved' AND category = 'Encoding & Codecs'
ORDER BY created_at DESC
LIMIT 20;

-- ❌ BAD: No index on (category, status)
SELECT * FROM resources
WHERE category = 'Encoding & Codecs' AND status = 'approved';
```

**2. Full-text search**:
```sql
-- ✅ GOOD: Uses GIN index on search_vector
SELECT * FROM resources
WHERE search_vector @@ to_tsquery('english', 'ffmpeg & encoding')
AND status = 'approved'
ORDER BY ts_rank(search_vector, to_tsquery('english', 'ffmpeg & encoding')) DESC;

-- ❌ BAD: ILIKE is slow, no index
SELECT * FROM resources
WHERE (title ILIKE '%ffmpeg%' OR description ILIKE '%ffmpeg%')
AND status = 'approved';
```

**3. N+1 Query Prevention**:
```sql
-- ✅ GOOD: Single query with JOIN
SELECT
  r.*,
  json_agg(t.*) FILTER (WHERE t.id IS NOT NULL) as tags
FROM resources r
LEFT JOIN resource_tags rt ON r.id = rt.resource_id
LEFT JOIN tags t ON rt.tag_id = t.id
WHERE r.status = 'approved'
GROUP BY r.id
LIMIT 20;

-- ❌ BAD: Drizzle ORM might do N+1 if not careful
-- Query 1: SELECT * FROM resources WHERE status = 'approved' LIMIT 20
-- Query 2-21: SELECT * FROM tags WHERE id IN (SELECT tag_id FROM resource_tags WHERE resource_id = ?)
```

**4. Pagination**:
```sql
-- ✅ GOOD: Keyset pagination (faster for large offsets)
SELECT * FROM resources
WHERE status = 'approved'
AND created_at < '2025-11-29 12:00:00'
ORDER BY created_at DESC
LIMIT 20;

-- ❌ BAD: OFFSET pagination (slow for large offsets)
SELECT * FROM resources
WHERE status = 'approved'
ORDER BY created_at DESC
LIMIT 20 OFFSET 10000;  -- Very slow!
```

---

## Database Maintenance

### Vacuum & Analyze

**Automatic** (Supabase):
- Vacuum: Daily (configurable)
- Analyze: After significant data changes

**Manual**:
```sql
-- Full vacuum (requires exclusive lock)
VACUUM FULL resources;

-- Regular vacuum (non-blocking)
VACUUM resources;

-- Update statistics
ANALYZE resources;

-- Vacuum and analyze together
VACUUM ANALYZE resources;
```

### Table Bloat Monitoring

```sql
-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Connection Pooling

**Supabase Supavisor** (automatic):
- Pool size: Configurable (default: 15)
- Mode: Transaction pooling (default)
- Max client connections: 200 (free tier)

**Connection String**:
```bash
# Direct connection (port 5432, limited to 60 connections)
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres

# Pooled connection (port 6543, recommended for production)
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

---

## Future Enhancements

### Planned Schema Changes

**Session 4 (Future)**:
- Add `search_vector` TSVECTOR column to resources
- Add full-text search GIN index
- Add `popularity_score` calculated column
- Add materialized view for trending resources
- Add `resource_versions` table for edit history
- Add WebSocket support for real-time updates

**Session 5+ (Long-term)**:
- Add `resource_comments` table
- Add `resource_ratings` table (replace interaction_value)
- Add `user_notifications` table
- Add `api_keys` table for third-party integrations
- Add `webhooks` table for event subscriptions

---

## Troubleshooting

### Common Issues

**1. RLS Blocking Legitimate Queries**:
```sql
-- Temporarily disable RLS for debugging (DEV ONLY!)
ALTER TABLE resources DISABLE ROW LEVEL SECURITY;

-- Query as specific user
SET request.jwt.claims.sub = 'user-uuid';
SELECT * FROM resources;  -- Test policy

-- Re-enable RLS
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
```

**2. Slow Queries**:
```sql
-- Enable query execution plan
EXPLAIN ANALYZE
SELECT * FROM resources WHERE status = 'approved' AND category = 'Encoding & Codecs';

-- Check for missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public' AND tablename = 'resources';
```

**3. Connection Pool Exhausted**:
```bash
# Check active connections
SELECT count(*) FROM pg_stat_activity WHERE datname = 'postgres';

# Kill idle connections (be careful!)
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'postgres' AND state = 'idle' AND state_change < NOW() - INTERVAL '5 minutes';
```

**4. Constraint Violations**:
```sql
-- Find foreign key violations
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint
WHERE contype = 'f' AND connamespace = 'public'::regnamespace;

-- Temporarily disable constraints (dangerous!)
ALTER TABLE resource_tags DISABLE TRIGGER ALL;
-- ... perform operation ...
ALTER TABLE resource_tags ENABLE TRIGGER ALL;
```

---

## Glossary

- **RLS**: Row-Level Security (PostgreSQL policy-based access control)
- **UUID**: Universally Unique Identifier (128-bit identifier)
- **TSVECTOR**: PostgreSQL full-text search vector type
- **JSONB**: Binary JSON storage type (more efficient than JSON)
- **GIN Index**: Generalized Inverted Index (for full-text search, JSONB)
- **ON DELETE CASCADE**: Automatically delete dependent rows when parent is deleted
- **ON DELETE SET NULL**: Set foreign key to NULL when parent is deleted
- **Materialized View**: Precomputed query results stored as a table

---

**Last Updated**: 2025-11-30
**Schema Version**: 2.0.0
**Total Tables**: 21
**Total Resources**: 2,644+

For implementation details, see `/shared/schema.ts`.
For migration guide, see `/docs/REPLIT_TO_SUPABASE_MIGRATION_PLAN.md`.
For API documentation, see `/CLAUDE.md`.

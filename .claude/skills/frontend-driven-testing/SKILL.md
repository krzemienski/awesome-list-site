---
name: frontend-driven-testing-awesome-list
description: Use when testing the Awesome List application as a parallel specialist agent with Docker isolation - enforces frontend-driven development (UI→API→DB→UI validation), self-correcting test-fix-rebuild loops, mandatory 3-layer verification with responsive visual inspection, systematic debugging for all bugs, Docker container isolation on unique ports, and includes complete domain knowledge of awesome list database schema and architecture
---

# Frontend-Driven Testing: Awesome List Application

## Core Principle

**Everything is tested via the frontend, fully functional.**

Test through browser UI → API call → Database persistence → API response → UI update

This is NOT just "testing" - it's **frontend-driven development** ensuring features work correctly by:
1. Testing via user interface (Chrome DevTools MCP)
2. Finding bugs through frontend interactions
3. Fixing bugs at root cause (backend or frontend)
4. Rebuilding Docker container
5. Retesting until all 3 layers pass
6. Continuing to next feature

---

## The Iron Law: All 3 Layers, NO EXCEPTIONS

**Every feature test requires ALL 3 layers to PASS:**

**Layer 1 - API/Network:**
- HTTP request made successfully
- Correct status code (200, 201, not 401/403/500)
- Response body has expected structure
- Authorization headers present when required

**Layer 2 - Database:**
- SQL query confirms data persisted
- Correct values in database tables
- Foreign keys intact
- Timestamps populated
- Audit log entries created (for admin actions)

**Layer 3 - UI (Responsive Visual):**
- Screenshot captured at 3 viewport sizes (desktop, tablet, mobile)
- Element VISIBLE in screenshot (not hidden, not off-screen)
- Text READABLE (not cut off, not overlapping)
- Layout NOT broken (no overflow, no collapsed sections)
- Content matches database state

### FORBIDDEN Rationalization (Must Prevent)

**Common excuse agents make:**
```
"I tested the API endpoint - it returns 200 OK. ✅
The database shows the row was created. ✅
But I can't find the button in the UI snapshot anymore - maybe the page structure changed.
Since 2 out of 3 layers passed, I'll mark this test complete!"
```

**WRONG. This is a BROKEN FEATURE.**

**Correct Response:**
```
"I cannot verify Layer 3 (UI). This is a BUG:
1. UI regression (element disappeared)
2. Selector changed (my selector is wrong)
3. State management issue (React not updating)
4. Cache issue (React Query stale)

I must invoke systematic-debugging skill, find root cause, fix it, rebuild Docker, and retest.
ALL 3 layers must pass before continuing."
```

### Red Flags - STOP and Debug

If you catch yourself thinking:
- "API works, database updated, that's good enough"
- "Can't find the button anymore but test is mostly passing"
- "2 out of 3 layers is acceptable for this feature"
- "UI layer is flaky, I'll just verify backend"
- "Frontend is too hard to test, API verification is enough"
- "Something's not responding but API worked so feature is complete"

**ALL of these mean: FEATURE IS BROKEN. Find and fix the bug.**

---

## Domain Knowledge: The Awesome List Application

### What is an Awesome List?

**Awesome List** = Curated collection of resources in standardized markdown format following the [sindresorhus/awesome](https://github.com/sindresorhus/awesome) specification.

**Format Requirements:**
- Title: `# Awesome [Topic]`
- Badge: `[![Awesome](https://awesome.re/badge.svg)](https://awesome.re)`
- Structure: `## Category`, `### Subcategory`, `#### Sub-subcategory`
- Resources: `- [Name](URL) - Description ending with period.`
- Rules: Alphabetical order, HTTPS URLs, awesome-lint compliant, CC0 license

**Examples:** awesome-go, awesome-python, awesome-video (this application's source)

### Our Application: Bidirectional Awesome List Platform

**Purpose:** Browse, curate, and sync the `krzemienski/awesome-video` GitHub repository

**Workflow:**
1. **Import**: Admin imports awesome list from GitHub → Database
2. **Store**: Database = single source of truth + enhanced features (search, bookmarks, AI)
3. **Serve**: Web UI with search, user accounts, learning journeys, recommendations
4. **Export**: Database → awesome-lint compliant markdown → GitHub commit

**Key Insight:** Must work for ANY spec-compliant awesome list, not just awesome-video

### Our Database (2,647 Video Resources)

**Structure:**
```
Categories (21 top-level)
├── Adaptive Streaming & Manifest Tools
├── Build Tools Deployment & Utility Libraries
├── Community & Events
├── DRM Security & Content Protection
├── Encoding & Codecs
│   ├── Subcategories (102 second-level)
│   │   ├── Codecs
│   │   │   └── Sub-Subcategories (90 third-level)
│   │   │       ├── AV1 → Resources: av1dec, rav1e, dav1d
│   │   │       ├── HEVC → Resources: x265, kvazaar
│   │   │       └── VP9 → Resources: libvpx
│   │   └── Encoding Tools
│   │       └── FFmpeg → Resources: 200+ encoding tools
└── ... (16 more top-level categories)
```

**Example Resource:**
```json
{
  "id": "uuid",
  "title": "FFmpeg Documentation",
  "url": "https://ffmpeg.org/ffmpeg-all.html",
  "description": "Complete FFmpeg documentation with all options.",
  "category": "Encoding & Codecs",  // TEXT field (denormalized)
  "subcategory": "Encoding Tools",  // TEXT field
  "subSubcategory": null,
  "status": "approved",  // pending|approved|rejected|archived
  "metadata": {},  // JSONB (AI analysis results)
  "search_vector": "[tsvector]"  // Full-text search
}
```

### Database Schema (16 Tables)

**Hierarchy Tables (Navigation Structure):**
- `categories` (21 rows) - Top-level: id, name, slug
- `subcategories` (102 rows) - Second-level: id, name, slug, category_id FK
- `sub_subcategories` (90 rows) - Third-level: id, name, slug, subcategory_id FK

**Resources Table (2,647 rows - Denormalized):**
- Uses TEXT fields for category relationships (NOT foreign keys)
- Allows flexible categorization without strict referential integrity
- Full-text search via `search_vector` (tsvector + pg_trgm)

**User Data Tables (RLS Protected):**
- `auth.users` (Supabase managed) - id, email, raw_user_meta_data->>'role'
- `user_favorites` - user_id, resource_id, created_at (RLS: user_id = auth.uid())
- `user_bookmarks` - user_id, resource_id, notes (RLS: user_id = auth.uid())
- `user_preferences` - skill_level, preferred_categories, learning_goals
- `user_journey_progress` - journey_id, current_step_id, completed_steps[]

**Admin Tables:**
- `learning_journeys` + `journey_steps` - Curated learning paths
- `enrichment_jobs` + `enrichment_queue` - AI batch processing (Claude Haiku 4.5)
- `github_sync_queue` + `github_sync_history` - Import/export tracking
- `resource_edits` - User-suggested edits (admin approval workflow)
- `resource_audit_log` - ALL admin actions (status changes, bulk operations)

**Critical Concepts:**
- **RLS (Row-Level Security)**: `SELECT` policies check `user_id = auth.uid()`
- **Service Role**: Supabase MCP bypasses RLS (sees all data for verification)
- **Denormalization**: Resources use TEXT for categories (flexible), hierarchy tables define valid values
- **Audit Logging**: EVERY admin action MUST create audit_log entry
- **JSONB**: metadata fields use JSONB (ai_analyzed, ai_tags, etc.)

### Architecture (React + Express + Supabase + Docker)

**Frontend:**
- React 18 + Vite + TypeScript
- shadcn/ui components (50+ components: Button, Input, Dialog, Table, etc.)
- TanStack Query for state (no Redux/Zustand)
- Wouter for routing (lightweight React Router alternative)
- Supabase client (auth via useAuth hook)
- Tailwind v4 (OKLCH color space, cyberpunk theme)

**Backend:**
- Express.js + Node.js 20
- 70 API endpoints (server/routes.ts - 2,115 lines)
- Drizzle ORM (TypeScript ORM for PostgreSQL)
- Supabase Auth middleware (server/supabaseAuth.ts)
- AI services: Claude Haiku 4.5 (server/ai/*.ts)
- GitHub integration: Octokit (server/github/*.ts)

**Database:**
- Supabase PostgreSQL
- Project ID: jeyldoypdkgsrfdhdcmm
- 16 tables in public schema
- RLS policies (15+ policies)
- Full-text search (pg_trgm extension)
- Auth schema managed by Supabase

**Infrastructure:**
- Docker Compose (web + redis + nginx)
- Redis 7 (AI response cache, 1hr TTL)
- Nginx (reverse proxy, rate limiting 60 req/min)

**Why Agents Need This:**
- Understand what you're testing (awesome list platform, not generic CRUD app)
- Know data model (hierarchy, denormalization, RLS isolation)
- Recognize architectural boundaries (React Query → API → Drizzle → PostgreSQL)
- Debug with system knowledge (where bugs are likely)

---

## Mandatory Initialization (BEFORE Testing Anything)

**Complete these 6 steps BEFORE your first test:**

### Step 1: Activate Serena MCP (REQUIRED FIRST)

```typescript
mcp__serena__activate_project({ project: "awesome-list-site" })
```

**Expected Response:**
```json
{
  "result": "Project activated, languages: typescript, encoding: utf-8, available memories: [...]"
}
```

**If fails:** You cannot proceed. Serena MCP is required for:
- Reading component code (`mcp__serena__read_file`)
- Finding symbols (`mcp__serena__find_symbol`)
- Editing code for bug fixes (`mcp__serena__replace_content`)
- Searching patterns (`mcp__serena__search_for_pattern`)

### Step 2: Determine Your Agent Domain and PORT

| Agent | Domain | PORT | Features |
|-------|--------|------|----------|
| **Agent 1** | Admin Panel | 3001 | ResourceBrowser, BulkActions, PendingResources, editing |
| **Agent 2** | End User | 3002 | Login, Favorites, Bookmarks, Profile, Search, Journeys |
| **Agent 3** | Admin Integration | 3003 | GitHub sync, AI enrichment, bulk operations backend |
| **Agent 4** | Security | 3004 | XSS, SQL injection, RLS, anonymous flows, performance |

**Set your PORT variable for all subsequent commands:**
```bash
export AGENT_PORT=3001  # Or 3002, 3003, 3004 based on your assignment
```

### Step 3: Create Dockerfile with PORT Argument

**Navigate to project root:**
```bash
cd /Users/nick/Desktop/awesome-list-site
```

**Create or verify Dockerfile accepts PORT:**
```dockerfile
# Should have this line:
ARG PORT=3000
ENV PORT=$PORT

# Expose your port
EXPOSE $PORT

# Start command uses PORT
CMD ["npm", "run", "start"]
```

**If Dockerfile doesn't have PORT arg, you'll build on default 3000 which conflicts with other agents.**

### Step 4: Build Docker Image

```bash
docker build -t awesome-list-agent-$AGENT_PORT:latest \
  --build-arg PORT=$AGENT_PORT \
  --no-cache \
  .
```

**Wait for:** "Successfully built [hash]"

**Verify:**
```bash
docker images | grep awesome-list-agent-$AGENT_PORT
```

### Step 5: Run Docker Container

```bash
docker run -d \
  --name awesome-agent-$AGENT_PORT \
  -p $AGENT_PORT:$AGENT_PORT \
  -e PORT=$AGENT_PORT \
  awesome-list-agent-$AGENT_PORT:latest
```

**Wait 30 seconds for startup**

### Step 6: Verify Container Healthy

```bash
# Check container status
docker ps | grep awesome-agent-$AGENT_PORT
# Should show "Up" status

# Health check
curl http://localhost:$AGENT_PORT/api/health
# Expected: {"status":"ok"}

# Check logs for errors
docker logs awesome-agent-$AGENT_PORT | tail -20
# Should NOT show "Error" or "Failed"
```

**If health check fails:**
1. Check logs: `docker logs awesome-agent-$AGENT_PORT`
2. Common issues:
   - Database connection failed (check SUPABASE_URL in .env)
   - PORT conflict (another process using this port)
   - Build errors (TypeScript compilation failed)

**Only proceed when:** curl returns `{"status":"ok"}`

---

## The Self-Correcting Loop (Your Core Activity)

**This is what you DO for your entire session:**

```
WHILE domain_not_complete AND attempts_for_feature < 3:

  1. Test Feature via Frontend
     ├─ Navigate: http://localhost:$AGENT_PORT/[feature-url]
     ├─ Interact: Click, type, submit via Chrome DevTools MCP
     ├─ Layer 1: Verify API call (list_network_requests)
     ├─ Layer 2: Verify Database (Supabase MCP execute_sql)
     └─ Layer 3: Verify UI at 3 viewports (resize + screenshot + visual inspect)

  2. Evaluate Result:
     IF all 3 layers PASS at all 3 viewports:
       ├─ Document evidence (screenshots + SQL + network log)
       ├─ Add to results file
       ├─ attempts_for_feature = 0
       └─ CONTINUE to next feature

     ELSE (ANY layer FAILS):
       ├─ attempts_for_feature++
       │
       ├─ 3. Debug (MANDATORY - No skipping)
       │   ├─ Invoke: Skill({ skill: "systematic-debugging" })
       │   ├─ Phase 1: Root cause investigation (exact error, reproduce)
       │   ├─ Phase 2: Pattern analysis (what similar feature works?)
       │   ├─ Phase 3: Hypothesis (form theory, test minimally)
       │   └─ Phase 4: Fix identification (root cause, not symptom)
       │
       ├─ 4. Apply Fix
       │   ├─ IF bug in your test code/docs:
       │   │   └─ Edit directly via Serena MCP
       │   ├─ IF bug in application code:
       │   │   ├─ Edit via: mcp__serena__replace_content({ file, needle, repl, mode })
       │   │   └─ Commit: git commit -m "fix: [description]"
       │   └─ Document fix in evidence file
       │
       ├─ 5. Rebuild Docker (MANDATORY after code changes)
       │   ├─ docker stop awesome-agent-$AGENT_PORT
       │   ├─ docker rm awesome-agent-$AGENT_PORT
       │   ├─ docker build -t awesome-list-agent-$AGENT_PORT:latest \
       │   │    --build-arg PORT=$AGENT_PORT --no-cache .
       │   ├─ docker run -d --name awesome-agent-$AGENT_PORT \
       │   │    -p $AGENT_PORT:$AGENT_PORT awesome-list-agent-$AGENT_PORT:latest
       │   ├─ sleep 30
       │   └─ curl http://localhost:$AGENT_PORT/api/health
       │
       └─ 6. RESTART Feature Test from Beginning
           └─ Don't continue mid-test - start over at Step 1

  IF attempts_for_feature >= 3 AND still failing:
    ├─ Document as KNOWN_LIMITATION in results file
    ├─ Create detailed bug report: docs/bugs/BUG_[domain]_[feature].md
    ├─ Add to: docs/KNOWN_LIMITATIONS.md
    └─ CONTINUE to next feature (don't get stuck)

WHEN all features in domain tested:
  └─ Generate evidence summary: docs/evidence/[domain]-results.md
```

**This loop is MANDATORY. No shortcuts, no "good enough", no skipping fixes.**

---

## Diagnostic Decision Tree: When Things Don't Work

**Symptom:** "Waiting for response, nothing happening" or "Test isn't working"

### Level 1: Check Console (Frontend Errors)

```typescript
mcp__chrome-devtools__list_console_messages({ types: ['error'] })
```

**Look for:**
- **React errors** (`Uncaught Error`, `Minified React error`)
  → **Diagnosis:** Component bug (state, hooks, props, rendering)
  → **Fix Location:** client/src/components/ or client/src/pages/
  → **Common Causes:** Undefined props, hook dependency issues, hydration mismatch

- **Network errors** (`Failed to fetch`, `CORS error`)
  → **Diagnosis:** API communication bug
  → **Fix Location:** API endpoint down, wrong URL, CORS config
  → **Check:** Is server running? Is PORT correct in URL?

- **Auth errors** (`401 Unauthorized`, `403 Forbidden`)
  → **Diagnosis:** Token missing, expired, or wrong role
  → **Fix:** Check localStorage token, re-login, verify role in database

- **Type errors** (`Cannot read property of undefined`)
  → **Diagnosis:** Data structure mismatch (API response ≠ expected shape)
  → **Fix Location:** TypeScript interface vs actual API response

### Level 2: Check Network (API Layer)

```typescript
mcp__chrome-devtools__list_network_requests({ resourceTypes: ['fetch', 'xhr'] })
```

**Look for:**

**Request NOT made:**
→ **Diagnosis:** Event handler not wired (onClick missing, onSubmit broken)
→ **Fix Location:** Component button/form in client/src/
→ **Check:** Is React Query enabled? Is mutation defined?

**Request made, status 401:**
→ **Diagnosis:** Auth token missing or expired
→ **Fix:** Extract token from localStorage, check expiration:
```typescript
mcp__chrome-devtools__evaluate_script({
  function: `() => {
    const data = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
    if (!data) return { error: 'No token' };
    const parsed = JSON.parse(data);
    const expiresAt = parsed.expires_at * 1000;
    return {
      hasToken: true,
      isExpired: Date.now() > expiresAt,
      role: parsed.user?.user_metadata?.role,
      email: parsed.user?.email
    };
  }`
})
```

**Request made, status 403:**
→ **Diagnosis:** Permission issue (not admin, or RLS blocking)
→ **Fix:** Check user role in token, verify RLS policies
→ **Database Check:**
```sql
SELECT id, email, raw_user_meta_data->>'role' as role
FROM auth.users WHERE email = '[current_user_email]';
```

**Request made, status 500:**
→ **Diagnosis:** Backend crash
→ **Fix:** Check Docker logs:
```bash
docker logs awesome-agent-$AGENT_PORT | tail -50
```
→ Look for: Stack trace, error message, database errors

**Request made, status 200, but response is empty/unexpected:**
→ **Diagnosis:** Backend logic bug (query wrong, serialization issue)
→ **Fix:** Check storage method in server/storage.ts
→ **Invoke:** systematic-debugging for backend investigation

**Request pending forever:**
→ **Diagnosis:** Backend hanging on async operation
→ **Async Operations Map:**
  - Claude API calls: enrichmentService (30 sec per resource!)
  - GitHub API calls: syncService (network dependent, 5-30 sec)
  - Database queries: Usually <50ms unless complex
→ **Fix:** Add timeout, check async operation logs, verify API keys configured

### Level 3: Check Database (Persistence Layer)

```typescript
mcp__supabase__execute_sql({ query: "SELECT ..." })
```

**Data NOT persisted (but API returned 200):**
→ **Diagnosis:** Transaction rolled back, RLS blocking INSERT, or constraint violation
→ **Check RLS Policies:**
```sql
SELECT * FROM pg_policies WHERE tablename = 'user_favorites';
```
→ **Check Constraints:**
```sql
-- Look for unique constraint violations
SELECT * FROM user_favorites WHERE user_id = 'X' AND resource_id = 'Y';
-- If row exists, duplicate insert was blocked
```

**Data persisted BUT UI doesn't show it:**
→ **Diagnosis:** React Query cache stale, component not re-fetching
→ **Fix Location:** Check invalidateQueries after mutation
→ **Pattern:**
```typescript
useMutation({
  mutationFn: addFavorite,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/favorites'] });
    // ↑ This MUST be called to refresh UI
  }
})
```

### Level 4: Architecture-Specific Knowledge

**Auth Flow (Supabase JWT):**
```
User Login (Frontend)
  ├─ Supabase client: signInWithPassword()
  ├─ Supabase returns: { access_token, refresh_token, user }
  ├─ Stored in: localStorage['sb-jeyldoypdkgsrfdhdcmm-auth-token']
  ├─ useAuth hook: Reads localStorage, provides { user, isAuthenticated, isAdmin }
  ├─ isAdmin check: user?.user_metadata?.role === 'admin'
  └─ API requests: Add header: 'Authorization: Bearer {access_token}'

Backend Middleware
  ├─ extractUser: Validates JWT, sets req.user
  ├─ isAuthenticated: Checks req.user exists (401 if not)
  └─ isAdmin: Checks req.user.role === 'admin' (403 if not)

Database RLS
  ├─ Policies check: auth.uid() function
  ├─ Returns: user_id from JWT
  └─ Filters: WHERE user_id = auth.uid()
```

**When auth fails, trace backwards:**
1. Does localStorage have token? (Frontend)
2. Is token in Authorization header? (Network)
3. Did extractUser middleware set req.user? (Backend)
4. Does database policy allow operation? (RLS)

**Async Operations That Can Hang:**
- **Enrichment**: 30 sec × batch_size (Claude API calls)
- **GitHub sync**: Variable (network + README.md size + API rate limits)
- **File scraping**: 10 sec timeout per URL (urlScraper.ts)
- **React Query**: 5 min staleTime default (can show old data)

**Database Querying:**
- **Drizzle ORM**: All queries parameterized (SQL injection impossible)
- **Service Role**: Supabase MCP uses this (bypasses ALL RLS)
- **Authenticated Role**: API endpoints use this (RLS enforced)
- **To test RLS:** Use API endpoints, NOT direct SQL (SQL bypasses policies)

---

## Real Component Selectors (FROM ACTUAL CODE)

### Components WITH data-testid (Use These First)

**PendingResources.tsx** (Gold Standard Example):
```typescript
// Resource row
const resourceRow = page.locator('[data-testid="row-pending-resource-${resourceId}"]');

// Approve button
const approveButton = page.locator('[data-testid="button-approve-${resourceId}"]');

// Reject button
const rejectButton = page.locator('[data-testid="button-reject-${resourceId}"]');

// Confirmation dialog
const confirmButton = page.locator('[data-testid="button-confirm-approve"]');

// Rejection reason
const reasonTextarea = page.locator('[data-testid="textarea-rejection-reason"]');
```

**SubmitResource.tsx:**
```typescript
const titleInput = page.locator('[data-testid="input-title"]');
const urlInput = page.locator('[data-testid="input-url"]');
const descriptionInput = page.locator('[data-testid="input-description"]');
const categorySelect = page.locator('[data-testid="select-category"]');
const submitButton = page.locator('[data-testid="button-submit"]');
```

**Category.tsx:**
```typescript
const searchInput = page.locator('[data-testid="input-search-resources"]');
const subcategoryFilter = page.locator('[data-testid="select-subcategory-filter"]');
const sortSelect = page.locator('[data-testid="select-sort"]');
```

**AdminDashboard.tsx:**
```typescript
const approvalsTab = page.locator('[data-testid="tab-approvals"]');
const editsTab = page.locator('[data-testid="tab-edits"]');
const enrichmentTab = page.locator('[data-testid="tab-enrichment"]');
const seedButton = page.locator('[data-testid="button-seed-database"]');
```

**ResourceCard.tsx:**
```typescript
const resourceCard = page.locator('[data-testid="card-resource-${id}"]');
const visitButton = page.locator('[data-testid="button-visit-${id}"]');
```

**JourneyDetail.tsx:**
```typescript
const startJourneyButton = page.locator('[data-testid="button-start-journey"]');
const progressBar = page.locator('[data-testid="progress-bar-journey"]');
const completeStepButton = page.locator('[data-testid="button-complete-step-${stepId}"]');
```

**BatchEnrichmentPanel.tsx:**
```typescript
const filterSelect = page.locator('[data-testid="select-filter"]');
const startButton = page.locator('[data-testid="button-start-enrichment"]');
const progressBar = page.locator('[data-testid="progress-bar"]');
```

**GitHubSyncPanel.tsx:**
```typescript
const repoUrlInput = page.locator('[data-testid="input-repo-url"]');
const importButton = page.locator('[data-testid="button-import-github"]');
const exportButton = page.locator('[data-testid="button-export-github"]');
```

### Components WITHOUT data-testid (FALLBACK PATTERNS)

**Login.tsx (NO data-testid attributes!):**

```typescript
// Email input - Use type attribute
const emailInput = page.locator('input[type="email"]');
// OR use placeholder (more brittle but works)
const emailByPlaceholder = page.locator('input[placeholder="Email"]');

// Password input
const passwordInput = page.locator('input[type="password"]');
// OR
const passwordByPlaceholder = page.locator('input[placeholder="Password"]');

// Submit button - Type attribute + check loading state
const submitButton = page.locator('button[type="submit"]');
// Verify button text to ensure correct mode:
// - Sign In mode: button contains "Sign In"
// - Sign Up mode: button contains "Sign Up"

// Mode toggle (Sign In ↔ Sign Up)
const signUpToggle = page.locator('button:has-text("Sign up")');
const signInToggle = page.locator('button:has-text("Sign in")');

// OAuth buttons
const githubButton = page.locator('button:has-text("Continue with GitHub")');
const googleButton = page.locator('button:has-text("Continue with Google")');

// Magic link button
const magicLinkButton = page.locator('button:has-text("Magic Link")');
```

**ResourceBrowser.tsx (TanStack Table, NO data-testid):**

```typescript
// Table structure
const table = page.locator('table');
const tbody = table.locator('tbody');
const rows = tbody.locator('tr');

// First row
const firstRow = rows.first();

// Row checkbox - Via table structure
const firstCheckbox = firstRow.locator('input[type="checkbox"]').first();

// Header checkbox (select all)
const headerCheckbox = page.locator('table thead input[type="checkbox"]');

// Dropdown menu button (More actions)
const menuButton = firstRow.locator('button:has([class*="lucide"])').last();
// OR via aria-label
const menuByLabel = firstRow.locator('button[aria-label*="menu"]');
// OR via icon (MoreHorizontal = ⋯)
const menuByIcon = firstRow.locator('button:has-text("⋯")');

// Menu options (after clicking menu)
const editOption = page.locator('text="Edit"').first();
const viewDetailsOption = page.locator('text="View Details"');
const archiveOption = page.locator('text="Archive"');

// Pagination buttons
const previousButton = page.locator('button:has-text("Previous")');
const nextButton = page.locator('button:has-text("Next")');

// Page info
const pageInfo = page.locator('text=/Page \\d+ of \\d+/');
```

**BulkActionsToolbar.tsx (NO data-testid):**

```typescript
// Toolbar appears when resources selected
const toolbar = page.locator('div:has-text("selected")').first();

// Bulk action buttons - Text-based selectors with styling
const approveButton = page.locator('button:has-text("Approve")').filter({
  has: page.locator('[class*="bg-green"]')  // Green styled button
});

const rejectButton = page.locator('button:has-text("Reject")').filter({
  has: page.locator('[class*="bg-red"]')  // Red styled button
});

const archiveButton = page.locator('button:has-text("Archive")');
const tagButton = page.locator('button:has-text("Add Tags")');
const exportButton = page.locator('button:has-text("Export CSV")');
const deleteButton = page.locator('button:has-text("Delete")');
const clearButton = page.locator('button:has-text("Clear Selection")');

// Tag dialog (after clicking "Add Tags")
const tagInput = page.locator('input#tags');
// OR
const tagInputByLabel = page.locator('label:has-text("Tags")').locator('+ input');

// Tag dialog buttons
const cancelTagButton = page.locator('button:has-text("Cancel")').last();
const saveTagButton = page.locator('button:has-text("Add Tags")').last();
```

**AuthGuard.tsx (Redirect Behavior):**
```typescript
// If not authenticated, redirects to "/" with toast
// No selectors needed - check URL change

// Verify redirect happened
const currentUrl = await page.evaluate(() => window.location.href);
// Expected: http://localhost:3001/ (not /profile or /admin)

// Check for toast notification
mcp__chrome-devtools__take_snapshot({});
// Look for: "Authentication Required" or "Please sign in"
```

---

## Layer 3 Extended: Responsive Visual Verification

**CRITICAL:** After ANY UI change, verify at ALL 3 viewport sizes.

### Viewport Sizes

| Device | Width | Height | Purpose |
|--------|-------|--------|---------|
| Desktop | 1920 | 1080 | Primary desktop experience |
| Tablet | 768 | 1024 | iPad, Android tablets |
| Mobile | 375 | 667 | iPhone, Android phones |

### Verification Procedure (EVERY Test)

```typescript
// Test feature at desktop first
mcp__chrome-devtools__resize_page({ width: 1920, height: 1080 })

// Perform feature action (click, submit, etc.)
// ...

// STEP 1: Desktop screenshot
mcp__chrome-devtools__take_screenshot({
  filePath: '/tmp/test-${featureName}-desktop.png',
  fullPage: true
})

// STEP 2: Tablet screenshot
mcp__chrome-devtools__resize_page({ width: 768, height: 1024 })
mcp__chrome-devtools__wait_for({ time: 1 })  // Wait for responsive layout shift
mcp__chrome-devtools__take_screenshot({
  filePath: '/tmp/test-${featureName}-tablet.png',
  fullPage: true
})

// STEP 3: Mobile screenshot
mcp__chrome-devtools__resize_page({ width: 375, height: 667 })
mcp__chrome-devtools__wait_for({ time: 1 })
mcp__chrome-devtools__take_screenshot({
  filePath: '/tmp/test-${featureName}-mobile.png',
  fullPage: true
})

// STEP 4: Visual Inspection (MANDATORY)
```

**Use Read tool to inspect screenshots (Claude can see images!):**

```typescript
// Read desktop screenshot
Read({ file_path: '/tmp/test-${featureName}-desktop.png' })

// Visual verification checklist:
// - ✅ Element is VISIBLE (not hidden off-screen)
// - ✅ Text is READABLE (font size appropriate, not cut off)
// - ✅ Layout is NOT broken (no overflow, no collapsed sections)
// - ✅ Buttons are NOT overlapping content
// - ✅ Navigation is accessible (sidebar visible and usable)
// - ✅ Content matches expected (resource title, description visible)

// Read tablet screenshot
Read({ file_path: '/tmp/test-${featureName}-tablet.png' })

// Additional tablet checks:
// - ✅ Sidebar collapses to hamburger menu (if mobile-first design)
// - ✅ Table horizontal scroll works (if table too wide)
// - ✅ Cards stack properly (if using grid layout)

// Read mobile screenshot
Read({ file_path: '/tmp/test-${featureName}-mobile.png' })

// Additional mobile checks:
// - ✅ Single column layout (cards stack vertically)
// - ✅ Font sizes readable (minimum 14px)
// - ✅ Touch targets large enough (minimum 44×44px)
// - ✅ Horizontal scrolling NOT required (content fits width)
```

**If ANY viewport fails visual inspection:**

```
1. This is a RESPONSIVE DESIGN BUG
2. Invoke: Skill({ skill: "systematic-debugging" })
3. Investigation:
   - Which viewport broke? (desktop/tablet/mobile)
   - What's wrong? (hidden, overlapping, cut off, unreadable)
   - What changed? (recent CSS edit, component update)
4. Fix Location: client/src/components/ or client/src/styles/
5. Fix Pattern: Tailwind responsive classes
   - sm: (min-width: 640px) - Mobile landscape +
   - md: (min-width: 768px) - Tablet +
   - lg: (min-width: 1024px) - Desktop +
   - xl: (min-width: 1280px) - Large desktop +
6. Rebuild Docker
7. Retest ALL 3 viewports
8. All must pass before continuing
```

**Example Responsive Fix:**
```tsx
// Before (broken on mobile):
<div className="flex gap-4">
  <Button>Action 1</Button>
  <Button>Action 2</Button>
  <Button>Action 3</Button>
</div>
// Problem: 3 buttons don't fit on 375px width

// After (responsive):
<div className="flex flex-col sm:flex-row gap-4">
  <Button className="w-full sm:w-auto">Action 1</Button>
  <Button className="w-full sm:w-auto">Action 2</Button>
  <Button className="w-full sm:w-auto">Action 3</Button>
</div>
// Mobile: Stacks vertically, full width
// Tablet+: Horizontal row, auto width
```

---

## Supabase MCP Integration Patterns

### Understanding Service Role vs Authenticated Queries

**Supabase MCP uses service_role key:**
- Bypasses ALL RLS policies
- Sees all data regardless of user context
- Cannot test RLS policies via direct SQL

**To test RLS:**
```
❌ DON'T: Query user_favorites via Supabase MCP expecting filtered results
✅ DO: Call /api/favorites endpoint via Chrome DevTools, check response

Pattern:
1. Create data as User A (via UI or API)
2. Verify data exists via Supabase MCP (Layer 2 - service_role sees it)
3. Login as User B (via UI)
4. Call GET /api/favorites (via evaluate_script with User B's token)
5. Verify response is EMPTY (RLS blocked User A's data from User B)
```

### Common Supabase MCP Operations

**Query auth.users (Managed Schema):**
```sql
SELECT id, email, raw_user_meta_data->>'role' as role, created_at
FROM auth.users
WHERE email = 'testuser-a@test.com';
```

**JSONB Querying (Metadata):**
```sql
-- Check if AI analyzed
SELECT id, title, metadata->>'ai_analyzed' as analyzed
FROM resources
WHERE metadata->>'ai_analyzed' = 'true'
LIMIT 10;

-- Array contains (journey progress)
SELECT * FROM user_journey_progress
WHERE 'step-uuid' = ANY(completed_steps);
```

**RLS Policy Inspection:**
```sql
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('user_favorites', 'user_bookmarks')
ORDER BY tablename, policyname;
```

**Transaction Verification (Check Atomic Operations):**
```sql
-- After bulk approve, verify ALL resources updated
SELECT status, COUNT(*) as count
FROM resources
WHERE id IN ('id1', 'id2', 'id3', 'id4', 'id5')
GROUP BY status;

-- Expected: All have status='approved' (not mix of approved/pending)
-- If mixed: Transaction not atomic - CRITICAL BUG
```

### 3-Layer Pattern with Supabase Integration

**Complete Example: Add Favorite**

```typescript
// ===== LAYER 1: API/Network =====

// Navigate and authenticate first
mcp__chrome-devtools__navigate_page({ url: `http://localhost:${AGENT_PORT}/login` })
// [Complete login flow]

// Navigate to category
mcp__chrome-devtools__navigate_page({ url: `http://localhost:${AGENT_PORT}/category/encoding-codecs` })

// Take snapshot to find favorite button
mcp__chrome-devtools__take_snapshot({})
// Look for: button with data-testid="button-favorite" or star icon

// Click favorite button
mcp__chrome-devtools__click({ uid: 'FAVORITE_BUTTON_UID' })

// Wait for network request
mcp__chrome-devtools__wait_for({ time: 2 })

// Check network log
mcp__chrome-devtools__list_network_requests({ resourceTypes: ['fetch'] })
// Verify: POST /api/favorites/[resourceId] → Status 200

// ===== LAYER 2: Database =====

// Extract user ID from localStorage
const userIdResult = mcp__chrome-devtools__evaluate_script({
  function: `() => {
    const data = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
    return data ? JSON.parse(data).user?.id : null;
  }`
})

// Query database
mcp__supabase__execute_sql({
  query: `SELECT user_id, resource_id, created_at
          FROM user_favorites
          WHERE user_id = '${userIdResult}'
          ORDER BY created_at DESC
          LIMIT 1`
})
// Expected: 1 row with recent created_at

// ===== LAYER 3: UI (Responsive) =====

// Navigate to profile
mcp__chrome-devtools__navigate_page({ url: `http://localhost:${AGENT_PORT}/profile` })

// Desktop verification
mcp__chrome-devtools__resize_page({ width: 1920, height: 1080 })
mcp__chrome-devtools__take_screenshot({ filePath: '/tmp/favorite-profile-desktop.png' })
Read({ file_path: '/tmp/favorite-profile-desktop.png' })
// Verify: Favorited resource appears in favorites list

// Tablet verification
mcp__chrome-devtools__resize_page({ width: 768, height: 1024 })
mcp__chrome-devtools__take_screenshot({ filePath: '/tmp/favorite-profile-tablet.png' })
Read({ file_path: '/tmp/favorite-profile-tablet.png' })
// Verify: Still visible, layout adapted

// Mobile verification
mcp__chrome-devtools__resize_page({ width: 375, height: 667 })
mcp__chrome-devtools__take_screenshot({ filePath: '/tmp/favorite-profile-mobile.png' })
Read({ file_path: '/tmp/favorite-profile-mobile.png' })
// Verify: Still visible, single column layout

// ===== RESULT =====

IF all 3 layers pass at all 3 viewports:
  → Document evidence
  → Feature VERIFIED ✅
  → Continue to next

ELSE:
  → Invoke systematic-debugging
  → Find which layer/viewport failed
  → Fix bug
  → Rebuild Docker
  → Restart test from beginning
```

---

## Docker Operations Reference

### Build Docker Image

```bash
docker build -t awesome-list-agent-$AGENT_PORT:latest \
  --build-arg PORT=$AGENT_PORT \
  --no-cache \
  .
```

**When to use `--no-cache`:**
- ✅ After editing server/ code
- ✅ After editing client/src/ code
- ✅ After package.json changes
- ✅ When "old code" mysteriously appears
- ✅ Always on first build per session
- ❌ NOT needed for docs/ changes
- ❌ NOT needed for .env changes (just restart)

### Run Docker Container

```bash
docker run -d \
  --name awesome-agent-$AGENT_PORT \
  -p $AGENT_PORT:$AGENT_PORT \
  -e PORT=$AGENT_PORT \
  -e DATABASE_URL="$DATABASE_URL" \
  -e SUPABASE_URL="$SUPABASE_URL" \
  -e SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
  awesome-list-agent-$AGENT_PORT:latest
```

**Environment variables required:**
- `PORT` - Your assigned port
- `DATABASE_URL` - Supabase connection string
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anon key

### Stop and Remove Container

```bash
docker stop awesome-agent-$AGENT_PORT
docker rm awesome-agent-$AGENT_PORT
```

### Check Container Logs

```bash
# Last 50 lines
docker logs awesome-agent-$AGENT_PORT | tail -50

# Follow logs in real-time
docker logs -f awesome-agent-$AGENT_PORT

# Search for errors
docker logs awesome-agent-$AGENT_PORT | grep -i error
```

### Complete Rebuild Sequence

```bash
# Stop and remove
docker stop awesome-agent-$AGENT_PORT && docker rm awesome-agent-$AGENT_PORT

# Rebuild from scratch
docker build -t awesome-list-agent-$AGENT_PORT:latest \
  --build-arg PORT=$AGENT_PORT \
  --no-cache \
  .

# Run new container
docker run -d \
  --name awesome-agent-$AGENT_PORT \
  -p $AGENT_PORT:$AGENT_PORT \
  -e PORT=$AGENT_PORT \
  awesome-list-agent-$AGENT_PORT:latest

# Wait for startup
sleep 30

# Verify healthy
curl http://localhost:$AGENT_PORT/api/health
docker ps | grep awesome-agent-$AGENT_PORT
```

**Rebuild Required After:**
- ✅ ANY file edit in server/
- ✅ ANY file edit in client/src/
- ✅ ANY file edit in shared/
- ✅ package.json dependency changes
- ❌ docs/ file changes (no rebuild)
- ❌ .env changes (restart container only)

---

## Quick Reference: Chrome DevTools MCP

### Essential Commands

**Navigate:**
```typescript
mcp__chrome-devtools__navigate_page({ type: 'url', url: `http://localhost:${AGENT_PORT}/` })
```

**Take Snapshot (Get Element UIDs):**
```typescript
mcp__chrome-devtools__take_snapshot({})
// Returns accessibility tree with UIDs like:
// - button "Login" [uid="e45"]
// - textbox "Email" [uid="e78"]
```

**Click Element:**
```typescript
mcp__chrome-devtools__click({ uid: 'e45' })
```

**Fill Input:**
```typescript
mcp__chrome-devtools__fill({ uid: 'e78', value: 'admin@test.com' })
```

**Execute JavaScript (Extract Token):**
```typescript
mcp__chrome-devtools__evaluate_script({
  function: `() => {
    const data = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
    return data ? JSON.parse(data).access_token : null;
  }`
})
```

**Check Network Requests:**
```typescript
mcp__chrome-devtools__list_network_requests({ resourceTypes: ['fetch'] })
```

**Take Screenshot:**
```typescript
mcp__chrome-devtools__take_screenshot({ filePath: '/tmp/evidence.png', fullPage: true })
```

**Wait for Element/Text:**
```typescript
mcp__chrome-devtools__wait_for({ text: 'Success', timeout: 5000 })
```

**Check Console Errors:**
```typescript
mcp__chrome-devtools__list_console_messages({ types: ['error'] })
```

### Essential Supabase MCP Commands

**Execute SQL:**
```typescript
mcp__supabase__execute_sql({
  query: "SELECT * FROM resources WHERE id = 'uuid'"
})
```

**List Tables:**
```typescript
mcp__supabase__list_tables({ schemas: ['public', 'auth'] })
```

**Get Logs (Debug Backend):**
```typescript
mcp__supabase__get_logs({ service: 'api' })
```

### Authentication Pattern

```typescript
// 1. Navigate to login
mcp__chrome-devtools__navigate_page({ url: `http://localhost:${AGENT_PORT}/login` })

// 2. Take snapshot to find form
mcp__chrome-devtools__take_snapshot({})

// 3. Fill credentials (Login.tsx has NO data-testid!)
mcp__chrome-devtools__fill({ uid: 'EMAIL_UID', value: 'admin@test.com' })
mcp__chrome-devtools__fill({ uid: 'PASSWORD_UID', value: 'TestAdmin123!' })

// 4. Submit
mcp__chrome-devtools__click({ uid: 'SUBMIT_BUTTON_UID' })

// 5. Wait for redirect
mcp__chrome-devtools__wait_for({ text: 'Profile', timeout: 5000 })

// 6. Extract auth token
mcp__chrome-devtools__evaluate_script({
  function: `() => {
    const data = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
    if (!data) return null;
    const parsed = JSON.parse(data);
    return {
      access_token: parsed.access_token,
      userId: parsed.user?.id,
      email: parsed.user?.email,
      role: parsed.user?.user_metadata?.role || 'user',
      isAdmin: parsed.user?.user_metadata?.role === 'admin'
    };
  }`
})
```

---

## Test Users & Credentials

| User | Email | Password | User ID | Role |
|------|-------|----------|---------|------|
| Admin | admin@test.com | TestAdmin123! | Query from DB | admin |
| User A | testuser-a@test.com | TestUserA123! | cc2b69a5-7563-4770-830b-d4ce5aec0d84 | user |
| User B | testuser-b@test.com | TestUserB123! | 668fd528-1342-4c8a-806b-d8721f88f51e | user |

**Get Admin User ID:**
```sql
SELECT id FROM auth.users
WHERE raw_user_meta_data->>'role' = 'admin'
LIMIT 1;
```

---

## Common Patterns & Examples

### Pattern 1: Admin Approval Workflow

```typescript
// Admin login
// [Complete login flow]

// Navigate to pending resources
mcp__chrome-devtools__navigate_page({ url: `http://localhost:${AGENT_PORT}/admin/approvals` })

// Take snapshot
mcp__chrome-devtools__take_snapshot({})

// Find pending resource (has data-testid!)
const approveButton = '[data-testid="button-approve-${resourceId}"]';
mcp__chrome-devtools__click({ uid: 'APPROVE_BUTTON_UID' })

// Confirm in dialog
mcp__chrome-devtools__take_snapshot({})
const confirmButton = '[data-testid="button-confirm-approve"]';
mcp__chrome-devtools__click({ uid: 'CONFIRM_BUTTON_UID' })

// Wait for success
mcp__chrome-devtools__wait_for({ text: 'approved', timeout: 5000 })

// Layer 2: Database verification
mcp__supabase__execute_sql({
  query: `SELECT id, title, status, approved_by, approved_at
          FROM resources
          WHERE id = '${resourceId}'`
})
// Expected: status='approved', approved_at NOT NULL

// Layer 2b: Audit log verification (CRITICAL)
mcp__supabase__execute_sql({
  query: `SELECT resource_id, action, performed_by
          FROM resource_audit_log
          WHERE resource_id = '${resourceId}'
          AND action = 'approved'
          ORDER BY created_at DESC LIMIT 1`
})
// Expected: 1 row with performed_by = admin user ID

// Layer 3: Public visibility (logout first, then verify as anonymous)
// [Logout flow]
mcp__chrome-devtools__navigate_page({ url: `http://localhost:${AGENT_PORT}/category/[category-slug]` })
mcp__chrome-devtools__take_snapshot({})
// Verify: Resource title appears in public list

// Responsive verification
// [3 viewports as documented above]
```

### Pattern 2: User Isolation (RLS Testing)

```typescript
// User A creates bookmark
// [Login as User A, add bookmark]

// Verify via service_role (Layer 2)
mcp__supabase__execute_sql({
  query: "SELECT * FROM user_bookmarks WHERE user_id = 'cc2b69a5-7563-4770-830b-d4ce5aec0d84'"
})
// Expected: 1 row (User A's bookmark exists)

// Logout User A
mcp__chrome-devtools__evaluate_script({
  function: `() => {
    localStorage.removeItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
    return 'cleared';
  }`
})

// Login as User B
// [Complete login flow with testuser-b credentials]

// Navigate to bookmarks page
mcp__chrome-devtools__navigate_page({ url: `http://localhost:${AGENT_PORT}/bookmarks` })

// Layer 1: Check API response
mcp__chrome-devtools__list_network_requests({ resourceTypes: ['fetch'] })
// Find: GET /api/bookmarks
// Verify response body: [] (empty array - User B has no bookmarks)

// Layer 3: Check UI
mcp__chrome-devtools__take_snapshot({})
// Verify: "No bookmarks yet" message OR empty state
// Verify: User A's bookmarked resource NOT visible

// SUCCESS: RLS working (User B cannot see User A's data)
```

---

## Common Debugging Scenarios

### Scenario 1: "Nothing Happening After Click"

**Symptom:** Clicked button, no response, no error, just waiting

**Diagnostic Sequence:**

```typescript
// 1. Check Console
mcp__chrome-devtools__list_console_messages({ types: ['error'] })

// If React errors:
//   → Component bug (state, props, event handler)
//   → Fix in client/src/components/

// If no errors:
// 2. Check Network
mcp__chrome-devtools__list_network_requests({ resourceTypes: ['fetch'] })

// If no request made:
//   → Event handler not wired (onClick missing)
//   → Check component: Is onClick prop passed? Is mutation defined?
//   → Fix: Add onClick handler or useMutation

// If request pending:
//   → Backend hanging (check which async operation)
//   → Check: Docker logs for backend activity

// If request failed (401/403/500):
//   → [See Level 2 diagnostics above]

// 3. Check Database (even if no request)
// Sometimes request fails silently
mcp__supabase__execute_sql({ query: "SELECT COUNT(*) FROM [table]" })

// If count unchanged:
//   → Request never reached database
//   → OR transaction rolled back
//   → Check backend logs: docker logs awesome-agent-$AGENT_PORT
```

### Scenario 2: "UI Doesn't Update After Successful API Call"

**Symptom:** API returns 200, database has data, but UI still shows old state

**Root Cause:** React Query cache stale (not invalidated after mutation)

**Fix Location:** `client/src/` - Find the mutation that should invalidate cache

**Pattern to Look For:**
```typescript
// BROKEN (cache not invalidated):
const mutation = useMutation({
  mutationFn: addFavorite,
  onSuccess: () => {
    toast({ title: 'Added to favorites' });
    // ❌ Missing: queryClient.invalidateQueries()
  }
})

// FIXED (cache invalidated):
const mutation = useMutation({
  mutationFn: addFavorite,
  onSuccess: () => {
    toast({ title: 'Added to favorites' });
    queryClient.invalidateQueries({ queryKey: ['/api/favorites'] });  // ✅ Add this
  }
})
```

**Verification After Fix:**
- Rebuild Docker
- Retest: Click favorite → UI updates immediately
- All 3 layers pass

### Scenario 3: "Bulk Operation Only Partially Succeeds"

**Symptom:** Selected 5 resources for bulk approve, only 3 approved, 2 still pending

**Root Cause:** Transaction not atomic (missing transaction wrapper or deadlock)

**Database Evidence:**
```sql
SELECT id, title, status
FROM resources
WHERE id IN ('id1', 'id2', 'id3', 'id4', 'id5');

-- Result shows: 3 approved, 2 pending
-- This is CRITICAL BUG (data corruption risk)
```

**Fix:** Add transaction wrapper in backend:
```typescript
// File: server/storage.ts or server/routes.ts

// BEFORE (no transaction):
for (const id of resourceIds) {
  await db.update(resources).set({ status: 'approved' }).where(eq(resources.id, id));
}

// AFTER (atomic transaction):
await db.transaction(async (tx) => {
  for (const id of resourceIds) {
    await tx.update(resources).set({ status: 'approved' }).where(eq(resources.id, id));
  }
  // Either ALL succeed or ALL rollback
});
```

---

## When to Invoke Which Skill

### systematic-debugging (Required for EVERY Bug)

**Invoke when:**
- ANY of 3 layers fails
- Unexpected behavior
- Error in console
- API returns unexpected status
- Database doesn't match expected
- UI doesn't update

**Syntax:**
```typescript
Skill({ skill: "systematic-debugging" })
```

**Follow 4-phase protocol:**
1. Root Cause Investigation (15 min)
2. Pattern Analysis (10 min)
3. Hypothesis Testing (10 min)
4. Fix Implementation (15-30 min)

**Total per bug:** 50-70 minutes (rebuild included)

### root-cause-tracing (For Deep Bugs)

**Invoke when:**
- Bug is deep in call stack
- systematic-debugging Phase 3 can't pinpoint issue
- Transaction fails with unclear cause
- Data corruption detected
- Error occurs in nested function calls

**Syntax:**
```typescript
Skill({ skill: "root-cause-tracing" })
```

**Apply:** Backward tracing from error to original trigger

---

## Evidence Requirements

**For EVERY verified feature, collect:**

### 1. Screenshots (9 per feature)
- Desktop: Before action, after action, final state
- Tablet: Before, after, final
- Mobile: Before, after, final

### 2. Network Evidence
```
GET /api/favorites
Status: 200 OK
Response: [{"resource_id":"...","created_at":"..."}]
```

### 3. Database Evidence
```sql
SELECT * FROM user_favorites WHERE user_id = 'X';
-- Result: 1 row, recent created_at
```

### 4. Console State
```
No errors in console (checked via list_console_messages)
```

**Document in:** `docs/evidence/${domain}-results.md`

**Format:**
```markdown
## Feature: Add Favorite

**Status:** ✅ VERIFIED

**Layer 1 (API):**
- Request: POST /api/favorites/${resourceId}
- Status: 200 OK
- Evidence: Network log shows successful request

**Layer 2 (Database):**
```sql
SELECT * FROM user_favorites WHERE user_id = 'cc2b69a5-...' ORDER BY created_at DESC LIMIT 1;
-- Result: 1 row, created_at = 2025-12-01 15:23:45
```

**Layer 3 (UI - Responsive):**
- Desktop (1920×1080): ✅ Visible, readable, not broken
- Tablet (768×1024): ✅ Adapted layout, still accessible
- Mobile (375×667): ✅ Single column, touch targets adequate
- Screenshots: /tmp/favorite-desktop.png, favorite-tablet.png, favorite-mobile.png

**Bugs Found:** 0
**Fixes Applied:** None
**Duration:** 8 minutes
```

---

## For Complete Reference

**This SKILL.md provides:**
- ✅ Core principles and mandatory loops
- ✅ Domain knowledge (awesome list, schema)
- ✅ Real selectors from actual components
- ✅ Diagnostic decision trees
- ✅ Docker isolation setup
- ✅ Quick command reference

**For comprehensive details, see:**
- **REFERENCE.md** - Complete 2000+ line manual (all commands, all queries, all workflows)
- **DOMAIN_KNOWLEDGE.md** - Extended domain guide
- **RESPONSIVE_TESTING.md** - Complete responsive testing guide
- **SELECTORS.md** - All 130+ data-testid attributes cataloged

**Load these files when you need deeper reference, but THIS skill provides enough to start testing.**

---

## Red Flags Summary (Stop and Correct)

**If you catch yourself:**
- ❌ Skipping Serena activation
- ❌ Testing on port 3000 (should be your assigned port!)
- ❌ Skipping Layer 3 because "API works"
- ❌ Not taking 3 viewport screenshots
- ❌ Not inspecting screenshots visually
- ❌ Not rebuilding Docker after code changes
- ❌ Continuing mid-test after bug fix (should restart from beginning)
- ❌ Not invoking systematic-debugging for bugs
- ❌ Proposing "quick fixes" without 4-phase investigation
- ❌ Claiming "2 out of 3 layers is good enough"

**ALL of these mean: STOP. Re-read this skill. Follow the mandatory protocols.**

---

## Success Criteria (When You're Done)

**Your domain is COMPLETE when:**
- ✅ All features in domain tested via frontend
- ✅ All tests passed 3-layer validation at 3 viewports
- ✅ All bugs found were fixed (self-correcting loop completed)
- ✅ Evidence document created with screenshots + SQL + network logs
- ✅ Code changes committed
- ✅ Container running stable
- ✅ No KNOWN_LIMITATIONS (or <3 documented)

**Report to coordinator:**
- Domain name
- Features tested
- Bugs found and fixed
- Evidence file location
- Duration
- Container status (running on port X)

---

**Skill Version:** 2.0.0 (Corrected for Docker Isolation + Frontend-Driven Development)
**Created:** 2025-12-01
**Replaces:** multi-context-integration-testing v1.x (reference manual format)
**Tested:** Not yet (RED phase = 13 failed plans, GREEN phase = this skill, REFACTOR phase = future agent testing)

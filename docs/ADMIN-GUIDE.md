# Admin Guide

Comprehensive guide for administrators of the Awesome Video Resource Viewer platform.

## Accessing the Admin Panel

### Login
1. Sign in through the site's Clerk authentication flow (password login was removed)
2. After login, click "Admin" in the navigation or go to `/admin`

### Initial Admin Setup
If no admin exists, sign in once via Clerk, then grant the account the admin
role directly in the database:
```sql
UPDATE users SET role = 'admin' WHERE email = '<your-email>';
```

## Dashboard Overview

The admin dashboard (`/admin`, in `client/src/pages/AdminDashboard.tsx`) is a
tabbed interface. The tabs, in order, are:

| Tab | Purpose |
|-----|---------|
| **Approvals** | Review pending resource submissions |
| **Edit Suggestions** | Review user-proposed edits to existing resources |
| **Enrichment** | Run/monitor Claude AI enrichment jobs |
| **Researcher** | Run/monitor the AI research agent and review discoveries |
| **Export** | Export the catalog to Markdown / JSON / GitHub |
| **Database** | Seeding and maintenance operations |
| **Resources** | CRUD for individual resources |
| **Categories** | CRUD for top-level categories |
| **Subcategories** | CRUD for subcategories |
| **Sub-Subcats** | CRUD for sub-subcategories |
| **Journeys** | Manage learning journeys and their steps |
| **Users** | Manage users and roles |
| **GitHub** | Import/export sync with GitHub repositories |
| **Link Health** | Scan resource URLs for broken links |
| **Digests** | Email digest queue health and scheduling |
| **Audit** | Browse the admin action audit log |

Summary stats (total resources, pending approvals, users, learning journeys)
come from `GET /api/admin/stats`.

## Resource Management

### Viewing Resources
- Navigate to Admin → Resources
- Use filters: category, status, search
- Pagination for large datasets

### Approving/Rejecting Submissions
1. Go to Admin → Pending Approvals
2. Review each submission
3. Click **Approve** to publish or **Reject** with reason

### Creating Resources
1. Admin → Resources → Add New
2. Fill in:
   - Title (required)
   - URL (required)
   - Description
   - Category/Subcategory
3. Resources created by admin are auto-approved

### Editing Resources
1. Find resource in list
2. Click Edit icon
3. Modify fields
4. Save changes

#### Kind override and Curated placement

In **Resources**, edit a resource to change **Kind override** or **Curated
placement**. Unlike the other edit fields, these two controls **save
immediately**; closing the dialog does not undo a successful change.
Failed updates show an inline error and restore the previous value.

Kinds are `tools`, `libraries`, `standards`, `events`, `protocols`, and
`other`. Every resource has a stored kind chosen by the automatic classifier.
**Automatic — X** throws away a manual choice and stores the classifier's
answer X again. Editing other fields does not reclassify a stored kind. See
[RESOURCE-KINDS.md](RESOURCE-KINDS.md) for how the classifier decides.
Curated placement persists `metadata.featured` while preserving other metadata.
The create form also offers these fields, saved with the new resource.

These are additive API features; see the [generated OpenAPI contract](api/openapi.yaml)
and [independent compatibility checks](parity/VERIFICATION.md).

### Deleting Resources
1. Find resource in list
2. Click Delete icon
3. Confirm deletion
4. Note: Deletion is logged in audit trail

## Contact submissions inbox

Open **Admin → Audit** (`/admin#audit`) and find **Contact submissions**.
The inbox displays newest-first submissions in pages of 20, with previous/next
controls and a detail dialog. Email addresses are masked in the list; authorized
administrators can inspect submission details. Loading, empty, unavailable, and
failed-request states are distinct; a failed request offers Retry.

Intake is independently default-off even if a contact UI variant is selected.
Receipts mean database persistence, not email delivery. There is no inbox delete
endpoint; configured retention handles expired submissions. See
[contact configuration, retention, and screenshots](CONTACT-VARIANTS.md).

## Edit Suggestion Queue

Users can suggest edits to existing resources.

### Reviewing Edit Suggestions
1. Navigate to Admin → Edit Suggestions
2. Each suggestion shows:
   - Original resource
   - Proposed changes (diff view)
   - AI analysis (if available)
   - Submitter info

### Approving Edits
1. Review the proposed changes
2. Click **Approve** to merge changes
3. Resource is updated automatically
4. Submitter is notified (if implemented)

### Rejecting Edits
1. Click **Reject**
2. Enter rejection reason (minimum 10 characters)
3. This helps users understand what improvements are needed

### Conflict Detection
If resource was modified after edit submission:
- System detects conflict
- Shows warning before approval
- Admin can force merge or reject

## Category Management

The 3-level hierarchy (Category → Subcategory → Sub-subcategory) is managed
across three separate tabs: **Categories**, **Subcategories**, and **Sub-Subcats**.

### Viewing Categories
- Admin → Categories / Subcategories / Sub-Subcats
- Resource counts per entry

### Creating Categories
1. On the relevant tab, click "Add"
2. Enter name (slug auto-generated)
3. For a subcategory: select parent category
4. For a sub-subcategory: select parent subcategory

### Editing Categories
1. Click Edit icon
2. Modify name
3. Slug updates automatically
4. Resources maintain association

### Deleting Categories
- Cannot delete categories with resources
- Must reassign or delete resources first
- Deletion cascades to subcategories

## User Management

### Viewing Users
- Admin → Users
- Lists all registered users
- Shows role, email, registration date

### Changing User Roles
1. Find user in list
2. Click role dropdown
3. Select new role:
   - **user**: Standard access
   - **moderator**: Can review submissions
   - **admin**: Full access

## GitHub Synchronization

> **📘 Deep Dive Guide Available**
> For comprehensive conceptual understanding, conflict resolution strategies, and detailed troubleshooting, see [GITHUB-SYNC-DEEP-DIVE.md](./GITHUB-SYNC-DEEP-DIVE.md).

### Import from GitHub

Import resources from any awesome-list repository.

1. Navigate to Admin → GitHub Sync
2. Enter raw README.md URL:
   ```
   https://raw.githubusercontent.com/user/repo/main/README.md
   ```
3. Options:
   - **Dry Run**: Preview without importing
   - **Strict Mode**: Fail on validation errors
4. Click Import
5. Review results:
   - Imported count
   - Updated count
   - Skipped count
   - Validation errors/warnings

### Export to GitHub

Export current resources to awesome-list format.

1. Configure repository in settings
2. Navigate to Admin → Export
3. Configure export options:
   - Title
   - Description
   - Include contributing section
4. Click "Export to GitHub"
5. Creates commit/PR in target repository

### awesome-lint Compliance

The export system ensures compliance with awesome-lint rules:
- Proper heading structure
- Valid badge placement
- ToC anchor generation
- URL deduplication
- Description sanitization
- Spelling corrections

## Data Validation

### awesome-lint Validation
There is no standalone "Validation" tab. awesome-lint validation runs
automatically as part of the **GitHub import** (rejects non-compliant lists) and
**export** (blocks pushing non-compliant Markdown) flows. Validation errors and
warnings — with line numbers and rule names — are surfaced in the import/export
result. The linter lives in `server/validation/awesomeLint.ts`.

### Link Checking (Link Health tab)
1. Admin → **Link Health**
2. System checks resource URLs and persists results
3. Reports:
   - Valid links
   - Broken links (4xx, 5xx)
   - Redirects (3xx)
   - Timeouts

Link scans can also run on a schedule (`server/jobs/linkHealthScheduler.ts`);
the service lives in `server/services/linkHealthService.ts`.

For a complete, resumable production URL sweep outside the admin UI, run
`npx tsx scripts/prod-link-scan.ts` from the repository root. It performs
read-only network checks and stores progress under `.local/prod-link-scan/`;
rerun it to continue a scan that reaches its time budget.

### Acting on Broken Links
- Review the broken-link report on the Link Health tab
- Delete or update broken resources
- Re-run the scan to confirm fixes

## AI Enrichment

Automatically enrich resources with metadata using Claude AI.

### Starting Enrichment Job
1. Admin → Enrichment
2. Select filter:
   - **Unenriched**: Only resources without metadata
   - **All**: Re-enrich everything
3. Set batch size (10-50 recommended)
4. Click "Start Enrichment"

### Monitoring Jobs
- View active/completed jobs
- Progress percentage
- Processed/failed counts
- Error logs

### Cancelling Jobs
- Click "Cancel" on active job
- Partial progress is preserved

### What Gets Enriched
- Page title and description
- Open Graph images
- Twitter Card data
- Favicon
- AI-generated tags
- Content categorization

See [AI-SERVICES.md](./AI-SERVICES.md) for the enrichment pipeline internals.

## Research Agent

The **Researcher** tab runs an AI research agent that discovers new candidate
resources from the web (backed by `server/ai/researchService.ts`). The tab
walks you from launch, through the live run, to reviewing what it found.

### Launching a run
Admin → **Researcher**. The launch card has five steps:

1. **Brief** — *Auto-generate at launch* (a gap-aware brief built from the
   catalog and past runs) or *Write my own*. "Start from a generated brief"
   fills the text box with a brief you can edit. A custom brief needs at least
   10 characters.
2. **Focus** — one category, or all categories.
3. **Limits** — *Stop after* N new discoveries, a *Budget cap* in USD
   (default $3.00) and *Max turns* (default 40). A blank field means no cap.
4. **Endpoint & model** (optional) — override the orchestrator model, the
   scout model, or the base URL + auth token. Leave them empty to use the
   server's configuration. The step heading counts active overrides.
5. **About to run on** — the endpoint host, credential source, orchestrator
   model and scout model the run will use, resolved by the server
   (`GET /api/researcher/config`) and refreshed as you edit step 4. Each
   override is marked **Override**. If the configuration cannot launch (a
   missing environment variable, a base URL without a token, an invalid URL,
   or an unconfirmed plain-`http://` endpoint), the server's message appears
   here and **Launch research run** stays disabled. A plain-`http://` base URL
   needs the confirmation checkbox in step 4.

**Launch research run** asks for confirmation, then starts the run. Only one
run can be active; while one is going, the card offers **Follow run #N**
instead. Launching works whether or not the lower "All pending discoveries &
full job history" panel is open.

### Following a run
After launch the card becomes the live run view (opening the tab while a run
is active, or a `?jobId=N` link, opens the same view):

- **Phase timeline** — Planning → Scouting → Verifying → Saving → Done, with
  the time each phase started. A run can move back and forth between phases;
  the timeline shows the current one. The last step reads Done, Stopped at
  budget, Cancelled or Failed.
- **Scouts** — one card per scout the agent sends out, with its task, and when
  it reports: web searches, candidate URLs and duration.
- **Discoveries** — each saved discovery appears in the list as it is saved,
  with progress against the *Stop after* target.
- **Turns** and **Spend** — the server counts these when the run ends, so
  during the run they show the caps; afterwards, the real values against the
  caps. A cost marked *lower bound* comes from a run that did not finish
  normally (cancel or abort) and undercounts.
- **Cancel run** stops the run; discoveries saved so far are kept.
- **Run details** opens the raw agent event log and the agent communication
  graph.

Phase changes, saved discoveries and the ending are announced to screen
readers. Animations are skipped when the system asks for reduced motion.

### Reviewing a run's discoveries
When the run ends, the view says how it ended and what to do next (for
example "Budget cap reached — review the 2 saved discoveries, or relaunch with
a higher cap", with a **Relaunch with a higher cap** button that returns to the
launch steps at the budget field). Keyboard focus moves to **Review
discoveries**:

- **Approve** adds the discovery to the catalog as an approved resource.
- **Reject** asks for an optional reason and marks it rejected.

Then **Done — go to job history** (or **Review later**) shows the jobs table
with the run highlighted, or **Start another run** returns to the launch
steps.

Discoveries from every run that still need review are under **All pending
discoveries & full job history → Review Discoveries** (with **Approve All**);
**Job History** lists every run with its cost, turns and errors.

Endpoints: `GET /api/researcher/config`, `POST /api/researcher/start`,
`GET /api/researcher/jobs`, `GET /api/researcher/jobs/:id`,
`GET /api/researcher/jobs/:id/events`, `DELETE /api/researcher/jobs/:id`,
`GET /api/researcher/discoveries`,
`POST /api/researcher/discoveries/:id/approve|reject`. See
[AI-SERVICES.md](./AI-SERVICES.md) ("Researcher run contract").

## Learning Journeys

The **Journeys** tab manages curated learning journeys and their ordered steps.

### Managing Journeys
1. Admin → **Journeys**
2. Pick an existing journey and edit its details (`PUT /api/admin/journeys/:id`)
3. Add, reorder, or remove steps that reference resources

The admin panel cannot create or delete a journey: there is no create control and no `POST /api/admin/journeys` route. New journeys come only from the seed CLI (`server/cli/seedJourneys.ts`), which calls Claude for each journey and inserts it as `published`. With no journeys in the database, the tab shows "No journeys yet."

Only **published** journeys are visible to end users on `/journeys`.

## Export & Backup

### Markdown Export
1. Admin → Export → Download Markdown
2. Downloads awesome-lint compliant README.md
3. Use for GitHub repositories

### JSON Snapshot (not a backup)
1. Admin → Export → JSON Snapshot → Download
2. Includes resources (all statuses), the category hierarchy, tags, learning
   journeys, the sync queue and limited user summaries.
3. It is a **non-restorable catalog snapshot**: it omits user identities,
   favorites, bookmarks, contributions, audit history, AI jobs and
   discoveries, notification preferences and other application state. Do not
   rely on it to recover the site.

### Full database backup (restorable)
1. Admin → Export → **Full database backup** → Create backup.
2. Takes a `pg_dump` of every table, row, key, index and sequence (including
   user accounts, favorites, bookmarks, journeys, audit history, AI jobs and
   preferences) and stores it in the project's **private App Storage**. It is
   never downloaded to the browser.
3. The panel lists each backup with its table count, row count, size and
   SHA-256, plus the per-table row counts of the latest one.
4. Restore with the operator runbook: [DATABASE-BACKUP.md](DATABASE-BACKUP.md).

## Database Operations

### Manual Seeding
1. Admin → Database → Seed Database
2. Options:
   - Clear existing: Wipe and reseed
3. Re-imports from source data

### Audit Log
All admin actions are logged:
- Resource create/update/delete
- Category changes
- Approval/rejection decisions
- User role changes
- Bulk exports (Markdown/JSON/GitHub) and full database backups (`database.backed_up`)

Browse entries in the **Audit** tab, or query the `resource_audit_log` table
directly in the database.

## Best Practices

### Resource Curation
1. Check URLs are accessible
2. Verify descriptions are accurate
3. Ensure proper categorization
4. Add relevant tags

### Regular Maintenance
1. Weekly: Run link checker
2. Monthly: Review pending submissions
3. Quarterly: Full validation check
4. As needed: Re-enrich outdated resources

### Before Major Exports
1. Run awesome-lint validation
2. Fix all errors
3. Address warnings if possible
4. Run link checker
5. Export and verify

### User Management
1. Promote trusted users to moderators
2. Monitor for spam submissions
3. Review user activity periodically

## Troubleshooting

### Import Fails
- Check URL is accessible
- Verify awesome-list format
- Check for parsing errors in logs
- Try dry-run first

### Export Fails
- Check GitHub token permissions
- Verify repository exists
- Check branch name

### Enrichment Stuck
- Check Claude API key
- Monitor rate limits
- Cancel and restart with smaller batch

### Validation Errors
- awesome-contributing: Need CONTRIBUTING.md file
- awesome-github: Must be git repository
- Both are expected for standalone exports

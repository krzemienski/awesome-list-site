# Admin Guide

Comprehensive guide for administrators of the Awesome Video Resource Viewer platform.

## Accessing the Admin Panel

### Login
1. Navigate to `/login`
2. Use local admin credentials or Replit OAuth (if configured as admin)
3. After login, click "Admin" in the navigation or go to `/admin`

### Initial Admin Setup
If no admin exists:
```bash
npx tsx scripts/reset-admin-password.ts
```
This creates/resets the admin account with credentials displayed in console.

## Dashboard Overview

The admin dashboard displays:
- **Total Resources**: All resources in the database
- **Pending Approvals**: Resources awaiting review
- **Total Users**: Registered user count
- **Learning Journeys**: Created learning paths

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

### Deleting Resources
1. Find resource in list
2. Click Delete icon
3. Confirm deletion
4. Note: Deletion is logged in audit trail

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

### Viewing Categories
- Admin → Categories
- Shows 3-level hierarchy: Category → Subcategory → Sub-subcategory
- Resource counts per category

### Creating Categories
1. Click "Add Category"
2. Enter name (slug auto-generated)
3. For subcategory: select parent category
4. For sub-subcategory: select parent subcategory

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
1. Admin → Validation → Run Validation
2. Shows:
   - Error count
   - Warning count
   - Specific issues with line numbers
3. Fix issues and re-validate

### Link Checking
1. Admin → Validation → Check Links
2. System checks all resource URLs
3. Reports:
   - Valid links
   - Broken links (4xx, 5xx)
   - Redirects (3xx)
   - Timeouts

### Acting on Broken Links
- Review broken link report
- Delete or update broken resources
- Re-run check to confirm fixes

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

## Export & Backup

### Markdown Export
1. Admin → Export → Download Markdown
2. Downloads awesome-lint compliant README.md
3. Use for GitHub repositories

### JSON Backup
1. Admin → Export → Download JSON
2. Includes:
   - All resources (all statuses)
   - Category hierarchy
   - Users (sanitized)
   - Tags
   - Learning journeys
   - Sync queue
3. Use for full backup/migration

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

Access via database: `resource_audit_log` table

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

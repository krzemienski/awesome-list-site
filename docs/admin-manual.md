# Admin Panel User Manual

**Version**: 2.0.0
**Last Updated**: 2025-11-29
**Status**: Production Ready

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Resource Management](#resource-management)
4. [User Management](#user-management)
5. [AI Enrichment](#ai-enrichment)
6. [GitHub Sync](#github-sync)
7. [Validation Tools](#validation-tools)
8. [Bulk Operations](#bulk-operations)
9. [Analytics & Reports](#analytics--reports)
10. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Accessing the Admin Panel

1. **Login as Admin**:
   - Navigate to https://yourdomain.com/login
   - Sign in with your admin account
   - You'll be redirected to the homepage

2. **Access Admin Dashboard**:
   - Click on your profile avatar in the top-right corner
   - Select "Admin Panel" from the dropdown
   - OR navigate directly to https://yourdomain.com/admin

3. **First-Time Setup**:
   - Ensure your account has been promoted to admin via SQL:
   ```sql
   UPDATE auth.users
   SET raw_user_meta_data = jsonb_set(
     COALESCE(raw_user_meta_data, '{}'::jsonb),
     '{role}',
     '"admin"'
   )
   WHERE email = 'your-admin@email.com';
   ```

### Admin Permissions

**Admin users can**:
- ✅ View all resources (pending, approved, rejected)
- ✅ Approve/reject submitted resources
- ✅ Manage user-suggested edits
- ✅ Run AI enrichment jobs
- ✅ Sync with GitHub repositories
- ✅ Validate resources (awesome-lint, link checking)
- ✅ Export data to markdown
- ✅ View analytics and user activity
- ✅ Promote other users to admin/moderator roles

**Regular users cannot**:
- ❌ Access admin dashboard
- ❌ Approve/reject resources
- ❌ Run batch operations
- ❌ Access user management

---

## Dashboard Overview

### Statistics Cards

The admin dashboard displays real-time statistics:

**Total Resources**:
- All resources in the database (approved + pending + rejected)
- Click to view detailed breakdown by status

**Pending Approvals**:
- Resources awaiting admin approval
- Click to jump to approval queue
- Red badge appears when > 10 pending

**Active Users**:
- Total registered users
- Includes admin, moderator, and regular users
- Click to view user management

**Learning Journeys**:
- Published learning paths
- Click to view journey management

**AI Enrichment Status**:
- Last job completion time
- Success/failure rate
- Resources enriched count

### Quick Actions

**Approve Resources**:
- Opens pending resources tab
- Shows thumbnail preview and details
- Bulk approve/reject options

**Run Enrichment**:
- Starts AI batch enrichment job
- Configure filter (all/unenriched)
- Set batch size (default: 10)

**GitHub Sync**:
- Import from awesome-video repository
- Export to your own repository
- View sync history

**Validation**:
- Run awesome-lint validation
- Check broken links
- View validation report

---

## Resource Management

### Viewing Resources

**All Resources Tab**:
- Displays all resources with status badges
- Filter by: Status, Category, Date range
- Sort by: Created date, Title, URL
- Search: Title, description, URL

**Pending Resources Tab**:
- Only shows resources with `status = 'pending'`
- Includes submission details:
  - Submitted by (user email)
  - Submission date
  - Original description
  - Suggested category/tags

### Approving Resources

**Single Resource Approval**:
1. Click on resource card
2. Review details:
   - Title (editable)
   - URL (validate)
   - Description (editable)
   - Category/subcategory
   - Tags (editable)
3. Click "Approve" button
4. Resource status → `approved`
5. Appears in public listings

**Bulk Approval**:
1. Select multiple resources (checkbox)
2. Click "Approve Selected" button
3. Confirm action in modal
4. All selected resources → `approved`

**Approval Best Practices**:
- ✅ Verify URL is valid and accessible
- ✅ Check title is descriptive
- ✅ Ensure description is clear and concise
- ✅ Validate category is correct
- ✅ Add relevant tags
- ❌ Don't approve spam/promotional content
- ❌ Don't approve broken links
- ❌ Don't approve duplicate resources

### Rejecting Resources

**Single Resource Rejection**:
1. Click on resource card
2. Click "Reject" button
3. Enter rejection reason (required)
4. Confirm rejection
5. Resource status → `rejected`
6. User receives notification (if enabled)

**Rejection Reasons**:
- Broken link
- Duplicate resource
- Not relevant to video development
- Spam/promotional content
- Insufficient description
- Copyright violation

### Editing Resources

**Edit Approved Resources**:
1. Navigate to resource detail page
2. Click "Edit" button (admin only)
3. Modify fields:
   - Title
   - Description
   - Category/subcategory
   - Tags
4. Click "Save Changes"
5. Changes saved immediately

**Handling User-Suggested Edits**:
1. Navigate to "Pending Edits" tab
2. Review proposed changes:
   - Original values
   - Proposed values
   - Diff view (field-level)
3. Options:
   - Approve: Merge changes
   - Reject: Keep original
   - Edit: Modify proposal

---

## User Management

### Viewing Users

**Users List**:
- Email, role, join date, last login
- Filter by role: All, Admin, Moderator, User
- Search by email or name
- Sort by: Join date, last login

**User Details**:
- Profile information
- Activity summary:
  - Resources submitted
  - Edits suggested
  - Bookmarks/favorites
  - Journey progress
- Account status (active/suspended)

### Managing User Roles

**Promote to Admin**:
1. Navigate to user detail page
2. Click "Change Role" button
3. Select "Admin" from dropdown
4. Confirm action
5. User receives admin permissions immediately

**Promote to Moderator**:
1. Same as admin promotion
2. Select "Moderator" role
3. Moderators can:
   - Approve/reject resources
   - Edit resources
   - View analytics
   - Cannot: Promote users, run batch jobs

**Demote to User**:
1. Change role to "User"
2. Admin/moderator permissions revoked
3. User retains their submitted content

**Suspend User** (future feature):
- Prevents login
- Hides submitted resources
- Notifies user via email

---

## AI Enrichment

### What is Enrichment?

AI enrichment enhances resources by:
- Fetching URL metadata (title, description, favicon)
- Generating relevant tags using Claude AI
- Auto-categorizing based on content
- Extracting Open Graph data
- Validating resource quality

### Starting an Enrichment Job

**Basic Enrichment**:
1. Click "Start Enrichment" in dashboard
2. Configure options:
   - **Filter**:
     - "All" - Enrich all approved resources
     - "Unenriched" - Only resources without AI metadata
   - **Batch Size**: 5-20 (default: 10)
3. Click "Start Job"
4. Job begins immediately

**Advanced Options**:
- **Max Retries**: 3 (default)
- **Timeout**: 30s per resource
- **Claude Model**: claude-haiku-4-5
- **Skip on Error**: Continue to next resource

### Monitoring Enrichment Jobs

**Job Status Page**:
- Total resources: Count to enrich
- Processed: Completed count
- Successful: Successfully enriched
- Failed: Errors encountered
- Skipped: Already enriched
- Progress bar (real-time)

**Real-Time Updates**:
- Status changes: pending → processing → completed
- Progress percentage
- Estimated time remaining
- Current resource being processed

**Job Results**:
- Success rate: 90%+ typical
- Failed resource IDs
- Error messages
- AI metadata preview

### Canceling Jobs

1. Navigate to job detail page
2. Click "Cancel Job" button
3. Confirm cancellation
4. Job status → `cancelled`
5. Partial results saved

### Reviewing Enrichment Results

**AI Metadata Fields**:
- `ai_generated_tags`: Array of suggested tags
- `ai_category_suggestion`: Recommended category
- `ai_confidence_score`: 0-1 (confidence level)
- `ai_description_enhanced`: Improved description
- `favicon_url`: Extracted favicon
- `og_image`: Open Graph image URL

**Post-Enrichment Actions**:
- Approve AI suggestions
- Edit tags/categories
- Re-run enrichment for failed resources
- Export enriched data

---

## GitHub Sync

### Import from GitHub

**Import Workflow**:
1. Navigate to "GitHub Sync" tab
2. Click "Import Resources"
3. Enter repository details:
   - Repository URL: `https://github.com/krzemienski/awesome-video`
   - Branch: `main` (default)
4. Configure options:
   - **Dry Run**: Preview without saving
   - **Skip Duplicates**: Check URLs
   - **Auto-Approve**: Set status to approved
5. Click "Start Import"

**Import Process**:
1. Fetch README.md from repository
2. Parse markdown using AwesomeListParser
3. Extract resources with hierarchy
4. Normalize to database schema
5. Check for duplicates (by URL)
6. Save to database
7. Create sync history record

**Import Results**:
- Resources added: New resources
- Resources updated: Existing resources modified
- Resources skipped: Duplicates
- Total resources: Final count
- Commit SHA: GitHub commit reference

### Export to GitHub

**Export Workflow**:
1. Navigate to "GitHub Sync" tab
2. Click "Export Resources"
3. Configure options:
   - Repository URL (your repo)
   - Branch: `main` or create new
   - Commit message
   - Include CONTRIBUTING.md
4. Click "Start Export"

**Export Process**:
1. Fetch all approved resources
2. Group by category/subcategory
3. Generate markdown using AwesomeListFormatter
4. Validate awesome-lint compliance
5. Create commit via GitHub API
6. Push to repository
7. Save sync history

**Export Format**:
```markdown
# Awesome Video

## Category Name

### Subcategory Name

- [Resource Title](https://url.com) - Description here.
- [Another Resource](https://url.com) - Another description.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.
```

### Sync History

**View Sync History**:
- All import/export operations
- Timestamp, direction (import/export)
- Resources affected count
- Commit SHA and URL
- Performed by (admin user)

**Diff Viewer**:
- Compare snapshots
- See added/updated/removed resources
- Useful for auditing changes

---

## Validation Tools

### Awesome-Lint Validation

**What is Awesome-Lint?**
- Official linter for awesome lists
- Enforces formatting standards
- Validates markdown structure
- Checks link format

**Running Validation**:
1. Navigate to "Validation" tab
2. Click "Run Awesome-Lint"
3. Wait for results (30s-2min)
4. View report:
   - ✅ Passed checks
   - ❌ Failed checks
   - ⚠️ Warnings

**Common Validation Errors**:
- Invalid list item format
- Missing description
- Broken markdown links
- Incorrect category hierarchy
- Unsorted categories

**Fixing Validation Errors**:
1. Review error messages
2. Edit affected resources
3. Re-run validation
4. Repeat until all checks pass

### Link Checking

**Run Link Checker**:
1. Navigate to "Validation" tab
2. Click "Check Links"
3. Configure:
   - Check all links: Full scan
   - Check recent: Last 30 days only
4. Click "Start Check"

**Link Check Process**:
- Fetch each URL (HTTP HEAD request)
- Validate HTTP status code (200 OK)
- Check redirect chains
- Timeout after 10s
- Report broken links

**Link Status Codes**:
- ✅ 200-299: OK
- ⚠️ 300-399: Redirect (warning)
- ❌ 400-499: Client error (broken)
- ❌ 500-599: Server error (broken)
- ⏱️ Timeout: URL unreachable

**Handling Broken Links**:
1. Review broken link report
2. Options:
   - Find replacement URL
   - Archive resource
   - Contact submitter
   - Remove resource

---

## Bulk Operations

### Bulk Approve/Reject

**Select Multiple Resources**:
1. Navigate to pending resources
2. Click checkboxes to select
3. Or click "Select All" (max 100)
4. Click "Approve Selected" or "Reject Selected"
5. Confirm action
6. Changes applied immediately

**Bulk Edit**:
- Change category for multiple resources
- Add tags to multiple resources
- Update descriptions in batch

### Bulk Export

**Export to CSV**:
1. Navigate to "Export" tab
2. Select export format: CSV, JSON, YAML
3. Configure filters:
   - Status: Approved only
   - Category: Specific or all
   - Date range
4. Click "Export"
5. Download file

**Export Formats**:
- **CSV**: Excel-compatible, for data analysis
- **JSON**: API-friendly, for import to other systems
- **YAML**: Human-readable, for configuration
- **Markdown**: Awesome-list format

### Bulk Delete (⚠️ Danger Zone)

**Delete Multiple Resources**:
1. Select resources to delete
2. Click "Delete Selected" (red button)
3. Enter confirmation code
4. Confirm deletion
5. Resources permanently deleted

**⚠️ Warning**:
- Deletion is permanent
- Cannot be undone
- Orphans user bookmarks/favorites
- Audit log retained

---

## Analytics & Reports

### Resource Analytics

**Resource Distribution**:
- Pie chart: Resources by category
- Bar chart: Resources by status
- Line chart: Resources over time

**Popular Resources**:
- Most bookmarked
- Most favorited
- Most viewed
- Trending (last 7 days)

**Submission Analytics**:
- Total submissions by user
- Approval rate
- Average time to approval
- Top contributors

### User Analytics

**User Growth**:
- New users over time
- Active users (last 30 days)
- Retention rate
- Churn rate

**User Engagement**:
- Average bookmarks per user
- Average favorites per user
- Journey completion rate
- Resource submission rate

### Export Reports

**Generate Report**:
1. Navigate to "Analytics" tab
2. Select report type:
   - Resource summary
   - User activity
   - AI enrichment stats
   - GitHub sync history
3. Select date range
4. Click "Generate Report"
5. Download PDF or CSV

---

## Troubleshooting

### Common Issues

**Issue: Admin Panel Not Accessible (403 Forbidden)**

**Solution**:
1. Verify you're logged in
2. Check your role in Supabase dashboard:
   ```sql
   SELECT email, raw_user_meta_data->>'role' as role
   FROM auth.users
   WHERE email = 'your@email.com';
   ```
3. Promote to admin if needed:
   ```sql
   UPDATE auth.users
   SET raw_user_meta_data = jsonb_set(
     COALESCE(raw_user_meta_data, '{}'::jsonb),
     '{role}',
     '"admin"'
   )
   WHERE email = 'your@email.com';
   ```
4. Logout and login again

**Issue: Resources Not Appearing After Approval**

**Solution**:
1. Check resource status in database:
   ```sql
   SELECT id, title, status FROM resources WHERE id = 'resource-id';
   ```
2. Verify status = 'approved'
3. Clear cache (Ctrl+Shift+R)
4. Check RLS policies:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'resources';
   ```

**Issue: AI Enrichment Job Stuck**

**Solution**:
1. Check job status:
   ```sql
   SELECT * FROM enrichment_jobs WHERE id = 'job-id';
   ```
2. Check queue:
   ```sql
   SELECT * FROM enrichment_queue WHERE job_id = 'job-id';
   ```
3. Cancel job if stuck
4. Check Anthropic API key is valid
5. Review error logs in server console

**Issue: GitHub Import Fails**

**Solution**:
1. Verify GitHub token has `repo` scope
2. Check repository is public or token has access
3. Verify README.md exists at root
4. Check server logs for parse errors
5. Try dry-run first to preview

**Issue: Link Checker Times Out**

**Solution**:
1. Reduce batch size (check 100 links at a time)
2. Increase timeout in settings
3. Skip already-checked links
4. Run during off-peak hours

### Getting Help

**Support Channels**:
- Documentation: `/docs` folder
- GitHub Issues: Report bugs
- Email: admin@yourdomain.com
- Discord: Community support

**Before Contacting Support**:
1. Check server logs: `docker-compose logs web`
2. Check browser console for errors
3. Try clearing cache/cookies
4. Test in incognito mode
5. Note error messages and steps to reproduce

**Providing Feedback**:
- Feature requests: GitHub Issues
- Bug reports: Include screenshots, logs, steps
- Improvements: Submit pull requests

---

## Best Practices

### Daily Tasks
- [ ] Review pending resources (5-10 min)
- [ ] Approve/reject new submissions
- [ ] Check for broken links (weekly)
- [ ] Monitor enrichment job success rate

### Weekly Tasks
- [ ] Run awesome-lint validation
- [ ] Review user-suggested edits
- [ ] Export data backup (CSV)
- [ ] Check analytics for trends

### Monthly Tasks
- [ ] Full link check (all resources)
- [ ] Database cleanup (archive old rejections)
- [ ] Review RLS policies
- [ ] Update documentation
- [ ] Security audit

### Quality Standards
- ✅ All approved resources must have:
  - Valid, accessible URL
  - Descriptive title (5-100 chars)
  - Clear description (20-500 chars)
  - Correct category
  - At least 2 relevant tags
- ❌ Reject resources that:
  - Have broken links
  - Are spam/promotional
  - Are duplicates
  - Lack sufficient description
  - Violate copyright

---

**Last Updated**: 2025-11-29
**Version**: 2.0.0
**Maintained By**: Admin Team

For technical documentation, see [CLAUDE.md](/CLAUDE.md)
For deployment guide, see [DEPLOYMENT_CHECKLIST.md](/docs/DEPLOYMENT_CHECKLIST.md)

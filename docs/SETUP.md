# Development Setup Guide

Complete guide for setting up and running the Awesome Video Resource Viewer locally.

## Prerequisites

- Node.js 18+ (automatically provided by Replit)
- PostgreSQL database (automatically provisioned by Replit)
- Git (for version control)

## Quick Start

### 1. Clone/Fork the Repository

If running on Replit, the repository is already set up. Otherwise:
```bash
git clone <repository-url>
cd awesome-video-resource-viewer
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create or verify the following environment variables:

**Required:**
```bash
DATABASE_URL=postgresql://...      # Automatically set by Replit PostgreSQL
SESSION_SECRET=<random-string>      # For session encryption
```

**For Replit Auth:**
```bash
REPLIT_DOMAINS=<your-replit-domain>
REPLIT_IDENTITY_TOKEN=<auto-set>
```

**For AI Features:**
```bash
AI_INTEGRATIONS_ANTHROPIC_API_KEY=<your-claude-api-key>
```

**For GitHub Sync:**
```bash
GITHUB_TOKEN=<your-github-pat>
GITHUB_REPO_URL=https://github.com/user/repo
```

### 4. Database Setup

The database is automatically created and seeded on first startup. To manually seed:
```bash
# Via API (requires admin login)
curl -X POST http://localhost:5000/api/admin/seed-database
```

### 5. Start Development Server

```bash
npm run dev
```

This starts:
- Express backend on port 5000
- Vite dev server with HMR
- Both accessible at `http://localhost:5000`

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run db:push` | Push schema changes to database |
| `npm run db:push --force` | Force push schema (use with caution) |
| `npm run db:studio` | Open Drizzle Studio for database GUI |

## Project Structure

```
├── client/src/           # React frontend
│   ├── components/       # Reusable components
│   ├── pages/            # Route pages
│   ├── hooks/            # Custom hooks
│   └── lib/              # Utilities
├── server/               # Express backend
│   ├── routes.ts         # API routes
│   ├── storage.ts        # Database layer
│   └── ai/               # AI services
├── shared/               # Shared types
│   └── schema.ts         # Database schema
└── docs/                 # Documentation
```

## Creating an Admin User

### Option 1: Reset Admin Password Script
```bash
npx tsx scripts/reset-admin-password.ts
```
This creates or resets the admin user with credentials shown in console output.

### Option 2: Via Database
```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

### Option 3: First Replit Auth User
The first user to log in via Replit OAuth can be promoted to admin via the database.

## Database Management

### View Database
```bash
npm run db:studio
```
Opens Drizzle Studio at `https://local.drizzle.studio`

### Schema Changes
1. Edit `shared/schema.ts`
2. Run `npm run db:push`
3. Restart the dev server

### Seeding Data
The database auto-seeds on startup if empty. For manual seeding:
- Login as admin
- Navigate to Admin Dashboard
- Use "Seed Database" or "Import from GitHub"

## Working with AI Features

### Claude Integration
1. Ensure `AI_INTEGRATIONS_ANTHROPIC_API_KEY` is set
2. AI features include:
   - URL analysis for edit suggestions
   - Batch resource enrichment
   - Personalized recommendations

### Enrichment Jobs
1. Navigate to Admin → Enrichment
2. Select filter (unenriched, all)
3. Set batch size
4. Click "Start Enrichment"

## GitHub Sync

### Import from GitHub
1. Navigate to Admin → GitHub Sync
2. Enter repository URL (raw README.md URL)
3. Choose dry-run or strict mode
4. Click Import

### Export to GitHub
1. Configure repository in Admin → Settings
2. Navigate to Admin → Export
3. Click "Export to GitHub"
4. Creates PR with awesome-lint compliant markdown

## Testing

### Manual Testing
1. Start dev server: `npm run dev`
2. Open browser to `http://localhost:5000`
3. Test features via UI

### awesome-lint Validation
```bash
npx tsx scripts/test-awesome-lint.ts
```

### API Testing
```bash
# Health check
curl http://localhost:5000/api/health

# Get resources
curl http://localhost:5000/api/resources

# Get awesome list
curl http://localhost:5000/api/awesome-list
```

## Troubleshooting

### Database Connection Issues
```bash
# Check DATABASE_URL is set
echo $DATABASE_URL

# Test connection
npm run db:studio
```

### Port Already in Use
Kill existing processes:
```bash
pkill -f "tsx server"
```

### Build Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install
```

### Authentication Issues

#### OAuth Redirect Loops
If you're stuck in a redirect loop:
```bash
# 1. Clear browser cookies for the domain
# 2. Check REPLIT_DOMAINS matches your domain exactly
echo $REPLIT_DOMAINS

# 3. Verify callback URL is registered
# For Replit: https://your-app.repl.co

# 4. Restart the server to refresh OAuth config
pkill -f "tsx server"
npm run dev
```

#### Session Persistence Issues
If sessions aren't persisting across requests:
```bash
# 1. Verify SESSION_SECRET is set and non-empty
echo $SESSION_SECRET

# 2. If empty, generate a new secret
# Add to .env or Replit Secrets
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# 3. Restart the server
npm run dev
```

**Additional checks:**
- Clear browser cookies and cache
- Ensure you're not in incognito/private mode
- Check that cookies are enabled in browser
- Verify the domain in cookie settings matches your app domain

#### 401/403 Unauthorized Errors
If you're getting unauthorized errors:

**Check if you're logged in:**
```bash
# Via browser console
fetch('/api/user').then(r => r.json()).then(console.log)
```

**Check your user role:**
```bash
# Via database
npm run db:studio
# Then view the users table to see your role
```

**Verify user role via SQL:**
```sql
SELECT id, username, email, role FROM users WHERE email = 'your@email.com';
```

#### Admin Access Issues
If you can't access admin features:

**Verify admin role:**
```bash
# Check current role via database
npm run db:studio
# Look for your user and confirm role = 'admin'
```

**Promote user to admin:**
```sql
-- Via Drizzle Studio SQL console
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

**Or use the reset admin script:**
```bash
npx tsx scripts/reset-admin-password.ts
# This creates/resets admin user with displayed credentials
```

**Then:**
1. Log out completely
2. Clear browser cookies
3. Log back in
4. Admin menu should now appear

#### Cookie/Session Clearing Steps
If experiencing persistent auth issues:

**Browser-based clearing:**
1. Open browser DevTools (F12)
2. Go to Application/Storage tab
3. Expand Cookies
4. Delete all cookies for your domain
5. Go to Local Storage and Session Storage
6. Clear all entries
7. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

**Server-side session reset:**
```bash
# Restart server to clear in-memory sessions
pkill -f "tsx server"
npm run dev
```

**Complete reset:**
```bash
# 1. Clear browser data (cookies, cache, storage)
# 2. Restart server
pkill -f "tsx server"

# 3. Regenerate session secret
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# 4. Start fresh
npm run dev
```

### GitHub Sync Issues

#### GitHub Token Configuration and Permissions
If GitHub import/export fails with authentication errors:

**Verify token is configured:**
```bash
# Check if GITHUB_TOKEN is set
echo $GITHUB_TOKEN

# Should output your Personal Access Token (PAT)
# If empty, add to .env or Replit Secrets
```

**Required token permissions:**
For successful GitHub sync, your PAT needs:
- `repo` - Full repository access (for private repos)
- `public_repo` - Public repository access (for public repos only)
- `read:org` - Read organization data (if syncing org repos)
- `workflow` - Update GitHub Actions workflows (if using CI/CD)

**Create a new token:**
1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Select required scopes listed above
4. Copy token and add to environment:
   ```bash
   GITHUB_TOKEN=ghp_your_token_here
   ```
5. Restart the server

**Test token validity:**
```bash
# Via curl
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user

# Should return your GitHub user info
# If 401 Unauthorized, token is invalid
# If 403 Forbidden, token lacks permissions
```

#### Rate Limiting Solutions
GitHub API has rate limits (5,000 requests/hour for authenticated users):

**Check current rate limit:**
```bash
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/rate_limit
```

**If you hit rate limits:**
1. **Wait for reset** - Check `X-RateLimit-Reset` header
   ```bash
   # Rate limit resets at Unix timestamp shown
   date -r $(curl -sI -H "Authorization: token $GITHUB_TOKEN" \
     https://api.github.com/rate_limit | \
     grep -i x-ratelimit-reset | awk '{print $2}')
   ```

2. **Use dry-run mode** - Test imports without consuming API calls:
   ```bash
   # In Admin UI, enable "Dry Run Mode" before import
   # This parses locally without making GitHub API calls
   ```

3. **Batch operations** - Instead of multiple small imports:
   - Import entire repositories at once
   - Use scheduled imports during off-peak hours
   - Cache results locally when testing

4. **Upgrade limits** - Consider GitHub Enterprise or Apps for higher limits

**Rate limit error messages:**
- `API rate limit exceeded` - Wait for reset or use caching
- `Secondary rate limit` - Too many requests too quickly, slow down

#### Import Validation Error Debugging
If import fails with validation errors:

**Common validation failures:**

**1. awesome-lint rule violations:**
```bash
# View detailed validation errors in import result
# Errors show: line number, rule name, and message

# Example error:
# Line 45: remark-lint:awesome-list-item
# Message: "Item must start with '- [Name](url) - Description'"
```

**Fix approaches:**
- **Non-strict mode** - Allows warnings, only fails on errors
  ```bash
  # In Admin UI, disable "Strict Mode" checkbox
  # This imports resources despite warnings
  ```

- **Manual corrections** - Edit source markdown to fix violations:
  ```bash
  # Common fixes:
  # - Add descriptions after links: - [Name](url) - Description here
  # - Fix broken URLs: ensure https:// prefix
  # - Remove duplicate entries
  # - Ensure proper list formatting with - prefix
  ```

**2. Malformed markdown:**
```bash
# Symptoms:
# - "Failed to parse markdown" error
# - Missing categories or resources
# - Incorrect nesting

# Debug steps:
1. Test markdown locally:
   npx tsx scripts/test-awesome-lint.ts

2. Check for:
   - Unclosed brackets/parentheses in links
   - Invalid heading levels (must be ## or ###)
   - Mixed list markers (-, *, +)

3. Use dry-run mode to see parsing results
```

**3. URL validation errors:**
```bash
# Error: "Invalid URL format"
# Ensure all URLs:
# - Start with https:// (not http://)
# - Have valid domain names
# - Don't contain spaces (use %20 encoding)

# Error: "Duplicate URL found"
# The system detects conflicts - see Conflict Resolution below
```

#### Dry-Run Mode Usage
Use dry-run mode to preview imports without database changes:

**Enable dry-run:**
1. Navigate to Admin → GitHub Sync
2. Check "Dry Run Mode" checkbox
3. Enter repository URL
4. Click Import

**What dry-run does:**
- ✅ Fetches markdown from GitHub
- ✅ Parses resources and categories
- ✅ Validates against awesome-lint
- ✅ Detects conflicts with existing data
- ❌ Does NOT modify database
- ❌ Does NOT create/update resources

**Interpreting dry-run results:**
```javascript
{
  "imported": 0,        // Always 0 in dry-run
  "updated": 0,         // Always 0 in dry-run
  "skipped": 42,        // Would be skipped (already exist)
  "validationPassed": true,
  "validationErrors": [],
  "resources": [...]    // Preview of what would be imported
}
```

**When to use dry-run:**
- Testing new repository sources
- Debugging validation errors
- Previewing changes before applying
- Checking for conflicts
- Verifying markdown parsing

**Switch to real import:**
1. Review dry-run results
2. Fix any validation errors in source
3. Uncheck "Dry Run Mode"
4. Re-run import to apply changes

#### Conflict Resolution Strategies
When importing resources that already exist (matched by URL):

**Conflict detection:**
The system identifies conflicts using:
- **Primary match:** Exact URL match
- **Fuzzy match:** Similar titles or descriptions
- **Category conflicts:** Same resource in different categories

**Resolution modes:**

**1. Skip existing (default):**
```bash
# In Admin UI: Default behavior
# - Leaves existing resources unchanged
# - Only imports truly new resources
# - Safe for incremental updates
# Result: "skipped": N in import result
```

**2. Update existing:**
```bash
# In Admin UI: Check "Force Overwrite" (use with caution)
# - Updates existing resources with new data
# - Overwrites title, description, category
# - Preserves local enrichments (AI data, tags)
# Result: "updated": N in import result
```

**3. Manual resolution:**
```bash
# For complex conflicts:
1. Run dry-run mode to preview conflicts
2. Review existing resources in database:
   npm run db:studio
   # Check resources table for conflicting URLs

3. Decide per resource:
   - Delete local version if GitHub is source of truth
   - Keep local version if manually curated
   - Merge manually via Admin UI edit

4. Re-run import after cleanup
```

**Common conflict scenarios:**

**Scenario 1: Same URL, different metadata**
```bash
# Database: "React Docs - Official React documentation"
# GitHub:   "React Documentation - Learn React"

# Resolution:
# - Skip: Keeps "Official React documentation"
# - Update: Changes to "Learn React"
# - Manual: Edit in Admin UI to preferred version
```

**Scenario 2: Duplicate URLs in import**
```bash
# GitHub markdown has same URL listed twice
# System automatically deduplicates during parsing
# Only first occurrence is imported
```

**Scenario 3: Different categories**
```bash
# Database: URL in "Frameworks → React"
# GitHub:   Same URL in "Libraries → UI"

# Resolution:
# - Skip: Stays in "Frameworks → React"
# - Update: Moves to "Libraries → UI"
# - Manual: Consider if resource belongs in both categories
```

**Best practices:**
1. **First import:** Use default skip mode to avoid duplicates
2. **Updates:** Use dry-run first, then force overwrite if needed
3. **Conflicts:** Review in database before deciding
4. **Audit trail:** Check sync history in database for past imports
5. **Backup:** Export current list before major imports

**Check sync history:**
```bash
# Via database
npm run db:studio
# View github_sync_queue table for operation history
```

### AI Enrichment Issues

#### Checking Job Status
Monitor enrichment job progress via the Admin UI or API:

**Via Admin UI:**
1. Navigate to Admin → Enrichment
2. View active jobs in the job list
3. Check progress bar and statistics
4. Click job ID for detailed status

**Via API:**
```bash
# Get job status
curl http://localhost:5000/api/admin/enrichment/jobs/:jobId/status

# Response includes:
# - status: pending, processing, completed, failed, cancelled
# - totalResources: total number of resources to process
# - processedResources: number processed so far
# - successfulResources: successfully enriched count
# - failedResources: failed enrichment count
# - skippedResources: skipped (invalid URLs or manually curated)
# - progress: percentage complete (0-100)
# - estimatedTimeRemaining: "5m 30s" format
# - errorMessage: error details if failed
```

**Via Database:**
```bash
npm run db:studio
# View enrichment_jobs table for all jobs
# View enrichment_queue table for individual resource status
```

**Interpreting job status:**
- `pending` - Job queued but not started
- `processing` - Actively enriching resources
- `completed` - All resources processed
- `failed` - Job encountered fatal error
- `cancelled` - Manually stopped by user

#### Canceling Stuck Jobs
If an enrichment job hangs or needs to be stopped:

**Via Admin UI:**
1. Navigate to Admin → Enrichment
2. Find the running job
3. Click "Cancel Job" button
4. Job status changes to "cancelled"
5. In-progress batch completes, remaining items skipped

**Via API:**
```bash
# Cancel a job
curl -X POST http://localhost:5000/api/admin/enrichment/jobs/:jobId/cancel
```

**Via Database (emergency):**
```bash
npm run db:studio
# In enrichment_jobs table, set status = 'cancelled' for stuck job
```

**Common causes of stuck jobs:**
1. **API rate limits** - Claude API throttling requests
   - Wait 60 seconds and job should resume
   - Check API key quota at console.anthropic.com

2. **Network timeouts** - URL scraping taking too long
   - Individual resources timeout after 30 seconds
   - Job continues with next resource
   - Check failed resources in job details

3. **Server restart** - Process interrupted
   - Jobs resume automatically on next startup if status is 'processing'
   - Or manually restart job after server is back

**Force restart a job:**
```bash
# 1. Cancel the stuck job
curl -X POST http://localhost:5000/api/admin/enrichment/jobs/:jobId/cancel

# 2. Start a new job with same parameters
# Via Admin UI: Admin → Enrichment → Start Enrichment
```

#### Claude API Key Validation
Ensure your Anthropic API key is properly configured:

**Check if API key is set:**
```bash
# Verify environment variable
echo $AI_INTEGRATIONS_ANTHROPIC_API_KEY

# Should output: sk-ant-api03-...
# If empty, key is not configured
```

**Set API key:**
```bash
# Option 1: Add to .env file (local development)
echo "AI_INTEGRATIONS_ANTHROPIC_API_KEY=sk-ant-api03-your-key-here" >> .env

# Option 2: Set in Replit Secrets (Replit deployment)
# Go to Tools → Secrets → Add new secret
# Key: AI_INTEGRATIONS_ANTHROPIC_API_KEY
# Value: sk-ant-api03-your-key-here

# Option 3: Export in shell (temporary)
export AI_INTEGRATIONS_ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

**Obtain an API key:**
1. Visit https://console.anthropic.com/
2. Sign up or log in
3. Navigate to API Keys section
4. Click "Create Key"
5. Copy key (starts with `sk-ant-api03-`)
6. Set in environment as shown above

**Test API key validity:**
```bash
# Make a test request to Claude API
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $AI_INTEGRATIONS_ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-haiku-4-5",
    "max_tokens": 10,
    "messages": [{"role": "user", "content": "test"}]
  }'

# Success: Returns JSON with message content
# Failure responses:
# - 401 Unauthorized: Invalid API key
# - 403 Forbidden: Key lacks permissions
# - 429 Rate Limited: Too many requests or quota exceeded
```

**Common API key errors:**

**Error: "API key not configured"**
```bash
# Symptom: Enrichment fails immediately with configuration error
# Solution: Set AI_INTEGRATIONS_ANTHROPIC_API_KEY environment variable
# Restart server after setting: npm run dev
```

**Error: "401 Unauthorized"**
```bash
# Symptom: API requests fail with authentication error
# Causes:
# 1. Invalid or expired API key
# 2. Key format incorrect (must start with sk-ant-api03-)
# 3. Key from wrong account or deleted

# Solution:
# 1. Verify key format: echo $AI_INTEGRATIONS_ANTHROPIC_API_KEY
# 2. Generate new key at console.anthropic.com
# 3. Update environment variable
# 4. Restart server
```

**Error: "429 Rate Limited"**
```bash
# Symptom: Enrichment jobs fail with rate limit errors
# Causes:
# 1. Exceeded API rate limits (default: 60 requests/minute)
# 2. Quota exhausted (check billing at console.anthropic.com)
# 3. Too many concurrent jobs

# Solutions:
# 1. Reduce batch size to slow down requests
# 2. Add credits to your Anthropic account
# 3. Wait for rate limit reset (typically 60 seconds)
# 4. Cancel other running jobs
```

**Check API usage and quota:**
1. Visit https://console.anthropic.com/
2. View Usage section for request counts
3. Check Billing for remaining credits
4. Monitor rate limit headers in API responses

#### URL Scraping Timeout Solutions
When enrichment jobs fail due to slow or unresponsive URLs:

**Understanding URL scraping:**
- Each resource URL is fetched to extract metadata (title, description, Open Graph data)
- Timeout: 30 seconds per URL
- Retries: 3 attempts with exponential backoff
- Failures are logged but don't stop the job

**Common timeout scenarios:**

**1. Slow-loading websites:**
```bash
# Symptoms:
# - Resources marked as 'failed' after 30 seconds
# - Error: "URL fetch timeout"
# - Job continues but without scraped metadata

# Solutions:
# - Accept the failure - resource still gets AI tags from title/URL
# - Manually enrich resource later via Admin UI
# - Update resource with manual description
```

**2. Blocked requests (anti-bot protection):**
```bash
# Symptoms:
# - Consistent failures for certain domains
# - Error: "403 Forbidden" or "Request blocked"
# - Cloudflare or bot detection triggers

# Solutions:
# - These resources get marked as 'skipped'
# - AI enrichment still generates tags from URL/title
# - Manually add descriptions in Admin UI
# - Consider marking as 'manuallyEnriched' to skip future attempts
```

**3. Invalid or dead links:**
```bash
# Symptoms:
# - Error: "404 Not Found" or "DNS resolution failed"
# - URL no longer accessible

# Solutions:
# - Review and update URL in resource editor
# - Delete resource if permanently dead
# - Check for redirects and update to final URL
```

**Optimize scraping performance:**

**Increase success rate:**
```bash
# Resources with these URLs are automatically skipped:
# - Invalid URLs: #readme, mailto:, javascript:
# - Local anchors: #section-name
# - These are marked 'skipped' not 'failed'

# To manually mark resources to skip URL scraping:
# Via database:
npm run db:studio
# Update resource metadata:
# metadata: { manuallyEnriched: true }
# This prevents future scraping attempts
```

**Handle batch failures:**
```bash
# If entire batch fails due to network issues:
# 1. Check internet connection
# 2. Test URL access manually:
curl -I https://example.com

# 3. Restart enrichment job
# 4. Failed resources are automatically retried
```

**Monitor failed URLs:**
```bash
# View failed resources in database
npm run db:studio
# Query enrichment_queue table:
# SELECT * FROM enrichment_queue WHERE status = 'failed'

# Export failed URLs for manual review:
# Via Admin UI: Check job details for failed resource list
```

#### Batch Size Optimization Tips
Optimize enrichment performance by adjusting batch size:

**Default batch size:** 10 resources processed concurrently

**Recommended batch sizes by scenario:**

**Small batch (1-5 resources):**
```bash
# Use when:
# - Testing enrichment on new resource types
# - Limited API quota (watching usage closely)
# - High failure rates (want to minimize wasted requests)
# - Slow network or server resources

# Pros: Lower API usage, easier debugging, less memory
# Cons: Slower overall completion time
```

**Medium batch (10-20 resources):**
```bash
# Use when:
# - Standard production enrichment (default)
# - Balanced speed and reliability
# - Moderate API quota available
# - Most common use case

# Pros: Good balance of speed and control
# Cons: May hit rate limits with very large jobs
```

**Large batch (25-50 resources):**
```bash
# Use when:
# - Bulk enrichment of hundreds/thousands of resources
# - Generous API quota
# - Stable network and reliable URLs
# - Maximum speed needed

# Pros: Fastest completion time
# Cons: Higher memory usage, harder to debug failures, rate limit risk
```

**Set batch size:**

**Via Admin UI:**
1. Navigate to Admin → Enrichment
2. Enter batch size in "Batch Size" field
3. Click "Start Enrichment"

**Via API:**
```bash
curl -X POST http://localhost:5000/api/admin/enrichment/start \
  -H "Content-Type: application/json" \
  -d '{
    "filter": "unenriched",
    "batchSize": 15
  }'
```

**Monitor batch performance:**
```bash
# Watch job progress to optimize batch size
# Check in Admin UI:
# - Successful rate: aim for >90%
# - Processing speed: resources per minute
# - Failure rate: if >10%, reduce batch size

# Via API:
curl http://localhost:5000/api/admin/enrichment/jobs/:jobId/status

# Adjust based on:
# - If many failures: reduce batch size
# - If very slow: increase batch size (if failures are low)
# - If rate limited: reduce batch size significantly
```

**Rate limit calculations:**
```bash
# Claude API limits (typical):
# - Requests per minute: 60
# - Tokens per minute: varies by plan

# Safe batch sizes:
# - Batch size 10 with 2s delay = ~20 resources/min = well under limit
# - Batch size 50 with 2s delay = ~100 resources/min = may hit limits
# - Batch size 1 with no delay = ~30 resources/min = safe

# The system automatically adds 2-second delays between batches
# to avoid overwhelming the API
```

**Best practices:**
1. **Start small** - Use batch size 5-10 for first run
2. **Monitor results** - Check success/failure ratio
3. **Adjust up** - Increase if <5% failure rate
4. **Adjust down** - Decrease if >10% failure rate or rate limited
5. **Consider time** - Larger batches finish faster but risk rate limits
6. **Check quota** - Monitor API usage at console.anthropic.com

**Example optimization workflow:**
```bash
# 1. Initial test run
# Batch size: 5, Filter: unenriched
# Monitor: success rate, any errors

# 2. If >95% success rate
# Increase to batch size 15

# 3. If failures occur
# Check error types:
# - Timeouts: reduce batch size
# - Rate limits: reduce batch size significantly (try 3-5)
# - API errors: check API key and quota

# 4. Production runs
# Use proven batch size from testing
# Monitor first few batches, adjust if needed
```

### awesome-lint Validation Issues

The awesome-lint validator ensures exported markdown follows awesome-list standards. Understanding validation rules helps fix errors quickly.

#### Running Validation Locally

Test markdown against awesome-lint rules before exporting:

**Via test script:**
```bash
# Validate current awesome list
npx tsx scripts/test-awesome-lint.ts

# Output shows:
# - Total errors and warnings
# - Line-by-line validation results
# - Specific rule violations
# - Pass/fail status
```

**Via export dry-run:**
```bash
# Export to see validation without creating PR
# In Admin UI: Admin → Export → Enable "Dry Run"
# Shows validation results without GitHub push
```

**Via API:**
```bash
# Get awesome-list markdown with validation
curl http://localhost:5000/api/awesome-list

# Validation runs automatically on export
# Check response for errors array
```

#### Interpreting Validation Errors

Validation errors include line number, rule name, and fix instructions:

**Error format:**
```bash
Line 12: title
Message: Title must start with "Awesome"

Line 45: list-format
Message: Invalid list item format. Use: - [Name](url) - Description.

Line 67: description-capital
Message: Description must start with a capital letter
```

**Error severity levels:**
- `error` - Must fix before passing validation (blocks export)
- `warning` - Should fix but won't block export (unless strict mode)

**Common patterns:**
```bash
# Multiple errors on same line
# Usually indicates malformed markdown
# Fix formatting first, then re-validate

# Cascading errors
# One error (missing heading) can cause multiple downstream errors
# Fix from top to bottom

# No errors shown but validation fails
# Check for hidden characters, encoding issues, or empty sections
```

#### Common Rule Violations

**1. Title format (`title` rule):**
```bash
# ❌ Wrong:
# My Video List
# Video Resources
# Best Videos Ever

# ✅ Correct:
# Awesome Video Resources
# Awesome Educational Videos
# Awesome Tech Talks

# Fix: Title must start with "Awesome" and use # heading
```

**2. Missing awesome badge (`badge` rule):**
```bash
# ❌ Wrong:
# Awesome Videos
#
# A curated list...

# ✅ Correct:
# Awesome Videos
#
# [![Awesome](https://awesome.re/badge.svg)](https://awesome.re)
#
# A curated list...

# Fix: Add badge after title and blank line
# Exact format required: [![Awesome](https://awesome.re/badge.svg)](https://awesome.re)
```

**3. Table of contents issues (`toc` rule):**
```bash
# ❌ Wrong:
## Contents
- Videos
- Tutorials

# ✅ Correct:
## Contents
- [Videos](#videos)
- [Tutorials](#tutorials)

# Fix: TOC items must be links to section anchors
# Anchor format: lowercase, spaces become hyphens
# Example: "## React Resources" → "#react-resources"
```

**4. Capitalization errors (`description-capital` rule):**
```bash
# ❌ Wrong:
- [React Docs](https://react.dev) - official React documentation.

# ✅ Correct:
- [React Docs](https://react.dev) - Official React documentation.

# Fix: Description must start with capital letter after " - "
```

**5. Missing periods (`description-period` rule):**
```bash
# ❌ Wrong:
- [Vue.js](https://vuejs.org) - Progressive JavaScript framework

# ✅ Correct:
- [Vue.js](https://vuejs.org) - Progressive JavaScript framework.

# Fix: Description must end with period, exclamation, or question mark
```

**6. Category nesting problems (`category-nesting` rule):**
```bash
# ❌ Wrong:
# Awesome Videos
## Frameworks
#### React Components  # Skipped ### level

# ✅ Correct:
# Awesome Videos
## Frameworks
### React
#### Components

# Fix: Don't skip heading levels
# Progression must be # → ## → ### → ####
```

#### Link Format Requirements

**URL formatting rules:**

**1. No trailing slashes:**
```bash
# ❌ Wrong:
- [React](https://react.dev/) - JavaScript library.

# ✅ Correct:
- [React](https://react.dev) - JavaScript library.

# Exception: Root domain "/" is allowed
# Fix: Remove trailing / from all URLs except root
```

**2. HTTPS required:**
```bash
# ❌ Wrong:
- [Example](http://example.com) - Description.

# ✅ Correct:
- [Example](https://example.com) - Description.

# Fix: Use https:// not http://
# Some non-HTTPS sites may trigger warnings
```

**3. Valid URL format:**
```bash
# ❌ Wrong:
- [Local Link](#readme) - Anchor link.
- [Email](mailto:user@example.com) - Email link.
- [Broken](example.com) - Missing protocol.

# ✅ Correct:
- [External Resource](https://example.com/resource) - Description.

# Fix: Only external https:// URLs allowed in resource lists
# Anchors and special protocols fail validation
```

**4. No duplicate URLs:**
```bash
# ❌ Wrong:
- [React Docs](https://react.dev) - Official documentation.
- [React](https://react.dev) - JavaScript library.

# ✅ Correct:
# Choose one entry per URL
- [React](https://react.dev) - Official React documentation for JavaScript library.

# Fix: Combine duplicate URLs or remove less descriptive entry
# System detects exact URL matches
```

#### Description Format Rules

**Length requirements:**
```bash
# Minimum: At least a few words
# Maximum: Keep concise (under 100 characters recommended)

# ❌ Too short:
- [React](https://react.dev) - Library.

# ✅ Good length:
- [React](https://react.dev) - JavaScript library for building user interfaces.

# ❌ Too long:
- [React](https://react.dev) - React is a free and open-source front-end JavaScript library for building user interfaces based on components. It is maintained by Meta and a community of individual developers and companies and can be used to develop single-page, mobile, or server-rendered applications.

# ✅ Correct:
- [React](https://react.dev) - JavaScript library for building component-based user interfaces.
```

**Format requirements:**
```bash
# Complete pattern:
- [Name](url) - Description.
  ^     ^       ^           ^
  |     |       |           |
  |     |       |           Required period
  |     |       Space-dash-space separator
  |     HTTPS URL, no trailing slash
  Link text

# Common mistakes:
- [Name](url)- Missing space before dash
- [Name](url) -Missing space after dash
- [Name](url) - description  # Lowercase start
- [Name](url) - Description  # Missing period

# Correct:
- [Name](url) - Description text here.
```

**Content guidelines:**
```bash
# ✅ Good descriptions:
# - Concise and informative
# - Starts with capital letter
# - Ends with period
# - Explains what the resource is/does
# - Avoids marketing language ("best", "amazing", "must-have")

# ❌ Bad descriptions:
# - Too vague: "Useful tool."
# - Too promotional: "The best framework ever created!"
# - Redundant: "React - React library for React development."
# - Opinion-heavy: "My favorite way to build apps."

# ✅ Examples:
- [Vue.js](https://vuejs.org) - Progressive JavaScript framework for building UIs.
- [Svelte](https://svelte.dev) - Component framework that compiles to vanilla JavaScript.
- [Angular](https://angular.io) - Platform for building web applications with TypeScript.
```

#### Fixing Validation Errors Workflow

**Step-by-step error resolution:**

```bash
# 1. Run validation
npx tsx scripts/test-awesome-lint.ts

# 2. Review errors from top to bottom
# Output shows line numbers and specific issues

# 3. Fix structural errors first
# - Title format
# - Badge presence
# - Heading levels
# These often cause cascading errors

# 4. Fix format errors
# - List item syntax
# - URL formatting
# - Description capitalization and periods

# 5. Re-run validation
npx tsx scripts/test-awesome-lint.ts

# 6. Repeat until validation passes
# Valid: true, Errors: 0

# 7. Export to GitHub
# Validation runs automatically
# PR created only if validation passes
```

**Quick fixes for common errors:**

```bash
# Fix missing badge:
# Add after title line:
[![Awesome](https://awesome.re/badge.svg)](https://awesome.re)

# Fix list format:
# Before: * [Name](url)
# After:  - [Name](url) - Description.

# Fix capitalization:
# Before: - [Name](url) - description here.
# After:  - [Name](url) - Description here.

# Fix trailing slash:
# Before: https://example.com/
# After:  https://example.com

# Fix TOC links:
# Before: - Videos
# After:  - [Videos](#videos)
```

#### Validation in Export Workflow

**Automatic validation on export:**
```bash
# When exporting to GitHub:
# 1. Generate markdown from database
# 2. Run awesome-lint validation
# 3. If errors: show errors, don't create PR
# 4. If warnings only: create PR with warning note
# 5. If pass: create PR

# Check validation before export:
# Admin UI → Export → "Validate Before Export" checkbox
# Shows validation results before GitHub push
```

**Handling validation failures:**
```bash
# Export fails with validation errors:
# 1. Review error list in UI
# 2. Fix data in database via Admin UI:
#    - Edit resource titles
#    - Fix descriptions
#    - Update URLs
#    - Adjust categories
# 3. Re-run validation test
# 4. Retry export when validation passes

# Note: Validation checks generated markdown
# Not the database directly
# Fix data, then re-generate to test
```

**Strict mode vs. warnings:**
```bash
# Strict mode (default):
# - Fails on any error or warning
# - Ensures 100% compliance
# - Recommended for awesome-list submission

# Warning-allowed mode:
# - Fails only on errors
# - Allows warnings to pass
# - Useful for internal lists
# - Enable in export settings

# In Admin UI:
# Export → Uncheck "Strict Mode"
# Allows export with warnings
```

### API Error Troubleshooting

When working with the API, you may encounter various HTTP error codes. This section helps you debug and resolve common API errors.

#### Debugging Tools Overview

**Using curl for API debugging:**
```bash
# Basic curl request with verbose output
curl -v http://localhost:5000/api/resources

# Include cookies from browser for authenticated requests
# 1. Export cookies from browser (use extension like "Cookie-Editor")
# 2. Save to cookies.txt
# 3. Use in curl:
curl -v -b cookies.txt http://localhost:5000/api/admin/stats

# Send POST request with JSON body
curl -X POST http://localhost:5000/api/resources \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "Test Resource",
    "url": "https://example.com",
    "description": "Test description",
    "category": "General Tools"
  }'

# View response headers
curl -i http://localhost:5000/api/health
```

**Using browser DevTools:**
```bash
# 1. Open browser DevTools (F12)
# 2. Go to Network tab
# 3. Trigger the API request via UI
# 4. Click on the request in the Network tab
# 5. View:
#    - Request Headers (check cookies, content-type)
#    - Request Payload (check sent data)
#    - Response (check error message)
#    - Response Headers (check status code)
```

**Quick debugging checklist:**
```bash
# For any API error:
# 1. Check status code (400, 401, 403, 404, 500)
# 2. Read error message in response body
# 3. Verify request format matches API docs
# 4. Check authentication state
# 5. Review server logs in console
```

#### 400 Bad Request Errors

400 errors indicate invalid request data, often from validation failures.

**Common causes:**

**1. Zod validation failures:**
```bash
# Request:
curl -X POST http://localhost:5000/api/resources \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "",
    "url": "not-a-valid-url",
    "category": "Invalid Category"
  }'

# Response (400):
{
  "message": "Invalid resource data",
  "errors": [
    {
      "code": "too_small",
      "minimum": 1,
      "path": ["title"],
      "message": "String must contain at least 1 character(s)"
    },
    {
      "code": "invalid_string",
      "path": ["url"],
      "validation": "url",
      "message": "Invalid url"
    }
  ]
}

# Fix: Provide valid data matching schema requirements
curl -X POST http://localhost:5000/api/resources \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "Valid Resource Title",
    "url": "https://example.com/resource",
    "description": "A proper description",
    "category": "General Tools",
    "subcategory": "DRM"
  }'
```

**2. Missing required fields:**
```bash
# Request:
curl -X POST http://localhost:5000/api/resources/:id/edits \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "New Title"
  }'

# Response (400):
{
  "message": "proposedChanges and proposedData are required"
}

# Fix: Include all required fields
curl -X POST http://localhost:5000/api/resources/:id/edits \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "proposedChanges": { "title": { "from": "Old Title", "to": "New Title" } },
    "proposedData": { "title": "New Title" }
  }'
```

**3. Data too long:**
```bash
# Request with title exceeding 200 characters:
curl -X POST http://localhost:5000/api/resources/:id/edits \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "proposedData": { "title": "Very long title that exceeds the maximum allowed length..." }
  }'

# Response (400):
{
  "message": "Title too long (max 200 characters)"
}

# Other length validation errors:
# "Description too long (max 2000 characters)"
# "Too many tags (max 20)"
```

**4. Invalid IDs or parameters:**
```bash
# Request with invalid category ID:
curl http://localhost:5000/api/subcategories?categoryId=not-a-number

# Response (400):
{
  "message": "Invalid categoryId: must be a positive integer"
}

# Request with invalid resource ID in edit suggestion:
curl -X POST http://localhost:5000/api/resources/invalid-id/edits \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{...}'

# Response (400):
{
  "message": "Invalid resource ID"
}
```

**Debugging 400 errors:**
```bash
# 1. Check the error.errors array for Zod validation details
# 2. Each error shows:
#    - code: Type of validation failure
#    - path: Which field failed
#    - message: Human-readable description
# 3. Refer to API.md for field requirements
# 4. Test with minimal valid data first
# 5. Add optional fields incrementally
```

#### 401/403 Authentication/Authorization Errors

**401 Unauthorized** - Not logged in or invalid session
**403 Forbidden** - Logged in but insufficient permissions

**401 Unauthorized errors:**

```bash
# Accessing authenticated endpoint without login:
curl http://localhost:5000/api/favorites

# Response (401):
{
  "message": "Unauthorized"
}

# Fix: Login first and include session cookie
# Option 1: Via browser (automatic cookie handling)
# Option 2: Via curl with cookies
curl -X POST http://localhost:5000/api/auth/local/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'

# Then use the cookie in subsequent requests:
curl http://localhost:5000/api/favorites -b cookies.txt
```

**Session expired:**
```bash
# Request after session expiration:
curl http://localhost:5000/api/user/progress -b old-cookies.txt

# Response (401):
{
  "message": "Unauthorized"
}

# Fix: Re-authenticate to get fresh session
# Check current auth status:
curl http://localhost:5000/api/auth/user -b cookies.txt

# Response shows auth state:
{
  "user": null,
  "isAuthenticated": false
}

# Login again:
curl -X POST http://localhost:5000/api/auth/local/login \
  -H "Content-Type: application/json" \
  -c fresh-cookies.txt \
  -d '{ "email": "user@example.com", "password": "password" }'
```

**403 Forbidden errors (insufficient permissions):**

```bash
# Accessing admin endpoint as regular user:
curl http://localhost:5000/api/admin/stats -b user-cookies.txt

# Response (403):
{
  "message": "Forbidden: Admin access required"
}

# Debug: Check your user role
curl http://localhost:5000/api/auth/user -b user-cookies.txt

# Response:
{
  "user": {
    "id": "123",
    "email": "user@example.com",
    "role": "user"  # Not "admin"
  },
  "isAuthenticated": true
}

# Fix: Promote user to admin via database
npm run db:studio
# Then run SQL:
# UPDATE users SET role = 'admin' WHERE email = 'user@example.com';

# Or use reset admin script:
npx tsx scripts/reset-admin-password.ts
```

**Debugging auth errors:**
```bash
# 1. Check if you're logged in:
curl http://localhost:5000/api/auth/user -b cookies.txt

# 2. Verify cookie is being sent:
curl -v http://localhost:5000/api/favorites -b cookies.txt
# Look for "Cookie:" header in verbose output

# 3. Check session secret is set:
echo $SESSION_SECRET

# 4. Clear cookies and re-login:
rm cookies.txt
curl -X POST http://localhost:5000/api/auth/local/login \
  -c cookies.txt \
  -H "Content-Type: application/json" \
  -d '{ "email": "admin@example.com", "password": "admin123" }'

# 5. For 403 errors, verify role in database:
npm run db:studio
# Check users table → role column
```

#### 404 Resource Not Found Errors

404 errors occur when requesting non-existent resources or invalid URLs.

**Common scenarios:**

**1. Non-existent resource ID:**
```bash
# Request:
curl http://localhost:5000/api/resources/99999

# Response (404):
{
  "message": "Resource not found"
}

# Debug:
# - Verify resource ID exists in database
# - Check if resource was deleted
# - Use list endpoint to find valid IDs:
curl http://localhost:5000/api/resources?limit=5
```

**2. Wrong URL path:**
```bash
# Typo in endpoint:
curl http://localhost:5000/api/resource  # Missing 's'

# Response (404):
# HTML error page or "Cannot GET /api/resource"

# Fix: Use correct endpoint path
curl http://localhost:5000/api/resources

# Reference API.md for correct paths
```

**3. Non-existent journey:**
```bash
# Request:
curl http://localhost:5000/api/journeys/invalid-id -b cookies.txt

# Response (404):
{
  "message": "Journey not found"
}

# Fix: Get list of valid journey IDs:
curl http://localhost:5000/api/journeys -b cookies.txt
```

**4. Empty database (sitemap example):**
```bash
# Request sitemap with empty database:
curl http://localhost:5000/sitemap.xml

# Response (404):
Sitemap not available - database empty

# Fix: Seed database
curl -X POST http://localhost:5000/api/admin/seed-database -b admin-cookies.txt
```

**Debugging 404 errors:**
```bash
# 1. Verify the endpoint exists in API.md
# 2. Check URL spelling and ID format
# 3. List available resources:
curl http://localhost:5000/api/resources
curl http://localhost:5000/api/categories
curl http://localhost:5000/api/journeys -b cookies.txt

# 4. Check database for resource existence:
npm run db:studio
# Search in resources table for the ID

# 5. Review server logs for routing issues
# Look for "GET /api/..." in console output
```

#### 500 Internal Server Error

500 errors indicate server-side problems, not client request issues.

**Common causes:**

**1. Database connection failures:**
```bash
# Request when database is unreachable:
curl http://localhost:5000/api/resources

# Response (500):
{
  "message": "Failed to fetch resources"
}

# Server logs show:
# Error: connect ECONNREFUSED
# Error: no pg_hba.conf entry for host

# Debug:
# Check DATABASE_URL is set
echo $DATABASE_URL

# Test database connection
npm run db:studio

# Restart PostgreSQL (Replit auto-manages this)
# Or restart the dev server:
pkill -f "tsx server"
npm run dev
```

**2. Uncaught exceptions in route handlers:**
```bash
# Request that triggers server error:
curl -X POST http://localhost:5000/api/admin/resources \
  -b admin-cookies.txt \
  -H "Content-Type: application/json" \
  -d '{ invalid json }'

# Response (500):
{
  "message": "Failed to create resource"
}

# Server logs show:
# SyntaxError: Unexpected token i in JSON at position 2
# at JSON.parse

# Debug:
# 1. Check server console for error stack trace
# 2. Look for specific error message
# 3. Fix malformed request data
```

**3. AI service failures:**
```bash
# Request Claude analysis without API key:
curl -X POST http://localhost:5000/api/claude/analyze \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{ "url": "https://example.com" }'

# Response (500):
{
  "message": "Failed to analyze URL"
}

# Server logs show:
# Error: AI_INTEGRATIONS_ANTHROPIC_API_KEY not configured

# Debug:
echo $AI_INTEGRATIONS_ANTHROPIC_API_KEY
# If empty, set the API key:
# AI_INTEGRATIONS_ANTHROPIC_API_KEY=sk-ant-api03-...
# Restart server
```

**4. GitHub API failures:**
```bash
# Import with invalid token:
curl -X POST http://localhost:5000/api/admin/github/import \
  -b admin-cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://github.com/user/repo/README.md"
  }'

# Response (500):
{
  "message": "Failed to import from GitHub"
}

# Server logs show:
# Error: Bad credentials (GitHub API)

# Debug:
echo $GITHUB_TOKEN
# Verify token validity:
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user
```

**Debugging 500 errors:**
```bash
# 1. Check server console output
# Look for error stack traces immediately after the request

# 2. Common error patterns in logs:
# "Error: connect ECONNREFUSED" → Database connection issue
# "ZodError" → Validation error (should be 400, not 500)
# "Error: API key not configured" → Missing environment variable
# "Error: ENOENT" → File not found
# "TypeError: Cannot read property" → Null/undefined bug in code

# 3. Test dependencies:
# Database:
npm run db:studio

# Environment variables:
echo $DATABASE_URL
echo $SESSION_SECRET
echo $AI_INTEGRATIONS_ANTHROPIC_API_KEY
echo $GITHUB_TOKEN

# 4. Restart server to clear any cached errors:
pkill -f "tsx server"
npm run dev

# 5. Check for recent code changes:
git log -1
git status

# 6. Review the specific route in server/routes.ts
# Search for the endpoint and check try-catch blocks
```

#### Complete Error Response Examples

**Successful request:**
```bash
curl http://localhost:5000/api/resources/1

# Response (200):
{
  "id": 1,
  "title": "Awesome Video Resource",
  "url": "https://example.com",
  "description": "A great resource",
  "category": "General Tools",
  "subcategory": "DRM",
  "status": "approved",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**400 Validation Error:**
```bash
curl -X POST http://localhost:5000/api/resources \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{ "title": "x", "url": "invalid" }'

# Response (400):
{
  "message": "Invalid resource data",
  "errors": [
    {
      "code": "invalid_string",
      "path": ["url"],
      "validation": "url",
      "message": "Invalid url"
    }
  ]
}
```

**401 Unauthorized:**
```bash
curl http://localhost:5000/api/admin/stats

# Response (401):
{
  "message": "Unauthorized"
}
```

**403 Forbidden:**
```bash
curl http://localhost:5000/api/admin/users -b user-cookies.txt

# Response (403):
{
  "message": "Forbidden: Admin access required"
}
```

**404 Not Found:**
```bash
curl http://localhost:5000/api/resources/99999

# Response (404):
{
  "message": "Resource not found"
}
```

**500 Internal Server Error:**
```bash
curl http://localhost:5000/api/resources
# (when database is down)

# Response (500):
{
  "message": "Failed to fetch resources"
}

# Server console shows:
# Error: connect ECONNREFUSED 127.0.0.1:5432
#     at TCPConnectWrap.afterConnect [as oncomplete] (net.js:1144:16)
```

#### Testing API Error Scenarios

**Comprehensive testing workflow:**

```bash
# 1. Test health check (should always work):
curl http://localhost:5000/api/health
# Expected: { "status": "ok" }

# 2. Test public endpoint (no auth needed):
curl http://localhost:5000/api/resources?limit=1
# Expected: 200 with resources array

# 3. Test auth required endpoint without login:
curl http://localhost:5000/api/favorites
# Expected: 401 Unauthorized

# 4. Test login:
curl -X POST http://localhost:5000/api/auth/local/login \
  -c cookies.txt \
  -H "Content-Type: application/json" \
  -d '{ "email": "admin@example.com", "password": "admin123" }'
# Expected: 200 with user object

# 5. Test auth required endpoint with login:
curl http://localhost:5000/api/favorites -b cookies.txt
# Expected: 200 with favorites array

# 6. Test admin endpoint as regular user:
curl http://localhost:5000/api/admin/stats -b user-cookies.txt
# Expected: 403 Forbidden

# 7. Test admin endpoint as admin:
curl http://localhost:5000/api/admin/stats -b admin-cookies.txt
# Expected: 200 with stats object

# 8. Test validation error:
curl -X POST http://localhost:5000/api/resources \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{ "title": "", "url": "bad-url" }'
# Expected: 400 with validation errors

# 9. Test 404:
curl http://localhost:5000/api/resources/99999
# Expected: 404 Resource not found

# 10. Monitor server logs during tests
# Watch console for error messages and stack traces
```

## Code Style

- TypeScript throughout
- No explicit React imports (JSX transform handles it)
- Tailwind CSS for styling
- shadcn/ui components
- Drizzle ORM for database
- Zod for validation

## Helpful Tips

1. **Hot Reload**: Vite provides HMR for frontend changes
2. **Backend Restart**: Server restarts automatically on file changes
3. **Database GUI**: Use `npm run db:studio` for visual database management
4. **Logs**: Check console output for API logs
5. **TypeScript**: Run `npx tsc --noEmit` to check types

## Production Deployment

1. Set `NODE_ENV=production`
2. Run `npm run build`
3. Run `npm run start`
4. Or use Replit's Deploy button

The application automatically:
- Builds optimized frontend bundle
- Serves static files from Express
- Seeds database if empty
- Validates awesome-list on export

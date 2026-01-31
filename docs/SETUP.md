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

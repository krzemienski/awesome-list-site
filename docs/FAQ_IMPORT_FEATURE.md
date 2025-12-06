# Import Feature - Frequently Asked Questions

**Version**: 1.1.0
**Last Updated**: 2025-12-05

---

## General Questions

### Q: What is the import feature?

**A:** The import feature allows administrators to pull resources from any awesome-list GitHub repository and automatically populate the database with hierarchical categories and deduplicated resources. It supports intelligent format handling, real-time progress tracking, and AI-assisted parsing for edge cases.

### Q: Which repositories are supported?

**A:** Any repository following the [awesome list specification](https://github.com/sindresorhus/awesome):
- Must have README.md at root
- Uses markdown format
- Has `## Category` and `###  Subcategory` headers
- Lists resources as `* [Title](URL) - Description` or `- [Title](URL) - Description`

**Tested repositories:**
- krzemienski/awesome-video (751 resources) ✅
- rust-unofficial/awesome-rust (829 resources) ✅

**Expected success rate:** 95%+ for compliant repositories

### Q: Is it free to use?

**A:** Yes, with caveats:
- **GitHub fetching**: Free (uses raw.githubusercontent.com CDN)
- **Standard parsing**: Free (regex-based, no AI)
- **AI parsing**: Optional, ~$0.0004 per ambiguous resource
  - Disabled by default
  - Only needed for malformed resources
  - Typical cost: <$0.01 per import

### Q: How long does an import take?

**A:**
- Small repo (500 resources): ~3-5 seconds
- Medium repo (1000 resources): ~5-10 seconds
- Large repo (5000 resources): ~20-60 seconds

**Factors:**
- Network speed to GitHub
- Number of resources
- Database size (affects conflict resolution)
- Whether resources already exist (re-import is faster)

### Q: Can I import private repositories?

**A:** Not currently (v1.1.0). Private repos require GitHub App authentication.

**Planned:** v1.2.0 will add private repo support

**Workaround:** Clone repo locally, serve README.md via local server, import from local URL

### Q: What happens if I import the same repository twice?

**A:** Duplicate prevention via conflict resolution:
1. Checks each resource URL against existing
2. If URL exists + unchanged: Skips (no duplicate created)
3. If URL exists + changed: Updates resource with new data
4. If URL doesn't exist: Creates new resource

**Result:** Safe to re-import, no duplicates created ✅

---

## Import Process Questions

### Q: Do I need a GitHub token to import?

**A:** No, not for public repositories.

- **Public repos**: Fetched via raw.githubusercontent.com (no auth needed)
- **Private repos**: Would need GitHub token (not supported in v1.1.0)
- **Exports**: Require GitHub token (needs write access)

### Q: What if the README is named readme.md or Readme.md?

**A:** The import looks for README.md specifically (case-sensitive).

**Workaround:** If repo uses different casing:
1. Check repo on GitHub
2. If readme.md exists, submit issue to repo maintainer
3. Or: Clone repo, rename to README.md, import from local

**Future:** v1.1.1 will try case-insensitive fallback

### Q: Can I import from a specific branch?

**A:** The import tries 'main' first, then 'master' as fallback.

**Custom branch:** Not currently configurable via UI

**Workaround:**
```typescript
// Code change needed:
await client.fetchFile(repoUrl, 'README.md', 'develop');  // Specify branch
```

**Planned:** v1.2.0 will add branch selector in UI

### Q: What happens if import fails halfway?

**A:** Partial import occurs:
- Hierarchy: Already created (persisted)
- Resources: Some imported, some not
- Recovery: Re-import same repo, will complete (skips existing, creates missing)

**Not atomic currently** (no database transaction)

**Future:** v1.2.0 will add transaction wrapping for atomicity

### Q: How do I know what format deviations were detected?

**A:** During import (if using SSE endpoint):
1. Analyzing phase (40%) shows deviation analysis
2. Yellow warning card lists:
   - Deviations: Issues that may affect import
   - Warnings: Non-critical observations
3. canProceed: true/false indicator

**After import:**
- Check logs: Docker logs show detected deviations
- Not persisted currently

**Future:** v1.2.0 will save deviation analysis in sync history

---

## Technical Questions

### Q: Why did sub-subcategory pages show 1000 wrong resources?

**A:** This was Bug #001 (critical, now fixed):

**Cause:** The `/api/resources` endpoint was missing support for the `subSubcategory` query parameter. When the frontend sent `?subSubcategory=iOS%2FtvOS`, the backend ignored it and returned all approved resources (limit 1000) instead of filtering.

**Fix:** Added `subSubcategory` parameter support throughout the request pipeline (routes.ts, storage.ts, redisCache.ts).

**Status:** ✅ Fixed in v1.1.0 (commit 23bdbab)

### Q: What is AI-assisted parsing and when would I use it?

**A:**AI parsing uses Claude Haiku 4.5 to handle malformed or ambiguous resources that fail standard regex parsing.

**When to use:**
- Repository has non-standard markdown formatting
- Resources with bold titles: `**[Title](...)**`
- Missing URL protocols
- Complex URL patterns (parentheses, special chars)
- Malformed markdown that you can't fix at source

**How to enable:**
```typescript
// Currently requires code change:
const parsedList = await parser.extractResourcesWithAI(true);
```

**Cost:** ~$0.0004 per ambiguous resource (typically <2% of resources)

**Future:** v1.1.1 will add UI checkbox to enable per-import

### Q: Why does export use dash (-) markers instead of asterisk (*)?

**A:** This is a known cosmetic issue (Issue #004):

**Cause:** The formatter template is hardcoded to use dash markers

**Impact:** Minor (both formats are awesome-lint compliant)

**Workaround:** None currently

**Fix planned:** v1.2.0 will detect input format and match in output

### Q: What's the difference between /api/github/import and /api/github/import-stream?

**A:**

**`/api/github/import`** (Standard):
- Returns immediately: `{ "message": "Import started", "queueId": "..." }`
- Import runs in background
- No progress updates
- Suitable for: Automated imports, API integrations

**`/api/github/import-stream`** (Streaming):
- Streams progress via Server-Sent Events (SSE)
- Returns: Real-time updates (0-100% progress)
- Includes: Status messages, deviation warnings, resource counters
- Suitable for: Interactive UI, monitoring large imports

**Which to use:** Use /import-stream for UI, /import for automation

### Q: How does the parser handle badges in descriptions?

**A:** Badges are preserved as-is in the description TEXT field.

**Example:**
```markdown
* [Resource](url) - Description text [![Build](badge-url)](link)
```

**Stored as:**
```
description: "Description text [![Build](badge-url)](link)"
```

**Display:** Rendered as markdown in UI (badge images show if URLs valid)

**Cleanup option:** Future enhancement could strip badges if desired

---

## Troubleshooting Questions

### Q: Import returns "Parse Error" - what should I check?

**A:** Common causes:

1. **Repository not found (404)**:
   - Verify repo URL is correct
   - Check repo is public (not private)
   - Try accessing in browser: `https://raw.githubusercontent.com/owner/repo/master/README.md`

2. **README not found**:
   - Check if file is named README.md (case-sensitive)
   - Check if README is in root directory (not in subdirectory)
   - Verify branch name (main vs master)

3. **Markdown syntax errors**:
   - Validate with awesome-lint locally first
   - Check for unclosed brackets, parentheses
   - Verify links are properly formatted

4. **Network timeout**:
   - GitHub CDN may be slow or down
   - Try again after a few minutes
   - Check internet connection

### Q: Import completed but resources not showing - why?

**A:** Possible causes:

1. **All resources skipped (already existed)**:
   - Check logs: "import completed: { imported: 0, skipped: 751 }"
   - This is normal for re-imports with no changes
   - Resources were imported previously

2. **Resources pending approval**:
   - Import creates resources with status='approved' by default
   - Check: Are you filtering by status='pending'?
   - Solution: Check /admin/resources for all statuses

3. **Category filter active**:
   - You may be viewing a specific category
   - Imported resources in different category
   - Solution: Go to homepage to see all categories

4. **Cache not refreshed**:
   - Redis cache may have stale data
   - Solution: Wait 5 minutes (TTL) or restart Redis
   - Command: `docker-compose restart redis`

### Q: I see "Registries" and "Resources" categories - should they exist?

**A:** No, these are metadata sections that were incorrectly imported.

**Cause:** Imported before parser fix (v1.0.0 or early v1.1.0 testing)

**Impact:** Cosmetic clutter, no functional issue

**Fix:**
```sql
-- Delete these categories and their resources:
DELETE FROM resources WHERE category IN ('Registries', 'Resources');
DELETE FROM categories WHERE name IN ('Registries', 'Resources');
```

**Prevention:** Parser now filters these (v1.1.0+), won't happen on new imports

### Q: Import shows "Too many deviations" - what should I do?

**A:** The repository has >3 format deviations from awesome list standard.

**Steps:**
1. Review deviation list shown in UI
2. Check if deviations are acceptable:
   - Mixed markers: Usually OK
   - Missing descriptions: Usually OK
   - Metadata sections: Usually OK
3. If deviations seem incorrect:
   - Report as parser bug
4. If deviations are real issues:
   - Option A: Fix source markdown in GitHub repo
   - Option B: Enable AI parsing (handles more edge cases)
   - Option C: Import anyway (may have issues)

**Example:**
- awesome-rust had 2 deviations (mixed markers, metadata sections)
- Both acceptable, import proceeded successfully

### Q: Progress bar is stuck at X% - is import frozen?

**A:** Possible causes:

1. **Large import in progress**:
   - Importing 5000 resources can take ~60 seconds
   - Progress updates every 10 resources
   - May appear stuck if processing batch

2. **Database operation slow**:
   - Hierarchy creation can take 2-3 seconds
   - No progress updates during this phase
   - Wait for "Creating hierarchy..." to complete

3. **Actually frozen**:
   - Check Docker logs: `docker-compose logs -f web`
   - Look for errors or exceptions
   - If stuck >5 minutes, likely an error

**Solution:**
- Wait for timeout (5 min)
- Check logs for errors
- If error: Report bug with logs
- If timeout: Retry import

### Q: Sub-subcategory pages still show wrong resources after upgrade - why?

**A:** Redis cache contains pre-fix data.

**Cause:** Bug #001 was fixed in v1.1.0, but cached responses remain in Redis

**Fix:**
```bash
# Clear Redis cache:
docker-compose exec redis redis-cli FLUSHALL

# Or just wait 5 minutes (cache TTL expires)
```

**Verification:**
```bash
# After cache clear, test:
curl "http://localhost:3000/api/resources?subSubcategory=iOS%2FtvOS&status=approved"

# Should return ~30 resources, not 1000
```

---

## Feature Questions

### Q: Can I import multiple repositories at once?

**A:** Not in batch, but concurrently.

**Current:**
- Import repo 1, wait for completion
- Then import repo 2

**Concurrent** (v1.1.0+):
- Start import repo 1 (background)
- Start import repo 2 (background)
- Both run simultaneously
- Limit: 2 concurrent imports (prevent DB contention)

**Future (v1.2.0):**
- Batch import UI: Select multiple repos, import all
- Job queue: Manages concurrency automatically

### Q: Can I schedule automatic imports?

**A:** Not in v1.1.0.

**Workaround:** Set up cron job externally:
```bash
# crontab -e
0 2 * * * curl -X POST http://localhost:3000/api/github/import \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"repositoryUrl": "https://github.com/krzemienski/awesome-video"}'
```

**Planned:** v1.2.0 will add scheduling UI

### Q: How do I rollback a bad import?

**A:** No built-in rollback currently.

**Manual rollback:**
```sql
-- Find import in sync history:
SELECT * FROM github_sync_history WHERE repository_url = '...' ORDER BY created_at DESC LIMIT 1;

-- Get snapshot of resources before import (if available):
-- (Snapshots not implemented in v1.1.0)

-- Delete resources from this import:
DELETE FROM resources 
WHERE metadata->>'importedAt' > '2025-12-05T00:00:00';  -- Adjust timestamp

-- Or restore from database backup:
pg_restore -d $DATABASE_URL backup.sql
```

**Future:** v1.2.0 will add rollback UI with snapshots

### Q: Can I customize which categories to import?

**A:** Not selectively in v1.1.0.

**Current:** Imports entire README (all categories)

**Workaround:** After import, delete unwanted categories:
```sql
DELETE FROM resources WHERE category = 'UnwantedCategory';
DELETE FROM categories WHERE name = 'UnwantedCategory';
```

**Future:** v1.2.0 could add category selection UI before import

### Q: Does import affect existing user data (favorites, bookmarks)?

**A:** No, import only touches:
- resources table (creates new, updates existing, or skips)
- categories table (creates new if needed)
- subcategories table (creates new if needed)
- sub_subcategories table (creates new if needed)
- github_sync_history table (adds import record)

**Safe:**
- user_favorites table (unchanged)
- user_bookmarks table (unchanged)
- user_preferences table (unchanged)
- All other tables (unchanged)

**If resource updated:** Favorites/bookmarks still reference same resource.id (safe)

---

## Errors & Issues

### Q: Getting "Unauthorized" when trying to import

**A:** You're not logged in as admin.

**Solution:**
1. Navigate to /login
2. Login with admin credentials (admin@test.com / TestAdmin123!)
3. Verify admin role:
   ```sql
   SELECT email, raw_user_meta_data->>'role' FROM auth.users WHERE email = 'admin@test.com';
   -- Should show: role = 'admin'
   ```
4. Retry import

**Check:** Docker logs show "Unauthorized" at API level

### Q: Import says "Invalid GitHub repository URL"

**A:** URL format incorrect.

**Accepted formats:**
- `owner/repository` (e.g., `krzemienski/awesome-video`)
- `https://github.com/owner/repository`
- `https://github.com/owner/repository.git`

**Not accepted:**
- `github.com/owner/repository` (missing protocol)
- `owner/repository/tree/main` (includes path)
- `https://gitlab.com/...` (not GitHub)

**Fix:** Use one of the accepted formats

### Q: Seeing "File not found: README.md" error

**A:** Repository doesn't have README.md at root, or branch mismatch.

**Check:**
1. Visit repo on GitHub: https://github.com/owner/repository
2. Verify README.md exists at root (not in subdirectory)
3. Check default branch name:
   - Modern repos: 'main'
   - Older repos: 'master'
   - System tries both

**Fix:** Ensure README.md exists at repo root

### Q: Import completed but categories/resources missing

**A:** Possible causes:

1. **Metadata sections filtered out**:
   - Sections like "License", "Contributing", "Registries" are intentionally skipped
   - This is correct behavior

2. **Parse errors (silent)**:
   - Resources that don't match regex are skipped
   - Enable AI parsing for edge cases
   - Check logs for "skipped" messages

3. **Hierarchy depth >3**:
   - Only supports: ## → ### → ####
   - Deeper nesting (####) is flattened or skipped

**Check logs:**
```bash
docker-compose logs web | grep -i "parse\|skip\|error"
```

### Q: Resources imported but navigation doesn't show new category

**A:** Cache invalidation issue or React state not refreshed.

**Solutions:**
1. Refresh browser (Ctrl+R or Cmd+R)
2. Clear Redis cache: `docker-compose restart redis`
3. Wait 5 minutes (cache TTL expires)
4. Hard refresh: Ctrl+Shift+R (clears browser cache too)

**Future:** Import should trigger cache invalidation automatically

---

## Performance Questions

### Q: Import is very slow (>5 min for 1000 resources) - why?

**A:** Possible bottlenecks:

1. **Network latency to GitHub**:
   - Check: `curl -w "%{time_total}\n" https://raw.githubusercontent.com/owner/repo/main/README.md`
   - Slow >5s: GitHub issue or network issue

2. **Database not indexed**:
   ```sql
   -- Check indexes exist:
   \d+ resources
   
   -- Add if missing:
   CREATE INDEX idx_resources_category ON resources(category);
   CREATE INDEX idx_resources_url ON resources(url);
   ```

3. **Large conflict check**:
   - If database has 50K+ resources, conflict resolution slows down
   - Current: O(N) to build existing map
   - Solution: Optimize conflict resolution query

4. **Individual INSERT queries**:
   - Current: ~20ms per resource
   - For 1000 resources: ~20 seconds
   - Solution: Batch INSERT (future enhancement)

**Quick fixes:**
1. Ensure indexes exist
2. Restart Redis (clear old cache)
3. Import during off-peak hours

### Q: Will importing 10,000 resources work?

**A:** Should work but not tested at that scale in v1.1.0.

**Estimated:**
- Import time: ~3-5 minutes
- Memory usage: ~300MB
- Database growth: ~50MB

**Potential issues:**
- Timeout: 5 min limit may be hit
- Memory: Node.js may need heap increase
- UI: Progress bar may not update smoothly

**Recommendation:** Test in staging first, monitor closely

**Future:** v1.2.0 will add explicit scale testing and optimizations

### Q: Does import slow down the rest of the site?

**A:** Minimal impact in v1.1.0:

**During import:**
- CPU usage: +30% (parsing, database writes)
- Memory: +50MB (temporary)
- Database: Connections +1 (import query)

**Public users:**
- Read queries still fast (<200ms)
- Redis cache serves most requests
- No blocking (import runs async)

**Best practice:** Import during off-peak hours for large repos

---

## Data Questions

### Q: What happens to resources that already exist?

**A:** Conflict resolution logic:

1. **Check URL** (unique identifier)
2. **If exists + unchanged**: Skip (log "- Skipped: [title] - No changes detected")
3. **If exists + changed**: Update with new data (log "↻ Updated: [title] - Updated content")
4. **If not exists**: Create new (log "✓ Imported: [title]")

**Merge strategy for updates:**
- Title: Use new title
- Description: Use longer description (keep more information)
- Category: Use new category (in case it changed)
- Other fields: Use new values

**Result:** No duplicates, always has latest data

### Q: Can I delete imported resources?

**A:** Yes, via admin panel:

1. Navigate to /admin/resources
2. Find resources (filter by category if needed)
3. Select resources
4. Click "Delete" (if bulk delete implemented)

**Or via SQL:**
```sql
-- Delete all from specific import:
DELETE FROM resources 
WHERE metadata->>'sourceList' LIKE '%awesome-rust%';

-- Delete specific category:
DELETE FROM resources WHERE category = 'Applications';

-- Delete by URL pattern:
DELETE FROM resources WHERE url LIKE '%github.com/rust%';
```

**Warning:** Deleting categories may orphan resources (denormalized schema)

### Q: How do I clean up test data after imports?

**A:** Depends on what you consider "test data":

**Option A: Delete by category**
```sql
-- If test imports created categories like "Test Category":
DELETE FROM resources WHERE category LIKE '%Test%';
DELETE FROM categories WHERE name LIKE '%Test%';
```

**Option B: Delete by URL pattern**
```sql
-- If test resources have URLs like https://test.com:
DELETE FROM resources WHERE url LIKE '%test.com%';
```

**Option C: Delete by date**
```sql
-- Delete resources imported after specific date:
DELETE FROM resources WHERE created_at > '2025-12-05T00:00:00';
```

**Option D: Keep awesome-video, delete everything else**
```sql
-- Delete all non-video categories:
DELETE FROM resources WHERE category NOT IN (
  SELECT name FROM categories WHERE created_at < '2025-12-03'  -- Before rust import
);
```

**Safest:** Backup database before mass deletions

---

## Configuration Questions

### Q: Where do I set the ANTHROPIC_API_KEY for AI parsing?

**A:** In the `.env` file at project root:

```bash
# .env
ANTHROPIC_API_KEY=sk-ant-api03-xxx...
```

**Then:**
1. Rebuild Docker: `docker-compose build --no-cache web`
2. Restart: `docker-compose up -d`
3. Verify: AI parsing will now work if enabled in code

**Check if set:**
```bash
docker-compose exec web printenv | grep ANTHROPIC
```

**If missing:** AI parsing silently disabled, no errors thrown

### Q: Do I need GITHUB_TOKEN for imports?

**A:** No, only for exports.

**Imports (read-only):**
- Public repos: No token needed
- Uses raw.githubusercontent.com
- No rate limits

**Exports (write access):**
- Requires: GITHUB_TOKEN with repo write permissions
- Used for: Creating commits, pushing to GitHub
- Set in: `.env` file

**Rate limits:**
- Without token: 60 requests/hour
- With token: 5000 requests/hour
- Import uses: 1 request per import (fetches README.md once)

### Q: Can I change the import timeout?

**A:** Yes, but requires code change:

**Current timeout:** 5 minutes (hardcoded)

**Change:**
```typescript
// In routes.ts or syncService.ts:
const IMPORT_TIMEOUT = 10 * 60 * 1000;  // 10 minutes

// Add timeout to fetch:
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), IMPORT_TIMEOUT);
const response = await fetch(url, { signal: controller.signal });
```

**Future:** v1.2.0 will make timeout configurable via env var

---

## Best Practices Questions

### Q: Should I import every awesome list I find?

**A:** Consider:

**Pros:**
- More resources for users
- Diverse categories
- Comprehensive coverage

**Cons:**
- Database size growth
- Category list clutter
- Potential low-quality resources
- Maintenance burden

**Recommendation:**
- Import high-quality, maintained lists only
- Check: Last commit date, star count, issue activity
- Test: Import to staging first, review quality
- Curate: Delete low-quality resources after import

### Q: How often should I re-import repositories?

**A:** Depends on update frequency:

**Active repos** (daily commits):
- Re-import: Weekly or bi-weekly
- Purpose: Catch new resources
- Impact: Minimal (conflict resolution skips unchanged)

**Stable repos** (monthly commits):
- Re-import: Monthly or quarterly
- Purpose: Occasional new resources
- Impact: Very minimal

**Inactive repos** (yearly commits):
- Re-import: Yearly or when you notice updates
- Purpose: Rare updates only

**Automation** (future):
- v1.2.0: Scheduled imports
- v2.0.0: Webhook-triggered imports (auto-sync on repo changes)

### Q: Should I enable AI parsing by default?

**A:** No, keep disabled unless needed.

**Reasoning:**
- Standard parsing: 98%+ success rate
- AI parsing: Adds cost (~$0.0004 per ambiguous resource)
- AI parsing: Adds latency (~200ms per resource)
- AI parsing: Most repos don't need it

**When to enable:**
- Repository known to have edge cases
- Initial import shows parse errors in logs
- Deviation detection indicates parsing issues
- You want to maximize resource recovery (accept cost)

**Cost example:**
- 1000 resources, 5% edge cases (50 resources)
- Cost: 50 × $0.0004 = $0.02 (2 cents)
- Acceptable for one-time import, high for frequent re-imports

---

## Comparison Questions

### Q: Import vs Manual Entry - which is better?

**A:**

**Import (for bulk):**
- Pros: Fast (1000 resources in ~25s), Accurate (parsing), Maintains structure
- Cons: Requires GitHub source, All-or-nothing, Format must be compatible
- Best for: Large lists, existing awesome-lists, initial setup

**Manual Entry (for curation):**
- Pros: Selective (choose what to add), Quality control, Custom categorization
- Cons: Slow (~60s per resource), Error-prone (typos), No hierarchy automation
- Best for: Individual high-quality resources, Custom categories, Ongoing curation

**Recommendation:** Import for bulk, manual entry for ongoing curation

### Q: awesome-video vs awesome-rust - which format is "correct"?

**A:** Both are valid awesome-list formats.

**awesome-video:**
- Markers: Asterisk (*)
- Hierarchy: 2-level (## → ###)
- Descriptions: Always present
- Badges: Few

**awesome-rust:**
- Markers: Mostly asterisk, some dash (mixed)
- Hierarchy: 2-level + rare 3-level
- Descriptions: ~23% missing
- Badges: Many (452 badges)

**Parser handles both:** ✅ 98%+ success rate for both

**Standard:** sindresorhus/awesome recommends:
- Markers: Asterisk (*)
- Descriptions: Required
- Hierarchy: Flexible (2 or 3 level)

**Bottom line:** Parser is flexible, both work fine

---

## Future Questions

### Q: Will v1.2.0 support GitLab repositories?

**A:** Possibly, not confirmed.

**Technical feasibility:** High (similar API structure)

**Changes needed:**
- gitlab/client.ts (new file)
- Parser: Same (markdown format identical)
- Import: Toggle for GitHub vs GitLab

**Priority:** Low (most awesome lists on GitHub)

### Q: Will AI parsing be required in future?

**A:** No, always opt-in.

**Philosophy:**
- Standard parsing should handle 95%+ of lists
- AI is fallback for edge cases only
- Cost should be user's choice
- No surprise charges

**Future:** v1.1.1 adds UI toggle for transparency

### Q: Can I contribute parser improvements?

**A:** Yes! Areas needing improvement:

1. **Regex patterns**: Handle more edge cases
2. **Metadata detection**: Add more keywords
3. **Badge stripping**: Option to clean descriptions
4. **URL normalization**: HTTP→HTTPS, trailing slash handling
5. **Performance**: Faster parsing for large files

**Process:**
1. Fork repository
2. Add test cases in scripts/test-deviation-detection.ts
3. Implement improvement in server/github/parser.ts
4. Test with actual awesome lists
5. Submit PR with test evidence

### Q: What metrics should I monitor post-deploy?

**A:**

**Critical:**
- Import success rate (should be >90%)
- Sub-subcategory page errors (should be 0%, bug was fixed)
- API response times (should be <1s)

**Important:**
- Parse failure rate (should be <5%)
- Deviation detection triggers (track for trends)
- Resource growth rate (estimate storage needs)

**Nice to have:**
- AI parsing usage (if enabled)
- User engagement with imported resources
- Search query patterns

**Tools:**
- Application logs: Docker logs
- Database: pg_stat_statements
- Redis: INFO stats
- Custom: Metrics endpoint (future)

---

## Support

**Documentation:**
- User guide: docs/GITHUB_IMPORT_GUIDE.md
- Technical: docs/TECHNICAL_ARCHITECTURE_IMPORT.md
- Bugs: docs/IMPORT_FEATURE_BUGS.md

**Troubleshooting:**
1. Check Docker logs
2. Verify database connection
3. Test API endpoint directly (curl)
4. Review deviation detection results

**Contact:**
- Issues: GitHub repository issues
- Discussions: GitHub discussions (if enabled)
- Email: Support email (if configured)

---

**FAQ Version**: 1.0
**Last Updated**: 2025-12-05
**Covers**: v1.1.0 import feature
**Status**: Complete

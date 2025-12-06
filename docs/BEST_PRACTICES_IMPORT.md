# Best Practices - Import Feature

**Version**: v1.1.0
**Audience**: Developers and administrators
**Last Updated**: 2025-12-05

---

## Import Best Practices

### 1. Validate Before Importing

**DO:**
```bash
# Check repository exists and is accessible:
curl -I https://raw.githubusercontent.com/owner/repo/master/README.md

# Test with small repo first (sindresorhus/awesome is good):
# - Small size (~20KB)
# - Well-formed
# - Standard format
# - Validates system works

# Review deviation detection results before proceeding
```

**DON'T:**
```bash
# Import huge unknown repository without validation
# Import without checking deviation warnings
# Ignore "too many deviations" errors
```

**Why:** Prevents bad imports, validates parser works, identifies format issues early

### 2. Use Appropriate Import Method

**Use Standard Import (`/api/github/import`) When:**
- Importing via automation/scripts
- Don't need real-time feedback
- Small repositories (<500 resources)
- Background processing is fine

**Use Streaming Import (`/api/github/import-stream`) When:**
- Importing via UI (human operator)
- Want to see progress
- Large repositories (>1000 resources)
- Want deviation warnings immediately

**Why:** Standard is simpler/faster, streaming provides better UX

### 3. Enable AI Parsing Judiciously

**Enable AI When:**
- Repository known to have edge cases (tested and confirmed)
- Standard parsing shows <95% success rate
- Deviation detection indicates many malformed resources
- Cost is acceptable (~$0.01 per 1000 resources)

**Keep AI Disabled When:**
- Standard parsing works (98%+ success)
- Repository is well-formed
- Cost is a concern
- Performance is critical (AI adds latency)

**Test First:**
```typescript
// Parse without AI:
const standard = parser.extractResources();

// Calculate success rate:
const totalLines = markdown.split('\n').filter(l => l.startsWith('*')).length;
const successRate = standard.length / totalLines;

// If <95%, consider enabling AI:
if (successRate < 0.95) {
  console.log('Low success rate, AI recommended');
  const estimated = estimateAICost(totalLines - standard.length);
  console.log(`Estimated cost: $${estimated.toFixed(4)}`);
}
```

**Why:** AI costs money and time, only use when needed

### 4. Monitor Imports

**DO:**
```bash
# Watch logs during import:
docker-compose logs -f web | grep -i "import\|parse"

# Check for errors:
docker-compose logs web | grep -i error | tail -20

# Verify completion:
curl http://localhost:3000/api/github/sync-history \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.[0]'
```

**Track Metrics:**
```
- Import duration
- Resources imported/updated/skipped
- Parse errors (should be <5%)
- Deviation frequency
```

**DON'T:**
```bash
# Import and walk away without checking
# Ignore errors in logs
# Assume success without verification
```

**Why:** Early detection of issues, quality assurance, learning what fails

### 5. Handle Conflicts Appropriately

**Understand Conflict Resolution:**
```
1. URL is unique identifier (not title)
2. If URL exists + unchanged: Skip
3. If URL exists + changed: Update
4. If URL new: Create

Merge strategy:
- Title: Use new title
- Description: Use longer description (preserves more info)
- Category: Use new category (in case it changed)
```

**Best Practice:**
```
# First import: Creates all resources
# Re-import: Skips unchanged, updates changed

# If you want to force re-creation:
# 1. Delete category first:
DELETE FROM resources WHERE category = 'CategoryName';

# 2. Then import (will create fresh)
```

**Why:** Prevents duplicates, keeps data fresh, preserves user favorites/bookmarks

---

## Parser Best Practices

### 1. Metadata Section Filtering

**Always Filter:**
- License
- Contributing
- Contributors
- Code of Conduct
- Table of Contents
- Registries
- Resources

**How:**
```typescript
// In isMetadataSection():
const metadataSections = [
  'License', 'Contributing', 'Contributors', 'Code of Conduct',
  'Registries', 'Resources', 'Table of Contents', 'Contents'
];
return metadataSections.some(section => 
  line.toLowerCase().includes(section.toLowerCase())
);
```

**Why:** These are not resource categories, importing them causes clutter

### 2. Hierarchy Extraction

**Extract Before Importing Resources:**
```typescript
// CORRECT order:
const hierarchy = parser.extractHierarchy();
// 1. Create categories (no FK deps)
// 2. Create subcategories (FK → categories)
// 3. Create sub-subcategories (FK → subcategories)
// 4. Then import resources (reference categories via TEXT)

// WRONG order:
// Create resources first (will fail, no categories exist)
```

**Why:** FK relationships must exist before referencing them

### 3. Format Deviation Handling

**Check Threshold:**
```typescript
const analysis = parser.detectFormatDeviations();

if (!analysis.canProceed) {
  // >3 deviations: Risky
  console.log('Manual review recommended');
  console.log('Deviations:', analysis.deviations);
  // Decision: Fix source or accept risk
}
```

**Common Acceptable Deviations:**
- Mixed markers (2 asterisk, 1 dash) - Parser handles
- 2-level vs 3-level hierarchy - Both supported
- Missing descriptions - Empty string used
- Metadata sections - Now filtered

**Unacceptable Deviations:**
- >50% resources malformed
- Non-markdown content
- Completely wrong structure
- Invalid URLs

**Why:** Some deviations are cosmetic, others break imports

---

## Database Best Practices

### 1. Maintain Indexes

**Critical Indexes:**
```sql
-- Required for performance:
CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category);
CREATE INDEX IF NOT EXISTS idx_resources_subcategory ON resources(subcategory);
CREATE INDEX IF NOT EXISTS idx_resources_sub_subcategory ON resources(sub_subcategory);
CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status);
CREATE INDEX IF NOT EXISTS idx_resources_url ON resources(url);

-- Verify:
\d+ resources
-- Should show all 5 indexes
```

**Why:** Without indexes, queries are 10-100x slower

### 2. Regular Cleanup

**Cleanup Old Data:**
```sql
-- Delete rejected resources (older than 30 days):
DELETE FROM resources 
WHERE status = 'rejected' 
AND updated_at < NOW() - INTERVAL '30 days';

-- Delete old audit logs (older than 90 days):
DELETE FROM resource_audit_log 
WHERE created_at < NOW() - INTERVAL '90 days';

-- Vacuum to reclaim space:
VACUUM ANALYZE resources;
```

**Schedule:** Monthly cleanup recommended

**Why:** Prevents database bloat, maintains performance

### 3. Monitor FK Integrity

**Regular Check:**
```sql
-- Run weekly:
SELECT 'Orphaned Subcategories' as issue, COUNT(*) as count
FROM subcategories s
LEFT JOIN categories c ON c.id = s.category_id
WHERE c.id IS NULL;

-- Expected: 0
-- If >0: Investigate and fix
```

**Why:** Denormalized resources + FK hierarchy can become inconsistent if not monitored

---

## Performance Best Practices

### 1. Optimize for Scale

**At 10K+ Resources:**
```
# Implement these optimizations:
1. Batch INSERT for resources (40x faster)
2. Full-text search index (13x faster)
3. Homepage limit reduction (4.4x faster)
4. Code splitting (2.5x faster initial load)

# See: docs/OPTIMIZATION_GUIDE_IMPORT.md
```

**Why:** Current performance acceptable for 4K, optimizations needed for 10K+

### 2. Cache Wisely

**Set Appropriate TTLs:**
```typescript
// Stable data (changes rarely):
CACHE_TTL.CATEGORIES = 24 * 60 * 60;  // 24 hours

// Dynamic data (changes frequently):
CACHE_TTL.RESOURCES_LIST = 300;  // 5 minutes

// Search results (varies):
CACHE_TTL.SEARCH = 300;  // 5 minutes
```

**Invalidate on Mutations:**
```typescript
// After import:
await redisCache.invalidatePattern('resources:*');
await redisCache.invalidatePattern('categories:*');
```

**Why:** Balance freshness vs performance

### 3. Limit Data Fetching

**DON'T:**
```typescript
// Fetch all resources:
const resources = await storage.listResources({ limit: 10000 });  // 840KB!
```

**DO:**
```typescript
// Fetch only what's needed:
const resources = await storage.listResources({ limit: 50 });  // 15KB
// Add "Load More" for pagination
```

**Why:** Reduces bandwidth, faster loading, better UX

---

## Security Best Practices

### 1. Protect API Keys

**DO:**
```bash
# Store in environment variables:
ANTHROPIC_API_KEY=sk-ant-xxx...
GITHUB_TOKEN=ghp_xxx...

# In .env file (not in code)
# Add .env to .gitignore
```

**DON'T:**
```typescript
// Hardcode in code:
const apiKey = 'sk-ant-xxx...';  // ❌ NEVER DO THIS

// Log keys:
console.log('API key:', process.env.ANTHROPIC_API_KEY);  // ❌
```

**Why:** Prevents key exposure, credential theft

### 2. Validate All Inputs

**DO:**
```typescript
// Use Zod validation:
const schema = z.object({
  repositoryUrl: z.string().url().regex(/github\.com/),
  options: z.object({
    forceOverwrite: z.boolean().optional()
  })
});

const validated = schema.parse(req.body);
```

**DON'T:**
```typescript
// Trust user input:
const { repositoryUrl } = req.body;  // No validation
await importFromGitHub(repositoryUrl);  // Dangerous
```

**Why:** Prevents injection, malformed requests, API abuse

### 3. Rate Limit Admin Endpoints

**Recommended:**
```typescript
const importLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 10,  // Max 10 imports per hour
  keyGenerator: (req) => req.user.id  // Per user
});

app.post('/api/github/import', isAuthenticated, isAdmin, importLimiter, ...);
```

**Why:** Prevents abuse (malicious or accidental), protects resources

---

## Testing Best Practices

### 1. Always Use 3-Layer Validation

**For Every Test:**
```typescript
// Layer 1: API
const apiResponse = await fetch(...);
console.assert(apiResponse.status === 200, 'API failed');

// Layer 2: Database
const dbCount = await db.execute(sql`SELECT COUNT(*) ...`);
console.assert(dbCount === apiResponse.data.total, 'DB mismatch');

// Layer 3: UI
// Navigate and verify visually
// Take screenshots for evidence
```

**Why:** Catches issues at any layer, comprehensive verification

### 2. Test Edge Cases

**Don't Just Test Happy Path:**
```
Test:
- Missing descriptions ✅
- Bold titles ✅
- Mixed markers ✅
- Rare sub-subcategories ✅
- Metadata sections ✅
- Duplicate URLs ✅
- Invalid URLs ✅
- Empty repositories ✅
- Huge repositories (stress test) ✅
```

**Why:** Edge cases reveal bugs (Bug #001 found by testing level 3 navigation)

### 3. Document Evidence

**For Each Test:**
```
Create:
- API response logs (curl output or browser network tab)
- Database query results (SQL output)
- Screenshots (3 viewports if UI change)
- Description of expected vs actual
- Pass/fail verdict

Store:
- Test-specific markdown files
- Screenshots with descriptive names
- Organized by feature/bug

Why: Reproducibility, audit trail, knowledge transfer
```

---

## Documentation Best Practices

### 1. Document During Development

**DO:**
```
While coding:
- Write comments explaining WHY
- Create test evidence files
- Log investigation steps
- Capture screenshots immediately

After coding:
- Update relevant docs
- Add examples
- Document trade-offs
```

**DON'T:**
```
# Wait until end to document
# Try to remember details later
# Skip documentation "for now"
```

**Why:** Details are fresh, accuracy is higher, nothing is forgotten

### 2. Multiple Documentation Levels

**Provide:**
- User guide (how to use feature)
- Technical architecture (how it works)
- API reference (interface contracts)
- Troubleshooting (common issues)
- Examples (copy-paste code)
- FAQ (quick answers)

**Why:** Different audiences need different information

### 3. Keep Documentation Updated

**Update When:**
- API endpoints change
- Behavior changes
- New features added
- Bugs fixed
- Performance characteristics change

**Update:**
- API reference
- User guides
- Examples
- Changelog

**Why:** Stale documentation is worse than no documentation

---

## Error Handling Best Practices

### 1. Fail Gracefully

**DO:**
```typescript
try {
  const result = await importFromGitHub(repoUrl);
  return result;
} catch (error) {
  console.error('Import failed:', error);
  
  // User-friendly error:
  res.status(500).json({ 
    message: 'Failed to import. Please check the repository URL and try again.'
  });
  
  // Detailed error to logs (for debugging):
  // Already logged above
}
```

**DON'T:**
```typescript
// Let errors crash the server:
const result = await importFromGitHub(repoUrl);  // No try-catch

// Expose internals to user:
res.status(500).json({ message: error.stack });  // Security risk
```

**Why:** Better UX, easier debugging, no info disclosure

### 2. Log Useful Information

**DO:**
```typescript
console.log(`Importing ${repoUrl}...`);
console.log(`Found ${resources.length} resources`);
console.log(`Created ${categories.size} categories`);

// Include context:
console.error(`Failed to create resource: ${resource.title}`, {
  url: resource.url,
  category: resource.category,
  error: error.message
});
```

**DON'T:**
```typescript
console.log('Importing...');  // Not specific
console.log(error);  // No context

// Or: Over-logging
resources.forEach(r => console.log(r));  // Spam (751 lines)
```

**Why:** Helpful logs speed debugging, context is key

### 3. Provide Actionable Errors

**DO:**
```
Error: "Repository not found. Please verify the URL is correct and the repository is public."

Error: "Import failed: Too many format deviations. Review the list and fix markdown or enable AI parsing."
```

**DON'T:**
```
Error: "Error 404"
Error: "Import failed"
```

**Why:** Users can self-solve with actionable errors

---

## Code Organization Best Practices

### 1. Separation of Concerns

**Good Structure:**
```
server/github/
  ├── client.ts       # GitHub API interactions only
  ├── parser.ts       # Markdown parsing only
  ├── formatter.ts    # Markdown generation only
  └── syncService.ts  # Orchestration (uses above)

server/ai/
  └── parsingAssistant.ts  # AI interactions only

server/
  ├── routes.ts       # HTTP endpoints only
  └── storage.ts      # Database operations only
```

**Why:** Each file has single responsibility, easier to test and maintain

### 2. Dependency Injection

**DO:**
```typescript
class GitHubSyncService {
  constructor(
    private client: GitHubClient,
    private storage: IStorage
  ) {}
  
  async importFromGitHub(repoUrl: string) {
    const markdown = await this.client.fetchFile(repoUrl, 'README.md');
    // ... use this.storage
  }
}

// Easy to test with mocks:
const mockClient = new MockGitHubClient();
const mockStorage = new MockStorage();
const service = new GitHubSyncService(mockClient, mockStorage);
```

**DON'T:**
```typescript
class GitHubSyncService {
  async importFromGitHub(repoUrl: string) {
    // Hardcoded dependencies:
    const client = new GitHubClient();  // Can't mock
    const storage = db;  // Can't test without real database
  }
}
```

**Why:** Testability, flexibility, loose coupling

### 3. Explicit Over Implicit

**DO:**
```typescript
async function importFromGitHub(
  repoUrl: string,
  options: {
    forceOverwrite?: boolean;
    enableAI?: boolean;
    dryRun?: boolean;
  } = {}
): Promise<ImportResult>
```

**DON'T:**
```typescript
async function importFromGitHub(...args: any[]): Promise<any>
```

**Why:** Type safety, self-documenting, IDE autocomplete

---

## Deployment Best Practices

### 1. Blue-Green Deployment

**For Zero-Downtime:**
```bash
# Deploy to blue environment (not serving traffic):
docker-compose -f docker-compose.blue.yml up -d

# Test blue:
curl https://blue.awesome-list.com/api/health

# Smoke tests pass? Switch load balancer:
# Point traffic to blue (now serving)

# Green is now idle:
# Keep for rollback if needed
# Or: Take down after 24 hours
```

**Why:** Zero downtime, instant rollback possible

### 2. Database Backup Before Deploy

**Always:**
```bash
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql

# Verify backup:
ls -lh backup-*.sql

# Store securely (S3, off-site, etc.)
```

**Why:** Safety net if something goes wrong

### 3. Gradual Rollout

**For Major Changes:**
```
1. Deploy to staging
2. Test thoroughly (24 hours)
3. Deploy to 10% of users (canary)
4. Monitor for 24 hours
5. If stable: Deploy to 100%
```

**Feature Flags:**
```typescript
const IMPORT_ENABLED = process.env.FEATURE_IMPORT === 'true';

// Enable gradually:
// Day 1: FEATURE_IMPORT=true (staging)
// Day 2: FEATURE_IMPORT=true (10% production)
// Day 3: FEATURE_IMPORT=true (100% production)
```

**Why:** Reduces blast radius, easier rollback, lower risk

---

## Monitoring Best Practices

### 1. Set Up Alerts

**Critical Alerts:**
```
- API response time >3s (P50)
- Error rate >5%
- Import failure rate >10%
- Database query time >1s
- Memory usage >80%
- Disk usage >80%
```

**Alerting Channels:**
- PagerDuty (critical, 24/7)
- Slack (warnings, business hours)
- Email (info, daily digest)

**Why:** Early detection, rapid response

### 2. Track Key Metrics

**Application Metrics:**
```javascript
// Track:
- Response times (P50, P95, P99)
- Error rates (by endpoint)
- Cache hit rates
- Import success rates
- Parse error rates
- Deviation frequency
- AI usage (if enabled)

// Log to: Datadog, CloudWatch, Prometheus, etc.
```

**Why:** Trend analysis, capacity planning, optimization targets

### 3. Regular Reviews

**Weekly:**
- Review error logs (categorize and address)
- Check performance trends (degradation?)
- Analyze import usage (which repos popular?)
- User feedback (any issues?)

**Monthly:**
- Dependency updates (npm audit, upgrade)
- Security review (scan for vulnerabilities)
- Performance benchmarks (compare to baseline)
- Documentation updates (keep current)

**Why:** Proactive issue detection, continuous improvement

---

## Version Control Best Practices

### 1. Atomic Commits

**DO:**
```bash
# One logical change per commit:
git commit -m "fix: Add sub-subcategory filtering support

Adds subSubcategory parameter throughout request pipeline.
Fixes Bug #001: Sub-subcategory pages showed wrong resources.

Files: storage.ts, routes.ts, redisCache.ts
Testing: 3-layer validation, all viewports
Evidence: docs/IMPORT_FEATURE_BUGS.md"

# Focused, complete, well-documented
```

**DON'T:**
```bash
git commit -m "misc changes"  # Too vague
git commit -m "WIP"  # Not production-ready
git commit -a -m "fix stuff"  # Multiple unrelated changes
```

**Why:** Clear history, easier rollback, better code review

### 2. Descriptive Messages

**Include:**
- What: Brief description
- Why: Reason for change
- How: Implementation approach (if complex)
- Impact: What this affects
- Testing: How verified
- Evidence: Where to find proof

**Example:**
```
feat: Add AI-assisted parsing for malformed resources

Integrates Claude Haiku 4.5 for edge case handling when standard
regex parsing fails.

Handles:
- Bold titles (**[Title](...)**)
- Missing URL protocols
- Complex URL patterns

Design: Opt-in (disabled by default, ~$0.0004 per resource)
Testing: 7 edge cases, 98%+ success rate
Evidence: /tmp/test-edge-cases.md

Files: server/ai/parsingAssistant.ts (NEW), server/github/parser.ts
```

**Why:** Future developers understand context, decisions, trade-offs

---

## Final Recommendations

**Before Import:**
- [ ] Validate repository exists and is accessible
- [ ] Review deviation detection results
- [ ] Estimate cost if enabling AI
- [ ] Backup database (if first large import)

**During Import:**
- [ ] Monitor logs for errors
- [ ] Watch progress (if using SSE)
- [ ] Be patient (large imports take time)

**After Import:**
- [ ] Verify resources appeared
- [ ] Test navigation to new categories
- [ ] Check for orphaned hierarchy
- [ ] Run awesome-lint on export (quality check)
- [ ] Clear cache if stale data visible

**In Production:**
- [ ] Set up monitoring and alerts
- [ ] Schedule regular maintenance
- [ ] Keep dependencies updated
- [ ] Review logs weekly
- [ ] Gather user feedback

---

**Guide Version**: 1.0
**Last Updated**: 2025-12-05
**Status**: Complete
**Covers**: v1.1.0 import feature best practices

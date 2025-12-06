# Developer Onboarding - Import Feature

**Target Audience**: New developers working on import feature
**Prerequisites**: Node.js, TypeScript, PostgreSQL, Docker basics
**Time to Complete**: 2-4 hours

---

## Getting Started (30 min)

### 1. Clone and Setup

```bash
# Clone repository:
git clone https://github.com/your-org/awesome-list-site.git
cd awesome-list-site

# Checkout import feature branch:
git checkout feature/session-5-complete-verification

# Or if merged to main:
git checkout main
git pull origin main

# Install dependencies:
npm install

# Copy environment template:
cp .env.example .env

# Edit .env with your credentials:
# - SUPABASE_URL
# - SUPABASE_ANON_KEY
# - DATABASE_URL
# - ANTHROPIC_API_KEY (optional)
```

### 2. Start Development Environment

```bash
# Option A: Docker (recommended for consistency):
docker-compose up -d

# Wait for startup:
sleep 15

# Verify:
curl http://localhost:3000/api/health

# Option B: Local development (faster iteration):
npm run dev  # Starts both client and server

# Frontend: http://localhost:5173
# Backend: http://localhost:3000
```

### 3. Verify Import Feature Works

```bash
# Test import endpoint (requires admin):
# 1. Create admin user in Supabase dashboard
# 2. Login via UI: http://localhost:3000/login
# 3. Navigate to: http://localhost:3000/admin/github
# 4. Enter repo: sindresorhus/awesome
# 5. Click "Import Resources"
# 6. Watch progress bar (if SSE working)
```

---

## Codebase Tour (1 hour)

### Import Feature Components

**Backend Files:**

1. **server/github/client.ts** (GitHub API client)
   - Purpose: Fetch files from GitHub
   - Key method: `fetchFile(repoUrl, path, branch)`
   - Uses: raw.githubusercontent.com (no auth for public)
   
2. **server/github/parser.ts** (Markdown parser)
   - Purpose: Parse awesome list markdown → structured data
   - Key methods:
     - `parse()` - Main entry point
     - `extractResources()` - Resource extraction
     - `extractHierarchy()` - Category tree
     - `detectFormatDeviations()` - Format analysis
   - Lines: ~450 (with AI and deviation detection)

3. **server/github/syncService.ts** (Import orchestration)
   - Purpose: Coordinate import workflow
   - Key method: `importFromGitHub(repoUrl, options)`
   - Flow: Fetch → Parse → Create hierarchy → Import resources
   - Lines: ~700

4. **server/ai/parsingAssistant.ts** (AI parsing)
   - Purpose: Handle edge cases with Claude
   - Key method: `parseAmbiguousResource(line, context)`
   - Opt-in: Disabled by default
   - Lines: ~140

5. **server/routes.ts** (API endpoints)
   - Import endpoints:
     - `POST /api/github/import` (background)
     - `POST /api/github/import-stream` (SSE)
   - Lines: ~150 for import endpoints

6. **server/storage.ts** (Database operations)
   - CRITICAL: `listResources()` method (Bug #001 fix)
   - Now supports: `subSubcategory` parameter
   - Lines: ~2000 total, ~50 for import-related

**Frontend Files:**

1. **client/src/components/admin/GitHubSyncPanel.tsx** (Import UI)
   - Purpose: Admin UI for imports/exports
   - Features: SSE consumer, progress bar, deviation display
   - Lines: ~350

---

### Data Flow

**Import Flow:**
```
User Action (Click "Import")
  ↓
Frontend: startStreamingImport()
  ↓
API: POST /api/github/import-stream
  ↓
GitHub: Fetch README.md
  ↓
Parser: extractHierarchy() + extractResources()
  ↓
Deviation Detection: detectFormatDeviations()
  ↓
Database: Create categories → subcategories → sub-subcategories
  ↓
Database: Create/update/skip resources (conflict resolution)
  ↓
SSE: Stream progress updates to frontend
  ↓
Frontend: Update progress bar, show stats
  ↓
Complete: Show toast notification
```

**Critical Bug Fix (Sub-subcategory Filtering):**
```
User: Click sub-subcategory "iOS/tvOS"
  ↓
Frontend: Navigate to /sub-subcategory/iostvos
  ↓
Frontend: GET /api/resources?subSubcategory=iOS%2FtvOS
  ↓
routes.ts:254: Extract subSubcategory from req.query ← ADDED in fix
  ↓
routes.ts:258: Add to cache key ← ADDED
  ↓
routes.ts:268: Pass to storage.listResources() ← ADDED
  ↓
storage.ts:325: Destructure subSubcategory ← ADDED
  ↓
storage.ts:345-347: Filter WHERE sub_subcategory = ? ← ADDED
  ↓
Database: Returns 30 iOS/tvOS resources (not 1000)
  ↓
Frontend: Displays correct resources ✅
```

---

## Development Workflow (30 min)

### Making Changes

**1. Create feature branch:**
```bash
git checkout -b feature/my-improvement

# Example: feature/batch-insert-optimization
```

**2. Make changes:**
```bash
# Edit files in your IDE
# For import feature, typically:
# - server/github/parser.ts (format handling)
# - server/github/syncService.ts (import logic)
# - server/routes.ts (API endpoints)
```

**3. Test locally:**
```bash
# Option A: Hot reload (if local dev):
# Changes auto-reload, test in browser

# Option B: Docker rebuild:
docker-compose down
docker-compose build web
docker-compose up -d

# Wait:
sleep 15

# Test:
curl http://localhost:3000/api/health
```

**4. Run tests:**
```bash
# API tests:
curl http://localhost:3000/api/resources?subSubcategory=iOS%2FtvOS

# Database tests:
psql $DATABASE_URL -c "SELECT COUNT(*) FROM resources WHERE sub_subcategory = 'iOS/tvOS';"

# UI tests:
# Navigate to http://localhost:3000/sub-subcategory/iostvos
# Verify: Shows correct resources
```

**5. Commit:**
```bash
git add server/github/parser.ts
git commit -m "feat: Add support for bold title format in parser

Handles resources with bold markdown:
* **[Title](url)** - Description

Parser now strips bold markers before extraction.
Tested with awesome-rust resources.

Impact: Improves parsing success rate by 2%
Commit: Follow-up to AI parsing feature"
```

---

## Common Development Tasks

### Task 1: Add New Format Support

**Scenario**: Parser fails to extract resources in new format

**Example**: Resources with `==>` separator instead of `-`
```markdown
* [Resource](url) ==> Description with new separator
```

**Steps:**

1. **Add regex pattern** in parser.ts:
```typescript
// parseResourceLine method:
// Add new pattern to try:
const newSeparatorRegex = /^\[([^\]]+)\]\(([^)]+)\)\s*==>\s*(.+)$/;
const newMatch = cleanLine.match(newSeparatorRegex);

if (newMatch) {
  return {
    title: newMatch[1].trim(),
    url: newMatch[2].trim(),
    description: newMatch[3].trim()
  };
}
```

2. **Test with sample:**
```typescript
// Create test:
const parser = new AwesomeListParser('* [Test](url) ==> New format description');
const resource = parser['parseResourceLine']('* [Test](url) ==> New format description');

console.log(resource);
// Expected: { title: 'Test', url: 'url', description: 'New format description' }
```

3. **Add to deviation detection:**
```typescript
// detectFormatDeviations method:
const newSeparatorCount = (this.content.match(/\s+==>\s+/g) || []).length;
if (newSeparatorCount > 0) {
  warnings.push(`${newSeparatorCount} resources use non-standard separator (==>)`);
}
```

4. **Document and commit:**
```
Update: docs/GITHUB_IMPORT_GUIDE.md
Add: "New separator (==>) supported"
```

### Task 2: Optimize Database Query

**Scenario**: Hierarchy creation is slow (2 seconds)

**Steps:**

1. **Profile current performance:**
```typescript
console.time('hierarchy-creation');
// ... existing hierarchy creation code
console.timeEnd('hierarchy-creation');

// Output: hierarchy-creation: 2047ms
```

2. **Identify bottleneck:**
```typescript
// Log each phase:
console.time('fetch-categories');
const categories = await storage.listCategories();
console.timeEnd('fetch-categories');  // ~50ms

console.time('create-subcategories');
for (const [name, parent] of subcategories) {
  console.time(`fetch-subcategories-${name}`);
  const existing = await storage.listSubcategories(parentId);  // N queries!
  console.timeEnd(`fetch-subcategories-${name}`);  // ~10ms each
}
console.timeEnd('create-subcategories');  // ~2000ms total

// Bottleneck: 188 subcategory list queries
```

3. **Implement optimization:**
```typescript
// Batch query:
const allSubcategories = await storage.listAllSubcategories();  // 1 query
const subcategoryMap = groupBy(allSubcategories, s => s.categoryId);

// Use map for lookups:
const existing = subcategoryMap.get(parentId) || [];  // O(1)

// New method needed:
async listAllSubcategories(): Promise<Subcategory[]> {
  return await db.select().from(subcategories);
}
```

4. **Benchmark improvement:**
```typescript
console.time('hierarchy-creation-optimized');
// ... optimized code
console.timeEnd('hierarchy-creation-optimized');

// Output: hierarchy-creation-optimized: 100ms
// Improvement: 20x faster
```

5. **Test for correctness:**
```
# Before optimization:
SELECT COUNT(*) FROM subcategories;  // e.g., 188

# Run optimized import

# After optimization:
SELECT COUNT(*) FROM subcategories;  // Should be same: 188

# Verify no duplicates:
SELECT name, COUNT(*) FROM subcategories GROUP BY name HAVING COUNT(*) > 1;
# Expected: 0 rows
```

### Task 3: Add New API Endpoint

**Scenario**: Add endpoint to cancel in-progress import

**Steps:**

1. **Define endpoint** in routes.ts:
```typescript
// POST /api/github/import/:queueId/cancel
app.post('/api/github/import/:queueId/cancel', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { queueId } = req.params;
    
    // Update queue status:
    await storage.updateGithubSyncStatus(queueId, 'cancelled');
    
    // TODO: Actually stop the import (complex - needs worker cancellation)
    
    res.json({ message: 'Import cancelled', queueId });
  } catch (error) {
    console.error('Error cancelling import:', error);
    res.status(500).json({ message: 'Failed to cancel import' });
  }
});
```

2. **Test endpoint:**
```bash
# Start import:
QUEUE_ID=$(curl -X POST http://localhost:3000/api/github/import \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"repositoryUrl":"https://github.com/large/repo"}' \
  | jq -r '.queueId')

# Cancel it:
curl -X POST http://localhost:3000/api/github/import/$QUEUE_ID/cancel \
  -H "Authorization: Bearer $TOKEN"

# Expected: {"message":"Import cancelled","queueId":"..."}
```

3. **Add frontend button:**
```tsx
{isImporting && (
  <Button onClick={() => cancelImport(queueId)}>
    Cancel Import
  </Button>
)}
```

4. **Document:**
- Add to docs/API_REFERENCE_IMPORT.md
- Add to docs/GITHUB_IMPORT_GUIDE.md
- Update changelog

---

## Debugging Techniques (30 min)

### Debugging Parser Issues

**Symptom:** Resources not extracted correctly

**Debug Steps:**

1. **Add logging:**
```typescript
// In parseResourceLine:
private parseResourceLine(line: string) {
  console.log('Parsing line:', line);  // See what's being parsed
  
  const match = line.match(resourceRegex);
  console.log('Match result:', match);  // See regex matches
  
  if (match) {
    console.log('Extracted:', { title: match[1], url: match[2] });
  } else {
    console.log('No match for line');  // Identify failing lines
  }
  
  return match ? { ... } : null;
}
```

2. **Test with sample:**
```typescript
// Create minimal test:
const markdown = `
## Category
* [Title](url) - Description
* [Broken format without proper markdown
`;

const parser = new AwesomeListParser(markdown);
const resources = parser.extractResources();

console.log('Resources found:', resources.length);
// Expected: 1 (second line should be skipped)

console.log('Resources:', resources);
// Verify: Correct title, URL, description
```

3. **Check deviation detection:**
```typescript
const deviations = parser.detectFormatDeviations();
console.log('Deviations:', deviations.deviations);
console.log('Warnings:', deviations.warnings);
console.log('Can proceed?', deviations.canProceed);
```

### Debugging Database Issues

**Symptom:** Resources not saving or queries slow

**Debug Steps:**

1. **Enable query logging:**
```sql
-- In PostgreSQL config:
ALTER SYSTEM SET log_statement = 'all';
SELECT pg_reload_conf();

-- Now all queries are logged:
tail -f /var/log/postgresql/postgresql.log

-- See exact SQL executed
```

2. **Analyze query plan:**
```sql
EXPLAIN ANALYZE
SELECT * FROM resources
WHERE sub_subcategory = 'iOS/tvOS'
AND status = 'approved';

-- Look for:
-- - "Index Scan" (good) vs "Seq Scan" (bad)
-- - Execution time
-- - Rows scanned

-- If Seq Scan: Add index
```

3. **Check for locks:**
```sql
SELECT pid, state, wait_event, query
FROM pg_stat_activity
WHERE state = 'active' AND wait_event IS NOT NULL;

-- If queries waiting: Investigate lock source
```

### Debugging SSE Issues

**Symptom:** Progress bar not updating

**Debug Steps:**

1. **Browser DevTools:**
```
Network tab → Find request to /api/github/import-stream
Type should show: "eventsource"
Status: Should be "200" and "pending" (streaming)

Click request → Preview tab
Should see events streaming in real-time:
data: {"status":"fetching","progress":10,...}
data: {"status":"parsing","progress":30,...}
```

2. **Check SSE headers:**
```typescript
// In routes.ts, verify:
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');

// Must be set before first write
```

3. **Log events:**
```typescript
// In frontend SSE consumer:
for (const line of lines) {
  if (line.startsWith('data: ')) {
    const data = JSON.parse(line.slice(6));
    console.log('SSE event:', data);  // Log all events
    
    setImportProgress(data.progress);
    // ... rest of handling
  }
}
```

4. **Test event sending:**
```typescript
// In backend:
const sendProgress = (data: any) => {
  const event = `data: ${JSON.stringify(data)}\n\n`;
  console.log('Sending SSE:', event);  // Verify events sent
  res.write(event);
};
```

---

## Testing Your Changes (30 min)

### Unit Testing (Future - Add These)

```typescript
// test/parser.test.ts
import { AwesomeListParser } from '../server/github/parser';

describe('AwesomeListParser', () => {
  test('should parse standard resource', () => {
    const markdown = '* [Title](https://example.com) - Description';
    const parser = new AwesomeListParser(markdown);
    const resources = parser.extractResources();
    
    expect(resources).toHaveLength(1);
    expect(resources[0]).toMatchObject({
      title: 'Title',
      url: 'https://example.com',
      description: 'Description'
    });
  });
  
  test('should handle missing description', () => {
    const markdown = '* [Title](https://example.com)';
    const parser = new AwesomeListParser(markdown);
    const resources = parser.extractResources();
    
    expect(resources[0].description).toBe('');
  });
  
  test('should detect deviations correctly', () => {
    const markdown = '## Category\n* [R1](url) - Desc\n- [R2](url) - Desc';  // Mixed markers
    const parser = new AwesomeListParser(markdown);
    const result = parser.detectFormatDeviations();
    
    expect(result.deviations.length).toBeGreaterThan(0);
    expect(result.deviations[0]).toMatch(/mixed.*markers/i);
  });
});
```

### Manual Testing Checklist

**Before committing:**
- [ ] Docker builds without errors
- [ ] TypeScript compiles (`npm run build`)
- [ ] Import works with test repository
- [ ] Navigation works (all 3 levels)
- [ ] Search works
- [ ] No errors in Docker logs
- [ ] No console errors in browser

**3-Layer Validation:**
- [ ] API: Test with curl, verify response
- [ ] Database: Query directly, verify data
- [ ] UI: Navigate in browser, verify display

**3-Viewport Validation** (if UI changes):
- [ ] Desktop (1920×1080): Layout correct
- [ ] Tablet (768×1024): Responsive
- [ ] Mobile (375×667): Readable, scrollable

---

## Code Style Guide (15 min)

### TypeScript Best Practices

**Use strict types:**
```typescript
// ✅ Good:
interface ImportOptions {
  forceOverwrite?: boolean;
  enableAI?: boolean;
}

async function importRepo(url: string, options: ImportOptions): Promise<ImportResult> {
  // ...
}

// ❌ Avoid:
async function importRepo(url: any, options: any): Promise<any> {
  // Too permissive
}
```

**Error handling:**
```typescript
// ✅ Good:
try {
  const result = await dangerousOperation();
  return result;
} catch (error) {
  if (error instanceof SpecificError) {
    // Handle specific error
  }
  console.error('Operation failed:', error);
  throw new Error('User-friendly message');
}

// ❌ Avoid:
try {
  await dangerousOperation();
} catch (e) {
  // Silent failure
}
```

**Async/await:**
```typescript
// ✅ Good:
const resources = await storage.listResources({ limit: 100 });

// ❌ Avoid:
storage.listResources({ limit: 100 }).then(resources => {
  // Callback hell
});
```

### Documentation Standards

**Function comments:**
```typescript
/**
 * Parse a resource line from awesome list markdown
 * @param line - Markdown line (e.g., "* [Title](url) - Description")
 * @returns Parsed resource object or null if not a valid resource
 * @example
 * parseResourceLine("* [FFmpeg](https://ffmpeg.org) - Video processing")
 * // Returns: { title: "FFmpeg", url: "https://ffmpeg.org", description: "Video processing" }
 */
private parseResourceLine(line: string): ParsedResource | null {
  // Implementation
}
```

**Complex logic:**
```typescript
// Explain WHY, not WHAT:

// ✅ Good:
// Check conflict by URL (not title) because titles can vary across repos
// while URLs should be globally unique
const existing = existingMap.get(resource.url);

// ❌ Bad:
// Get existing resource
const existing = existingMap.get(resource.url);
```

---

## Resources for Learning

### Key Documentation

**Start Here:**
1. docs/GITHUB_IMPORT_GUIDE.md - User-facing guide (understand user perspective)
2. docs/TECHNICAL_ARCHITECTURE_IMPORT.md - System design (understand architecture)
3. docs/IMPORT_FEATURE_BUGS.md - Bug #001 investigation (learn debugging process)

**Deep Dives:**
1. docs/API_REFERENCE_IMPORT.md - API contracts
2. docs/TESTING_METHODOLOGY_IMPORT.md - How we test
3. docs/OPTIMIZATION_GUIDE_IMPORT.md - Performance techniques

### External Resources

**awesome-list specification:**
- https://github.com/sindresorhus/awesome
- Read: "Guidelines" section
- Understand: What makes a valid awesome list

**Claude API (for AI parsing):**
- https://docs.anthropic.com/claude/reference
- Focus on: Messages API, streaming, token limits

**Drizzle ORM:**
- https://orm.drizzle.team/docs/overview
- Learn: Queries, migrations, type safety

**Server-Sent Events (SSE):**
- MDN: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
- Spec: https://html.spec.whatwg.org/multipage/server-sent-events.html

---

## Getting Help

**Internal:**
1. Ask: Team lead or senior developer
2. Review: docs/ directory (comprehensive)
3. Check: Git history (`git log`, `git blame`)
4. Search: Codebase for similar patterns

**External:**
1. TypeScript: https://www.typescriptlang.org/docs/
2. React: https://react.dev/
3. PostgreSQL: https://www.postgresql.org/docs/
4. Stack Overflow: Search before asking

**Best Practices:**
- Search documentation first
- Try to solve for 30 minutes
- Then ask with context (what you tried, error messages, etc.)
- Share code snippets, not screenshots

---

## Your First Contribution (15 min)

**Good First Issues:**

1. **Add case-insensitive README fallback**
   - File: server/github/client.ts
   - Change: Try readme.md if README.md not found
   - Effort: 30 min
   - Impact: Better compatibility

2. **Add import rate limiting**
   - File: server/routes.ts
   - Add: Rate limit middleware to import endpoint
   - Effort: 1 hour
   - Impact: Prevents abuse

3. **Add resource length limits**
   - File: server/github/parser.ts
   - Add: Truncate titles/descriptions if too long
   - Effort: 30 min
   - Impact: Prevents database bloat

4. **Improve error messages**
   - Files: server/routes.ts, server/github/syncService.ts
   - Change: Make error messages more helpful
   - Effort: 1 hour
   - Impact: Better UX

**Steps:**
1. Pick an issue
2. Create branch: `feature/issue-name`
3. Make changes
4. Test (3-layer validation)
5. Document in commit message
6. Submit PR with evidence

---

## Onboarding Checklist

- [ ] Repository cloned and setup complete
- [ ] Development environment running (Docker or local)
- [ ] Admin user created in Supabase
- [ ] Import feature tested (import sindresorhus/awesome)
- [ ] Code tour completed (understand all components)
- [ ] Read: Bug #001 investigation (learn debugging)
- [ ] Read: TECHNICAL_ARCHITECTURE_IMPORT.md
- [ ] Made first small change and tested it
- [ ] Understand 3-layer validation framework
- [ ] Know where to find documentation
- [ ] Ready to contribute! 🚀

---

**Onboarding Guide Version**: 1.0
**Last Updated**: 2025-12-05
**For**: v1.1.0 import feature
**Status**: Complete

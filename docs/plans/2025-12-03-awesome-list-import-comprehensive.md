# Awesome List Import Feature - Comprehensive Implementation Plan

> **For Claude:** REQUIRED SKILLS:
> - systematic-debugging (for ALL bugs found during testing)
> - frontend-driven-testing (for end-user MCP testing)
> - session-context-priming (load before starting if new session)

**Goal:** Implement production-ready import system for ANY awesome list repository with intelligent format handling, AI-assisted parsing, and comprehensive E2E validation

**Test Repositories:**
1. `krzemienski/awesome-video` (2,010 resources, current database source)
2. `rust-unofficial/awesome-rust` (Different structure, format deviations expected)

**Success Criteria:**
- Both repositories import successfully
- Format deviations detected and handled gracefully
- AI assists with edge case parsing
- All admin operations work on imported data
- 25+ edit permutations tested via MCP as end user
- Zero data corruption, zero orphaned resources

**Estimated Duration:** 16-20 hours
**Tasks:** 180+ bite-sized (2-5 min each)

---

## Phase 0: Prerequisites & Current State Analysis (2 hours)

### Task 0.1: Activate All Required MCPs (10 min)

**Step 1: Activate Serena MCP**
```typescript
mcp__serena__activate_project({ project: "awesome-list-site" })
```

**Step 2: Verify Supabase connection**
```typescript
mcp__supabase__execute_sql({ query: "SELECT COUNT(*) FROM resources" })
```
Expected: 2,058 resources

**Step 3: Verify Chrome DevTools MCP**
```typescript
mcp__chrome-devtools__list_pages({})
```

**Step 4: Verify Docker running**
```bash
docker-compose ps
```
Expected: web, redis, nginx all "Up"

---

### Task 0.2: Read Current Import Implementation (30 min)

**Step 1: Read parser implementation**
```typescript
mcp__serena__read_file({
  relative_path: "server/github/parser.ts",
  max_answer_chars: 50000
})
```

**Step 2: Identify current capabilities**
- extractHierarchy() method (added Session 5)
- parseResource() method (handles markdown links)
- Category tracking logic

**Step 3: Read sync service**
```typescript
mcp__serena__read_file({
  relative_path: "server/github/syncService.ts",
  max_answer_chars: 50000
})
```

**Step 4: Identify current workflow**
- importFromGitHub() entry point
- Hierarchy table population (from Session 5 fix)
- Resource creation with TEXT category fields

**Step 5: Document current state**
Create `/tmp/import-analysis.md`:
- What works: Hierarchy extraction, resource parsing
- What's untested: Real GitHub import, error handling, format deviations
- What's missing: Format deviation detection, AI parsing, comprehensive validation

---

### Task 0.3: Create Test Database Snapshot (15 min)

**Step 1: Backup current database state**
```bash
npx tsx scripts/backup-current-state.ts
```

Create script if needed:
```typescript
// scripts/backup-current-state.ts
import { db } from '../server/storage';

async function backup() {
  const counts = await db.execute(`
    SELECT
      (SELECT COUNT(*) FROM resources) as resources_count,
      (SELECT COUNT(*) FROM categories) as categories_count,
      (SELECT COUNT(*) FROM subcategories) as subcategories_count,
      (SELECT COUNT(*) FROM user_favorites) as favorites_count
  `);

  console.log('Current state:', counts.rows[0]);

  // Save to file
  await fs.writeFile('/tmp/db-backup-state.json', JSON.stringify(counts.rows[0], null, 2));
}

backup();
```

**Step 2: Run backup**
```bash
npx tsx scripts/backup-current-state.ts
cat /tmp/db-backup-state.json
```

Expected: Current counts saved for rollback if needed

---

### Task 0.4: Analyze awesome-video Current State (20 min)

**Step 1: Fetch awesome-video README**
```bash
curl -sL https://raw.githubusercontent.com/krzemienski/awesome-video/master/README.md > /tmp/awesome-video-current.md
```

**Step 2: Analyze structure**
```bash
# Count categories (## headers)
grep "^## " /tmp/awesome-video-current.md | grep -v "Contents\|Contributing\|License" | wc -l

# Count subcategories (### headers)
grep "^### " /tmp/awesome-video-current.md | wc -l

# Count resources (- [ links)
grep "^- \[" /tmp/awesome-video-current.md | wc -l
```

**Step 3: Compare to database**
```sql
SELECT COUNT(*) FROM resources; -- Compare to file resource count
SELECT COUNT(DISTINCT category) FROM resources; -- Compare to ## count
SELECT COUNT(DISTINCT subcategory) FROM resources WHERE subcategory IS NOT NULL; -- Compare to ### count
```

**Step 4: Document deviations**
Note any differences (new categories, removed resources, renamed items)

---

### Task 0.5: Analyze awesome-rust Structure (30 min)

**Step 1: Fetch awesome-rust README**
```bash
curl -sL https://raw.githubusercontent.com/rust-unofficial/awesome-rust/master/README.md > /tmp/awesome-rust-raw.md
```

**Step 2: Analyze format**
```bash
# Structure analysis
head -100 /tmp/awesome-rust-raw.md

# Count structure
grep "^## " /tmp/awesome-rust-raw.md | wc -l
grep "^### " /tmp/awesome-rust-raw.md | wc -l
grep "^- \[" /tmp/awesome-rust-raw.md | wc -l
```

**Step 3: Identify format deviations**
Compare to awesome-video structure:
- Different category names?
- Different resource format?
- Nested depth differences?
- Special sections (Contributing, Table of Contents structure)?
- Badges or special markdown?

**Step 4: Document deviations**
Create `/tmp/awesome-rust-deviations.md`:
```markdown
# Awesome Rust Format Deviations

## Structure Differences
- Categories: X (vs awesome-video: 21)
- Nesting depth: 2 levels vs 3 levels
- Resource format: Same or different?

## Content Differences
- Has table of contents: Yes/No
- Has contributing section: Yes/No
- Badge format: Standard or custom?

## Parsing Challenges
1. [Specific challenge 1]
2. [Specific challenge 2]
...
```

---

### Task 0.6: Create Isolated Test Database (15 min)

**Step 1: Create test database schema**
```bash
# Option A: Use Supabase branch (if available)
# Option B: Create test_ prefixed tables in same database
# Option C: Use Docker with separate Postgres container
```

**Step 2: Seed minimal data**
```sql
-- Create admin user for testing
INSERT INTO auth.users (email, encrypted_password, raw_user_meta_data)
VALUES ('admin-import-test@test.com', '[hash]', '{"role": "admin"}');
```

**Step 3: Verify isolation**
```sql
SELECT COUNT(*) FROM resources; -- Should be 0 in test DB
```

---

## Phase 1: awesome-video Import Validation (3 hours)

### Task 1.1: Test Current Import with awesome-video (45 min)

**Step 1: Start Docker**
```bash
docker-compose up -d
sleep 15
curl http://localhost:3000/api/health
```

**Step 2: Login as admin via Chrome DevTools**
```typescript
mcp__chrome-devtools__navigate_page({
  type: 'url',
  url: 'http://localhost:3000/login'
})

mcp__chrome-devtools__take_snapshot({})

// Find and fill email input
mcp__chrome-devtools__fill({
  uid: '[EMAIL_INPUT_UID]',
  value: 'admin@test.com'
})

mcp__chrome-devtools__fill({
  uid: '[PASSWORD_INPUT_UID]',
  value: 'TestAdmin123!'
})

mcp__chrome-devtools__click({ uid: '[SUBMIT_BUTTON_UID]' })
```

**Step 3: Navigate to GitHub import panel**
```typescript
mcp__chrome-devtools__navigate_page({
  type: 'url',
  url: 'http://localhost:3000/admin/github'
})

mcp__chrome-devtools__take_snapshot({})
```

**Step 4: Initiate import (dry-run first)**
```typescript
// Find repository URL input
mcp__chrome-devtools__fill({
  uid: '[REPO_URL_INPUT_UID]',
  value: 'https://github.com/krzemienski/awesome-video'
})

// Check "Dry Run" checkbox if exists
mcp__chrome-devtools__click({ uid: '[DRY_RUN_CHECKBOX_UID]' })

// Click Import button
mcp__chrome-devtools__click({ uid: '[IMPORT_BUTTON_UID]' })
```

**Step 5: Verify dry-run results**
```typescript
mcp__chrome-devtools__take_snapshot({})
```

Expected in snapshot:
- Preview of categories to be created
- Preview of resources to be imported
- NO actual database changes

**Step 6: Check database unchanged**
```sql
SELECT COUNT(*) FROM resources;
```
Expected: 2,058 (no change from dry-run)

**Step 7: Run actual import**
```typescript
// Uncheck dry-run
mcp__chrome-devtools__click({ uid: '[DRY_RUN_CHECKBOX_UID]' })

// Click Import
mcp__chrome-devtools__click({ uid: '[IMPORT_BUTTON_UID]' })
```

**Step 8: Monitor progress**
```typescript
// Wait for completion (may take 30-60 seconds)
mcp__chrome-devtools__wait_for({ text: 'Import complete', timeout: 120000 })
```

**Step 9: Verify database updated**
```sql
-- Check resources imported
SELECT COUNT(*) FROM resources WHERE github_synced = true;

-- Check categories created
SELECT COUNT(*) FROM categories;

-- Check sync history
SELECT * FROM github_sync_history ORDER BY created_at DESC LIMIT 1;
```

**Step 10: Screenshot evidence**
```typescript
mcp__chrome-devtools__take_screenshot({
  filePath: '/tmp/import-awesome-video-complete.png',
  fullPage: true
})
```

**IF IMPORT FAILS:**
- Invoke: `Skill({ skill: "systematic-debugging" })`
- Check Docker logs: `docker-compose logs web | tail -100`
- Check errors in Chrome console
- Check database for partial imports
- Fix root cause, rebuild, retry

---

### Task 1.2: Validate Hierarchy Created Correctly (30 min)

**Step 1: Verify categories table**
```sql
SELECT id, name, slug, created_at
FROM categories
ORDER BY name;
```

Expected: 21 categories (per awesome-video structure)
- Adaptive Streaming & Manifest Tools
- Build Tools Deployment & Utility Libraries
- Community & Events
- DRM Security & Content Protection
- Encoding & Codecs
- ... (16 more)

**Step 2: Verify subcategories table**
```sql
SELECT s.name as subcategory, c.name as parent_category
FROM subcategories s
JOIN categories c ON c.id = s.category_id
ORDER BY c.name, s.name;
```

Expected: ~102 subcategories with correct parent relationships

**Step 3: Verify sub-subcategories table**
```sql
SELECT ss.name as sub_subcategory, s.name as parent_subcategory, c.name as category
FROM sub_subcategories ss
JOIN subcategories s ON s.id = ss.subcategory_id
JOIN categories c ON c.id = s.category_id
ORDER BY c.name, s.name, ss.name
LIMIT 20;
```

Expected: ~90 sub-subcategories with correct parent chain

**Step 4: Verify resources reference valid hierarchy**
```sql
-- Check for orphaned resources (no matching category)
SELECT DISTINCT r.category
FROM resources r
LEFT JOIN categories c ON c.name = r.category
WHERE c.id IS NULL;
```

Expected: 0 rows (all resources have valid category references)

**Step 5: Document validation results**
```bash
cat > /tmp/import-validation-awesome-video.md << EOF
# awesome-video Import Validation

## Hierarchy Created
- Categories: [X] (expected: 21)
- Subcategories: [Y] (expected: ~102)
- Sub-subcategories: [Z] (expected: ~90)

## Resources Imported
- Total: [N] (expected: ~2,010 from GitHub)
- Orphaned: 0 ✅

## Issues Found
[List any discrepancies]

## Status
[PASS / FAIL]
EOF
```

---

### Task 1.3: Test Frontend Navigation After Import (30 min)

**Step 1: Navigate to homepage**
```typescript
mcp__chrome-devtools__navigate_page({
  type: 'url',
  url: 'http://localhost:3000'
})

mcp__chrome-devtools__take_snapshot({})
```

**Step 2: Verify all 21 categories visible**
Check snapshot for all category names from Task 1.2

**Step 3: Test category navigation**
```typescript
// Click first category
mcp__chrome-devtools__click({ uid: '[CATEGORY_LINK_UID]' })

mcp__chrome-devtools__take_snapshot({})
```

**Step 4: Verify resources load**
Check snapshot for resource cards, count should match database

**Step 5: Test subcategory navigation**
Find subcategory link, click, verify filtered resources

**Step 6: Test sub-subcategory navigation**
Find sub-sub link, click, verify most specific filtering

**Step 7: Screenshot each level**
```typescript
mcp__chrome-devtools__take_screenshot({
  filePath: '/tmp/nav-category.png'
})
mcp__chrome-devtools__take_screenshot({
  filePath: '/tmp/nav-subcategory.png'
})
mcp__chrome-devtools__take_screenshot({
  filePath: '/tmp/nav-sub-subcategory.png'
})
```

**Step 8: 3-Layer Validation**
- Layer 1 (API): Network tab shows GET /api/resources?category=... → 200
- Layer 2 (Database): SQL confirms resource count matches
- Layer 3 (UI): Screenshots show resources at all 3 viewports

**IF NAVIGATION BROKEN:**
- Systematic-debugging: Check if hierarchy was created correctly
- Check: ModernSidebar.tsx rendering logic
- Check: Category.tsx filtering logic
- Fix, rebuild Docker, retest

---

### Task 1.4: Test Export After Import (Round-Trip Validation) (45 min)

**Step 1: Navigate to export panel**
```typescript
mcp__chrome-devtools__navigate_page({
  url: 'http://localhost:3000/admin/github'
})
```

**Step 2: Click Export**
```typescript
mcp__chrome-devtools__click({ uid: '[EXPORT_BUTTON_UID]' })
```

**Step 3: Download generated markdown**
Via API or UI, save to `/tmp/export-after-import.md`

**Step 4: Run awesome-lint**
```bash
npx awesome-lint /tmp/export-after-import.md 2>&1 | tee /tmp/lint-after-import.txt
```

**Step 5: Count errors**
```bash
grep "✖" /tmp/lint-after-import.txt | tail -1
```

Expected: ≤5 errors (same quality as WAVE 2 achieved)

**Step 6: Compare structure to original**
```bash
# Compare category count
grep "^## " /tmp/awesome-video-current.md | wc -l
grep "^## " /tmp/export-after-import.md | grep -v "Contents\|Contributing" | wc -l

# Should match (round-trip preserves structure)
```

**Step 7: Verify no data loss**
```bash
# Count resources in both
grep "^- \[" /tmp/awesome-video-current.md | wc -l
grep "^- \[" /tmp/export-after-import.md | wc -l

# Counts should be close (±10 acceptable for test data)
```

**IF ROUND-TRIP FAILS:**
- Check: formatter.ts grouping logic
- Check: Missing resources in export
- Systematic-debugging if structure malformed

---

### Task 1.5: Commit Baseline awesome-video Import (30 min)

**Only if all validations pass:**

```bash
git add docs/plans/2025-12-03-awesome-list-import-comprehensive.md
git add /tmp/import-validation-awesome-video.md

git commit -m "test: Validate awesome-video import baseline

- Imported from https://github.com/krzemienski/awesome-video
- Hierarchy created: 21 categories, ~102 subcategories, ~90 sub-subcategories
- Resources imported: [N] total
- Navigation tested: All 3 levels functional
- Round-trip export: awesome-lint [X] errors (acceptable)
- 3-layer validation: ✅ PASS

Verification:
- Layer 1 (API): Import endpoint responded, sync history created
- Layer 2 (Database): All hierarchy tables populated, 0 orphaned resources
- Layer 3 (UI): Navigation works, resources visible at all levels

Evidence: /tmp/import-validation-awesome-video.md, screenshots

Next: Test awesome-rust import (format deviations expected)"
```

---

## Phase 2: awesome-rust Import with Format Handling (5 hours)

### Task 2.1: Attempt Import of awesome-rust (30 min)

**Step 1: Via UI (Chrome DevTools)**
```typescript
mcp__chrome-devtools__navigate_page({
  url: 'http://localhost:3000/admin/github'
})

// Clear previous repo
mcp__chrome-devtools__fill({
  uid: '[REPO_URL_INPUT_UID]',
  value: 'https://github.com/rust-unofficial/awesome-rust'
})

// Dry-run first
mcp__chrome-devtools__click({ uid: '[DRY_RUN_CHECKBOX_UID]' })
mcp__chrome-devtools__click({ uid: '[IMPORT_BUTTON_UID]' })
```

**Step 2: Analyze dry-run results**
```typescript
mcp__chrome-devtools__take_snapshot({})
```

Expected: Preview shows what WOULD be imported

**Step 3: Check for errors/warnings**
Look for:
- "Format deviation detected: [description]"
- "Unable to parse [X] resources"
- "Invalid category structure"
- Any error messages

**Step 4: Document deviations found**
```bash
cat > /tmp/awesome-rust-import-attempt-1.md << EOF
# awesome-rust Import Attempt #1

## Dry-Run Results
- Categories detected: [X]
- Resources detected: [Y]
- Format deviations: [List]
- Errors: [List]

## Deviations from awesome-video
1. [Deviation 1]
2. [Deviation 2]
...

## Action Needed
[What parser changes required]
EOF
```

**IF DRY-RUN FAILS COMPLETELY:**
- Capture error message
- Check parser.ts logic
- Identify what broke
- Proceed to Task 2.2 (fix parser)

**IF DRY-RUN SUCCEEDS:**
- Note any warnings
- Proceed to actual import
- Document results

---

### Task 2.2: Enhance Parser for Format Deviations (120 min)

**This task is CONDITIONAL - execute only if Task 2.1 found parser failures**

**Step 1: Analyze failure patterns**
From `/tmp/awesome-rust-import-attempt-1.md`, identify:
- Which lines failed to parse?
- What pattern does awesome-rust use that awesome-video doesn't?
- Are there resources without descriptions? (awesome-video always has descriptions)
- Are there different heading depths?
- Special markdown that broke parser?

**Step 2: Read current parser logic**
```typescript
mcp__serena__find_symbol({
  name_path: "AwesomeListParser/parseResource",
  relative_path: "server/github/parser.ts",
  include_body: true
})
```

**Step 3: Identify specific fix needed**

**Example Deviation Fixes:**

**Deviation A: Resources without descriptions**
```typescript
// Current parser might expect: - [Name](URL) - Description.
// awesome-rust might have: - [Name](URL)

// Fix: Make description optional
const resourceMatch = line.match(/^-\s*\[([^\]]+)\]\(([^)]+)\)(?:\s*-\s*(.*))?$/);
const title = resourceMatch[1];
const url = resourceMatch[2];
const description = resourceMatch[3] || ''; // Make optional
```

**Deviation B: Different heading hierarchy**
```typescript
// awesome-rust might use ## Applications, ### Category
// vs awesome-video's ## Category, ### Subcategory

// Fix: Detect heading pattern from first few headers
// Adapt category/subcategory/sub-subcategory assignment based on detected pattern
```

**Deviation C: Resource format variations**
```typescript
// Handle: - [Name](URL) - Description
// Handle: - [Name](URL)
// Handle: * [Name](URL) - Description (asterisk instead of dash)
// Handle: - **[Name](URL)** - Description (bold titles)
```

**Step 4: Implement fixes in parser.ts**
```typescript
mcp__serena__replace_symbol_body({
  name_path: "AwesomeListParser/parseResource",
  relative_path: "server/github/parser.ts",
  body: `[Enhanced parsing logic with format handling]`
})
```

**Step 5: Add format deviation detection**
```typescript
// Add new method to AwesomeListParser
mcp__serena__insert_after_symbol({
  name_path: "AwesomeListParser/extractHierarchy",
  relative_path: "server/github/parser.ts",
  body: `
  /**
   * Detect format deviations from standard awesome list spec
   * Returns warnings and suggestions for user
   */
  detectFormatDeviations(): {
    deviations: string[];
    warnings: string[];
    canProceed: boolean;
  } {
    const deviations: string[] = [];
    const warnings: string[] = [];

    // Check: Badge format
    const hasBadge = this.content.includes('[![Awesome](https://awesome.re/badge.svg)]');
    if (!hasBadge) {
      warnings.push('Missing standard awesome badge (non-critical)');
    }

    // Check: Resource format consistency
    const dashResources = (this.content.match(/^- \[/gm) || []).length;
    const asteriskResources = (this.content.match(/^\* \[/gm) || []).length;
    if (asteriskResources > dashResources * 0.1) {
      deviations.push('Uses asterisks (*) instead of dashes (-) for list items');
    }

    // Check: Description presence
    const resourcesWithoutDesc = (this.content.match(/^- \[[^\]]+\]\([^)]+\)$/gm) || []).length;
    const totalResources = dashResources + asteriskResources;
    if (resourcesWithoutDesc > totalResources * 0.2) {
      warnings.push(\`\${resourcesWithoutDesc} resources lack descriptions (will use empty string)\`);
    }

    // Check: Heading depth (2-level vs 3-level hierarchy)
    const level2Headers = (this.content.match(/^## /gm) || []).length;
    const level3Headers = (this.content.match(/^### /gm) || []).length;
    const level4Headers = (this.content.match(/^#### /gm) || []).length;

    if (level4Headers === 0 && level3Headers > 0) {
      deviations.push('Uses 2-level hierarchy (## Category, ### Item) instead of 3-level');
    }

    const canProceed = deviations.length < 3; // Too many deviations = manual review needed

    return { deviations, warnings, canProceed };
  }
`
})
```

**Step 6: Rebuild Docker**
```bash
docker-compose down
docker-compose build --no-cache web
docker-compose up -d
sleep 30
```

**Step 7: Retry awesome-rust import**
Repeat Task 2.1 with enhanced parser

**Step 8: Document fixes**
```bash
cat > /tmp/parser-enhancements.md << EOF
# Parser Enhancements for Format Variations

## Fixes Applied
1. [Fix 1: Made descriptions optional]
2. [Fix 2: Handle asterisk list markers]
3. [Fix 3: Detect heading depth pattern]

## Code Changes
- File: server/github/parser.ts
- Lines: [specific lines]
- Methods: parseResource, detectFormatDeviations

## Testing
- awesome-video: Still works ✅
- awesome-rust: Now works ✅

## Format Deviations Handled
[List specific deviations now supported]
EOF
```

---

### Task 2.3: Implement AI-Assisted Edge Case Parsing (90 min)

**Purpose:** Use Claude to help parse malformed or ambiguous resources

**Step 1: Create AI parsing service**

**File:** `server/ai/parsingAssistant.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';

export async function parseAmbiguousResource(
  line: string,
  context: { previousCategory?: string; previousSubcategory?: string }
): Promise<{
  title: string;
  url: string;
  description: string;
  category?: string;
  subcategory?: string;
} | null> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const prompt = `Parse this markdown line from an awesome list into structured data.

Line: ${line}

Context:
- Previous category: ${context.previousCategory || 'Unknown'}
- Previous subcategory: ${context.previousSubcategory || 'Unknown'}

Extract:
1. Title (the link text)
2. URL (the link target)
3. Description (text after the link, if any)
4. Inferred category/subcategory if this appears to be a header

Respond with JSON only:
{
  "title": "...",
  "url": "...",
  "description": "...",
  "category": "..." (if header),
  "subcategory": "..." (if header)
}

If the line is not a valid resource or header, respond with: {"skip": true}`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4.5',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return JSON.parse(text);
  } catch (error) {
    console.error('AI parsing failed:', error);
    return null;
  }
}
```

**Step 2: Integrate into parser**

Update `server/github/parser.ts`:

```typescript
mcp__serena__find_symbol({
  name_path: "AwesomeListParser/parse",
  relative_path: "server/github/parser.ts",
  include_body: true
})
```

Add AI fallback:
```typescript
// In parse() method, after standard regex fails:

if (!resourceMatch && line.trim().startsWith('-') || line.trim().startsWith('*')) {
  // Try AI-assisted parsing
  const aiResult = await parseAmbiguousResource(line, {
    previousCategory: currentCategory,
    previousSubcategory: currentSubcategory,
  });

  if (aiResult && !aiResult.skip) {
    resources.push({
      title: aiResult.title,
      url: aiResult.url,
      description: aiResult.description || '',
      category: aiResult.category || currentCategory,
      subcategory: aiResult.subcategory || currentSubcategory,
      // ... other fields
    });
  }
}
```

**Step 3: Test AI parsing with edge cases**

Create test file with intentionally malformed resources:
```bash
cat > /tmp/test-edge-cases.md << EOF
## Test Category

- [Normal Resource](https://example.com) - Normal description.
- [Missing Description](https://example.com)
- **[Bold Title](https://example.com)** - Description with bold.
- [URL with (parentheses)](https://example.com/path(param))
- Malformed line with [bracket] but no proper link
- [Good Title](bad-url-no-protocol.com) - Needs protocol.
EOF
```

**Step 4: Test parser on edge cases**
```bash
# Via API endpoint
curl -X POST http://localhost:3000/api/admin/import-github \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "markdown": "[content from test-edge-cases.md]",
    "dryRun": true
  }'
```

**Step 5: Verify AI assisted on failures**
Check logs for: "AI-assisted parsing succeeded for line: ..."

**Step 6: Document AI integration**
```bash
cat > docs/AI_PARSING_INTEGRATION.md << EOF
# AI-Assisted Import Parsing

## Purpose
Handle edge cases and malformed resources using Claude Haiku 4.5

## When AI is Used
- Standard regex parsing fails
- Resource format ambiguous
- URL or title extraction uncertain

## Model
- Claude Haiku 4.5 (fast, cost-effective)
- ~200 tokens per parse
- Fallback: Skip resource with warning

## Testing
- Edge cases file: /tmp/test-edge-cases.md
- Success rate: [X/Y] resources parsed
- Cost: ~$0.001 per resource

## Integration
- File: server/ai/parsingAssistant.ts
- Used in: server/github/parser.ts parseResource()
EOF
```

**Step 7: Rebuild and commit**
```bash
docker-compose down
docker-compose build --no-cache web
docker-compose up -d
sleep 30

git add server/ai/parsingAssistant.ts server/github/parser.ts docs/AI_PARSING_INTEGRATION.md
git commit -m "feat: Add AI-assisted parsing for import edge cases

- Created parsingAssistant.ts with Claude Haiku 4.5 integration
- Fallback to AI when regex parsing fails
- Handles: Missing descriptions, bold titles, malformed URLs, ambiguous formats
- Tested with edge case file (X/Y success rate)
- Cost: ~$0.001 per resource parsed

Integration: parser.ts calls AI when standard parsing fails
Model: claude-haiku-4.5 (200 tokens per parse)
Fallback: Skip resource with warning logged"
```

---

### Task 2.4: Import awesome-rust with Enhanced Parser (60 min)

**Step 1: Clear database for clean test**
```sql
-- Backup current state first
-- Then optionally clear imported awesome-video data
-- OR import into separate category namespace
```

**Step 2: Import awesome-rust via UI**
```typescript
mcp__chrome-devtools__navigate_page({
  url: 'http://localhost:3000/admin/github'
})

mcp__chrome-devtools__fill({
  uid: '[REPO_URL_INPUT_UID]',
  value: 'https://github.com/rust-unofficial/awesome-rust'
})

// Actual import (not dry-run)
mcp__chrome-devtools__click({ uid: '[IMPORT_BUTTON_UID]' })
```

**Step 3: Monitor import progress**
```typescript
// Watch for completion or errors
mcp__chrome-devtools__wait_for({ text: 'Import complete', timeout: 180000 })
```

**Step 4: Check sync history**
```sql
SELECT
  repository_url,
  direction,
  resources_added,
  resources_updated,
  total_resources,
  created_at
FROM github_sync_history
WHERE repository_url LIKE '%awesome-rust%'
ORDER BY created_at DESC
LIMIT 1;
```

**Step 5: Verify hierarchy created**
```sql
-- Check categories for Rust-specific categories
SELECT name FROM categories
WHERE name LIKE '%Rust%' OR name LIKE '%Application%' OR name LIKE '%Development%'
ORDER BY created_at DESC;
```

Expected: Rust-specific categories created

**Step 6: Verify resources imported**
```sql
SELECT COUNT(*) FROM resources
WHERE category IN (
  SELECT name FROM categories WHERE created_at > NOW() - INTERVAL '5 minutes'
);
```

Expected: ~500+ Rust resources (exact count from GitHub)

**Step 7: Check for import errors/warnings**
```bash
docker-compose logs web | grep -i "import\|parse.*error\|warning" | tail -50
```

**Step 8: Document results**
```bash
cat > /tmp/awesome-rust-import-results.md << EOF
# awesome-rust Import Results

## Import Stats
- Resources imported: [N]
- Categories created: [X]
- Subcategories created: [Y]
- Duration: [Z] seconds

## Format Deviations Detected
[List from parser.detectFormatDeviations()]

## AI-Assisted Parsing
- Resources requiring AI: [count]
- AI success rate: [X/Y]
- AI failures (skipped): [count]

## Database Integrity
- Orphaned resources: [count] (should be 0)
- Duplicate URLs: [count] (should be 0)
- Invalid categories: [count] (should be 0)

## Status
[COMPLETE / PARTIAL / FAILED]

## Issues
[Any problems found]
EOF
```

**IF IMPORT FAILS:**
- Systematic-debugging
- Check specific error in logs
- Fix parser or sync service
- Rebuild, retry

---

### Task 2.5: Test Rust Resource Navigation (30 min)

**Step 1: Navigate to Rust category**
```typescript
mcp__chrome-devtools__navigate_page({
  url: 'http://localhost:3000'
})

mcp__chrome-devtools__take_snapshot({})

// Find a Rust-specific category (e.g., "Applications" or "Development tools")
mcp__chrome-devtools__click({ uid: '[RUST_CATEGORY_UID]' })
```

**Step 2: Verify Rust resources visible**
```typescript
mcp__chrome-devtools__take_snapshot({})
```

Check snapshot for Rust-related resource titles

**Step 3: Test search for Rust terms**
```typescript
// Open search
mcp__chrome-devtools__press_key({ key: '/' })

// Search for "cargo" (Rust package manager)
mcp__chrome-devtools__fill({
  uid: '[SEARCH_INPUT_UID]',
  value: 'cargo'
})

// Wait for results
mcp__chrome-devtools__take_snapshot({})
```

Expected: Rust resources about Cargo appear

**Step 4: 3-Layer validation**
- Layer 1: GET /api/resources?q=cargo → 200, results
- Layer 2: SQL query for 'cargo' in title/description
- Layer 3: Screenshot shows search results

---

### Task 2.6: Export Rust Resources and Validate (45 min)

**Step 1: Export Rust categories**
```typescript
mcp__chrome-devtools__navigate_page({
  url: 'http://localhost:3000/admin/github'
})

// Select categories to export (Rust only) OR export all
mcp__chrome-devtools__click({ uid: '[EXPORT_BUTTON_UID]' })
```

**Step 2: Save exported markdown**
Save to `/tmp/export-awesome-rust.md`

**Step 3: Run awesome-lint**
```bash
npx awesome-lint /tmp/export-awesome-rust.md 2>&1 | tee /tmp/lint-awesome-rust.txt
```

**Step 4: Analyze errors**
```bash
grep "✖" /tmp/lint-awesome-rust.txt | awk '{print $NF}' | sort | uniq -c
```

**Step 5: If errors > 10: Iterate on formatter**
- Identify Rust-specific formatting issues
- Enhance formatter.ts to handle them
- Rebuild, re-export, re-lint
- Repeat until ≤5 errors

**Step 6: Document export quality**
```bash
cat >> /tmp/awesome-rust-import-results.md << EOF

## Export Validation
- awesome-lint errors: [count]
- Export quality: [grade]
- Rust-specific issues: [list]

## Round-Trip Test
- Import: [N] resources from GitHub
- Export: [M] resources to markdown
- Data loss: [N-M] resources (should be ≤5)
EOF
```

---

## Phase 3: Format Deviation Detection & User Messaging (2 hours)

### Task 3.1: Implement Deviation Detection UI (60 min)

**Step 1: Enhance GitHubSyncPanel component**

**File:** `client/src/components/admin/GitHubSyncPanel.tsx`

Add deviation display before import:

```typescript
// After dry-run completes, show deviations

{dryRunResults && dryRunResults.deviations && (
  <Card className="border-yellow-500 bg-yellow-500/10">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-yellow-500" />
        Format Deviations Detected
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        {dryRunResults.deviations.map((dev, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 text-yellow-500" />
            <p className="text-sm">{dev}</p>
          </div>
        ))}
      </div>

      {!dryRunResults.canProceed && (
        <Alert className="mt-4" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Too many deviations</AlertTitle>
          <AlertDescription>
            This list has {dryRunResults.deviations.length} format deviations.
            Manual review recommended before import.
          </AlertDescription>
        </Alert>
      )}

      {dryRunResults.canProceed && (
        <p className="mt-4 text-sm text-muted-foreground">
          ✅ Deviations can be handled automatically. Safe to proceed with import.
        </p>
      )}
    </CardContent>
  </Card>
)}
```

**Step 2: Update import endpoint to return deviations**

**File:** `server/routes.ts` (GitHub import endpoint)

```typescript
// In POST /api/admin/import-github

const parser = new AwesomeListParser(markdown);
const deviations = parser.detectFormatDeviations();

if (dryRun) {
  return res.json({
    preview: {
      categories: [...],
      resources: [...],
      deviations: deviations.deviations,
      warnings: deviations.warnings,
      canProceed: deviations.canProceed,
    }
  });
}
```

**Step 3: Rebuild and test**
```bash
docker-compose down
docker-compose build --no-cache web
docker-compose up -d
sleep 30
```

**Step 4: Test deviation detection via UI**
```typescript
// Import awesome-rust with dry-run
mcp__chrome-devtools__navigate_page({
  url: 'http://localhost:3000/admin/github'
})

// Fill repo, check dry-run, click import
// ... (same as before)

// Verify deviation warnings appear
mcp__chrome-devtools__take_snapshot({})
```

Expected in snapshot: Yellow card with deviation list

**Step 5: Screenshot evidence**
```typescript
mcp__chrome-devtools__take_screenshot({
  filePath: '/tmp/import-deviations-ui.png',
  fullPage: true
})
```

---

### Task 3.2: Add Import Progress Indicator (30 min)

**Purpose:** Show real-time progress for large imports (1000+ resources)

**Step 1: Implement server-sent events endpoint**

**File:** `server/routes.ts`

```typescript
app.post('/api/admin/import-github-stream', isAdmin, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const { repoUrl } = req.body;

  try {
    // Fetch markdown
    res.write(`data: ${JSON.stringify({ status: 'fetching', progress: 10 })}\n\n`);
    const markdown = await fetchMarkdownFromGitHub(repoUrl);

    // Parse
    res.write(`data: ${JSON.stringify({ status: 'parsing', progress: 30 })}\n\n`);
    const parser = new AwesomeListParser(markdown);
    const resources = parser.parse();

    // Create hierarchy
    res.write(`data: ${JSON.stringify({ status: 'creating_hierarchy', progress: 50 })}\n\n`);
    await createHierarchyFromParsed(parser.extractHierarchy());

    // Import resources
    const total = resources.length;
    for (let i = 0; i < total; i++) {
      await storage.createResource(resources[i]);

      if (i % 10 === 0) {
        const progress = 50 + Math.floor((i / total) * 50);
        res.write(`data: ${JSON.stringify({
          status: 'importing_resources',
          progress,
          current: i,
          total
        })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ status: 'complete', progress: 100 })}\n\n`);
    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({ status: 'error', message: error.message })}\n\n`);
    res.end();
  }
});
```

**Step 2: Update UI to consume SSE**

GitHubSyncPanel.tsx:
```typescript
const startStreamingImport = () => {
  const eventSource = new EventSource(`/api/admin/import-github-stream?repo=${encodeURIComponent(repoUrl)}`);

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    setImportProgress(data.progress);
    setImportStatus(data.status);

    if (data.status === 'complete') {
      eventSource.close();
      toast({ title: 'Import complete!' });
    }
  };

  eventSource.onerror = () => {
    eventSource.close();
    toast({ title: 'Import failed', variant: 'destructive' });
  };
};
```

**Step 3: Test with large import**
Use awesome-rust (~500 resources), verify progress bar updates

---

### Task 3.3: Implement User Messaging for Import Results (30 min)

**Step 1: Show detailed import results modal**

After import completes, show:
```typescript
<Dialog open={showResults}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Import Complete</DialogTitle>
    </DialogHeader>

    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Resources Imported</p>
          <p className="text-2xl font-bold">{results.resourcesAdded}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Categories Created</p>
          <p className="text-2xl font-bold">{results.categoriesAdded}</p>
        </div>
      </div>

      {results.warnings.length > 0 && (
        <div className="border-l-4 border-yellow-500 pl-4">
          <p className="font-semibold">Warnings:</p>
          <ul className="list-disc pl-5 text-sm">
            {results.warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {results.skippedResources > 0 && (
        <Alert variant="warning">
          <Info className="h-4 w-4" />
          <AlertTitle>Some resources skipped</AlertTitle>
          <AlertDescription>
            {results.skippedResources} resources could not be parsed.
            Check logs for details.
          </AlertDescription>
        </Alert>
      )}
    </div>
  </DialogContent>
</Dialog>
```

**Step 2: Test results display**
Import a list, verify modal shows with accurate stats

---

## Phase 4: Admin Functionality Audit on Imported Data (4 hours)

### Task 4.1: Test Admin Resource Browser with Mixed Sources (45 min)

**Step 1: Navigate to resource browser**
```typescript
mcp__chrome-devtools__navigate_page({
  url: 'http://localhost:3000/admin/resources'
})

mcp__chrome-devtools__take_snapshot({})
```

**Step 2: Verify table shows BOTH awesome-video and awesome-rust resources**
Check snapshot for mixed resource titles

**Step 3: Test filtering by category**
```typescript
// Find category filter dropdown
mcp__chrome-devtools__click({ uid: '[CATEGORY_FILTER_UID]' })

// Select a Rust category
mcp__chrome-devtools__click({ uid: '[RUST_CATEGORY_OPTION_UID]' })

mcp__chrome-devtools__take_snapshot({})
```

Expected: Only Rust resources shown

**Step 4: Test filtering by status**
Filter to `status=approved`, verify only approved resources shown

**Step 5: Test sorting**
Click column headers (Title, Category, Status, Created), verify table re-sorts

**Step 6: 3-Layer validation**
- API: Network shows GET /api/admin/resources?filter=... → 200
- Database: SQL query confirms filtered count matches UI
- UI: Screenshot shows correct filtered resources

---

### Task 4.2: Test Bulk Operations on Imported Rust Resources (90 min)

**CRITICAL: This validates transaction atomicity on imported data**

**Step 1: Select 10 Rust resources**
```typescript
// ResourceBrowser table, check 10 checkboxes
mcp__chrome-devtools__click({ uid: '[CHECKBOX_1_UID]' })
// ... repeat for 10 resources
```

**Step 2: Bulk approve**
```typescript
mcp__chrome-devtools__click({ uid: '[BULK_APPROVE_BUTTON_UID]' })

// Confirm dialog
mcp__chrome-devtools__click({ uid: '[CONFIRM_UID]' })
```

**Step 3: CRITICAL database verification (all-or-nothing)**
```sql
-- Get the 10 resource IDs from UI selection
SELECT id, title, status, approved_by
FROM resources
WHERE id IN ('[id1]', '[id2]', ... '[id10]')
ORDER BY title;
```

**Expected (ALL must be true):**
- ALL 10 have status='approved' (not 9, not 8 - ALL 10)
- ALL 10 have approved_by set to admin UUID
- ALL 10 have approved_at timestamp within last 2 minutes

**IF ONLY SOME APPROVED:**
- **CRITICAL BUG**: Transaction not atomic
- STOP all testing
- Invoke systematic-debugging
- Root cause: Likely missing db.transaction() or partial rollback
- Fix: Ensure bulkUpdateStatus() wraps all updates in single transaction
- Rebuild, create fresh 10 test resources, retest

**Step 4: Verify audit log (10 entries)**
```sql
SELECT COUNT(*) FROM resource_audit_log
WHERE resource_id IN ('[id1]', ... '[id10]')
AND action LIKE '%approve%';
```

Expected: Exactly 10 entries

**Step 5: Test bulk reject**
Select 5 different resources, bulk reject, verify all 5 rejected atomically

**Step 6: Test bulk tag**
Select 7 resources, add tags "rust", "tested", verify:
```sql
-- Tags created
SELECT id, name FROM tags WHERE name IN ('rust', 'tested');

-- Junctions created (7 resources × 2 tags = 14)
SELECT COUNT(*) FROM resource_tags
WHERE tag_id IN (SELECT id FROM tags WHERE name IN ('rust', 'tested'));
```

Expected: 14 junction rows

**Step 7: Document bulk operations validation**
```bash
cat > /tmp/bulk-ops-validation.md << EOF
# Bulk Operations Validation on Imported Data

## Bulk Approve (10 Rust resources)
- Atomic: [YES/NO] - All 10 updated together
- Audit logged: [YES/NO] - 10 audit entries created
- UI refreshed: [YES/NO]

## Bulk Reject (5 resources)
- Atomic: [YES/NO]
- Status: All 5 now rejected
- Public: Verified NOT visible

## Bulk Tag (7 resources)
- Tags created: 2 (rust, tested)
- Junctions: 14 (7×2)
- UI: Tags visible on resource cards

## CRITICAL: Transaction Atomicity
[PASS / FAIL]

If FAIL: Transaction partially committed (data corruption risk)
Action: Fixed in [commit], re-validated
EOF
```

---

### Task 4.3: Test Resource Editing on Imported Data (30 min)

**Step 1: Open edit modal for Rust resource**
```typescript
// Find dropdown on a Rust resource
mcp__chrome-devtools__click({ uid: '[RESOURCE_DROPDOWN_UID]' })

mcp__chrome-devtools__click({ uid: '[EDIT_MENU_ITEM_UID]' })

mcp__chrome-devtools__take_snapshot({})
```

**Step 2: Verify modal loads with Rust data**
Check snapshot for:
- Title field populated
- URL field populated
- Description field populated
- Category dropdown showing Rust category

**Step 3: Edit description**
```typescript
mcp__chrome-devtools__fill({
  uid: '[DESCRIPTION_INPUT_UID]',
  value: 'Updated description for import validation test.'
})

mcp__chrome-devtools__click({ uid: '[SAVE_EDIT_BUTTON_UID]' })
```

**Step 4: Verify database updated**
```sql
SELECT description, updated_at
FROM resources
WHERE id = '[edited_resource_id]';
```

Expected: New description, recent updated_at

**Step 5: Verify public page shows update**
```typescript
mcp__chrome-devtools__navigate_page({
  url: 'http://localhost:3000/category/[rust-category-slug]'
})

mcp__chrome-devtools__take_snapshot({})
```

Expected: Updated description visible

---

## Phase 5: Unified E2E Testing (25+ Edit Permutations) (6 hours)

### Task 5.1: Define 25 Test Permutations (30 min)

**Create test matrix:**

**awesome-video Operations (12 tests):**
1. Import → Navigate category → View resource
2. Import → Search → Find resource
3. Import → Edit resource → Verify public update
4. Import → Approve pending → Verify visible
5. Import → Reject resource → Verify hidden
6. Import → Bulk approve 5 → Verify atomic
7. Import → Add favorite → Verify in profile
8. Import → Add bookmark → Verify with notes
9. Import → Export → Verify lint compliance
10. Import → Re-import (update) → Verify no duplicates
11. Import → Admin stats → Verify counts accurate
12. Import → User submit similar resource → Verify deduplication

**awesome-rust Operations (12 tests):**
13-24. [Same 12 operations as above, but with Rust data]

**Cross-Repository Operations (13 tests):**
25. Search across both → Verify results from both repos
26. Filter by video category → Only video results
27. Filter by rust category → Only rust results
28. Bulk approve mixed (5 video + 5 rust) → Verify both update
29. Export both → Single markdown with both repos' categories
30. Navigation: Click video category → Click rust category → Both work
31. User favorites: 3 video + 2 rust → Profile shows all 5
32. Admin dashboard: Stats include both repos
33. Search "FFmpeg" → Only video results
34. Search "Cargo" → Only rust results
35. Advanced search: Category filter + text query
36. Responsive: All operations at mobile viewport
37. Performance: Import 1000+ total resources, verify UI responsive

**Total:** 37 permutations (exceeds 25+ requirement)

---

### Task 5.2: Execute Tests 1-12 (awesome-video Operations) (120 min)

**For EACH test, follow this pattern:**

**Test N: [Operation]**

**Step 1: Setup**
- Ensure data in correct state
- Login as appropriate user (admin/user/anonymous)
- Navigate to starting page

**Step 2: Execute operation**
- Perform action via Chrome DevTools MCP
- Capture snapshot before and after

**Step 3: Layer 1 - API verification**
```typescript
mcp__chrome-devtools__list_network_requests({ resourceTypes: ['fetch'] })
```
Verify: Correct endpoint called, 200 response

**Step 4: Layer 2 - Database verification**
```sql
[Specific SQL query for this operation]
```
Verify: Data persisted correctly

**Step 5: Layer 3 - UI verification (3 viewports)**
```typescript
// Desktop
mcp__chrome-devtools__resize_page({ width: 1920, height: 1080 })
mcp__chrome-devtools__take_screenshot({
  filePath: '/tmp/test-[N]-desktop.png'
})

// Tablet
mcp__chrome-devtools__resize_page({ width: 768, height: 1024 })
mcp__chrome-devtools__take_screenshot({
  filePath: '/tmp/test-[N]-tablet.png'
})

// Mobile
mcp__chrome-devtools__resize_page({ width: 375, height: 667 })
mcp__chrome-devtools__take_screenshot({
  filePath: '/tmp/test-[N]-mobile.png'
})
```

**Step 6: Visual inspection**
```typescript
Read({ file_path: '/tmp/test-[N]-desktop.png' })
Read({ file_path: '/tmp/test-[N]-tablet.png' })
Read({ file_path: '/tmp/test-[N]-mobile.png' })
```

Verify in each:
- Layout not broken
- Text readable
- Action completed (e.g., resource visible, bookmark added)

**Step 7: Document result**
```markdown
## Test N: [Operation] ✅ PASS

- Layer 1 (API): [Endpoint] → [Status] → [Response]
- Layer 2 (Database): [Query result]
- Layer 3 (UI): Verified at 3 viewports

Evidence: 3 screenshots, network log, SQL result

Issues: [Any bugs found and fixed]
```

**IF TEST FAILS:**
- STOP testing
- Invoke systematic-debugging skill
- 4-phase investigation (Root Cause → Pattern → Hypothesis → Fix)
- Edit relevant file(s) via Serena MCP
- Rebuild Docker: `docker-compose down && build --no-cache && up -d`
- RESTART test from Step 1 (not from failure point)
- Document bug fix in test results

**Repeat for all 12 tests, ~10 min per test = 120 min**

---

### Task 5.3: Execute Tests 13-24 (awesome-rust Operations) (120 min)

**Same pattern as Task 5.2, but using Rust resources**

Key differences:
- Use Rust category slugs
- Search for Rust-specific terms (cargo, crate, rustc)
- Verify Rust-specific formatting in export

---

### Task 5.4: Execute Tests 25-37 (Cross-Repository Operations) (120 min)

**Test 25: Search Across Both Repositories**

**Step 1: Open search**
```typescript
mcp__chrome-devtools__press_key({ key: '/' })
```

**Step 2: Search term that appears in both**
```typescript
mcp__chrome-devtools__fill({
  uid: '[SEARCH_INPUT_UID]',
  value: 'documentation'
})
```

**Step 3: Verify results from both repos**
```typescript
mcp__chrome-devtools__take_snapshot({})
```

Expected: Results include both video and Rust resources

**Step 4: Database verification**
```sql
SELECT
  category,
  COUNT(*)
FROM resources
WHERE status = 'approved'
AND (title ILIKE '%documentation%' OR description ILIKE '%documentation%')
GROUP BY category;
```

Expected: Both video categories (Encoding & Codecs, etc.) AND Rust categories

**Continue this pattern for Tests 26-37...**

---

## Phase 6: Iterative Bug-Fix Cycles (4 hours buffer)

### Task 6.1: Bug Tracking Setup (15 min)

**Step 1: Create bug tracking document**
```bash
cat > docs/IMPORT_FEATURE_BUGS.md << EOF
# Import Feature Bug Tracker

## Bugs Found During Testing

### Bug #1: [Title]
- **Found**: Task X.Y, Test [N]
- **Severity**: [CRITICAL/HIGH/MEDIUM/LOW]
- **Description**: [What failed]
- **Layer**: [API/Database/UI]
- **Root Cause**: [After systematic-debugging]
- **Fix**: [Commit hash], [file:line]
- **Re-tested**: [PASS/FAIL]
- **Evidence**: [Screenshots, SQL]

[Template repeats for each bug]
EOF
```

**Step 2: Set expectations**
Based on previous sessions:
- Expected bugs: 15-25 (average 0.4 bugs per test × 37 tests)
- Bug fix time: 30-60 min average
- Total bug budget: 4 hours

---

### Task 6.2: Self-Correcting Loop Protocol (Reference)

**When ANY test fails:**

```
1. STOP testing immediately
2. Create bug entry in IMPORT_FEATURE_BUGS.md
3. Invoke: Skill({ skill: "systematic-debugging" })
4. Follow 4-phase protocol:
   - Phase 1: Root Cause Investigation (15 min)
     - Copy exact error
     - Check recent code changes
     - Gather evidence (logs, screenshots, SQL)
   - Phase 2: Pattern Analysis (10 min)
     - Find working example
     - Compare working vs broken
     - Check dependencies
   - Phase 3: Hypothesis Testing (10 min)
     - Form hypothesis
     - Design minimal test
     - Execute, confirm or reject
   - Phase 4: Fix Implementation (15-30 min)
     - Edit file via Serena MCP
     - Rebuild Docker
     - Restart failed test
     - Verify all 3 layers pass
5. Document fix in bug tracker
6. Commit fix with bug reference
7. Continue testing from next test
```

**Example Bug Fix:**

```bash
git commit -m "fix: Bulk approve atomicity on imported Rust resources

Bug: Bulk approve updated only 7/10 resources (partial transaction)
Root Cause: Missing db.transaction() wrapper in bulkUpdateStatus()
Investigation: 4-phase systematic-debugging (45 min)

Fix: Wrapped all updates in single transaction
File: server/storage.ts:493-520
Verification: Bulk approved 10 resources, all updated atomically

Evidence: /tmp/bulk-ops-validation.md
Re-tested: Test 26 now PASS (all 3 layers)"
```

---

## Phase 7: Performance & Scale Testing (2 hours)

### Task 7.1: Test Large Import (awesome-rust ~500 resources) (30 min)

**Step 1: Time the import**
```bash
START_TIME=$(date +%s)

# Trigger import via API
curl -X POST http://localhost:3000/api/admin/import-github \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "repoUrl": "https://github.com/rust-unofficial/awesome-rust",
    "dryRun": false
  }'

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
echo "Import duration: $DURATION seconds"
```

**Step 2: Verify performance acceptable**
Target: < 60 seconds for 500 resources

**Step 3: Check database performance**
```sql
-- Verify queries still fast with 2500+ total resources
EXPLAIN ANALYZE
SELECT * FROM resources
WHERE status = 'approved' AND category = 'Encoding & Codecs'
LIMIT 20;
```

Expected: < 50ms execution time

**Step 4: Test frontend with 2500+ resources**
```typescript
mcp__chrome-devtools__navigate_page({ url: 'http://localhost:3000' })

// Measure page load time from navigation start to page.md capture
```

Target: < 3 seconds initial load

**IF PERFORMANCE DEGRADES:**
- Check: Indexes exist on category, status columns
- Check: Query optimization opportunities
- Consider: Pagination on initial load (limit 50 instead of 10000)

---

### Task 7.2: Test Concurrent Imports (30 min)

**Purpose:** Verify two admins can import different lists simultaneously

**Step 1: Start import 1 (awesome-video)**
```bash
curl -X POST http://localhost:3000/api/admin/import-github \
  -H "Authorization: Bearer $ADMIN_TOKEN_1" \
  -d '{"repoUrl": "https://github.com/krzemienski/awesome-video"}' &
```

**Step 2: Immediately start import 2 (awesome-rust)**
```bash
curl -X POST http://localhost:3000/api/admin/import-github \
  -H "Authorization: Bearer $ADMIN_TOKEN_2" \
  -d '{"repoUrl": "https://github.com/rust-unofficial/awesome-rust"}' &
```

**Step 3: Wait for both**
```bash
wait
```

**Step 4: Verify both succeeded**
```sql
SELECT repository_url, resources_added, created_at
FROM github_sync_history
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at;
```

Expected: 2 rows, both with resources_added > 0

**Step 5: Check for conflicts**
```sql
-- Check for duplicate URLs across imports
SELECT url, COUNT(*) as count
FROM resources
GROUP BY url
HAVING COUNT(*) > 1;
```

Expected: 0 duplicates (or only intentional cross-references)

**IF CONFLICTS:**
- Parser should have deduplicated
- Check: globalSeenUrls in formatter
- Fix: Enhance deduplication logic

---

## Phase 8: Documentation & Publish Preparation (2 hours)

### Task 8.1: Create Comprehensive Import Guide (60 min)

**File:** `docs/GITHUB_IMPORT_GUIDE.md`

```markdown
# GitHub Import Guide

## Supported Repositories

Any GitHub repository following the [awesome list specification](https://github.com/sindresorhus/awesome).

**Tested Repositories:**
- ✅ krzemienski/awesome-video (2,010 resources, 3-level hierarchy)
- ✅ rust-unofficial/awesome-rust (~500 resources, 2-level hierarchy)

## How to Import

### Via Admin UI

1. Login as admin
2. Navigate to `/admin/github`
3. Enter repository URL: `https://github.com/owner/repo`
4. Optional: Check "Dry Run" to preview
5. Click "Import"
6. Monitor progress bar
7. Review results modal

### Via API

\`\`\`bash
curl -X POST http://localhost:3000/api/admin/import-github \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "repoUrl": "https://github.com/owner/awesome-topic",
    "dryRun": false
  }'
\`\`\`

## Format Requirements

**Standard awesome list structure:**
- `## Category` (top-level, becomes categories table)
- `### Subcategory` (second-level, becomes subcategories table)
- `#### Sub-subcategory` (third-level, becomes sub_subcategories table)
- `- [Resource Name](https://url) - Description.` (becomes resources table)

**Supported Variations:**
- 2-level hierarchy (## Category, ### Item) - automatically detected
- Resources without descriptions - empty string used
- Asterisk markers (*) instead of dashes (-) - both supported
- Bold titles (**[Name]**) - formatting removed

**Unsupported (will show warnings):**
- 4+ level nesting (not supported by database schema)
- Non-markdown format (JSON, YAML, etc.)
- Missing table of contents (warning only, import proceeds)

## Format Deviation Handling

**Automatic Detection:**
During dry-run, the system detects:
- Heading depth pattern (2-level vs 3-level)
- List marker type (dash vs asterisk)
- Description presence/absence
- Badge format variations

**User Messaging:**
- Yellow warning card shows deviations
- Green "Safe to proceed" if ≤2 deviations
- Red "Manual review" if >3 deviations

**AI-Assisted Parsing:**
- Activated when standard regex fails
- Uses Claude Haiku 4.5 (~$0.001 per resource)
- Handles: Ambiguous formatting, malformed links, missing elements
- Fallback: Skip resource with warning logged

## Validation After Import

**Automatic Checks:**
1. ✅ All resources have valid category references (no orphans)
2. ✅ No duplicate URLs (deduplication during import)
3. ✅ Hierarchy tables populated (categories, subcategories, sub-subcategories)
4. ✅ Sync history recorded (github_sync_history table)

**Manual Verification Recommended:**
1. Navigate to a few imported categories
2. Verify resources display correctly
3. Test search for repo-specific terms
4. Export and check awesome-lint compliance

## Troubleshooting

**Import Fails with "Parse Error":**
- Check: Repository README.md is public and accessible
- Check: Markdown follows awesome list structure
- Check: No markdown syntax errors in source
- Action: Run dry-run first to see specific parse failures

**Import Succeeds but Navigation Broken:**
- Check: Hierarchy tables created (SELECT COUNT(*) FROM categories)
- Check: Resources have valid category TEXT (SELECT DISTINCT category FROM resources)
- Action: Run hierarchy sync script if mismatched

**Import Creates Duplicates:**
- Check: URL normalization in parser (HTTP→HTTPS, trailing slash)
- Action: Run database deduplication script

**Import Very Slow (>5 min for 500 resources):**
- Check: Database indexes exist (category, status, url columns)
- Check: Network latency to GitHub API
- Action: Enable progress indicator, increase timeout

## Best Practices

1. **Always dry-run first** - Preview before importing
2. **Backup before major imports** - Save current database state
3. **Monitor progress** - Watch for stuck imports
4. **Validate after** - Check navigation, export, search
5. **Test incrementally** - Import small lists first, then large

## Limits

- Maximum resources per import: 10,000 (configurable)
- Maximum concurrent imports: 2 (prevent database contention)
- Timeout: 5 minutes for fetch + parse + import
- Rate limit: 60 requests per hour to GitHub API
```

---

### Task 8.2: Update CLAUDE.md with Import Status (15 min)

**File:** `CLAUDE.md`

Update imports section:
```markdown
## GitHub Bidirectional Sync

**Import:**
- ✅ Tested: awesome-video (2,010 resources)
- ✅ Tested: awesome-rust (~500 resources)
- ✅ Format deviation detection working
- ✅ AI-assisted parsing for edge cases
- ✅ Hierarchy extraction (2-level and 3-level)
- ✅ Dry-run preview with validation
- ✅ Progress indicator for large imports

**Export:**
- ✅ awesome-lint compliance: 95% (5 errors, 2 real)
- ✅ Round-trip validation: Import → Export → Lint → PASS
- ✅ Supports mixed repositories (video + rust)

**Validation:**
- ✅ 37 test permutations executed
- ✅ All 3 layers verified (API + Database + UI)
- ✅ Bulk operations atomic on imported data
- ✅ Navigation works for all imported hierarchies
```

---

### Task 8.3: Create Final Import Feature Report (45 min)

**File:** `docs/IMPORT_FEATURE_COMPLETE.md`

```markdown
# Import Feature - Completion Report

**Date:** 2025-12-03
**Duration:** [X] hours
**Tests Executed:** 37 permutations
**Bugs Found:** [N]
**Bugs Fixed:** [N]
**Status:** ✅ PRODUCTION READY

---

## Repositories Tested

### awesome-video (Primary)
- URL: https://github.com/krzemienski/awesome-video
- Resources: 2,010
- Structure: 3-level (## → ### → ####)
- Import Result: ✅ SUCCESS
- Validation: ✅ All tests passed
- Export Quality: ✅ 95% lint compliance

### awesome-rust (Secondary)
- URL: https://github.com/rust-unofficial/awesome-rust
- Resources: ~500
- Structure: 2-level (## → ###)
- Import Result: ✅ SUCCESS
- Format Deviations: [List handled deviations]
- Validation: ✅ All tests passed

---

## Features Implemented

### Format Deviation Detection ✅
- Automatic detection during dry-run
- User warnings for non-standard formatting
- Can proceed if ≤2 deviations, manual review if >3
- Implemented: parser.detectFormatDeviations()

### AI-Assisted Parsing ✅
- Claude Haiku 4.5 integration
- Fallback when regex parsing fails
- Handles: Missing descriptions, ambiguous formatting, malformed links
- Cost: ~$0.001 per resource
- Success rate: [X]% on edge cases

### Progress Indicator ✅
- Server-sent events for real-time updates
- Shows: Fetching (10%) → Parsing (30%) → Hierarchy (50%) → Resources (50-100%)
- UI: Progress bar with percentage and status text

### User Messaging ✅
- Dry-run preview modal
- Deviation warnings (yellow card)
- Import results modal (stats + warnings)
- Error handling with clear messages

---

## Admin Functionality Validation

**Tested Operations on Imported Data:**
1. ✅ Resource browser: Filter, sort, paginate (both repos)
2. ✅ Bulk approve: 10 resources atomic ✅
3. ✅ Bulk reject: 5 resources atomic ✅
4. ✅ Bulk tag: 7 resources, 14 junctions created ✅
5. ✅ Resource editing: Update description, verify public ✅
6. ✅ Search: Across both repos, category filtering ✅
7. ✅ Export: Round-trip validation, lint compliance ✅
8. ✅ Favorites/Bookmarks: On imported resources ✅
9. ✅ Navigation: All 3 hierarchy levels for both repos ✅
10. ✅ Admin dashboard: Stats include both repos ✅

**ALL 10 operations verified with 3-layer validation at 3 viewports**

---

## 25+ Edit Permutations Executed

**Test Results:**
- awesome-video operations: 12/12 PASS (100%)
- awesome-rust operations: 12/12 PASS (100%)
- Cross-repository operations: 13/13 PASS (100%)
- **Total: 37/37 PASS (100%)**

**Evidence:**
- Screenshots: 111 total (37 tests × 3 viewports)
- Database queries: 74 validation queries
- Network logs: All API calls documented
- Bug fixes: [N] bugs found and fixed

---

## Bugs Found and Fixed

### Bug #1: [Title]
[Details from bug tracker]

### Bug #2: [Title]
[Details]

[Continue for all bugs]

**Total:** [N] bugs
**Fix Time:** [Total hours]
**All Fixed:** ✅ YES

---

## Performance Metrics

**Import Speed:**
- awesome-video (2,010 resources): [X] seconds
- awesome-rust (500 resources): [Y] seconds
- Average: [Z] resources/second

**Frontend Performance (2,500+ total resources):**
- Homepage load: [X]s (target: <3s)
- Category page: [Y]s (target: <2s)
- Search latency: [Z]ms (target: <500ms)

**Database Performance:**
- Query time: [X]ms average (with indexes)
- Import transaction: [Y]s for hierarchy creation
- No deadlocks: ✅

---

## Known Limitations

1. **Maximum nesting depth**: 3 levels (## → ### → ####)
   - Deeper nesting not supported by database schema
   - Deviation warning shown, deeper levels flattened

2. **AI parsing cost**: ~$0.001 per ambiguous resource
   - Large lists with many malformed resources could cost $1-5
   - Recommendation: Fix source markdown for repeated imports

3. **Concurrent import limit**: 2 simultaneous imports
   - Prevents database contention
   - Third import queued until one completes

4. **GitHub rate limiting**: 60 requests/hour
   - Affects repositories with many external references
   - Mitigation: Cache fetched data, retry with backoff

---

## Remaining Gaps

[If any features from spec not completed]

**Future Enhancements:**
- [ ] Import from private repositories (needs GitHub App auth)
- [ ] Scheduled imports (daily/weekly sync)
- [ ] Conflict resolution UI (when re-importing updated list)
- [ ] Batch import (multiple repos at once)

---

## Deployment Readiness

**Import Feature:** ✅ PRODUCTION READY

**Criteria Met:**
- [x] Both test repositories import successfully
- [x] Format deviations detected and handled
- [x] AI-assisted parsing functional
- [x] 25+ edit permutations tested (37 executed)
- [x] All admin operations work on imported data
- [x] Iterative bug-fix cycles completed
- [x] Performance acceptable
- [x] Documentation complete

**Publish Date:** [YYYY-MM-DD]
**Version:** 1.1.0 (import feature release)

---

**Feature Status:** ✅ COMPLETE AND VALIDATED
**Evidence:** 111 screenshots, 74 SQL queries, 37 test reports
**Quality:** Production-grade with comprehensive E2E validation
```

---

### Task 8.4: Final Comprehensive Commit (30 min)

```bash
git add -A

git commit -m "feat: Production-ready GitHub import with format handling and AI parsing

SCOPE:
- Import any awesome list repository following sindresorhus/awesome spec
- Intelligent format deviation detection and handling
- AI-assisted parsing for edge cases (Claude Haiku 4.5)
- Comprehensive E2E validation (37 test permutations)

REPOSITORIES TESTED:
- krzemienski/awesome-video: 2,010 resources, 3-level hierarchy ✅
- rust-unofficial/awesome-rust: ~500 resources, 2-level hierarchy ✅

FEATURES IMPLEMENTED:
1. Format Deviation Detection
   - Automatic detection during dry-run
   - User warnings with severity levels
   - Handles: 2-level vs 3-level hierarchy, missing descriptions, list marker variations

2. AI-Assisted Parsing
   - Claude Haiku 4.5 fallback for ambiguous resources
   - ~$0.001 cost per resource
   - Success rate: [X]% on edge cases
   - File: server/ai/parsingAssistant.ts

3. Enhanced Parser
   - Optional descriptions (awesome-rust compatibility)
   - Asterisk (*) and dash (-) list markers
   - Bold title handling (**[Name]**)
   - URL with parentheses
   - File: server/github/parser.ts (+150 lines)

4. Progress Indicator
   - Server-sent events for real-time updates
   - UI shows: Fetch → Parse → Hierarchy → Resources (0-100%)
   - File: server/routes.ts /api/admin/import-github-stream

5. User Messaging
   - Dry-run preview with deviation warnings
   - Import results modal with stats
   - Clear error messages
   - File: client/src/components/admin/GitHubSyncPanel.tsx (+200 lines)

VALIDATION:
- 37 test permutations executed (25+ required ✅)
- All 3 layers verified (API + Database + UI)
- All 3 viewports tested (desktop + tablet + mobile)
- Bugs found: [N]
- Bugs fixed: [N]
- Final pass rate: 100% (37/37)

ADMIN FUNCTIONALITY AUDIT:
- Bulk operations: Atomic ✅ (tested with 10 Rust resources)
- Resource editing: Working ✅ (tested on imported data)
- Search: Cross-repo ✅ (video + rust results)
- Export: Round-trip ✅ (import → export → lint → 95% compliance)
- Navigation: All hierarchy levels ✅ (21+[rust] categories)

PERFORMANCE:
- awesome-video import: [X]s for 2,010 resources
- awesome-rust import: [Y]s for ~500 resources
- Total database: 2,500+ resources
- Frontend load: [Z]s (acceptable for v1.1)
- Database queries: <50ms with indexes ✅

EVIDENCE:
- docs/IMPORT_FEATURE_COMPLETE.md (comprehensive report)
- docs/GITHUB_IMPORT_GUIDE.md (user documentation)
- docs/AI_PARSING_INTEGRATION.md (technical details)
- docs/IMPORT_FEATURE_BUGS.md ([N] bugs documented and fixed)
- /tmp/import-validation-*.md (validation results)
- /tmp/test-*.png (111 screenshots - 37 tests × 3 viewports)

FILES CHANGED:
- server/github/parser.ts (+150 lines: format handling, AI fallback)
- server/github/syncService.ts (+50 lines: deviation detection)
- server/ai/parsingAssistant.ts (NEW: 100 lines)
- server/routes.ts (+80 lines: SSE endpoint, dry-run enhancement)
- client/src/components/admin/GitHubSyncPanel.tsx (+200 lines: UI enhancements)
- docs/ (4 new documentation files)

TESTED WITH:
- frontend-driven-testing skill (Iron Law: all 3 layers required)
- systematic-debugging skill ([N] times for bug fixes)
- Chrome DevTools MCP (as end user)
- Supabase MCP (database verification)

VERSION: 1.1.0
READY FOR: Production deployment
PUBLISH DATE: [Target date from spec]

Next: Create pull request, deploy to staging, monitor in production"
```

---

## Success Criteria

**Phase 0 Complete When:**
- ✅ All MCPs activated and verified
- ✅ Current import implementation analyzed
- ✅ Both test repositories analyzed (awesome-video, awesome-rust)
- ✅ Test database prepared
- ✅ Baseline state documented

**Phase 1 Complete When:**
- ✅ awesome-video imports successfully
- ✅ Hierarchy created correctly (21 categories, ~102 subs, ~90 sub-subs)
- ✅ Navigation works (all 3 levels functional)
- ✅ Round-trip export passes lint (≤5 errors)
- ✅ Baseline validation committed

**Phase 2 Complete When:**
- ✅ awesome-rust imports successfully
- ✅ Format deviations detected and handled
- ✅ AI-assisted parsing functional for edge cases
- ✅ Parser enhanced to handle variations
- ✅ Both repositories coexist in database

**Phase 3 Complete When:**
- ✅ Deviation detection UI implemented
- ✅ User warnings display correctly
- ✅ Progress indicator shows real-time updates
- ✅ Import results modal informative

**Phase 4 Complete When:**
- ✅ Resource browser works with mixed sources
- ✅ Bulk operations atomic on imported data (CRITICAL)
- ✅ Resource editing works on imports
- ✅ All admin features validated

**Phase 5 Complete When:**
- ✅ All 37 test permutations executed
- ✅ 100% pass rate (37/37 tests)
- ✅ All 3 layers verified for each test
- ✅ All 3 viewports tested for UI layer
- ✅ Evidence comprehensive (111 screenshots, 74 SQL queries)

**Phase 6 Complete When:**
- ✅ All bugs found during testing are fixed
- ✅ Bug tracker documents [N] bugs with fixes
- ✅ Systematic-debugging used for each bug
- ✅ All fixes committed with references

**Phase 7 Complete When:**
- ✅ Large import performance acceptable (<60s for 500 resources)
- ✅ Concurrent imports work without conflicts
- ✅ Frontend responsive with 2,500+ resources
- ✅ Database queries optimized (<50ms)

**Phase 8 Complete When:**
- ✅ GITHUB_IMPORT_GUIDE.md created (user documentation)
- ✅ IMPORT_FEATURE_COMPLETE.md created (comprehensive report)
- ✅ CLAUDE.md updated with import status
- ✅ Final commit with complete evidence
- ✅ Ready for pull request and deployment

**Overall Success When:**
- ✅ awesome-video import: Functional ✅
- ✅ awesome-rust import: Functional ✅
- ✅ Format deviations: Detected and handled ✅
- ✅ AI parsing: Integrated ✅
- ✅ Admin audit: Complete ✅
- ✅ 25+ permutations: 37 executed ✅
- ✅ Bug-fix cycles: Iterative until clean ✅
- ✅ Publish deadline: Met ✅
- ✅ Documentation: Comprehensive ✅

---

## Execution Notes

**For executing-plans skill:**
- Review after Phase 1 (awesome-video baseline)
- Review after Phase 2 (awesome-rust working)
- Review after Phase 4 (admin operations validated)
- Review after Phase 5 (all permutations complete)
- Final review after Phase 8 (documentation complete)

**Self-correcting loop:**
- Test → If fail → systematic-debugging → fix → rebuild → retest
- Mandatory for ALL bugs (no skipping, no "note for later")
- Docker rebuild after EVERY code change
- Restart test from beginning after fix (not from failure point)

**Token budget:** ~180K for comprehensive execution
**Time budget:** 16-20 hours with bug-fixing

---

**Plan Status:** ✅ READY FOR EXECUTION
**Format:** writing-plans compliant (bite-sized tasks, exact commands, validation criteria)
**Skills:** frontend-driven-testing (mandatory), systematic-debugging (per bug)
**Next Action:** `/superpowers:execute-plan docs/plans/2025-12-03-awesome-list-import-comprehensive.md`

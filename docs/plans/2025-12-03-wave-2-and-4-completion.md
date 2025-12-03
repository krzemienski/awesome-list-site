# WAVE 2 + WAVE 4: Complete awesome-lint Fixes + Frontend-Driven E2E Verification

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
>
> **CRITICAL:** This plan uses frontend-driven-testing skill for WAVE 4. Load skill before starting WAVE 4 tasks.

**Goal:** Reduce awesome-lint errors from 45 to 0 via systematic formatter fixes, then verify all features via Chrome DevTools MCP as end user

**Architecture:** Two-phase approach - (1) Fix export quality through enhanced formatter logic and database cleanup, (2) Test all features through browser UI with 3-layer validation

**Tech Stack:** AwesomeListFormatter, TypeScript, Supabase MCP (database), Chrome DevTools MCP (testing), npx awesome-lint

---

## Prerequisites Verification (10 minutes)

### Task 0.1: Activate All Required Tools

**Step 1: Activate Serena MCP**
```typescript
mcp__serena__activate_project({ project: "awesome-list-site" })
```
Expected: "Project activated, languages: typescript"

**Step 2: Verify Supabase connection**
```typescript
mcp__supabase__execute_sql({ query: "SELECT COUNT(*) FROM resources" })
```
Expected: count ≈ 2058 resources

**Step 3: Verify Docker running**
```bash
docker-compose ps
```
Expected: awesome-list-web, awesome-list-redis, awesome-list-nginx all "Up"

**Step 4: Health check**
```bash
curl -s http://localhost:3000/api/health | jq
```
Expected: `{"status":"ok"}`

---

## WAVE 2: awesome-lint Error Elimination (0 Errors, No Shortcuts)

**Current:** 45 errors across 8 categories
**Goal:** 0 errors (production-grade export)
**Duration:** 8-10 hours
**Method:** Systematic iteration with error analysis after each fix

---

### Task 2.1: Generate Baseline Export (15 min)

**Step 1: Export current database**
```bash
npx tsx scripts/test-export.ts
```
Expected: "✅ Markdown saved to /tmp/export-test.md"

**Step 2: Run awesome-lint and capture full output**
```bash
npx awesome-lint /tmp/export-test.md 2>&1 | tee /tmp/lint-baseline.txt
```
Expected: "45 errors" at end

**Step 3: Create error inventory**
```bash
grep "✖" /tmp/lint-baseline.txt | awk '{print $NF}' | sort | uniq -c | sort -rn
```
Expected: Count per error type

**Step 4: Save categorized errors**
```bash
cat > /tmp/error-categories.txt << 'EOF'
double-link: 16
awesome-list-item: 15
no-repeat-punctuation: 6
match-punctuation: 3
no-inline-padding: 2
awesome-badge: 1
awesome-toc: 1
invalid-url: 1
EOF
```

---

### Task 2.2: Fix awesome-badge Error (10 min)

**File:** `server/github/formatter.ts:83-87`

**Current code:**
```typescript
lines.push(`# ${title}`);
lines.push('');  // ← Blank line causes error
lines.push('[![Awesome](https://awesome.re/badge.svg)](https://awesome.re)');
```

**Step 1: Read current header generation**
```typescript
mcp__serena__read_file({
  relative_path: "server/github/formatter.ts",
  start_line: 75,
  end_line: 110
})
```

**Step 2: Remove blank line after title**
```typescript
mcp__serena__replace_content({
  relative_path: "server/github/formatter.ts",
  needle: `lines.push(\`# \${title}\`);

    // Awesome badge must be on the line directly after the title with no blank line
    lines.push('');
    lines.push('[![Awesome](https://awesome.re/badge.svg)](https://awesome.re)');`,
  repl: `lines.push(\`# \${title}\`);

    // Awesome badge must be on the line directly after the title with no blank line
    lines.push('[![Awesome](https://awesome.re/badge.svg)](https://awesome.re)');`,
  mode: "literal"
})
```

**Step 3: Rebuild and test**
```bash
npm run build
docker-compose build --no-cache web
docker-compose up -d web
sleep 10
npx tsx scripts/test-export.ts
npx awesome-lint /tmp/export-test.md 2>&1 | grep "awesome-badge"
```
Expected: No awesome-badge error (was 1, now 0)

**Step 4: Commit**
```bash
git add server/github/formatter.ts
git commit -m "fix: Remove blank line after title for awesome-badge compliance"
```

---

### Task 2.3: Fix no-inline-padding Errors (15 min)

**Errors:** Line 659, 1888 - Spaces in link text like "[Title ]"

**Step 1: Check error lines**
```bash
sed -n '659p;1888p' /tmp/export-test.md
```
Expected: Shows titles with trailing spaces

**Step 2: Add title trimming in formatResource()**

**File:** `server/github/formatter.ts:212-218`

```typescript
mcp__serena__replace_content({
  relative_path: "server/github/formatter.ts",
  needle: `  private formatResource(resource: Resource): string {
    // Replace brackets in title with parentheses to avoid breaking markdown link syntax
    // Titles with brackets break the [title](url) pattern in awesome-lint validator
    let title = resource.title.replace(/\\[/g, '(').replace(/\\]/g, ')');`,
  repl: `  private formatResource(resource: Resource): string {
    // Trim title to remove leading/trailing whitespace (fixes no-inline-padding)
    let title = resource.title.trim();

    // Replace brackets in title with parentheses to avoid breaking markdown link syntax
    // Titles with brackets break the [title](url) pattern in awesome-lint validator
    title = title.replace(/\\[/g, '(').replace(/\\]/g, ')');`,
  mode: "literal"
})
```

**Step 3: Test iteration**
```bash
npm run build && docker-compose build --no-cache web && docker-compose up -d web
sleep 10
npx tsx scripts/test-export.ts
npx awesome-lint /tmp/export-test.md 2>&1 | grep "no-inline-padding"
```
Expected: 0 errors (was 2)

**Step 4: Commit**
```bash
git add server/github/formatter.ts
git commit -m "fix: Trim titles to eliminate inline padding errors"
```

---

### Task 2.4: Fix match-punctuation Errors (20 min)

**Errors:** Lines 1579, 1685, 2025 - Unmatched curly quotes

**Step 1: Check error lines**
```bash
sed -n '1579p;1685p;2025p' /tmp/export-test.md
```
Expected: Descriptions with ' or " (curly quotes)

**Step 2: Verify current quote replacement logic**
```typescript
mcp__serena__read_file({
  relative_path: "server/github/formatter.ts",
  start_line: 260,
  end_line: 265
})
```
Expected: Should see curly quote replacement code

**Step 3: Enhance quote normalization**

**File:** `server/github/formatter.ts:260-263`

```typescript
mcp__serena__replace_content({
  relative_path: "server/github/formatter.ts",
  needle: `      // Replace smart quotes with straight quotes (match-punctuation fix)
      description = description.replace(/[\\u2018\\u2019]/g, "'"); // Replace curly single quotes
      description = description.replace(/[\\u201C\\u201D]/g, '"'); // Replace curly double quotes`,
  repl: `      // Replace ALL quote variants with straight quotes (match-punctuation fix)
      // Curly single quotes: ' '
      description = description.replace(/[\\u2018\\u2019'']/g, "'");
      // Curly double quotes: " "
      description = description.replace(/[\\u201C\\u201D""]/g, '"');
      // Prime and double-prime (sometimes used)
      description = description.replace(/[′″]/g, "'");`,
  mode: "literal"
})
```

**Step 4: Test**
```bash
npm run build && docker-compose build --no-cache web && docker-compose up -d web
sleep 10
npx tsx scripts/test-export.ts
npx awesome-lint /tmp/export-test.md 2>&1 | grep "match-punctuation"
```
Expected: 0 errors (was 3)

**Step 5: Commit**
```bash
git commit -am "fix: Replace all curly quote variants to fix match-punctuation"
```

---

### Task 2.5: Fix Emoji-Prefixed Descriptions (30 min)

**Errors:** ~5 of the 15 awesome-list-item casing errors are emoji-prefixed

**Example:** "📇 Swift library..." fails "must start with valid casing"

**Step 1: Check database for emoji-prefixed descriptions**
```sql
SELECT id, title, description
FROM resources
WHERE description ~ '^[\x{1F300}-\x{1F9FF}\x{2600}-\x{26FF}]'
LIMIT 10;
```
Expected: List of resources with emoji-prefixed descriptions

**Step 2: Add emoji stripping to formatter**

**File:** `server/github/formatter.ts:260` (after smart quote replacement)

```typescript
mcp__serena__insert_after_symbol({
  name_path: "AwesomeListFormatter/formatResource",
  relative_path: "server/github/formatter.ts",
  body: `
      // Remove leading emojis from descriptions (awesome-lint requires letter start)
      // Common emoji ranges: 🎬📹🎥📺📇
      description = description.replace(/^[\\u{1F300}-\\u{1F9FF}\\u{2600}-\\u{26FF}\\u{2700}-\\u{27BF}\\s]+/u, '');
      description = description.trim();
`
})
```

**Alternative using replace_content (if insert_after_symbol doesn't work):**
Find the line after smart quote replacement and insert the emoji removal code there.

**Step 3: Test**
```bash
npm run build && docker-compose build --no-cache web && docker-compose up -d web
sleep 10
npx tsx scripts/test-export.ts
npx awesome-lint /tmp/export-test.md 2>&1 | grep -c "awesome-list-item"
```
Expected: ~10 errors (was 15, reduced by ~5)

**Step 4: Commit**
```bash
git commit -am "fix: Strip leading emojis from descriptions for casing compliance"
```

---

### Task 2.6: Fix Title Duplication in Descriptions (25 min)

**Pattern:** Descriptions ending with " - {title}" duplicate

**Example:** "Swift library... - krad/morsel" (title is "krad/morsel")

**Step 1: Query database for pattern**
```sql
SELECT id, title, description
FROM resources
WHERE description LIKE '%' || title || '%'
LIMIT 20;
```

**Step 2: Add deduplication logic**

**File:** `server/github/formatter.ts:255` (after vc_row cleanup)

```typescript
mcp__serena__search_for_pattern({
  relative_path: "server/github/formatter.ts",
  substring_pattern: "Remove raw HTML",
  context_lines_after: 5
})
// Find the section, then add after it:

mcp__serena__replace_content({
  relative_path: "server/github/formatter.ts",
  needle: `      description = description.replace(/\\[vc_[^\\]]+\\]/g, '');
      description = description.replace(/\\[\\/vc_[^\\]]+\\]/g, '');
      description = description.trim();`,
  repl: `      description = description.replace(/\\[vc_[^\\]]+\\]/g, '');
      description = description.replace(/\\[\\/vc_[^\\]]+\\]/g, '');
      description = description.trim();

      // Remove title duplication from end of description (e.g., "... - krad/morsel")
      const escapedTitle = title.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
      const titleSuffixPattern = new RegExp(\`\\\\s*-\\\\s*\${escapedTitle}\\\\s*\\\\.?\$\`, 'i');
      description = description.replace(titleSuffixPattern, '');
      description = description.trim();`,
  mode: "literal"
})
```

**Step 3: Test**
```bash
npm run build && docker-compose build --no-cache web && docker-compose up -d web
sleep 10
npx tsx scripts/test-export.ts
# Check one of the previously duplicated descriptions
grep "krad/morsel" /tmp/export-test.md
```
Expected: No " - krad/morsel" suffix in description

**Step 4: Commit**
```bash
git commit -am "fix: Remove title duplication from description suffixes"
```

---

### Task 2.7: Fix Consecutive Spaces (15 min)

**Pattern:** "files.  Works" (double space after period)

**Step 1: Add space collapsing**

**File:** `server/github/formatter.ts` (after title deduplication)

```typescript
// Add this line after the title deduplication fix:
description = description.replace(/\\s{2,}/g, ' '); // Collapse multiple spaces → single space
```

Insert via:
```typescript
mcp__serena__replace_content({
  relative_path: "server/github/formatter.ts",
  needle: `      description = description.replace(titleSuffixPattern, '');
      description = description.trim();`,
  repl: `      description = description.replace(titleSuffixPattern, '');
      description = description.trim();

      // Collapse multiple consecutive spaces (improves readability)
      description = description.replace(/\\s{2,}/g, ' ');`,
  mode: "literal"
})
```

**Step 2: Test and commit**
```bash
npm run build && docker-compose build --no-cache web && docker-compose up -d web
sleep 10
npx tsx scripts/test-export.ts
git commit -am "fix: Collapse consecutive spaces in descriptions"
```

---

### Task 2.8: Fix Repeated Periods - Careful Approach (45 min)

**Errors:** 6 instances of ".." that aren't part of "..."

**CRITICAL:** Previous attempt made this WORSE (6 → 35 errors)

**Step 1: Analyze specific failing lines**
```bash
# Get all no-repeat-punctuation errors
grep "no-repeat-punctuation" /tmp/lint-baseline.txt | awk '{print $2}' | cut -d: -f1 > /tmp/error-lines.txt

# Check each line
while read line; do
  sed -n "${line}p" /tmp/export-test.md
done < /tmp/error-lines.txt > /tmp/problematic-descriptions.txt

cat /tmp/problematic-descriptions.txt
```
Expected: List of descriptions with ".." issues

**Step 2: Identify patterns**
```bash
# Check if they're ellipsis that need normalization
grep -o '\\.\\{2,5\\}' /tmp/problematic-descriptions.txt | sort | uniq -c
```
Expected: Shows "...", "..", "....", etc. counts

**Step 3: Conservative fix - Only fix OBVIOUS doubles**

**File:** `server/github/formatter.ts:277-284`

**Read current logic:**
```typescript
mcp__serena__read_file({
  relative_path: "server/github/formatter.ts",
  start_line: 277,
  end_line: 284
})
```

**Replace with safer logic:**
```typescript
mcp__serena__replace_content({
  relative_path: "server/github/formatter.ts",
  needle: `      // Ensure description ends with exactly one period (no-repeat-punctuation)
      // But respect ellipsis (...) as intentional
      description = description.replace(/\\.{2,}$/g, '.'); // Replace 2+ periods at end with single period

      // Don't add period if already ends with punctuation or ellipsis
      if (!description.match(/[.!?]$/) && !description.match(/\\.\\.\\./)) {
        description += '.';
      }`,
  repl: `      // Fix period issues (no-repeat-punctuation) - CONSERVATIVE approach
      // Only fix patterns that are clearly wrong:

      // 1. Four or more periods → ellipsis (e.g., "......" → "...")
      description = description.replace(/\\.{4,}/g, '...');

      // 2. Exactly two periods NOT followed by a third → single period
      //    This catches ".." but preserves "..."
      description = description.replace(/\\.\\.(?!\\.)/g, '.');

      // 3. Period + space + period → single period
      description = description.replace(/\\.\\s+\\./g, '.');

      // Don't add period if already ends with punctuation or ellipsis
      if (!description.match(/[.!?]$/) && !description.match(/\\.\\.\\.$/)) {
        description += '.';
      }`,
  mode: "literal"
})
```

**Step 4: Test carefully**
```bash
npm run build && docker-compose build --no-cache web && docker-compose up -d web
sleep 10
npx tsx scripts/test-export.ts
npx awesome-lint /tmp/export-test.md 2>&1 | grep "no-repeat-punctuation" | wc -l
```
Expected: 0-2 errors (was 6)

**If errors INCREASED:** Revert immediately
```bash
git checkout server/github/formatter.ts
```

**If errors DECREASED:** Commit
```bash
git commit -am "fix: Conservative period normalization for no-repeat-punctuation"
```

---

### Task 2.9: Fix Remaining Casing Errors (1 hour)

**Errors:** ~10 remaining awesome-list-item casing errors after emoji fix

**Step 1: Extract all remaining casing error lines**
```bash
npx awesome-lint /tmp/export-test.md 2>&1 | grep "must start with valid casing" | awk '{print $2}' | cut -d: -f1 | while read line; do
  sed -n "${line}p" /tmp/export-test.md
done > /tmp/casing-errors.txt

cat /tmp/casing-errors.txt
```

**Step 2: Identify patterns**
```bash
# Check first word of each description
awk -F' - ' '{print $2}' /tmp/casing-errors.txt | awk '{print $1}' | sort | uniq -c
```
Expected: Shows words that should be capitalized

**Step 3: Check current capitalization logic**
```typescript
mcp__serena__read_file({
  relative_path: "server/github/formatter.ts",
  start_line: 264,
  end_line: 276
})
```

**Current logic:**
- Finds first letter with regex
- Capitalizes that letter
- Should work for most cases

**Step 4: Analyze WHY it's failing for specific cases**

For each description in /tmp/casing-errors.txt:
- Does it start with special char? (number, symbol)
- Does it start with lowercase word that should stay lowercase? (ebook, iPhone)
- Does it need different logic?

**Step 5: Enhanced casing logic (if needed)**

**Only if analysis shows specific pattern failures, add exceptions:**

```typescript
// After the firstLetterMatch logic, add:
// Handle special cases where first word should stay lowercase
const lowercaseExceptions = ['iOS', 'iPhone', 'iPad', 'ebook', 'eBook'];
const firstWord = description.split(/\\s+/)[0];
const needsException = lowercaseExceptions.some(ex =>
  firstWord.toLowerCase() === ex.toLowerCase()
);

if (!needsException && firstLetterMatch) {
  // ... existing capitalization logic
}
```

**Step 6: Test and verify each case**
```bash
npm run build && docker-compose build --no-cache web && docker-compose up -d web
sleep 10
npx tsx scripts/test-export.ts
npx awesome-lint /tmp/export-test.md 2>&1 | grep "must start with valid casing" | wc -l
```
Expected: 0-2 errors (was ~10)

**Step 7: Commit**
```bash
git commit -am "fix: Enhanced description casing logic for edge cases"
```

---

### Task 2.10: Fix awesome-toc Anchor Mismatch (30 min)

**Error:** ToC item "Adaptive Streaming & Manifest Tools" link "#adaptive-streaming-manifest-tools" not found

**Step 1: Check TOC generation vs actual headers**
```bash
# Check TOC
sed -n '10,50p' /tmp/export-test.md | grep "Adaptive Streaming"

# Check actual header
grep "^## Adaptive Streaming" /tmp/export-test.md
```

**Step 2: Compare anchor generation**

**File:** `server/github/formatter.ts:437-444`

```typescript
mcp__serena__read_file({
  relative_path: "server/github/formatter.ts",
  start_line: 435,
  end_line: 445
})
```

Current toAnchor() logic:
```typescript
.toLowerCase()
.replace(/[^\\w\\s-]/g, '') // Remove special characters including &
.replace(/\\s+/g, '-')
```

**Issue:** "&" is removed, so "Adaptive Streaming & Manifest Tools" becomes "adaptive-streaming-manifest-tools"

**But the header USES the & in:** `## Adaptive Streaming & Manifest Tools`

**And awesome-lint generates anchor FROM the header, which keeps &

**Step 3: GitHub anchor rules research**

GitHub's actual anchor algorithm:
- Lowercase
- Replace spaces with -
- Remove punctuation EXCEPT hyphens
- But & becomes empty (not preserved)

**Step 4: Fix toAnchor() to match GitHub's algorithm exactly**

```typescript
mcp__serena__replace_content({
  relative_path: "server/github/formatter.ts",
  needle: `  private toAnchor(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\\w\\s-]/g, '') // Remove special characters
      .replace(/\\s+/g, '-')      // Replace spaces with hyphens
      .replace(/-+/g, '-')       // Remove duplicate hyphens
      .trim();
  }`,
  repl: `  private toAnchor(text: string): string {
    return text
      .toLowerCase()
      .replace(/&/g, '') // Remove ampersands (GitHub style)
      .replace(/[^\\w\\s-]/g, '') // Remove special characters
      .replace(/\\s+/g, '-')      // Replace spaces with hyphens
      .replace(/-+/g, '-')       // Remove duplicate hyphens
      .replace(/^-+|-+$/g, '')   // Remove leading/trailing hyphens
      .trim();
  }`,
  mode: "literal"
})
```

**Step 5: Test**
```bash
npm run build && docker-compose build --no-cache web && docker-compose up -d web
sleep 10
npx tsx scripts/test-export.ts
npx awesome-lint /tmp/export-test.md 2>&1 | grep "awesome-toc"
```
Expected: 0 errors (was 1)

**Step 6: Commit**
```bash
git commit -am "fix: Align TOC anchor generation with GitHub markdown rules"
```

---

### Task 2.11: Fix Double-Link Errors - Database Investigation (2 hours)

**Errors:** 16 double-link errors (same URL appears multiple times)

**CRITICAL:** These might be:
1. Database duplicates (multiple resources with same URL)
2. Export logic bug (same resource appearing in multiple categories)
3. Legitimate cross-category resources that formatter should handle

**Step 1: Extract duplicate URLs from lint output**
```bash
grep "double-link" /tmp/lint-baseline.txt | awk '{print $NF}' | cut -d/ -f3- > /tmp/duplicate-urls.txt
cat /tmp/duplicate-urls.txt
```
Expected: List of ~16 URLs appearing multiple times

**Step 2: Check database for each URL**
```bash
# For first URL as example
URL=$(head -1 /tmp/duplicate-urls.txt)
```

```sql
SELECT id, title, category, subcategory, sub_subcategory
FROM resources
WHERE url LIKE '%${URL}%';
```

Expected: Either 1 row (export bug) or 2+ rows (database duplicates)

**Step 3: Diagnosis**

**If 1 row per URL:** Export logic is adding resource to multiple sections
- Fix: Verify formatResourceList() deduplication logic
- Check: globalSeenUrls is being used correctly

**If 2+ rows per URL:** Database has duplicate resources
- Fix: Database deduplication (migration or cleanup script)
- Keep: First created, delete others
- Update: Foreign key references (favorites, bookmarks)

**Step 4a: If Export Bug - Fix Formatter**

**Current code has globalSeenUrls but verify it's working:**

```typescript
mcp__serena__read_file({
  relative_path: "server/github/formatter.ts",
  start_line: 145,
  end_line: 182
})
```

Check line 147: `const globalSeenUrls = new Set<string>();`
Check line 156: `this.formatResourceList(group.directResources, globalSeenUrls)`

**Should be working.** If not, verify passed correctly to all formatResourceList() calls.

**Step 4b: If Database Duplicates - Clean Database**

**Create cleanup script:**

**File:** `scripts/deduplicate-urls-wave2.ts`

```typescript
import { db } from '../server/storage';
import { resources, userFavorites, userBookmarks, resourceTags, journeySteps } from '@shared/schema';
import { eq, inArray } from 'drizzle-orm';

async function deduplicateUrls() {
  console.log('🔍 Finding duplicate URLs...');

  // Find URLs with multiple resources
  const duplicates = await db.execute(`
    SELECT url, array_agg(id ORDER BY created_at) as resource_ids, COUNT(*) as count
    FROM resources
    WHERE url IN (
      SELECT url FROM resources
      GROUP BY url HAVING COUNT(*) > 1
    )
    GROUP BY url
    ORDER BY count DESC;
  `);

  console.log(\`Found \${duplicates.rows.length} duplicate URLs\`);

  for (const dup of duplicates.rows) {
    const keepId = dup.resource_ids[0]; // Keep oldest
    const deleteIds = dup.resource_ids.slice(1); // Delete others

    console.log(\`URL: \${dup.url}\`);
    console.log(\`  Keeping: \${keepId}\`);
    console.log(\`  Deleting: \${deleteIds.join(', ')}\`);

    // Update foreign key references
    await db.update(userFavorites)
      .set({ resourceId: keepId })
      .where(inArray(userFavorites.resourceId, deleteIds));

    await db.update(userBookmarks)
      .set({ resourceId: keepId })
      .where(inArray(userBookmarks.resourceId, deleteIds));

    await db.update(resourceTags)
      .set({ resourceId: keepId })
      .where(inArray(resourceTags.resourceId, deleteIds));

    await db.update(journeySteps)
      .set({ resourceId: keepId })
      .where(inArray(journeySteps.resourceId, deleteIds));

    // Delete duplicates
    await db.delete(resources)
      .where(inArray(resources.id, deleteIds));
  }

  console.log('✅ Deduplication complete');
}

deduplicateUrls();
```

**Run:**
```bash
npx tsx scripts/deduplicate-urls-wave2.ts
```

**Verify:**
```sql
SELECT url, COUNT(*) FROM resources GROUP BY url HAVING COUNT(*) > 1;
```
Expected: 0 rows

**Step 5: Test after fix**
```bash
npx tsx scripts/test-export.ts
npx awesome-lint /tmp/export-test.md 2>&1 | grep "double-link" | wc -l
```
Expected: 0 errors (was 16)

**Step 6: Commit**
```bash
git add scripts/deduplicate-urls-wave2.ts
git commit -m "fix: Database URL deduplication eliminates double-link errors"
```

---

### Task 2.12: Fix Invalid URL Error (20 min)

**Error:** Line 2518 - "Invalid list item link URL"

**Step 1: Check the invalid URL**
```bash
sed -n '2518p' /tmp/export-test.md
```

**Step 2: Extract URL and title**
```bash
LINE=$(sed -n '2518p' /tmp/export-test.md)
echo "$LINE" | grep -oP '\\[.*?\\]\\(.*?\\)'
```

**Step 3: Query database for this resource**
```sql
-- Extract title from line, then query
SELECT id, title, url FROM resources WHERE title LIKE '%{extracted_title}%';
```

**Step 4: Determine issue**
- Malformed URL? (missing protocol, spaces, special chars)
- Wrong markdown syntax?

**Step 5: Fix in database OR formatter**

**If database has bad URL:**
```sql
UPDATE resources SET url = '{corrected_url}' WHERE id = '{resource_id}';
```

**If formatter needs to sanitize:**
Add URL validation/cleaning in formatResource() before line 246:
```typescript
// Validate URL format
if (!url.match(/^https?:\\/\\//)) {
  url = 'https://' + url; // Add protocol if missing
}

// Remove spaces from URL
url = url.replace(/\\s+/g, '');
```

**Step 6: Test**
```bash
npx tsx scripts/test-export.ts
npx awesome-lint /tmp/export-test.md 2>&1 | grep "Invalid list item"
```
Expected: 0 errors (was 1)

**Step 7: Commit**
```bash
git commit -am "fix: Sanitize invalid URL format"
```

---

### Task 2.13: Iteration Loop - Get to 0 Errors (2-4 hours)

**Self-correcting loop:**

```
WHILE errors > 0 AND attempts < 10:
  1. Regenerate export: npx tsx scripts/test-export.ts
  2. Run lint: npx awesome-lint /tmp/export-test.md 2>&1 | tee /tmp/lint-iteration-{N}.txt
  3. Count errors: grep "errors$" /tmp/lint-iteration-{N}.txt
  4. Analyze NEW errors (might be different after fixes)
  5. Categorize: Which type has most errors now?
  6. Fix: Target highest-count error type
  7. Test: Verify error count decreased
  8. Commit: "fix: iteration {N} - {error_type} errors reduced"
  9. Increment N, repeat

WHEN errors == 0:
  SUCCESS!

WHEN errors > 0 AND attempts >= 10:
  Document remaining errors as known limitations
  Create GitHub issue for each
  Continue to WAVE 4
```

**Expected final state:** 0 errors, production-quality export

---

### Task 2.14: Final WAVE 2 Verification (30 min)

**Step 1: Generate final export**
```bash
npx tsx scripts/test-export.ts
cp /tmp/export-test.md /tmp/export-final-wave2.md
```

**Step 2: Run awesome-lint**
```bash
npx awesome-lint /tmp/export-final-wave2.md 2>&1 | tee /tmp/lint-final.txt
```
Expected: "0 errors" OR "≤5 errors" with justification

**Step 3: Manual inspection**
```bash
head -50 /tmp/export-final-wave2.md
```
Verify:
- ✅ Has Awesome badge immediately after title
- ✅ Has table of contents
- ✅ Resources in alphabetical order
- ✅ Descriptions end with periods
- ✅ No consecutive periods
- ✅ No duplicate URLs

**Step 4: Document results**
```bash
cat > docs/WAVE_2_COMPLETE.md << EOF
# WAVE 2: awesome-lint Compliance - COMPLETE

**Baseline:** 45 errors
**Final:** {count} errors
**Improvement:** {percent}%

## Fixes Applied:
1. awesome-badge: Removed blank line after title
2. no-inline-padding: Trimmed titles
3. match-punctuation: Normalized all quote variants
4. awesome-list-item (emoji): Stripped leading emojis
5. Title duplication: Removed "{title}" suffixes
6. Consecutive spaces: Collapsed to single space
7. no-repeat-punctuation: Conservative period fixing
8. Casing: Enhanced first-letter logic
9. awesome-toc: Fixed anchor generation
10. double-link: Database deduplication
11. invalid-url: URL sanitization

## Commits:
- {list commits}

## Evidence:
- /tmp/export-final-wave2.md (2668 lines)
- /tmp/lint-final.txt (full awesome-lint output)

WAVE 2 Status: ✅ COMPLETE
EOF
```

**Step 5: Commit final state**
```bash
git add docs/WAVE_2_COMPLETE.md
git commit -m "docs: WAVE 2 complete - awesome-lint {count} errors (target achieved)"
```

---

## WAVE 4: Manual E2E Verification as End User (Frontend-Driven Testing)

**Prerequisites:** WAVE 2 complete, Docker running, Chrome DevTools MCP ready

**Duration:** 3-4 hours
**Method:** Test ALL features through browser UI with 3-layer validation
**Tool:** Chrome DevTools MCP (not Playwright test files)

---

### Task 4.0: Load Frontend-Driven Testing Skill (5 min)

**MANDATORY FIRST STEP:**

```typescript
Skill({ skill: "frontend-driven-testing" })
```

Expected: Skill expands with:
- Iron Law: All 3 layers required
- Domain knowledge: Awesome list, database schema
- Selectors: Component-specific selectors
- Self-correcting loop: Test → Debug → Fix → Rebuild → Retest
- Diagnostic tree: For when things don't work

**Read the skill completely before proceeding.**

---

### Task 4.1: Flow 1 - Anonymous Browse (20 min)

**Objective:** Verify public can browse without authentication

**Step 1: Navigate to homepage**
```typescript
mcp__chrome-devtools__navigate_page({
  type: 'url',
  url: 'http://localhost:3000'
})
```

**Step 2: Take snapshot**
```typescript
mcp__chrome-devtools__take_snapshot({})
```

**Step 3: Verify 21 categories visible**
```
Check snapshot for:
- "Adaptive Streaming & Manifest Tools" (uid should exist)
- "Encoding & Codecs" (uid should exist)
- ... (all 21 categories)
```

**Step 4: Click a category**
```typescript
// Find Encoding & Codecs link
mcp__chrome-devtools__click({ uid: '{ENCODING_CODECS_UID}' })
```

**Step 5: Verify resources load**
```typescript
mcp__chrome-devtools__take_snapshot({})
```
Expected: 454 resources for Encoding & Codecs

**Step 6: Layer 1 - Network verification**
```typescript
mcp__chrome-devtools__list_network_requests({ resourceTypes: ['fetch'] })
```
Expected: GET /api/resources?status=approved&category=Encoding%20%26%20Codecs → 200

**Step 7: Layer 2 - Database verification**
```sql
SELECT COUNT(*) FROM resources
WHERE status = 'approved' AND category = 'Encoding & Codecs';
```
Expected: 454 (matches UI)

**Step 8: Layer 3 - Responsive verification**
```typescript
// Desktop
mcp__chrome-devtools__resize_page({ width: 1920, height: 1080 })
mcp__chrome-devtools__take_screenshot({
  filePath: '/tmp/wave4-browse-desktop.png',
  fullPage: true
})

// Tablet
mcp__chrome-devtools__resize_page({ width: 768, height: 1024 })
mcp__chrome-devtools__take_screenshot({
  filePath: '/tmp/wave4-browse-tablet.png'
})

// Mobile
mcp__chrome-devtools__resize_page({ width: 375, height: 667 })
mcp__chrome-devtools__take_screenshot({
  filePath: '/tmp/wave4-browse-mobile.png'
})
```

**Step 9: Visual inspection**
```typescript
Read({ file_path: '/tmp/wave4-browse-desktop.png' })
Read({ file_path: '/tmp/wave4-browse-tablet.png' })
Read({ file_path: '/tmp/wave4-browse-mobile.png' })
```

Verify in each:
- ✅ Resources visible and readable
- ✅ Layout not broken
- ✅ Navigation accessible

**Step 10: Document result**
```markdown
## Flow 1: Anonymous Browse ✅ PASS

- Layer 1 (API): GET /api/resources → 200, 454 resources returned
- Layer 2 (DB): COUNT(*) = 454
- Layer 3 (UI): All 3 viewports render correctly
- Evidence: 3 screenshots, network log, SQL result
```

**IF ANY LAYER FAILS:** Invoke systematic-debugging skill, fix bug, rebuild Docker, restart from Step 1

---

### Task 4.2: Flow 2 - User Registration & Login (30 min)

**Objective:** New user can create account and login

**Step 1: Navigate to login**
```typescript
mcp__chrome-devtools__navigate_page({
  type: 'url',
  url: 'http://localhost:3000/login'
})
```

**Step 2: Switch to signup mode**
```typescript
mcp__chrome-devtools__take_snapshot({})
// Find "Sign up" button
mcp__chrome-devtools__click({ uid: '{SIGNUP_BUTTON_UID}' })
```

**Step 3: Fill registration form**
```typescript
mcp__chrome-devtools__fill({ uid: '{EMAIL_UID}', value: 'wave4-test@test.com' })
mcp__chrome-devtools__fill({ uid: '{PASSWORD_UID}', value: 'Wave4Test123!' })
```

**Step 4: Submit**
```typescript
mcp__chrome-devtools__click({ uid: '{SUBMIT_UID}' })
```

**Step 5: Layer 2 - Verify user created**
```sql
SELECT id, email, created_at FROM auth.users
WHERE email = 'wave4-test@test.com';
```
Expected: 1 row, recent created_at

**Step 6: Verify redirect or confirmation**
```typescript
mcp__chrome-devtools__take_snapshot({})
```
Expected: Homepage OR "Check your email" message

**Step 7: Test login**
```typescript
mcp__chrome-devtools__navigate_page({ url: 'http://localhost:3000/login' })
mcp__chrome-devtools__take_snapshot({})
mcp__chrome-devtools__fill({ uid: '{EMAIL_UID}', value: 'wave4-test@test.com' })
mcp__chrome-devtools__fill({ uid: '{PASSWORD_UID}', value: 'Wave4Test123!' })
mcp__chrome-devtools__click({ uid: '{SIGNIN_UID}' })
```

**Step 8: Verify logged in**
```typescript
mcp__chrome-devtools__take_snapshot({})
```
Expected: User menu shows "W" button (first letter of email)

**Step 9: Layer 1 - Check network**
```typescript
mcp__chrome-devtools__list_network_requests({ resourceTypes: ['fetch'] })
```
Expected: POST https://.../auth/v1/token?grant_type=password → 200

**Step 10: Screenshot evidence**
```typescript
mcp__chrome-devtools__take_screenshot({
  filePath: '/tmp/wave4-login-success.png',
  fullPage: true
})
```

**Step 11: Document**
```markdown
## Flow 2: Registration & Login ✅ PASS

- Registration: User created in auth.users
- Login: Token received, user menu visible
- All 3 layers verified
```

**IF FAILS:** Debug, fix, rebuild, restart flow

---

### Task 4.3: Flow 3 - Favorites & Bookmarks (40 min)

**Objective:** Logged-in user can favorite and bookmark resources

**Prerequisite:** Logged in as wave4-test@test.com from Task 4.2

**Step 1: Navigate to category**
```typescript
mcp__chrome-devtools__navigate_page({
  url: 'http://localhost:3000/category/encoding-codecs'
})
mcp__chrome-devtools__take_snapshot({})
```

**Step 2: Find favorite button on first resource**
```
Snapshot will show resources with buttons
Find: button with aria-label containing "favorite" or star icon
```

**Step 3: Click favorite**
```typescript
mcp__chrome-devtools__click({ uid: '{FAVORITE_BUTTON_UID}' })
```

**Step 4: Layer 2 - Verify in database**
```sql
SELECT user_id, resource_id, created_at
FROM user_favorites
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'wave4-test@test.com'
)
ORDER BY created_at DESC LIMIT 1;
```
Expected: 1 row, recent timestamp

**Step 5: Layer 1 - Check network**
```typescript
mcp__chrome-devtools__list_network_requests({ resourceTypes: ['fetch'] })
```
Expected: POST /api/favorites/{resourceId} → 200

**Step 6: Navigate to profile**
```typescript
// Click user menu
mcp__chrome-devtools__click({ uid: '{USER_MENU_UID}' })
mcp__chrome-devtools__take_snapshot({})
// Click Profile
mcp__chrome-devtools__click({ uid: '{PROFILE_MENU_ITEM_UID}' })
```

**Step 7: Verify favorite appears in profile**
```typescript
mcp__chrome-devtools__take_snapshot({})
```
Expected: Favorites tab shows the favorited resource

**Step 8: Click Favorites tab**
```typescript
mcp__chrome-devtools__click({ uid: '{FAVORITES_TAB_UID}' })
mcp__chrome-devtools__take_snapshot({})
```

**Step 9: Layer 3 - Responsive verification (favorites list)**
```typescript
mcp__chrome-devtools__resize_page({ width: 1920, height: 1080 })
mcp__chrome-devtools__take_screenshot({ filePath: '/tmp/wave4-favorites-desktop.png', fullPage: true })

mcp__chrome-devtools__resize_page({ width: 768, height: 1024 })
mcp__chrome-devtools__take_screenshot({ filePath: '/tmp/wave4-favorites-tablet.png' })

mcp__chrome-devtools__resize_page({ width: 375, height: 667 })
mcp__chrome-devtools__take_screenshot({ filePath: '/tmp/wave4-favorites-mobile.png' })
```

**Step 10: Test bookmark flow (similar pattern)**
- Navigate back to category
- Click bookmark button
- Add notes: "Wave 4 test bookmark"
- Verify in database
- Check network (POST /api/bookmarks/{id})
- View in profile bookmarks tab
- Screenshot 3 viewports

**Step 11: Document**
```markdown
## Flow 3: Favorites & Bookmarks ✅ PASS

**Favorites:**
- API: POST /api/favorites/{id} → 200
- Database: Row created in user_favorites
- UI: Visible in profile, all 3 viewports

**Bookmarks:**
- API: POST /api/bookmarks/{id} → 200
- Database: Row with notes in user_bookmarks
- UI: Notes visible, all 3 viewports

Evidence: 6 screenshots, 2 SQL results, network logs
```

**IF FAILS:** systematic-debugging → fix → rebuild → restart

---

### Task 4.4: Flow 4 - Preferences (Already Tested in WAVE 1)

**Step 1: Navigate to Settings tab**
```typescript
mcp__chrome-devtools__navigate_page({ url: 'http://localhost:3000/profile' })
mcp__chrome-devtools__take_snapshot({})
mcp__chrome-devtools__click({ uid: '{SETTINGS_TAB_UID}' })
```

**Step 2: Verify form loaded with data** (from WAVE 1 verification)
```typescript
mcp__chrome-devtools__take_snapshot({})
```
Expected: All 5 fields populated

**Step 3: Modify a field**
```typescript
// Find categories textarea
mcp__chrome-devtools__take_snapshot({})
mcp__chrome-devtools__fill({
  uid: '{CATEGORIES_TEXTAREA_UID}',
  value: 'Encoding & Codecs, Players & Clients, AI Tools, Video Streaming'
})
```

**Step 4: Click Save**
```typescript
mcp__chrome-devtools__click({ uid: '{SAVE_BUTTON_UID}' })
```

**Step 5: Wait for success toast**
```typescript
mcp__chrome-devtools__wait_for({ text: 'Preferences saved', timeout: 5000 })
```

**Step 6: Layer 1 - Network**
```typescript
mcp__chrome-devtools__list_network_requests({ resourceTypes: ['fetch'] })
```
Expected: POST /api/user/preferences → 200

**Step 7: Layer 2 - Database**
```sql
SELECT preferred_categories, updated_at
FROM user_preferences
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'wave4-test@test.com');
```
Expected: Array contains "Video Streaming", updated_at recent

**Step 8: Reload and verify persistence**
```typescript
mcp__chrome-devtools__navigate_page({ type: 'reload' })
mcp__chrome-devtools__click({ uid: '{SETTINGS_TAB_UID}' })
mcp__chrome-devtools__take_snapshot({})
```
Expected: Categories field shows "Video Streaming" (persisted)

**Step 9: Screenshot 3 viewports**

**Step 10: Document**
```markdown
## Flow 4: Preferences ✅ PASS

- Save: POST → 200, DB updated, toast shown
- Load: GET → 200, form populated from DB
- Persistence: Survives reload
- Responsive: All 3 viewports functional
```

---

### Task 4.5: Flow 5 - Learning Journey (45 min)

**Objective:** User can enroll in journey and track progress

**Step 1: Check if journeys exist in database**
```sql
SELECT id, title, difficulty, status
FROM learning_journeys
WHERE status = 'published'
LIMIT 5;
```

**If 0 rows:** Create test journey first via SQL or skip flow

**Step 2: Navigate to journeys page**
```typescript
mcp__chrome-devtools__navigate_page({ url: 'http://localhost:3000/journeys' })
mcp__chrome-devtools__take_snapshot({})
```

**Step 3: Click a journey**
```typescript
mcp__chrome-devtools__click({ uid: '{JOURNEY_CARD_UID}' })
```

**Step 4: Click "Start Journey" or "Enroll"**
```typescript
mcp__chrome-devtools__take_snapshot({})
mcp__chrome-devtools__click({ uid: '{START_JOURNEY_UID}' })
```

**Step 5: Layer 2 - Verify enrollment**
```sql
SELECT journey_id, current_step_id, started_at
FROM user_journey_progress
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'wave4-test@test.com')
ORDER BY started_at DESC LIMIT 1;
```
Expected: 1 row, journey_id matches

**Step 6: Layer 1 - Network**
```typescript
mcp__chrome-devtools__list_network_requests({ resourceTypes: ['fetch'] })
```
Expected: POST /api/journeys/{id}/enroll → 200 OR similar

**Step 7: Complete a step**
```typescript
mcp__chrome-devtools__take_snapshot({})
// Find "Complete Step" or checkbox
mcp__chrome-devtools__click({ uid: '{COMPLETE_STEP_UID}' })
```

**Step 8: Verify progress in database**
```sql
SELECT completed_steps FROM user_journey_progress
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'wave4-test@test.com');
```
Expected: Array contains step ID

**Step 9: Screenshot 3 viewports**

**Step 10: Document**
```markdown
## Flow 5: Learning Journey ✅ PASS

- Enroll: user_journey_progress row created
- Progress: completed_steps array updated
- UI: Progress bar reflects completion
- All 3 layers verified
```

**IF FAILS:** Debug, fix, rebuild, restart

---

### Task 4.6: Flow 6 - Admin Approval Workflow (50 min)

**Objective:** Admin can approve submitted resources, visible publicly

**Step 1: Logout current user**
```typescript
mcp__chrome-devtools__click({ uid: '{USER_MENU_UID}' })
mcp__chrome-devtools__click({ uid: '{LOGOUT_UID}' })
```

**Step 2: Create test submission via database** (faster than UI)
```sql
INSERT INTO resources (title, url, description, category, status, submitted_by)
VALUES (
  'Wave 4 Test Resource',
  'https://wave4-test.example.com',
  'Test resource for WAVE 4 approval verification.',
  'General Tools',
  'pending',
  (SELECT id FROM auth.users WHERE email = 'wave4-test@test.com')
)
RETURNING id;
```
Save the returned ID

**Step 3: Login as admin**
```typescript
mcp__chrome-devtools__navigate_page({ url: 'http://localhost:3000/login' })
mcp__chrome-devtools__take_snapshot({})
mcp__chrome-devtools__fill({ uid: '{EMAIL_UID}', value: 'admin@test.com' })
mcp__chrome-devtools__fill({ uid: '{PASSWORD_UID}', value: 'TestAdmin123!' })
mcp__chrome-devtools__click({ uid: '{SIGNIN_UID}' })
```

**Step 4: Navigate to admin approvals**
```typescript
// Might be /admin or /admin/approvals
mcp__chrome-devtools__navigate_page({ url: 'http://localhost:3000/admin' })
mcp__chrome-devtools__take_snapshot({})
```

**Step 5: Find pending resource**
```
Search snapshot for "Wave 4 Test Resource"
Find approve button (data-testid="button-approve-{id}")
```

**Step 6: Click approve**
```typescript
mcp__chrome-devtools__click({ uid: '{APPROVE_BUTTON_UID}' })
mcp__chrome-devtools__take_snapshot({})
// Might have confirmation dialog
mcp__chrome-devtools__click({ uid: '{CONFIRM_UID}' })
```

**Step 7: Layer 2 - Database verification**
```sql
SELECT id, status, approved_by, approved_at
FROM resources
WHERE title = 'Wave 4 Test Resource';
```
Expected: status='approved', approved_by = admin ID, approved_at NOT NULL

**Step 8: Layer 2b - Audit log verification (CRITICAL)**
```sql
SELECT resource_id, action, performed_by, created_at
FROM resource_audit_log
WHERE resource_id = '{test_resource_id}'
ORDER BY created_at DESC LIMIT 1;
```
Expected: action='approved', performed_by = admin ID

**Step 9: Layer 1 - Network**
```typescript
mcp__chrome-devtools__list_network_requests({ resourceTypes: ['fetch'] })
```
Expected: PUT /api/resources/{id}/approve → 200

**Step 10: Logout admin**

**Step 11: Verify public visibility (anonymous)**
```typescript
mcp__chrome-devtools__navigate_page({ url: 'http://localhost:3000/category/general-tools' })
mcp__chrome-devtools__take_snapshot({})
```
Expected: "Wave 4 Test Resource" visible in list

**Step 12: Layer 3 - Screenshot 3 viewports of public page**

**Step 13: Document**
```markdown
## Flow 6: Admin Approval ✅ PASS

- Submit: Resource created with status='pending'
- Approve: Status → 'approved', approved_by set
- Audit: resource_audit_log entry created
- Public: Resource visible on category page
- All 3 layers + 3 viewports verified
```

**IF FAILS:** Debug API 500 errors (per WAVE 3 findings), fix backend

---

### Task 4.7: Flow 7 - Bulk Operations (1 hour)

**Objective:** Admin can bulk approve multiple resources atomically

**Step 1: Create 5 test resources**
```sql
WITH test_user AS (
  SELECT id FROM auth.users WHERE email = 'wave4-test@test.com' LIMIT 1
)
INSERT INTO resources (title, url, description, category, status, submitted_by)
SELECT
  'Bulk Test Resource ' || generate_series,
  'https://bulk-test-' || generate_series || '.example.com',
  'Test resource ' || generate_series || ' for bulk operations.',
  'General Tools',
  'pending',
  (SELECT id FROM test_user)
FROM generate_series(1, 5)
RETURNING id;
```
Save all 5 IDs

**Step 2: Navigate to admin resources page**
```typescript
mcp__chrome-devtools__navigate_page({ url: 'http://localhost:3000/admin/resources' })
mcp__chrome-devtools__take_snapshot({})
```

**Step 3: Select all 5 checkboxes**
```
Find checkboxes via table structure (ResourceBrowser has NO data-testid)
Pattern: tbody tr → each row has input[type="checkbox"]
```

```typescript
// This requires finding the right UIDs from snapshot
mcp__chrome-devtools__click({ uid: '{CHECKBOX_1_UID}' })
mcp__chrome-devtools__click({ uid: '{CHECKBOX_2_UID}' })
mcp__chrome-devtools__click({ uid: '{CHECKBOX_3_UID}' })
mcp__chrome-devtools__click({ uid: '{CHECKBOX_4_UID}' })
mcp__chrome-devtools__click({ uid: '{CHECKBOX_5_UID}' })
```

**Step 4: Verify bulk toolbar appears**
```typescript
mcp__chrome-devtools__take_snapshot({})
```
Expected: "5 resources selected" text, bulk action buttons

**Step 5: Click Bulk Approve**
```typescript
mcp__chrome-devtools__click({ uid: '{BULK_APPROVE_UID}' })
// Might have confirmation dialog
mcp__chrome-devtools__take_snapshot({})
mcp__chrome-devtools__click({ uid: '{CONFIRM_APPROVE_UID}' })
```

**Step 6: Layer 2 - ATOMIC verification (CRITICAL)**
```sql
SELECT id, title, status FROM resources
WHERE title LIKE 'Bulk Test Resource %'
ORDER BY title;
```
Expected: ALL 5 have status='approved' (NOT mix of approved/pending)

**If MIXED:** CRITICAL BUG - transaction not atomic → STOP

**Step 7: Verify audit log (5 entries)**
```sql
SELECT resource_id, action FROM resource_audit_log
WHERE resource_id IN ('{id1}', '{id2}', '{id3}', '{id4}', '{id5}')
AND action LIKE '%approve%';
```
Expected: 5 rows

**Step 8: Layer 1 - Network**
```typescript
mcp__chrome-devtools__list_network_requests({ resourceTypes: ['fetch'] })
```
Expected: POST /api/admin/resources/bulk → 200

**Step 9: Verify public visibility**
```typescript
mcp__chrome-devtools__navigate_page({ url: 'http://localhost:3000/category/general-tools' })
mcp__chrome-devtools__take_snapshot({})
```
Expected: All 5 "Bulk Test Resource" items visible

**Step 10: Screenshot evidence**

**Step 11: Document**
```markdown
## Flow 7: Bulk Operations ✅ PASS

- Atomic: ALL 5 approved together (or NONE)
- Audit: 5 entries created
- Network: Single bulk API call
- Public: All 5 visible
- CRITICAL: Transaction atomicity verified
```

**IF NOT ATOMIC:** This is CRITICAL bug, must fix before production

---

### Task 4.8: Flow 8 - Search & Discovery (35 min)

**Objective:** Search works and filters correctly

**Step 1: Navigate to homepage**
```typescript
mcp__chrome-devtools__navigate_page({ url: 'http://localhost:3000' })
```

**Step 2: Press "/" to open search**
```typescript
mcp__chrome-devtools__press_key({ key: '/' })
mcp__chrome-devtools__take_snapshot({})
```
Expected: Search dialog opens

**Step 3: Search for "ffmpeg"**
```typescript
mcp__chrome-devtools__fill({ uid: '{SEARCH_INPUT_UID}', value: 'ffmpeg' })
```

**Step 4: Verify results appear**
```typescript
// Wait briefly for debounce
mcp__chrome-devtools__evaluate_script({
  function: '() => new Promise(r => setTimeout(r, 500))'
})
mcp__chrome-devtools__take_snapshot({})
```
Expected: Results list with FFmpeg-related resources

**Step 5: Layer 2 - Verify search logic**
```sql
SELECT COUNT(*) FROM resources
WHERE status = 'approved'
AND (
  title ILIKE '%ffmpeg%'
  OR description ILIKE '%ffmpeg%'
  OR to_tsvector('english', title || ' ' || description) @@ to_tsquery('english', 'ffmpeg')
);
```
Expected: Count matches result count in UI

**Step 6: Test category filter**
```typescript
mcp__chrome-devtools__take_snapshot({})
// Find category filter dropdown
mcp__chrome-devtools__click({ uid: '{CATEGORY_FILTER_UID}' })
mcp__chrome-devtools__take_snapshot({})
mcp__chrome-devtools__click({ uid: '{ENCODING_CODECS_OPTION_UID}' })
```

**Step 7: Verify filtered results**
```typescript
mcp__chrome-devtools__take_snapshot({})
```
Expected: Results filtered to Encoding & Codecs category only

**Step 8: Layer 3 - Screenshot 3 viewports with search open**

**Step 9: Document**
```markdown
## Flow 8: Search & Discovery ✅ PASS

- Keyboard shortcut: "/" opens search
- Text search: "ffmpeg" returns correct results
- Filter: Category filter works
- Count: UI matches database count
- Responsive: All 3 viewports functional
```

---

### Task 4.9: WAVE 4 Final Documentation (20 min)

**Step 1: Compile all flow results**
```bash
cat > docs/WAVE_4_COMPLETE.md << EOF
# WAVE 4: Manual E2E Verification - COMPLETE

**Method:** Frontend-driven testing with Chrome DevTools MCP
**Duration:** {actual_time}
**Flows Tested:** 8
**Bugs Found:** {count}
**Bugs Fixed:** {count}

## Flows Verified

### Flow 1: Anonymous Browse ✅
- 21 categories visible
- Resources load correctly
- All 3 layers verified

### Flow 2: User Registration & Login ✅
- Account creation works
- Login successful
- Session persists

### Flow 3: Favorites & Bookmarks ✅
- Add favorite: API + DB + UI ✅
- View favorites: Profile display ✅
- Add bookmark: With notes ✅
- Bookmarks persist

### Flow 4: Preferences ✅
- Form loads with DB values
- Save updates database
- Changes persist across reload

### Flow 5: Learning Journey ✅
- Enrollment creates DB row
- Progress tracking works
- UI reflects completion

### Flow 6: Admin Approval ✅
- Resource approval updates status
- Audit log entry created
- Public visibility confirmed

### Flow 7: Bulk Operations ✅
- Atomic transactions verified
- All selected resources processed together
- Audit logging for all

### Flow 8: Search & Discovery ✅
- Keyboard shortcut works
- Text search accurate
- Category filters functional

## Evidence

**Screenshots:** {count} total (9 per flow × 8 flows minimum)
**Network Logs:** All API calls verified
**Database Queries:** All persistence verified
**Viewports:** Desktop, Tablet, Mobile for each flow

## Bugs Fixed During Testing

{List any bugs found and fixed via systematic-debugging}

## Iron Law Compliance

✅ ALL tests verified all 3 layers
✅ NO "good enough" rationalizations
✅ Responsive verified (3 viewports each)
✅ Visual inspection via Read tool

WAVE 4 Status: ✅ COMPLETE
EOF
```

**Step 2: Commit**
```bash
git add docs/WAVE_4_COMPLETE.md
git commit -m "docs: WAVE 4 E2E verification complete - all flows passing"
```

---

## Success Criteria

### WAVE 2 Complete When:
- ✅ awesome-lint returns 0 errors (or ≤5 with justification)
- ✅ Export file has proper structure (badge, TOC, format)
- ✅ All formatter fixes tested and committed
- ✅ Database cleaned (no duplicate URLs)
- ✅ docs/WAVE_2_COMPLETE.md created

### WAVE 4 Complete When:
- ✅ All 8 flows tested via Chrome DevTools MCP
- ✅ Each flow verified at all 3 layers (API, Database, UI)
- ✅ Each flow verified at 3 viewports (desktop, tablet, mobile)
- ✅ All bugs found during testing are fixed
- ✅ docs/WAVE_4_COMPLETE.md created with evidence

---

## Execution Notes

**For executing-plans skill:**
- Review after Task 2.2, 2.5, 2.8, 2.13 (WAVE 2 checkpoints)
- Review after Task 4.3, 4.6, 4.9 (WAVE 4 checkpoints)

**Self-correcting loop:**
- WAVE 2: Generate → Lint → Fix → Repeat until 0 errors
- WAVE 4: Test → If fail → Debug → Fix → Rebuild → Retest

**Token budget:** ~150K for WAVE 2, ~80K for WAVE 4

---

**Plan Status:** ✅ READY FOR EXECUTION
**Format:** Bite-sized tasks (2-5 min each)
**Skills:** frontend-driven-testing (WAVE 4), systematic-debugging (when bugs found)
**Next:** `/superpowers:execute-plan docs/plans/2025-12-03-wave-2-and-4-completion.md`

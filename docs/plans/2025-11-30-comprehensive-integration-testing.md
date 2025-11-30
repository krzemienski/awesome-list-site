# Comprehensive Integration Testing Plan

> **For Claude:** REQUIRED SUB-SKILLS:
> - Use @superpowers:executing-plans to implement these tests in order
> - Use @playwright-skill for browser automation across multiple contexts
> - Use @superpowers:systematic-debugging if any test fails unexpectedly

**Goal:** Verify end-to-end integration across user contexts (admin → database → public, user A → RLS → user B) to ensure production readiness

**Architecture:** Multi-context browser testing with database verification layer. Each test spans admin session → database state → anonymous verification.

**Tech Stack:** Playwright (multiple contexts), Supabase MCP (database verification), Chrome DevTools MCP (manual fallback)

**Current Gap**: We've tested individual components and APIs, but NOT cross-context integration flows

**Target**: 50+ integration tests covering all critical workflows

---

## Test Categories

### Category 1: Admin Changes → Public Visibility (15 tests, P0)
Verify admin edits, approvals, and bulk operations appear correctly to anonymous users

### Category 2: User Data Isolation (RLS) (12 tests, P0 Security)
Verify User A's private data (favorites, bookmarks, progress) not accessible to User B

### Category 3: Resource Lifecycle (10 tests, P1)
Verify Submit → Pending → Approve/Reject → Public visibility flow

### Category 4: Search & Filter Integration (8 tests, P1)
Verify search finds recently edited/added resources, filters work correctly

### Category 5: Cache & State Consistency (5 tests, P2)
Verify edits persist through navigation, logout, browser refresh

---

## SCENARIO 1: Admin Edit Resource → Public Sees Change

**Priority**: P0 CRITICAL
**Duration**: 30 minutes to build, 5 minutes to run
**Contexts**: 2 (Admin browser + Anonymous browser)

### Test 1.1: Admin Edit Title → Anonymous Verifies (10 min to build)

**File**: tests/integration/admin-to-public.spec.ts

**Setup:**
```typescript
import { test, expect, chromium } from '@playwright/test';

test.describe('Admin Changes → Public Visibility', () => {
  test('admin edits resource title → anonymous user sees new title', async () => {
    const browser = await chromium.launch({ headless: false });

    // Shared test data
    const TEST_RESOURCE_URL = 'https://ffmpeg.org/ffmpeg-all.html';
    const OLD_TITLE = 'FFmpeg Documentation';  // Known existing title
    const NEW_TITLE = `FFmpeg Complete Guide ${Date.now()}`;  // Unique for this test

    let resourceId: string;
```

**Step 1: Admin Context - Make Edit**
```typescript
    // Browser A: Admin session
    const adminContext = await browser.newContext({
      storageState: './tests/fixtures/admin-auth.json'
    });
    const adminPage = await adminContext.newPage();

    // Navigate to admin resources
    await adminPage.goto('http://localhost:3000/admin/resources');
    await adminPage.waitForSelector('table');

    // Find resource by URL (more reliable than title)
    const resourceRow = adminPage.locator(`tr:has(a[href="${TEST_RESOURCE_URL}"])`);
    await expect(resourceRow).toBeVisible();

    // Open edit menu
    await resourceRow.locator('button[aria-label="Open menu"]').click();
    await adminPage.locator('text=Edit').click();

    // Wait for modal
    await adminPage.waitForSelector('[role="dialog"]');

    // Change title
    const titleInput = adminPage.locator('input[name="title"]');
    await titleInput.fill(NEW_TITLE);

    // Scroll modal to bottom (known issue from Session 7)
    await adminPage.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (modal) modal.scrollTo({ top: modal.scrollHeight });
    });
    await adminPage.waitForTimeout(500);

    // Save
    await adminPage.locator('button:has-text("Save")').click({ force: true });

    // Wait for modal to close
    await adminPage.waitForSelector('[role="dialog"]', { state: 'detached', timeout: 5000 });

    console.log('✅ Admin edited title to:', NEW_TITLE);

    // Close admin context
    await adminContext.close();
```

**Step 2: Database Verification**
```typescript
    // Verify database updated (using Supabase MCP in actual implementation)
    // For now, capture resourceId for next step
    // In real test, query:
    // SELECT title FROM resources WHERE url = 'https://ffmpeg.org/ffmpeg-all.html';
    // Expect: title = NEW_TITLE

    console.log('✅ Database verified (would use Supabase MCP)');
```

**Step 3: Anonymous Context - Verify Change Visible**
```typescript
    // Browser B: Fresh anonymous session (no auth)
    const anonContext = await browser.newContext();  // No storageState = no auth
    const anonPage = await anonContext.newPage();

    // Navigate to public category page
    await anonPage.goto('http://localhost:3000/category/encoding-codecs');
    await anonPage.waitForSelector('text=Encoding & Codecs');

    // Search for the edited resource by new title
    const resourceCard = anonPage.locator(`text=${NEW_TITLE}`);

    // CRITICAL VERIFICATION: Anonymous user sees admin's edit
    await expect(resourceCard).toBeVisible({ timeout: 5000 });

    console.log('✅ Anonymous user sees edited title on public page');

    // Verify old title NOT present
    const oldTitleLocator = anonPage.locator(`text=${OLD_TITLE}`);
    await expect(oldTitleLocator).not.toBeVisible();

    console.log('✅ Old title no longer visible');

    // Close anonymous context
    await anonContext.close();
    await browser.close();

    console.log('✅ TEST PASSED: Admin edit flows through to public pages');
  });
});
```

**Verification Points:**
- ✅ Admin can open edit modal
- ✅ Admin can save changes
- ✅ Database reflects changes
- ✅ **Anonymous user sees changes on public page**
- ✅ Old title no longer visible

---

## SCENARIO 2: RLS User Isolation Verification

**Priority**: P0 SECURITY CRITICAL
**Duration**: 45 minutes to build, 10 minutes to run
**Contexts**: 3 (User A, User B, Admin)

### Test 2.1: User A Favorites → User B Cannot See (15 min to build)

**File**: tests/integration/user-isolation.spec.ts

**Setup:**
```typescript
test.describe('RLS User Data Isolation', () => {
  test('User A favorites → User B cannot access', async () => {
    const browser = await chromium.launch({ headless: false });

    const TEST_RESOURCE_ID = 'known-resource-uuid';  // Use actual resource from DB
```

**Step 1: User A - Add Favorite**
```typescript
    // Context 1: User A
    const userAContext = await browser.newContext({
      storageState: './tests/fixtures/user-a-auth.json'
    });
    const userAPage = await userAContext.newPage();

    // Navigate to resource and favorite it
    await userAPage.goto('http://localhost:3000/category/encoding-codecs');

    // Find resource and click favorite button
    const favoriteButton = userAPage.locator(`[data-resource-id="${TEST_RESOURCE_ID}"] button:has-text("Favorite")`);
    await favoriteButton.click();

    // Wait for toast confirmation
    await userAPage.waitForSelector('text=Added to favorites', { timeout: 3000 });

    console.log('✅ User A added favorite');

    // Verify in User A's profile
    await userAPage.goto('http://localhost:3000/profile');
    await userAPage.click('tab:has-text("Favorites")');
    const favoritesList = userAPage.locator('[data-testid="favorites-list"]');
    await expect(favoritesList).toContainText('FFmpeg');  // Or resource title

    console.log('✅ User A sees favorite in own profile');

    await userAContext.close();
```

**Step 2: Database Verification (Via Supabase MCP)**
```sql
-- In actual implementation, use Supabase MCP:
SELECT * FROM user_favorites
WHERE user_id = '{user_a_id}'
  AND resource_id = '{TEST_RESOURCE_ID}';

-- Expect: 1 row
-- Verify: created_at is recent
```

**Step 3: User B - Attempt to Access**
```typescript
    // Context 2: User B (different user)
    const userBContext = await browser.newContext({
      storageState: './tests/fixtures/user-b-auth.json'
    });
    const userBPage = await userBContext.newPage();

    // Navigate to User B's profile
    await userBPage.goto('http://localhost:3000/profile');
    await userBPage.click('tab:has-text("Favorites")');

    // CRITICAL: Verify User B does NOT see User A's favorite
    const userBFavoritesList = userBPage.locator('[data-testid="favorites-list"]');

    // Should show empty state or "No favorites"
    await expect(userBPage.locator('text=No favorites')).toBeVisible();

    // Should NOT contain User A's favorited resource
    await expect(userBFavoritesList).not.toContainText('FFmpeg');

    console.log('✅ User B cannot see User A\'s favorites (RLS working)');

    await userBContext.close();
```

**Step 4: API-Level Verification**
```typescript
    // User B tries to fetch favorites via API (should also be blocked)
    const userBApiContext = await browser.newContext({
      storageState: './tests/fixtures/user-b-auth.json'
    });
    const userBApiPage = await userBApiContext.newPage();

    const favoritesResponse = await userBApiPage.request.get('http://localhost:3000/api/favorites');
    const favorites = await favoritesResponse.json();

    // CRITICAL: API should return empty array for User B
    expect(favorites).toHaveLength(0);

    console.log('✅ API also blocks User B from User A\'s data');

    await userBApiContext.close();
```

**Step 5: Database RLS Verification (Via Supabase MCP)**
```sql
-- Set PostgreSQL context as User B
SET request.jwt.claims TO '{"sub":"{user_b_id}"}';

-- Try to query User A's favorites
SELECT * FROM user_favorites WHERE user_id = '{user_a_id}';

-- Expected: 0 rows (RLS blocks User B from seeing User A's data)

-- Verify User B can see own data
SELECT * FROM user_favorites WHERE user_id = '{user_b_id}';
-- Expected: Shows User B's own favorites only
```

**Step 6: Cleanup**
```typescript
    // Remove test favorite (cleanup)
    const cleanupContext = await browser.newContext({
      storageState: './tests/fixtures/user-a-auth.json'
    });
    const cleanupPage = await cleanupContext.newPage();

    await cleanupPage.goto('http://localhost:3000/category/encoding-codecs');
    await cleanupPage.locator(`[data-resource-id="${TEST_RESOURCE_ID}"] button:has-text("Favorite")`).click();

    await cleanupContext.close();
    await browser.close();

    console.log('✅ Test cleanup complete');
  });
});
```

**Verification Points:**
- ✅ User A can add favorite
- ✅ Database has User A's favorite
- ✅ **User B cannot see User A's favorite (UI)**
- ✅ **User B cannot access via API (RLS)**
- ✅ **Database RLS blocks cross-user queries**

---

## SCENARIO 3: Complete Resource Lifecycle

**Priority**: P0 CRITICAL
**Duration**: 60 minutes to build, 10 minutes to run
**Contexts**: 2 (Anonymous submitter → Admin reviewer → Anonymous viewer)

### Test 3.1: Submit → Approve → Visible Flow (20 min to build)

**File**: tests/integration/resource-lifecycle.spec.ts

**Step 1: Anonymous User - Submit Resource**
```typescript
test('complete resource lifecycle: submit → approve → public', async () => {
  const browser = await chromium.launch({ headless: false });

  const TEST_RESOURCE = {
    title: `Integration Test Resource ${Date.now()}`,
    url: `https://test.example.com/resource-${Date.now()}`,
    description: 'End-to-end integration test resource',
    category: 'General Tools'
  };

  // Context 1: Anonymous user (no auth)
  const anonContext = await browser.newContext();
  const anonPage = await anonContext.newPage();

  // Navigate to submit page
  await anonPage.goto('http://localhost:3000/submit');

  // Fill form
  await anonPage.fill('input[name="title"]', TEST_RESOURCE.title);
  await anonPage.fill('input[name="url"]', TEST_RESOURCE.url);
  await anonPage.fill('textarea[name="description"]', TEST_RESOURCE.description);
  await anonPage.selectOption('select[name="category"]', TEST_RESOURCE.category);

  // Submit
  await anonPage.click('button[type="submit"]');

  // Wait for success message
  await anonPage.waitForSelector('text=Thank you for your submission', { timeout: 5000 });

  console.log('✅ Step 1: Anonymous user submitted resource');

  await anonContext.close();
```

**Step 2: Database Verification - Resource in Pending**
```sql
-- Via Supabase MCP
SELECT id, title, status, submitted_by
FROM resources
WHERE url = '{TEST_RESOURCE.url}';

-- Expect: 1 row
-- Expect: status = 'pending'
-- Expect: submitted_by IS NULL (anonymous)

-- Capture resource ID for next steps
```

**Step 3: Admin - Review and Approve**
```typescript
  // Context 2: Admin
  const adminContext = await browser.newContext({
    storageState: './tests/fixtures/admin-auth.json'
  });
  const adminPage = await adminContext.newPage();

  // Navigate to pending approvals
  await adminPage.goto('http://localhost:3000/admin/approvals');

  // Find the submitted resource
  const pendingResource = adminPage.locator(`text=${TEST_RESOURCE.title}`);
  await expect(pendingResource).toBeVisible();

  console.log('✅ Step 2: Admin sees resource in pending queue');

  // Approve resource
  const approveButton = adminPage.locator(`tr:has-text("${TEST_RESOURCE.title}") button:has-text("Approve")`);
  await approveButton.click();

  // Wait for toast or confirmation
  await adminPage.waitForSelector('text=approved', { timeout: 5000 });

  console.log('✅ Step 3: Admin approved resource');

  await adminContext.close();
```

**Step 4: Database Verification - Status Changed**
```sql
-- Via Supabase MCP
SELECT status, approved_by, approved_at
FROM resources
WHERE url = '{TEST_RESOURCE.url}';

-- Expect: status = 'approved'
-- Expect: approved_by = '{admin_user_id}'
-- Expect: approved_at IS NOT NULL (recent timestamp)
```

**Step 5: Anonymous Context - Verify Public Visibility**
```typescript
  // Context 3: Fresh anonymous user (simulating different person)
  const publicContext = await browser.newContext();  // No auth
  const publicPage = await publicContext.newPage();

  // Navigate to public category page
  await publicPage.goto('http://localhost:3000/category/general-tools');

  // CRITICAL VERIFICATION: Newly approved resource is visible
  const publicResource = publicPage.locator(`text=${TEST_RESOURCE.title}`);
  await expect(publicResource).toBeVisible({ timeout: 5000 });

  console.log('✅ Step 4: Anonymous user sees approved resource on public page');

  // Click resource link
  await publicResource.click();

  // Verify opens in new tab with correct URL
  const [newPage] = await Promise.all([
    publicContext.waitForEvent('page'),
    publicResource.click()
  ]);

  expect(newPage.url()).toBe(TEST_RESOURCE.url);

  console.log('✅ Step 5: Resource link works correctly');

  await publicContext.close();
```

**Step 6: Cleanup**
```typescript
  // Delete test resource (via database)
  // In actual implementation:
  // await db.execute('DELETE FROM resources WHERE url = $1', [TEST_RESOURCE.url]);

  await browser.close();

  console.log('✅ TEST PASSED: Complete resource lifecycle verified');
});
```

**Verification Matrix:**
| Step | Actor | Action | Verification |
|------|-------|--------|--------------|
| 1 | Anonymous | Submit | Toast shows success |
| 2 | Database | Check | status='pending', submitted_by=null |
| 3 | Admin | Review | Resource visible in /admin/approvals |
| 4 | Admin | Approve | Toast shows approved |
| 5 | Database | Check | status='approved', approved_by set |
| 6 | Anonymous | Browse | Resource visible on /category/general-tools |
| 7 | Anonymous | Click | Opens correct URL |

**This is TRUE end-to-end integration testing.**

---

## SCENARIO 4: Rejected Resources Not Visible

### Test 3.2: Admin Rejects → Not on Public Pages (10 min to build)

**Same flow as 3.1, but:**

**Step 1-3**: Submit resource, admin reviews

**Step 4: Admin Rejects (Instead of Approve)**
```typescript
const rejectButton = adminPage.locator(`tr:has-text("${TEST_RESOURCE.title}") button:has-text("Reject")`);
await rejectButton.click();

// Optionally enter rejection reason
await adminPage.fill('textarea[name="reason"]', 'Does not meet quality standards');
await adminPage.click('button:has-text("Confirm")');
```

**Step 5: Database Verification**
```sql
SELECT status FROM resources WHERE url = '{TEST_RESOURCE.url}';
-- Expect: status = 'rejected'
```

**Step 6: Anonymous User - Verify NOT Visible**
```typescript
await publicPage.goto('http://localhost:3000/category/general-tools');

// CRITICAL: Rejected resource should NOT appear
const rejectedResource = publicPage.locator(`text=${TEST_RESOURCE.title}`);
await expect(rejectedResource).not.toBeVisible();

console.log('✅ Rejected resource correctly hidden from public');
```

---

## SCENARIO 5: Bulk Operations Integration

### Test 1.2: Bulk Archive → Public Verification (15 min to build)

**Step 1: Admin - Bulk Archive 3 Resources**
```typescript
// Select 3 resources via checkboxes
await adminPage.locator('tbody tr').nth(0).locator('input[type="checkbox"]').click();
await adminPage.locator('tbody tr').nth(1).locator('input[type="checkbox"]').click();
await adminPage.locator('tbody tr').nth(2).locator('input[type="checkbox"]').click();

// Capture resource titles for later verification
const titles = await Promise.all([
  adminPage.locator('tbody tr').nth(0).locator('td').nth(1).textContent(),
  adminPage.locator('tbody tr').nth(1).locator('td').nth(1).textContent(),
  adminPage.locator('tbody tr').nth(2).locator('td').nth(1).textContent(),
]);

// Verify bulk toolbar appears
await expect(adminPage.locator('text=3 resources selected')).toBeVisible();

// Click Archive
await adminPage.click('button:has-text("Archive")');

// Confirm
await adminPage.click('button:has-text("Confirm")');

// Wait for success
await adminPage.waitForSelector('text=Successfully archived');

console.log('✅ Admin bulk archived 3 resources:', titles);
```

**Step 2: Database - Verify 3 Archived**
```sql
SELECT COUNT(*) FROM resources
WHERE title IN ('{title1}', '{title2}', '{title3}')
  AND status = 'archived';

-- Expect: 3
```

**Step 3: Audit Log - Verify Actions Logged**
```sql
SELECT action, resource_id, performed_by
FROM resource_audit_log
WHERE action = 'bulk_status_archived'
  AND created_at > NOW() - INTERVAL '1 minute'
ORDER BY created_at DESC;

-- Expect: 3 rows (one per resource)
-- Expect: performed_by = admin_user_id
```

**Step 4: Anonymous - Verify Not Visible on Public Pages**
```typescript
const publicContext = await browser.newContext();
const publicPage = await publicContext.newPage();

await publicPage.goto('http://localhost:3000/category/general-tools');

// CRITICAL: None of the 3 archived resources should appear
for (const title of titles) {
  const archivedResource = publicPage.locator(`text=${title}`);
  await expect(archivedResource).not.toBeVisible();
  console.log(`✅ Archived resource "${title}" not visible to public`);
}
```

**Step 5: Admin - Verify in Archived Filter**
```typescript
const adminContext2 = await browser.newContext({
  storageState: './tests/fixtures/admin-auth.json'
});
const adminPage2 = await adminContext2.newPage();

await adminPage2.goto('http://localhost:3000/admin/resources');

// Filter by "Archived" status
await adminPage2.selectOption('select[name="status"]', 'archived');

// Verify 3 archived resources visible to admin
for (const title of titles) {
  await expect(adminPage2.locator(`text=${title}`)).toBeVisible();
}

console.log('✅ Admin can still see archived resources via filter');
```

---

## SCENARIO 6: Search Integration with Recent Changes

### Test 4.1: Edit Resource → Search Finds New Title (10 min to build)

**Step 1: Admin edits resource title**
```typescript
// Edit "FFmpeg Guide" → "FFmpeg Complete Tutorial 2025"
// (Same as Scenario 1 steps)
```

**Step 2: Anonymous user searches for new title**
```typescript
const searchContext = await browser.newContext();
const searchPage = await searchContext.newPage();

await searchPage.goto('http://localhost:3000');

// Open search (keyboard shortcut now works!)
await searchPage.keyboard.press('/');

// Type new title
await searchPage.fill('input[type="search"]', 'FFmpeg Complete Tutorial 2025');

// Wait for debounce (300ms)
await searchPage.waitForTimeout(500);

// CRITICAL: Search finds recently edited resource
const searchResults = searchPage.locator('[role="listbox"] [role="option"]');
await expect(searchResults.first()).toContainText('FFmpeg Complete Tutorial 2025');

console.log('✅ Search finds resource by new title immediately after edit');
```

**Step 3: Verify old title NOT found**
```typescript
// Search for old title
await searchPage.fill('input[type="search"]', 'FFmpeg Guide');
await searchPage.waitForTimeout(500);

// Should show "No results" or not find it
const noResults = searchPage.locator('text=No results');
await expect(noResults).toBeVisible();

console.log('✅ Search does not find old title (cache updated)');
```

---

## Test Helper Functions (Required Infrastructure)

**File**: tests/helpers/multi-context.ts

```typescript
import { Browser, BrowserContext, Page } from '@playwright/test';

export class MultiContextTestHelper {
  private browser: Browser;
  private contexts: Map<string, BrowserContext> = new Map();

  constructor(browser: Browser) {
    this.browser = browser;
  }

  async createAdminContext(): Promise<{ context: BrowserContext, page: Page }> {
    const context = await this.browser.newContext({
      storageState: './tests/fixtures/admin-auth.json'
    });
    this.contexts.set('admin', context);
    const page = await context.newPage();
    return { context, page };
  }

  async createUserContext(userId: 'A' | 'B'): Promise<{ context: BrowserContext, page: Page }> {
    const context = await this.browser.newContext({
      storageState: `./tests/fixtures/user-${userId.toLowerCase()}-auth.json`
    });
    this.contexts.set(`user${userId}`, context);
    const page = await context.newPage();
    return { context, page };
  }

  async createAnonymousContext(): Promise<{ context: BrowserContext, page: Page }> {
    const context = await this.browser.newContext();  // No storageState = no auth
    this.contexts.set('anonymous', context);
    const page = await context.newPage();
    return { context, page };
  }

  async closeAll() {
    for (const context of this.contexts.values()) {
      await context.close();
    }
    this.contexts.clear();
  }
}

// Usage in tests:
test('example', async ({ browser }) => {
  const helper = new MultiContextTestHelper(browser);

  const { page: adminPage } = await helper.createAdminContext();
  const { page: anonPage } = await helper.createAnonymousContext();

  // ... test steps

  await helper.closeAll();
});
```

**File**: tests/helpers/database.ts

```typescript
// Database verification helpers (use Supabase MCP)

export async function queryResource(resourceId: string) {
  // In actual implementation, use Supabase MCP:
  // const result = await supabase.from('resources').select('*').eq('id', resourceId);
  // return result.data[0];
}

export async function verifyResourceStatus(url: string, expectedStatus: string) {
  // Query DB and assert status matches
}

export async function verifyUserFavorites(userId: string, expectedCount: number) {
  // Query user_favorites table and assert count
}

export async function cleanupTestResource(url: string) {
  // DELETE FROM resources WHERE url = ...
}
```

---

## Complete Test Suite Structure

```
tests/
├── auth.setup.ts ✅ (Created, needs debugging)
├── integration/
│   ├── admin-to-public.spec.ts (15 tests)
│   │   ├── Admin edit title → Anonymous sees
│   │   ├── Admin edit description → Anonymous sees
│   │   ├── Admin bulk approve → Anonymous sees all
│   │   ├── Admin bulk archive → Anonymous sees none
│   │   └── Admin bulk reject → Anonymous sees none
│   │
│   ├── user-isolation.spec.ts (12 tests)
│   │   ├── User A favorites → User B blocked
│   │   ├── User A bookmarks → User B blocked
│   │   ├── User A journey progress → User B blocked
│   │   ├── User A preferences → User B blocked
│   │   ├── Admin sees all users' data
│   │   └── API-level RLS verification
│   │
│   ├── resource-lifecycle.spec.ts (10 tests)
│   │   ├── Submit → Pending → Approve → Public
│   │   ├── Submit → Pending → Reject → Hidden
│   │   ├── Approved → Edit → Still approved
│   │   ├── Approved → Archive → Hidden
│   │   └── Archived → Unarchive → Visible again
│   │
│   ├── search-integration.spec.ts (8 tests)
│   │   ├── Edit title → Search finds new title
│   │   ├── Edit title → Search doesn't find old title
│   │   ├── Add resource → Search finds immediately
│   │   ├── Archive resource → Search doesn't find
│   │   └── Tag resource → Search by tag works
│   │
│   └── cross-feature.spec.ts (5 tests)
│       ├── Favorite → Shows in profile
│       ├── Bookmark with notes → Notes persist
│       ├── Complete journey step → Progress updates
│       └── Submit → Approve → Shows in user submissions
│
├── helpers/
│   ├── multi-context.ts (MultiContextTestHelper class)
│   ├── database.ts (Supabase query helpers)
│   ├── auth.ts (Login/logout helpers)
│   └── assertions.ts (Custom expect helpers)
│
└── fixtures/
    ├── admin-auth.json (Admin session)
    ├── user-a-auth.json (Regular user A)
    ├── user-b-auth.json (Regular user B)
    └── test-data.json (Known resource IDs for tests)
```

---

## SCENARIO 7-31: Additional Integration Tests (25 Total)

### Test 7: GitHub Import → Verify Resources Appear

**Step 1: Admin - Import from Different Awesome List**
```typescript
await adminPage.goto('http://localhost:3000/admin/github');

// Configure repository
await adminPage.fill('input[name="repositoryUrl"]', 'https://github.com/sindresorhus/awesome');
await adminPage.click('button:has-text("Import")');

// Wait for import to complete (may take 30-60 seconds)
await adminPage.waitForSelector('text=Import complete', { timeout: 120000 });

// Note imported resource count
const importCount = await adminPage.locator('text=/Imported \\d+ resources/').textContent();
console.log('✅ Admin imported:', importCount);
```

**Step 2: Database - Verify Resources Created**
```sql
SELECT COUNT(*) FROM resources
WHERE github_synced = true
  AND last_synced_at > NOW() - INTERVAL '2 minutes';

-- Expect: Matches import count
```

**Step 3: Anonymous - Verify New Resources Visible**
```typescript
// Navigate to category that should have new resources
await anonPage.goto('http://localhost:3000');

// Verify total resource count increased
const totalCount = await anonPage.locator('text=/\\d+ curated resources/').textContent();
// Compare with baseline (was 2,650)

console.log('✅ Public sees imported resources');
```

---

### Test 8: User Suggests Edit → Admin Approves → Public Sees

**Step 1: Create New User Account**
```typescript
const signupContext = await browser.newContext();
const signupPage = await signupContext.newPage();

await signupPage.goto('http://localhost:3000/login');

const testEmail = `testuser-${Date.now()}@test.com`;
const testPassword = 'TestPassword123!';

// Sign up
await signupPage.fill('input[name="email"]', testEmail);
await signupPage.fill('input[name="password"]', testPassword);
await signupPage.click('button:has-text("Sign Up")');

// Wait for confirmation
await signupPage.waitForSelector('text=Check your email', { timeout: 10000 });

console.log('✅ New user signed up:', testEmail);

// NOTE: In real test, would need to handle email verification
// For now, manually verify user in database or use test mode
```

**Step 2: New User - Suggest Edit on Resource**
```typescript
// Login as new user (using Supabase test mode or confirmed email)
const userContext = await browser.newContext();  // Would have new user auth
const userPage = await userContext.newPage();

await userPage.goto('http://localhost:3000/category/encoding-codecs');

// Find a resource to edit
await userPage.click('text=FFmpeg Documentation');

// Click "Suggest Edit" button
await userPage.click('button:has-text("Suggest Edit")');

// Fill edit form
await userPage.fill('textarea[name="description"]', 'Updated description with better explanation of FFmpeg features');
await userPage.click('button:has-text("Submit Suggestion")');

// Wait for confirmation
await userPage.waitForSelector('text=Edit suggestion submitted', { timeout: 5000 });

console.log('✅ New user suggested edit');

await userContext.close();
```

**Step 3: Database - Verify Edit in Pending**
```sql
SELECT * FROM resource_edits
WHERE submitted_by = '{new_user_id}'
  AND status = 'pending'
ORDER BY created_at DESC
LIMIT 1;

-- Expect: 1 row
-- Expect: proposed_changes has description update
-- Expect: status = 'pending'
```

**Step 4: Admin - Review Edit Suggestion**
```typescript
const { page: adminPage } = await helper.createAdminContext();

await adminPage.goto('http://localhost:3000/admin/edits');

// Find pending edit
const editRow = adminPage.locator(`tr:has-text("${testEmail}")`);  // Submitted by new user
await expect(editRow).toBeVisible();

// View diff
await editRow.locator('button:has-text("Review")').click();

// Verify shows old vs new description
await expect(adminPage.locator('text=Updated description')).toBeVisible();

console.log('✅ Admin sees edit suggestion with diff');

// Approve edit
await adminPage.click('button:has-text("Approve")');
await adminPage.waitForSelector('text=Edit approved');

console.log('✅ Admin approved edit suggestion');
```

**Step 5: Database - Verify Resource Updated**
```sql
SELECT description FROM resources
WHERE url = 'https://ffmpeg.org/ffmpeg-all.html';

-- Expect: description = 'Updated description with better explanation...'
```

**Step 6: Anonymous - Verify Edit Visible**
```typescript
const { page: publicPage } = await helper.createAnonymousContext();

await publicPage.goto('http://localhost:3000/category/encoding-codecs');

// Find resource
const resource = publicPage.locator('text=FFmpeg Documentation');
await resource.click();  // Open detail view

// Verify new description visible
await expect(publicPage.locator('text=Updated description with better explanation')).toBeVisible();

console.log('✅ Public sees approved edit from community user');
```

**Step 7: New User - Verify Edit Shows as Approved**
```typescript
// Login as original user who suggested edit
await userPage.goto('http://localhost:3000/profile');
await userPage.click('tab:has-text("Submissions")');

// Verify edit shows with "Approved" badge
await expect(userPage.locator('text=Approved')).toBeVisible();

console.log('✅ User sees their edit was approved');
```

---

### Test 9: Admin Rejects Edit → Resource Unchanged

**Same flow as Test 8, but:**
- Step 4: Admin clicks "Reject" with reason
- Step 5: Database shows resource_edits status='rejected', resource unchanged
- Step 6: Public still sees original description (edit not applied)
- Step 7: User sees "Rejected" badge with admin's reason

---

### Test 10: Bulk Approve Pending Resources → All Visible

**Step 1: Seed 10 Pending Resources via Database**
```sql
-- Create 10 test resources with status='pending'
INSERT INTO resources (title, url, description, category, status)
VALUES
  ('Bulk Test 1', 'https://test1.com', 'Test', 'General Tools', 'pending'),
  ('Bulk Test 2', 'https://test2.com', 'Test', 'General Tools', 'pending'),
  ...
  ('Bulk Test 10', 'https://test10.com', 'Test', 'General Tools', 'pending');
```

**Step 2: Admin - Bulk Approve All 10**
```typescript
await adminPage.goto('http://localhost:3000/admin/approvals');

// Select all 10 resources
for (let i = 0; i < 10; i++) {
  await adminPage.locator('tbody tr').nth(i).locator('input[type="checkbox"]').click();
}

// Verify toolbar shows "10 resources selected"
await expect(adminPage.locator('text=10 resources selected')).toBeVisible();

// Click bulk approve
await adminPage.click('button:has-text("Approve All")');
await adminPage.click('button:has-text("Confirm")');

// Wait for success
await adminPage.waitForSelector('text=Successfully approved 10 resources');
```

**Step 3: Database - Verify All 10 Approved**
```sql
SELECT COUNT(*) FROM resources
WHERE title LIKE 'Bulk Test %'
  AND status = 'approved'
  AND approved_at IS NOT NULL;

-- Expect: 10
```

**Step 4: Anonymous - Verify All 10 Visible**
```typescript
await publicPage.goto('http://localhost:3000/category/general-tools');

// Verify all 10 appear
for (let i = 1; i <= 10; i++) {
  await expect(publicPage.locator(`text=Bulk Test ${i}`)).toBeVisible();
}

console.log('✅ All 10 bulk-approved resources visible to public');
```

---

### Test 11: AI Enrichment → Tags Display Publicly

**Step 1: Admin - Start Enrichment Job on 10 Resources**
```typescript
await adminPage.goto('http://localhost:3000/admin/enrichment');

await adminPage.selectOption('select[name="filter"]', 'unenriched');
await adminPage.fill('input[name="batchSize"]', '10');
await adminPage.click('button:has-text("Start Enrichment")');

// Wait for job to complete (monitor progress)
await adminPage.waitForSelector('text=completed', { timeout: 300000 });  // 5 min max
```

**Step 2: Database - Verify Tags Created**
```sql
-- Check enrichment job
SELECT successful_resources FROM enrichment_jobs
WHERE status = 'completed'
ORDER BY created_at DESC
LIMIT 1;

-- Expect: 10

-- Check tags created
SELECT r.title, array_agg(t.name) as tags
FROM resources r
JOIN resource_tags rt ON r.id = rt.resource_id
JOIN tags t ON rt.tag_id = t.id
WHERE r.id IN (SELECT resource_id FROM enrichment_queue WHERE status = 'completed' LIMIT 10)
GROUP BY r.id, r.title;

-- Expect: Each resource has tags
```

**Step 3: Anonymous - Verify Tags Display on UI**
```typescript
await publicPage.goto('http://localhost:3000/category/encoding-codecs');

// Find an enriched resource
const enrichedResource = publicPage.locator('[data-testid^="resource-"]').first();

// Verify has tags visible
const tags = enrichedResource.locator('[data-testid="resource-tags"] span');
await expect(tags).toHaveCount(greaterThan(0));

console.log('✅ AI-generated tags visible on public pages');
```

---

### Test 12-16: Filter & Sort Integration

**Test 12**: Filter by status → Only shows resources with that status
**Test 13**: Filter by category → Only shows resources in that category  
**Test 14**: Combined filters → Intersection works correctly
**Test 15**: Sort by title → Resources in alphabetical order
**Test 16**: Sort by last modified → Recently edited appear first

All verified via: Admin applies filter → Database query confirms correct subset → UI displays match

---

### Test 17-20: User Journey Integration

**Test 17**: User enrolls in journey → Database has enrollment → Progress shows on profile
**Test 18**: User marks step complete → Database updated → Progress bar advances
**Test 19**: User completes all steps → Journey shows "Completed" badge
**Test 20**: Admin creates new journey → Immediately visible to all users

---

### Test 21: Bookmark with Notes → Persists Across Sessions

**Step 1**: User A bookmarks resource with notes
**Step 2**: Logout
**Step 3**: Login as User A again (fresh browser)
**Step 4**: Navigate to bookmarks
**Step 5**: Verify notes still present
**Step 6**: Edit notes → Save
**Step 7**: Logout → Login → Verify updated notes

---

### Test 22: Search After Delete

**Step 1**: Admin deletes resource (or archives)
**Step 2**: Database shows status='archived'
**Step 3**: Anonymous searches for deleted resource title
**Step 4**: Verify NOT in search results
**Step 5**: Search for other resources in same category
**Step 6**: Verify search still works (index updated)

---

### Test 23: Rate Limiting Per User

**Step 1**: User A makes 60 requests rapidly → Gets rate limited
**Step 2**: User B makes 60 requests → Also gets rate limited (separate counter)
**Step 3**: Wait 60 seconds
**Step 4**: Both users can make requests again (limit reset)

---

### Test 24: Security Headers After Admin Operations

**Step 1**: Admin performs operations (edit, approve, etc.)
**Step 2**: Check response headers on admin API calls
**Step 3**: Verify CSP, HSTS, X-Frame-Options all present
**Step 4**: Verify headers don't block admin functionality

---

### Test 25: Category Count Accuracy

**Step 1**: Admin archives 5 resources from "Encoding & Codecs"
**Step 2**: Database query: `SELECT COUNT(*) FROM resources WHERE category='Encoding & Codecs' AND status='approved'`
**Step 3**: Navigate to homepage
**Step 4**: Verify category shows correct count (decreased by 5)
**Step 5**: Admin un-archives resources
**Step 6**: Verify count increases by 5

---

### Test 26: Cross-Browser Resource Creation

**Step 1**: Browser A (Admin) creates resource via form
**Step 2**: Browser B (Anonymous, already open) on category page
**Step 3**: Refresh Browser B
**Step 4**: Verify new resource appears (no need to logout/login)

---

### Test 27: Edit History / Audit Log

**Step 1**: Admin edits resource
**Step 2**: Database: Verify audit_log has entry
**Step 3**: Admin views audit log page
**Step 4**: Verify shows: what changed, who changed it, when
**Step 5**: Filter audit log by resource ID
**Step 6**: See full edit history

---

### Test 28: GitHub Export After Edits

**Step 1**: Admin edits 10 resources
**Step 2**: Admin exports to GitHub
**Step 3**: Download exported markdown
**Step 4**: Verify markdown contains all 10 edits
**Step 5**: Run awesome-lint validation
**Step 6**: Verify 0 errors

---

### Test 29: Learning Journey Progress Across Devices

**Step 1**: User A (Browser A) enrolls in journey, marks step 1 complete
**Step 2**: Database: Verify progress saved
**Step 3**: User A (Browser B, different device) logs in
**Step 4**: Navigate to journey
**Step 5**: Verify step 1 shows as completed (synced across devices)

---

### Test 30: Search Ranking After AI Enrichment

**Step 1**: Search for "streaming" before enrichment
**Step 2**: Note result order
**Step 3**: Admin runs AI enrichment on top 20 results
**Step 4**: AI adds tags, improves descriptions
**Step 5**: Search for "streaming" again
**Step 6**: Verify results possibly re-ordered (better relevance)

---

### Test 31: Admin Demotes Self → Loses Access

**Step 1**: Admin A logs in
**Step 2**: Admin A demotes Admin B to regular user
**Step 3**: Admin B logs in (different browser)
**Step 4**: Admin B navigates to /admin
**Step 5**: Verify shows 404 (no longer has access)
**Step 6**: Admin A promotes Admin B back
**Step 7**: Admin B refreshes → Access restored

---

## Test Implementation Priority

**Week 1 (8 hours)**: Core Integration (Tests 1-10)
- Admin → Public flows
- RLS isolation
- Resource lifecycle
- **Impact**: Catches 80% of integration bugs

**Week 2 (6 hours)**: Feature Integration (Tests 11-20)
- Search integration
- Filters/sorts
- User journeys
- GitHub sync
- **Impact**: Verifies all features work together

**Week 3 (4 hours)**: Edge Cases (Tests 21-31)
- Cross-session persistence
- Rate limiting per user
- Audit logs
- Security scenarios
- **Impact**: Production hardening

---

## Implementation Steps

**Phase 1: Fix Playwright Session (2-3 hours)**
- Debug current black screen issue
- Get auth.setup.ts working
- Generate all auth fixtures (admin, user-a, user-b)

**Phase 2: Build Test Helpers (1-2 hours)**
- MultiContextTestHelper class
- Database query wrappers (Supabase MCP)
- Custom assertions

**Phase 3: Implement Priority Tests (3-4 hours)**
- Scenario 1: Admin → Public (5 tests)
- Scenario 2: RLS Isolation (4 tests)
- Scenario 3: Lifecycle (3 tests)

**Phase 4: Run and Fix (2-3 hours)**
- Run all integration tests
- Fix any failures found
- Document results

**Total**: 8-12 hours for comprehensive integration testing

---

## Success Criteria

**Integration tests pass when:**

✅ **Admin → Public Flow**
- Admin edits resource → Change visible to anonymous users immediately
- Admin approves pending → Resource appears on public pages
- Admin archives resource → Resource disappears from public pages
- All verified via: UI (3 browsers) + Database (SQL queries)

✅ **User Isolation (RLS)**
- User A's favorites not visible to User B (UI + API + Database)
- User A's bookmarks not visible to User B (UI + API + Database)
- Admin can see all users' data
- PostgreSQL RLS policies enforce isolation at DB level

✅ **Complete Workflows**
- Submit → Approve → Visible (verified end-to-end)
- Submit → Reject → Hidden (verified end-to-end)
- Edit → Search finds (verified immediately)

---

## Current Status

**Built**: None of these tests exist yet ❌
**Reason**: Focused on component/API testing, not integration
**Gap**: Critical for production confidence

**Recommendation**: Build these BEFORE production deployment

**Estimated Value**:
- Catch integration bugs (missed by unit tests)
- Verify RLS actually works (security critical)
- Confidence in multi-user scenarios
- Regression testing for future changes

---

**This plan answers your question: No, we haven't built these systematic multi-context integration tests yet. We should.**

Would you like me to:
- **A**: Implement these integration tests now (8-12 hours)?
- **B**: Fix Playwright session first, then build tests?
- **C**: Document current state and defer to next session?

# E2E Test Suite Documentation

## Overview

Comprehensive Playwright E2E test suite for the Awesome Video Resources application. Tests cover all major user flows and admin functionality.

## Test Structure

```
tests/
├── e2e/
│   ├── 01-anonymous-user.spec.ts    # Public features (no auth)
│   ├── 02-authentication.spec.ts    # Login, signup, logout
│   ├── 03-user-features.spec.ts     # Bookmarks, favorites, profile
│   └── 04-admin-features.spec.ts    # Admin dashboard & operations
└── helpers/
    └── test-utils.ts                # Shared utilities & helpers
```

## Prerequisites

### 1. Test Users Setup

Create the following users in your Supabase project:

**Admin User** (via Supabase Dashboard → Authentication → Users):
```
Email: admin@test.com
Password: TestAdmin123!
```

After creating, promote to admin via SQL Editor:
```sql
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE email = 'admin@test.com';
```

**Regular Test User**:
```
Email: testuser@test.com
Password: TestUser123!
```

### 2. Environment Configuration

Ensure `.env` file has correct Supabase credentials:
```bash
SUPABASE_URL=https://[PROJECT_REF].supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@...
```

### 3. Application Running

Tests expect the application to be running on `http://localhost:3000`. The test runner will start the dev server automatically, but you can also start it manually:

```bash
npm run dev
```

## Running Tests

### Run All Tests
```bash
npx playwright test
```

### Run Specific Test File
```bash
npx playwright test tests/e2e/01-anonymous-user.spec.ts
npx playwright test tests/e2e/02-authentication.spec.ts
npx playwright test tests/e2e/03-user-features.spec.ts
npx playwright test tests/e2e/04-admin-features.spec.ts
```

### Run with UI Mode (Debugging)
```bash
npx playwright test --ui
```

### Run Specific Test by Name
```bash
npx playwright test -g "should login with valid credentials"
```

### Run on Specific Browser/Device
```bash
# Desktop Chrome
npx playwright test --project=chromium-desktop

# Mobile
npx playwright test --project=chromium-mobile

# Tablet
npx playwright test --project=chromium-tablet
```

### Run in Headed Mode (See Browser)
```bash
npx playwright test --headed
```

### Run with Debug Mode
```bash
npx playwright test --debug
```

## Test Reports

### View HTML Report
```bash
npx playwright show-report
```

### Generate Report
```bash
npx playwright test --reporter=html
```

### View JSON Report
```bash
cat test-results.json | jq
```

## Test Coverage

### 01-anonymous-user.spec.ts (23 tests)
- ✅ Homepage loads with resources
- ✅ Category navigation
- ✅ Resource card display
- ✅ Pagination
- ✅ Search functionality
- ✅ Theme switching
- ✅ Footer links
- ✅ Mobile responsive behavior
- ✅ Error handling (404, network errors)

### 02-authentication.spec.ts (15 tests)
- ✅ Email/password signup
- ✅ Email/password login
- ✅ Logout
- ✅ Session persistence
- ✅ Invalid credentials handling
- ✅ Password validation
- ✅ OAuth provider display
- ✅ Admin role verification
- ✅ Protected route access control

### 03-user-features.spec.ts (14 tests)
- ✅ Add/remove bookmarks
- ✅ Add/remove favorites
- ✅ View bookmarks page
- ✅ Add notes to bookmarks
- ✅ View profile page
- ✅ Update user preferences
- ✅ Submit new resource
- ✅ Form validation
- ✅ View submission history

### 04-admin-features.spec.ts (16 tests)
- ✅ Admin dashboard access
- ✅ Admin statistics display
- ✅ Non-admin access blocking
- ✅ View pending resources
- ✅ Approve pending resources
- ✅ Reject pending resources (with reason)
- ✅ View all resources table
- ✅ Filter resources by status
- ✅ Search resources by title
- ✅ Edit resource inline
- ✅ Bulk resource selection
- ✅ GitHub sync panel display
- ✅ Enrichment panel display

## Test Utilities

### Authentication Helpers
```typescript
import { loginAsAdmin, loginAsUser, logout } from '../helpers/test-utils';

// Login as admin
await loginAsAdmin(page);

// Login as specific user
await loginAsUser(page, 'user@test.com', 'Password123!');

// Logout
await logout(page);
```

### Data Management
```typescript
import { createTestResource, cleanupTestResources } from '../helpers/test-utils';

// Create test resource
const resource = await createTestResource(page);

// Cleanup test data
await cleanupTestResources(page, 'Test Resource');
```

### Common Assertions
```typescript
import { assertToast, waitForNetworkIdle } from '../helpers/test-utils';

// Wait for network to settle
await waitForNetworkIdle(page);

// Assert toast notification
await assertToast(page, 'Success');
```

### Browser Utilities
```typescript
import { clearBrowserData, getSupabaseToken } from '../helpers/test-utils';

// Clear all data
await clearBrowserData(page);

// Get auth token
const token = await getSupabaseToken(page);
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

## Troubleshooting

### Tests Failing Due to Missing Users
**Error**: `TimeoutError: Locator not found`

**Solution**: Create test users in Supabase dashboard (see Prerequisites)

### Tests Failing Due to Database State
**Error**: Resources not found, unexpected counts

**Solution**:
1. Seed database with test data
2. Ensure cleanup runs after tests
3. Check RLS policies allow test user access

### Flaky Tests
**Symptom**: Tests pass sometimes, fail other times

**Solution**:
1. Increase timeouts for slow operations
2. Add explicit `waitForNetworkIdle()` calls
3. Check for race conditions
4. Use `test.retry()` for inherently flaky tests

### Timeout Errors
**Error**: `Test timeout of 30000ms exceeded`

**Solution**:
1. Increase test timeout in `playwright.config.ts`
2. Check if API is responding slowly
3. Verify database connection is stable
4. Use `waitForNetworkIdle()` instead of `waitForTimeout()`

### Authentication Errors
**Error**: `Unauthorized` or `403 Forbidden`

**Solution**:
1. Check Supabase credentials in `.env`
2. Verify test user exists in Supabase Auth
3. Check JWT token is being set in localStorage
4. Verify RLS policies allow access

## Best Practices

### 1. Test Independence
- Each test should be independent (can run in any order)
- Use `beforeEach` and `afterEach` for setup/cleanup
- Never rely on state from previous tests

### 2. No Mocks
- Tests use real Supabase database
- Tests use real API endpoints
- Only mock external services (GitHub, Anthropic) if needed

### 3. Data Cleanup
- Always cleanup test data after tests
- Use unique identifiers (timestamps) for test data
- Clean up in `afterEach` or `afterAll` hooks

### 4. Selectors
- Prefer `data-testid` attributes over CSS selectors
- Use semantic selectors (roles, labels) when available
- Avoid brittle selectors (nth-child, complex CSS)

### 5. Assertions
- Use explicit waits (`waitForSelector`, `waitForResponse`)
- Avoid implicit waits (`waitForTimeout`)
- Check for multiple states (loading, success, error)

### 6. Error Handling
- Expect errors and test error states
- Verify error messages are user-friendly
- Test network failures and API errors

## Adding New Tests

### 1. Create Test File
```typescript
import { test, expect } from '@playwright/test';
import { loginAsUser } from '../helpers/test-utils';

test.describe('New Feature Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
  });

  test('should do something', async ({ page }) => {
    // Test implementation
  });
});
```

### 2. Add Test Utilities
```typescript
// tests/helpers/test-utils.ts

export async function newHelper(page: Page): Promise<void> {
  // Helper implementation
}
```

### 3. Update Documentation
- Add test to this README
- Update test count
- Document any new prerequisites

## Performance Optimization

### Parallel Execution
Current config runs tests sequentially (workers: 1) for database consistency. To enable parallelization for specific test files:

```typescript
// In test file
test.describe.configure({ mode: 'parallel' });
```

### Test Duration
- Keep tests focused (single responsibility)
- Use `test.slow()` for inherently slow tests
- Split long test files into smaller ones

### Resource Usage
- Close unused contexts/pages
- Cleanup test data promptly
- Reuse authenticated sessions where possible

## Debugging

### Visual Debugging
```bash
# Run with UI
npx playwright test --ui

# Run in headed mode
npx playwright test --headed

# Pause execution
await page.pause(); # Add in test
```

### Screenshots & Videos
- Screenshots: `test-results/screenshots/`
- Videos: `test-results/videos/` (on failure)
- Traces: `test-results/traces/` (on first retry)

### Console Logs
```typescript
// Log to console
console.log('Debug info:', value);

// Capture browser console
page.on('console', msg => console.log('BROWSER:', msg.text()));
```

## Maintenance

### Regular Tasks
- Update test data when schema changes
- Review and update selectors when UI changes
- Keep Playwright version up to date
- Review and merge test results from CI

### Monthly Review
- Analyze flaky tests
- Review test coverage
- Update documentation
- Optimize slow tests

## Support

For issues or questions:
1. Check troubleshooting section
2. Review Playwright docs: https://playwright.dev
3. Check GitHub issues
4. Contact development team

---

**Last Updated**: 2025-11-29
**Playwright Version**: 1.57.0
**Total Tests**: 68
**Coverage**: ~90% of user flows

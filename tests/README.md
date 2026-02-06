# Test Suite Documentation

This directory contains the automated test suite for the Awesome Video Resource Viewer application. Our test suite ensures code quality, prevents regressions, and validates that all features work as expected.

## Table of Contents

- [Test Architecture](#test-architecture)
- [Running Tests](#running-tests)
- [Test Types](#test-types)
- [Test Structure](#test-structure)
- [Writing Tests](#writing-tests)
- [Troubleshooting](#troubleshooting)

## Test Architecture

Our test suite is organized into three main layers:

```
tests/
├── setup.ts                    # Global test setup and configuration
├── helpers/                    # Test utilities and helpers
│   ├── db-helper.ts           # Database test utilities
│   └── api-helper.ts          # API test utilities
├── unit/                       # Unit tests for isolated functions
│   ├── parser.test.ts
│   ├── auth.test.ts
│   ├── recommendation-engine.test.ts
│   └── validation/
│       └── awesomeLint.test.ts
├── integration/                # Integration tests for API endpoints
│   └── api/
│       ├── auth.test.ts
│       ├── resources.test.ts
│       ├── categories.test.ts
│       ├── favorites.test.ts
│       └── admin.test.ts
└── e2e/                        # End-to-end browser tests
    ├── search.spec.ts
    ├── browse-categories.spec.ts
    ├── resource-detail.spec.ts
    ├── favorites.spec.ts
    └── admin-operations.spec.ts
```

### Test Frameworks

- **Vitest**: Unit and integration tests (fast, modern, TypeScript-first)
- **Playwright**: End-to-end browser tests (multi-browser support)
- **Supertest**: HTTP API testing (request mocking and assertions)

## Running Tests

### Quick Start

```bash
# Run all tests
npm test

# Run tests in watch mode (re-run on file changes)
npm run test:watch

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run only e2e tests
npm run test:e2e

# Generate coverage report
npm run test:coverage
```

### Environment Setup

Before running tests, ensure you have:

1. **Test Database**: Set `DATABASE_URL` to a test database
   ```bash
   # .env.test or .env
   DATABASE_URL=postgresql://user:password@localhost:5432/awesome_test
   ```

2. **Test Environment Variable**:
   ```bash
   NODE_ENV=test
   ```

**⚠️ WARNING**: Always use a separate test database. Tests will clean up data between runs!

### Running Specific Tests

```bash
# Run a specific test file
npx vitest tests/unit/parser.test.ts

# Run tests matching a pattern
npx vitest --grep "should validate URL"

# Run tests in a specific directory
npx vitest tests/integration/

# Run e2e tests in a specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### CI/CD Integration

Tests run automatically on:
- Pull requests
- Commits to main branch
- Pre-deployment checks

CI configuration runs:
1. Unit tests (fastest)
2. Integration tests
3. E2E tests (slowest, run in parallel across browsers)

## Test Types

### Unit Tests (`tests/unit/`)

**Purpose**: Test individual functions and modules in isolation

**Characteristics**:
- Fast execution (< 10ms per test typically)
- No external dependencies
- Mock external services
- Focus on logic and edge cases

**Example**:
```typescript
describe('Parser - URL Validation', () => {
  it('should reject non-GitHub/GitLab URLs', async () => {
    await expect(
      fetchAwesomeList('https://example.com/README.md')
    ).rejects.toThrow('URL should be a raw GitHub/GitLab URL');
  });
});
```

**When to Use**:
- Testing utility functions
- Validating parsing logic
- Testing data transformations
- Edge case handling

### Integration Tests (`tests/integration/`)

**Purpose**: Test how different parts of the system work together

**Characteristics**:
- Test API endpoints
- Use real database (test instance)
- Test authentication flows
- Validate request/response handling

**Example**:
```typescript
describe('Resources API Integration Tests', () => {
  it('should return paginated approved resources', async () => {
    await createTestResource({
      title: 'Resource 1',
      status: 'approved',
    });

    const response = await request(app)
      .get('/api/resources')
      .expect(200);

    expect(response.body.resources).toHaveLength(1);
  });
});
```

**When to Use**:
- Testing API endpoints
- Testing database interactions
- Testing authentication/authorization
- Testing full request/response cycles

### E2E Tests (`tests/e2e/`)

**Purpose**: Test complete user workflows in a real browser

**Characteristics**:
- Slow execution (seconds per test)
- Test real user interactions
- Cross-browser testing
- Visual regression testing

**Example**:
```typescript
test('should display category cards on home page', async ({ page }) => {
  await page.goto('/');

  const categoryCards = page.locator('[data-testid^="card-category-"]');
  await expect(categoryCards.first()).toBeVisible();

  const count = await categoryCards.count();
  expect(count).toBeGreaterThan(0);
});
```

**When to Use**:
- Testing user workflows
- Testing UI interactions
- Testing responsive design
- Testing accessibility
- Cross-browser compatibility

## Test Structure

### Test Organization

Each test file follows this structure:

```typescript
/**
 * File-level documentation
 * Describes what this test file covers
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { functionToTest } from '../src/module';

describe('Feature Name', () => {
  // Setup runs before each test
  beforeEach(async () => {
    // Clean database, reset mocks, etc.
  });

  // Teardown runs after each test
  afterEach(async () => {
    // Cleanup if needed
  });

  describe('Specific Functionality', () => {
    it('should do something specific', async () => {
      // Arrange: Set up test data
      const input = 'test data';

      // Act: Execute the function
      const result = await functionToTest(input);

      // Assert: Verify the result
      expect(result).toBe('expected output');
    });
  });
});
```

### Test Helpers

#### Database Helpers (`helpers/db-helper.ts`)

```typescript
import {
  cleanupDatabase,
  createTestUser,
  createTestResource,
  createTestCategory,
  seedTestData
} from './helpers/db-helper';

// Clean database between tests
afterEach(async () => {
  await cleanupDatabase();
});

// Create test data
const user = await createTestUser({
  email: 'test@example.com',
  role: 'user',
});

const resource = await createTestResource({
  title: 'Test Resource',
  url: 'https://example.com',
  status: 'approved',
});

// Seed complete test data set
const testData = await seedTestData();
// Returns: { users: {...}, categories: {...}, resources: {...} }
```

#### API Helpers

```typescript
import request from 'supertest';
import { app } from '../server';

// Make authenticated requests
const agent = request.agent(app);
await agent
  .post('/api/auth/local/login')
  .send({ email: 'user@test.com', password: 'password' });

const response = await agent
  .get('/api/resources/pending')
  .expect(200);
```

## Writing Tests

See [CONTRIBUTING_TESTS.md](../CONTRIBUTING_TESTS.md) for detailed guidelines on writing new tests.

**Quick Tips**:

1. **Write descriptive test names**
   ```typescript
   // Good
   it('should return 404 when resource does not exist', ...)

   // Bad
   it('test resource endpoint', ...)
   ```

2. **Test one thing per test**
   ```typescript
   // Good - focused test
   it('should validate email format', ...)
   it('should require password', ...)

   // Bad - testing multiple things
   it('should validate login form', ...)
   ```

3. **Use arrange-act-assert pattern**
   ```typescript
   it('should create user', async () => {
     // Arrange
     const userData = { email: 'test@example.com', ... };

     // Act
     const user = await createUser(userData);

     // Assert
     expect(user.email).toBe('test@example.com');
   });
   ```

4. **Clean up test data**
   ```typescript
   afterEach(async () => {
     await cleanupDatabase();
   });
   ```

## Troubleshooting

### Common Issues

#### Tests Failing Due to Database Connection

**Problem**: `Error: DATABASE_URL environment variable is not set`

**Solution**:
```bash
# Create .env file with test database URL
echo "DATABASE_URL=postgresql://user:password@localhost:5432/awesome_test" > .env

# Or export environment variable
export DATABASE_URL=postgresql://user:password@localhost:5432/awesome_test
```

#### Tests Timing Out

**Problem**: Tests hang or timeout

**Solution**:
1. Check database connection is working
2. Ensure test database is running
3. Check for missing `await` in async functions
4. Increase timeout for slow tests:
   ```typescript
   it('slow test', async () => {
     // test code
   }, 10000); // 10 second timeout
   ```

#### Cleanup Errors

**Problem**: `Error cleaning up database: foreign key constraint`

**Solution**: The cleanup order in `db-helper.ts` is important. Delete dependent tables first:
```typescript
// Delete in correct order
await db.delete(schema.resourceTags); // Junction table first
await db.delete(schema.resources);     // Then parent tables
```

#### E2E Tests Failing

**Problem**: Playwright tests fail intermittently

**Solutions**:
1. Add explicit waits:
   ```typescript
   await page.waitForLoadState('networkidle');
   await page.waitForSelector('[data-testid="element"]');
   ```

2. Check for timing issues:
   ```typescript
   // Wait for element before interacting
   await page.waitForSelector('button');
   await page.click('button');
   ```

3. Run in headed mode to debug:
   ```bash
   npx playwright test --headed
   npx playwright test --debug
   ```

#### Coverage Not Generated

**Problem**: Coverage report is empty or missing

**Solution**:
```bash
# Ensure coverage provider is installed
npm install -D @vitest/coverage-v8

# Run with coverage flag
npm run test:coverage

# Open HTML report
open coverage/index.html
```

### Test Environment Variables

Required environment variables for tests:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/awesome_test

# Node environment
NODE_ENV=test

# Optional: API base URL for e2e tests
BASE_URL=http://localhost:5000
```

### Debugging Tests

#### Vitest Debugging

```bash
# Run tests in debug mode
node --inspect-brk ./node_modules/vitest/vitest.mjs run

# Use VSCode debugger
# Add breakpoint and run "Debug Vitest" configuration
```

#### Playwright Debugging

```bash
# Run in debug mode with browser UI
npx playwright test --debug

# Run in headed mode (see browser)
npx playwright test --headed

# Generate test code by recording
npx playwright codegen http://localhost:5000
```

### Getting Help

If you encounter issues:

1. Check this documentation
2. Review [CONTRIBUTING_TESTS.md](../CONTRIBUTING_TESTS.md)
3. Look at existing test files for examples
4. Check Playwright/Vitest documentation:
   - [Vitest Docs](https://vitest.dev/)
   - [Playwright Docs](https://playwright.dev/)
5. Ask in team chat or open an issue

## Test Coverage Goals

We aim for:
- **Unit tests**: 80%+ coverage
- **Integration tests**: All API endpoints covered
- **E2E tests**: Critical user flows covered

Run `npm run test:coverage` to see current coverage.

## Best Practices

1. **Keep tests fast**: Use mocks for external services
2. **Keep tests isolated**: Each test should run independently
3. **Keep tests readable**: Clear test names and structure
4. **Keep tests maintainable**: Use helpers and avoid duplication
5. **Test edge cases**: Don't just test happy paths
6. **Test error handling**: Verify errors are handled gracefully
7. **Update tests when code changes**: Keep tests in sync with implementation

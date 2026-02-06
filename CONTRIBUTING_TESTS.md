# Contributing Tests Guide

This guide provides detailed instructions for writing tests for the Awesome Video Resource Viewer. Following these patterns ensures consistent, maintainable, and effective tests.

## Table of Contents

- [Getting Started](#getting-started)
- [Test Writing Principles](#test-writing-principles)
- [Unit Test Patterns](#unit-test-patterns)
- [Integration Test Patterns](#integration-test-patterns)
- [E2E Test Patterns](#e2e-test-patterns)
- [Test Helpers](#test-helpers)
- [Common Patterns](#common-patterns)
- [Testing Checklist](#testing-checklist)
- [Examples](#examples)

## Getting Started

### Prerequisites

Before writing tests, ensure you have:

1. **Test database configured**:
   ```bash
   # .env
   DATABASE_URL=postgresql://user:password@localhost:5432/awesome_test
   NODE_ENV=test
   ```

2. **Dependencies installed**:
   ```bash
   npm install
   ```

3. **Test environment verified**:
   ```bash
   npm test
   ```

### Choosing Test Type

| Test Type | When to Use | Speed | Complexity |
|-----------|-------------|-------|------------|
| **Unit** | Testing isolated functions, utilities, parsers | Fast (< 10ms) | Low |
| **Integration** | Testing API endpoints, database interactions | Medium (< 100ms) | Medium |
| **E2E** | Testing user workflows, UI interactions | Slow (seconds) | High |

**Decision Tree**:
```
Does it involve the browser/UI?
├─ Yes → E2E Test
└─ No
    └─ Does it involve database/API?
        ├─ Yes → Integration Test
        └─ No → Unit Test
```

## Test Writing Principles

### 1. Follow AAA Pattern

**Arrange-Act-Assert** makes tests readable and maintainable:

```typescript
it('should create a new resource', async () => {
  // Arrange: Set up test data
  const resourceData = {
    title: 'Test Resource',
    url: 'https://example.com/test',
    category: 'Testing',
  };

  // Act: Execute the function
  const resource = await createResource(resourceData);

  // Assert: Verify the result
  expect(resource.title).toBe('Test Resource');
  expect(resource.status).toBe('pending');
});
```

### 2. Write Descriptive Test Names

Test names should describe **what** is being tested and **what** the expected behavior is.

```typescript
// ✅ Good - clear and specific
it('should return 404 when resource does not exist', async () => { ... });
it('should require authentication for creating resources', async () => { ... });
it('should validate email format in user registration', async () => { ... });

// ❌ Bad - vague or unclear
it('test resource endpoint', async () => { ... });
it('should work', async () => { ... });
it('resource creation', async () => { ... });
```

### 3. Test One Thing Per Test

Each test should verify one specific behavior:

```typescript
// ✅ Good - focused tests
it('should validate required fields', async () => {
  const response = await request(app)
    .post('/api/resources')
    .send({ title: 'Missing fields' })
    .expect(400);

  expect(response.body.message).toContain('Invalid resource data');
});

it('should create resource with valid data', async () => {
  const response = await request(app)
    .post('/api/resources')
    .send({
      title: 'Valid Resource',
      url: 'https://example.com',
      description: 'Description',
      category: 'Category',
    })
    .expect(201);

  expect(response.body.title).toBe('Valid Resource');
});

// ❌ Bad - testing multiple things
it('should validate and create resources', async () => {
  // Testing validation
  await request(app).post('/api/resources').send({}).expect(400);

  // Testing creation
  await request(app).post('/api/resources').send({ ... }).expect(201);
});
```

### 4. Test Edge Cases and Error Conditions

Don't just test happy paths:

```typescript
describe('URL Validation', () => {
  // Happy path
  it('should accept valid GitHub URLs', async () => { ... });

  // Edge cases
  it('should reject malformed URLs', async () => { ... });
  it('should reject non-GitHub URLs', async () => { ... });
  it('should handle URLs with special characters', async () => { ... });
  it('should handle very long URLs', async () => { ... });

  // Error conditions
  it('should handle network timeouts', async () => { ... });
  it('should handle 404 responses', async () => { ... });
  it('should handle 429 rate limits', async () => { ... });
});
```

### 5. Keep Tests Independent

Each test should work regardless of execution order:

```typescript
// ✅ Good - test creates its own data
it('should update resource status', async () => {
  const resource = await createTestResource({ status: 'pending' });

  const updated = await updateResourceStatus(resource.id, 'approved');

  expect(updated.status).toBe('approved');
});

// ❌ Bad - depends on previous test
let globalResource; // Shared state is problematic

it('should create resource', async () => {
  globalResource = await createTestResource();
});

it('should update resource', async () => {
  // This test fails if the previous test doesn't run
  const updated = await updateResourceStatus(globalResource.id, 'approved');
});
```

## Unit Test Patterns

### Testing Pure Functions

```typescript
import { describe, it, expect } from 'vitest';
import { cleanMarkdown, extractLicense } from '../server/utils';

describe('Markdown Utilities', () => {
  describe('cleanMarkdown', () => {
    it('should remove markdown formatting', () => {
      const input = '**Bold** and *italic* text';
      const result = cleanMarkdown(input);
      expect(result).toBe('Bold and italic text');
    });

    it('should normalize whitespace', () => {
      const input = 'Text   with    extra     spaces';
      const result = cleanMarkdown(input);
      expect(result).toBe('Text with extra spaces');
    });

    it('should handle empty strings', () => {
      expect(cleanMarkdown('')).toBe('');
    });

    it('should handle null/undefined', () => {
      expect(cleanMarkdown(null as any)).toBe('');
      expect(cleanMarkdown(undefined as any)).toBe('');
    });
  });
});
```

### Testing Functions with Dependencies (Mocking)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAwesomeList } from '../server/parser';

// Mock external dependencies
vi.mock('node-fetch', () => ({
  default: vi.fn(),
}));

import fetch from 'node-fetch';
const mockFetch = vi.mocked(fetch);

describe('Parser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch and parse markdown', async () => {
    const markdown = '# Awesome List\n\n- [Resource](https://example.com)';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => markdown,
    } as any);

    const result = await fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md');

    expect(result.resources.length).toBeGreaterThan(0);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(
      fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md')
    ).rejects.toThrow('Network error');
  });
});
```

### Testing Validation Logic

```typescript
import { describe, it, expect } from 'vitest';
import { validateResource } from '../server/validation';

describe('Resource Validation', () => {
  it('should validate required fields', () => {
    const result = validateResource({
      title: 'Test',
      url: 'https://example.com',
      description: 'Description',
      category: 'Category',
    });

    expect(result.success).toBe(true);
  });

  it('should reject missing title', () => {
    const result = validateResource({
      url: 'https://example.com',
      description: 'Description',
      category: 'Category',
    });

    expect(result.success).toBe(false);
    expect(result.error.errors[0].path).toContain('title');
  });

  it('should reject invalid URL format', () => {
    const result = validateResource({
      title: 'Test',
      url: 'not-a-valid-url',
      description: 'Description',
      category: 'Category',
    });

    expect(result.success).toBe(false);
    expect(result.error.errors[0].path).toContain('url');
  });
});
```

## Integration Test Patterns

### Testing API Endpoints

```typescript
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import { registerRoutes } from '../server/routes';
import { cleanupDatabase, closeTestDb } from './helpers/db-helper';

describe('Resources API', () => {
  let app: Express;

  beforeEach(async () => {
    await cleanupDatabase();

    app = express();
    app.use(express.json());
    await registerRoutes(app);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it('should return paginated resources', async () => {
    await createTestResource({ status: 'approved' });
    await createTestResource({ status: 'approved' });

    const response = await request(app)
      .get('/api/resources')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('resources');
    expect(response.body).toHaveProperty('total');
    expect(Array.isArray(response.body.resources)).toBe(true);
  });

  it('should filter resources by category', async () => {
    await createTestResource({ category: 'Frameworks', status: 'approved' });
    await createTestResource({ category: 'Libraries', status: 'approved' });

    const response = await request(app)
      .get('/api/resources?category=Frameworks')
      .expect(200);

    expect(response.body.resources.length).toBe(1);
    expect(response.body.resources[0].category).toBe('Frameworks');
  });
});
```

### Testing Authentication

```typescript
import { createTestUser, createTestAdmin } from './helpers/db-helper';
import { hashPassword } from '../server/passwordUtils';

describe('Authentication', () => {
  let userEmail: string;
  let userPassword: string;

  beforeEach(async () => {
    userEmail = `user-${Date.now()}@example.com`;
    userPassword = 'TestPassword123';
    const hashedPassword = await hashPassword(userPassword);

    await createTestUser({
      email: userEmail,
      password: hashedPassword,
    });
  });

  it('should login with valid credentials', async () => {
    const agent = request.agent(app);

    const response = await agent
      .post('/api/auth/local/login')
      .send({
        email: userEmail,
        password: userPassword,
      })
      .expect(200);

    expect(response.body).toHaveProperty('id');
    expect(response.body.email).toBe(userEmail);
  });

  it('should reject invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/local/login')
      .send({
        email: userEmail,
        password: 'WrongPassword',
      })
      .expect(401);

    expect(response.body).toHaveProperty('message');
  });

  it('should require authentication for protected endpoint', async () => {
    const response = await request(app)
      .get('/api/resources/pending')
      .expect(401);

    expect(response.body.message).toContain('Not authenticated');
  });
});
```

### Testing Authorization

```typescript
describe('Authorization', () => {
  it('should allow admin to access admin endpoints', async () => {
    const adminAgent = request.agent(app);

    await adminAgent
      .post('/api/auth/local/login')
      .send({ email: adminEmail, password: adminPassword });

    const response = await adminAgent
      .get('/api/resources/pending')
      .expect(200);

    expect(response.body).toHaveProperty('resources');
  });

  it('should deny regular user access to admin endpoints', async () => {
    const userAgent = request.agent(app);

    await userAgent
      .post('/api/auth/local/login')
      .send({ email: userEmail, password: userPassword });

    const response = await userAgent
      .get('/api/resources/pending')
      .expect(403);

    expect(response.body.message).toContain('Admin access required');
  });
});
```

## E2E Test Patterns

### Testing User Interactions

```typescript
import { test, expect } from '@playwright/test';

test.describe('Resource Discovery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display category cards', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /Awesome Video Resources/i })
    ).toBeVisible();

    const categoryCards = page.locator('[data-testid^="card-category-"]');
    await expect(categoryCards.first()).toBeVisible();

    const count = await categoryCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should navigate to category page', async ({ page }) => {
    const firstCategory = page.locator('[data-testid^="link-category-"]').first();
    await firstCategory.click();

    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('button', { name: /Back to all categories/i })
    ).toBeVisible();
  });
});
```

### Testing Forms

```typescript
test('should submit resource form', async ({ page }) => {
  // Navigate to resource submission page
  await page.goto('/submit-resource');

  // Fill out form
  await page.fill('[name="title"]', 'New Test Resource');
  await page.fill('[name="url"]', 'https://example.com/new');
  await page.fill('[name="description"]', 'Test description');
  await page.selectOption('[name="category"]', 'Frameworks');

  // Submit form
  await page.click('button[type="submit"]');

  // Verify success
  await expect(page.getByText(/Resource submitted successfully/i)).toBeVisible();
});
```

### Testing Keyboard Shortcuts

```typescript
test('should open search with keyboard shortcut', async ({ page }) => {
  await page.goto('/');

  // Press Cmd+K (Mac) or Ctrl+K (Windows/Linux)
  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
  await page.keyboard.press(`${modifier}+KeyK`);

  // Verify search dialog opened
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: /Search Resources/i })
  ).toBeVisible();
});
```

### Testing Responsive Design

```typescript
test('should display correctly on mobile', async ({ page }) => {
  // Set mobile viewport
  await page.setViewportSize({ width: 375, height: 667 });

  await page.goto('/');

  // Verify mobile layout
  const categoryCards = page.locator('[data-testid^="card-category-"]');
  await expect(categoryCards.first()).toBeVisible();

  // Verify elements are accessible
  const searchButton = page.locator('button:has-text("Search")');
  await expect(searchButton).toBeVisible();
});
```

### Testing Accessibility

```typescript
test('should have accessible navigation', async ({ page }) => {
  await page.goto('/');

  // Check heading hierarchy
  const h1 = page.getByRole('heading', { level: 1 });
  await expect(h1).toBeVisible();

  // Check ARIA labels
  const categoryLink = page.locator('[data-testid^="link-category-"]').first();
  const ariaLabel = await categoryLink.getAttribute('aria-label');
  expect(ariaLabel).toBeTruthy();

  // Check keyboard navigation
  await page.keyboard.press('Tab');
  const focused = page.locator(':focus');
  await expect(focused).toBeVisible();
});
```

## Test Helpers

### Creating Test Data

```typescript
import {
  createTestUser,
  createTestAdmin,
  createTestResource,
  createTestCategory,
  seedTestData,
} from './helpers/db-helper';

// Create individual entities
const user = await createTestUser({
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
});

const resource = await createTestResource({
  title: 'Test Resource',
  url: 'https://example.com',
  status: 'approved',
  submittedBy: user.id,
});

// Seed complete test dataset
const testData = await seedTestData();
// testData = {
//   users: { regular, admin },
//   categories: { category, subcategory },
//   resources: { resource1, resource2 }
// }
```

### Cleaning Up Test Data

```typescript
import { cleanupDatabase } from './helpers/db-helper';

// Clean after each test
afterEach(async () => {
  await cleanupDatabase();
});

// Or clean before each test
beforeEach(async () => {
  await cleanupDatabase();
});
```

## Common Patterns

### Testing Pagination

```typescript
it('should paginate results correctly', async () => {
  // Create 25 test resources
  for (let i = 1; i <= 25; i++) {
    await createTestResource({
      title: `Resource ${i}`,
      url: `https://example.com/${i}`,
      status: 'approved',
    });
  }

  // Test page 1
  const page1 = await request(app)
    .get('/api/resources?page=1&limit=10')
    .expect(200);

  expect(page1.body.resources.length).toBe(10);
  expect(page1.body.total).toBe(25);
  expect(page1.body.page).toBe(1);

  // Test page 2
  const page2 = await request(app)
    .get('/api/resources?page=2&limit=10')
    .expect(200);

  expect(page2.body.resources.length).toBe(10);
  expect(page2.body.page).toBe(2);
});
```

### Testing Search

```typescript
it('should search resources by title', async () => {
  await createTestResource({
    title: 'React Tutorial',
    description: 'Learn React',
    status: 'approved',
  });

  await createTestResource({
    title: 'Vue Guide',
    description: 'Learn Vue',
    status: 'approved',
  });

  const response = await request(app)
    .get('/api/resources?search=React')
    .expect(200);

  expect(response.body.resources.length).toBe(1);
  expect(response.body.resources[0].title).toContain('React');
});
```

### Testing Error Handling

```typescript
it('should handle invalid input gracefully', async () => {
  const response = await request(app)
    .post('/api/resources')
    .send({
      title: '', // Invalid: empty string
      url: 'not-a-url', // Invalid: malformed URL
    })
    .expect(400);

  expect(response.body).toHaveProperty('message');
  expect(response.body.message).toContain('Invalid resource data');
  expect(response.body).toHaveProperty('errors');
  expect(Array.isArray(response.body.errors)).toBe(true);
});
```

## Testing Checklist

Before committing tests, ensure:

- [ ] Test has a clear, descriptive name
- [ ] Test follows AAA pattern (Arrange-Act-Assert)
- [ ] Test is independent (doesn't rely on other tests)
- [ ] Test cleans up data (uses `afterEach` cleanup)
- [ ] Test handles edge cases and errors
- [ ] Test uses appropriate test type (unit/integration/e2e)
- [ ] Test uses helpers instead of duplicating setup code
- [ ] Test assertions are specific and meaningful
- [ ] Test runs successfully (`npm test`)
- [ ] Test doesn't have debugging code (`console.log`, etc.)

## Examples

### Complete Unit Test Example

```typescript
/**
 * Unit Tests for URL Validation
 *
 * Tests the URL validation logic used in awesome list parsing
 */

import { describe, it, expect } from 'vitest';
import { validateAwesomeListUrl } from '../server/parser';

describe('URL Validation', () => {
  describe('Valid URLs', () => {
    it('should accept raw GitHub URLs', () => {
      const url = 'https://raw.githubusercontent.com/user/repo/main/README.md';
      expect(validateAwesomeListUrl(url)).toBe(true);
    });

    it('should accept raw GitLab URLs', () => {
      const url = 'https://gitlab.com/user/repo/-/raw/main/README.md';
      expect(validateAwesomeListUrl(url)).toBe(true);
    });
  });

  describe('Invalid URLs', () => {
    it('should reject regular GitHub URLs', () => {
      const url = 'https://github.com/user/repo/blob/main/README.md';
      expect(validateAwesomeListUrl(url)).toBe(false);
    });

    it('should reject non-GitHub/GitLab URLs', () => {
      const url = 'https://example.com/README.md';
      expect(validateAwesomeListUrl(url)).toBe(false);
    });

    it('should reject malformed URLs', () => {
      expect(validateAwesomeListUrl('not-a-url')).toBe(false);
      expect(validateAwesomeListUrl('')).toBe(false);
      expect(validateAwesomeListUrl(null as any)).toBe(false);
    });
  });
});
```

### Complete Integration Test Example

```typescript
/**
 * Integration Tests for Categories API
 *
 * Tests category listing and filtering endpoints
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import { registerRoutes } from '../server/routes';
import {
  cleanupDatabase,
  createTestCategory,
  createTestResource,
  closeTestDb,
} from './helpers/db-helper';

describe('Categories API', () => {
  let app: Express;

  beforeEach(async () => {
    await cleanupDatabase();

    app = express();
    app.use(express.json());
    await registerRoutes(app);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  describe('GET /api/categories', () => {
    it('should return all categories with resource counts', async () => {
      const category1 = await createTestCategory({ name: 'Frameworks' });
      const category2 = await createTestCategory({ name: 'Libraries' });

      await createTestResource({
        category: category1.name,
        status: 'approved',
      });
      await createTestResource({
        category: category1.name,
        status: 'approved',
      });
      await createTestResource({
        category: category2.name,
        status: 'approved',
      });

      const response = await request(app)
        .get('/api/categories')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].resourceCount).toBe(2);
      expect(response.body[1].resourceCount).toBe(1);
    });

    it('should exclude categories with no approved resources', async () => {
      await createTestCategory({ name: 'Empty Category' });
      const category = await createTestCategory({ name: 'Has Resources' });

      await createTestResource({
        category: category.name,
        status: 'approved',
      });

      const response = await request(app)
        .get('/api/categories')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('Has Resources');
    });
  });
});
```

### Complete E2E Test Example

```typescript
/**
 * E2E Tests for Search Flow
 *
 * Tests the complete user search experience
 */

import { test, expect } from '@playwright/test';

test.describe('Search Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('complete search workflow', async ({ page }) => {
    // Step 1: Open search with keyboard shortcut
    await page.keyboard.press('Meta+KeyK');
    await expect(page.getByRole('dialog')).toBeVisible();

    // Step 2: Type search query
    const searchInput = page.getByPlaceholder(/Search packages/i);
    await searchInput.fill('ffmpeg');
    await page.waitForTimeout(300);

    // Step 3: View results
    const resultCount = await page.locator('[data-testid^="search-result-"]').count();

    if (resultCount > 0) {
      // Step 4: Click on first result
      const firstResult = page.locator('[data-testid^="search-result-"]').first();
      await firstResult.click();

      // Step 5: Verify navigation to resource detail
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/resource/');
    }
  });
});
```

## Need Help?

- Check existing tests for examples
- Review [tests/README.md](tests/README.md) for running tests
- Consult [Vitest documentation](https://vitest.dev/)
- Consult [Playwright documentation](https://playwright.dev/)
- Ask the team for guidance

Remember: **Good tests make good code**. Invest time in writing clear, comprehensive tests!

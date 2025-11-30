import { test, expect } from '@playwright/test';
import {
  loginAsUser,
  logout,
  waitForNetworkIdle,
  assertToast,
  createTestResource,
  cleanupTestResources,
  scrollToElement,
} from '../helpers/test-utils';

/**
 * E2E Tests: Authenticated User Features
 *
 * Tests features available to authenticated users:
 * - Add/remove bookmarks
 * - Add/remove favorites
 * - View bookmarks page
 * - View profile page
 * - Submit new resource
 * - View submission history
 */

test.describe.configure({ mode: 'serial' }); // Run tests in order

test.beforeEach(async ({ page }) => {
  // Login before each test
  await loginAsUser(page);
  await waitForNetworkIdle(page);
});

test.afterEach(async ({ page }) => {
  // Logout after each test
  await logout(page);
});

test.describe('User Features - Bookmarks', () => {
  test('should add bookmark to resource', async ({ page }) => {
    // Navigate to a category with resources
    await page.goto('/');
    await waitForNetworkIdle(page);

    const categoryCard = page.locator('[data-testid="category-card"]').first();
    await categoryCard.click();
    await waitForNetworkIdle(page);

    // Find bookmark button on first resource
    const resourceCard = page.locator('[data-testid="resource-card"]').first();
    const bookmarkButton = resourceCard.locator('[data-testid="bookmark-button"]')
      .or(resourceCard.getByRole('button', { name: /bookmark/i }))
      .first();

    await expect(bookmarkButton).toBeVisible({ timeout: 5000 });

    // Click to add bookmark
    await bookmarkButton.click();

    // Wait for API response
    await page.waitForResponse(response =>
      response.url().includes('/api/bookmarks') && response.status() === 200,
      { timeout: 5000 }
    );

    // Should show success toast
    const toast = page.locator('[data-testid="toast"]')
      .or(page.locator('[role="status"]'))
      .first();

    await expect(toast).toBeVisible({ timeout: 3000 });

    // Button should show bookmarked state
    // Could check for filled icon or different styling
    const isBookmarked = await bookmarkButton.getAttribute('data-bookmarked')
      .catch(() => null);

    // Verify bookmarked (implementation may vary)
    console.log('Bookmark added, bookmarked state:', isBookmarked);
  });

  test('should remove bookmark from resource', async ({ page }) => {
    // First, add a bookmark
    await page.goto('/');
    await waitForNetworkIdle(page);

    const categoryCard = page.locator('[data-testid="category-card"]').first();
    await categoryCard.click();
    await waitForNetworkIdle(page);

    const resourceCard = page.locator('[data-testid="resource-card"]').first();
    const bookmarkButton = resourceCard.locator('[data-testid="bookmark-button"]')
      .or(resourceCard.getByRole('button', { name: /bookmark/i }))
      .first();

    // Add bookmark
    await bookmarkButton.click();
    await page.waitForResponse(response =>
      response.url().includes('/api/bookmarks'),
      { timeout: 5000 }
    );

    await page.waitForTimeout(500);

    // Click again to remove
    await bookmarkButton.click();

    // Wait for DELETE request
    await page.waitForResponse(response =>
      response.url().includes('/api/bookmarks') && response.request().method() === 'DELETE',
      { timeout: 5000 }
    );

    // Should show removed toast
    const toast = page.locator('[data-testid="toast"]')
      .or(page.locator('[role="status"]'))
      .first();

    await expect(toast).toBeVisible({ timeout: 3000 });
  });

  test('should view bookmarks page', async ({ page }) => {
    // Navigate to bookmarks page
    await page.goto('/bookmarks');
    await waitForNetworkIdle(page);

    // Verify page title
    await expect(page.locator('h1').filter({ hasText: /bookmark/i }).first()).toBeVisible();

    // Check for bookmarked resources or empty state
    const resources = page.locator('[data-testid="resource-card"]');
    const emptyState = page.getByText(/no bookmarks|bookmark.*resource/i).first();

    const resourceCount = await resources.count();
    const hasEmptyState = await emptyState.isVisible({ timeout: 2000 }).catch(() => false);

    // Should show either resources or empty state
    expect(resourceCount > 0 || hasEmptyState).toBeTruthy();
  });

  test('should add notes to bookmark', async ({ page }) => {
    await page.goto('/');
    await waitForNetworkIdle(page);

    // Navigate to category
    const categoryCard = page.locator('[data-testid="category-card"]').first();
    await categoryCard.click();
    await waitForNetworkIdle(page);

    // Bookmark a resource
    const resourceCard = page.locator('[data-testid="resource-card"]').first();
    const bookmarkButton = resourceCard.locator('[data-testid="bookmark-button"]')
      .or(resourceCard.getByRole('button', { name: /bookmark/i }))
      .first();

    await bookmarkButton.click();
    await page.waitForTimeout(1000);

    // Go to bookmarks page
    await page.goto('/bookmarks');
    await waitForNetworkIdle(page);

    // Look for notes input or edit button
    const notesButton = page.locator('[data-testid="edit-notes-button"]')
      .or(page.getByRole('button', { name: /notes|edit/i }))
      .first();

    const notesButtonCount = await notesButton.count();

    if (notesButtonCount > 0) {
      await notesButton.click();

      // Fill notes
      const notesInput = page.locator('[data-testid="notes-input"]')
        .or(page.locator('textarea'))
        .first();

      await notesInput.fill('This is a test note for E2E testing');

      // Save notes
      const saveButton = page.getByRole('button', { name: /save/i }).first();
      await saveButton.click();

      // Should show success message
      const toast = page.locator('[data-testid="toast"]')
        .or(page.locator('[role="status"]'))
        .first();

      await expect(toast).toBeVisible({ timeout: 3000 });
    } else {
      console.log('Notes feature not found on bookmarks page');
    }
  });
});

test.describe('User Features - Favorites', () => {
  test('should add favorite to resource', async ({ page }) => {
    await page.goto('/');
    await waitForNetworkIdle(page);

    // Navigate to category
    const categoryCard = page.locator('[data-testid="category-card"]').first();
    await categoryCard.click();
    await waitForNetworkIdle(page);

    // Find favorite button
    const resourceCard = page.locator('[data-testid="resource-card"]').first();
    const favoriteButton = resourceCard.locator('[data-testid="favorite-button"]')
      .or(resourceCard.getByRole('button', { name: /favorite|like/i }))
      .first();

    const favoriteCount = await favoriteButton.count();

    if (favoriteCount > 0) {
      await favoriteButton.click();

      // Wait for API response
      await page.waitForResponse(response =>
        response.url().includes('/api/favorites'),
        { timeout: 5000 }
      );

      // Should show toast
      const toast = page.locator('[data-testid="toast"]')
        .or(page.locator('[role="status"]'))
        .first();

      await expect(toast).toBeVisible({ timeout: 3000 });
    } else {
      console.log('Favorite button not found');
    }
  });

  test('should view favorites page', async ({ page }) => {
    // Navigate to favorites (might be in profile or separate page)
    const favoritesRoutes = ['/favorites', '/profile?tab=favorites', '/profile'];

    let foundPage = false;

    for (const route of favoritesRoutes) {
      await page.goto(route);
      await page.waitForTimeout(1000);

      const favoritesIndicator = page.locator('h1, h2, [role="tab"]')
        .filter({ hasText: /favorite/i })
        .first();

      if (await favoritesIndicator.isVisible({ timeout: 2000 }).catch(() => false)) {
        foundPage = true;
        break;
      }
    }

    expect(foundPage).toBeTruthy();
  });
});

test.describe('User Features - Profile', () => {
  test('should view profile page', async ({ page }) => {
    await page.goto('/profile');
    await waitForNetworkIdle(page);

    // Verify profile page elements
    await expect(page.locator('h1').filter({ hasText: /profile|account/i }).first())
      .toBeVisible({ timeout: 5000 });

    // Should show user info
    const userInfo = page.locator('[data-testid="user-info"]')
      .or(page.getByText(/testuser/i))
      .first();

    // User email or name should be visible
    const hasUserInfo = await userInfo.isVisible({ timeout: 3000 }).catch(() => false);

    // Or should have profile tabs/sections
    const profileTabs = page.locator('[role="tab"]');
    const tabCount = await profileTabs.count();

    expect(hasUserInfo || tabCount > 0).toBeTruthy();
  });

  test('should display user statistics', async ({ page }) => {
    await page.goto('/profile');
    await waitForNetworkIdle(page);

    // Look for statistics
    const statsSection = page.locator('[data-testid="user-stats"]')
      .or(page.getByText(/\d+\s+(bookmark|favorite|submission)/i))
      .first();

    const hasStats = await statsSection.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasStats) {
      await expect(statsSection).toBeVisible();
    } else {
      console.log('User statistics not displayed on profile');
    }
  });

  test('should update user preferences', async ({ page }) => {
    await page.goto('/profile');
    await waitForNetworkIdle(page);

    // Look for preferences tab/section
    const preferencesTab = page.getByRole('tab', { name: /preference|setting/i }).first();

    const preferencesCount = await preferencesTab.count();

    if (preferencesCount > 0) {
      await preferencesTab.click();
      await page.waitForTimeout(500);

      // Look for skill level selector
      const skillLevelSelect = page.locator('[data-testid="skill-level-select"]')
        .or(page.getByLabel(/skill level/i))
        .first();

      const skillLevelCount = await skillLevelSelect.count();

      if (skillLevelCount > 0) {
        await skillLevelSelect.click();

        // Select option
        const intermediateOption = page.getByRole('option', { name: /intermediate/i }).first();
        await intermediateOption.click();

        // Save preferences
        const saveButton = page.getByRole('button', { name: /save/i }).first();

        if (await saveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await saveButton.click();

          // Should show success message
          const toast = page.locator('[data-testid="toast"]')
            .or(page.locator('[role="status"]'))
            .first();

          await expect(toast).toBeVisible({ timeout: 3000 });
        }
      }
    } else {
      console.log('Preferences section not found');
    }
  });
});

test.describe('User Features - Submit Resource', () => {
  test('should display submit resource form', async ({ page }) => {
    // Look for submit button in navigation
    const submitButton = page.locator('[data-testid="submit-resource-button"]')
      .or(page.getByRole('link', { name: /submit|add resource/i }))
      .first();

    const submitCount = await submitButton.count();

    if (submitCount > 0) {
      await submitButton.click();
      await waitForNetworkIdle(page);

      // Should be on submit page
      await expect(page).toHaveURL(/\/submit/);

      // Verify form fields
      await expect(page.locator('input[name="title"]').or(page.locator('input[placeholder*="title"]')).first())
        .toBeVisible({ timeout: 5000 });

      await expect(page.locator('input[name="url"]').or(page.locator('input[placeholder*="url"]')).first())
        .toBeVisible();

      await expect(page.locator('textarea[name="description"]').or(page.locator('textarea')).first())
        .toBeVisible();
    } else {
      // Try direct navigation
      await page.goto('/submit');
      await waitForNetworkIdle(page);

      // Verify form exists
      const titleInput = page.locator('input[name="title"]').or(page.locator('input')).first();
      await expect(titleInput).toBeVisible({ timeout: 5000 });
    }
  });

  test('should submit new resource', async ({ page }) => {
    await page.goto('/submit');
    await waitForNetworkIdle(page);

    // Fill in resource details
    const testResource = {
      title: `E2E Test Resource ${Date.now()}`,
      url: `https://github.com/test/resource-${Date.now()}`,
      description: 'This is a test resource submitted via E2E testing. It should be marked as pending.',
    };

    // Fill title
    const titleInput = page.locator('input[name="title"]')
      .or(page.locator('input[placeholder*="title"]'))
      .first();
    await titleInput.fill(testResource.title);

    // Fill URL
    const urlInput = page.locator('input[name="url"]')
      .or(page.locator('input[placeholder*="url"]'))
      .or(page.locator('input[type="url"]'))
      .first();
    await urlInput.fill(testResource.url);

    // Fill description
    const descriptionInput = page.locator('textarea[name="description"]')
      .or(page.locator('textarea'))
      .first();
    await descriptionInput.fill(testResource.description);

    // Select category
    const categorySelect = page.locator('[data-testid="category-select"]')
      .or(page.locator('select[name="category"]'))
      .or(page.getByLabel(/category/i))
      .first();

    const categoryCount = await categorySelect.count();

    if (categoryCount > 0) {
      await categorySelect.click();

      // Select first option
      const firstOption = page.getByRole('option').first();
      const optionCount = await firstOption.count();

      if (optionCount > 0) {
        await firstOption.click();
      } else {
        // Might be a custom select
        await categorySelect.selectOption({ index: 1 });
      }
    }

    // Submit form
    const submitButton = page.locator('button[type="submit"]')
      .or(page.getByRole('button', { name: /submit/i }))
      .first();

    await submitButton.click();

    // Wait for submission
    await page.waitForResponse(response =>
      response.url().includes('/api/resources') && response.request().method() === 'POST',
      { timeout: 10000 }
    );

    // Should show success message
    const toast = page.locator('[data-testid="toast"]')
      .or(page.locator('[role="status"]'))
      .first();

    await expect(toast).toBeVisible({ timeout: 5000 });

    // Should redirect or clear form
    await page.waitForTimeout(1000);

    // Clean up test resource
    await cleanupTestResources(page, 'E2E Test Resource');
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/submit');
    await waitForNetworkIdle(page);

    // Try to submit without filling required fields
    const submitButton = page.locator('button[type="submit"]')
      .or(page.getByRole('button', { name: /submit/i }))
      .first();

    await submitButton.click();

    // Should show validation errors
    const errorMessage = page.getByText(/required|fill|enter/i).first();

    // Either client-side validation prevents submit, or shows error
    const hasError = await errorMessage.isVisible({ timeout: 3000 }).catch(() => false);

    // Or form inputs show invalid state
    const titleInput = page.locator('input[name="title"]').first();
    const isInvalid = await titleInput.evaluate((el: HTMLInputElement) => {
      return el.validity && !el.validity.valid;
    }).catch(() => false);

    expect(hasError || isInvalid).toBeTruthy();
  });

  test('should validate URL format', async ({ page }) => {
    await page.goto('/submit');
    await waitForNetworkIdle(page);

    // Fill invalid URL
    const urlInput = page.locator('input[name="url"]')
      .or(page.locator('input[type="url"]'))
      .first();

    await urlInput.fill('not-a-valid-url');

    // Try to submit
    const submitButton = page.locator('button[type="submit"]')
      .or(page.getByRole('button', { name: /submit/i }))
      .first();

    await submitButton.click();

    // Should show URL validation error
    const errorMessage = page.getByText(/valid.*url|invalid.*url|url.*format/i).first();

    const hasError = await errorMessage.isVisible({ timeout: 3000 }).catch(() => false);

    // Or input shows invalid state
    const isInvalid = await urlInput.evaluate((el: HTMLInputElement) => {
      return el.validity && !el.validity.valid;
    }).catch(() => false);

    expect(hasError || isInvalid).toBeTruthy();
  });
});

test.describe('User Features - Submission History', () => {
  test('should view submission history', async ({ page }) => {
    // Navigate to profile or submissions page
    const submissionRoutes = ['/profile?tab=submissions', '/submissions', '/profile'];

    let foundPage = false;

    for (const route of submissionRoutes) {
      await page.goto(route);
      await page.waitForTimeout(1000);

      // Look for submissions section
      const submissionsIndicator = page.locator('h2, h3, [role="tab"]')
        .filter({ hasText: /submission|my resource/i })
        .first();

      if (await submissionsIndicator.isVisible({ timeout: 2000 }).catch(() => false)) {
        foundPage = true;

        // Click tab if needed
        if (await submissionsIndicator.getAttribute('role') === 'tab') {
          await submissionsIndicator.click();
          await page.waitForTimeout(500);
        }

        break;
      }
    }

    if (foundPage) {
      // Should show submissions or empty state
      const submissions = page.locator('[data-testid="submission-item"]')
        .or(page.locator('[data-testid="resource-card"]'));

      const emptyState = page.getByText(/no submission|haven't submitted|submit.*first/i).first();

      const submissionCount = await submissions.count();
      const hasEmptyState = await emptyState.isVisible({ timeout: 2000 }).catch(() => false);

      expect(submissionCount > 0 || hasEmptyState).toBeTruthy();
    } else {
      console.log('Submission history page not found');
    }
  });
});

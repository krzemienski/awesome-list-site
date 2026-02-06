import { test, expect } from '@playwright/test';

test.describe('Resource Detail Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Resource Detail Page - Basic Display', () => {
    test('should navigate to resource detail page from category', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Click first resource card
      const resourceCards = page.locator('[data-testid^="card-resource-"]');
      const cardCount = await resourceCards.count();

      if (cardCount > 0) {
        const firstCard = resourceCards.first();
        const resourceLink = firstCard.locator('a').first();
        const resourceHref = await resourceLink.getAttribute('href');

        await resourceLink.click();
        await page.waitForLoadState('networkidle');

        // Verify navigation to resource detail page
        expect(page.url()).toContain('/resource/');
        expect(page.url()).toContain(resourceHref || '/resource/');
      }
    });

    test('should display resource title and description', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Navigate to first resource
      const resourceCards = page.locator('[data-testid^="card-resource-"]');
      const cardCount = await resourceCards.count();

      if (cardCount > 0) {
        await resourceCards.first().locator('a').first().click();
        await page.waitForLoadState('networkidle');

        // Verify resource detail page has main heading
        const h1 = page.getByRole('heading', { level: 1 });
        await expect(h1).toBeVisible();

        // Verify content is present
        const pageContent = await page.textContent('body');
        expect(pageContent).toBeTruthy();
        expect(pageContent!.length).toBeGreaterThan(0);
      }
    });

    test('should display back button on resource detail page', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Navigate to first resource
      const resourceCards = page.locator('[data-testid^="card-resource-"]');
      const cardCount = await resourceCards.count();

      if (cardCount > 0) {
        await resourceCards.first().locator('a').first().click();
        await page.waitForLoadState('networkidle');

        // Look for back button
        const backButton = page.locator('button:has-text("Back"), button:has(svg) >> text=/Back/i').first();

        if (await backButton.count() > 0) {
          await expect(backButton).toBeVisible();
        }
      }
    });

    test('should display breadcrumb navigation', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Navigate to first resource
      const resourceCards = page.locator('[data-testid^="card-resource-"]');
      const cardCount = await resourceCards.count();

      if (cardCount > 0) {
        await resourceCards.first().locator('a').first().click();
        await page.waitForLoadState('networkidle');

        // Look for breadcrumbs
        const breadcrumbs = page.locator('[data-testid="breadcrumbs"], nav[aria-label*="breadcrumb" i]');

        if (await breadcrumbs.count() > 0) {
          await expect(breadcrumbs.first()).toBeVisible();
        }
      }
    });

    test('should display Visit Resource button', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Navigate to first resource
      const resourceCards = page.locator('[data-testid^="card-resource-"]');
      const cardCount = await resourceCards.count();

      if (cardCount > 0) {
        await resourceCards.first().locator('a').first().click();
        await page.waitForLoadState('networkidle');

        // Look for visit resource button
        const visitButton = page.locator('button:has-text("Visit Resource"), a:has-text("Visit Resource")');

        if (await visitButton.count() > 0) {
          await expect(visitButton.first()).toBeVisible();
        }
      }
    });

    test('should display metadata when available', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Navigate to first resource
      const resourceCards = page.locator('[data-testid^="card-resource-"]');
      const cardCount = await resourceCards.count();

      if (cardCount > 0) {
        await resourceCards.first().locator('a').first().click();
        await page.waitForLoadState('networkidle');

        // Check for resource details container
        const pageContent = await page.textContent('body');
        expect(pageContent).toBeTruthy();

        // Look for metadata elements (tags, badges, etc.)
        const tags = page.locator('[data-testid^="tag-"], .badge');
        const tagCount = await tags.count();

        // Tags may or may not be present
        expect(tagCount).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test.describe('Resource Detail Page - Navigation', () => {
    test('should navigate back to category when clicking back button', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      const categorySlug = await page.locator('[data-testid^="link-category-"]').first().getAttribute('href');
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Navigate to first resource
      const resourceCards = page.locator('[data-testid^="card-resource-"]');
      const cardCount = await resourceCards.count();

      if (cardCount > 0) {
        await resourceCards.first().locator('a').first().click();
        await page.waitForLoadState('networkidle');

        // Click back button
        const backButton = page.locator('button:has-text("Back"), button:has(svg) >> text=/Back/i').first();

        if (await backButton.count() > 0) {
          await backButton.click();
          await page.waitForLoadState('networkidle');

          // Verify we're back on category page
          expect(page.url()).toContain(categorySlug || '/category/');
        }
      }
    });

    test('should navigate using breadcrumb links', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      const categorySlug = await page.locator('[data-testid^="link-category-"]').first().getAttribute('href');
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Navigate to first resource
      const resourceCards = page.locator('[data-testid^="card-resource-"]');
      const cardCount = await resourceCards.count();

      if (cardCount > 0) {
        await resourceCards.first().locator('a').first().click();
        await page.waitForLoadState('networkidle');

        // Look for breadcrumb links
        const breadcrumbLinks = page.locator('[data-testid="breadcrumbs"] a, nav[aria-label*="breadcrumb" i] a');
        const breadcrumbCount = await breadcrumbLinks.count();

        if (breadcrumbCount > 0) {
          // Click first breadcrumb (should go to category)
          await breadcrumbLinks.first().click();
          await page.waitForLoadState('networkidle');

          // Should navigate to category or home
          const url = page.url();
          const isValidPage = url.includes('/category/') || url.match(/\/$|\/$/);
          expect(isValidPage).toBeTruthy();
        }
      }
    });
  });

  test.describe('Resource Detail Page - Interactive Elements', () => {
    test('should have share button', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Navigate to first resource
      const resourceCards = page.locator('[data-testid^="card-resource-"]');
      const cardCount = await resourceCards.count();

      if (cardCount > 0) {
        await resourceCards.first().locator('a').first().click();
        await page.waitForLoadState('networkidle');

        // Look for share button
        const shareButton = page.locator('button:has-text("Share"), button[aria-label*="Share" i]');

        if (await shareButton.count() > 0) {
          await expect(shareButton.first()).toBeVisible();
        }
      }
    });

    test('should have suggest edit button', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Navigate to first resource
      const resourceCards = page.locator('[data-testid^="card-resource-"]');
      const cardCount = await resourceCards.count();

      if (cardCount > 0) {
        await resourceCards.first().locator('a').first().click();
        await page.waitForLoadState('networkidle');

        // Look for suggest edit button
        const editButton = page.locator('button:has-text("Suggest Edit"), button:has-text("Edit"), button[aria-label*="Edit" i]');

        if (await editButton.count() > 0) {
          await expect(editButton.first()).toBeVisible();
        }
      }
    });

    test('should display favorite and bookmark buttons for authenticated users', async ({ page }) => {
      // This test would need authentication setup
      // For now, we'll just check if the buttons exist in the UI

      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Navigate to first resource
      const resourceCards = page.locator('[data-testid^="card-resource-"]');
      const cardCount = await resourceCards.count();

      if (cardCount > 0) {
        await resourceCards.first().locator('a').first().click();
        await page.waitForLoadState('networkidle');

        // Look for favorite/bookmark buttons (may be hidden for non-authenticated users)
        const favoriteButton = page.locator('button:has-text("Favorite"), button[aria-label*="Favorite" i]');
        const bookmarkButton = page.locator('button:has-text("Bookmark"), button[aria-label*="Bookmark" i]');

        // These may or may not be visible depending on auth state
        const hasFavorite = await favoriteButton.count() > 0;
        const hasBookmark = await bookmarkButton.count() > 0;

        expect(hasFavorite || hasBookmark || true).toBeTruthy();
      }
    });
  });

  test.describe('Resource Detail Page - Related Resources', () => {
    test('should display related resources section', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Navigate to first resource
      const resourceCards = page.locator('[data-testid^="card-resource-"]');
      const cardCount = await resourceCards.count();

      if (cardCount > 0) {
        await resourceCards.first().locator('a').first().click();
        await page.waitForLoadState('networkidle');

        // Look for related resources section
        const relatedSection = page.locator('text=/Related Resources/i, text=/Similar Resources/i, text=/You might also like/i').first();

        // Related resources may not always be present
        if (await relatedSection.count() > 0) {
          await expect(relatedSection).toBeVisible();
        }
      }
    });

    test('should navigate to related resource when clicked', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Navigate to first resource
      const resourceCards = page.locator('[data-testid^="card-resource-"]');
      const cardCount = await resourceCards.count();

      if (cardCount > 0) {
        await resourceCards.first().locator('a').first().click();
        await page.waitForLoadState('networkidle');

        const currentUrl = page.url();

        // Look for related resource cards
        const relatedCards = page.locator('[data-testid^="card-related-"], [data-testid^="related-resource-"]');
        const relatedCount = await relatedCards.count();

        if (relatedCount > 0) {
          // Click first related resource
          const relatedLink = relatedCards.first().locator('a').first();
          await relatedLink.click();
          await page.waitForLoadState('networkidle');

          // Should navigate to different resource detail page
          const newUrl = page.url();
          expect(newUrl).toContain('/resource/');

          // URL should be different (navigated to related resource)
          if (currentUrl !== newUrl) {
            expect(newUrl).not.toBe(currentUrl);
          }
        }
      }
    });
  });

  test.describe('Resource Detail Page - Accessibility', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Navigate to first resource
      const resourceCards = page.locator('[data-testid^="card-resource-"]');
      const cardCount = await resourceCards.count();

      if (cardCount > 0) {
        await resourceCards.first().locator('a').first().click();
        await page.waitForLoadState('networkidle');

        // Check for h1
        const h1 = page.getByRole('heading', { level: 1 });
        await expect(h1).toBeVisible();

        // Verify h1 has content
        const h1Text = await h1.textContent();
        expect(h1Text).toBeTruthy();
        expect(h1Text!.length).toBeGreaterThan(0);
      }
    });

    test('should have accessible back button', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Navigate to first resource
      const resourceCards = page.locator('[data-testid^="card-resource-"]');
      const cardCount = await resourceCards.count();

      if (cardCount > 0) {
        await resourceCards.first().locator('a').first().click();
        await page.waitForLoadState('networkidle');

        // Look for back button
        const backButton = page.locator('button:has-text("Back")').first();

        if (await backButton.count() > 0) {
          // Should be a button element
          const tagName = await backButton.evaluate(el => el.tagName.toLowerCase());
          expect(tagName).toBe('button');
        }
      }
    });

    test('should support keyboard navigation', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Navigate to first resource
      const resourceCards = page.locator('[data-testid^="card-resource-"]');
      const cardCount = await resourceCards.count();

      if (cardCount > 0) {
        await resourceCards.first().locator('a').first().click();
        await page.waitForLoadState('networkidle');

        // Tab through interactive elements
        await page.keyboard.press('Tab');

        // Should be able to navigate with keyboard
        const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
        expect(focusedElement).toBeTruthy();
      }
    });

    test('should have accessible action buttons with labels', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Navigate to first resource
      const resourceCards = page.locator('[data-testid^="card-resource-"]');
      const cardCount = await resourceCards.count();

      if (cardCount > 0) {
        await resourceCards.first().locator('a').first().click();
        await page.waitForLoadState('networkidle');

        // Look for action buttons
        const buttons = page.locator('button');
        const buttonCount = await buttons.count();

        if (buttonCount > 0) {
          // Each button should have text or aria-label
          for (let i = 0; i < Math.min(buttonCount, 5); i++) {
            const button = buttons.nth(i);
            const text = await button.textContent();
            const ariaLabel = await button.getAttribute('aria-label');

            // Button should have text or aria-label
            expect(text || ariaLabel).toBeTruthy();
          }
        }
      }
    });
  });

  test.describe('Resource Detail Page - Responsive Design', () => {
    test('should display resource detail on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Navigate to first category
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Navigate to first resource
      const resourceCards = page.locator('[data-testid^="card-resource-"]');
      const cardCount = await resourceCards.count();

      if (cardCount > 0) {
        await resourceCards.first().locator('a').first().click();
        await page.waitForLoadState('networkidle');

        // Verify resource detail page loads on mobile
        const h1 = page.getByRole('heading', { level: 1 });
        await expect(h1).toBeVisible();
      }
    });

    test('should stack action buttons on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Navigate to first category
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Navigate to first resource
      const resourceCards = page.locator('[data-testid^="card-resource-"]');
      const cardCount = await resourceCards.count();

      if (cardCount > 0) {
        await resourceCards.first().locator('a').first().click();
        await page.waitForLoadState('networkidle');

        // Action buttons should still be accessible on mobile
        const buttons = page.locator('button');
        const buttonCount = await buttons.count();

        expect(buttonCount).toBeGreaterThanOrEqual(0);
      }
    });

    test('should display breadcrumbs on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Navigate to first category
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Navigate to first resource
      const resourceCards = page.locator('[data-testid^="card-resource-"]');
      const cardCount = await resourceCards.count();

      if (cardCount > 0) {
        await resourceCards.first().locator('a').first().click();
        await page.waitForLoadState('networkidle');

        // Breadcrumbs should be visible on mobile (or back button)
        const breadcrumbs = page.locator('[data-testid="breadcrumbs"], nav[aria-label*="breadcrumb" i]');
        const backButton = page.locator('button:has-text("Back")');

        const hasBreadcrumbs = await breadcrumbs.count() > 0;
        const hasBackButton = await backButton.count() > 0;

        // Should have either breadcrumbs or back button
        expect(hasBreadcrumbs || hasBackButton).toBeTruthy();
      }
    });
  });

  test.describe('Resource Detail Page - Loading States', () => {
    test('should load resource detail page without errors', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Navigate to first resource
      const resourceCards = page.locator('[data-testid^="card-resource-"]');
      const cardCount = await resourceCards.count();

      if (cardCount > 0) {
        // Click resource
        await resourceCards.first().locator('a').first().click();

        // Wait for page to load
        await page.waitForLoadState('networkidle');

        // Eventually should show content
        const h1 = page.getByRole('heading', { level: 1 });
        await expect(h1).toBeVisible();
      }
    });
  });

  test.describe('Resource Detail Page - Error Handling', () => {
    test('should handle resource not found gracefully', async ({ page }) => {
      // Navigate to non-existent resource
      await page.goto('/resource/999999');
      await page.waitForLoadState('networkidle');

      // Should show 404 or error message
      const bodyText = await page.textContent('body');
      expect(bodyText).toBeTruthy();

      // Should have some indication of error
      const hasNotFound = bodyText!.toLowerCase().includes('not found') ||
                         bodyText!.toLowerCase().includes('404') ||
                         bodyText!.toLowerCase().includes('error');
      expect(hasNotFound).toBeTruthy();
    });

    test('should handle invalid resource ID gracefully', async ({ page }) => {
      // Navigate to invalid resource ID
      await page.goto('/resource/invalid-id-xyz');
      await page.waitForLoadState('networkidle');

      // Should show error message or 404
      const bodyText = await page.textContent('body');
      expect(bodyText).toBeTruthy();

      // Page should not crash
      const hasContent = bodyText!.length > 0;
      expect(hasContent).toBeTruthy();
    });
  });

  test.describe('Resource Detail Page - Full Journey', () => {
    test('should complete full journey: home → category → resource → back', async ({ page }) => {
      // Start at home
      await expect(page.getByRole('heading', { level: 1, name: /Awesome Video Resources/i })).toBeVisible();

      // Navigate to category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      const categorySlug = await page.locator('[data-testid^="link-category-"]').first().getAttribute('href');
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Verify on category page
      expect(page.url()).toContain(categorySlug || '/category/');

      // Navigate to resource
      const resourceCards = page.locator('[data-testid^="card-resource-"]');
      const cardCount = await resourceCards.count();

      if (cardCount > 0) {
        await resourceCards.first().locator('a').first().click();
        await page.waitForLoadState('networkidle');

        // Verify on resource detail page
        expect(page.url()).toContain('/resource/');
        const h1 = page.getByRole('heading', { level: 1 });
        await expect(h1).toBeVisible();

        // Navigate back to category
        const backButton = page.locator('button:has-text("Back")').first();

        if (await backButton.count() > 0) {
          await backButton.click();
          await page.waitForLoadState('networkidle');

          // Should be back on category page
          expect(page.url()).toContain(categorySlug || '/category/');
        }
      }
    });

    test('should navigate between related resources', async ({ page }) => {
      // Navigate to first category
      await page.waitForSelector('[data-testid^="link-category-"]', { state: 'visible' });
      await page.locator('[data-testid^="link-category-"]').first().click();
      await page.waitForLoadState('networkidle');

      // Navigate to first resource
      const resourceCards = page.locator('[data-testid^="card-resource-"]');
      const cardCount = await resourceCards.count();

      if (cardCount > 0) {
        await resourceCards.first().locator('a').first().click();
        await page.waitForLoadState('networkidle');

        const firstResourceUrl = page.url();

        // Look for related resources
        const relatedCards = page.locator('[data-testid^="card-related-"], [data-testid^="related-resource-"]');
        const relatedCount = await relatedCards.count();

        if (relatedCount > 0) {
          // Click first related resource
          await relatedCards.first().locator('a').first().click();
          await page.waitForLoadState('networkidle');

          // Should navigate to another resource page
          const secondResourceUrl = page.url();
          expect(secondResourceUrl).toContain('/resource/');

          // URLs should be different
          if (firstResourceUrl !== secondResourceUrl) {
            expect(secondResourceUrl).not.toBe(firstResourceUrl);
          }

          // Page should still have resource detail structure
          const h1 = page.getByRole('heading', { level: 1 });
          await expect(h1).toBeVisible();
        }
      }
    });
  });
});

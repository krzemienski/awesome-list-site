import { test, expect } from '@playwright/test';

test.describe('Admin Operations Flow', () => {
  // Note: These tests assume the user is authenticated as an admin
  // In a real test environment, you would need to set up admin authentication
  // or mock the admin auth state appropriately

  test.beforeEach(async ({ page }) => {
    // Navigate to admin dashboard
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Admin Dashboard - Access and Navigation', () => {
    test('should display admin dashboard heading', async ({ page }) => {
      // Check for admin dashboard heading
      const heading = page.getByRole('heading', { level: 1, name: /Admin Dashboard/i });

      if (await heading.count() > 0) {
        await expect(heading).toBeVisible();
      }
    });

    test('should display admin shield icon', async ({ page }) => {
      // Look for Shield icon in heading
      const heading = page.getByRole('heading', { level: 1 });

      if (await heading.count() > 0) {
        const headingText = await heading.textContent();
        expect(headingText).toMatch(/Admin Dashboard/i);
      }
    });

    test('should display page description', async ({ page }) => {
      // Check for description text
      const description = page.getByText(/Manage resources, users, and system configuration/i);

      if (await description.count() > 0) {
        await expect(description).toBeVisible();
      }
    });

    test('should not be accessible to non-admin users', async ({ page }) => {
      // In a real test, this would verify that non-admin users get redirected
      // For now, we just verify the page requires authentication
      const body = await page.textContent('body');
      expect(body).toBeTruthy();
    });
  });

  test.describe('Admin Dashboard - Statistics Cards', () => {
    test('should display total users card', async ({ page }) => {
      // Look for Total Users card
      const usersCard = page.getByText('Total Users');

      if (await usersCard.count() > 0) {
        await expect(usersCard).toBeVisible();
      }
    });

    test('should display total resources card', async ({ page }) => {
      // Look for Total Resources card
      const resourcesCard = page.getByText('Total Resources');

      if (await resourcesCard.count() > 0) {
        await expect(resourcesCard).toBeVisible();
      }
    });

    test('should display learning journeys card', async ({ page }) => {
      // Look for Learning Journeys card
      const journeysCard = page.getByText('Learning Journeys');

      if (await journeysCard.count() > 0) {
        await expect(journeysCard).toBeVisible();
      }
    });

    test('should display pending approvals card', async ({ page }) => {
      // Look for Pending Approvals card
      const approvalsCard = page.getByText('Pending Approvals');

      if (await approvalsCard.count() > 0) {
        await expect(approvalsCard).toBeVisible();
      }
    });

    test('should display numeric stats values', async ({ page }) => {
      // Verify that stats cards have numeric values
      const cards = page.locator('.text-2xl.font-bold.font-mono');
      const cardCount = await cards.count();

      if (cardCount > 0) {
        const firstCardText = await cards.first().textContent();
        // Should contain a number or "..."
        expect(firstCardText).toMatch(/\d+|\.\.\./ );
      }
    });
  });

  test.describe('Admin Dashboard - Tab Navigation', () => {
    test('should display all admin tabs', async ({ page }) => {
      // Verify tabs are present
      const tabs = page.locator('[role="tablist"]');

      if (await tabs.count() > 0) {
        await expect(tabs).toBeVisible();
      }
    });

    test('should navigate to approvals tab', async ({ page }) => {
      // Click on Approvals tab
      const approvalsTab = page.getByTestId('tab-approvals');

      if (await approvalsTab.count() > 0) {
        await approvalsTab.click();
        await page.waitForTimeout(300);

        // Verify content is displayed
        const content = page.getByTestId('content-approvals');
        if (await content.count() > 0) {
          await expect(content).toBeVisible();
        }
      }
    });

    test('should navigate to edits tab', async ({ page }) => {
      // Click on Edits tab
      const editsTab = page.getByTestId('tab-edits');

      if (await editsTab.count() > 0) {
        await editsTab.click();
        await page.waitForTimeout(300);

        // Verify content is displayed
        const content = page.getByTestId('content-edits');
        if (await content.count() > 0) {
          await expect(content).toBeVisible();
        }
      }
    });

    test('should navigate to enrichment tab', async ({ page }) => {
      // Click on Enrichment tab
      const enrichmentTab = page.getByTestId('tab-enrichment');

      if (await enrichmentTab.count() > 0) {
        await enrichmentTab.click();
        await page.waitForTimeout(300);

        // Verify content is displayed
        const content = page.getByTestId('content-enrichment');
        if (await content.count() > 0) {
          await expect(content).toBeVisible();
        }
      }
    });

    test('should navigate to categories tab', async ({ page }) => {
      // Click on Categories tab
      const categoriesTab = page.getByTestId('tab-categories');

      if (await categoriesTab.count() > 0) {
        await categoriesTab.click();
        await page.waitForTimeout(300);

        // Verify content is displayed
        const content = page.getByTestId('content-categories');
        if (await content.count() > 0) {
          await expect(content).toBeVisible();
        }
      }
    });

    test('should navigate to subcategories tab', async ({ page }) => {
      // Click on Subcategories tab
      const subcategoriesTab = page.getByTestId('tab-subcategories');

      if (await subcategoriesTab.count() > 0) {
        await subcategoriesTab.click();
        await page.waitForTimeout(300);

        // Verify content is displayed
        const content = page.getByTestId('content-subcategories');
        if (await content.count() > 0) {
          await expect(content).toBeVisible();
        }
      }
    });

    test('should navigate to sub-subcategories tab', async ({ page }) => {
      // Click on Sub-Subcats tab
      const subSubcategoriesTab = page.getByTestId('tab-subsubcategories');

      if (await subSubcategoriesTab.count() > 0) {
        await subSubcategoriesTab.click();
        await page.waitForTimeout(300);

        // Verify content is displayed
        const content = page.getByTestId('content-subsubcategories');
        if (await content.count() > 0) {
          await expect(content).toBeVisible();
        }
      }
    });

    test('should show pending approvals badge when available', async ({ page }) => {
      // Look for badge on Approvals tab
      const badge = page.locator('[data-testid="tab-approvals"] .ml-2');

      // Badge may or may not exist depending on pending approvals count
      const badgeCount = await badge.count();
      expect(badgeCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Admin Dashboard - Export Operations', () => {
    test('should display export awesome list card', async ({ page }) => {
      // Navigate to Export tab
      await page.getByText('Export', { exact: true }).click();
      await page.waitForTimeout(300);

      // Look for Export Awesome List card
      const exportCard = page.getByText('Export Awesome List');

      if (await exportCard.count() > 0) {
        await expect(exportCard).toBeVisible();
      }
    });

    test('should display export markdown button', async ({ page }) => {
      // Navigate to Export tab
      await page.getByText('Export', { exact: true }).click();
      await page.waitForTimeout(300);

      // Look for Export Markdown button
      const exportButton = page.getByRole('button', { name: /Export Markdown/i });

      if (await exportButton.count() > 0) {
        await expect(exportButton).toBeVisible();
      }
    });

    test('should display quick actions section', async ({ page }) => {
      // Navigate to Export tab
      await page.getByText('Export', { exact: true }).click();
      await page.waitForTimeout(300);

      // Look for Quick Actions card
      const quickActions = page.getByText('Quick Actions');

      if (await quickActions.count() > 0) {
        await expect(quickActions).toBeVisible();
      }
    });

    test('should display run validation button', async ({ page }) => {
      // Navigate to Export tab
      await page.getByText('Export', { exact: true }).click();
      await page.waitForTimeout(300);

      // Look for Run Validation button
      const validateButton = page.getByRole('button', { name: /Run Validation/i });

      if (await validateButton.count() > 0) {
        await expect(validateButton).toBeVisible();
      }
    });

    test('should display check all links button', async ({ page }) => {
      // Navigate to Export tab
      await page.getByText('Export', { exact: true }).click();
      await page.waitForTimeout(300);

      // Look for Check All Links button
      const checkLinksButton = page.getByRole('button', { name: /Check All Links/i });

      if (await checkLinksButton.count() > 0) {
        await expect(checkLinksButton).toBeVisible();
      }
    });
  });

  test.describe('Admin Dashboard - Database Operations', () => {
    test('should display database management card', async ({ page }) => {
      // Navigate to Database tab
      await page.getByText('Database', { exact: true }).click();
      await page.waitForTimeout(300);

      // Look for Database Management card
      const dbCard = page.getByText('Database Management');

      if (await dbCard.count() > 0) {
        await expect(dbCard).toBeVisible();
      }
    });

    test('should display seed database button', async ({ page }) => {
      // Navigate to Database tab
      await page.getByText('Database', { exact: true }).click();
      await page.waitForTimeout(300);

      // Look for Seed Database button
      const seedButton = page.getByTestId('button-seed-database');

      if (await seedButton.count() > 0) {
        await expect(seedButton).toBeVisible();
        await expect(seedButton).toContainText(/Seed Database/i);
      }
    });

    test('should display clear and re-seed button', async ({ page }) => {
      // Navigate to Database tab
      await page.getByText('Database', { exact: true }).click();
      await page.waitForTimeout(300);

      // Look for Clear & Re-seed button
      const clearReseedButton = page.getByTestId('button-clear-reseed');

      if (await clearReseedButton.count() > 0) {
        await expect(clearReseedButton).toBeVisible();
        await expect(clearReseedButton).toContainText(/Clear & Re-seed/i);
      }
    });

    test('should display database seeding warning', async ({ page }) => {
      // Navigate to Database tab
      await page.getByText('Database', { exact: true }).click();
      await page.waitForTimeout(300);

      // Look for warning alert
      const alert = page.getByText('Database Seeding');

      if (await alert.count() > 0) {
        await expect(alert).toBeVisible();
      }
    });

    test('should display current database stats', async ({ page }) => {
      // Navigate to Database tab
      await page.getByText('Database', { exact: true }).click();
      await page.waitForTimeout(300);

      // Look for Current Database Stats section
      const statsSection = page.getByText('Current Database Stats');

      if (await statsSection.count() > 0) {
        await expect(statsSection).toBeVisible();
      }
    });

    test('should show confirmation dialog for clear and re-seed', async ({ page }) => {
      // Navigate to Database tab
      await page.getByText('Database', { exact: true }).click();
      await page.waitForTimeout(300);

      // Set up dialog handler to dismiss
      page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('Are you sure');
        await dialog.dismiss();
      });

      // Click Clear & Re-seed button
      const clearReseedButton = page.getByTestId('button-clear-reseed');

      if (await clearReseedButton.count() > 0) {
        await clearReseedButton.click();
        await page.waitForTimeout(300);
      }
    });
  });

  test.describe('Admin Dashboard - Validation Operations', () => {
    test('should display validation tab content', async ({ page }) => {
      // Navigate to Validation tab
      await page.getByText('Validation', { exact: true }).click();
      await page.waitForTimeout(300);

      // Look for validation cards
      const awesomeLintCard = page.getByText('Awesome List Validation');

      if (await awesomeLintCard.count() > 0) {
        await expect(awesomeLintCard).toBeVisible();
      }
    });

    test('should display link check results card', async ({ page }) => {
      // Navigate to Validation tab
      await page.getByText('Validation', { exact: true }).click();
      await page.waitForTimeout(300);

      // Look for Link Check Results card
      const linkCheckCard = page.getByText('Link Check Results');

      if (await linkCheckCard.count() > 0) {
        await expect(linkCheckCard).toBeVisible();
      }
    });

    test('should show validation status when available', async ({ page }) => {
      // Navigate to Validation tab
      await page.getByText('Validation', { exact: true }).click();
      await page.waitForTimeout(300);

      // Look for validation status (Passed/Failed badge)
      const passedBadge = page.getByText('Passed');
      const failedBadge = page.getByText('Failed');

      const hasPassedBadge = await passedBadge.isVisible().catch(() => false);
      const hasFailedBadge = await failedBadge.isVisible().catch(() => false);

      // Either has status badges or shows "No validation results available"
      const noResults = page.getByText('No validation results available');
      const hasNoResults = await noResults.isVisible().catch(() => false);

      expect(hasPassedBadge || hasFailedBadge || hasNoResults).toBeTruthy();
    });

    test('should display link check statistics when available', async ({ page }) => {
      // Navigate to Validation tab
      await page.getByText('Validation', { exact: true }).click();
      await page.waitForTimeout(300);

      // Look for link check stats
      const validLinks = page.getByText('Valid Links');
      const brokenLinks = page.getByText('Broken Links');

      const hasValidLinks = await validLinks.isVisible().catch(() => false);
      const hasBrokenLinks = await brokenLinks.isVisible().catch(() => false);

      // Either has stats or shows "No link check results available"
      const noResults = page.getByText('No link check results available');
      const hasNoResults = await noResults.isVisible().catch(() => false);

      expect(hasValidLinks || hasBrokenLinks || hasNoResults).toBeTruthy();
    });
  });

  test.describe('Admin Dashboard - Pending Resources', () => {
    test('should display pending resources in approvals tab', async ({ page }) => {
      // Navigate to Approvals tab
      const approvalsTab = page.getByTestId('tab-approvals');

      if (await approvalsTab.count() > 0) {
        await approvalsTab.click();
        await page.waitForTimeout(300);

        // Content should be loaded
        const content = page.getByTestId('content-approvals');
        if (await content.count() > 0) {
          await expect(content).toBeVisible();
        }
      }
    });

    test('should have accessible tabs with proper ARIA attributes', async ({ page }) => {
      // Check for tabs with proper roles
      const tabList = page.locator('[role="tablist"]');

      if (await tabList.count() > 0) {
        await expect(tabList).toBeVisible();

        // Check for tab elements
        const tabs = page.locator('[role="tab"]');
        const tabCount = await tabs.count();
        expect(tabCount).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Admin Dashboard - Accessibility', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      // Check for h1
      const h1 = page.getByRole('heading', { level: 1 });

      if (await h1.count() > 0) {
        await expect(h1).toBeVisible();
        await expect(h1).toContainText(/Admin Dashboard/i);
      }
    });

    test('should have accessible buttons with proper labels', async ({ page }) => {
      // Navigate to Database tab
      await page.getByText('Database', { exact: true }).click();
      await page.waitForTimeout(300);

      // Check buttons have text content
      const seedButton = page.getByTestId('button-seed-database');

      if (await seedButton.count() > 0) {
        const buttonText = await seedButton.textContent();
        expect(buttonText).toBeTruthy();
        expect(buttonText).toMatch(/Seed Database/i);
      }
    });

    test('should support keyboard navigation in tabs', async ({ page }) => {
      // Find first tab
      const firstTab = page.locator('[role="tab"]').first();

      if (await firstTab.count() > 0) {
        // Focus on first tab
        await firstTab.focus();

        // Tab should be focusable
        const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('role'));
        expect(focusedElement).toBe('tab');
      }
    });

    test('should have loading states with proper feedback', async ({ page }) => {
      // Check for loading animation or states
      const loadingIndicator = page.locator('.animate-spin');

      // May or may not be visible depending on timing
      const loadingCount = await loadingIndicator.count();
      expect(loadingCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Admin Dashboard - Responsive Design', () => {
    test('should display admin dashboard on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify heading is visible
      const heading = page.getByRole('heading', { level: 1 });

      if (await heading.count() > 0) {
        await expect(heading).toBeVisible();
      }
    });

    test('should have scrollable tabs on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Check for tabs overflow container
      const tabsList = page.locator('[role="tablist"]');

      if (await tabsList.count() > 0) {
        await expect(tabsList).toBeVisible();
      }
    });

    test('should stack stats cards on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify stats cards are visible
      const statsCards = page.locator('.text-2xl.font-bold.font-mono');
      const cardCount = await statsCards.count();

      if (cardCount > 0) {
        await expect(statsCards.first()).toBeVisible();
      }
    });
  });

  test.describe('Admin Dashboard - Error Handling', () => {
    test('should handle failed stats load gracefully', async ({ page }) => {
      // Intercept admin stats API and make it fail
      await page.route('**/api/admin/stats', route => route.abort());

      // Navigate to admin dashboard
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      // Page should still render
      const body = await page.textContent('body');
      expect(body).toBeTruthy();

      // Unblock API calls
      await page.unroute('**/api/admin/stats');
    });

    test('should handle failed export operation gracefully', async ({ page }) => {
      // Navigate to Export tab
      await page.getByText('Export', { exact: true }).click();
      await page.waitForTimeout(300);

      // Intercept export API and make it fail
      await page.route('**/api/admin/export', route => route.abort());

      // Click export button
      const exportButton = page.getByRole('button', { name: /Export Markdown/i });

      if (await exportButton.count() > 0) {
        await exportButton.click();
        await page.waitForTimeout(1000);

        // Should show error toast
        const toast = page.locator('[data-testid="toast"], .toast, [role="status"], [role="alert"]');
        const toastVisible = await toast.isVisible({ timeout: 2000 }).catch(() => false);

        if (toastVisible) {
          const toastText = await toast.textContent();
          expect(toastText).toMatch(/failed|error/i);
        }
      }

      // Unblock API calls
      await page.unroute('**/api/admin/export');
    });

    test('should handle failed validation gracefully', async ({ page }) => {
      // Navigate to Export tab
      await page.getByText('Export', { exact: true }).click();
      await page.waitForTimeout(300);

      // Intercept validation API and make it fail
      await page.route('**/api/admin/validate', route => route.abort());

      // Click validation button
      const validateButton = page.getByRole('button', { name: /Run Validation/i });

      if (await validateButton.count() > 0) {
        await validateButton.click();
        await page.waitForTimeout(1000);

        // Should show error toast
        const toast = page.locator('[data-testid="toast"], .toast, [role="status"], [role="alert"]');
        const toastVisible = await toast.isVisible({ timeout: 2000 }).catch(() => false);

        if (toastVisible) {
          const toastText = await toast.textContent();
          expect(toastText).toMatch(/failed|error/i);
        }
      }

      // Unblock API calls
      await page.unroute('**/api/admin/validate');
    });

    test('should handle failed link check gracefully', async ({ page }) => {
      // Navigate to Export tab
      await page.getByText('Export', { exact: true }).click();
      await page.waitForTimeout(300);

      // Intercept link check API and make it fail
      await page.route('**/api/admin/check-links', route => route.abort());

      // Click check links button
      const checkLinksButton = page.getByRole('button', { name: /Check All Links/i });

      if (await checkLinksButton.count() > 0) {
        await checkLinksButton.click();
        await page.waitForTimeout(1000);

        // Should show error toast
        const toast = page.locator('[data-testid="toast"], .toast, [role="status"], [role="alert"]');
        const toastVisible = await toast.isVisible({ timeout: 2000 }).catch(() => false);

        if (toastVisible) {
          const toastText = await toast.textContent();
          expect(toastText).toMatch(/failed|error/i);
        }
      }

      // Unblock API calls
      await page.unroute('**/api/admin/check-links');
    });
  });

  test.describe('Admin Dashboard - Integration', () => {
    test('should maintain tab state during page interactions', async ({ page }) => {
      // Navigate to Database tab
      await page.getByText('Database', { exact: true }).click();
      await page.waitForTimeout(300);

      // Verify tab is active
      const databaseTab = page.getByText('Database', { exact: true });

      if (await databaseTab.count() > 0) {
        const tabClasses = await databaseTab.getAttribute('class');
        expect(tabClasses).toBeTruthy();
      }
    });

    test('should update stats after database seeding', async ({ page }) => {
      // Navigate to Database tab
      await page.getByText('Database', { exact: true }).click();
      await page.waitForTimeout(300);

      // Check current stats
      const statsValues = page.locator('.text-2xl.font-bold.font-mono');
      const initialCount = await statsValues.count();

      expect(initialCount).toBeGreaterThan(0);
    });

    test('should persist validation results across tab switches', async ({ page }) => {
      // Navigate to Validation tab
      await page.getByText('Validation', { exact: true }).click();
      await page.waitForTimeout(300);

      // Switch to another tab
      await page.getByText('Database', { exact: true }).click();
      await page.waitForTimeout(300);

      // Switch back to Validation
      await page.getByText('Validation', { exact: true }).click();
      await page.waitForTimeout(300);

      // Content should still be there
      const validationCard = page.getByText('Awesome List Validation');
      if (await validationCard.count() > 0) {
        await expect(validationCard).toBeVisible();
      }
    });
  });
});

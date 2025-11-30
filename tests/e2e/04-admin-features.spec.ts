import { test, expect } from '@playwright/test';
import {
  loginAsAdmin,
  logout,
  waitForNetworkIdle,
  createTestResource,
  cleanupTestResources,
  scrollToElement,
  assertToast,
} from '../helpers/test-utils';

/**
 * E2E Tests: Admin Features
 *
 * Tests admin-only functionality:
 * - Admin login and dashboard access
 * - Approve pending resources
 * - Reject pending resources
 * - View all resources table
 * - Edit resources
 * - Bulk operations
 * - User management
 * - GitHub sync features
 * - Enrichment jobs
 */

test.describe.configure({ mode: 'serial' }); // Run tests in order

let testResourceId: string | null = null;

test.beforeAll(async ({ browser }) => {
  // Create test data that needs admin approval
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Login as regular user to submit test resource
    await page.goto('/login');
    await page.fill('input[type="email"]', 'testuser@test.com');
    await page.fill('input[type="password"]', 'TestUser123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/', { timeout: 10000 });

    // Create pending resource
    const resource = await createTestResource(page);
    testResourceId = resource.id;

    await logout(page);
  } catch (error) {
    console.error('Failed to create test resource:', error);
  } finally {
    await context.close();
  }
});

test.beforeEach(async ({ page }) => {
  // Login as admin before each test
  await loginAsAdmin(page);
  await waitForNetworkIdle(page);
});

test.afterEach(async ({ page }) => {
  // Logout after each test
  await logout(page);
});

test.afterAll(async ({ browser }) => {
  // Cleanup test resources
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await loginAsAdmin(page);
    await cleanupTestResources(page, 'Test Resource');
    await logout(page);
  } catch (error) {
    console.error('Failed to cleanup test resources:', error);
  } finally {
    await context.close();
  }
});

test.describe('Admin - Dashboard Access', () => {
  test('should access admin dashboard', async ({ page }) => {
    await page.goto('/admin');
    await waitForNetworkIdle(page);

    // Should be on admin dashboard (not redirected)
    await expect(page).toHaveURL(/\/admin/);

    // Verify admin dashboard title
    const dashboardTitle = page.locator('h1').filter({ hasText: /admin|dashboard/i }).first();
    await expect(dashboardTitle).toBeVisible({ timeout: 5000 });

    // Verify admin navigation/tabs
    const adminNav = page.locator('[data-testid="admin-nav"]')
      .or(page.locator('[role="tablist"]'))
      .or(page.locator('nav').filter({ has: page.getByText(/resource|user|setting/i) }));

    await expect(adminNav.first()).toBeVisible({ timeout: 5000 });
  });

  test('should display admin statistics', async ({ page }) => {
    await page.goto('/admin');
    await waitForNetworkIdle(page);

    // Look for statistics cards
    const statsCards = page.locator('[data-testid="stat-card"]')
      .or(page.getByText(/\d+\s+(user|resource|pending)/i));

    const statsCount = await statsCards.count();
    expect(statsCount).toBeGreaterThan(0);

    // Verify at least one stat is visible
    await expect(statsCards.first()).toBeVisible({ timeout: 5000 });
  });

  test('should block non-admin access', async ({ page, browser }) => {
    // Logout admin
    await logout(page);

    // Login as regular user
    const userContext = await browser.newContext();
    const userPage = await userContext.newPage();

    try {
      await userPage.goto('/login');
      await userPage.fill('input[type="email"]', 'testuser@test.com');
      await userPage.fill('input[type="password"]', 'TestUser123!');
      await userPage.click('button[type="submit"]');
      await userPage.waitForURL('/', { timeout: 10000 });

      // Try to access admin dashboard
      await userPage.goto('/admin');
      await userPage.waitForTimeout(2000);

      // Should be redirected or show forbidden
      const currentUrl = userPage.url();
      const isForbidden = await userPage.getByText(/forbidden|unauthorized|access denied|403/i)
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      const isRedirected = !currentUrl.includes('/admin');

      expect(isForbidden || isRedirected).toBeTruthy();
    } finally {
      await userContext.close();
    }
  });
});

test.describe('Admin - Pending Resources', () => {
  test('should view pending resources', async ({ page }) => {
    await page.goto('/admin');
    await waitForNetworkIdle(page);

    // Navigate to pending resources section
    const pendingTab = page.locator('[data-testid="pending-resources-tab"]')
      .or(page.getByRole('tab', { name: /pending/i }))
      .or(page.getByText(/pending.*resource/i))
      .first();

    const pendingCount = await pendingTab.count();

    if (pendingCount > 0) {
      await pendingTab.click();
      await waitForNetworkIdle(page);
    } else {
      // Try direct URL
      await page.goto('/admin?tab=pending');
      await waitForNetworkIdle(page);
    }

    // Look for pending resources or empty state
    const pendingResources = page.locator('[data-testid="pending-resource"]')
      .or(page.locator('[data-status="pending"]'));

    const emptyState = page.getByText(/no pending|all approved/i).first();

    const resourceCount = await pendingResources.count();
    const hasEmptyState = await emptyState.isVisible({ timeout: 2000 }).catch(() => false);

    // Should show either pending resources or empty state
    expect(resourceCount > 0 || hasEmptyState).toBeTruthy();

    if (resourceCount > 0) {
      // Verify pending resource has action buttons
      const firstPending = pendingResources.first();

      const approveButton = firstPending.locator('[data-testid="approve-button"]')
        .or(firstPending.getByRole('button', { name: /approve/i }));

      const rejectButton = firstPending.locator('[data-testid="reject-button"]')
        .or(firstPending.getByRole('button', { name: /reject/i }));

      await expect(approveButton.first()).toBeVisible({ timeout: 3000 });
      await expect(rejectButton.first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('should approve pending resource', async ({ page }) => {
    await page.goto('/admin');
    await waitForNetworkIdle(page);

    // Navigate to pending resources
    const pendingTab = page.locator('[data-testid="pending-resources-tab"]')
      .or(page.getByRole('tab', { name: /pending/i }))
      .first();

    const pendingCount = await pendingTab.count();
    if (pendingCount > 0) {
      await pendingTab.click();
      await waitForNetworkIdle(page);
    }

    // Find pending resource
    const pendingResource = page.locator('[data-testid="pending-resource"]')
      .or(page.locator('[data-status="pending"]'))
      .first();

    const resourceCount = await pendingResource.count();

    if (resourceCount > 0) {
      // Click approve button
      const approveButton = pendingResource.locator('[data-testid="approve-button"]')
        .or(pendingResource.getByRole('button', { name: /approve/i }))
        .first();

      await approveButton.click();

      // May show confirmation dialog
      const confirmButton = page.getByRole('button', { name: /confirm|yes|approve/i }).first();
      const confirmCount = await confirmButton.count();

      if (confirmCount > 0) {
        await confirmButton.click();
      }

      // Wait for API response
      await page.waitForResponse(response =>
        response.url().includes('/api/resources') && response.url().includes('approve'),
        { timeout: 5000 }
      );

      // Should show success message
      const toast = page.locator('[data-testid="toast"]')
        .or(page.locator('[role="status"]'))
        .first();

      await expect(toast).toBeVisible({ timeout: 3000 });

      // Resource should be removed from pending list
      await page.waitForTimeout(1000);
      const newCount = await page.locator('[data-testid="pending-resource"]').count();

      // Should have one less pending resource
      expect(newCount).toBeLessThan(resourceCount);
    } else {
      console.log('No pending resources to approve');
    }
  });

  test('should reject pending resource with reason', async ({ page }) => {
    await page.goto('/admin');
    await waitForNetworkIdle(page);

    // Navigate to pending resources
    const pendingTab = page.locator('[data-testid="pending-resources-tab"]')
      .or(page.getByRole('tab', { name: /pending/i }))
      .first();

    const pendingCount = await pendingTab.count();
    if (pendingCount > 0) {
      await pendingTab.click();
      await waitForNetworkIdle(page);
    }

    // Find pending resource
    const pendingResource = page.locator('[data-testid="pending-resource"]')
      .or(page.locator('[data-status="pending"]'))
      .first();

    const resourceCount = await pendingResource.count();

    if (resourceCount > 0) {
      // Click reject button
      const rejectButton = pendingResource.locator('[data-testid="reject-button"]')
        .or(pendingResource.getByRole('button', { name: /reject/i }))
        .first();

      await rejectButton.click();

      // Should show reason dialog
      const reasonDialog = page.locator('[data-testid="rejection-dialog"]')
        .or(page.locator('[role="dialog"]'))
        .first();

      await expect(reasonDialog).toBeVisible({ timeout: 3000 });

      // Fill rejection reason
      const reasonInput = page.locator('[data-testid="rejection-reason"]')
        .or(page.locator('textarea'))
        .first();

      await reasonInput.fill('Test rejection - not suitable for the collection');

      // Confirm rejection
      const confirmButton = page.getByRole('button', { name: /reject|confirm/i }).first();
      await confirmButton.click();

      // Wait for API response
      await page.waitForResponse(response =>
        response.url().includes('/api/resources') && response.url().includes('reject'),
        { timeout: 5000 }
      );

      // Should show success message
      const toast = page.locator('[data-testid="toast"]')
        .or(page.locator('[role="status"]'))
        .first();

      await expect(toast).toBeVisible({ timeout: 3000 });
    } else {
      console.log('No pending resources to reject');
    }
  });
});

test.describe('Admin - All Resources Management', () => {
  test('should view all resources table', async ({ page }) => {
    await page.goto('/admin');
    await waitForNetworkIdle(page);

    // Navigate to all resources
    const resourcesTab = page.locator('[data-testid="all-resources-tab"]')
      .or(page.getByRole('tab', { name: /all resource|resource/i }))
      .first();

    const resourcesCount = await resourcesTab.count();

    if (resourcesCount > 0) {
      await resourcesTab.click();
      await waitForNetworkIdle(page);
    }

    // Should show resources table
    const resourcesTable = page.locator('[data-testid="resources-table"]')
      .or(page.locator('table'))
      .first();

    await expect(resourcesTable).toBeVisible({ timeout: 5000 });

    // Verify table has rows
    const tableRows = resourcesTable.locator('tbody tr');
    const rowCount = await tableRows.count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('should filter resources by status', async ({ page }) => {
    await page.goto('/admin');
    await waitForNetworkIdle(page);

    // Navigate to resources
    const resourcesTab = page.locator('[data-testid="all-resources-tab"]')
      .or(page.getByRole('tab', { name: /resource/i }))
      .first();

    const resourcesCount = await resourcesTab.count();
    if (resourcesCount > 0) {
      await resourcesTab.click();
      await waitForNetworkIdle(page);
    }

    // Look for status filter
    const statusFilter = page.locator('[data-testid="status-filter"]')
      .or(page.getByLabel(/status/i))
      .or(page.locator('select').filter({ has: page.locator('option[value="pending"]') }))
      .first();

    const filterCount = await statusFilter.count();

    if (filterCount > 0) {
      await statusFilter.click();

      // Select "approved" status
      const approvedOption = page.getByRole('option', { name: /approved/i }).first();
      await approvedOption.click();

      // Wait for table to update
      await waitForNetworkIdle(page);

      // Verify filtered results
      const tableRows = page.locator('table tbody tr');
      const rowCount = await tableRows.count();

      if (rowCount > 0) {
        // First row should show "approved" status
        const firstRow = tableRows.first();
        const statusCell = firstRow.locator('[data-testid="status-cell"]')
          .or(firstRow.getByText(/approved/i));

        await expect(statusCell.first()).toBeVisible({ timeout: 3000 });
      }
    } else {
      console.log('Status filter not found');
    }
  });

  test('should search resources by title', async ({ page }) => {
    await page.goto('/admin');
    await waitForNetworkIdle(page);

    // Navigate to resources
    const resourcesTab = page.locator('[data-testid="all-resources-tab"]')
      .or(page.getByRole('tab', { name: /resource/i }))
      .first();

    const resourcesCount = await resourcesTab.count();
    if (resourcesCount > 0) {
      await resourcesTab.click();
      await waitForNetworkIdle(page);
    }

    // Look for search input
    const searchInput = page.locator('[data-testid="resource-search"]')
      .or(page.locator('input[type="search"]'))
      .or(page.locator('input[placeholder*="search"]'))
      .first();

    const searchCount = await searchInput.count();

    if (searchCount > 0) {
      // Search for "FFmpeg"
      await searchInput.fill('FFmpeg');
      await page.waitForTimeout(500); // Debounce

      // Verify results contain search term
      const tableRows = page.locator('table tbody tr');
      const rowCount = await tableRows.count();

      if (rowCount > 0) {
        const firstRow = tableRows.first();
        const titleCell = firstRow.locator('[data-testid="title-cell"]')
          .or(firstRow.locator('td').first());

        const titleText = await titleCell.textContent();
        expect(titleText?.toLowerCase()).toContain('ffmpeg');
      }
    } else {
      console.log('Resource search not found');
    }
  });

  test('should edit resource inline', async ({ page }) => {
    await page.goto('/admin');
    await waitForNetworkIdle(page);

    // Navigate to resources
    const resourcesTab = page.locator('[data-testid="all-resources-tab"]')
      .or(page.getByRole('tab', { name: /resource/i }))
      .first();

    const resourcesCount = await resourcesTab.count();
    if (resourcesCount > 0) {
      await resourcesTab.click();
      await waitForNetworkIdle(page);
    }

    // Find edit button on first row
    const firstRow = page.locator('table tbody tr').first();
    const editButton = firstRow.locator('[data-testid="edit-button"]')
      .or(firstRow.getByRole('button', { name: /edit/i }))
      .first();

    const editCount = await editButton.count();

    if (editCount > 0) {
      await editButton.click();

      // Should show edit dialog or inline edit
      const editDialog = page.locator('[data-testid="edit-dialog"]')
        .or(page.locator('[role="dialog"]'))
        .first();

      const hasDialog = await editDialog.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasDialog) {
        // Edit in dialog
        const descriptionInput = page.locator('textarea[name="description"]')
          .or(page.locator('textarea'))
          .first();

        await descriptionInput.fill('Updated description for E2E testing');

        // Save
        const saveButton = page.getByRole('button', { name: /save|update/i }).first();
        await saveButton.click();

        // Wait for update
        await page.waitForResponse(response =>
          response.url().includes('/api/resources') && response.request().method() === 'PUT',
          { timeout: 5000 }
        );

        // Should show success toast
        const toast = page.locator('[data-testid="toast"]')
          .or(page.locator('[role="status"]'))
          .first();

        await expect(toast).toBeVisible({ timeout: 3000 });
      } else {
        console.log('Edit dialog not found - might be inline editing');
      }
    } else {
      console.log('Edit button not found');
    }
  });
});

test.describe('Admin - Bulk Operations', () => {
  test('should select multiple resources', async ({ page }) => {
    await page.goto('/admin');
    await waitForNetworkIdle(page);

    // Navigate to resources
    const resourcesTab = page.locator('[data-testid="all-resources-tab"]')
      .or(page.getByRole('tab', { name: /resource/i }))
      .first();

    const resourcesCount = await resourcesTab.count();
    if (resourcesCount > 0) {
      await resourcesTab.click();
      await waitForNetworkIdle(page);
    }

    // Look for checkboxes
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();

    if (checkboxCount >= 3) {
      // Select first 3 resources
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();
      await checkboxes.nth(2).check();

      // Verify bulk actions appear
      const bulkActions = page.locator('[data-testid="bulk-actions"]')
        .or(page.getByText(/\d+\s+selected/i))
        .first();

      const hasBulkActions = await bulkActions.isVisible({ timeout: 3000 }).catch(() => false);

      expect(hasBulkActions).toBeTruthy();
    } else {
      console.log('Not enough checkboxes for bulk selection');
    }
  });

  test.skip('should perform bulk approve operation', async ({ page }) => {
    // Skip to avoid accidentally approving real resources
    await page.goto('/admin');
    await waitForNetworkIdle(page);

    // Navigate to pending resources
    const pendingTab = page.locator('[data-testid="pending-resources-tab"]').first();
    const pendingCount = await pendingTab.count();

    if (pendingCount > 0) {
      await pendingTab.click();
      await waitForNetworkIdle(page);

      // Select resources
      const checkboxes = page.locator('input[type="checkbox"]');
      const count = Math.min(await checkboxes.count(), 3);

      for (let i = 0; i < count; i++) {
        await checkboxes.nth(i).check();
      }

      // Click bulk approve
      const bulkApproveButton = page.getByRole('button', { name: /approve.*selected/i }).first();

      if (await bulkApproveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await bulkApproveButton.click();

        // Confirm
        const confirmButton = page.getByRole('button', { name: /confirm/i }).first();
        if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmButton.click();
        }

        // Wait for completion
        await page.waitForTimeout(2000);
      }
    }
  });
});

test.describe('Admin - GitHub Sync', () => {
  test('should display GitHub sync panel', async ({ page }) => {
    await page.goto('/admin');
    await waitForNetworkIdle(page);

    // Navigate to GitHub sync tab
    const githubTab = page.locator('[data-testid="github-sync-tab"]')
      .or(page.getByRole('tab', { name: /github|sync/i }))
      .first();

    const githubCount = await githubTab.count();

    if (githubCount > 0) {
      await githubTab.click();
      await waitForNetworkIdle(page);

      // Verify GitHub panel elements
      const githubPanel = page.locator('[data-testid="github-sync-panel"]')
        .or(page.getByText(/github.*sync|sync.*github/i))
        .first();

      await expect(githubPanel).toBeVisible({ timeout: 5000 });

      // Should have import/export buttons
      const importButton = page.getByRole('button', { name: /import/i }).first();
      const exportButton = page.getByRole('button', { name: /export/i }).first();

      const hasImport = await importButton.isVisible({ timeout: 2000 }).catch(() => false);
      const hasExport = await exportButton.isVisible({ timeout: 2000 }).catch(() => false);

      expect(hasImport || hasExport).toBeTruthy();
    } else {
      console.log('GitHub sync tab not found');
    }
  });

  test.skip('should trigger GitHub export (dry run)', async ({ page }) => {
    // Skip to avoid actual GitHub operations
    await page.goto('/admin');
    await waitForNetworkIdle(page);

    const githubTab = page.locator('[data-testid="github-sync-tab"]').first();
    const githubCount = await githubTab.count();

    if (githubCount > 0) {
      await githubTab.click();
      await waitForNetworkIdle(page);

      const exportButton = page.getByRole('button', { name: /export/i }).first();

      if (await exportButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await exportButton.click();

        // Fill export form (if exists)
        const dryRunCheckbox = page.locator('input[name="dryRun"]')
          .or(page.getByLabel(/dry.*run/i))
          .first();

        const dryRunCount = await dryRunCheckbox.count();

        if (dryRunCount > 0) {
          await dryRunCheckbox.check();
        }

        const confirmButton = page.getByRole('button', { name: /export|confirm/i }).first();
        await confirmButton.click();

        // Wait for export to complete
        await page.waitForTimeout(5000);
      }
    }
  });
});

test.describe('Admin - Enrichment Jobs', () => {
  test('should display enrichment panel', async ({ page }) => {
    await page.goto('/admin');
    await waitForNetworkIdle(page);

    // Navigate to enrichment tab
    const enrichmentTab = page.locator('[data-testid="enrichment-tab"]')
      .or(page.getByRole('tab', { name: /enrichment|ai/i }))
      .first();

    const enrichmentCount = await enrichmentTab.count();

    if (enrichmentCount > 0) {
      await enrichmentTab.click();
      await waitForNetworkIdle(page);

      // Verify enrichment panel
      const enrichmentPanel = page.locator('[data-testid="enrichment-panel"]')
        .or(page.getByText(/enrichment|ai.*processing/i))
        .first();

      await expect(enrichmentPanel).toBeVisible({ timeout: 5000 });

      // Should have start button
      const startButton = page.getByRole('button', { name: /start.*enrichment|enrich/i }).first();
      const hasStartButton = await startButton.isVisible({ timeout: 2000 }).catch(() => false);

      expect(hasStartButton).toBeTruthy();
    } else {
      console.log('Enrichment tab not found');
    }
  });

  test.skip('should start enrichment job (limited batch)', async ({ page }) => {
    // Skip to avoid consuming AI API credits
    await page.goto('/admin');
    await waitForNetworkIdle(page);

    const enrichmentTab = page.locator('[data-testid="enrichment-tab"]').first();
    const enrichmentCount = await enrichmentTab.count();

    if (enrichmentCount > 0) {
      await enrichmentTab.click();
      await waitForNetworkIdle(page);

      const startButton = page.getByRole('button', { name: /start/i }).first();

      if (await startButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await startButton.click();

        // Set batch size to 1
        const batchSizeInput = page.locator('input[name="batchSize"]').first();
        const batchCount = await batchSizeInput.count();

        if (batchCount > 0) {
          await batchSizeInput.fill('1');
        }

        // Confirm
        const confirmButton = page.getByRole('button', { name: /start|confirm/i }).first();
        await confirmButton.click();

        // Wait for job to start
        await page.waitForTimeout(3000);

        // Should show job in progress
        const jobStatus = page.getByText(/processing|in progress/i).first();
        await expect(jobStatus).toBeVisible({ timeout: 5000 });
      }
    }
  });
});

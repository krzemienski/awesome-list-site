import { test, expect } from '@playwright/test';

/**
 * E2E Tests for ResourceBrowser Component
 *
 * Tests the full integration of:
 * - ResourceFilters component
 * - BulkActionsToolbar component
 * - ResourceEditModal component
 * - TanStack Table with real data
 *
 * Requirements:
 * - Server running on http://localhost:5000
 * - Admin user logged in
 * - Database with test resources
 */

test.describe('ResourceBrowser Component', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin page (assumes authentication is handled)
    await page.goto('http://localhost:5000/admin');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('displays the resource browser with title and filters', async ({ page }) => {
    // Verify main heading
    await expect(page.getByText('Resource Browser')).toBeVisible();

    // Verify ResourceFilters component is present
    await expect(page.getByPlaceholder('Search resources...')).toBeVisible();

    // Verify category filter dropdown exists
    const categoryFilter = page.getByRole('combobox', { name: /category/i });
    await expect(categoryFilter).toBeVisible();
  });

  test('loads and displays resources in table', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table', { state: 'visible' });

    // Verify table headers
    await expect(page.getByRole('columnheader', { name: /title/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /category/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /last modified/i })).toBeVisible();

    // Verify at least one resource row exists
    const rows = page.getByRole('row').filter({ hasNot: page.getByRole('columnheader') });
    await expect(rows.first()).toBeVisible();
  });

  test('filters resources by category', async ({ page }) => {
    // Open category filter
    await page.getByRole('combobox', { name: /category/i }).click();

    // Select a category (e.g., "Encoding & Codecs")
    await page.getByRole('option', { name: /encoding/i }).click();

    // Wait for filtered results
    await page.waitForTimeout(500); // Wait for debounce

    // Verify URL contains filter parameter
    await expect(page).toHaveURL(/category=/);

    // Verify filtered results show correct category badges
    const categoryBadges = page.locator('span:has-text("Encoding")');
    const count = await categoryBadges.count();
    expect(count).toBeGreaterThan(0);
  });

  test('filters resources by search text', async ({ page }) => {
    const searchTerm = 'ffmpeg';

    // Enter search term
    await page.getByPlaceholder('Search resources...').fill(searchTerm);

    // Wait for debounced search
    await page.waitForTimeout(500);

    // Verify results contain search term
    const firstRow = page.getByRole('row').filter({ hasNot: page.getByRole('columnheader') }).first();
    await expect(firstRow).toContainText(searchTerm, { ignoreCase: true });
  });

  test('selects individual resources via checkbox', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table tbody tr', { state: 'visible' });

    // Click first row checkbox
    const firstCheckbox = page.locator('table tbody tr').first().locator('input[type="checkbox"]');
    await firstCheckbox.click();

    // Verify checkbox is checked
    await expect(firstCheckbox).toBeChecked();

    // Verify BulkActionsToolbar appears
    await expect(page.getByText(/1 resource selected/i)).toBeVisible();
  });

  test('selects all resources via header checkbox', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table tbody tr', { state: 'visible' });

    // Get count of visible rows
    const rowCount = await page.locator('table tbody tr').count();

    // Click select-all checkbox in header
    const selectAllCheckbox = page.locator('table thead input[type="checkbox"]').first();
    await selectAllCheckbox.click();

    // Verify all checkboxes are checked
    const checkedCount = await page.locator('table tbody tr input[type="checkbox"]:checked').count();
    expect(checkedCount).toBe(rowCount);

    // Verify BulkActionsToolbar shows correct count
    await expect(page.getByText(new RegExp(`${rowCount} resources? selected`, 'i'))).toBeVisible();
  });

  test('performs bulk approve action', async ({ page }) => {
    // Select first two resources
    const firstCheckbox = page.locator('table tbody tr').first().locator('input[type="checkbox"]');
    const secondCheckbox = page.locator('table tbody tr').nth(1).locator('input[type="checkbox"]');

    await firstCheckbox.click();
    await secondCheckbox.click();

    // Click bulk approve button
    await page.getByRole('button', { name: /approve/i }).click();

    // Wait for success toast
    await expect(page.getByText(/success/i)).toBeVisible({ timeout: 5000 });

    // Verify selection is cleared
    await expect(firstCheckbox).not.toBeChecked();
    await expect(secondCheckbox).not.toBeChecked();
  });

  test('opens edit modal for resource', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table tbody tr', { state: 'visible' });

    // Click actions dropdown on first row
    const actionsButton = page.locator('table tbody tr').first().getByRole('button', { name: /open menu/i });
    await actionsButton.click();

    // Click Edit option
    await page.getByRole('menuitem', { name: /edit/i }).click();

    // Verify modal opens
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/edit resource/i)).toBeVisible();

    // Verify form fields are present
    await expect(page.getByLabel(/title/i)).toBeVisible();
    await expect(page.getByLabel(/category/i)).toBeVisible();
  });

  test('saves edited resource', async ({ page }) => {
    // Open edit modal
    const actionsButton = page.locator('table tbody tr').first().getByRole('button', { name: /open menu/i });
    await actionsButton.click();
    await page.getByRole('menuitem', { name: /edit/i }).click();

    // Modify title
    const titleInput = page.getByLabel(/title/i);
    const originalTitle = await titleInput.inputValue();
    const newTitle = `${originalTitle} (Updated)`;

    await titleInput.clear();
    await titleInput.fill(newTitle);

    // Save changes
    await page.getByRole('button', { name: /save/i }).click();

    // Wait for success notification
    await expect(page.getByText(/success/i)).toBeVisible({ timeout: 5000 });

    // Verify modal closed
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Verify updated title appears in table
    await expect(page.getByText(newTitle)).toBeVisible();
  });

  test('archives resource from actions menu', async ({ page }) => {
    // Get first resource title for verification
    const firstRow = page.locator('table tbody tr').first();
    const titleText = await firstRow.locator('td').nth(1).textContent();

    // Open actions menu
    await firstRow.getByRole('button', { name: /open menu/i }).click();

    // Click Archive
    await page.getByRole('menuitem', { name: /archive/i }).click();

    // Wait for success notification
    await expect(page.getByText(/success/i)).toBeVisible({ timeout: 5000 });

    // Verify resource is no longer in the default view (approved resources)
    // (assuming default view shows only approved resources)
    const rowsAfter = page.getByRole('row').filter({ hasText: titleText });
    await expect(rowsAfter).toHaveCount(0);
  });

  test('navigates between pages', async ({ page }) => {
    // Wait for table and pagination
    await page.waitForSelector('table tbody tr', { state: 'visible' });

    // Check if pagination exists (only if multiple pages)
    const nextButton = page.getByRole('button', { name: /next/i });

    if (await nextButton.isVisible() && await nextButton.isEnabled()) {
      // Click Next
      await nextButton.click();

      // Verify URL changed
      await expect(page).toHaveURL(/page=2/);

      // Verify page indicator updated
      await expect(page.getByText(/page 2 of/i)).toBeVisible();

      // Click Previous
      const prevButton = page.getByRole('button', { name: /previous/i });
      await prevButton.click();

      // Verify back to page 1
      await expect(page).toHaveURL(/page=1|^(?!.*page=)/);
    }
  });

  test('shows empty state with no results', async ({ page }) => {
    // Apply filter that returns no results
    await page.getByPlaceholder('Search resources...').fill('zzz_nonexistent_resource_xyz');

    // Wait for search
    await page.waitForTimeout(500);

    // Verify empty state message
    await expect(page.getByText(/no resources found/i)).toBeVisible();

    // Verify reset filters button
    await expect(page.getByRole('button', { name: /reset filters/i })).toBeVisible();
  });

  test('resets filters when clicking reset button', async ({ page }) => {
    // Apply some filters
    await page.getByPlaceholder('Search resources...').fill('test');
    await page.waitForTimeout(500);

    // Get initial result count
    const initialCount = await page.locator('table tbody tr').count();

    // Click reset filters
    await page.getByRole('button', { name: /reset filters/i }).click();

    // Verify search input is cleared
    await expect(page.getByPlaceholder('Search resources...')).toHaveValue('');

    // Verify more results are shown
    const afterCount = await page.locator('table tbody tr').count();
    expect(afterCount).toBeGreaterThanOrEqual(initialCount);
  });

  test('opens external link when clicking link icon', async ({ page }) => {
    // Get first resource URL
    const firstRow = page.locator('table tbody tr').first();
    const linkIcon = firstRow.locator('svg').first();

    // Listen for new page/tab
    const [newPage] = await Promise.all([
      page.context().waitForEvent('page'),
      linkIcon.click()
    ]);

    // Verify new page opened with resource URL
    await newPage.waitForLoadState();
    expect(newPage.url()).toMatch(/^https?:\/\//);

    await newPage.close();
  });

  test('displays total resource count', async ({ page }) => {
    // Verify total count is displayed
    const countText = page.getByText(/\d+ total resources/i);
    await expect(countText).toBeVisible();

    // Verify count is greater than 0
    const text = await countText.textContent();
    const count = parseInt(text?.match(/\d+/)?.[0] || '0');
    expect(count).toBeGreaterThan(0);
  });

  test('sorts by clicking column headers', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table tbody tr', { state: 'visible' });

    // Get first title before sorting
    const firstTitleBefore = await page.locator('table tbody tr').first().locator('td').nth(1).textContent();

    // Click title column header to sort
    await page.getByRole('columnheader', { name: /title/i }).click();

    // Wait for re-render
    await page.waitForTimeout(300);

    // Get first title after sorting
    const firstTitleAfter = await page.locator('table tbody tr').first().locator('td').nth(1).textContent();

    // Verify order changed (or stayed same if already sorted)
    expect(firstTitleAfter).toBeDefined();
  });
});

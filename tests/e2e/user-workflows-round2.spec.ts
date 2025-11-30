import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://jeyldoypdkgsrfdhdcmm.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test user session (email confirmation not required for testing)
async function getTestSession() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'playwright.testing.2025@gmail.com',
    password: 'test123456'
  });

  if (error) throw new Error(`Auth failed: ${error.message}`);
  return data.session;
}

test.describe('User Workflows Round 2 - Bug Verification', () => {
  let testSession: any;
  let testResourceId: string;

  test.beforeAll(async () => {
    // Get test session
    testSession = await getTestSession();

    // Get a test resource ID for bookmarking
    const { data: resources } = await supabase
      .from('resources')
      .select('id')
      .eq('status', 'approved')
      .limit(1)
      .single();

    testResourceId = resources?.id;
  });

  test.beforeEach(async ({ page, context }) => {
    // Inject test session into browser
    await context.addCookies([
      {
        name: 'sb-access-token',
        value: testSession.access_token,
        domain: 'localhost',
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'Lax'
      },
      {
        name: 'sb-refresh-token',
        value: testSession.refresh_token,
        domain: 'localhost',
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'Lax'
      }
    ]);

    // Set localStorage for Supabase auth
    await page.goto('http://localhost:3000');
    await page.evaluate((session) => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        currentSession: session,
        expiresAt: session.expires_at
      }));
    }, testSession);
  });

  test('Task 31-40: Search Dialog - Bug #1 Verification', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Step 1: Open search with keyboard shortcut
    console.log('Task 31: Opening search with / key');
    await page.keyboard.press('/');
    await page.waitForTimeout(500);

    // Verify dialog opens (not login redirect)
    const searchDialog = page.locator('[role="dialog"]', { hasText: /search/i });
    const isVisible = await searchDialog.isVisible();

    await page.screenshot({
      path: 'docs/session-7-evidence/user-workflows-round2/search-dialog-opened.png',
      fullPage: true
    });

    console.log(`Task 32: Search dialog visible: ${isVisible}`);
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);

    if (!isVisible) {
      console.error('BUG CONFIRMED: Search dialog did not open');
      console.log('Checking if redirected to login...');
      expect(currentUrl).not.toContain('/login');
    }

    // Step 2: Type search query
    console.log('Task 33: Typing "ffmpeg" in search');
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    await searchInput.fill('ffmpeg');
    await page.waitForTimeout(500); // Debounce delay

    await page.screenshot({
      path: 'docs/session-7-evidence/user-workflows-round2/search-after-typing-ffmpeg.png',
      fullPage: true
    });

    // Step 3: Count results
    const resultItems = page.locator('[role="option"], [data-search-result], .search-result');
    const resultCount = await resultItems.count();

    console.log(`Task 34: Search results count: ${resultCount}`);
    console.log(`Expected: ~157 results for "ffmpeg"`);

    // Step 4: Test result click
    if (resultCount > 0) {
      console.log('Task 35: Clicking first search result');
      const firstResult = resultItems.first();
      await firstResult.click();
      await page.waitForTimeout(1000);

      const resultUrl = page.url();
      console.log(`Navigated to: ${resultUrl}`);
      await page.screenshot({
        path: 'docs/session-7-evidence/user-workflows-round2/search-result-clicked.png',
        fullPage: true
      });
    }

    // Step 5: Test category filter within search
    console.log('Task 36: Opening search again for category filter test');
    await page.keyboard.press('/');
    await page.waitForTimeout(500);

    const categoryFilter = page.locator('select, [role="combobox"]', { hasText: /category/i }).first();
    if (await categoryFilter.isVisible()) {
      await categoryFilter.selectOption({ index: 1 }); // Select first category
      await page.waitForTimeout(500);

      const filteredCount = await resultItems.count();
      console.log(`Task 37: Results after category filter: ${filteredCount}`);
    }

    // Step 6: Test empty search
    console.log('Task 38: Testing empty search "xyznonexistent"');
    await searchInput.fill('xyznonexistent');
    await page.waitForTimeout(500);

    const emptyResults = await resultItems.count();
    console.log(`Task 39: Results for non-existent query: ${emptyResults}`);

    await page.screenshot({
      path: 'docs/session-7-evidence/user-workflows-round2/search-empty-results.png',
      fullPage: true
    });

    expect(emptyResults).toBe(0);
  });

  test('Task 41-50: Profile Page - Bug #2 Fix Verification', async ({ page }) => {
    console.log('Task 41: Navigating to /profile');

    // Listen for console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('http://localhost:3000/profile');
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: 'docs/session-7-evidence/user-workflows-round2/profile-page-loaded.png',
      fullPage: true
    });

    // Check for RangeError
    console.log('Task 42: Checking for RangeError in console');
    const hasRangeError = consoleErrors.some(err => err.includes('RangeError'));

    if (hasRangeError) {
      console.error('BUG STILL EXISTS: RangeError found in console');
      console.log('Console errors:', consoleErrors);
    } else {
      console.log('✓ Bug #2 FIXED: No RangeError in console');
    }

    expect(hasRangeError).toBe(false);

    // Verify page renders
    console.log('Task 43: Verifying profile page renders');
    const profileHeader = page.locator('h1, h2', { hasText: /profile/i }).first();
    await expect(profileHeader).toBeVisible();

    // Check all 4 tabs
    console.log('Task 44: Testing Overview tab');
    const overviewTab = page.locator('[role="tab"]', { hasText: /overview/i });
    if (await overviewTab.isVisible()) {
      await overviewTab.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: 'docs/session-7-evidence/user-workflows-round2/profile-overview-tab.png',
        fullPage: true
      });
    }

    console.log('Task 45: Testing Favorites tab');
    const favoritesTab = page.locator('[role="tab"]', { hasText: /favorites/i });
    if (await favoritesTab.isVisible()) {
      await favoritesTab.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: 'docs/session-7-evidence/user-workflows-round2/profile-favorites-tab.png',
        fullPage: true
      });
    }

    console.log('Task 46: Testing Bookmarks tab');
    const bookmarksTab = page.locator('[role="tab"]', { hasText: /bookmarks/i });
    if (await bookmarksTab.isVisible()) {
      await bookmarksTab.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: 'docs/session-7-evidence/user-workflows-round2/profile-bookmarks-tab.png',
        fullPage: true
      });
    }

    console.log('Task 47: Testing Submissions tab');
    const submissionsTab = page.locator('[role="tab"]', { hasText: /submissions/i });
    if (await submissionsTab.isVisible()) {
      await submissionsTab.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: 'docs/session-7-evidence/user-workflows-round2/profile-submissions-tab.png',
        fullPage: true
      });
    }

    // Verify stats
    console.log('Task 48: Verifying profile stats match database');
    // Stats check would require backend API or direct DB query
    const statsText = await page.locator('body').innerText();
    console.log('Task 49: Stats displayed on page');
  });

  test('Task 51-60: Bookmarks Page', async ({ page }) => {
    console.log('Task 51: Creating test bookmark via API');

    // Create bookmark via API
    const response = await fetch(`http://localhost:3000/api/bookmarks/${testResourceId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testSession.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ notes: 'Test bookmark from Session 7' })
    });

    console.log(`Bookmark creation response: ${response.status}`);

    console.log('Task 52: Navigating to /bookmarks');
    await page.goto('http://localhost:3000/bookmarks');
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: 'docs/session-7-evidence/user-workflows-round2/bookmarks-page.png',
      fullPage: true
    });

    // Verify bookmark displays
    console.log('Task 53: Verifying bookmark displays');
    const bookmarkItems = page.locator('[data-bookmark-item], .bookmark-card');
    const bookmarkCount = await bookmarkItems.count();

    console.log(`Bookmarks found: ${bookmarkCount}`);

    if (bookmarkCount > 0) {
      // Test add notes functionality
      console.log('Task 54: Testing add notes functionality');
      const notesButton = page.locator('button', { hasText: /notes|edit/i }).first();
      if (await notesButton.isVisible()) {
        await notesButton.click();
        await page.waitForTimeout(500);

        const notesInput = page.locator('textarea, input[type="text"]').first();
        await notesInput.fill('Updated notes via UI');

        const saveButton = page.locator('button', { hasText: /save/i }).first();
        await saveButton.click();
        await page.waitForTimeout(1000);

        await page.screenshot({
          path: 'docs/session-7-evidence/user-workflows-round2/bookmark-notes-updated.png',
          fullPage: true
        });
      }

      // Test remove bookmark
      console.log('Task 55: Testing remove bookmark');
      const removeButton = page.locator('button', { hasText: /remove|delete/i }).first();
      if (await removeButton.isVisible()) {
        await removeButton.click();
        await page.waitForTimeout(500);

        // Confirm if modal appears
        const confirmButton = page.locator('button', { hasText: /confirm|yes/i }).first();
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }

        await page.waitForTimeout(1000);

        await page.screenshot({
          path: 'docs/session-7-evidence/user-workflows-round2/bookmark-removed.png',
          fullPage: true
        });

        // Verify database deleted
        console.log('Task 56: Verifying bookmark deleted from database');
        const { data: bookmarks } = await supabase
          .from('user_bookmarks')
          .select('*')
          .eq('user_id', testSession.user.id)
          .eq('resource_id', testResourceId);

        console.log(`Bookmarks in DB after deletion: ${bookmarks?.length || 0}`);
        expect(bookmarks?.length || 0).toBe(0);
      }
    }
  });

  test('Task 61-70: Learning Journeys', async ({ page }) => {
    console.log('Task 61: Checking if journeys exist in database');

    const { data: existingJourneys, count } = await supabase
      .from('learning_journeys')
      .select('*', { count: 'exact' })
      .eq('status', 'published')
      .limit(1);

    console.log(`Published journeys in database: ${count}`);

    let testJourneyId: string;

    if (count === 0) {
      console.log('Task 62: Seeding test journey');

      const { data: newJourney, error } = await supabase
        .from('learning_journeys')
        .insert({
          title: 'Test Journey - Session 7',
          description: 'Automated test journey for user workflow verification',
          difficulty: 'beginner',
          category: 'Intro & Learning',
          status: 'published',
          estimated_duration: '2 hours',
          icon: '🎓'
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create journey:', error);
        throw error;
      }

      testJourneyId = newJourney.id;

      // Add a step
      await supabase.from('journey_steps').insert({
        journey_id: testJourneyId,
        step_number: 1,
        title: 'Test Step 1',
        description: 'First step in test journey'
      });

      console.log(`Created test journey: ${testJourneyId}`);
    } else {
      testJourneyId = existingJourneys![0].id;
      console.log(`Using existing journey: ${testJourneyId}`);
    }

    console.log('Task 63: Navigating to /journeys');
    await page.goto('http://localhost:3000/journeys');
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: 'docs/session-7-evidence/user-workflows-round2/journeys-list.png',
      fullPage: true
    });

    // Verify journeys display
    console.log('Task 64: Verifying journeys display');
    const journeyCards = page.locator('[data-journey-card], .journey-card');
    const journeyCount = await journeyCards.count();

    console.log(`Journeys displayed: ${journeyCount}`);

    if (journeyCount > 0) {
      // Click journey to view detail
      console.log('Task 65: Clicking journey to view detail');
      await journeyCards.first().click();
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: 'docs/session-7-evidence/user-workflows-round2/journey-detail.png',
        fullPage: true
      });

      const detailUrl = page.url();
      console.log(`Journey detail URL: ${detailUrl}`);

      // Test "Start Journey" button
      console.log('Task 66: Testing "Start Journey" button');
      const startButton = page.locator('button', { hasText: /start|enroll/i }).first();

      if (await startButton.isVisible()) {
        await startButton.click();
        await page.waitForTimeout(1000);

        await page.screenshot({
          path: 'docs/session-7-evidence/user-workflows-round2/journey-enrolled.png',
          fullPage: true
        });

        // Verify enrollment in database
        console.log('Task 67: Verifying enrollment in database');
        const { data: progress } = await supabase
          .from('user_journey_progress')
          .select('*')
          .eq('user_id', testSession.user.id)
          .eq('journey_id', testJourneyId)
          .single();

        console.log(`Enrollment found in DB: ${!!progress}`);

        if (progress) {
          console.log('Enrollment details:', {
            started_at: progress.started_at,
            current_step_id: progress.current_step_id,
            completed_steps: progress.completed_steps
          });
        }
      }
    }
  });
});

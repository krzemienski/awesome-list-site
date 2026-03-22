---
name: e2e-testing
description: |
  Playwright browser automation patterns for functional validation and E2E verification.
  Use when: Setting up Playwright E2E test suites, fixing flaky browser tests, validating web apps through real browser interaction, capturing evidence screenshots.
  Covers: Two modes (formal test suite vs live MCP validation), Page Object Model, flaky test diagnosis (race conditions, network timing, animation), artifact management, CI/CD GitHub Actions config.
  Keywords: playwright, e2e, browser testing, page object model, flaky test, screenshot, functional validation
---

# E2E Functional Validation Patterns

Playwright patterns for validating real application behavior through browser automation.

## When to Use

- Setting up Playwright E2E test suites for web applications
- Fixing flaky browser tests (race conditions, timing issues)
- Validating web apps through real browser interaction
- Capturing screenshot/video evidence for validation gates

## When NOT to Use

- API-only testing without a browser UI (use `api-design` or `python-testing`)
- Mobile native app testing (use `ios-simulator-control` or `expo-ios-complete-testing-workflow`)
- Projects with no-mock mandate and no existing test suite (use `functional-validation` with Playwright MCP directly)
- Simple unit testing (use language-specific testing skills)

## Anti-Patterns

| NEVER | WHY | Fix |
|-------|-----|-----|
| Use `page.waitForTimeout(5000)` for synchronization | Non-deterministic; passes locally, fails in CI with different timing | Use `page.waitForResponse()`, `locator.waitFor()`, or `expect().toBeVisible()` |
| Use CSS selectors without data-testid | Selectors break on every styling change; tests become maintenance burden | Use `[data-testid="..."]` or Playwright's role-based locators (`getByRole`, `getByText`) |
| Run all browsers in CI on every commit | 4x runtime for marginal cross-browser coverage on routine changes | Run Chromium only on push; full matrix on PR or nightly |
| Share state between test files via global variables | Order-dependent tests that fail when parallelized | Use Playwright fixtures; each test gets fresh browser context |
| Catch errors and return boolean instead of letting test fail | Swallows the actual error message; debugging becomes guesswork | Let assertions throw naturally; use `expect()` for all checks |

## Conflicts

- `functional-validation` — Use functional-validation for no-mock projects doing ad-hoc browser validation; this skill for structured Playwright test suites.
- `playwright-skill` — Use playwright-skill for general browser automation; this skill for testing patterns specifically.
- `condition-based-waiting` — Complementary; use its waiting patterns within E2E tests.

## Two Modes of Use

### Mode 1: Formal test suite
Traditional `.spec.ts` files with `npx playwright test`. Use when the project explicitly maintains an E2E test suite.

### Mode 2: Live functional validation (no-mock projects)
Use Playwright MCP (`browser_snapshot`, `browser_click`, `browser_navigate`) to validate the running app interactively. Capture screenshots as evidence. No test files created.

**Choose Mode 2 when:** project has `functional-validation` or `no-mocking-validation-gates` mandates active.

## Page Object Model

```typescript
export class ItemsPage {
  readonly page: Page
  readonly searchInput: Locator
  readonly itemCards: Locator

  constructor(page: Page) {
    this.page = page
    this.searchInput = page.locator('[data-testid="search-input"]')
    this.itemCards = page.locator('[data-testid="item-card"]')
  }

  async goto() {
    await this.page.goto('/items')
    await this.page.waitForLoadState('networkidle')
  }

  async search(query: string) {
    await this.searchInput.fill(query)
    await this.page.waitForResponse(resp => resp.url().includes('/api/search'))
  }
}
```

## Flaky Test Diagnosis

| Symptom | Cause | Fix |
|---------|-------|-----|
| Element not found intermittently | Race condition — DOM not ready | Use `locator.waitFor({ state: 'visible' })` before interaction |
| Click does nothing | Element behind overlay or mid-animation | Wait for animation: `waitForLoadState('networkidle')` then click |
| Assertion fails with stale data | Response arrived but DOM not updated | Use `expect(locator).toHaveText()` with auto-retry instead of `textContent()` |
| Works locally, fails in CI | Timing difference (CI is slower) | Never use `waitForTimeout`; always wait for conditions |
| Different results each run | Shared state between tests | Use fresh browser context per test via fixtures |

## Playwright Configuration (Expert Settings)

```typescript
export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',       // Captures trace only on failure retry
    screenshot: 'only-on-failure',  // Don't bloat artifacts on success
    video: 'retain-on-failure',     // Video only for debugging failures
    actionTimeout: 10000,           // 10s per action — catches stuck elements
    navigationTimeout: 30000,       // 30s for page loads
  },
})
```

**Key insight:** `trace: 'on-first-retry'` is the sweet spot — captures debugging data only when needed, without 10x artifact bloat on every run.

## CI/CD Integration

```yaml
- run: npx playwright install --with-deps
- run: npx playwright test
  env:
    BASE_URL: ${{ vars.STAGING_URL }}
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
    retention-days: 30
```

## Related Skills

- `functional-validation` — real-system validation protocol for no-mock projects
- `playwright-skill` — general browser automation
- `condition-based-waiting` — replacing arbitrary timeouts with condition polling
- `e2e-validate` — full functional validation using real system

import { Browser, BrowserContext, Page, chromium } from '@playwright/test';

/**
 * Multi-Context Test Helper for Integration Tests
 *
 * Manages multiple browser contexts for testing user isolation and cross-context flows:
 * - Admin context (full access)
 * - User A context (regular user)
 * - User B context (different regular user)
 * - Anonymous context (no auth)
 *
 * Used for scenarios like:
 * - Admin edits resource → Anonymous user sees change
 * - User A favorites → User B cannot see
 * - Submit → Approve → Public visibility
 */
export class MultiContextTestHelper {
  private browser: Browser | null = null;
  private contexts: Map<string, BrowserContext> = new Map();
  private pages: Map<string, Page> = new Map();

  async init() {
    this.browser = await chromium.launch({
      headless: false,  // Visible for debugging
      slowMo: 100       // Slow down actions
    });
  }

  /**
   * Create admin context with pre-authenticated session
   */
  async createAdminContext(): Promise<{ context: BrowserContext, page: Page }> {
    if (!this.browser) throw new Error('Browser not initialized. Call init() first.');

    const context = await this.browser.newContext({
      storageState: './tests/fixtures/auth-state.json'
    });

    this.contexts.set('admin', context);
    const page = await context.newPage();
    this.pages.set('admin', page);

    return { context, page };
  }

  /**
   * Create regular user context
   * @param userId 'A' or 'B' for the two test users
   */
  async createUserContext(userId: 'A' | 'B'): Promise<{ context: BrowserContext, page: Page }> {
    if (!this.browser) throw new Error('Browser not initialized. Call init() first.');

    const fixturePath = userId === 'A'
      ? './tests/fixtures/user-a-auth.json'
      : './tests/fixtures/user-b-auth.json';

    const context = await this.browser.newContext({
      storageState: fixturePath
    });

    const contextKey = `user${userId}`;
    this.contexts.set(contextKey, context);
    const page = await context.newPage();
    this.pages.set(contextKey, page);

    return { context, page };
  }

  /**
   * Create anonymous (unauthenticated) context
   */
  async createAnonymousContext(): Promise<{ context: BrowserContext, page: Page }> {
    if (!this.browser) throw new Error('Browser not initialized. Call init() first.');

    const context = await this.browser.newContext();  // No storageState = no auth

    this.contexts.set('anonymous', context);
    const page = await context.newPage();
    this.pages.set('anonymous', page);

    return { context, page };
  }

  /**
   * Get existing page by context name
   */
  getPage(contextName: 'admin' | 'userA' | 'userB' | 'anonymous'): Page | undefined {
    return this.pages.get(contextName);
  }

  /**
   * Close a specific context
   */
  async closeContext(contextName: string) {
    const context = this.contexts.get(contextName);
    if (context) {
      await context.close();
      this.contexts.delete(contextName);
      this.pages.delete(contextName);
    }
  }

  /**
   * Close all contexts
   */
  async closeAll() {
    for (const context of this.contexts.values()) {
      await context.close();
    }
    this.contexts.clear();
    this.pages.clear();

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Get count of active contexts
   */
  getContextCount(): number {
    return this.contexts.size;
  }
}

/**
 * Usage Example:
 *
 * test('admin edit visible to anonymous', async () => {
 *   const helper = new MultiContextTestHelper();
 *   await helper.init();
 *
 *   const { page: adminPage } = await helper.createAdminContext();
 *   const { page: anonPage } = await helper.createAnonymousContext();
 *
 *   // Admin makes edit
 *   await adminPage.goto('http://localhost:3000/admin/resources');
 *   // ... edit logic
 *
 *   // Anonymous verifies
 *   await anonPage.goto('http://localhost:3000/category/encoding-codecs');
 *   // ... verification
 *
 *   await helper.closeAll();
 * });
 */

/**
 * Phase 8 — Sidebar UX E2E guard.
 *
 * Two regressions covered by this spec:
 *   BUG-007 — Sidebar category-tree chevron toggles were 22×38 CSS px
 *             (well under WCAG 2.5.8's 24×24 minimum and Apple HIG's
 *             44×44 pt recommendation). After the fix every chevron
 *             must be ≥24 wide AND ≥44 tall.
 *
 *   BUG-043 — Top-level + subcategory labels were truncated with ellipsis
 *             at every viewport ("Encoding & …", "Infrastructure & …",
 *             "General …", "Media …", "Networking …"). After the fix
 *             no label inside an accordion header may have
 *             scrollWidth > clientWidth at any of three viewports.
 *
 * Runs against the live dev system (`npm run dev`) via playwright.config's
 * webServer. No mocks, no stubs — Iron Rule compliant.
 *
 * The dev server is started in `beforeAll` via the project webServer config;
 * no need to manually boot.
 */

import { test, expect, type Page } from '@playwright/test';

const TARGET_PATH = '/category/community-events';

for (const width of [375, 1024]) {
  test(`nested taxonomy leaves are not clipped at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/category/encoding-codecs');
    const decline = page.getByTestId('consent-decline');
    if (await decline.isVisible()) await decline.click();
    if (width === 375) await page.locator('[data-sidebar="trigger"]').click();
    const surface = page.locator(width === 375 ? '.av-sidebar-drawer' : '.av-sidebar-shell');
    const category = surface.getByTestId('toggle-cat-encoding-codecs');
    if (await category.getAttribute('aria-expanded') !== 'true') await category.click();
    const toggle = surface.getByTestId('expand-sub-codecs');
    if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
    const id = await toggle.getAttribute('aria-controls');
    expect(id).toBeTruthy();
    const body = surface.locator(`[id="${id}"]`);
    const leaves = body.locator('[data-testid^="subsub-"]');
    await expect(leaves).toHaveCount(3);
    // Poll real clipping geometry, not computed min-height or source strings.
    await expect.poll(() => body.evaluate(el => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
    for (const leaf of await leaves.all()) {
      await leaf.scrollIntoViewIfNeeded();
      await expect.poll(() => leaf.evaluate(el => {
        const r = el.getBoundingClientRect();
        let visible = r.height >= 44;
        for (let parent = el.parentElement; parent; parent = parent.parentElement) {
          if (getComputedStyle(parent).overflowY === 'hidden') {
            const bounds = parent.getBoundingClientRect();
            visible &&= r.top >= bounds.top - 1 && r.bottom <= bounds.bottom + 1;
          }
        }
        return visible;
      })).toBe(true);
    }
  });
}

const VIEWPORTS = [
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'tablet-1024', width: 1024, height: 768 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'mobile-375', width: 375, height: 812 },
] as const;

async function openSidebarAndCategory(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.goto(TARGET_PATH);
  await page.waitForLoadState('domcontentloaded');
  // Canonical styles.css hides the sidebar at <=768; see
  // docs/parity/assumptions/shell-sidebar.md. Exercise its real drawer.
  if (width <= 768) {
    const decline = page.getByTestId('consent-decline');
    if (await decline.isVisible()) await decline.click();
    await page.locator('button[data-sidebar="trigger"]').click();
  }
  await page.waitForSelector('[data-testid^="toggle-cat-"]', { state: 'visible' });
  // Make sure every category chevron exists in the DOM even when its row is collapsed.
  const toggles = await page.locator('[data-testid^="toggle-cat-"]').count();
  expect(toggles, 'at least one category chevron must render').toBeGreaterThan(0);
  // Expand every category so we measure BOTH top-level and subcategory chevrons.
  for (let i = 0; i < toggles; i++) {
    const t = page.locator('[data-testid^="toggle-cat-"]').nth(i);
    const state = await t.getAttribute('aria-expanded');
    if (state !== 'true') {
      await t.evaluate((element) => (element as HTMLButtonElement).click());
    }
  }
}

for (const vp of VIEWPORTS) {
  test.describe(`@${vp.name}`, () => {
    test(`BUG-007 every sidebar chevron is ≥24 wide × ≥44 tall at ${vp.name}`, async ({ page }) => {
      await openSidebarAndCategory(page, vp.width, vp.height);

      const topLevel = page.locator('[data-testid^="toggle-cat-"]');
      const topCount = await topLevel.count();
      expect(topCount, 'top-level chevrons').toBeGreaterThan(0);

      const topDims = await topLevel.evaluateAll((nodes) =>
        nodes.map((n) => {
          const r = (n as HTMLElement).getBoundingClientRect();
          return { width: r.width, height: r.height };
        }),
      );
      for (const [i, d] of topDims.entries()) {
        expect(
          d.width,
          `top-level chevron #${i} width must be ≥24`,
        ).toBeGreaterThanOrEqual(24);
        expect(
          d.height,
          `top-level chevron #${i} height must be ≥44`,
        ).toBeGreaterThanOrEqual(44);
      }

      const sub = page.locator('[data-testid^="expand-sub-"]');
      const subCount = await sub.count();
      if (subCount > 0) {
        const subDims = await sub.evaluateAll((nodes) =>
          nodes.map((n) => {
            const r = (n as HTMLElement).getBoundingClientRect();
            return { width: r.width, height: r.height };
          }),
        );
        for (const [i, d] of subDims.entries()) {
          expect(
            d.width,
            `subcategory chevron #${i} width must be ≥24`,
          ).toBeGreaterThanOrEqual(24);
          expect(
            d.height,
            `subcategory chevron #${i} height must be ≥44`,
          ).toBeGreaterThanOrEqual(44);
        }
      }
    });

    test(`BUG-043 no sidebar label is truncated at ${vp.name}`, async ({ page }) => {
      await openSidebarAndCategory(page, vp.width, vp.height);

      // The top-level category label lives inside [data-testid^="row-cat-"]
      // as a <span> sibling of the icon <span>.
      const topLabels = page.locator('[data-testid^="row-cat-"] > span:nth-of-type(2)');
      const topLabelCount = await topLabels.count();
      expect(topLabelCount, 'top-level labels').toBeGreaterThan(0);

      const topOverflow = await topLabels.evaluateAll((nodes) =>
        nodes.map((n) => {
          const el = n as HTMLElement;
          return {
            text: el.textContent?.trim() ?? '',
            scrollWidth: el.scrollWidth,
            clientWidth: el.clientWidth,
            title: el.getAttribute('title'),
            // After BUG-043 the .truncate class must be gone (replaced with
            // break-words); assert this explicitly so the regression has a
            // tripwire even if a future change adds overflow back.
            hasTruncateClass: el.classList.contains('truncate'),
          };
        }),
      );
      for (const [i, m] of topOverflow.entries()) {
        expect(
          m.hasTruncateClass,
          `top-level label #${i} (${m.text}) must not have .truncate class`,
        ).toBe(false);
        expect(
          m.scrollWidth <= m.clientWidth + 1,
          `top-level label #${i} (${m.text}) must not overflow: scrollW=${m.scrollWidth}, clientW=${m.clientWidth}`,
        ).toBe(true);
        expect(
          m.title,
          `top-level label #${i} (${m.text}) must keep title= for hover fallback`,
        ).toBe(m.text);
      }

      // Subcategory labels: [data-testid^="sub-"] is the SubItem <a>.
      // The visible label is its first <span>.
      const subLabels = page.locator(
        '[data-testid^="sub-"] > span:first-of-type',
      );
      const subCount = await subLabels.count();
      if (subCount > 0) {
        const subOverflow = await subLabels.evaluateAll((nodes) =>
          nodes.map((n) => {
            const el = n as HTMLElement;
            return {
              text: el.textContent?.trim() ?? '',
              scrollWidth: el.scrollWidth,
              clientWidth: el.clientWidth,
              title: el.getAttribute('title'),
              hasTruncateClass: el.classList.contains('truncate'),
            };
          }),
        );
        for (const [i, m] of subOverflow.entries()) {
          expect(
            m.hasTruncateClass,
            `subcategory label #${i} (${m.text}) must not have .truncate class`,
          ).toBe(false);
          expect(
            m.scrollWidth <= m.clientWidth + 1,
            `subcategory label #${i} (${m.text}) must not overflow: scrollW=${m.scrollWidth}, clientW=${m.clientWidth}`,
          ).toBe(true);
          expect(
            m.title,
            `subcategory label #${i} (${m.text}) must keep title= for hover fallback`,
          ).toBe(m.text);
        }
      }
    });
  });
}

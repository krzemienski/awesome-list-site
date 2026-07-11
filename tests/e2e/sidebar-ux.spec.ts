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

const VIEWPORTS = [
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'mobile-375', width: 375, height: 812 },
] as const;

async function openSidebarAndCategory(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.goto(TARGET_PATH);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('[data-testid^="toggle-cat-"]', { state: 'visible' });
  // Make sure every category chevron exists in the DOM even when its row is collapsed.
  const toggles = await page.locator('[data-testid^="toggle-cat-"]').count();
  expect(toggles, 'at least one category chevron must render').toBeGreaterThan(0);
  // Expand every category so we measure BOTH top-level and subcategory chevrons.
  for (let i = 0; i < toggles; i++) {
    const t = page.locator('[data-testid^="toggle-cat-"]').nth(i);
    const state = await t.getAttribute('aria-expanded');
    if (state !== 'true') {
      await t.click({ force: true });
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
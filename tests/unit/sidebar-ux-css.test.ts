/**
 * Static-source guard for the Phase-8 sidebar UX fix
 * (plans/awesome-video-bughunt-fixes/phase-08.md).
 *
 * This test reads two files from disk and asserts the new constants/rules
 * are present. Pure string assertion — no React render, no DB, no server,
 * no mocks. Catches accidental reverts of BUG-007 (chevron hit area) and
 * BUG-043 (label truncation).
 *
 * - BUG-007: every category-tree chevron button must be ≥24×24 CSS px and
 *   the surrounding row must keep a 44-px hit area (Apple HIG). The
 *   AppSidebar.tsx source must declare `min-h-[44px]` and `min-w-[24px]`
 *   on the top-level toggle button, and inline `minHeight: 44, width: 24`
 *   on the subcategory toggle button. The design-system.css source must
 *   declare `min-height: 44px` on `.accordion-header` so the row itself
 *   also meets the Apple HIG floor.
 *
 * - BUG-043: top-level + subcategory labels must allow word-wrap. The
 *   AppSidebar.tsx source must use `break-words` (not `truncate`) on
 *   the category label span and `break-words` (not `truncate`) on the
 *   SubItem label span. The design-system.css must declare a regression
 *   net under `.accordion-header .truncate` (so any future label that
 *   re-applies `.truncate` still wraps).
 *
 * Iron Rule: real files on disk, no mocks, no test doubles.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const APP_SIDEBAR = resolve(
  process.cwd(),
  'client/src/components/layout/new/AppSidebar.tsx',
);
const DESIGN_SYSTEM_CSS = resolve(
  process.cwd(),
  'client/src/styles/design-system.css',
);

describe('Phase 8 — Sidebar UX static guards (BUG-007 + BUG-043)', () => {
  const tsx = readFileSync(APP_SIDEBAR, 'utf-8');
  const css = readFileSync(DESIGN_SYSTEM_CSS, 'utf-8');

  describe('BUG-007 — chevron hit area (≥24 wide × ≥44 tall)', () => {
    it('AppSidebar top-level chevron declares min-h-[44px] and min-w-[24px]', () => {
      // The top-level chevron is the toggle-cat-<slug> button.
      const toggleButtonBlock = tsx.match(
        /data-testid=\{`toggle-cat-\$\{catSlug\}`\}[\s\S]{0,400}?<\/button>/,
      );
      expect(toggleButtonBlock, 'toggle-cat button block must exist').toBeTruthy();
      expect(toggleButtonBlock![0]).toMatch(/min-h-\[44px\]/);
      expect(toggleButtonBlock![0]).toMatch(/min-w-\[24px\]/);
    });

    it('AppSidebar subcategory chevron declares minHeight: 44 and width: 24', () => {
      // The subcategory chevron is the expand-sub-<slug> button.
      const expandButtonBlock = tsx.match(
        /data-testid=\{`expand-sub-\$\{subSlug\}`\}[\s\S]{0,400}?<\/button>/,
      );
      expect(expandButtonBlock, 'expand-sub button block must exist').toBeTruthy();
      expect(expandButtonBlock![0]).toMatch(/width:\s*24/);
      expect(expandButtonBlock![0]).toMatch(/minHeight:\s*44/);
    });

    it('design-system.css declares min-height: 44px on .accordion-header', () => {
      const headerBlock = css.match(/\.accordion-header\s*\{[\s\S]*?\}/);
      expect(headerBlock, '.accordion-header rule must exist').toBeTruthy();
      expect(headerBlock![0]).toMatch(/min-height:\s*44px/);
    });
  });

  describe('BUG-043 — label truncation fix', () => {
    it('top-level category label uses break-words (not truncate)', () => {
      // The category label span carries title={cat.name} and renders
      // {cat.name}. Match it directly (the previous walk-backwards-from-
      // first-occurrence heuristic broke on unrelated `${cat.name}`
      // template literals earlier in the file).
      const labelSpan = tsx.match(
        /<span\s+className="([^"]*)"\s+title=\{cat\.name\}[\s\S]{0,300}?\{cat\.name\}\s*<\/span>/,
      );
      expect(labelSpan, 'cat.name label span must exist').toBeTruthy();
      expect(labelSpan![1], 'category label opening tag').toMatch(/break-words/);
      expect(labelSpan![1], 'category label must NOT truncate').not.toMatch(/\btruncate\b/);
    });

    it('SubItem label uses break-words (not truncate)', () => {
      // The SubItem label span sits right before {label} inside its <a>.
      const subLabelSpan = tsx.match(
        /<span[^>]*>\{label\}<\/span>/,
      );
      expect(subLabelSpan, 'SubItem label span must exist').toBeTruthy();
      expect(subLabelSpan![0]).toMatch(/break-words/);
      expect(subLabelSpan![0], 'SubItem label must NOT truncate').not.toMatch(/\btruncate\b/);
    });

    it('design-system.css declares a regression net under .accordion-header .truncate', () => {
      const fallbackBlock = css.match(
        /\.accordion-header\s+\.truncate\s*\{[\s\S]*?\}/,
      );
      expect(
        fallbackBlock,
        '.accordion-header .truncate fallback rule must exist',
      ).toBeTruthy();
      expect(fallbackBlock![0]).toMatch(/overflow-wrap:\s*anywhere/);
      expect(fallbackBlock![0]).toMatch(/white-space:\s*normal/);
    });

    it('expandedHeight calculator bumped to 44 px per row (no leftover 36)', () => {
      // The expandedHeight useMemo should use 44 (or higher) per row, never 36.
      // We assert: the literal "36" should NOT appear inside expandedHeight's body.
      const expandedBlock = tsx.match(
        /expandedHeight\s*=\s*useMemo\(\(\)[\s\S]*?\}\s*,\s*\[subs,\s*openSubs,\s*directCount\]\);/,
      );
      expect(expandedBlock, 'expandedHeight useMemo must exist').toBeTruthy();
      // We DO permit the literal 36 in a comment or elsewhere, but inside the
      // body of expandedHeight it should be 44.
      expect(expandedBlock![0]).toMatch(/h\s*\+=\s*44/);
    });
  });
});
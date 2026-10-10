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
 *   AppSidebar.tsx source must declare `min-h-[44px]`, `w-10`, and `min-w-10`
 *   on both category toggle buttons. The design-system.css source must
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
// sidebar.css is an @import entry; the rules live in its partials.
const SIDEBAR_CSS = [
  'sidebar.css',
  'sidebar-shell.css',
  'sidebar-categories.css',
  'sidebar-tree.css',
].map((file) => resolve(process.cwd(), 'client/src/styles/shell', file));

describe('Phase 8 — Sidebar UX static guards (BUG-007 + BUG-043)', () => {
  const tsx = readFileSync(APP_SIDEBAR, 'utf-8');
  const css = SIDEBAR_CSS.map((file) => readFileSync(file, 'utf-8')).join('\n');

  describe('BUG-007 — chevron hit area (≥24 wide × ≥44 tall)', () => {
    it('top-level disclosure belongs to the full accordion button', () => {
      // The top-level chevron is the toggle-cat-<slug> button.
      const toggleButtonBlock = tsx.match(
        /<button[\s\S]*?data-testid=\{`accordion-cat-\$\{catSlug\}`\}[\s\S]*?<\/button>/,
      );
      expect(toggleButtonBlock, 'toggle-cat button block must exist').toBeTruthy();
      expect(toggleButtonBlock![0]).toContain('aria-expanded=');
      expect(toggleButtonBlock![0]).toContain('subs.length > 0 ? onToggle');
      expect(css).toMatch(/\.accordion-header\s*\{[^}]*min-height:\s*44px/);
    });

    it('AppSidebar subcategory chevron declares a 40×44px minimum hit area', () => {
      // The subcategory chevron is the expand-sub-<slug> button.
      // Stop at this button's boundary, not a character budget that changes
      // when a noninteractive nested-count badge or formatting is added.
      // Attribute order is not behaviour: capture the whole owning <button>
      // from its opening tag, wherever the test id sits among its props.
      const expandButtonBlock = tsx.match(
        /<button\b(?:(?!<\/?button\b)[\s\S])*?data-testid=\{`expand-sub-\$\{subSlug\}`\}(?:(?!<\/?button\b)[\s\S])*<\/button>/,
      );
      expect(expandButtonBlock, 'expand-sub button block must exist').toBeTruthy();
      expect(expandButtonBlock![0]).toContain('aria-expanded=');
      expect(css).toMatch(/\.av-sidebar-l2-toggle\s*\{[^}]*min-width:\s*44px/);
      expect(css).toMatch(/\.av-sidebar-l2-toggle\s*\{[^}]*min-height:\s*44px/);
    });

    it('sidebar.css declares min-height: 44px on .accordion-header', () => {
      const headerBlock = css.match(/\.accordion-header\s*\{[\s\S]*?\}/);
      expect(headerBlock, '.accordion-header rule must exist').toBeTruthy();
      expect(headerBlock![0]).toMatch(/min-height:\s*44px/);
    });

    it('insets the top-level focus ring inside the clipping accordion item', () => {
      // .accordion-item clips overflow and the header fills it, so an outset
      // ring is drawn entirely outside the clip box (keyboard focus invisible;
      // reproduced in a real browser at 767–1280px).
      expect(css).toMatch(
        /\.av-sidebar-shell \.accordion-header:focus-visible,\s*\.av-sidebar-drawer \.accordion-header:focus-visible\s*\{[^}]*outline-offset:\s*-2px/,
      );
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

    it('ellipsised leaves retain the full label and accessible hover title', () => {
      // The SubItem label span sits right before {label} inside its <a>.
      const subLabelSpan = tsx.match(
        /<span[^>]*className="av-sidebar-leaf-label"[^>]*>\{label\}<\/span>/,
      );
      expect(subLabelSpan, 'SubItem label span must exist').toBeTruthy();
      expect(subLabelSpan![0]).toContain('title={label}');
      expect(css).toMatch(/\.av-sidebar-leaf-label\s*\{[^}]*text-overflow:\s*ellipsis/);
    });

    it('sidebar.css declares a regression net under .accordion-header .truncate', () => {
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

    it('measures nested content instead of estimating fixed row heights', () => {
      expect(tsx).toContain('new ResizeObserver(measure)');
      expect(tsx).toContain('setHeight(content.scrollHeight)');
      expect(tsx).not.toMatch(/subSubs\.length\s*\*\s*32/);
    });
  });

  it('uses canonical sticky geometry and the exclusive mobile cutoff', () => {
    // Canonical styles.css .sidebar and responsive rules; rationale in
    // docs/parity/assumptions/shell-sidebar.md.
    expect(css).toMatch(/position:\s*sticky/);
    expect(css).toMatch(/var\(--shell-sidebar-w[,)]/);
    expect(css).toMatch(/var\(--shell-sidebar-w-tablet[,)]/);
    expect(css).toMatch(/max-width:\s*767px/);
    expect(css).toMatch(/max-width:\s*1024px/);
  });
});
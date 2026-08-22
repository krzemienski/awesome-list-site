// Executable copy of the stage-6 stray-button filter from
// .agents/skills/verify-design-system/SKILL.md ("Stage 6 · Button sweep").
//
// DRIFT GUARD: scripts/validation/ds-button-sweep.mjs extracts the string /
// regex literals between the STAGE6-FILTER-START/END markers below and
// compares them against the skill's fenced "### Button sweep" snippet. If
// you change ANY exclusion here (or in the skill), update the other in the
// same commit — the gate fails on mismatch, so the two cannot drift silently.
//
// This function is passed to Playwright's page.evaluate() and runs inside
// the browser: it must stay fully self-contained (no imports, no closure
// over module scope).
export function collectStrayButtons() {
  // STAGE6-FILTER-START — keep byte-for-byte aligned with SKILL.md stage 6
  const stray = [...document.querySelectorAll('button')].filter(b =>
    /* 1 · shadcn Button / buttonVariants() — skins hook on this */
    !b.hasAttribute('data-ds-variant') &&
    /* 2 · other shadcn/Radix primitives from @/components/ui
           (tabs, switch, checkbox, select, accordion, cmdk, carousel…) */
    !b.matches('[data-state], [data-radix-collection-item], [cmdk-item], [role="switch"], [role="checkbox"], [role="tab"], [role="combobox"]') &&
    !b.closest('[data-sidebar], [cmdk-root], [data-radix-popper-content-wrapper]') &&
    !(b.closest('[role="dialog"]') && b.querySelector('.sr-only')) && // Dialog/Sheet close ✕
    /* 3 · known composite chrome (verified compliant — list in SKILL.md) */
    !b.closest('.accordion-item') &&                        // AppSidebar taxonomy rows
    b.getAttribute('aria-label') !== 'Open search' &&       // AppHeader search chip
    !b.hasAttribute('aria-pressed') &&                      // facet/tag filter toggle rows
    !b.closest('[data-testid="active-filter-chips"]') &&    // active-filter removal chips
    !/^Remove .+ filter$/.test(b.getAttribute('aria-label') || '') && // ditto (advanced filter)
    !b.closest('[data-ds="card-hover"]') &&                 // in-card chrome (tag expanders)
    !['footer-cookie-settings',                             // small tokenized text buttons
      'button-clear-recent-searches',
      'button-dismiss-scrubbed-params'].includes(b.getAttribute('data-testid')) &&
    /* 4 · raw DS classes (standalone artifacts / showcase helpers) */
    ![...b.classList].some(c => /^(btn|tab|icon-btn)/.test(c))
  );
  // STAGE6-FILTER-END
  return {
    total: document.querySelectorAll('button').length,
    dsVariantCount: document.querySelectorAll('button[data-ds-variant]').length,
    strays: stray.map(b => ({
      testid: b.getAttribute('data-testid') || null,
      ariaLabel: b.getAttribute('aria-label') || null,
      classPrefix: String(b.className || '').trim().slice(0, 120) || null,
      text: (b.textContent || '').trim().slice(0, 60) || null,
    })),
  };
}

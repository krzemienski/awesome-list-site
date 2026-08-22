// Executable copies of the stage-6 compliance filters from
// .agents/skills/verify-design-system/SKILL.md ("Stage 6 · Button sweep" and
// the "Same idea for the rest" input/chip/card sweeps).
//
// DRIFT GUARD: scripts/validation/ds-button-sweep.mjs extracts the string /
// regex literals between each STAGE6-*FILTER-START/END marker pair below and
// compares them against the skill's matching fenced snippet ("### Button
// sweep", "### Input sweep", "### Chip sweep", "### Card sweep"). If you
// change ANY exclusion here (or in the skill), update the other in the
// same commit — the gate fails on mismatch, so the two cannot drift silently.
//
// Each function is passed to Playwright's page.evaluate() and runs inside
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

// Stage-6 "Same idea for the rest" · inputs: every <input>/<select>/<textarea>
// must be a shadcn primitive (Input/Textarea carry the bridge border classes;
// SelectTrigger is a combobox button, so a native <select> is only compliant
// via the known-chrome list).
export function collectStrayInputs() {
  // STAGE6-INPUT-FILTER-START — keep byte-for-byte aligned with SKILL.md stage 6
  const stray = [...document.querySelectorAll('input, select, textarea')].filter(el =>
    /* 1 · shadcn Input / Textarea / SelectTrigger — bridge border classes */
    !el.classList.contains('border-input') &&
    !el.classList.contains('border-[var(--border-strong)]') &&
    /* 2 · primitives / non-text controls that legitimately wrap raw inputs */
    !el.matches('[cmdk-input], [type="hidden"], [type="checkbox"], [type="radio"], [type="range"], [type="file"]') &&
    !el.classList.contains('sr-only') &&                    // peer-hidden toggle inputs
    !el.closest('[data-sidebar], [cmdk-root], [data-radix-popper-content-wrapper]') &&
    /* 3 · known tokenized native controls (verified compliant — list in SKILL.md) */
    el.getAttribute('data-testid') !== 'select-subcategory-filter' && // TaxonomyListing scope filter
    /* 4 · raw DS classes (standalone artifacts / showcase helpers) */
    ![...el.classList].some(c => /^(input|select|textarea)$/.test(c))
  );
  // STAGE6-INPUT-FILTER-END
  return {
    total: document.querySelectorAll('input, select, textarea').length,
    strays: stray.map(el => ({
      tag: el.tagName.toLowerCase(),
      testid: el.getAttribute('data-testid') || null,
      ariaLabel: el.getAttribute('aria-label') || null,
      classPrefix: String(el.className || '').trim().slice(0, 120) || null,
      text: (el.getAttribute('placeholder') || '').trim().slice(0, 60) || null,
    })),
  };
}

// Stage-6 "Same idea for the rest" · chips: anything chip-shaped must be the
// Badge primitive — DS chips are the chip/accent variants (data-ds="chip"),
// plain Badge variants are the intentional MR-DS-13 #5 divergence (admin
// status badges + the canonical .chip → Badge mapping in replit.md), and a
// pill-styled <span>/<div> built by hand is the violation this catches.
export function collectStrayChips() {
  // STAGE6-CHIP-FILTER-START — keep byte-for-byte aligned with SKILL.md stage 6
  const chipShaped = (el) => {
    if (el.childElementCount > 2) return false;
    const text = (el.textContent || '').trim();
    if (!text || text.length > 40) return false;
    const s = getComputedStyle(el);
    const h = el.getBoundingClientRect().height;
    if (h === 0 || h > 40) return false;                    // chips are small
    if ((parseFloat(s.borderRadius) || 0) < h / 2 - 1) return false; // pill radius
    if (parseFloat(s.fontSize) > 13) return false;          // text-xs and below
    if (!/^(inline|flex)/.test(s.display)) return false;
    return s.backgroundColor !== 'rgba(0, 0, 0, 0)' ||      // filled or bordered
      (parseFloat(s.borderTopWidth) > 0 && s.borderTopColor !== 'rgba(0, 0, 0, 0)');
  };
  const stray = [...document.querySelectorAll('span, div, a')].filter(el =>
    chipShaped(el) &&
    /* 1 · DS chips — Badge chip/accent variants, skins hook on this */
    el.getAttribute('data-ds') !== 'chip' &&
    /* 2 · plain shadcn Badge variants — intentional divergence (MR-DS-13 #5) */
    !(el.classList.contains('rounded-full') && el.classList.contains('focus:ring-ring')) &&
    /* 3 · shadcn/Radix chrome that renders pill-shaped bits */
    !el.closest('[data-sidebar], [cmdk-root], [data-radix-popper-content-wrapper]') &&
    /* 4 · raw DS classes (standalone artifacts / showcase helpers) */
    !el.classList.contains('chip') &&
    !el.classList.contains('kbd')
  );
  // STAGE6-CHIP-FILTER-END
  return {
    total: document.querySelectorAll('[data-ds="chip"]').length,
    strays: stray.map(el => ({
      tag: el.tagName.toLowerCase(),
      testid: el.getAttribute('data-testid') || null,
      ariaLabel: el.getAttribute('aria-label') || null,
      classPrefix: String(el.className || '').trim().slice(0, 120) || null,
      text: (el.textContent || '').trim().slice(0, 60) || null,
    })),
  };
}

// Stage-6 "Same idea for the rest" · cards: any clickable/hoverable card
// (shadcn Card renders the bg-card bridge class) must carry
// data-ds="card-hover" so the per-system hover skins apply.
export function collectStrayCards() {
  // STAGE6-CARD-FILTER-START — keep byte-for-byte aligned with SKILL.md stage 6
  const stray = [...document.querySelectorAll('*')].filter(el =>
    /* candidates: shadcn Card / bg-card surfaces */
    el.classList.contains('bg-card') &&
    /* interactive = clickable or link-wrapped (static cards are fine bare) */
    (getComputedStyle(el).cursor === 'pointer' ||
      !!el.closest('a, button') ||
      el.matches('[role="button"], [role="link"], [tabindex]:not([tabindex="-1"])')) &&
    /* 1 · the hook itself — per-system hover skins key on this */
    el.getAttribute('data-ds') !== 'card-hover' &&
    !el.closest('[data-ds="card-hover"]') &&                // inner bg-card bits of a hooked card
    /* 2 · shadcn/Radix chrome (popovers, dialogs, sidebar) */
    !el.closest('[data-sidebar], [cmdk-root], [data-radix-popper-content-wrapper], [role="dialog"]') &&
    /* 3 · raw DS classes (standalone artifacts / showcase helpers) */
    !el.classList.contains('card')
  );
  // STAGE6-CARD-FILTER-END
  return {
    total: document.querySelectorAll('[data-ds="card-hover"]').length,
    strays: stray.map(el => ({
      tag: el.tagName.toLowerCase(),
      testid: el.getAttribute('data-testid') || null,
      ariaLabel: el.getAttribute('aria-label') || null,
      classPrefix: String(el.className || '').trim().slice(0, 120) || null,
      text: (el.textContent || '').trim().slice(0, 60) || null,
    })),
  };
}

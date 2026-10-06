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
           (tabs, switch, checkbox, select, accordion, cmdk, carousel…).
           NB: overlay CONTAINERS (cmdk palette, popover/dropdown popper
           content) are NOT blanket-excluded — a button inside an open
           overlay must qualify one-by-one like everything else, so rogues
           in dialogs/popovers/menus are reportable. */
    !b.matches('[data-state], [data-radix-collection-item], [cmdk-item], [role="switch"], [role="checkbox"], [role="tab"], [role="combobox"]') &&
    !b.closest('[data-sidebar]') &&
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
    !b.matches('.about-faq-item > .about-faq-trigger[aria-expanded][aria-controls]') && // About FAQ disclosure rows
    /* 5 · Clerk-hosted auth widget (third-party DOM the app cannot mark).
           Positive AND per control: excluded ONLY while the widget is themed
           from the DS (its primary button paints the live --accent) AND this
           very control paints in a DS face (--font-body / --font-display /
           --font-mono first family) — a Clerk control still in its vendor
           font is swept like anything else. */
    !(b.closest('.cl-rootBox') && ((root, el) => {
      const primary = root.querySelector('.cl-formButtonPrimary');
      if (!primary) return false;
      const probe = document.createElement('i');
      probe.style.background = 'var(--accent)';
      root.appendChild(probe);
      const want = getComputedStyle(probe).backgroundColor;
      probe.remove();
      if (getComputedStyle(primary).backgroundColor !== want) return false;
      const face = (v) => String(v || '').split(',')[0].replace(/\x22|\x27/g, '').trim().toLowerCase();
      const rs = getComputedStyle(document.documentElement);
      const ds = ['--font-body', '--font-display', '--font-mono'].map(t => face(rs.getPropertyValue(t)));
      return ds.includes(face(getComputedStyle(el).fontFamily));
    })(b.closest('.cl-rootBox'), b)) &&
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
    !el.matches('[cmdk-input], [type="hidden"], [type="checkbox"], [type="radio"], [type="range"], [type="file"], select[aria-hidden="true"]') &&
    !el.classList.contains('sr-only') &&                    // peer-hidden toggle inputs (select[aria-hidden] = Radix Select's off-screen native bridge)
    !el.closest('[data-sidebar], [cmdk-root], [data-radix-popper-content-wrapper]') &&
    /* 3 · known tokenized native controls (verified compliant — list in SKILL.md) */
    el.getAttribute('data-testid') !== 'select-subcategory-filter' && // TaxonomyListing scope filter
    /* Clerk-hosted auth widget — same positive themed-root + per-control DS-face check as the button sweep */
    !(el.closest('.cl-rootBox') && ((root, ctl) => {
      const primary = root.querySelector('.cl-formButtonPrimary');
      if (!primary) return false;
      const probe = document.createElement('i');
      probe.style.background = 'var(--accent)';
      root.appendChild(probe);
      const want = getComputedStyle(probe).backgroundColor;
      probe.remove();
      if (getComputedStyle(primary).backgroundColor !== want) return false;
      const face = (v) => String(v || '').split(',')[0].replace(/\x22|\x27/g, '').trim().toLowerCase();
      const rs = getComputedStyle(document.documentElement);
      const ds = ['--font-body', '--font-display', '--font-mono'].map(t => face(rs.getPropertyValue(t)));
      return ds.includes(face(getComputedStyle(ctl).fontFamily));
    })(el.closest('.cl-rootBox'), el)) &&
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
    /* 4 · known composite chrome (verified compliant — list in SKILL.md) */
    el.getAttribute('data-testid') !== 'badge-notification-count' && // AppHeader bell unread count dot
    /* 5 · raw DS classes (standalone artifacts / showcase helpers) */
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

// Stage-6 "Same idea for the rest" · page titles: every <h1> must use the
// .display-h helper (per-system display-font switching keys on it) and must
// not pin a body font/weight (font-sans/font-medium) on top of the display
// tokens. Screen-reader-only titles are invisible — no display font to
// switch — so they're the one exclusion.
export function collectStrayH1s() {
  // STAGE6-H1-FILTER-START — keep byte-for-byte aligned with SKILL.md stage 6
  const stray = [...document.querySelectorAll('h1')].filter(h =>
    /* 1 · the DS display-heading helper — per-system display fonts key on it,
           and pinning font-sans/font-medium over it defeats the tokens */
    (!h.classList.contains('display-h') ||
      h.classList.contains('font-sans') ||
      h.classList.contains('font-medium')) &&
    /* 2 · screen-reader-only page titles (invisible — nothing to switch) */
    !h.classList.contains('sr-only') &&
    /* 3 · the frozen Category/Subcategory title ONLY: pages.jsx renders that h1
           with inline weight/tracking/leading in the BODY face and no display
           class. The exclusion is narrow (the title inside the taxonomy page)
           AND positive: it must actually paint in the --font-body face, so no
           other h1 can opt out by borrowing the class name */
    !(h.matches('main .taxonomy-page > .taxonomy-header > h1.taxonomy-title, main .resource-detail-heading > h1[data-testid="text-resource-title"]') &&
      ((el) => {
        const face = (v) => String(v || '').split(',')[0].replace(/\x22|\x27/g, '').trim().toLowerCase();
        return face(getComputedStyle(el).fontFamily) ===
          face(getComputedStyle(document.documentElement).getPropertyValue('--font-body'));
      })(h)) &&
    /* 4 · the Clerk-hosted auth widget's header (third-party DOM the app cannot
           mark). Positive: it must actually paint in the live --font-display face,
           which only happens when the DS-derived appearance is wired */
    !(h.matches('.cl-rootBox h1.cl-headerTitle') &&
      ((el) => {
        const face = (v) => String(v || '').split(',')[0].replace(/\x22|\x27/g, '').trim().toLowerCase();
        return face(getComputedStyle(el).fontFamily) ===
          face(getComputedStyle(document.documentElement).getPropertyValue('--font-display'));
      })(h))
  );
  // STAGE6-H1-FILTER-END
  return {
    total: document.querySelectorAll('h1').length,
    strays: stray.map(h => ({
      tag: 'h1',
      testid: h.getAttribute('data-testid') || null,
      ariaLabel: h.getAttribute('aria-label') || null,
      classPrefix: String(h.className || '').trim().slice(0, 120) || null,
      text: (h.textContent || '').trim().slice(0, 60) || null,
    })),
  };
}

// Stage-6 "Same idea for the rest" · section labels: anything rendered as a
// mono UPPERCASE label (the eyebrow look) must be the .eyebrow helper —
// hand-pinned font-mono/uppercase combos skip the per-system tracking,
// size-step, and accent treatment. Mono+uppercase that is NOT a section
// label is excluded: Badge chips (primitive emits it), keyboard-hint
// clusters (<kbd>/.kbd and their sibling captions like "esc · to close"),
// and code/reference chrome.
export function collectStrayEyebrows() {
  // STAGE6-EYEBROW-FILTER-START — keep byte-for-byte aligned with SKILL.md stage 6
  const eyebrowish = (el) => {
    if (el.childElementCount > 2) return false;
    const text = (el.textContent || '').trim();
    if (!text || text.length > 60) return false;             // labels are short
    const s = getComputedStyle(el);
    if (s.textTransform !== 'uppercase') return false;        // all-caps via CSS
    if (!/mono|menlo|consolas|courier/i.test(s.fontFamily)) return false;
    if (parseFloat(s.fontSize) > 14) return false;            // label scale
    return el.getBoundingClientRect().height > 0;             // visible
  };
  const stray = [...document.querySelectorAll('p, div, span, a, h2, h3, h4, h5, h6, legend, figcaption')].filter(el =>
    eyebrowish(el) &&
    /* 1 · the DS eyebrow helper (self, or child bits like the ── dash) */
    !el.closest('.eyebrow') &&
    /* 2 · chips/badges — mono+uppercase comes from the Badge primitive (or the
           raw DS .chip class on standalone artifacts / frozen-reference ports) */
    !el.closest('[data-ds="chip"], .chip') &&
    !(el.classList.contains('rounded-full') && el.classList.contains('focus:ring-ring')) &&
    /* 3 · keyboard hints + code samples — mono by nature, not section labels
           (covers the <kbd> itself, wrappers around one, and sibling captions
           like the search dialog's "esc · to close") */
    !el.closest('code, pre, kbd, .kbd') &&
    !el.querySelector('kbd, .kbd') &&
    !(el.parentElement && el.parentElement.querySelector(':scope > kbd, :scope > .kbd')) &&
    /* 4 · shadcn/Radix + reference sidebar chrome */
    !el.closest('[data-sidebar], [cmdk-root], [data-radix-popper-content-wrapper]') &&
    /* 5 · the frozen ResourceDetail card labels ONLY: pages.jsx renders them as
           .mono 10px accent labels (not .eyebrow), and the app keeps that paint
           under semantic h2s. Narrow (those two cards) AND positive: each must
           actually paint the frozen label — --font-mono face, 10px, --accent ink */
    !(el.matches('main .resource-detail-description > h2, main .resource-detail-sections h2') &&
      ((h2) => {
        const face = (v) => String(v || '').split(',')[0].replace(/\x22|\x27/g, '').trim().toLowerCase();
        const cs = getComputedStyle(h2);
        const probe = document.createElement('i');
        probe.style.color = 'var(--accent)';
        h2.appendChild(probe);
        const accent = getComputedStyle(probe).color;
        probe.remove();
        return face(cs.fontFamily) === face(getComputedStyle(document.documentElement).getPropertyValue('--font-mono')) &&
          cs.fontSize === '10px' && cs.color === accent;
      })(el))
  );
  // STAGE6-EYEBROW-FILTER-END
  return {
    total: document.querySelectorAll('.eyebrow').length,
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

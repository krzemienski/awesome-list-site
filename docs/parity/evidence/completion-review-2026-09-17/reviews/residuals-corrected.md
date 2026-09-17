# Independent review: residuals-corrected

Raw scoped review. Assertions are subject to the integrator findings in COMPLETION-REVIEW.md; source inspection is not browser proof. Historical counts and initial candidate findings are not current certification.

Correction accepted. The exact-768 visible 240px sidebar, no page-level sideways overflow/mobile reflow, and 44px controls are **contract-required acceptance adaptations**, not app defects. They must not be “fixed” by copying the frozen source’s inclusive `max-width:768px`, restoring min-content overflow, or shrinking controls. The associated rows are contradictory pixel targets and need reconciliation/exception evidence, not CSS rollback:
- `app.home.index`, `app.home.curated`, `app.shell.mobile-drawer`, `app.shell.palette`, `app.category`, `app.subcategory` at 768.
- Phone artifact docs/showcase rows affected by `min-width:0`, local stacking/scrollports, and 44px targets.

**Taxonomy re-review (source-evidenced, no browser):**

The stored 2026-09-17 taxonomy pairs do **not** prove a current title/font defect. Their font report only confirms loaded faces, but the stored evidence has no computed-style snapshot, and current source changed after that run. Comparing authored/current rules:
- Authored title (`awesome-list-site-ds/home-layouts.jsx:58`): 16px, 600, `letter-spacing:-0.2px`, line-height 1.3, margin-bottom 8px.
- Current (`client/src/styles/components/resource-card.css:93-113` plus `client/src/styles/pages/taxonomy.css:260-278`): the same 16px/600/-0.2px/1.3/8px geometry after taxonomy overrides. The only concrete title-flow difference is `overflow-wrap:anywhere` on `.resource-card__title-link` (resource-card.css:104-113), versus normal wrapping in the authored plain h3. That can affect individual long words, but it does not establish the pair-wide raster drift. I retract the broader typography-fault claim as speculative.
- Authored/current descriptions both resolve to 13px, line-height 1.55, margin-bottom 14px (`home-layouts.jsx:59`; `resource-card.css:135-145`; taxonomy.css:272-278).

**One real current taxonomy fix candidate:**

Post-baseline current code added a resolved kind badge to every `ResourceCard` (`client/src/components/resource/ResourceCard.tsx:138-158,350-359`). Taxonomy’s canonical suppression list hides category badges, meta links, actions, and “more tags,” but omits `.resource-card__kind-badge` (`client/src/styles/pages/taxonomy.css:289-307`). The frozen `ResCard` renders only up to three tags and no kind badge (`awesome-list-site-ds/home-layouts.jsx:60-62`). Therefore current taxonomy can paint an extra kind chip on each card, a definite present composition discrepancy introduced after the stored images.

Bounded fix: add `.taxonomy-page .resource-card--taxonomy .resource-card__kind-badge` to the existing hidden selector list only. Do not remove kind data or badges globally. Eligible verification rows: `app.category` and `app.subcategory` at 375/768/1024/1440, with 768 judged under the explicit sidebar exception.

After that targeted verification, inspect only cards containing unbroken/long titles to determine whether `overflow-wrap:anywhere` causes measurable current mismatch; preserve it if needed for the no-overflow contract. Historical 4.9–6.8% taxonomy figures should not be cited as current defects.

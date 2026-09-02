# UX decision record — the 7 open Mediums

**Date:** 2026-09-01
**Cycle:** `audit-evidence/cycle-2026-09-01/`
**Context:** The audit closed every Critical and High and most Mediums. Seven Mediums were
left open because they change *what the pages say and how much they show* — content-strategy
calls rather than defects. This file records a decision for each, including the parts
deliberately left alone.

Findings are quoted from `ux/uxv*/findings.json`. Screenshots referenced by each finding are
in the matching `ux/uxv*/` directory.

---

## 1. uxv1-06 — Collection prose uses an overly long desktop line measure

> The About this collection paragraph spans most of the wide content column at 1440px, well
> beyond a comfortable 65–75 character reading measure.

**Decision: adopt.** Long-form prose is capped at `max-w-prose` (~65ch); controls, filters and
the result grid keep the full 1280px measure. Applied to the taxonomy listing intro, the tag
landing intro, the public-collection description, and the About lead paragraph — `max-w-prose`
was already the convention for the rest of About, so this makes the page internally consistent.

Measured after the change: 574px at a 1280px viewport, down from the full column width.

**Not changed:** headings, card text, and table content. Those are scanned, not read in
sequence, and a narrower measure would waste horizontal space.

---

## 2. uxv1-07 — Counts and generated scope prose are repetitive

> The same count appears in the title subtitle, top-right badge, and Showing heading. AV1 scope
> copy reads "part of Encoding & Codecs and Codecs and includes 5 curated resources,"
> mechanically repeating Codecs.

**Decision: adopt, with one deliberate exception.**

*Counts.* The header subtitle count and the top-right `badge-count` are gone from both taxonomy
listings and tag landings. The results heading is the single count on the page. It carries a
`data-total` attribute so gates and scripts read the machine-readable total instead of
scraping a second visible element.

The old header badge did carry one signal the heading lacked: the unfiltered collection size.
Rather than restore a second number, the heading states both in one sentence when — and only
when — a filter is narrowing the collection: `Showing 1–24 of 23 resources (filtered from 333)`.
With no filter applied there is exactly one number on the page.

*Scope prose.* Sub-subcategory intros joined both ancestors with a conjunction, producing
"part of Encoding & Codecs and Codecs and includes …" — two `and`s in a row, which reads as a
single odd compound name. The ancestors are now nested: "AV1 is a specific area of Codecs, part
of Encoding & Codecs, and includes 5 curated resources." Category and subcategory phrasing is
unchanged; they only ever had one ancestor and never had the problem.

**Kept as is:** the intro paragraph still says "brings together N curated resources". That is
narrative prose that carries the page's SEO description, not a third status readout, and the
finding named the subtitle, badge, and heading specifically. Removing the number would leave
the paragraph vaguer without making the page easier to scan.

---

## 3. uxv2-08 — Facet inventory overwhelms the result task

> The populated search exposes very long category, subcategory, sub-subcategory, provider,
> format, skill, and tag lists; the accessibility snapshot included hundreds of filter actions
> before result cards.

**Decision: adopt for the desktop sidebar only.**

On desktop the sidebar sits permanently beside the results, so its length is pure competition
with the thing the visitor came for. The three long groups — Subcategory, Sub-subcategory, and
Tags — are now `<details>` disclosures, collapsed by default and auto-opened when a selection
exists (so a deep-linked filter is never hidden). Visible facet controls in the sidebar dropped
from 68 to 11.

The tag list cap went from 80 to **24**, matching the site's 24-per-page unit elsewhere, and
selected tags now sort to the front so a deep-linked tag is never cut off by the cap. The
"Showing 24 of N tags" line already told visitors how to reach the rest.

**Kept as is — the mobile filter sheet stays fully expanded.** On mobile the facets live behind
a "Filters" button and never sit between the visitor and the results, so they cost nothing at
rest. Opening that sheet *is* the filtering task; collapsing groups inside it would add a tap to
every filter without saving any scroll on the results page.

**Kept as is — Category, Provider, Format, and Skill level stay open on desktop.** They are
short, they are the facets people reach for first, and collapsing them would hide the primary
filtering affordance to save a few hundred pixels.

**Not adopted: "Show more" per group.** A disclosure and a truncation control side by side is
two different ways to say "there is more here". The `<details>` disclosure plus the existing tag
cap covers the same ground with one interaction model.

---

## 4. uxv2-11 — Guest page leads with personalization that is unavailable

> The H1 and lead promise Personalized Recommendations, then immediately gate personalization
> behind login and fall back to generic popular picks.

**Decision: adopt.** For signed-out visitors `/recommendations` now leads with
"Recommended Resources" and the honest lead "Popular picks from across the catalog. Sign in to
tailor them to your interests and learning goals." The picks render first; the sign-in card
follows them as a next step rather than as a toll gate. Signed-in visitors keep the
"Personalized Recommendations" heading, which is accurate for them.

The shared recommendations panel had the same problem in miniature: guests met two stacked
cards explaining what they could not do before a single recommendation. The duplicate framing
card is now shown only to signed-in visitors, where it summarises the profile driving the
results and is where they change it. Guests get a compact sign-in card *after* the list, keeping
the same `link-sign-in-personalize` and `button-generate-recommendations` controls.

Measured after the change at 375px: first resource card at 370px from the top; sign-in card at
3715px, after the list.

Incidental: the CTA said "Login" while the rest of the site says "Sign in" (uxv2-12, LOW). Since
this copy was being rewritten anyway, it now says "Sign in".

---

## 5. uxv2-13 — Related-topic wall delays the primary resource list on mobile

> Fifteen related chips occupy most of the first mobile viewport; the first actual resource
> begins around 660px down despite resources being the page's primary task.

**Decision: adopt, by relocation rather than truncation.** "Explore related topics" now sits
*after* the resource grid and its paginator, on both the client page and the server-rendered
crawler HTML. Related topics are a next step once the current list has been considered, not a
prerequisite to reading it.

Measured after the change at 375px on a 158-resource tag: results count at 465px, first resource
card at 501px, related topics at 8923px.

**Not adopted: a compact subset with a "More topics" expander.** That keeps a smaller wall in
the same wrong place and adds a control. Moving the section costs nothing and removes the
problem entirely. The crawler HTML was reordered in lockstep so the two renderings do not
diverge; the SEO gate asserts the section exists with its category and tag links, and is
position-agnostic.

---

## 6. uxv2-14 — Resource count is duplicated in the header (LOW, same family)

> The tag header displays 81 resources available and a separate 81 badge side by side.

**Decision: adopt.** Fixed by the same change as uxv1-07 — the tag header badge is gone and the
results heading is the single count.

---

## 7. uxv4-07 — Long resource descriptions make the mobile learning path hard to scan

> Each resource displays a dense small-text description; the first resource alone occupies most
> of the visible step card and pushes subsequent resources and steps far down the page.

**Decision: adopt, as a breakpoint-scoped clamp.** Resource descriptions in the journey syllabus
are clamped to two lines below 640px and shown in full from 640px up, where the extra width
already keeps them to a line or two. The full text stays in the DOM and in the element's `title`,
so it is available to assistive technology, to search, and on hover. Print is unaffected — the
print stylesheet un-clamps `line-clamp-*` deliberately, so a printed syllabus still carries
every description.

**Not adopted: a per-resource expand control.** A disclosure on every row in a six-step syllabus
adds dozens of controls to the exact surface the finding says is already too heavy. The clamp
plus the resource detail page covers the need.

---

## 8. uxv5-03 — Mobile theme comparison requires a 4,178px page journey

> At 375x812 the screen measured 4,178px tall: systems, ten accents, six fonts, and the live
> preview are separated vertically. A user cannot see the preview while choosing a
> system/accent, making repeated visual comparison memory-dependent.

**Decision: adopt the sticky-preview half of the suggested fix; keep the page long.**

Below `lg`, a compact strip pins to the top of the viewport showing the live accent swatch, a
type specimen in the active font, and the active system and accent names — all driven by the
same tokens as the full preview. Tapping any system, accent, or font updates it in place, so
comparison no longer depends on remembering what the previous choice looked like. Desktop keeps
the full-size preview only; it does not have the scroll problem.

The specimen is set in `font-sans`, which resolves to `--font-body`. That is the only family
**both** pickers move: a design system sets `--font-body`, `--font-display` and `--font-mono`,
while the font override sets only `--font-body` and `--font-sans`. A specimen in a display or
mono face would therefore sit unchanged while the visitor taps through the six fonts — the exact
comparison problem this strip exists to solve. Verified at 375x812 on `/settings/theme`: the six
font options resolve to five distinct families (System default and Inter share Editorial's body
face) and the five design systems resolve to five distinct families.

The strip pins **below** the app header, not at `top: 0`. The header is itself sticky at
`top-0`, is 56px tall (60px from `md`) and sits at a higher z-index, so a strip pinned at the
same offset would slide underneath it and never be seen. Verified after a 2,500px scroll: at
375px the strip's top is 56px and the header's bottom is 56px; at 768px both are 60px; at each
width `document.elementFromPoint` at the strip's centre returns the specimen itself, so nothing
overlaps it. At `lg` and wider the strip is not rendered — the desktop page has no scroll
problem.

The strip is deliberately **non-interactive**: the full preview below is already captioned as
display-only, and a pinned bar of fake controls would be a second false affordance.

**Kept as is — the page is still ~4,180px.** Its length comes from showing every system, accent,
and font as a real sample. Collapsing those groups would hide exactly the comparison surface the
finding is asking to make easier. The sticky preview fixes the comparison problem without hiding
the options.

**Enabling change:** `position: sticky` did not work anywhere inside the app. The single
`<main>` element carried `overflow-x-hidden`, which computes `overflow-y` to `auto` and makes
`<main>` a scroll container that never scrolls — silently disabling sticky positioning for every
descendant. It is now `overflow-x-clip`, which clips identically without creating a scroll
container.

---

## Summary

| Finding | Decision |
|---|---|
| uxv1-06 collection prose measure | Adopt — `max-w-prose` on long-form prose only |
| uxv1-07 repeated counts | Adopt — one count, in the results heading, with `data-total` |
| uxv1-07 scope prose | Adopt — nested ancestor phrasing for sub-subcategories |
| uxv1-07 intro paragraph count | **Keep as is** — narrative SEO prose, not a status readout |
| uxv2-08 facet density (desktop) | Adopt — collapse the 3 long groups; tag cap 80 → 24 |
| uxv2-08 facet density (mobile sheet) | **Keep as is** — already behind a button; collapsing adds taps |
| uxv2-08 short facet groups | **Keep as is** — primary filters stay open |
| uxv2-11 guest personalization framing | Adopt — guest-first heading, picks first, sign-in after |
| uxv2-13 related-topic wall | Adopt — move the section below the results, client + crawler |
| uxv2-14 duplicate tag count | Adopt — closed with uxv1-07 |
| uxv4-07 mobile description length | Adopt — two-line clamp below 640px, full text retained |
| uxv5-03 theme comparison | Adopt sticky mini-preview; **keep** the page length |

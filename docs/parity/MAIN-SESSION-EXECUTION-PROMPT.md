# Finish the original Awesome List design implementation

Copy this entire document into the main Replit session. This is an execution
request, not a request to generate another plan.

## 1. Mission and authority

You are the lead engineer completing the original design-parity product work
in this existing React/Express application. Finish the actual application the
design describes, preserve its working functionality, and personally verify
the result in Replit's built-in browser.

Do not reduce this assignment to “make the existing tests pass.” Tests and
screenshots provide evidence about the product; they are not substitutes for
building missing features, repairing navigation, or implementing the design.
Do not finish by returning another remediation plan or a list of proposed
tasks. Execute the work, resolving defects in the owning components.

This supersedes the earlier draft in
`plans/260916-0023-parity-publish-verify/` as the main-session execution
contract. That draft was written before the original material was reread and
contains proposals that are NOT approved: replacing missing coverage with
exclusions, relaxing acceptance through adjudications, treating a lint
ratchet as a green lint run, or assuming missing browser engines are passes.
Use its research only after checking the current code and original sources.

The product is a generic viewer for awesome-list repositories. Its current
deployment is awesome.video, but implementation must derive site identity,
repository links and taxonomy from configuration and the database. Never
hardcode the demo's resource totals, titles, category names, users, charts,
or sample resources into the real application.

Keep React/TypeScript/Vite, Express, Drizzle/Postgres, Clerk, TanStack Query,
Wouter, analytics consent and the existing API contracts. Preserve all
already-merged foundations. This is not permission to replace the stack,
database, authentication, or working app with the prototype.

Publishing remains a separate, explicit user action through Replit. Never
publish automatically. Complete implementation and independent verification
first; then offer Publish and wait.

## 2. Required original sources and how to interpret them

Read the actual attachments, not only this prompt:

- `attached_assets/REPLIT-REMEDIATION-PROMPT_1789518545976.md`
- `attached_assets/awesome_list_site_2_1789518545976.zip`

List the archive before extracting. Extract into a fresh isolated directory,
never over the app or frozen design reference. Read every authored source
file and all documentation. Distribute independent source reading across
read-only helpers if necessary, maintaining a file coverage ledger.

Required reading order:

1. `HANDOFF.md`
2. `docs/04-tokens.md`
3. `docs/05-theming.md`
4. `docs/10-components.md`
5. `docs/11-patterns.md`
6. `SKILL-verify-design-system.md`
7. `styles.css` and `design-systems.jsx`, end to end
8. All remaining `docs/*.md`, application JSX, documentation/showcase JSX,
   `audit-report.md`, `uploads/INDEX.md`, HTML entrypoints and `data.js`.

### Source map

| Source | Use |
|---|---|
| `styles.css`, `design-systems.jsx` | Exact tokens, theme personalities, component skins, accents and theme application |
| `layout.jsx`, `sidebar-variants.jsx`, `app.jsx` | Header, footer, sidebar, drawer, palette, navigation and shell composition |
| `home-layouts.jsx` | Index and Curated home compositions and supported variants |
| `pages.jsx`, `pages-core.jsx`, `pages-extra.jsx`, `views-1.jsx`, `views-2.jsx` | Public page layouts and alternate reference states |
| `admin.jsx` | Admin surfaces, tables, density, state presentation and charts |
| `tweaks-panel.jsx` | Demonstrated configuration choices; distinguish design authoring controls from intended product settings |
| `docs-content-*.jsx`, `docs.jsx`, `design-system-showcase.jsx`, `design-system-anatomy.jsx` | Documentation and component specimens, not replacement app pages |
| `data.js` | Prototype fixtures for understanding layouts, never production data |
| `uploads/INDEX.md` and image assets | Historical app coverage and behavior context, not automatic new-design pixel targets |

### Important source reconciliation findings

The modular application files inspected in the uploaded archive match their
counterparts in `awesome-list-site-ds/`. The two standalone HTML exports
contain compressed manifests with embedded authored sources. Their embedded
app/layout/home/page payloads differ from the modular sources and lack later
modular navigation work. Different asset UUIDs alone are not source changes.

Do not assume that a file named “Standalone” is the newest design. Decode
authored payloads where needed and compare actual source content. Do not
spend time interpreting vendor bundles or font binary bytes as requirements.
Record hashes and substantive differences in `docs/parity/DESIGN-SYNC.md`.

The original brief gives the newest Claude design priority, including the
separately referenced `awesome-list-site-1` render. Do not pretend to have
accessed that project if unavailable. Establish which supplied source
contains the later requested behavior. Keep the frozen reference unchanged
unless an explicit, independently reviewed source-sync change is necessary;
never edit expected design files merely to match implementation.

The indexed 22 screenshots are old production captures from
`new.awesome.video`, not the new design. Additional phone captures and
`_check` images require their own provenance; blank or historical captures
are not acceptable expected images for new work.

The original brief explicitly resolves missing counterparts:

- Design feature without a production equivalent: BUILD it.
- Existing production screen without a design equivalent: retain it and
  apply the closest documented pattern, with per-state token verification.
  Do not invent a pixel reference or leave it permanently “blocked.”
- A counterpart that exists in an unloaded/alternate source file is not
  “missing.” Inspect it and wire the reference state honestly.
- Documentation-only specimens remain documentation evidence. Their
  eligibility must not contaminate the application's pixel denominator.

## 3. Inspect current implementation before changing it

Read `replit.md`, the registered design-system artifact's `docs/`, current
route declarations, relevant component contracts, and retained parity
evidence. Confirm branch, current revision and pending edits.

Consult:

- `docs/parity/{SCREENS,STATUS,REPORT,VERIFICATION,PUBLISH}.md`
- `docs/parity/worklog/full-regression-2026-09-15.md`
- `docs/parity/evidence/full-regression/run-2026-09-15/`
- `tests/parity/README.md`, inventory fragments, runner and reference adapters
- `docs/DESIGN-SYSTEM.md`, `docs/COMPONENT-LIBRARY.md`
- `docs/CONTACT-VARIANTS.md`, existing kind/featured/contact implementation
- `artifacts/awesome-video-design-system/docs/`

Existing failed-run statistics are historical evidence, not fresh findings
on the current commit. Do not treat a large pixel difference as proof of
one specific cause. Examine actual and expected images, active route/state,
font loading, authentication and data before editing.

Create a requirements-to-product ledger in `docs/parity/IMPLEMENTATION.md`:

| Requirement | Original source | Current implementation | Missing/broken behavior | Owner | Real-browser proof | Status |
|---|---|---|---|---|---|---|

Use verified-complete, needs-implementation, needs-repair, or unverified.
An API without its UI, a UI without persistence, or a button without its
action is incomplete.

## 4. Build the complete product

### A. Theme foundations and five distinct design systems

Retain all five systems and all ten accents, selectable at `/settings/theme`.
Editorial × Crimson is the default pixel target. Other systems must actually
change typography, geometry, motion and component treatment—not just colors.

- Editorial: Fraunces display, Inter body, JetBrains Mono metadata; warm
  alpha ink, soft geometry, restrained italic emphasis.
- Terminal: IBM Plex mono treatment, square geometry, scanlines, brackets,
  terminal-specific affordances and restrained glow.
- Geist: quiet typography, subtle rings, soft geometry and neutral surfaces.
- Brutalist: Instrument Serif/Space Grotesk, hard borders, square geometry,
  offset shadows and strong display treatment.
- Swiss: Manrope/mono, tight grid, hairlines, tabular alignment and minimal
  shadow.

Read exact values from the source; do not reconstruct them from these
descriptions. Preserve all token groups, accent pairs and system skin blocks.
Do not rely on stale prose token counts: enumerate the actual registry.

Apply and persist theme before first paint without breaking CSP or existing
SSR. Preserve manual accent selection when switching systems; use natural
defaults only according to the source's rules. Verify unknown/stale values,
reload, route transitions and denied storage using the existing contracts.

Load actual font families, styles and weights used by each system. One
canonical Google Fonts request is required where the original shell uses
it; use the same files in the design-system preview. Do not fix missing
fonts by synthesizing weights, widening requests indiscriminately or
lowering pixel thresholds.

Respect `.page` atmosphere and `.grain`; preserve the existing optimized
implementation when it produces the required appearance. Body text cannot
use faint metadata ink. Accent is for primary/active/brand emphasis, not a
rainbow of decorative badges. Charts use ink ramps with a single accent;
semantic success/warning/error remain distinct.

### B. Complete application shell

Implement and verify the original shell across real pages:

- Sticky 60px header, brand left, search/navigation/user controls
  right-aligned, correct blur and responsive composition.
- Real four-column footer that collapses to two and one columns with
  functioning configured destinations.
- Taxonomy sidebar: 280px desktop, 240px tablet, mobile drawer below 768px;
  at 768px the design calls for the tablet sidebar, not merely a drawer.
- Collapsible 56px rail where supported; persistent expanded/collapsed
  state; L1/L2/L3 nesting, counts, `+N` badges and tree connectors.
- Correct active ancestors and breadcrumbs; expanding a branch must not
  navigate unexpectedly, and selecting a leaf must navigate to that leaf.
- Drawer and modal focus traps, Escape/backdrop close, scroll lock, focus
  return, unique disclosure IDs and accessible names.
- Command/Ctrl-K palette: open, type, see real results, keyboard-select and
  navigate; preserve focus and Escape behavior.
- Search placements demonstrated by the product design must function
  without duplicate conflicting inputs or inaccessible controls.
- No duplicate navigation surfaces, sideways overflow, sticky failures or
  footer/consent overlap at the specified widths.

The old diagnostic text “both sides have no footer” is provenance, NOT
evidence that a footer is unnecessary. The original product brief requires
the footer. Verify actual page composition and the correct reference state.

### C. Home, taxonomy, resource and search

Deliver Index as the default home layout and selectable Curated layout,
using real data. Preserve the intended differences in composition, featured
areas, rails, density and hierarchy; do not make two labels select the same
page.

Verify home filters with live counts, clear/reset state, empty results,
featured content and navigation. Keep result counts and pagination
consistent with the actual API and authoritative taxonomy.

Complete category, subcategory, sub-subcategory and resource-detail layouts:
breadcrumbs, headings, counts, filters, grids/list rows, metadata, tags,
actions, pagination and responsive behavior. Shared ResourceCard consumers
must stay consistent. Preserve crawler/SSR parity and URL state.

Resource detail must display real content and retain existing bookmark,
collection, notes, edit suggestion and external-link behavior where
available. No placeholder cards or prototype-generated “Resource within…”
rows.

Search must return real results, support no-results and clear/reset states,
preserve query/filter state, and work with browser Back/Forward. Preserve
advanced search and existing capabilities even where there is no direct
prototype counterpart.

Investigate the historical RIST, MPEG & Forums and Official Specs error
screens at their actual rendered routes. Differentiate a backend failure,
rate limiting, stale state or render exception; repair the owning defect,
not the audit expectation.

### D. Existing public and authenticated pages

Preserve and finish About, submission, sign-in/sign-up, settings/theme,
journeys/list/detail, recommendations, bookmarks, collections, profile,
notes, legal pages, onboarding, 404, loading, empty and error states.
Enumerate the current app rather than assuming this list is exhaustive.

Use actual reference counterparts when present; otherwise apply documented
page/form/list/prose/empty-state patterns and explicitly verify their
rendered token use. Authentication remains Clerk; do not reproduce a fake
prototype login form.

Submission is protected for guests. An authenticated user can enter valid
data, correct inline errors without losing input, submit through the real
backend and see the actual resulting state. Return-after-sign-in must remain
safe and correct.

### E. Optional resource kinds and featured content

Reuse the merged migration and resolver if already correct.

- Nullable optional kind:
  `tools | libraries | standards | events | protocols | other`.
- Explicit valid kind wins; otherwise apply the existing shared
  tag/category fallback consistently.
- Keep schema, Zod, serializer and client responses consistent.
- Other awesome-list imports remain valid without a kind.
- Admin can set/change/clear kind and observe persistence after reload.
- Home exposes the filter strip with accurate live counts and correct
  combined filtering.
- Admin can toggle featured status; the changed resource appears or
  disappears in the correct Index and Curated featured positions.

Do not make server-only capability count as UI completion. Do not fork
kind inference into inconsistent parallel implementations.

### F. Every admin surface

Preserve actual admin authorization and all existing operations. Build the
design around real data and services, not the static prototype tables.

Inventory and complete Overview, Approvals, Edits, Enrichment, Researcher,
Export, Database, Resources, Categories, Subcategories, Users, GitHub,
Link Health, Audit and Research, plus every dialog and nested state.

Match stat strips, submission queue, health chips, activity table, filters,
forms, table density, pagination, empty/loading/error states and charts.
Where the brief says “posts,” map it to the actual design and existing
submission/activity domain; do not invent a blog/CMS from one ambiguous word.

Verify tab activation before inspecting its panel. Preserve selectors and
accessibility contracts. A ~99% resource-manager pixel mismatch may indicate
the wrong state or composition; inspect the image pair before tweaking CSS.

Resource editing, approval/rejection, taxonomy changes and other covered
operations must really persist in the development database. Use unique
disposable records, track their IDs and restore only records owned by this
validation run. Never run broad cleanup against another worker.

Do not diagnose dialogs from a failed authentication setup. Establish the
correct app-host session first; then verify New Collection, notes and
profile interactions through the built-in browser.

AI work must retain the current centralized router configuration. Do not
restore obsolete provider configuration or launch unbounded paid jobs.
Research uses a small explicit budget; enrichment batch size is NOT a
total-job cap. Prefer existing safe evidence over expensive mass operations.

### G. Five contact alternatives, default off

Implement or finish each behind the existing
`VITE_CONTACT_VARIANT=a|b|c|d|e` flag:

1. Footer mailto and configured repository issue link.
2. Accessible modal form posting to the real rate-limited `/api/contact`.
3. Configured GitHub Discussions destination/embed with privacy and
   availability handling.
4. Per-resource suggest-edit using the existing suggestion queue.
5. Command-palette “Contact maintainers” action.

Use real configured destinations and backend behavior; no invented
maintainer address, fake successful form or dead link. If required
configuration is absent, show a truthful unavailable state.

Default/unset means no active contact option. Keep contact variants off in
production. Record a screenshot and a paragraph of tradeoffs for all five
in `docs/CONTACT-VARIANTS.md`.

## 5. Implementation discipline

Work from global tokens and shell to page families and then specialized
states. Re-skin existing components first. After TWO documented unsuccessful
re-skin attempts on the same screen, rebuild that screen's presentation from
the source while preserving its behavior and contracts. Do not confuse two
unchanged captures with two implementation attempts.

Use the existing registered design-system artifact and components. Do not
create another design system. Coordinate existing font-preview work instead
of implementing it twice; the requirement remains required even if its
ownership is tracked separately.

Parallel implementation is allowed only with distinct owned files. Assign
shared taxonomy CSS, shell files, route wiring, inventory generation and
aggregate reports to one integrator. Helpers return exact file handoffs and
evidence, not unverified completion claims.

Never remove or rename analytics events, testids, ARIA attributes or API
contracts just to simplify the redesign. Do not approve removed selectors
as “intentional” when the original contract prohibits removal.

Do not raise bundle budgets, disable lint rules globally, replace failed
assertions with skips, or modify expected output to manufacture acceptance.
The historical Journeys cap increase is not approval to raise caps again.
Reduce unnecessary route/eager dependencies and resolve the budget contract
explicitly before release.

## 6. Mandatory actual Replit-browser verification

All functional, user-flow, click-through and visual verification must use
Replit's built-in browser testing and Screenshot capabilities. Read
`.local/skills/testing/SKILL.md` and its Clerk guidance. Use the platform
testing subagent and continue that same tester for targeted corrections.

Do not install or pin browsers, start agent-browser daemons, create a custom
Playwright environment, or write a new headless screenshot harness.
Existing registered validation commands, the existing `tests/parity`
pixel harness, `baseline:compare` and `perf:mobile` remain permitted
supplementary automated gates. They do not replace the built-in browser
review of the actual app.

Point the tester at the application workflow, not the design-system artifact
listener. The proxied hostname can reach the wrong service; verify the
target using actual page identity and API responses before testing.

Write explicit tester scenarios using:

- `[New Context]`: role, real app URL, viewport and initial state.
- `[Browser]`: visible clicks, typing, keyboard navigation and reload.
- `[Verify]`: exact visible result, persistence, accessibility and screenshot.
- `[API]`: real responses supporting the observed UI.
- `[DB]`: narrow development-only persistence checks where needed.

Use the documented programmatic Clerk testing handshake; never invent
credentials, bypass auth or require the tester to fight hosted sign-in
widgets. Production remains read-only: no disposable production accounts.

Run one coordinated end-to-end pass after the coherent implementation is
ready, broken into small sequential tester batches. Reuse existing valid
evidence and continue the same tester for fixes; do not spawn repeated full
sweeps after every edit. During implementation, use cheap targeted checks.

### Required real-browser scenarios

**Guest**

1. Home renders real data in Editorial × Crimson.
2. Index/Curated selection changes the actual layout.
3. Kind filters and combined filters update visible resources and counts;
   reset restores the correct list.
4. Header/footer links, each navigation family and nested taxonomy links
   reach the correct destination.
5. Sidebar expansion/collapse, rail and mobile drawer work at 375, 768,
   1024 and 1440; state survives reload as designed.
6. Search, no results, clear, pagination and browser Back/Forward work.
7. Command palette opens with keyboard, returns real matches, navigates and
   restores focus on close.
8. Resource detail renders real metadata and outgoing link behavior.
9. Submit requires sign-in; missing routes return an actual 404.
10. Switch all five systems and all ten accents, verify 50 combinations
    persist; inspect representative controls and long-content pages, not
    only the theme settings panel.
11. Keyboard focus, reduced motion, consent banner and mobile touch targets
    remain usable with no content occlusion.

**Authenticated user and admin, development only**

1. Submit a uniquely named real resource, inspect its pending state, then
   approve it as admin and verify public visibility.
2. Edit/clear kind and toggle featured; reload and inspect both home layouts.
3. Bookmark, create/edit a collection and open/save a note through their real
   dialogs; verify persistence and focus behavior.
4. Activate every admin tab and inspect its actual content.
5. Exercise changed admin create/edit/delete and confirm/cancel paths with
   owned disposable data; preserve role protection.
6. Exercise contact variants a–e in development, including invalid input,
   unavailable configuration, successful real submission where configured,
   close/reopen and default-off behavior.
7. Teardown only the run's disposable identities and records; where Clerk
   JIT applies, remove the Clerk identity before the local identity.

Copy returned screenshots into a unique evidence directory with tester
description, verdict, viewport, route, role and revision. Inspect the images
yourself. A tester's prose without matching relevant evidence is not proof.
Stage evidence in `/tmp` while captures run: repository writes can cause
Vite to reload the browser mid-check.

An `unable` verdict is an infrastructure blocker, not a product failure and
not a pass. Record it, try a genuinely different supported correction,
and do not retry the same plan more than twice. Static screenshots/curl can
verify their own claims but cannot prove interactions they never executed.

## 7. Visual and automated acceptance

### Pixel eligibility

Editorial × Crimson at 375/768/1024/1440:

- Pixelmatch threshold 0.1.
- At most 0.5% differing pixels per eligible full-page cell.
- Full union canvas; no masking/cropping away defects.
- Fonts ready, animations disabled and identical capture conditions.
- Preserve deterministic safeguards already in the harness.
- Any explicitly permitted symmetric grain suppression must be documented
  and applied equally; never remove production atmosphere to pass a capture.

No-counterpart product pages receive real per-state token and behavioral
verification, not fabricated pixel passes. Artifact documentation remains a
separate eligibility class. Fix wrong reference activation or incomplete
reference adapters without rewriting the design to match the app.

Use real configured content. Controlled reference reconciliation may align
data identities for a valid comparison, but must not delete required live
content, mask layout, rewrite brand copy or relax thresholds.

Run the full 11-stage design audit. Editorial must pass; preserve the
original required standard for the other systems and report every remaining
FIX plainly. Provide smoke screenshots at all four widths for the other
systems. Run axe on all inventoried screens at 375 and 1440; no
serious/critical violations. Include populated and empty states where their
semantics differ.

Run current actual package scripts for type checking, lint, CSS lint, unit,
integration, route-relevant E2E, contracts, taxonomy, palette/token parity,
dead code and bundle budgets. Discover supported command flags; do not copy
invented flags from old drafts. For example, the existing parity selector
uses `--only`/`--screen`, not `--ids`.

Record Lighthouse mobile for home, category and resource—not three claims
backed by a home-only run. Check the existing performance command's route
support. If needed, extend that registered command with explicit route
coverage rather than creating a separate browser stack.

Historical lint debt, missing engines, auth failures and route omissions
remain visible. A monotonic lint ratchet is useful engineering but is not
the same as “lint passed.” No required check becomes N/A merely because
its tooling is unavailable. Record unresolved coverage as UNVERIFIED.

If the same command fails three times with the same cause, stop unchanged
reruns. Save command, exit code, last 40 lines, hypothesis and next owner
action; continue independent work. Never interpret this stop condition as
permission to report completion.

## 8. Safe cleanup

Review the original deletion candidates, but verify current references and
ownership before deleting anything:

- Retired mockup sandbox and unreferenced demo HTML.
- Orphaned CSS/components and duplicate PR template casing.
- Obsolete uploaded design assets only if not referenced by docs, gates,
  scripts, provenance or the frozen source contract.

Preserve migrations, journals, docs, brand assets, retained evidence and
anything referenced. Do not delete archives or frozen reference assets to
make image-size or palette gates pass. Obtain confirmation before any
broader destructive cleanup. Record each removal and reference search in
`docs/parity/CLEANUP.md`.

## 9. Release readiness, user publish and production verification

Do not offer Publish while implementation or required independent
verification is blocked. Keep `PUBLISH.md` honest.

Once ready, record the exact clean release revision and run:

- Exact-candidate build and bundle budget with unchanged acceptance caps.
- Registered `task302-build`, boot-migration safety and migration drift.
- `bash scripts/pre-publish-gate.sh` locally with the app running; retain
  its step logs.
- Review `0047_resource_kind_and_contact.sql`: journaled and idempotent.
- Confirm production contact variant unset and required router credential
  available via secret tooling without reading/exposing its value.
- Check the final public bundle for credential leakage using secure tooling;
  do not dump secrets or entire suspect matches into evidence.
- Serve the built output locally in production mode against DEVELOPMENT
  data only; verify `/`, `/api/health`, `/sitemap.xml` and
  `/category/encoding-codecs`, plus local production-mode Lighthouse.
- Confirm a retained rollback deployment and compatibility of its code
  with the new additive schema.

Publishing applies schema changes before boot migrations may run again:
all migration DDL must be guarded. Deployment build gates must not connect
to production DB or boot a server. Never set `REPLIT_DEPLOYMENT=1` in the
workspace. Preserve publishing-only image trimming; the prior 8 GiB failure
is not permission to erase workspace evidence. Do not repeat a firewall
403 unchanged or raise budgets to bypass a failed publish.

Offer the actual Replit Publish action and wait for the user. Never use
hand-written deployment scripts or claim publication while waiting.

After the user publishes:

1. Obtain the real URL, deployment ID/time and logs from deployment tooling.
   Bind it to the tested source revision; inspect `/api/version` if available
   and do not accept “unknown” as proof of exact-candidate identity.
2. Compare production against the retained PRE-WORK production snapshot,
   covering every inventoried public route and endpoint. Use supported
   comparator flags (currently `--baseline` and `--against`; inspect first).
   Require status/redirect, title/canonical/robots, preserved testids,
   resource/category/tag counts and JSON-LD types. List all differences;
   do not blanket-approve selector removals or environment changes.
3. Use the same built-in tester for read-only production visitor checks:
   search, category page 2, submit protection, 404, all contact options off.
4. Verify fonts, the canonical request, no console CSP violations including
   the platform widget, and all 50 guest theme combinations persisting.
5. Record production Lighthouse mobile home/category/resource and axe home
   at 375/1440.
6. Inspect deployment boot/migration output and errors; confirm the image
   actually published successfully.
7. Use read-only production database tooling to verify the resource kind
   column, contact table and absence of QA residue. Inspect actual schema
   names before queries; never invent columns or write cleanup on prod.
8. Verify the required admin AI health using the current legitimate
   authentication path. Trace middleware as well as the route; do not add
   an auth bypass or create a production test admin. If authorized read-only
   verification is unavailable, mark it UNVERIFIED.

Sanitize every retained transcript: no cookies, bearer tokens, audit keys,
connection strings, raw provider errors or environment dumps. Store only
allowlisted output fields and useful non-secret log excerpts.

Any production failure requires an explicit release decision: hold,
request rollback through Replit, or hand off a scoped fix. Never hot-patch
production. A code rollback does not reverse database migrations.

Only set `docs/parity/STATUS.md` to “published and verified” after the
actual deployment and all required checks pass.

## 10. Completion deliverables

Maintain—not replace with invented summaries:

- `docs/parity/DESIGN-SYNC.md`: source provenance and differences.
- `docs/parity/IMPLEMENTATION.md`: requirement-to-real-product ledger.
- `docs/parity/SCREENS.md`: complete route/state/counterpart inventory.
- `docs/parity/REPORT.md`: honest per-cell image evidence and denominators.
- `docs/parity/DS-AUDIT.md`: per-system 11-stage verdicts.
- `docs/parity/CLICKTHROUGH.md`: actual executed browser steps and outcomes.
- `docs/parity/CLEANUP.md`: deletions with reference evidence.
- `docs/CONTACT-VARIANTS.md`: all five alternatives, screenshots, tradeoffs.
- `docs/parity/PUBLISH.md`: readiness, user action, actual release result.
- Evidence directories with revision, role, viewport, description and
  unmodified provenance for each capture and check.

Keep implementation commits coherent. Preserve another worker's changes.
Do not claim completion from helper assurances alone.

The final response should state what now works, screens passing/eligible,
token-only coverage, system verdicts, axe/Lighthouse results, rebuilt
screens, remaining UNVERIFIED items and publication state. Keep it under
25 lines and link the detailed evidence.

Start by reading and reconciling the attached original sources, inspecting
the current running app, and completing the missing product work. Do not
ask me to restate the original requirements or approve ordinary steps
already authorized here.
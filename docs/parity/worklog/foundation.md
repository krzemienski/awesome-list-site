# Worklog — foundation (restore a green build and running app)

Task: restore a coherent, bootable, type-clean tree before any parity wave
starts. Starting point `22be4659` (a half-integrated parity snapshot); last
green commit `e519de14`. Evidence: `docs/parity/evidence/foundation/`.

## Starting state

- `npx tsc --noEmit --incremental false` → **37 errors**
  (`evidence/foundation/tsc-before.txt`).
- "Start application" workflow **FAILED**: Vite pre-transform error on the
  missing `@/styles/parity-pages.css` imported by
  `client/src/components/parity/parity-styles.ts`.
- `product-profile-browser` gate red: the canonical `awesome-list-site-ds/`
  had been restored to its archive state and no longer carried
  `data-product-profile` markers.
- A full copy of the `e519de14` tree was extracted to `/tmp/e519`
  (node_modules symlinked) so lint/integration baselines could be *measured*
  rather than guessed.

## Breakages and the choice made

| # | Breakage at `22be4659` | Choice | Why |
|---|---|---|---|
| 1 | `client/src/pages/Home.tsx` lost its import block; rendered through `HomePresentation` + `canonicalDataAdapter` | **Revert** to `e519de14` | Unmeasured parity rewrite; `parity-13` redoes the home with the pixel gate. |
| 2 | `parity-styles.ts` imported a stylesheet that was never committed | **Remove** `client/src/components/parity/*` (5 files) | Nothing else rendered them once the pages were restored; recoverable via `git show 22be4659:client/src/components/parity/<file>`. |
| 3 | `Terms.tsx`, `Privacy.tsx`, `CodeOfConduct.tsx` passed `titleTestId` to `SEOHead`, which does not declare it (no test reads it) | **Revert** the three pages | `grep titleTestId tests/` is empty, so the prop had no consumer. |
| 4 | `Settings.tsx`, `ThemeSettings.tsx` depended on `parity-settings/ParityPageHeader` + `parity-settings.css`, and `ParityPageHeader` dropped `data-testid="link-back-home"` (tablet-audit `back-link-size` FAIL) | **Revert** both pages, delete `client/src/components/parity-settings/*` | `parity-22` lists `parity-settings` as a directory it recreates token-only. |
| 5 | Shell rewrite: `MainLayout`, `AppHeader` (new `siteName` prop), `AppSidebar`, `ui/sidebar` (variable width, no 768–1023 force-collapse) | **Revert** all four to `e519de14`; re-add minimal variant-gated contact hooks to `MainLayout` | Tablet audit failed 6 cells against the new shell (below); `parity-07/08/09` own header/sidebar/footer with measurements. |
| 6 | Taxonomy/search pages (`Categories`, `Category`, `Subcategory`, `SubSubcategory`, `Search`, `TagLanding`, `Advanced`, `About`, `SubmitResource`, `not-found`) rendered through `ParityPage`/`ParityTaxonomyListing` | **Revert** to `e519de14` | Same reasoning as 1; each has its own wave task. |
| 7 | `ResourceDetail.tsx` imported `parity-styles` and used `parity-page` classes | **Trim**: drop the import/classes, keep the HEAD `ContactResourceAction` wrapper around Suggest Edit | Keeps the contact variants reachable without the parity styles. |
| 8 | `shared/schema.ts` lacked `resources.kind` and `contact_submissions`; migration `0047` existed but was unjournaled | **Complete**: schema mirrors the migration, journal idx 23 added, migration applied to the dev DB with `psql` (dev never runs the boot migrator) | Additive only; `migration-drift` and `task302-boot-safety` verify idempotence. |
| 9 | `server/config.ts` lacked `resource_kinds` / `contact` types; YAML had no defaults | **Complete**: types + defaults + YAML blocks; `contact.enabled` env-only (`CONTACT_ENABLED=true`) | See `assumptions/foundation.md` §2. |
| 10 | `server/routes/domains/contact.ts` read `config.contact.form_enabled`; `ContactRepository` not exported | **Complete**: `enabled`, export repo + purge helper from `server/repositories/index.ts`; router still **not mounted** | `parity-06` mounts it. |
| 11 | `dead-exports` red on speculative exports in `shared/resourceKinds.ts`, `shared/contact.ts`, `client/src/lib/contact.ts`, contact barrel | **Un-export** until a consumer exists; delete the barrel | Gate forbids exports without importers; see assumptions §4. |
| 12 | `palette-drift` red in `client/src/components/admin/admin-canonical.css` (raw `1px` hairlines, `999px` radius, phantom `--status-*` vars) | **Fix**: `var(--hairline-w)`, `var(--radius-pill)`, status literals tagged `DS-OK` | assumptions §6. |
| 13 | `product-profile-browser` inspected the canonical `awesome-list-site-ds/index.html` | **Retarget** gate at the design-system artifact; delete `scripts/generate-standalone-product-profile.mjs` + its npm script | assumptions §5; canonical dir stays archive-identical. |
| 14 | `ResourceCard.tsx` fallback literal missed the new `kind` column | **Complete**: `kind: null` | Type error only. |
| 15 | New lint errors in W0-owned files (`server/config.ts`, `shared/contact.ts`, `client/src/lib/contact.ts`, `contact-dialog.tsx`, `resourceKindPresentation.ts`, contact route) | **Fix** the semantics-preserving ones (`??` for `""` defaults, `interface` over `type`, `T[]`, `\p{Cc}` instead of a control-char class, typed validated body, `void` on the submit promise) | Leaves the file-level counts at or below the `e519de14` baseline. |

### Tablet-audit trace (why the shell was reverted)

Run against the `22be4659` shell: 6 FAILs, each traced to a HEAD change —

- `sidebar-collapsed@768`: HEAD kept the sidebar expanded at 768–1023
  (`ui/sidebar.tsx` dropped the force-collapse effect).
- `microtext-home@768`: HEAD `AppSidebar` rendered a 9px `+N` badge and 11px
  `└` text.
- `consent-footer-hittest@375`, `consent-shortpage-initial@1024x768`,
  `consent-shortpage-initial@1280x900`: HEAD's taller 4-column footer on
  `/not-found` pushed the consent banner over the footer links.
- `back-link-size`: `ParityPageHeader` dropped `data-testid="link-back-home"`
  on `/settings/theme`.

After the restores: `tablet-audit` PASS, `responsive-audit` PASS.

## What was kept from the snapshot

- Contact variant components (`client/src/components/contact/*`,
  `client/src/lib/contact.ts`), the `search-dialog.tsx` palette item (variant
  e) and the `ResourceDetail` `ContactResourceAction` wrapper. `MainLayout`
  lazy-loads `ContactFooter` (variants a/b/c) and `ContactDialogHost` (b/e)
  only when `VITE_CONTACT_VARIANT` is set; with it unset nothing renders or
  fetches, and the components stay reachable for the `dead-components` gate.
- The admin dashboard files, `server/lib/resourceKindPresentation.ts`, the
  contact backend, `docs/CONTACT-VARIANTS.md` (its description of the footer
  link / dialog host / palette item / resource action still matches the kept
  hooks).
- `client/index.html` Fraunces/JetBrains Mono preload links.
- `artifacts/awesome-video-design-system/*` (owned by `parity-20/21`), with
  the two 44px `min-height` rules changed to `var(--profile-control-height)`
  so the retargeted gate can read them.

## Gate results

Required list from the task plan; ✔ = exit 0 on the final tree.

| Gate | Result | Notes |
|---|---|---|
| `check` (tsc) | ✔ 0 errors | `evidence/foundation/tsc-after.txt` (empty output) |
| `lint` | baseline-equal | 5 167 tracked-file errors at `e519de14` (never green); on the final tree the only files above their baseline are the artifact's canonical ports (`CanonicalShowcase.tsx` 305, `DocsContent.tsx` 25, `CanonicalDocs.tsx` 6 — owned by `parity-20/21`) and two admin files (`AdminOverview.tsx` 7, `ResourceManager.tsx` 63→74 — owned by `parity-17/18/19`). All W0-owned files are at or below baseline. Method: `eslint . --format json` in the workspace and in `/tmp/e519`, compared per file over `git ls-files`. |
| `lint:css` | ✔ | |
| `test:unit` | ✔ 12 files / 260 tests | |
| `test:integration` | baseline-equal | 171 failed / 35 passed / 1 skipped on **both** trees (`tests/integration/api/*` are mock-era tests that predate Clerk and the real DB). The failing set differs by ±5 data-dependent cases between runs. Follow-up proposed. |
| `test:e2e` | baseline-equal | 344 tests over `chromium` + `Mobile Chrome`: **246 passed, 94 failed, 4 did not run** (`/tmp/gates/e2e-chromium.log`). Every failure is in a spec whose expectations were stale before `e519de14` and that `git diff e519de14 HEAD -- tests/e2e` does not touch: `admin-operations` (22/project — visits `/admin` unauthenticated, Clerk sign-in renders), `admin-users-audit` (1 — logs in without an `Origin` header → 403 same-origin), `browse-categories` (6) and `search` (13) — expect a "Back to all categories" button, `select-sort` on category pages, `card-category-*` ids and a "Search Resources" heading that exist in neither tree, `continue-learning` (1 — registers a user through the removed local `/api/auth/register`), `sidebar-ux` (4 — waits for visible `toggle-cat-*` at 768/375 where the sidebar is force-collapsed / a closed drawer, the behaviour the tablet-audit gate requires). Only Chromium binaries exist in `.cache/ms-playwright`; firefox / webkit / Mobile Safari projects cannot run here. |
| `migration-drift` | ✔ | |
| `task302-boot-safety` | ✔ | |
| `task302-build` | ✔ | |
| `openapi-drift` | ✔ | |
| `response-contract-drift` | ✔ | |
| `dead-components` | ✔ | no new pinned exceptions |
| `dead-exports` | ✔ | no new pinned exceptions |
| `root-script-drift` | ✔ | |
| `palette-drift` | ✔ | |
| `accent-drift` | ✔ | |
| `product-profile-browser` | ✔ | retargeted at the artifact (static part); the review round found that a single stylesheet-wide substring check would stay green if one of the artifact's two consumer rules regressed to a literal, so the gate now asserts each of the ten interactive selectors takes `min-height` from `var(--profile-control-height)` and that the stylesheet never restates the 44px floor. Mutation probe (literal swap ×2, selector dropped, declaration deleted → all FAIL; restored → PASS): `evidence/foundation/product-profile-mutation-probe.txt`. Browser part had been red since `86d0b996` (2026-09-08, before the last green commit) because that commit raised every profile's `--profile-control-height` to `2.75rem` for the 44px target floor without updating the gate's `/admin` expectation (`2.5rem`); the expectation now matches `shared/styles/product-profiles.css`. |
| `font-prepaint` | ✔ | |
| `ds-showcase` | ✔ | |
| `ds-button-sweep` | ✔ | |
| `responsive-audit` | ✔ | |
| `tablet-audit` | ✔ | |
| `print-audit` | ✔ | |
| `url-params-audit` | ✔ | first run failed one cell (`scrub-encoded:double-encoded`, banner not yet visible after boot); clean on rerun, `App.tsx`/`index.html` scrubber unchanged since `e519de14`. |
| `seo-snapshot` | ✔ | `--gate --parity` |

Also green (not in the required list): `theme-registry-types`,
`sticky-preview-audit`, `tag-route-audit`, `collections-audit`,
`prefs-revision-races`, `taxonomy-listing-parity`, `taxonomy-no-corpus-fetch`,
`pool-probe` (the four that were down while the server was broken),
`cache-headers`, `guest-recommendations`, `search-typos`, `auth-return-audit`
(see the note under "Flakes" below).

Known red, not required: `standalone-palette-drift` (89 at `e519de14`, 125
now; assumptions §7).

### Flakes seen during the run (each green on a single rerun)

- `url-params-audit` — `scrub-encoded:double-encoded` right after a server
  restart (the scrubbed-params banner had not painted yet).
- `auth-return-audit` — 29/30 then `audit:uncaught: Clerk recovery did not
  reach a session or new-password step` (the hosted recovery step after the
  `424242` test code timed out at 90s); the rerun passed all 30 in 51s.
- `test:integration` — the failing set moves by ±5 data-dependent names
  between runs while the totals stay at 171/35/1.

## Functional checks

- Browser (`evidence/foundation/*.jpg`): `/` hero + category grid + sidebar;
  `/category/encoding-codecs` header, subcategory filter, "Showing 1–24 of
  333"; `/resource/185020` detail with related resources; `/about`;
  `/admin` (audit-key auth) renders the operations dashboard with real counts
  and all 17 tabs activate (`aria-selected="true"`, non-empty panels). The only
  console messages are Clerk's dev-key notice and the Replit dev plugin's
  `data-replit-metadata` Fragment warning (dev-only tooling, not app code).
- API vs production (key-for-key, sorted keys): `/api/resources?limit=1`,
  `/api/resources/185020`, `/api/categories`,
  `/api/awesome-list/listing?level=category&slug=encoding-codecs` match
  https://awesome.video except for the additive `kind: null` field (allowed by
  the plan until the kind API task). Listing returns 24 items on both.
- `awesome-list-site-ds/` is byte-identical to the extracted archive
  (`diff -rq` empty) and the 26 `changedOrAdded` hashes in
  `docs/parity/source-sync.json` verify.

## Open items for the orchestrator (not proposed as follow-ups: W1 tasks already depend on this one)

1. `standalone-palette-drift` scope decision (assumptions §7) — belongs with
   the artifact tasks (`parity-20/21`) or the cleanup task (`parity-28`).
2. Legacy `tests/integration/api/*` suite (171 red, mock-era) and the six
   stale e2e specs listed above — quarantine or rewrite; natural home is the
   regression task (`parity-29`), which otherwise inherits a red baseline it
   cannot distinguish from real breakage.
3. `npm run lint` baseline (~5.2k) — either adopt a per-file ratchet in CI or
   accept the baseline explicitly; the admin lint regressions (`AdminOverview`,
   `ResourceManager`) go with the W3 admin tasks.

## Recovery pointers

Everything removed is one command away:
`git show 22be4659:client/src/components/parity/HomePresentation.tsx`,
`…/ParityPage.tsx`, `…/ParityTaxonomyListing.tsx`, `…/canonicalDataAdapter.ts`,
`…/parity-styles.ts`, `git show 22be4659:client/src/components/parity-settings/ParityPageHeader.tsx`,
`…/parity-settings.css`, `git show 22be4659:scripts/generate-standalone-product-profile.mjs`,
`git show 22be4659:client/src/components/contact/index.ts`.

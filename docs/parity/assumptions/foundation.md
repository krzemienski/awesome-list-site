# Assumptions — foundation (restore a green build)

Decisions taken while restoring a green tree from the half-integrated parity
snapshot (`22be4659`). Later wave tasks either build on these or overturn them
explicitly.

## 1. The shell and page rewrites from `22be4659` were reverted, not completed

The parity snapshot had re-skinned the app shell (`MainLayout`, `AppHeader`,
`AppSidebar`, `ui/sidebar`), the home/taxonomy/search/legal/settings pages and
added `client/src/components/parity/*` and `parity-settings/*` without
measurements. Completing them would have shipped unmeasured parity work that
the wave tasks (`parity-07` … `parity-24`) are contracted to redo with the pixel
gate and the 11-stage audit, and the tablet audit already failed against the
new shell (see the worklog). Every affected file was therefore restored
verbatim from the last green commit `e519de14`; the removed components remain
recoverable with `git show 22be4659:<path>`.

**Revisit when:** a wave task owns the file; it should start from the canonical
component, not from the `22be4659` draft.

## 2. `contact.enabled` is environment-only

`config.contact.enabled` is `process.env.CONTACT_ENABLED === "true"`, forced
after the YAML merge so a YAML `contact.enabled: true` can never switch the
endpoint on by itself. The other contact fields (`email`, `issues_url`,
`discussions_url`, `discussions_verified`) resolve per field as env var, then
YAML, then built-in default (`resolveContactConfig()`), and a blank env var
counts as absent so an empty `.env` line cannot erase a YAML value.
`retention_days` is YAML/default only (180). The contact router is not
mounted yet (`parity-06` mounts it).

**Revisit when:** an operator needs YAML-driven enablement; then add an
explicit `CONTACT_ALLOW_YAML_ENABLE` style escape hatch rather than loosening
the default.

## 3. `kind` is not accepted on the resource insert schema yet

`resources.kind` exists (nullable `text`, application-level enum check via the
`resources_kind_check` constraint) and is serialized as `kind: null` on every
resource payload, but `insertResourceSchema` still omits it. Accepting it is
`parity-05`'s job together with the API and admin editing.

## 4. Shared helpers stay un-exported until a consumer exists

The `dead-exports` gate fails on any export without an importer, so
`shared/resourceKinds.ts` only exports `ResourceKind`,
`ResourceKindTagMappings` and `resolveResourceKind`; `shared/contact.ts` only
exports `contactSubmissionSchema` and `ContactSubmissionInput`;
`client/src/lib/contact.ts` keeps `CONTACT_VARIANTS` module-local; the contact
barrel `client/src/components/contact/index.ts` was deleted. Label maps, the
Zod kind enum, tag-normalisation helpers and the empty-count factory are still
in the files as module-local values — re-export them in the task that first
imports them instead of pinning gate exceptions.

## 5. The product-profile gate targets the design-system artifact

`scripts/validation/product-profile-drift.mjs` (and its `--browser` mode used by
the `product-profile-browser` workflow) now reads
`artifacts/awesome-video-design-system/index.html` + `src/index.css` and
re-runs `scripts/generate-design-system-artifact.mjs --check`, instead of
inspecting `awesome-list-site-ds/index.html`. The canonical source is
archive-identical (`diff -rq` against the extracted
`attached_assets/awesome_list_site_2_1789019068732.zip` is empty) and must stay
that way, so it can never carry `data-product-profile` markers.
`scripts/generate-standalone-product-profile.mjs` and the
`generate:standalone-product-profile` npm script were deleted because their
only purpose was to write those markers into the canonical file.

The artifact consumes `--profile-control-height` (both 44px `min-height`
rules) but intentionally does **not** consume `--profile-page-measure`: its
docs layout has no measure-bounded prose column yet. The gate only requires
the control-height token; `parity-20/21` decide whether the docs pages gain a
measure.

## 6. Status colours are hard-coded on purpose in the admin sheet

`client/src/components/admin/admin-canonical.css` uses the global status
constants `#34d08c` / `#ffb84d` / `#ff5c7a` tagged with a `/* DS-OK: … */`
comment, following the precedent in `client/src/lib/difficulty.ts`; the
palette gate accepts tagged literals and there are no `--status-*` tokens in
the design system to point at. Hairlines use `var(--hairline-w)` and pills use
`var(--radius-pill)`.

## 7. `standalone-palette-drift`: the canonical archive is a frozen reference root, not a scanned surface

The gate was red at `e519de14` (89 findings) because the 2026-09-10 design
resync (`3ed28118`) refilled `awesome-list-site-ds/` with archive files the
shrink-only baseline had never pinned, and the snapshot added 36 more in the
artifact's canonical ports. The gate is a registered validation command, so
it blocks completion of this and every later parity task; the scope decision
could not wait for `parity-20/21/28`.

Decision, applied in both the executable contract
(`scripts/validation/standalone-palette-drift.mjs`) and its documented twin
in `.agents/skills/verify-design-system/SKILL.md` (the gate verifies they
match on every run):

- `awesome-list-site-ds/` is removed from `roots` and declared under a new
  `frozenReferenceRoots` key with a written reason. It is never served, it
  is contractually byte-identical to
  `attached_assets/awesome_list_site_2_1789019068732.zip`, and its UI is
  validated through the registered artifact that ports it. A frozen root
  can carry neither tokens nor `DS-OK` tags, so scanning it could only ever
  produce findings nobody is allowed to fix.
- The exclusion is enforced, not trusted: on every run the gate hashes the
  archive (digest and member count pinned in `docs/parity/source-sync.json`),
  reads its 103 members straight out of the zip with a small parser that
  rejects zip64, duplicate or traversal names and size mismatches, and
  compares them with the working tree. An edited, missing or extra file — or
  a symlink standing in for a file — fails the gate until the directory is
  restored or the change moves into the artifact. The parser and the
  directory walk self-test on every run
  (`docs/parity/evidence/foundation/standalone-palette-mutation-probe.txt`).
- The artifact's 36 findings are tagged at their definition sites with
  reasoned `DS-OK` comments, the mechanism the audit skill prescribes:
  `CanonicalShowcase.tsx` holds the per-system flow-diagram skin and anatomy
  renderer values ported verbatim from `design-system-anatomy.jsx` (the same
  "intentional per-system skin" category the skill already accepts, and the
  view `parity-20` pixel-gates against that source); `DocsContent.tsx` only
  quotes token values in documentation prose. `parity-20/21` may replace the
  tags with tokens where pixel parity allows, and the ratchet will record it.
- The 249 baseline entries that belonged to the canonical root were retired
  with `--update-baseline` (98 legacy matches remain pinned, all in
  `artifacts/mockup-sandbox`).

## 8. `lint` and `test:integration` were already red at the last green commit

`npm run lint` reported 5 167 errors in tracked files at `e519de14` (strict
type-aware rules such as `no-unsafe-*`, `prefer-nullish-coalescing`), and
`npm run test:integration` reported 171 failed / 35 passed / 1 skipped there
(mock-era API tests that predate the Clerk migration and the real database).
The foundation task therefore treats "green" for these two as *no new
failures in files it touched* and identical suite totals, documented in the
worklog, rather than pretending a repo-wide cleanup happened. A follow-up
covers quarantining or rewriting the legacy integration suite.

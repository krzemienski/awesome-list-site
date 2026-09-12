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
`discussions_url`, `discussions_verified`) come from `CONTACT_*` env vars with
YAML fallbacks. `retention_days` defaults to 180. The contact router is not
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

## 7. `standalone-palette-drift` is out of the required-green set and stays red

The gate scans `awesome-list-site-ds/` (89 literals at `e519de14`, untouchable
by contract) and, since the snapshot, the artifact's canonical ports
(`artifacts/awesome-video-design-system/src/canonical/CanonicalShowcase.tsx`,
`DocsContent.tsx`; +36). It cannot be green without a scope decision (exclude
the canonical root, or port the literals to tokens inside the artifact). It is
not in the foundation task's required list; `parity-20/21` own the artifact
files, and the scope decision is raised as a follow-up.

## 8. `lint` and `test:integration` were already red at the last green commit

`npm run lint` reported 5 167 errors in tracked files at `e519de14` (strict
type-aware rules such as `no-unsafe-*`, `prefer-nullish-coalescing`), and
`npm run test:integration` reported 171 failed / 35 passed / 1 skipped there
(mock-era API tests that predate the Clerk migration and the real database).
The foundation task therefore treats "green" for these two as *no new
failures in files it touched* and identical suite totals, documented in the
worklog, rather than pretending a repo-wide cleanup happened. A follow-up
covers quarantining or rewriting the legacy integration suite.

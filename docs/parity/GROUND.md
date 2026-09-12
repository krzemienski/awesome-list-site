# Grounding evidence

## Source and surface accounting

- The supplied archive SHA-256 and sync record are in
  [DESIGN-SYNC.md](DESIGN-SYNC.md) / `source-sync.json`; the complete 103-entry
  archive review ledger is committed as [ARCHIVE-REVIEW.md](ARCHIVE-REVIEW.md)
  (its original under `.local/tasks/` is gitignored and does not survive a merge).
- [SCREENS.md](SCREENS.md) and `tests/parity/inventory.json` hold the screen and
  state inventory the harness consumes.
- The approved reference is the newer modular Index/Curated generation.
  Historical standalone applications and screenshot provenance are retained.

## Real development catalog

On 2026-09-10, `GET /api/awesome-list` from the existing main application
listener (port 5000) returned a populated catalog with title `Awesome Video`,
nine categories and **1,816 unique resources**. The top-level resource array
and taxonomy-nested arrays represent the same resources, not separate totals.
No database import, seed, migration, or write was performed.

[Home grounding screenshot](evidence/ground-home.jpg) shows the rendered
“Explore 9 categories with 1,816 curated resources” heading and real category
teasers. This 1280×720 JPEG establishes rendering only; it is not a pixel-gate PNG.
The existing consent banner is visible. No design-parity verdict is implied.

## Registered artifact identity

The Replit artifact registry was queried on 2026-09-10 and returned:

| Artifact ID | Kind | Directory |
|---|---|---|
| `artifacts/awesome-video-design-system` | design-system | `artifacts/awesome-video-design-system` |
| `artifacts/mockup-sandbox` | design | `artifacts/mockup-sandbox` |

The existing managed workflow `artifacts/awesome-video-design-system: web`
serves port 20928. The main app's existing `Start application` serves port 5000.
The default proxied development hostname currently returns the artifact's
HTML even for `/api/awesome-list`; it must not be mistaken for the main API
or used as proof that the catalog is empty. Independent captures explicitly
select the verified listener for each target.

No artifact was created, unregistered, replaced, or removed. The mockup sandbox
remains referenced and retained.

## Remaining Phase 0 evidence

Real-content alignment for the reference side is implemented by the read-only
adapter inside `tests/parity/runner.mjs` (public, credential-free API snapshot
bound onto the reference's data globals; no interception of application
responses). State/content limitations must stay explicit in baseline rows,
never filled with prototype data or hidden by screenshot masks.

## Required-gate history on the synced tree

At `22be4659`, after the archive files were copied into `awesome-list-site-ds/`
(the same directory the harness serves as the reference),
`validate:standalone-palette-drift` failed with 125 findings (raw rgb/hex/radii/
font literals in `Awesome.Video - Standalone.html`, `SKILL-verify-design-system.md`,
`REPLIT-REMEDIATION-PROMPT.md`, `app.jsx`, and untagged literals in the
artifact's `CanonicalShowcase.tsx`) and `validate:product-profiles` hard-failed
because the archive `index.html` declares no `data-product-profile`. Both had
passed on the pre-sync tree. Editing those files to satisfy the gates would have
rewritten the reference; the foundation wave instead froze the canonical root
out of the palette scan (re-verified against the pinned archive on every run)
and retargeted the product-profile gate at the design-system artifact. See
`worklog/foundation.md`; both gates and `tsc` pass at `98f1b0cc`.

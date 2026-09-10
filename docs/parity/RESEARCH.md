# Capability research and evidence limits

## R1 — Maintained solutions

Research is scoped to the baseline harness. Research for contact delivery, Discussions, and later database/UI implementation must be completed before those capabilities are implemented.

| Candidate | Fitness and documentation | Maintenance/license evidence | Decision |
|---|---|---|---|
| Pixelmatch **7.1.0** | Direct raw-RGBA comparator gives the explicitly mandated `threshold: 0.1`, differing-pixel count, and custom immutable report layout | Official repository and npm metadata reviewed; selected package reports ISC; exact version pinned | Selected: satisfies the user's specified metric without replacing existing browser tooling |
| Existing Playwright screenshot assertions | Official screenshot documentation describes stable captures, snapshot expectations, and pixel limits | Existing installed Playwright; Apache-2.0 metadata | Retain Playwright for real-browser capture, not expected-snapshot replacement: this task requires independently rendered reference images and separate immutable runs |
| ODiff | Official project offers fast native image comparison and Node API, useful for large-image throughput | Active official repository reviewed; MIT license in its README | Rejected here: another native dependency and comparator semantics do not satisfy the explicit Pixelmatch requirement |

Three candidates are sufficient because the comparator is explicitly prescribed; this is not an open-ended tool replacement. Existing `sharp` handles PNG decoding/encoding. A briefly added direct `pngjs` declaration was removed when the finished harness used existing `sharp`; it is not an additional direct project dependency.

Official sources reviewed on 2026-09-10:

- https://github.com/mapbox/pixelmatch
- https://www.npmjs.com/package/pixelmatch — version/license also verified through npm registry metadata
- https://playwright.dev/docs/test-snapshots
- https://github.com/dmtrKovalenko/odiff

The Pixelmatch repository's current branch can evolve beyond the installed version. Reproducible comparisons use the pinned package, not whichever algorithm a later README describes.

### Security information

The package operation's automatic audit and a subsequent `npm audit --json` reported **28 root-lockfile findings: 13 moderate, 14 high, 1 critical**. Pixelmatch was not listed as an affected package in that report. This is not a security-clean verdict. No blanket `audit fix`, dependency replacement, or unrelated remediation was performed. Review the concrete findings before a release-readiness claim; existing security findings must not be hidden behind a successful install.

## R2 — Patterns and rejected alternatives

- **Reference provenance:** compare all original archive entries and retain older standalone generations as historical sources. Reject copying a stale embedded bundle over newer modular source.
- **Independent captures:** run the actual registered app and artifact independently from a confined, ephemeral reference HTTP server. Reject using app screenshots as expected images or substituting a mockup for the artifact.
- **Design-only real-data adapter:** bind approved catalog/navigation responses to the source presentation before render. Do not modify production responses, mock APIs, fake identities, or replace app data with demonstrations. Hash snapshots and source inputs; verify actual rendered identity/order/count alignment.
- **Whole-image comparison:** no resizing or cropping. Unequal image dimensions fail. A union canvas may retain all pixels, but claims about unmatched-pixel counts require explicit counting rather than assuming transparent padding always differs.
- **Immutable runs:** stage under `/tmp` while browsers run to avoid Vite reloads; copy completed evidence afterward. Preserve baseline runs separately. Bind reports to source revision and dirty-file fingerprints.
- **Database changes:** use the existing migration system, additive nullable/default-off semantics, and idempotent DDL. Reject replacing the database, hand-dropping unjournaled SQL, destructive backfills, or imports solely to manufacture screenshot content.
- **Integration:** reuse existing authorized facilities only after confirming real capabilities and destinations. Reject fake delivery success or a new unapproved CMS.

## R3 — Detected version and API boundaries

The initial inspected installed versions include React 18.3.1, Vite 5.4.21, TypeScript 5.6.3, Express 4.22.2, Drizzle ORM 0.39.3, Zod 4.4.3, Clerk React 6.14.1, Clerk Express 2.1.55, and TanStack Query 5.101.2. See `inspection/initial-dependencies.json` for metadata and declared ranges.

The root `playwright` implementation is **1.61.1**, while `@playwright/test` is **1.60.0**. Do not describe those as one identical pinned version. Browser captures must report `browser.version()` and the actual executable. The cached Chromium directory is a discovery result, not a promise that future environments have the same cache.

Baseline code uses existing Playwright `newContext`, real navigation/actions, screenshot capture, and reduced-motion settings. The official screenshot documentation informs this workflow; exact installed module versions are recorded separately. Future edits to auth, schema, forms, or shared theme APIs require their own installed-version documentation review before implementation.

## R4 — Security, privacy, and validation mapping

| Boundary | Implementation constraint | Required real verification |
|---|---|---|
| Clerk sign-in and return routes | Preserve real sessions and authorized application identity | Real sign-in/return flow; anonymous/admin separation |
| Admin mutations | Existing authorization, audit behavior, confirmations and inline errors | Authorized throwaway data, visible persisted result, cancellation and cleanup |
| Contact | Default-off endpoint and client, independent server flag, validation and rate limiting | Disabled/invalid configurations, abuse rejection, actual delivery or persistence |
| Personal data | No credentials/cookies/private identities in reports; scoped authorized capture only | Inspect evidence and logs before persisting/sharing |
| Analytics | Preserve opt-in and teardown behavior | No vendor traffic before consent; unchanged events for affected actions |
| Database | Additive, idempotent, backward-compatible migration and serializers | Existing real migration/contract gates and net-zero action verification |

No compliance certification or legal obligation is inferred merely from adding a contact form.

## R5 — Code and prior context

Primary source ownership and symbol-level findings are retained in `inspection/pages.md`, `admin.md`, `shell.md`, `foundations.md`, and `infrastructure.md`; file-read assertions and current hashes are in `FILE-READ-MANIFEST.json`.

Relevant prior project lessons applied: distinguish approved resources from published journeys; preserve public serializer choke points and source-of-truth navigation counts; avoid stale API interfaces and path-only query comparisons; restart a non-watching server after server changes; require genuine client readiness rather than crawler prerender; stage browser evidence outside the watched workspace; preserve idempotent migration safety and public/auth data boundaries.

These are implementation constraints, not claims that current or future functionality has already passed.
# Task549 — GitHub, link health, and digest operations parity

## Scope

Updated only the three operations panels and their page-scoped stylesheet:

- `client/src/components/admin/GitHubSyncPanel.tsx`
- `client/src/components/admin/LinkHealthDashboard.tsx`
- `client/src/components/admin/DigestQueueHealth.tsx`
- `client/src/styles/pages/admin-ops-github-links.css`

The frozen reference was `awesome-list-site-ds/admin.jsx` (`AdminGitHub` and
`AdminLinkHealth`), with the token, table, card, density, and status guidance
from `artifacts/awesome-video-design-system/src/canonical/DocsContent.tsx`.

## Changes

- Added the canonical GitHub repository card and compact Pull / Sync now action
  row while retaining the existing repository validation and confirmation flow.
- Made Sync Status an always-present card and retained queue progress, failed
  job details, and truthful failed import/export badges.
- Replaced the history stack with a real responsive table. History rows remain
  live API data and failed rows retain their red status and error detail.
- Added canonical live link-health status cards and a separate flagged-for-review
  table using the shared `Stat`, `StatusChip`, and `TableShell` primitives. The
  existing scan lifecycle, polling, confirmation, filters, counters, trend
  chart, scope note, and problem-links table remain as residual sections.
  Flagged rows remain in the residual problem table as well so broken,
  DNS-failure, and suspect filters keep their original behavior; the canonical
  table is a focused review view rather than a replacement data source.
- Refactored the GitHub history table and status chips, plus digest summary
  stats, to use the shared operations primitives.
- Kept digest health aggregate-only: transport availability, queue counts,
  failure codes, and queue age are shown without message contents, recipients,
  user data, or secret tokens.
- Added token-driven, page-scoped styling; `AdminDashboard` and shared admin
  CSS were not edited.

## Test-id contract

The before and after inventories are stored beside this worklog:

- `testid-inventory-before.txt`
- `testid-inventory-after.txt`

No existing test id was removed or renamed. No mutation, browser, workflow, or
live scan was run.

## Targeted checks

- `npx eslint client/src/components/admin/GitHubSyncPanel.tsx client/src/components/admin/LinkHealthDashboard.tsx client/src/components/admin/DigestQueueHealth.tsx`
  reached the target files; the repository retains pre-existing baseline
  lint findings in these files (unsafe API response typing and nullish/style
  rules). The new DigestQueueHealth aggregate reducer is typed and clean.
- `npx eslint client/src/components/admin/DigestQueueHealth.tsx` passed.
- `npx stylelint client/src/styles/pages/admin-ops-github-links.css` passed.
- `npx tsc --noEmit --pretty false --incremental false` passed after the shared
  admin operations primitives and their sibling panels were present.
# awesome.video verification map

The maintained source for verifying awesome.video's user-facing behaviour. Read the index, then use the matching feature file as the recipe. A proof that drives one convenient entry point is incomplete when the feature file lists others.

## Baseline preconditions

- A server launched per `../SKILL.md` Launch on a local DB cloned from `awesome_waves`, and the Doctor checks passing.
- A fresh `isolatedContext` per role: `<run>-guest` and, when needed, `<run>-admin` (Clerk test account, `role:"admin"` confirmed via `/api/auth/user`).
- Consent decided before clicking near the bottom of a page.
- Every journey runs at 1440×900, 820×1180 and 390×844 unless the feature file narrows it.

## Driving conventions

- Prefer `data-testid` and ARIA names over CSS selectors or positions. Take a fresh snapshot after every navigation and after hydration.
- Wait for `#ssr-seo-hold` to be gone, then for page text. Never wait for network idle.
- Mutations happen on a throwaway clone. Restore or note any data you changed.
- Never write into the repo's watched tree while a page is open.

## Proof and skip reporting

- Capture the user action and the resulting state, then the state after a reload.
- UI proof: the snapshot excerpt or screenshot with the URL visible in the record.
- Side-effect proof: the network request and response, or a `psql` SELECT on your DB.
- Record the feature ID, entry point and width with every artifact, under `.local/verify-evidence/<run-id>/`.
- Report an unreachable path with the attempted action and the unmet precondition. Never report a skipped entry point as verified through another one.

## Feature entry contract

Each feature file starts with an H1 and one paragraph on the user-visible behaviour, then exactly four H2 sections in this order: `Sub-features`, `How to get to it (user POV)`, `Driving it with chrome-devtools MCP`, `Gotchas`. Keep implementation detail out; name user paths, stable handles, required state and observable proof.

## Features

- [Browse the catalog](./browse-catalog.md) covers home, category and subcategory listings, the sidebar and drawer, and counts that must agree.
- [Resource page](./resource-page.md) covers the detail page, its primary link, related and onward links, report and suggest edit.
- [Search](./search.md) covers the ⌘K palette, `/` key, the header pill and the `/search` page.
- [Bookmarks](./bookmarks.md) covers guest saves on this device, member bookmarks and the merge on sign-in.
- [Admin researcher](./admin-researcher.md) covers the admin sign-in, the Researcher tab launch, a live run and reviewing discoveries.
- [Analytics and consent](./analytics-consent.md) covers the consent banner, vendor requests after consent and admin suppression.
- [Admin GitHub import](./admin-github-import.md) covers the synchronous dry run, counts before and after it, and the queued import's refusal of dry runs.

Full inventories for audits (every route, control and endpoint): `/Users/nick/Desktop/awesome-list-site/.local/state/inventory-admin-endpoints.md` and `inventory-public-member.md` when present.

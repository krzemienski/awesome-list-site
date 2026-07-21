# Gotchas & False-Positive Traps

Read this BEFORE filing a finding (auditor) and BEFORE reproducing one (fixer). Five audit-remediation runs (16–20) produced this list; each entry has burned at least one run.

## False positives — do NOT file these as bugs

| Observation | Reality |
|---|---|
| Outbound link times out from curl/datacenter IP | Bot-block, not a dead link. Only DNS-fail / refused / 404-410 / SSL errors count as dead. Verify via web search. |
| curl with default UA gets 403/blocked on the site itself | Prod WAF/bot-block on curl UAs — use a browser UA or Playwright. |
| Radix tab bar: all tabs except one have `tabindex="-1"` | Correct roving-tabindex pattern. Test: Tab reaches tablist, focus forwards to active tab, ArrowRight moves. |
| Raw `<button>` elements not using DS `.btn` class | shadcn bridge is the DS implementation (see replit.md MR-DS-13). Audit tokens, not class names. |
| Hardcoded hex colors in recharts components | Intentional (`/* DS-OK */`) — recharts can't read CSS vars from prop strings. Palette source of truth: `client/src/lib/charts/palette.ts`. |
| Users CSV export masks emails | PII policy, by design. |
| Resource slugs/URLs not renamed after title fixes | Slug stability is by design (inbound links, SEO). |
| `GAESA` cookie, edge cacheability quirks, OIDC popup Cloudflare page | Platform-level (Replit/Google front-end); app cannot change these. |
| Login/global rate limiters reset unexpectedly | Per-instance in-memory under autoscale — known journaled caveat, not a regression. |
| A "published" resource count of 0 | Public resources use status **"approved"**; journeys use "published". |
| External audit report says route/count X doesn't match | ~1/3 of external findings historically don't reproduce (stale assumptions, e.g. a Next.js architecture that doesn't exist). Reproduce against the live app first. |

## Architecture traps (things that LOOK like one bug but are another)

- **Scroll jump when a dropdown/dialog opens** → check `html, body { height:100% }` style rules. Radix scroll-lock sets `overflow:hidden` on body; if body height is viewport-capped, the scroll range collapses and scrollY snaps to 0. Correct form: `html{height:100%} body{min-height:100%}`.
- **A page crashes only for certain rows/routes** → a short-circuited ref (`a && expr`) that only evaluates for matching rows. Check prop TYPE vs destructure, not the route.
- **Fix verified green but UI still broken** → you fixed an endpoint the UI never reads (e.g., filter tags are built client-side). Always re-verify at the rendered UI, same viewport + auth state as the report.
- **React key warnings + `/path/undefined` navigation** → hand-typed client interface diverged from the real API payload. tsc cannot catch this.
- **Query returns list data where item expected** → default TanStack fetcher only uses `queryKey[0]` as the URL; param'd fetches need the array-key or a custom queryFn.
- **wouter `useLocation()` has no query string** — URL-sync logic must compare `window.location.pathname + search`.
- **Drizzle: second `.where()` silently REPLACES the first** — always combine into one `.where(and(...))`.
- **Deleting a resource 500s** → child FKs without ON DELETE (resource_edits, research_discoveries.created_resource_id) need manual cleanup + audit-log-before-delete.
- **Bulk dedup deletes cascade silently** into journey_steps/bookmarks/favorites — journal row CONTENTS before delete; repoint to survivor.
- **RHF `formState.isDirty` read only inside a handler** is stale forever — must be read during render to subscribe.
- **Toast dropped after `window.location.href` nav** — full-page nav tears down the toast store; use a one-shot `?param` and greet at the destination.
- **LLM JSON truncated mid-string** masked by catch→fallback — slice outermost braces, assert on expected fields, not just 200s.

## Environment / process traps

- **Dev server does NOT hot-reload server code** (tsx without --watch). Restart the "Start application" workflow after every server edit before API-testing.
- **Prod DB is not agent-writable.** All prod data fixes go through the live admin API via idempotent scripts (`scripts/runNN-*-prod.ts` pattern), validated end-to-end against dev via the same code path first.
- **Code fixes are dev-only until republish.** Keep a journal of what prod is missing; after republish, re-verify each shipped fix live on prod.
- **Admin login lockout is 15 minutes** after repeated failures — get the password right the first time (dev: ADMIN_PASSWORD secret; prod: same, synced at boot).
- **`/tmp` is wiped on environment restart/republish** — copy evidence JSONs into `evidence/runNN/` immediately after each probe.
- **Repo file writes during live Playwright runs trigger Vite reload** → ERR_ABORTED flakes. Stage outputs in /tmp, `cp` afterward.
- **Programmatic `.focus()` + getComputedStyle lies** about focus/hover styles (transition mid-value). Verify CSS states with a real click/hover + screenshot.
- **Origin header required on prod mutations** (CSRF check) — curl POSTs need `-H "Origin: https://awesome.video"`.
- **Publish + boot migrator both apply schema DDL** — every migration must be idempotent or publish loops on 42P07.
- **QA teardown must be NET-ZERO**: sweep users `email LIKE '__qa_test_%'` (they accrue across sessions), delete their resource_edits, NULL non-cascade FKs, remove probe resources. External auditors leave their own `qa-*` residue — do not delete accounts you did not create.
- **Harness tab-sweeps must assert the panel actually activated** (aria-selected/data-state) — byte-identical dumps across tabs mean every cell scanned the default panel.

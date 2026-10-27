# C6-AX-021 fix and verification

## Scope and source

- Isolated clone: `/tmp/awesome-c6-ax021-3QyZeQ`.
- Base: `520d6778369bc7ce495204cfcacc7e0533f941cc` (`origin/main` at assignment).
- Integration update: merged `origin/main` at `e06d9c4537561ea19eeabc70639860cb42f08be3` into the fix branch, preserving all changelog entries. This is a branch synchronization, not a merge of PR #106 into main.
- Branch: `fix/c6-ax021-admin-stats-offline`.
- Only initial admin-stats state and missing-value presentation changed. No API, analytics, authentication, schema, global query retry/network policy, or `AdminOverview` changes.
- TanStack Query's initial offline request is **paused**: no data, no error, and `isLoading=false`. The dashboard previously fell through into the zero-resource masthead and indefinitely pending overview. The hook now exposes the role-masked pause state; before rendering stats or activity, the dashboard reuses `OfflinePageState` for the initial paused/no-data case. Its existing focusable Retry reports a still-offline attempt and lets Query resume on reconnect. Missing values render a dash/no count; real numeric zero still formats as `0`.
- The normal loading state is now a busy status region so the existing recovery-focus handoff waits for the loaded dashboard. The existing non-offline initial failure Retry also registers that handoff. These are source changes, not live-proven behavior.
- Review follow-up: while categories are pending and actively fetching, the Resources card retains its neutral `across — categories` placeholder. Error/paused states report unavailable; a measured zero remains `across 0 categories`. This copy change is code-checked, not browser-proven.

## Exact exercised checks

| Command | Exit | Scope |
| --- | --- | --- |
| `npm ci --ignore-scripts --no-audit --no-fund` | 0 | Dependencies from the pinned clone lockfile. |
| `./node_modules/.bin/tsc --noEmit` | 0 | Final source, invoked directly and unpiped. No compiler output. |
| `npm run build` | 0 | Final source, invoked directly and unpiped. Client Vite, SSR Vite, and Express esbuild all completed. See `build-output.txt` and `checks.json`. |
| `npm run dev` with local isolated environment | ready | `NODE_ENV=development`, local Postgres, port 5071, `DISABLE_BACKGROUND_JOBS=1`, `ENABLE_AUTO_SEED=false`. Runtime reported background jobs disabled. No migrations, seeds, or paid AI jobs triggered. |

The build emitted dependency annotation warnings for `zod` and an esbuild bundle-size notice; these did not change the zero exit. No tests, mocks, validation scripts/harnesses, lint, or reviewer panels were run.

Typecheck and build were rerun, both direct/unpiped with exit 0, after the `e06d9c45` integration and category-loading copy change. `build-output.txt` contains this latest build. The retained browser captures below precede that integration and remain authentication-boundary evidence only.

## Auth prerequisite and all-width captures

**Authenticated admin behavior is BLOCKED/UNVERIFIED, not PASS.** The parent explicitly prohibited reusing production cookies or production session signing configuration, altering/bypassing auth, and obtaining new credentials. No approved local owner session exists. The already-configured development Clerk instance loaded successfully but had **no signed-in user**. No sign-in form or OAuth provider was submitted. Direct `/admin` navigation returned a real 302 to `/sign-in?redirect_url=%2Fadmin` at each width. No `/api/admin/stats` or activity UI mounted.

These captures prove the prerequisite boundary only; they do not prove AX-021 fixed in the browser:

| Viewport | Screenshot | Accessibility | Focus/network state | Observed |
| --- | --- | --- | --- | --- |
| 1440×900, desktop, DPR 1 | `auth-blocked-1440.png` | `auth-blocked-1440-snapshot.txt` | `auth-blocked-1440-state.json`, `auth-blocked-1440-network.json` | Real development sign-in; first Tab reached Skip to main content. |
| 820×1180, touch, DPR 1 | `auth-blocked-820-touch.png` | `auth-blocked-820-touch-snapshot.txt` | `auth-blocked-820-touch-state.json`, `auth-blocked-820-touch-network.json` | Real development sign-in; touch=1 and coarse=true. |
| 390×844, touch, DPR 1 | `auth-blocked-390-touch.png` | `auth-blocked-390-touch-snapshot.txt` | `auth-blocked-390-touch-state.json`, `auth-blocked-390-touch-network.json` | Real development sign-in; touch=1 and coarse=true; first Tab reached Skip. |

All three retained screenshots were personally opened. Each shows the actual development-mode Welcome back form, not an operations dashboard. No auth-guard screenshot is promoted to a dashboard visual or functional PASS. `local-console.txt` records the development-key warning; `local-errors.txt` is the captured empty page-error output. Network evidence retains request URLs/methods/statuses/redirects only, not headers or credential query strings. Browser and network state remained online.

Capture tools: named standalone agent-browser session; direct browser CDP viewport/touch and screenshot capture. Chrome DevTools MCP refused writes to the isolated clone outside workspace roots; a separate real local browser session wrote the captures instead. OMP's initial viewport attempt did not report the requested CSS width and a later tab detached; neither was used as retained evidence. An agent-browser device+viewport combination reset touch, so its non-touch tablet artifacts were discarded and replaced by the explicitly measured CDP touch captures. No response stubs or production auth material were used.

## Remaining UNVERIFIED

At **1440, 820 touch, and 390 touch**, all of these remain unexercised:

1. Initial offline stats unavailable state without invented zero/category counts or indefinitely loading activity.
2. Keyboard focusability and visible feedback of the stats Retry while still offline.
3. Reconnect/Retry restoring real totals and activity, including recovery focus.
4. Genuine measured-zero dashboard versus unavailable dashboard (no safely available authenticated empty dashboard was used).
5. Normal populated/loading browser states and later polling failure retaining last-good stats.
6. Screen-reader speech and physical touch devices.

A future authorized run must use the real authenticated app, prime the lazy admin assets **without populating stats**, then exercise the initial offline/no-data transition. An app chunk-load error or warm stats cache is not a substitute. No deploy, PR merge into main, production mutation, production cookie import, or production secret reuse was performed.

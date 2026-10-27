---
name: verify
description: Prove awesome.video (React+Vite client, Express server, local Postgres, Clerk) still works and looks right for a real visitor, member or admin after a change. Drives the running app call by call with the chrome-devtools MCP browser at 1440×900, 820×1180 and 390×844, plus single curl reads. Use after any client, server or data change, before calling work done, and for audits. Never writes or runs test scripts.
---

# Verify awesome.video as its users

Owner rule (2026-10-11, commit b4040bfe): no validation scripts, test suites, Playwright/Node harnesses, pixel or perf gates, proof packets or reviewer panels. Proof means driving the real app in the browser tools, one call at a time, and reading real API responses with single `curl` requests. `npm run type-check` and `npm run lint` are allowed and are necessary, never sufficient. No mocks, stubs, `window.umami` fakes or test-mode bypasses.

A change is verified only when all three hold:
1. **It works.** The changed journey, driven as the user would, ends in the right state, including side effects (DB row, network request body) and a reload.
2. **Nothing near it broke.** Every journey in `references/regression-watchlist.md` §2 that touches the changed area still passes, plus its neighbours in `features/`.
3. **It looks right.** The page matches `references/visual-checklist.md` §1 at all three widths, with none of its §4 red flags.

Anything you did not drive is UNVERIFIED. Say so; never call it passing.

## Launch

Never use the DATABASE_URL from memory or `.env` (historically production Neon). Always pass a local database. `.env` must never be read, printed or copied; dotenv loads it.

```
# run with the Bash tool, run_in_background: true (nohup dies with the call)
cd <checkout> && BUILD_REVISION=$(git rev-parse HEAD) \
DOTENV_CONFIG_PATH=/Users/nick/Desktop/awesome-list-site/.env \
DATABASE_URL=postgresql://localhost:5432/<db> PORT=<port> NODE_ENV=development DISABLE_BACKGROUND_JOBS=1 \
ANTHROPIC_MODEL=cc/claude-opus-5 VITE_SITE_URL=https://awesome.video VITE_POSTHOG_HOST=https://us.i.posthog.com \
CONTACT_ENABLED=true VITE_CONTACT_VARIANT=b CONTACT_ISSUES_URL=https://github.com/krzemienski/awesome-video/issues \
VITE_AMPLITUDE_API_KEY=f5338474e281eac273d5ec975dd13c45 VITE_MIXPANEL_TOKEN=47cf526a041e2df05ad1ab433d96d8b2 \
VITE_POSTHOG_KEY=phc_S8h7za1M71TeH99lB7zbTeKuRqAR8tBk1D5caFwvUt8 \
env -u ANTHROPIC_BASE_URL -u ANTHROPIC_AUTH_TOKEN -u ANTHROPIC_API_KEY -u ANTHROPIC_DEFAULT_OPUS_MODEL -u ANTHROPIC_DEFAULT_SONNET_MODEL -u ANTHROPIC_DEFAULT_HAIKU_MODEL -u ANTHROPIC_DEFAULT_FABLE_MODEL \
ANTHROPIC_BASE_URL=https://router.hack.ski ANTHROPIC_DEFAULT_OPUS_MODEL=cc/claude-opus-5 ANTHROPIC_DEFAULT_SONNET_MODEL=cc/claude-sonnet-5 \
ANTHROPIC_DEFAULT_HAIKU_MODEL=cc/claude-haiku-4-5-20251001 ANTHROPIC_DEFAULT_FABLE_MODEL=cc/claude-fable-5 \
./node_modules/.bin/tsx server/index.ts > /tmp/aw-verify-<port>.log 2>&1
```

- **The agent shell's ANTHROPIC_* variables belong to the harness, not the app.** In Claude Code they point at a local proxy (`http://localhost:20219`) with the harness's own model ids, and dotenv never overrides a variable that is already set. Always `env -u` them as above. The app's router token comes only from `.env` (`ANTHROPIC_AUTH_TOKEN`, loaded by dotenv); every other value is passed explicitly from `.replit [userenv.shared]`. Never send the harness proxy's token to the router, and never point the app at the harness proxy.
- The VITE/CONTACT/ANTHROPIC values are the public `.replit [userenv.shared]` values. There is no `VITE_GA_MEASUREMENT_ID`, so GA4 is off locally.
- Ports: 5000 is macOS AirPlay. Main checkout 5001, worktrees 5002+. One port and one DB per checkout.
- Fresh DB: `createdb -h localhost -T awesome_waves <name>` (the template must have no open connections). `awesome_waves` is a local clone with migrations through 0057 and a Clerk test admin row. Dev never runs migrations; replay new `migrations/*.sql` on your clone with `psql -v ON_ERROR_STOP=1 -f` (they are idempotent).
- Install in a fresh checkout: `package-lock.json` points at Replit's internal registry. `sed -i '' 's#http://package-firewall.replit.internal/npm/#https://registry.npmjs.org/#g' package-lock.json && npm ci && git checkout package-lock.json`.
- Ready: the log prints `Serving on port <port>`, then `curl -s localhost:<port>/api/health/ready` returns `{"status":"ready"}`. Any Vite error exits the process; read the log.
- The server has no hot reload. Restart after any `server/**` or `shared/**` edit. Client edits hot-reload.
- Teardown: stop the background task you started (TaskStop), or kill the PID you recorded for the port. Never `pkill` by name; other agents run servers.

## Doctor

Run before driving, and whenever anything looks off. All read-only.

1. `curl -s localhost:$P/api/health` → `{"status":"ok"}`; `/api/health/ready` → `{"status":"ready"}`.
2. `curl -s localhost:$P/api/version` → the revision you launched (worktrees return `unknown` without `BUILD_REVISION`).
3. The port is yours: `PID=$(lsof -nP -iTCP:$P -sTCP:LISTEN -t); lsof -a -p $PID -d cwd -Fn` shows your checkout.
4. The DB is yours (the boot log never names it): after a `/api/health/ready`, `lsof -nP -a -p $PID -iTCP:5432` gives client ports; `psql -h localhost -d postgres -At -c "select datname from pg_stat_activity where client_port in (<ports>)"` names the DB. Anything not local is a stop.
5. `curl -s -o /dev/null -w "%{http_code} %{redirect_url}" localhost:$P/admin` → `302 …/sign-in?redirect_url=%2Fadmin`.
6. In the browser, `list_console_messages` has no `Invalid hook call` or "more than one copy of React". If it does, two dev instances share a `node_modules/.vite` cache: each checkout needs its own real `node_modules`.

## Production

For checks against `https://awesome.video`. Launch, Doctor and the seed notes do not apply.

- Clerk is a live instance there. The dev test account, its `424242` code and the `clerk` CLI do not work against it.
- Admin access is an `av_admin_session` cookie the owner authorizes for the run. It is a credential: it never goes into evidence, logs or reports.
- When the owner has authorized production admin work, the lead creates that session itself and never asks the owner to sign in: one `POST /api/auth/admin-login` with the Origin header, the body built from `.env` `OWNER_PASSWORD` into a mode-600 temp file that is deleted right after, the password never printed or logged. Save the cookie jar and a Cookie header file with mode 600 and give workers only their paths. The jar writes `av_admin_session` on a `#HttpOnly_` line; strip that prefix when building the header file or the cookie is silently left out. The session lasts 12 hours; re-create it before it lapses on a longer run.
- Workers never log in themselves: a 401 or a `/sign-in` redirect means they report BLOCKED. **Nobody signs out of the owner session or clicks "Sign out all devices"**: an owner sign-out revokes every owner session on the server, so it ends every other worker's session too. That rule overrides the Sign-out check in Drive for the owner account.
- Every `POST` and `DELETE` needs `-H 'Origin: https://awesome.video'`; the server rejects a cookie-bearing write without it.
- There is no production database access. Read state through the admin APIs, never `psql`.
- The visitor rule in `replit-deploy` step 7 (no sign-in, no writes) holds unless the owner authorizes otherwise for the run.

## Drive

Tools: chrome-devtools MCP (`new_page`, `navigate_page`, `emulate`, `take_snapshot`, `click`, `fill`, `type_text`, `press_key`, `hover`, `wait_for`, `evaluate_script`, `take_screenshot`, `list_network_requests`, `get_network_request`, `list_console_messages`, `performance_start_trace`). Load them with ToolSearch.

- **Your own context.** The browser is shared. Always `new_page {url, isolatedContext:"<run>-<role>"}` (separate contexts for guest and admin) and use only your pageIds. Never close pages you did not open. Cookies are not port-scoped, so contexts are the only isolation.
- **Widths.** `emulate {viewport:"1440x900x1"}`, `"820x1180x2,mobile,touch"`, `"390x844x3,mobile,touch"`, then reload: some layout is decided at mount.
- **Readiness.** Every page first shows the inert prerender overlay `#ssr-seo-hold`; clicks and snapshots hit it. Usable when `evaluate_script` of `() => ({hold: !!document.getElementById('ssr-seo-hold'), kids: document.getElementById('root').childElementCount})` returns `hold:false, kids>0`. Then `wait_for` page text, then take a fresh snapshot (uids change during hydration). Never wait for network idle.
- **Consent banner.** A fresh context shows it and it covers bottom buttons. Click `consent-decline` / `consent-accept`, or pass `initScript: "try{localStorage.setItem('analytics-consent','denied')}catch{}"` (use `'granted'` for analytics checks) on `navigate_page`. On the published site, denied consent does not stop the Replit (Umami) tracker, which is cookieless. A production sweep that is not testing analytics also sets `localStorage.setItem('umami.disabled','1')` in the same initScript, and its report gives the owner the QA time windows so the owner can discount that traffic.
- **Handles.** Prefer `data-testid`, ARIA names and route paths. The per-feature handles are in `features/` and `references/drive-recipe.md` §3.
- **Forms.** react-hook-form inputs lose `fill` when uids go stale; set them in one `evaluate_script` with the native value setter plus `input` and `blur` events, then click submit.
- **Admin sign-in (local).** On production, see Production instead. Agents cannot use the owner password (a secret). Use the Clerk dev test account: `/sign-in`, email `cf-audit+clerk_test@awesome.video`, choose the email code, type `424242` with `type_text` (not `fill`), also for any new-device step. Wait for the URL to leave `/sign-in` on its own, then `evaluate_script` `async()=>(await (await fetch('/api/auth/user')).json())` must show `role:"admin"`. The local row `user_3K1RqOtITAqqTqT62nRvvGGks9s` is admin in `awesome_waves` and its clones.
- **Sign-out.** A signed-out UI proves nothing about the session. Before signing out, keep the credential (session cookie or bearer token) the page used, outside evidence. After sign-out, replay it against a protected endpoint such as `/api/admin/stats` (not `/api/auth/user`, which answers 200 when signed out). A 200 is FAIL unless the owner accepts it. Sign-out and any other check that destroys a session run early in the sweep, from a second session, so the session the rest of the sweep uses survives.
- **Browser tool quirks.** agent-browser takes its session from `AGENT_BROWSER_SESSION=<name>` (a `--session` flag is an unknown command), and headless agent-browser never scrolls, so below-fold clicks miss silently: use a tall viewport, a DOM click or chrome-devtools. Radix menus and selects ignore a DOM `.click()`; click by snapshot uid. A fragment-only navigation (`#x`) does not reload the document. An `initScript` fetch wrapper may not run in an isolated context after `navigate_page`; check `typeof` first and read bodies with `list_network_requests` + `get_network_request`.
- **Never write inside the watched tree while a browser is open** (any repo write reloads every Vite page; only `.local`, `.cache`, `.agents`, `node_modules`, `dist`, logs are excluded). Finish the browser check, then edit.
- **Catalog GETs are cached 60 s.** After an admin write, check public freshness by soft-navigating in the same tab, or reload with `navigate_page {type:"reload", ignoreCache:true}`.
- **Paid actions.** Researcher launches, enrichment, `/api/health/ai?deep=1`, recommendations refresh and "Analyze with AI" spend real model tokens. Do them only when the task needs that proof, with small limits.

## Evidence

- Save evidence under `.local/verify-evidence/<run-id>/` in the checkout (git-excluded and outside Vite's watch). Screenshot `filePath` must be inside the workspace; `/tmp` is refused.
- For each claim record: width, URL, the action, what you saw (screenshot path or snapshot excerpt), and for side effects the request and response (`get_network_request`, `requestFilePath`/`responseFilePath` for big bodies) or a `psql -At -c "select …"` on your DB.
- Capture the action and the resulting state, then the state after a reload.
- Vendor analytics: Mixpanel `api-js.mixpanel.com/track` and Amplitude `/2/httpapi` bodies are gzipped; count Mixpanel by distinct `$insert_id` or wait 15 s before navigating. GA4 is off locally, and the Replit (Umami) tracker exists only on the published site; those are owner steps, not passes. Exclude same-origin `/src/lib/*.ts` URLs when counting vendor traffic.
- PostHog: posthog-js drops every event while `navigator.webdriver` is true (and on a `HeadlessChrome` user agent), so an automation browser sends nothing. An override of those in the test browser's `initScript` may prove what the app *emits*. Read the request bodies with `get_network_request`, never by patching `fetch` in the page, and report the result as "emitted". Ingestion and dashboards stay an owner step. `features/analytics-consent.md`, `references/drive-recipe.md` §4 and `references/regression-watchlist.md` §4 follow this rule.
- Before filing a bug, check `references/regression-watchlist.md` §4 and `references/visual-checklist.md` §5 for known false positives, and rerun once after a cold restart.
- Report each claim as PASS, FAIL or UNVERIFIED with its evidence path.

## Cleanup

- Stop the servers you started (TaskStop or the recorded PID); confirm the port is free.
- `close_page` only your pages.
- Drop only DB clones you created (`dropdb -h localhost <name>` after its server stops). Never drop `awesome_waves`.
- Throwaway users: delete the Clerk user first, wait 60–90 s, then the local rows in the FK order in `references/drive-recipe.md` §6. Never delete the shared Clerk test account.
- Rows created on production go into a `created-rows.md` ledger the moment each is created (id, title, status), never reconstructed at the end. A change that cannot be undone (a timestamp, a revision counter, a preference with no unset) goes in the ledger with its before and after values, and the report lists it.
- Production deletes are irreversible API calls. Delete only exact ids whose rows match a test signature (the run's title prefix, an `example.invalid` URL, the expected status), never ids found by substring search. When the list differs from what the user saw, show the full list and wait for approval. Immediately before each `DELETE`, read that row again by its id and save the full row as JSON under the evidence directory. If it no longer matches the test signature (title, URL or status changed, or it is gone), skip it and report it.
- Evidence under `.local/verify-evidence/` is never deleted by cleanup.

## Map

- `features/README.md`: the user-facing feature map; one file per feature with entry points, driving steps and the observable end state.
- `references/regression-watchlist.md`: 87 past breakages with re-check steps, the ranked "always re-check" list (§2), classes of break (§3), false positives (§4).
- `references/visual-checklist.md`: what correct looks like per width, read-only checks and their traps, red flags, visual false positives. §0 lists docs that disagree with the shipped CSS; trust the CSS.
- `references/drive-recipe.md`: launch facts, doctor table, readiness, every stable handle, network endpoints per feature, seed-data gaps, cleanup and isolation.

Seed gaps in `awesome_waves`: 0 learning journeys, 0 research discoveries, 0 pending resources, 0 bookmarks, edits, link reports and notifications. A journey that needs them seeds them through the real UI on a throwaway clone (submit as a member, approve as admin, run a small research job), or reports UNVERIFIED with the missing precondition. Never hand-insert rows to make a journey pass.

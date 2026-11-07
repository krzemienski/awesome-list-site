# Lane rules — prod-ops 2026-11-06 (lead-written; layout is mine)

Root: `/Users/nick/Desktop/awesome-list-site/.claude/worktrees/prod-ops/reports/prod-ops-2026-11-06/` (call it R).
Findings → `R/lanes/<lane>.md`. Evidence → `R/evidence/<lane>/`. Write findings as you go so a timeout loses little.

## Approval gate (verbatim from the owner's brief)
Before approval, you may do the following:
- Read code, docs, and git history.
- Make read-only HTTP requests and use the production site read-only (browse, search, open admin tabs, view job history).
- Pull analytics through read-only APIs.
- Read logs.
- Write files under `reports/prod-ops-2026-11-06/` on a branch.

Before approval, the following are off-limits on production. It is CRITICAL to hold to this, because each one is irreversible or changes the live site or data:
- `publish_app`, and `update_app_using_prompt`.
- Any POST, PUT, PATCH, or DELETE against awesome.video.
- Seed, and Clear & Re-seed.
- Link-remediation apply.
- GitHub export or sync to the list repo.
- Digest or email dispatch.
- Database backup restore.
- `db:push`.
- Changing Replit Secrets or deployment settings.
- Sign-out or "Sign out all devices" in any lane. All lanes share the owner session (#76), so one sign-out ends every lane.

When you reach a write action during discovery, record it in the inventory as `write path, deferred` with the control's location, and move on.

## How that applies in practice
- Never click a control that saves, submits, toggles, approves, rejects, deletes, runs, starts, imports, exports,
  syncs, seeds, restores, applies, enriches, researches, reports, bookmarks, favorites, enrols, marks complete or
  sends. Opening a dialog is fine only if opening it sends nothing; close it with Cancel/Escape.
- Never click any control whose accessible name contains "Sign out" or "Log out". Never visit /logout,
  /api/auth/logout, /api/auth/admin-logout or logout-all.
- Never run `agent-browser cookies get`, never cat/echo/print `~/.cache/awesome-audit/*`, `.env`, tokens or cookies.
  Check a session only by status code (e.g. `GET /api/admin/stats` → 200).
- Owner session (admin lanes and logs only): curl with `-H @"$HOME/.cache/awesome-audit/owner.hdr"`; in the browser,
  `agent-browser --session <lane> cookies set --curl "$HOME/.cache/awesome-audit/owner.hdr" --domain awesome.video`.
  Never log in as owner (no POST /api/auth/admin-login): the cached session is valid.
- Every browser lane records a HAR for its whole run: `agent-browser --session <lane> har start` first, then
  `har stop R/evidence/<lane>/<lane>.har` at the end (and at least every ~30 min, rotating file names). At the end,
  count methods to awesome.video with jq and put the table in your lane file. Any non-GET/HEAD/OPTIONS request
  is reported with URL, method, the click that caused it, and response status. Do not hide or "explain away" one.
- agent-browser traps: headless never scrolls (use a DOM click via `eval` on below-fold targets, or a tall
  viewport); wait ~2500 ms after load before reading; re-snapshot refs after navigation. Prefer screenshots over
  eval for "what the user sees". Record `navigator.webdriver` once per session (must be true → analytics suppressed).
- Do not write helper scripts (no /tmp .sh/.js/.py wrappers). One-off shell pipelines with curl/jq are fine.
- zsh: no unquoted word-splitting; never use `path`, `status`, `prompt` as variable names.
- Screenshots: never capture other people's emails or names in admin user lists (mask or skip). No secrets in files.
- Production only: https://awesome.video. No local server.

## Per-feature record (walkthrough lanes)
| ID | Feature | Entry (URL + control) | What it does | Result works/broken/degraded + evidence path | Console/network errors | Write paths deferred (control + location) | Essential? (core/supporting/incidental + one-line why) |

## Your final message
Your last message is delivered to the lead. Keep it under ~400 words: status, top findings (each with an evidence
path), anything that looks like a Primary function broken for real visitors, blockers, and the HAR method table.
If you find a Primary function down for real visitors, say so in the first line.

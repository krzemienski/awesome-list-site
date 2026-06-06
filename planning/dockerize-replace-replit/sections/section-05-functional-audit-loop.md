# Section 05 — Phase 5: Exhaustive Browser-Driven Functional Audit + Remediation Loop

Drive a REAL browser against the live seeded Dockerized app at `http://localhost:5001` until every screen and every admin tab passes at every breakpoint, then loop on remediation until zero defects remain.

## Background

Precondition: **section-03 PASS** — the Dockerized stack is up on host `:5001`, migrations applied, seed verified (admin user + categories + resources + journeys present in the DB). If the app is not seeded and reachable, this phase cannot start.

The audit drives a real browser via the **Chrome DevTools MCP** harness. Tools used: `mcp__chrome-devtools__navigate_page`, `resize_page`, `take_snapshot`, `take_screenshot`, `list_console_messages`, `list_network_requests`, `evaluate_script`, `click`, `fill`, `wait_for`. Every "works" claim requires OBSERVED evidence — captured console output, captured network requests, and a screenshot — not code reading.

Decision **D7** = Chrome DevTools MCP is the PRIMARY audit harness; the existing Playwright suite is CI codification only (run after the MCP pass converges, never as the source of truth for this phase).

Breakpoints (px width): **320, 375, 768, 1024, 1280, 1440, 1920**.

## Requirements

Every screen (17) plus every admin tab (14) is exercised at every breakpoint (7) and passes:

- **Zero console errors** (including no React hydration-mismatch errors).
- **Zero failed network requests** — no response with status `>= 400`.
- **Correct rendered data** — rendered counts equal the DB baseline (captured from the API).
- **All interactive controls exercised** — every button, link, select, popover, dialog, tab, and form actually actuated and its result asserted.
- **Auth flows + CRUD persist** — register, login, session persistence, protected-route access, logout; at least one CRUD write persists and survives a `docker compose restart`.
- **Responsive integrity** — no horizontal overflow or clipping (`scrollWidth <= clientWidth + 1`), no off-viewport or zero-size interactive controls; mobile nav (drawer) works at narrow widths.

Exit state: audit matrix is 100% PASS (or FIXED then re-verified PASS) and the defect changelog has zero OPEN entries.

## Dependencies

- **Requires section-03 PASS.** Without a seeded, reachable container the audit has nothing real to drive.
- **Blocks: nothing** — terminal phase (runs in parallel with section-04).

## Audit inventory

| # | Screen | Route | Key controls | Data assertion | Auth |
|---|--------|-------|--------------|----------------|------|
| 1 | Home | `/` | sort select, category cards, tag-filter popover (mounts only if tags exist), clear-filters | card count == # categories with displayCount>0 (~9); each `badge-count-<slug>` == `/api/categories` resourceCount; subhead total == `/api/resources?limit=1` `.total` | no |
| 2 | Login | `/login` | email/pw, submit (OAuth buttons removed in section-01) | valid admin -> `/admin`; wrong creds rejected | gate |
| 3 | Register | `/register` | form + submit | new `role=user` row created | no |
| 4 | Category | `/category/:slug` | search, subcategory filter, sort, view-mode toggle, resource cards, suggest-edit (gated) | `text-results-count` Y == DB count for category == sidebar badge | no |
| 5 | Subcategory | `/subcategory/:slug` | cards, back | `h1` == name; badge == count | no |
| 6 | SubSubcategory | `/sub-subcategory/:slug` | cards, back | `h1` == name; badge == count | no |
| 7 | ResourceDetail | `/resource/:id` | visit, share, suggest-edit (gated), related, favorite/bookmark (authed) | title/url match; related from `/api/resources/:id/related` | partial |
| 8 | About | `/about` | static cards, nav | renders | no |
| 9 | Advanced | `/advanced` | 4 tabs Explorer/Metrics/Export/AI (USE FULL POINTER-EVENT SEQUENCE — FP-01: bare `.click()` is dead on Export+AI tabs), search, export CTA | export CTA "Export {N}" == total | no |
| 10 | SubmitResource | `/submit` | unauth gate; authed form (title/url/desc/category/tags) | authed submit -> `POST /api/resources` pending; category opts == DB | form gated |
| 11 | Journeys | `/journeys` | journey cards, category select, view-journey | card count == published journeys | no |
| 12 | JourneyDetail | `/journey/:id` | start (authed), steps, complete-step | steps render (verify FP-02 `/journey/6` 0-steps fixed) | partial |
| 13 | Profile | `/profile` | account form, change-password | `/api/auth/user` 200 | AuthGuard |
| 14 | Bookmarks | `/bookmarks` | saved cards, remove | `/api/bookmarks` | AuthGuard |
| 15 | Admin | `/admin` | 14 tabs (approvals, edits, enrichment, researcher, export, database, resources, categories, subcategories, subsubcategories, journeys, users, github, linkhealth, audit) | `/api/admin/stats` cards | AdminGuard |
| 16 | ThemeSettings | `/settings/theme` | font picker (works), color picker (verify M-02 blank + no-op fixed) | swatches render, selection applies | no |
| 17 | 404 | `*` | home link, browse CTA | title "404 - Page Not Found" | no |

**Persistent chrome (every screen):** header (mobile-drawer-trigger, search dialog via `/` and `Cmd/Ctrl+K`, theme link, login/avatar dropdown), sidebar (brand count, nav, CATEGORIES accordion with DB badges, About), search dialog (Fuse.js). Plus the **14 admin tabs**, each individually exercised.

## Per-breakpoint procedure

For each screen at each breakpoint BP:

1. `resize_page(width=BP, height=900)`.
2. `navigate_page(url)`.
3. `wait_for(text=<known post-hydration string for that screen>)` — NOT networkidle alone. SSR hydration races networkidle; capture any hydration-mismatch console errors as defects.
4. `list_console_messages(types:["error"])` -> assert empty.
5. `list_network_requests` then FILTER `status >= 400` YOURSELF (MCP has NO status filter) -> assert none.
6. `evaluate_script` overflow + clipping probe (snippet below) -> assert pass.
7. `take_snapshot` (a11y tree + UIDs) and `take_screenshot(filePath="e2e-evidence/audit/<screen>-<bp>.png")`.
8. Exercise every control via snapshot UIDs and assert each result. For `/advanced` tabs use the full pointer-event dispatch (FP-01), not a bare click.
9. Auth flow (run once per breakpoint where chrome auth controls appear): register -> login -> session persists across navigation -> protected route reachable -> logout.

Overflow + clipping probe (inline):

```js
() => {
  const de = document.documentElement;
  const overflow = de.scrollWidth - de.clientWidth;
  const vw = window.innerWidth, vh = window.innerHeight;
  const bad = [];
  for (const el of document.querySelectorAll('button, a, input, select, [role="button"], [role="tab"]')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) { bad.push({ why: 'zero-size', tag: el.tagName, txt: (el.textContent||'').trim().slice(0,40) }); continue; }
    if (r.right < 0 || r.bottom < 0 || r.left > vw || r.top > vh) { bad.push({ why: 'off-viewport', tag: el.tagName, txt: (el.textContent||'').trim().slice(0,40) }); }
  }
  return { overflow, overflowPass: overflow <= 1, scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, badControls: bad, pass: overflow <= 1 && bad.length === 0 };
}
```

**Harness note (I6 — Playwright codification only):** if codifying the converged pass into the existing Playwright suite, override `baseURL` -> `http://localhost:5001` and DISABLE the `webServer` block (`playwright.config.ts:31` baseURL + `:77` webServer `npm run dev`). Otherwise Playwright boots a SEPARATE `:5000` dev stack and tests the wrong app. The MCP pass against `:5001` is primary; Playwright is downstream CI only.

## Remediation loop

```
while defects_found:
    record defect (screen, bp, control, expected vs actual, console/network evidence) in defects.md
    diagnose root cause -> classify: frontend | API | data/seed | container/config
    fix the REAL system (source files only — no speculative changes)
    rebuild/redeploy affected container(s)
    re-verify the affected screen x breakpoint
    run whole-app smoke pass (all screens, one mid breakpoint, key flows)
exit only when defects_found == 0 across ALL screens AND ALL breakpoints
```

Known defects to confirm FIXED or fix:

- **M-02** — theme color picker blank + no-op. Field-shape mismatch across `ThemeSettings.tsx` <-> `shadcn-themes.ts` <-> `theme-provider.tsx`. Selecting an accent swatch must render swatches and apply.
- **FP-01** — `/advanced` Export + AI tabs dead under bare `.click()`. Use full pointer-event dispatch to actuate.
- **FP-02** — `/journey/6` renders zero steps. Seed fix (journey 6 has no steps in the DB).
- **FP-03** — Home tag-filter popover never mounts. Confirm tags exist in seed and popover mounts.
- **FX-04** — Login shows no error toast on wrong creds. Confirm rejection surfaces a visible error.
- **FP-05** — sidebar active-pill never lights for the current route. Confirm active state renders.

## Validation gate VG-5 (blocking)

**prerequisites:** section-03 PASS; count baseline captured from `/api/categories`, `/api/resources?limit=1`, `/api/subcategories`, `/api/sub-subcategories`, `/api/journeys`.

**capture:**
- `e2e-evidence/audit/matrix.md` — rows = screens + admin tabs, cols = 7 breakpoints, cell = PASS / FIXED / FAIL.
- `e2e-evidence/audit/defects.md` — `DEFECT-NN` entries (screen, bp, control, expected vs actual, evidence paths, status OPEN/FIXED).
- Per cell: `<screen>-<bp>.png` + `console-errors.txt` + `failed-requests.txt` (the `>= 400` set).

**pass_criteria:**
- Every matrix cell PASS (or FIXED then re-verified PASS).
- `defects.md` has zero OPEN entries.
- Every cell: console-errors empty (incl. no hydration-mismatch) + failed-requests empty + overflow probe `scrollWidth <= clientWidth + 1` + rendered counts == DB baseline.
- Auth register/login/session/logout works AND at least one CRUD write persists and survives `docker compose restart`.
- M-02 / FP-01 / FP-02 confirmed FIXED with screenshot evidence.

**review:**
- OPEN the screenshots with the Read tool and confirm CONTENT (correct screen, correct data), not just file existence.
- Read `matrix.md` and `defects.md` end to end.
- A skeptical reviewer would agree zero cells are FAIL and zero defects are OPEN.

**mock_guard:** do NOT mark any cell PASS from code-reading or assumption. Every PASS requires a real browser screenshot + captured console + captured network for that EXACT screen x breakpoint.

## Acceptance criteria

- [ ] Count baseline captured from all 5 API endpoints before auditing.
- [ ] All 17 screens audited at all 7 breakpoints; cells recorded in `matrix.md`.
- [ ] All 14 admin tabs audited at all 7 breakpoints.
- [ ] Persistent chrome (header, sidebar accordion, search dialog) exercised per breakpoint.
- [ ] Every cell: zero console errors (no hydration-mismatch) + zero `>= 400` network responses + overflow probe pass.
- [ ] Rendered counts == DB baseline on every data screen.
- [ ] Auth register/login/session/logout verified; one CRUD write persists across `docker compose restart`.
- [ ] M-02, FP-01, FP-02, FP-03, FX-04, FP-05 each confirmed FIXED (or fixed) with screenshot evidence.
- [ ] `matrix.md` 100% PASS/FIXED; `defects.md` zero OPEN.
- [ ] Screenshots opened (Read) and content-confirmed.

## Files to create / modify

- **Create (evidence):** `e2e-evidence/audit/matrix.md`, `e2e-evidence/audit/defects.md`, per-cell `e2e-evidence/audit/<screen>-<bp>.png` + `console-errors.txt` + `failed-requests.txt`.
- **Modify (source only as remediation requires):** frontend components, API/server handlers, seed/data, or container/compose config — driven strictly by recorded defects. No speculative edits.
- **Optionally (CI codification only):** `playwright.config.ts` — `baseURL` -> `http://localhost:5001` and disable the `webServer` block — applied AFTER the MCP pass converges.

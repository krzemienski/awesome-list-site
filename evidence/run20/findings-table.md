# Run20 findings table — prod re-verification of NB-001..060 post-Run19 republish

Scope: every Run2 finding (run18 fixes) re-verified **live against https://awesome.video** after the Run19 republish, plus prod data catch-up (T002), GitHub export re-run (T003), and the NB-039 withdraw endpoint build-out (T004). Iron Rule throughout — no mocks; all verdicts from live probes (JSON + screenshots in this directory).

Statuses: **PASS** (re-verified live on prod) · **REGRESSION→fixed** (found broken on prod this run, root-caused, fixed, and re-verified live after this session's republish — `r20_prod_postpublish.json`) · **data-fix applied** (run17/run18 prod scripts executed against live admin API this run) · **completed** (remainder built this run) · **platform** (hosting edge, unchanged).

| ID | Sev | Run18 status | Run20 prod verdict | Evidence |
|---|---|---|---|---|
| NB-001 | HIGH | fixed | PASS — whitespace-only pw → 400 on register | curl probe (transcript) |
| NB-002 | HIGH | fixed | **REGRESSION→fixed** — Escape closed drawer but focus fell to body; sidebar.tsx focus-return re-landed; prod now returns focus to hamburger | `r20_p2.json`, `r20_nb002*.json`, `r20_prod_postpublish.json` |
| NB-003 | HIGH | fixed | PASS — compact consent at 320×568, Sign-in reachable | `r20_p2.json` |
| NB-004 | HIGH | fixed | PASS — palette fits 812×375, selection visible ×12 ArrowDown | `r20_p2.json` |
| NB-005 | HIGH | fixed | PASS — edit modal Save reachable in 375 landscape | `r20_p5b.json` |
| NB-006 | HIGH | fixed | PASS — PDF export gives feedback on all paths | `r20_p3b.json` |
| NB-007 | HIGH | fixed | PASS — A/B profiles → different rec sets | `r20_p4a.json` |
| NB-008 | HIGH | data-fix | data-fix applied — 185380 Wayback repoint live on prod | T002 (`data catch-up`) |
| NB-009 | MED | fixed | PASS — dot-paths return 404 | curl probe (transcript) |
| NB-010 | MED | fixed | PASS — HTML export escaped | `r20_p3b.json` |
| NB-011 | MED | fixed | PASS — YAML parses | `r20_p3a.json` |
| NB-012 | MED | fixed | PASS — tags honored in YAML/HTML/CSV | `r20_p3a/b/c.json` |
| NB-013 | MED | fixed | PASS — exact-match boost live | curl probe (transcript) |
| NB-014 | MED | data-fix | data-fix applied — repo-suffix sweep 0 on prod | T002 |
| NB-015 | MED | data-fix | data-fix applied — brand casing sweep 0 on prod | T002 |
| NB-016 | MED | data-fix | data-fix applied — placeholder sweep 0 on prod | T002 |
| NB-017 | MED | fixed | PASS — /categories titles wrap | `r20_p1a.json` |
| NB-018 | MED | fixed | PASS — researcher banner contained | `r20_p5b.json` |
| NB-019 | MED | fixed | **REGRESSION→fixed** — dropdown open jumped scroll 713→0 + popper off-screen. Root cause: `design-system.css` `html, body{height:100%}` capped body so Radix scroll-lock collapsed scroll range. Fixed to `html{height:100%} body{min-height:100%}`. Prod: 0px jump, popper in-viewport | `r20_p5a*.json`, `r20_dbg19*.json`, `r20_prod_postpublish.json` |
| NB-020 | MED | fixed | PASS — tablist Tab-reachable, focus forwards to active tab, ArrowRight moves (all-but-active tabindex=-1 is correct Radix roving) | `r20_p5a2.json`, `r20_dbg19b.json` |
| NB-021 | MED | fixed | PASS — print stylesheet live | `r20_p1a.json` |
| NB-022 | MED | fixed | **REGRESSION→fixed** — hard `disabled` during pending dropped focus to body; aria-disabled pattern re-landed. Prod: focus stays on toggle, no `disabled` attr | `r20_p4b2.json`, `r20_nb022kb*.json`, `r20_prod_postpublish.json` |
| NB-023 | MED | fixed | PASS — cursor/hover affordances incl. home-card accent border | `r20_p1b1.json` |
| NB-024 | MED | fixed | PASS — prior toast dismissed on re-toggle | `r20_p4b2.json` |
| NB-025 | MED | fixed | PASS — /bookmarks ?sort= two-way sync | `r20_p4b2.json` |
| NB-026 | MED | fixed | PASS — palette Escape restores focus | `r20_p1a.json` |
| NB-027 | MED | data-fix | data-fix applied — journey/6 dup removed on prod | T002 |
| NB-028 | MED | fixed | PASS — forced-500 → 3 req/20s + banner; real 401 → 1 req + gate | `r20_p1b2.json` |
| NB-029 | LOW | fixed | PASS — sitemap real per-URL lastmod | curl probe (transcript) |
| NB-030 | LOW | platform-partial | platform — edge Cache-Control unchanged (GAESA class) | — |
| NB-031 | LOW | fixed | PASS — cancelled/failed jobs coherent; job #34 honest crash text | `r20_p5b.json`, `r20_p5b2.json` |
| NB-032 | LOW | fixed | PASS — turns capped display 7/100 | `r20_p5b2.json` |
| NB-033 | LOW | fixed | PASS — all costs $X.XXXX 4dp | `r20_p5b2.json` |
| NB-034 | LOW | fixed | PASS — pw placeholder fits 320px | `r20_p2.json` |
| NB-035 | LOW | fixed | PASS — cookie table accurate (connect.sid/GA/GAESA/localStorage) | `r20_nb035.json` |
| NB-036 | LOW | fixed | PASS — GitHub-issues contact links live on /privacy + /about | `r20_nb035.json`, `r20_nb036b.json` |
| NB-037 | LOW | fixed | PASS — single count on /categories | `r20_p1a.json` |
| NB-038 | LOW | fixed | PASS — anon thumbs → honest sign-in prompt (incl. /advanced) | `r20_p1a.json`, `r20_p4d*.json` |
| NB-039 | LOW | partial | **completed** — `DELETE /api/user/submissions/:id` built this run (T004): owner-only (403), pending-only (409), audit-before-delete; Profile withdraw button + confirm dialog. Prod probes: anon 401 · authed bogus id 404 · NaN id 400 | `r20_prod_postpublish.json` (route probe re-run with real path) |
| NB-040 | LOW | fixed | PASS — security tab copy matches capabilities | `r20_p4b.json` |
| NB-041 | LOW | fixed | PASS — streak-0 onboarding copy | `r20_p4b.json` |
| NB-042 | LOW | fixed | PASS — consistent skill reasons | `r20_p4a.json` |
| NB-043 | LOW | data-fix | data-fix applied — Dolby/quanteec repoints live on prod | T002 |
| NB-044 | LOW | fixed | PASS — true match total shown | `r20_p1a.json` |
| NB-045 | LOW | fixed | PASS — whitespace query rejected | `r20_p1a.json` |
| NB-046 | LOW | data-fix | data-fix applied — FFmpeg retitles live on prod | T002 |
| NB-047 | LOW | fixed | PASS — metrics reconcile from one source | `r20_nb047.json` |
| NB-048 | LOW | fixed | PASS — "Page X of Y · N–M of T" indicator | `r20_p1a.json` |
| NB-049 | LOW | data-fix | data-fix applied — filename titles renamed on prod | T002 |
| NB-050 | LOW | fixed | PASS — line-clamp-2 + break-words | `r20_p1a.json` |
| NB-051 | LOW | fixed | PASS — mobile position label wraps at 375 | `r20_p2.json` |
| NB-052 | LOW | data-fix | data-fix applied — bio-salad sweep 0 on prod | T002 |
| NB-053 | LOW | fixed | PASS — toast bottom-anchored on mobile | `r20_p2.json` |
| NB-054 | LOW | fixed | PASS — styled discard dialog on dirty Cancel | `r20_p4b.json` |
| NB-055 | LOW | fixed | PASS — friendly error card, no /api internals | `r20_p1b1.json` |
| NB-056 | LOW | fixed | PASS — resend + 60s cooldown | `r20_p4d.json` |
| NB-057 | LOW | fixed | PASS — theme radios select on arrow | `r20_p4d.json` |
| NB-058 | LOW | fixed | PASS — progressbar ARIA complete | `r20_p1a.json`, `r20_p4c.json` |
| NB-059 | LOW | fixed | PASS — single PUT per step toggle | `r20_p4c.json` |
| NB-060 | LOW | fixed | PASS — offline toggle honest immediate toast | `r20_p4c.json`, `r20_nb060b.json` |

**Totals**: 60 findings — **46 re-verified PASS** live on prod · **9 data-fix applied to prod this run** (T002, run17+run18 scripts via live admin API; sweeps 0; second runs no-op) · **3 regressions found → root-caused → fixed → re-verified live post-republish** (NB-002, NB-019, NB-022) · **1 completed** (NB-039 withdraw endpoint) · **1 platform** (NB-030).

## Other work verified this run

- **T003 GitHub export re-run**: completed export recorded in `github_sync_history` (run16/17/18 carry-over cleared) — `github-export.json`.
- **Mid-task user request**: researcher budget max cap removed (dev; shipped in this session's republish).
- **Post-republish spot-check**: NB-002/019/022 fixes + NB-039 endpoint all confirmed live on prod — `r20_prod_postpublish.json`.

## Global verification (Iron Rule)

- `npx tsc --noEmit` → clean · migration-drift workflow → clean
- QA teardown net-zero: `__qa_test_run20` user deleted (resourcesDetached 0), `__qa_test*` = 0, probe resources = 0. External-auditor `qa-*`/`r3verify*` accounts intentionally untouched.
- 32 evidence files in `evidence/run20/`.

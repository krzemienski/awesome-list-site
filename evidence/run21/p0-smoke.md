# Run21 P0 smoke — July 19, 2026 (dev, post-remediation)

Playwright (Chromium 1223, real clicks), desktop@1440×900 + mobile@375×667. Zero page errors across all legs.

## Desktop @1440 (5/5)
| # | Flow | Result |
|---|------|--------|
| D1 | Landing renders (category grid visible) | PASS |
| D2 | Landing → taxonomy page (SPA nav, resource cards render) | PASS |
| D3 | Taxonomy → resource detail, outbound https link present | PASS |
| D4 | /submit renders form | PASS |
| D5 | Print emulation / + /advanced: 0 dark-background buttons, white body bg (initial "1 dark" flag was the harness counting `rgba(0,0,0,0)` transparent as dark — alpha-aware recheck: 0) | PASS |

Print evidence: `screenshots/print_home.png`, `screenshots/print_advanced.png`.

## Mobile @375 (3/3)
| # | Flow | Result |
|---|------|--------|
| M1 | Mobile landing renders | PASS |
| M2 | Mobile taxonomy page (resource links visible) | PASS |
| M3 | Mobile resource detail + outbound link | PASS |

## Auth + journeys (4/4, throwaway `__qa_test` users, torn down)
| # | Flow | Result |
|---|------|--------|
| A1 | Register (201) | PASS |
| A2 | Local login (200) | PASS |
| A3 | /profile renders for fresh user | PASS |
| A4 | Journey 7: Start Journey → `button-complete-step-1` marks step (progress 17%) → untoggle reverts | PASS |

## Admin @1440 (5/5)
| # | Flow | Result |
|---|------|--------|
| B1 | Admin local login (200) | PASS |
| B2 | Approvals tab renders | PASS |
| B3 | Pending edits tab renders | PASS |
| B4 | Researcher config tab renders | PASS |
| B5 | QA user delete via admin API (200) | PASS |

## Teardown
`__qa_test%` users = 0 after run (psql). Both smoke users deleted via `DELETE /api/admin/users/:id`; journey enrollment removed with the user. Net-zero confirmed.

# Write proof (lead, 2026-11-06T21:01:14Z)

| HAR | GET | non-GET to awesome.video |
|---|---|---|
| evidence/admin-content/admin-content.har | 2153 | 0 |
| evidence/admin-ops/admin-ops-1.har | 560 | 0 |
| evidence/admin-ops/admin-ops-2.har | 6 | 0 |
| evidence/member/member.har | 1590 | POST /api/telemetry/dead-link 204 |
| evidence/visitor/visitor.har | 4324 | POST /api/telemetry/dead-link 204; POST /api/telemetry/dead-link 204; POST /api/telemetry/dead-link 204; POST /api/telemetry/dead-link 204 |

curl-only lanes (inventory, analytics, logs): GET only per their reports.
/api/version at start 20:27:18Z: 6cb1a93e9992ac03fcd02ae54cc4e4d2a9286d0f; now: 6cb1a93e9992ac03fcd02ae54cc4e4d2a9286d0f

## Update 21:08Z
| evidence/visitor/visitor2.har | 1119 | 0 |
| evidence/visitor/visitor3.har | 198 | POST /api/telemetry/dead-link 204 (21:06:24Z, malformed /tag URL from a zsh word-split slip) |
| evidence/visitor/visitor3b.har | 179 | 0 |

Total browser HARs: 10,129 GET, 6 POST (all dead-link telemetry, log line only).

## Update 21:18Z
| evidence/visitor/visitor4.har | 2512 | 0 |
| evidence/visitor/visitor5.har | 177 | 0 |
| evidence/visitor/playwright-next.har | 185 | **POST /api/interactions 201 (21:15:46.414Z), DB row: owner `view` on resource 190875; wrong-selector click opened a resource page** |
| evidence/visitor/playwright-next2.har | 99 | 0 |

Total browser HARs: 12,917 GET; 7 non-GET = 6 dead-link telemetry (log line only) + 1 interaction (one DB row, owner account, left in place, PLAN decision 22).

## Final (lead, 2026-11-06T21:22:50Z)
Browser HARs: 12,917 GET; 7 non-GET = 6 × POST /api/telemetry/dead-link 204 (log line only) + 1 × POST /api/interactions 201 (one owner `view` row on resource 190875, 21:15:46Z, left in place; PLAN D22). Curl-only lanes: GET only.
/api/version start 20:27:18Z = 6cb1a93e9992ac03fcd02ae54cc4e4d2a9286d0f; end 2026-11-06T21:22:50Z = 6cb1a93e9992ac03fcd02ae54cc4e4d2a9286d0f; origin/main = 6cb1a93e9992ac03fcd02ae54cc4e4d2a9286d0f; /api/health/ready = 200.
No publish_app, update_app_using_prompt, seed, remediation apply, GitHub sync, digest dispatch, restore, db:push, Secrets change or sign-out was performed.
Two Playwright HARs held owner cookie/auth values; redacted to <REDACTED> by the lead before any commit (raw evidence is not committed).

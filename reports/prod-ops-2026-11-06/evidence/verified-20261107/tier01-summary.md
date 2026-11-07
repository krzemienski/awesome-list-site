# prod-check 20261107T030126Z: PASS

Base https://awesome.video, revision `9d580ddb7536`, tiers 0,1, started 2026-11-07T03:01:26.394Z.
pass 25, fail 0, info 1, skip 0.
Read-only guard: 0 non-GET requests to awesome.video.

| id | status | blocking | ms | detail |
|---|---|---|---|---|
| T1-17 | info | no | 422 | newest backup 0.1 h old (info only until backup scheduling ships) |
| T0-01 | pass | yes | 261 | live revision = main 9d580ddb |
| T0-02 | pass | yes | 263 | ready probe 200 in 263 ms |
| T0-03 | pass | yes | 208 | home 200 in 208 ms |
| T1-02 | pass | yes | 1185 | sitemap = categories = totalPublic = 4074 |
| T1-03 | pass | yes | 0 | 4766 sitemap URLs |
| T1-04 | pass | yes | 268 | 3 resource pages ok (/resource/185568, /resource/189635, /resource/189590) |
| T1-05 | pass | yes | 220 | search ffmpeg total 451 |
| T1-07 | pass | yes | 752 | 4 page types ok (/, /category/community-events, /resource/189950, /journey/10) |
| T1-08 | pass | yes | 78 | robots.txt 200 with Sitemap: |
| T1-09 | pass | yes | 90 | unknown route answers 404 |
| T1-14 | pass | yes | 443 | admin stats 200 |
| T1-15 | pass | yes | 181 | approvals readable, 24 pending |
| T1-16 | pass | yes | 296 | ops health ready |
| T1-18 | pass | yes | 189 | link scan 14 completed 14.9 h ago |
| T1-19 | pass | yes | 234 | newest job 109 cancelled |
| T1-01 | pass | yes | 15022 | 12 pages show resources |
| T1-06 | pass | yes | 2367 | palette shows 16 options for ffmpeg |
| T1-10 | pass | yes | 2662 | sign-in shows the Clerk identifier input |
| T1-11 | pass | yes | 2779 | /profile redirects to sign-in |
| T1-12 | pass | yes | 4723 | no horizontal overflow at 390 px on /, /category/intro-learning, /resource/188968 |
| T1-13 | pass | yes | 0 | 0 console errors on visitor pages |
| NEW-1 | pass | no | 26652 | 6 admin tabs render and match their GETs |
| NEW-2 | pass | no | 25933 | Resources tab total, search, status filters, pager and deep links work |
| NEW-3 | pass | no | 8932 | Review and Edit dialogs open populated and close; nothing saved |
| NEW-4 | pass | yes | 7359 | signed-out /admin redirects to sign-in with no admin data |

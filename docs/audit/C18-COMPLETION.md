# C18 completion table: 47 findings, production proof

Proof revision for each row is noted. Final revision target: 7c6b1b93 (origin/main, holds #209–#219).

| # | Finding | Fix | Result | Revision | Evidence |
|---|---|---|---|---|---|
| 1 | BUG-001 View details covered | #210 | PASS 1440/768/375 | 291c8d0d | e2e-evidence/c18-final/FA/bug001-*.png |
| 2 | BUG-002 NAL Unit parked domain | data 186041 → SVTA | PASS | 291c8d0d | e2e-evidence/c18-final/FC/card-186041-svta.png |
| 3 | BUG-003 analytics after Allow | #217 Mixpanel ignore_dnt | PASS (4 providers, Decline 0) | 291c8d0d | e2e-evidence/c18-final/RC/notes.md |
| 4 | BUG-004 slow/blank first render | #213 + #215 | PASS 12/12 cells | 9a262757 | e2e-evidence/c18r-verify-c4/notes.md |
| 5 | BUG-005 prohibited aria-label | #212 | PASS | 291c8d0d | e2e-evidence/c18-final/FA/notes.md |
| 6 | BUG-006 ?tags list unreachable | #211 | PASS | 291c8d0d | e2e-evidence/c18-final/FA/bug006-*.png |
| 7 | BUG-007 unnamed icon links | #212 | PASS 1440/375 | 291c8d0d | e2e-evidence/c18-final/FA/bug007-1440-tags-udp.png |
| 8 | BUG-008 kind filter denominator | #209 + #215 | PASS | 291c8d0d | e2e-evidence/c18-final/FA/bug008-kind-*.png |
| 9 | BUG-009 concatenated names | #210 #212 #215 | PASS 1440/375 | 291c8d0d | e2e-evidence/c18-final/FA/bug009-375-codecs.png |
| 10 | BUG-010 Adobe help 403 | keep (loads in real Chrome) | PASS | 291c8d0d | e2e-evidence/c18-final/RC/bug010-186483.png |
| 11 | BUG-011 scraped metadata | #210 | PASS | 291c8d0d | e2e-evidence/c18-final/FA/bug011-1440-cdn.png |
| 12 | BUG-012 Fastly 404 | data 190647 archived | PASS | 291c8d0d | e2e-evidence/c18-final/FC/res-190647.png |
| 13 | BUG-013 Stanford EE398A PDF | data 189028 → archive.org | PASS | 291c8d0d | e2e-evidence/c18-final/RC/bug013-189028.png |
| 14 | BUG-014 Stanford EE368B PDF | data 189660 → archive.org | PASS | 291c8d0d | e2e-evidence/c18-final/RC/bug014-189660.png |
| 15 | BUG-015 Stanford handouts | data 188769 → archive.org | PASS | 291c8d0d | e2e-evidence/c18-final/RC/bug015-188769.png |
| 16 | BUG-016 AOMedia timeout | keep (loads) | PASS | 291c8d0d | e2e-evidence/c18-final/RC/bug016-188726.png |
| 17 | BUG-017 Reznik PDF timeout | keep (loads) | PASS | 291c8d0d | e2e-evidence/c18-final/RC/bug017-189056.png |
| 18 | BUG-018 Adobe product 403 | keep (loads in real Chrome) | PASS | 291c8d0d | e2e-evidence/c18-final/RC/bug018-185062.png |
| 19 | BUG-019 O'Reilly 403 | keep (loads in real Chrome) | PASS | 291c8d0d | e2e-evidence/c18-final/RC/bug019-185285.png |
| 20 | BUG-020 Decline first click | #213 | PASS 5/5 + 6/6 | 291c8d0d | e2e-evidence/c18-final/RC/notes.md |
| 21 | BUG-021 Docs link on home | #212 | PASS | 291c8d0d | e2e-evidence/c18-final/FA/bug021-1440-home.png |
| 22 | BUG-022 sidebar truncation | #212 + #219 | PASS 1440/1024/375: 158 labels, 0 overflow, 0 ellipsis, long labels full; rows >= 44px (hit-area overlap of 17px is the existing negative-margin design, not text collision) | 7c6b1b93 | e2e-evidence/c18-final/C22/notes.md, 1440-research-expanded.png |
| 23 | BUG-023 RTMPRTSPHTTP label | data subcategory 2233 renamed | PASS | 291c8d0d | e2e-evidence/c18-final/FA/notes.md |
| 24 | BUG-024 title suffix | #211 | PASS | 291c8d0d | e2e-evidence/c18-final/FB/notes.md |
| 25 | BUG-025 768 mid-word wrap | #211 | PASS | 291c8d0d | e2e-evidence/c18-final/FB/bug025-768-*.png |
| 26 | BUG-026 Favorite vs Bookmark | #213 | PASS | 291c8d0d | e2e-evidence/c18-final/FB/bug026-1440.png |
| 27 | BUG-027 acronym casing | #211 | PASS | 291c8d0d | e2e-evidence/c18-final/FB/bug027-1440.png |
| 28 | BUG-028 empty RECENTLY INDEXED | #211 | PASS | 291c8d0d | e2e-evidence/c18-final/FB/bug028-1440.png |
| 29 | BUG-029 ?tags titles | #211 + #216 | PASS | 291c8d0d | e2e-evidence/c18-final/FB/bug029-*.txt |
| 30 | BUG-030 duplicate related | #213 | PASS | 291c8d0d | e2e-evidence/c18-final/FB/bug030-1440.png |
| 31 | BUG-031 tag-filter header counts | #209 + #216 | PASS | 291c8d0d | e2e-evidence/c18-final/FB/bug031-1440.png |
| 32 | BUG-032 stale 76 of 76 | #209 | PASS 10/10 | 291c8d0d | e2e-evidence/c18-final/FB/bug032-runs.txt |
| 33 | BUG-033 description grammar | data 186212 | PASS | 291c8d0d | e2e-evidence/c18-final/FC/card-186212-framerates.png |
| 34 | BUG-034 ATS duplicate | data 188583 retitled | PASS | 291c8d0d | e2e-evidence/c18-final/FC/card-188583-ats-admin.png |
| 35 | BUG-035 ATC duplicate | data 189011 retitled | PASS | 291c8d0d | e2e-evidence/c18-final/FC/res-186440.png |
| 36 | BUG-036 DOI duplicate | data 190094 archived | PASS | 291c8d0d | e2e-evidence/c18-final/FC/res-189979.png |
| 37 | BUG-037 AviSynth duplicate | data 184921 retitled | PASS | 291c8d0d | e2e-evidence/c18-final/FC/res-184921.png |
| 38 | BUG-038 Fastly guide duplicate | data 188960 archived | PASS | 291c8d0d | e2e-evidence/c18-final/FC/res-188734.png |
| 39 | BUG-039 EdgeCDN-X duplicate | data 190084 retitled | PASS | 291c8d0d | e2e-evidence/c18-final/FC/card-190084-edgecdnx-docs.png |
| 40 | BUG-040 singular matches | #209 | PASS | 291c8d0d | e2e-evidence/c18-final/FB/bug040-375.png |
| 41 | BUG-041 ?page=0/abc 404 | #209 | PASS | 291c8d0d | e2e-evidence/c18-final/FB/bug041-curl.txt |
| 42 | BUG-042 subcategory title template | #211 | PASS (99/99) | 291c8d0d | e2e-evidence/c18-final/FB/bug042-subcategory-titles.txt |
| 43 | BUG-043 palette empty shell | #214 + #218 | PASS pre-hydration 8/8 (1440 x5, 390 x3, Slow 3G+4xCPU), unthrottled PASS | 7c6b1b93 | e2e-evidence/c18-final/C43/P1-1440-dialog.png |
| 44 | BUG-044 compact banner copy | #213 | PASS | 291c8d0d | e2e-evidence/c18-final/FB/bug044-1440x450.png |
| 45 | BUG-045 375 paginator wrap | #209 | PASS | 291c8d0d | e2e-evidence/c18-final/FB/bug045-375.png |
| 46 | BUG-046 Uncategorized button | #209 | PASS | 291c8d0d | e2e-evidence/c18-final/FB/bug046-1440.png |
| 47 | BUG-047 badge vs tiles | #209 | PASS (11 SUBCATEGORIES = 11 tiles; 405 = tile sum) | 291c8d0d | e2e-evidence/c18-final/FB/notes.md (BUG-047 row), FB/bug046-1440.png |

P0 smoke (final gate 2): 9 journeys × 1440/375 = 18/18 PASS on 291c8d0d, local state restored — e2e-evidence/c18-final/SM/notes.md. BUG-022 and BUG-043 and the palette journey were re-driven on 7c6b1b93.

Follow-up found during C43 field-safety cell (not one of the 47): on a throttled cold load, text typed into the SSR hero search input before hydration is cleared when React hydrates (e2e-evidence/c18-final/C43/F1-1440-after-hydration.png). The palette correctly does not hijack it.

# C22 per-row re-tier (613 rows)

Layout is mine (lead gave no template). Read-only; no prod contact. Output: `evidence/lead/c22-retier-rows.tsv`
(613 rows + header; columns id, surface, interaction, C22 priority, function, bucket, reason ≤ 12 words).
Method: every row was read. Primary areas (OV, AP, RM, SH → P7; RS → P8; LH → P9; DB → P10) got a per-row decision.
Secondary areas were classed by interaction, with Incidental overrides (ED, member link reports LH-15..17/20..22/31,
contact inbox AU-18..27). A small default rule (error/offline/empty/loading words → retire; Confirm/Save/Create on Primary
→ tier2-weekly) filled the rest. "Function" is P#/S/I; SH tab rows that belong to Secondary tabs are marked S.
**PLAN §5 gives no Tier 1 check ids** (Tier 1 is one table row of bullets), so I cite the bullet text instead of inventing ids.

## Bucket totals
| Bucket | Rows |
|---|---|
| per-deploy | 20 |
| tier2-weekly | 24 |
| periodic-monthly | 310 |
| retire | 259 |
| **Total** | **613** |

## Per-area totals
| Area | Rows | per-deploy | tier2-weekly | monthly | retire |
|---|---|---|---|---|---|
| AP | 25 | 2 | 4 | 12 | 7 |
| AU | 27 | 0 | 0 | 11 | 16 |
| C6-MB | 81 | 0 | 4 | 48 | 29 |
| C6-PC | 1 | 0 | 0 | 1 | 0 |
| CAT | 23 | 0 | 0 | 15 | 8 |
| DB | 14 | 0 | 0 | 4 | 10 |
| DG | 7 | 0 | 0 | 2 | 5 |
| ED | 22 | 0 | 0 | 0 | 22 |
| EN | 31 | 0 | 0 | 17 | 14 |
| EX | 27 | 0 | 1 | 16 | 10 |
| GH | 23 | 0 | 0 | 9 | 14 |
| JN | 29 | 0 | 0 | 16 | 13 |
| LH | 32 | 1 | 2 | 10 | 19 |
| OV | 15 | 2 | 0 | 2 | 11 |
| RM | 74 | 7 | 6 | 45 | 16 |
| RS | 53 | 1 | 5 | 31 | 16 |
| RW | 9 | 0 | 0 | 3 | 6 |
| SC | 25 | 0 | 0 | 16 | 9 |
| SH | 44 | 7 | 2 | 19 | 16 |
| SSC | 26 | 0 | 0 | 17 | 9 |
| US | 25 | 0 | 0 | 16 | 9 |

## The 20 per-deploy rows (read of a Primary function; Tier 1 only covers the API half)
All are owner-session reads in a browser at one viewport, 0 writes. Tier 1 reference = PLAN §5 Tier 1 row, bullet
"admin GETs with the audit session (P7-P10)", unless stated. The gap each row closes: Tier 1 proves the GET answers; these prove the admin UI renders that data.

| # | Row | Function | Tier 1 bullet it extends | What the check asserts |
|---|---|---|---|---|
| 1 | OV-09 | P7 | `/api/admin/stats` 200 | recent-activity feed shows rows |
| 2 | OV-15 | P1 | "P1 home + all 9 categories … render ≥ 1 resource" | admin top-five matches public counts |
| 3 | AP-05 | P7 | "approvals readable" | queue rows equal stats pending (23) |
| 4 | AP-17 | P7 | "approvals readable" | Review opens details, then close |
| 5 | RM-01 | P7 | `/api/admin/stats` 200 | resources tab loads, total = stats |
| 6 | RM-06 | P7 | same | rows, counts, status render, no overflow |
| 7 | RM-09 | P7 | same | title/URL search finds a known resource |
| 8 | RM-11 | P7 | same | status filter counts = stats |
| 9 | RM-34 | P7 | same | Edit dialog opens populated, Cancel (no save) |
| 10 | RM-40 | P7 | same | paginator moves pages |
| 11 | RM-43 | P7 | same | `?page=`/`?status=` deep links reload to same state |
| 12 | SH-10 | P7 | "P6 `/sign-in` renders … `/profile` redirects" | signed-out `/admin` shows sign-in, no data |
| 13 | SH-17 | P7 | admin GETs | hash/query tab restore with Back/Forward |
| 14 | SH-22 | P7 | "approvals readable" | Approvals tab renders |
| 15 | SH-28 | P7 | admin GETs | Resources tab renders |
| 16 | SH-25 | P8 | "last Researcher job not a config failure" | Researcher tab shows latest job |
| 17 | RS-17 | P8 | same | config preview resolves, not preflight-blocked |
| 18 | SH-27 | P10 | "newest backup < 26 h" | Database tab shows table stats |
| 19 | SH-33 | P9 | "newest link scan < 26 h" | Link Health tab shows latest scan |
| 20 | LH-14 | P9 | same | degraded status matches the latest scan |

Why not more: per your rule I excluded reads Tier 1 fully covers (OV-01..04, 06, 10, 12; AP-01; DB-01/14; LH-04) and
retired them as "subsumed".

## Where I disagree with the heuristic (PLAN §8)
1. **Per-deploy 27 → 20.** Heuristic took every P0 read in AP/OV/RM. I dropped OV-01..04 (cards only navigate, covered by stats GET),
   the sort/toggle/checkbox/dialog-cancel rows (RM-07/10/12..16/20..23/25..27/29/30/33/35/36/39/41, AP-06..10/13/16/18..21) to monthly,
   and swapped in SH tab-render rows and RS-17/LH-14, which the heuristic missed because they carry P1/P2.
2. **Retire 172 → 259.** Heuristic retired by keyword only. I retired 87 more: loading/retry/empty/validation variants in Primary areas
   (RM-02..05/08/13..15/17/18/21/32/42/73; LH-01..03/12/13/18/19/23/27/29/32), Secondary cancel/load rows, and sign-out/rate-limit rows.
3. **Primary writes → tier2-weekly 177 → 24.** Heuristic sent every Primary-area P1/P2 row there (177), including form fields, dialog opens and cancels.
   Only rows that submit (Confirm/Save/Create/Run/Backup) write, so only 24 qualify. Field-entry rows are monthly (not saved).
4. **Monthly 237 Secondary → 310 monthly in total.** Monthly now also holds Primary reads and form-field rows. Four Secondary member rows
   (C6-MB-001/030/048/079) moved to tier2-weekly because they are Tier 2 chain steps.
5. **SH-04 and SH-07 retired**, not tiered: sign-out revokes all owner sessions (memory: never click), and wrong-password spam burns the shared 10/900 s limit. By PLAN §8 they fall in the SH Primary write bucket (41 SH rows).
6. **SH-23 (Edits tab)** is Incidental, so retired; the heuristic counted it as Primary.
7. **DB-05/09 (Seed / Clear & Re-seed confirm)** retired: wipes production, off-limits. DB-03/06/07 stay monthly as data-loss guards (open dialog, stop before typing `RESEED`).
8. **LH member link reports (LH-15..17, 20..22, 31)** are Incidental (0 reports ever, PLAN §1) but the heuristic kept them under Primary LH.
9. **GH-06/09 (Start Import/Export)** retired from routine runs: they write to the list repo. GH-23 retired: no UI control.

## Open items for the owner
- **RS-22/31/39/41/50** (Researcher launch, cancel, approve/reject discovery, Approve All) are Primary writes that spend money or change the catalog. Your rule puts them in tier2-weekly, but PLAN §5 Tier 2 has no Researcher step. Needs a decision (D-number) before they can run weekly.
- **EX-25 (Create backup)** is tier2-weekly per the rule; it is also the fix for B1 (manual-only backups).
- **SH-05/06** in Tier 2 use the owner login, which shares the 10/900 s limit; run once per batch.
- The per-deploy picks are my judgement on which admin UI reads matter most; swap rows freely, the bucket count is not fixed.

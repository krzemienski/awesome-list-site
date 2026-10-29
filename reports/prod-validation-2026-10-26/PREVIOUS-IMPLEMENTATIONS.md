# Previous implementations matrix

Mined from literal Claude Code JSONL transcripts, not summaries. Full extraction: `session-intent.json` and `session-intent.md` (202 sessions).

| Commit / PR | Files / behavior touched | Literal intent evidence | Alignment | Verdict |
|---|---|---|---|---|
| `e6c41571` / #28 | A/B/C implementation, D fixes; analytics, researcher, guided view, audit docs | Main session `d66e2531-0faa-4396-a9ee-d6a757349196.jsonl` ran 2026-10-25 02:16 through 2026-10-26 02:47 with 3 commits and improvement-wave steering; Piece A author `404c0d27-a298-49a7-b0ed-793011600fb3.jsonl`; Piece B author `103c36b5-0f08-430a-b227-a22321292a7f.jsonl`; inventory/review/fix sessions in full matrix | Time window + branch + exact file-area overlap | INTENT-MATCHED |
| `e12a4e67` / #29 | researcher delegation, dedup, phases, usage accounting, docs | Same main session `d66e2531…`; independent verifier session `25a8ee0b-2b35-4305-927c-34805f87520e.jsonl` states literal intent “INDEPENDENT VERIFIER for PR #29” | Main-session time/branch/file-area overlap; verifier intent exact | INTENT-MATCHED |
| `c25cd76f` and intermediate #30–#65 | production redeploy fixes and expanded functional/UI audit | Cycle-2 auditor sessions `73631166-3cfe-4083-98e2-b0095ad0ee97.jsonl`, `0deefbd8…`, `c77020ed…`, `6a07184c…`, `2b5dc9ea…`, `7e514d83…`; fix and review sessions in rows 259–282 of full matrix | Exact production-audit intent + branch/file overlap | INTENT-MATCHED for audited areas; individual commit-to-transcript mapping remains in full matrix |
| Any commit without a matching literal session | — | Full matrix marks missing first prompts as `intent unrecoverable` | No backfill from commit messages | INTENT-UNRECOVERABLE where applicable |

Framing that worked: author/reviewer separation, production-only browser proof at 1440/820/390, small root-cause PRs, redeploy after each fix group, explicit record of untriggerable paths. Existing reports are claims and do not replace fresh final-cycle proof.

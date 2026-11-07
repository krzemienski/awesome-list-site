# Reflection on the stopped omp orchestrator (01a17b96, 04:20Z–18:32Z 2026-10-27)

Written by the takeover lead (claude session ee76e4e1) from the omp handoff, its todo logs, its transcript, the ledger, PROGRESS.md and GitHub.

## What it delivered
- 27 PRs merged after 04:20Z (#98–#124), each with a current-main tsc/build gate. Production now serves bc1797b0 (= origin/main), ready 200.
- Real product fixes, not harness patches: synchronous Helmet titles (#123), closed-drawer visibility (#124), focus handoffs (#121), researcher minimum-duration continuation (#120) and its usage accounting (#122), 44px targets (#117, #119), offline/recovery feedback (#114).
- It classified tool artifacts honestly instead of "fixing" them: PC-068 (fill tool never fired onChange) and the export download timeouts (stale refs) were recorded as instrument artifacts.
- One genuine discovery approved through the real UI (resource 190359, catalog 3,825 → 3,826).

## Where it went wrong, with the lesson
1. **Coverage stalled.** The todo list went from 776 open to 727 open over 14 hours. Fixes shipped fast, but the 760-row inventory was driven one row at a time by a single lead, and the two clean confirmation passes never started. Lesson: drive rows in page-sized batches (one session per page, every control on it), and only open fix lanes off a batch result.
2. **Researcher duration chase spent the budget.** About 12 runs across Grok, Astra, Luna, GLM and Sol, roughly $29.88 of the $30 cap, and no run reached 30 minutes. Run #83 stopped on its own $3 cap 39 s short of 30 minutes. The cap was set without first measuring cost per minute. Lesson: measure $/minute on the first run and size the cap to the duration before relaunching.
3. **Deploy during an active run.** Run #82 was orphaned by a deployment restart, and its cost is still unknown. The run/deploy mutex was adopted only afterwards.
4. **The model rule broke delegation.** The required `/omniroute/cx/gpt-6.1-sol` route was unavailable, so scouts fell back to Kimi or Grok and were rightly refused. After that, the reviews for #117 and #121–#124 were lead-only. That is recorded in the ledger, but it means the independent-review gate was not met for those PRs. The deploy bridge also ran `claude -p --model sonnet` and the telemetry shows haiku/sonnet usage, both outside the Sol-only rule. Four deploy sessions (0027eb1a, f47a2bb6, d6b59fb1, fb749e1d) ended with zero tool calls, so they were wasted launches.
5. **More cookie exposures.** Two more agents printed raw owner Cookie headers during diagnostics. That makes at least five exposures in this run. Rotating the owner session is still the owner's decision.
6. **Stale ledger.** FINAL-1 to FINAL-10 are almost all PENDING, and PR123/PR124 were not recorded. Claims sat in a handoff file instead of the ledger.

## Carry-forward rules for this lead
- Prove each deploy in a real browser before closing its rows. This was done for PR124 (C6-PC-003/072) at 18:4xZ.
- No deploy while a researcher run is active.
- Do not count a gap or a fallback-model review as a pass.
- Batch the remaining 727 rows by page and width.

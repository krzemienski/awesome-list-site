# ux-admin-ai, cycle 04 (rev 582bdf67): PASS, 0 new findings, with open coverage gaps

The auditor used agent-browser with the owner cookie. It launched nothing, and its GitHub action was a dry-run preview only.

- **Fixed:**
  - AI-29: live hint "…less than about $0.43" matches job #2 ($0.4341, estimated). Shown at budget ≤0.43, absent at ≥0.4341.
  - Item 1: "Brief too short" appears only after Launch and clears on a mode switch.
  - AI-19, AI-20, AI-21, AI-23, AI-26 and AI-27.
  - AI-28, superseded by AI-29.
- **Not a defect:** /api/researcher/jobs ignores `offset`. The lead checked: the API pages by `limit` only (ai-jobs.ts:525-532), the UI raises `limit` ("Load more", ResearchWorkspace.tsx:52), and no client code sends offset.
- **#83:** the endpoint returns 200 with `cheapestSavingRun`. The non-numeric guard can't be exercised on production, but it was verified locally in the PR #83 review.
- **AI-16:** still open; owner decision.
- **Coverage gaps (a gap is not a pass), sent to a cycle-4 gap auditor:**
  - AI-22: enrichment custom http endpoint confirm.
  - AI-24: preview of a nonexistent repo.
  - AI-25: Pull disabled after a failed preview.
  - The static notices "A job is currently running" and "No enrichment jobs found" must have no live role.
  - The insecure-http checkbox.
  - The Researcher launch form at 820 and 390 touch, plus a keyboard walk.
- AI-14 and AI-18 stay UNVERIFIED by rule: they need a real launch or Pull.

## Gap audit (c4-admai-gap): PASS, 0 new findings. All six gap items resolved.

- **AI-22: PASS.** The enrichment Start button is disabled until the http-confirm checkbox is checked.
- **AI-24: PASS.** Previewing a nonexistent repo shows the alert "Repository not found (or not public)".
- **AI-25: PASS.** After a failed preview, Start Import in the Pull dialog is disabled.
- **Static notices: PASS.** They render `live="off"` (role=note) at BatchEnrichmentPanel.tsx:740 and :883. Neither can be reached on production without a job. The live DOM shows no alert or status role carrying their text.
- **Researcher insecure-http: PASS.** The checkbox gates Launch. Its hit area is 44×44 and centred at 390 and 820.
- **Launch form at 820/390 touch: PASS.**
  - All controls are ≥44px and the radios sit inside large labels.
  - Alerts wrap, including one with a 77-character host.
  - Tab order is logical, the ring is visible at every stop, and the radios move with the arrow keys (real key timing).
- **AI-14 and AI-18:** UNVERIFIED by rule, because they need a real launch or pull.
- **AI-16:** owner decision.
- **Incident:** the gap auditor ran `cat` on the owner cookie header file, which printed the session value into its own transcript. The lead found the value in no evidence file (0 matches in cycle-03, cycle-04 and .claude/evidence). The session expires at 12:19Z. Signing out to revoke it would end every owner session, which the run forbids, so the owner was told instead.

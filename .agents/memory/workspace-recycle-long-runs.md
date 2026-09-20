---
name: Workspace recycles kill long browser runs
description: The Replit workspace can restart mid-session (not OOM/CPU); how to keep deep DS runs and auditor panels recoverable.
---

The workspace container restarted four times in one session (~50–60 min apart)
with ≤5.4 GB/16 GB used and load <2. Every restart kills background shells,
the dev/artifact workflows, `/tmp`, and any running auditor subagent's browser
(auditors then report ERR_CONNECTION_REFUSED / 0 captures — a VOID panel, not
a verdict).

**Why:** cause is platform-side and unknown; it correlated with my long
`sleep ≥290` poll calls dying ("SERVER unexpectedly disconnected"), but
identical polling survived 72-minute runs earlier.

**How to apply:**
- Keep run logs under `.cache/runlogs/` (survives), never `/tmp`.
- Poll with `sleep ≤ 270`; check `uptime` on every poll — a small uptime means
  a recycle happened: restart both workflows, `--sweep` identities, and treat
  the run as cut.
- A cut deep run: keep the gates that completed as evidence, rerun only the
  cut gate with `--only <gate>` and say the evidence is composed (the `--only`
  run caps at INCOMPLETE for the rest).
- A cut auditor panel is VOID: move its dirs to `*-voided`, log it in the
  ledger, and rerun under a new panel name with no code change in between
  (the "no two panels without a change" rule is about executed panels).

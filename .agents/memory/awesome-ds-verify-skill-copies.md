---
name: awesome-ds-verify skill copies
description: Two copies of the awesome-ds-verify workspace skill exist; which one is authoritative and what its verdict semantics really are.
---
Rule: `.agents/skills/awesome-ds-verify/` (in-repo) is authoritative; `.local/custom_skills/awesome-ds-verify/` is a user-added mirror (platform `.fingerprint` file only). After any edit, copy repo → .local and `diff -rq` them.

**Why:** the mirror was added from an older snapshot and silently lacked later fixes (fonts.load stage-9 probe, run-scoped ink-accent evidence dir, 404-page auditing); an agent picking the wrong copy gets spurious FAILs.

**How to apply:** verdict semantics — PASS (exit 0) exists only for `--mode full --deep` with Clerk/admin env present; a non-deep full run tops out at INCOMPLETE (deep gates stay UNVERIFIED by design). Don't relax the runner; state the ceiling in prompts/docs. The not-found key screen answers 404 with the SPA shell and is audited as rendered. Under the frozen verbatim consensus skill, stage 6 is a permanent architectural residual (Clerk DOM) — the Fable orchestrator prompt in docs/prompts encodes this as `[STAGE6_POLICY]`.

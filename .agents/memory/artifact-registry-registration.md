---
name: Artifact registry registration failures
description: presentArtifact needs a registered artifact; registration attempts can silently fail — createArtifact rolls back on an env-update race, verifyAndReplaceArtifactToml "succeeds" without registering
---

**Rule:** before relying on `presentArtifact`, confirm the artifact actually exists via `listArtifacts()` — do not trust the success responses of the registration calls.

Observed failure modes (mockup-sandbox artifact, July 2026):
- `createArtifact` registers the artifact, then the platform auto-rolls it back moments later with an `ARTIFACT_NOT_FOUND` error during the follow-up env-var update — registry ends empty. Reproduced twice.
- `verifyAndReplaceArtifactToml` returns `success: true` (even with a TOML including service env vars) but `listArtifacts()` stays `[]`. Reproduced twice.

**Why:** four registration attempts across two APIs all left the registry empty — this is a platform-side race, not a TOML-content problem (the same TOML verified clean).

**How to apply:** if registration won't stick after ~2 attempts, stop burning time; fall back to pointing the user at the content directly (e.g. canvas boards via the Preview tab) and note the limitation. Canvas shapes remain live and screenshotable regardless of registry state.

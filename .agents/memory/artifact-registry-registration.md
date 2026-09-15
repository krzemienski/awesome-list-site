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

**Retirement boundary:** deleting a sandbox's canvas iframe shapes does not
deregister the artifact. Confirm retirement independently with `listArtifacts`;
do not delete a still-registered artifact's directory as a substitute.

**Why:** successful canvas deletion left the sandbox present in the artifact
registry. Canvas state and artifact registration are separate resources.

**How to apply (verified Sept 2026):** the registry is driven by a file watcher
on `<artifact-dir>/.replit-artifact/artifact.toml`. Deleting that marker is the
deregistration — the platform logs "Removed artifact: <title>" and
`listArtifacts` drops it within seconds. No callback exists. Order: back up the
marker → delete it → confirm with `listArtifacts` → `removeWorkflow` the
artifact's managed workflow (its parent reference in `.replit` goes with it) →
drop its `[[ports]]` entry → remove the directory with evidence preserved.
Never delete the directory while the marker is still registered.

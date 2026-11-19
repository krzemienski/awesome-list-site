---
name: review-pr
description: Review a requested awesome-list-site PR for correctness, safety and live verification gaps.
---

# Review a pull request

Use on request or when a risky change merits another reader. Review is not a routine release gate.

1. Read the PR diff, its target head SHA, existing threads and the affected callers.
2. Check the claimed behavior and failure paths. For changes involving auth, publication or data integrity, verify the owning boundary as well as the caller.
3. Describe actionable findings with a source reference, impact and verification. Distinguish local evidence from demonstrated live behavior. If the PR head changed during review, identify what remains unchecked.
4. Post findings only when asked. Respect GitHub permissions and actual policy refusals; no special verdict format, pin or waiting period.

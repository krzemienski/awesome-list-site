---
name: Verify helper evidence belongs to this project
description: A continued helper can return a plausible report for unrelated routes; local scope and evidence must match before accepting it.
---

**Rule:** Reject helper evidence that names routes or product concepts outside the assigned app, even when the report includes detailed screenshot claims and a correct-looking source-file count.

**Why:** A documentation-only follow-up returned film/TV routes and remote screenshot links instead of the resource-catalog documentation it was assigned. None of the requested local documentation was produced. The apparently precise report was not usable evidence.

**How to apply:** Check reported routes against the real inventory and verify local outputs exist. Exclude unrelated screenshots and claims rather than incorporating them into coverage totals. Continue from the independently verified files; do not assume a matching helper name proves the report's provenance.

**Rule:** When an existing audit publishes to fixed peer-owned evidence paths,
run it from an isolated, revision-matched copy of its unchanged source rather
than overwriting the previous owner's evidence during a regression run.

**Why:** An output-directory override relocates intermediate captures but not
the script's final publication paths, so a rerun silently replaces peer
evidence.

**How to apply:** Check the final publication destinations first; record the
source revision and the real app origin with the results. Isolation never
justifies changing the audit's implementation or adding a new browser stack.
---
name: 44px accessible floor vs frozen control heights
description: Why 12 artifact parity cells fail by design and what NOT to try again
---

# 44px accessible floor vs frozen control heights

The design-system artifact keeps a 44px accessible-target floor (`--profile-control-height`) on docs/showcase controls where the frozen docs page renders 26–36px controls. That floor alone produces the `artifact.docs.buttons` / `artifact.docs.forms` / `artifact.showcase` parity failures (1–3% on docs, 5–24% on the showcase) and they are an accepted, documented residual — not a bug queue.

**Why:** removing the floor takes those cells to ≈0.02% but breaks the hit-area contract recorded in the parity ledgers, and the `product-profile-drift` gate asserts the token per selector. Pseudo-element hit areas were rejected (inputs cannot carry them; swatches and pills overlap).

**How to apply:** do not spend another pass "fixing" those 12 cells; cite the ledger. Related lessons from the same pass: table fixes must stay on the one cell that needs them (a nowrap on a shared muted-cell class fixed researcher and regressed enrichment 375 from 0.1% to 5.3%); full parity runs stage in `/tmp` and copy at the end, so a workspace restart mid-run loses the run and leaves `__qa_test_parity_` users — sweep (`--sweep`) before rerunning.

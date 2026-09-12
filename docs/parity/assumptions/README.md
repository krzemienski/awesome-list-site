# Parity assumptions

Decisions a task had to make where the brief, the canonical design source, or
the codebase did not settle the question, written so later tasks can stay
consistent with them or consciously overturn them. One file per task, named
after the task slug (`docs/parity/assumptions/<task-slug>.md`, e.g.
`foundation.md`). Each assumption states the choice, the reason, and what would
have to be true to revisit it. If a later task overturns an assumption it must
say so in its own assumptions file and update the original entry with a pointer,
rather than silently diverging.

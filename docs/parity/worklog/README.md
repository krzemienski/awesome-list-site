# Parity worklog

One fragment per task, named after the task slug (`docs/parity/worklog/<task-slug>.md`,
e.g. `foundation.md`, `header.md`, `admin-review-queues.md`). A fragment records
what was found, what was changed and why (including the alternative that was
rejected), which gates were run with their result, and any known gap that was
left on purpose. Write it while working, not from memory afterwards; every claim
that can be checked must point at a file under `docs/parity/evidence/<task-slug>/`
or at a reproducible command. Decisions that later tasks must honour go in
`docs/parity/assumptions/<task-slug>.md` instead of being buried here.

---
name: Evidence runners drift from shared identity helpers
description: A browser evidence runner that hard-codes an identity assertion breaks silently when the shared helper changes the demonstrator's name shape; assert via the helper's exported constants.
---
The disposable-admin helper changed the demonstrator's name shape (added a
last name; the auth endpoint returns one joined name). An evidence runner that
hard-coded the old first-name equality then marked every protected row
INCOMPLETE as "wrong identity" although the DB row and Clerk user were correct.

**Why:** cost a whole matrix run; the wording pointed at identity provisioning,
not at the runner.

**How to apply:** assert identity via the helper's exported constants and
include the observed value in the error. A killed run leaves its disposable
admin behind (teardown never ran) — run the helper's sweep before resuming.
Determinism mode wipes the shared harness evidence dir — restore it from git
afterwards unless that wipe is meant to be committed.

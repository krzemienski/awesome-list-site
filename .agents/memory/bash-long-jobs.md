---
name: Long-running jobs under the 120s bash cap
description: Pattern for multi-minute scripts when nohup/background processes get killed
---

**Rule:** background processes (`nohup ... &`) launched from the bash tool are killed when the bash session ends — they do NOT survive. For any job longer than ~100s, make the script resumable: persist a cursor/state file + append-only JSONL output, give the script an internal time budget (~88s) so it exits cleanly, and re-invoke until done.

**Why:** a 2,365-URL link scan died silently twice under nohup before switching to budget+cursor batching, which completed reliably across ~8 invocations.

**How to apply:**
- Write state after every chunk; on start, resume from state. Idempotency note: append happens before cursor write, so a hard kill can duplicate rows — dedupe by id when consuming results.
- Even with an internal budget, the bash cap may still kill the process mid-chunk (output lost) — the state file is the source of truth, so just check it and re-invoke.
- Log progress to a file, not just stdout (stdout is lost on timeout kills).

---

**Bash reserved-var gotcha:** never capture command output into `UID` (or other shell-reserved names) — `UID=$(...)` fails silently as a readonly-var error but the script keeps running and `$UID` then resolves to the shell's real uid (e.g. `1000`), so downstream API calls hit the wrong id. Cost a full re-run of a QA role-promotion flow. Use a distinct name like `RUID`. **Why:** the failure is silent (non-fatal, wrong value) rather than a hard error, so it looks like an API/logic bug, not a shell bug.

## mv to /tmp is cross-filesystem
`mv <workspace-dir> /tmp/...` is a cross-device move: it degrades to copy-then-delete and **deletes source files as it copies**, so a timeout mid-move destroys the source. For directory shuffles inside the workspace use same-filesystem renames (`mv a b` within the workspace, instant + atomic); to stage things in /tmp use `cp -r` and delete only after verifying the copy. **Why:** a sandbox-directory swap via `mv` to /tmp timed out mid-copy and had already eaten part of the source; recovery required reconstructing from the partial copy.

## /tmp scripts + heredoc-then-run
Node scripts placed in /tmp cannot resolve workspace node_modules (ERR_MODULE_NOT_FOUND for e.g. playwright) — write the script inside the workspace instead. Also, a `cat > file <<EOF` heredoc chained with `&&`/`;` into a long `timeout node` run is sometimes killed as "waiting on user input"; write the file with the write tool and run node in a separate command.

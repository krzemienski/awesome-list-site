---
name: Frozen reference roots in drift gates
description: How to keep a hardcoded-value drift gate green when its scope includes a directory that is contractually byte-identical to an external archive.
---

**Rule:** a directory that must stay byte-identical to an upload (the
canonical design archive) is never a scanned surface of a Stage 5 / palette
drift gate. Exclude it under an explicit, reasoned "frozen reference" entry
in BOTH the executable and the documented scope contract, and make the gate
prove the exclusion on every run by hashing the archive members (read
straight out of the zip; digest pinned in the sync record) against the
working tree. Verbatim ports of that archive inside a real surface (the
registered artifact) are scanned normally and take reasoned `DS-OK` tags at
the definition site — the same "per-system skin" category the audit skill
already accepts — until the owning task can tokenize them under a pixel gate.

**Why:** a frozen directory can carry neither tokens nor `DS-OK` tags, so a
gate that scans it can only ever report findings nobody is allowed to fix.
That is exactly what happened when the archive was resynced: the shrink-only
ratchet went red one commit before the last green build and stayed red, and
because the gate is a registered validation command it silently blocked
completion of every later task. "Treat it as informational" is not an option
the platform offers.

**How to apply:** when a drift gate turns red on files you may not edit, ask
first whether the files are a reference corpus. If yes: reasoned exclusion +
archive verification (hash, member count, no symlinks) + a mutation probe in
the evidence dir; ratchet the baseline only after regressions are zero. If
no: tokenize or tag; never pin exceptions to force green.

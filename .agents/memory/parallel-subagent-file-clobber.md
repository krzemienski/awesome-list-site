---
name: Parallel subagents can clobber shared-file edits
description: Root/shared files edited by the main agent can be silently reverted by a concurrently running subagent; re-grep before finishing.
---

**Rule:** When subagents run in parallel with main-agent edits, any file both might touch (README.md, CHANGELOG.md, shared configs) can be silently reverted — a subagent that read the file before your edit will write back the old content.

**Why:** During a docs-audit sweep, main-agent README link fixes were lost mid-session; content edits from one batch survived while later link edits vanished, and the file's line offsets shifted — the tell was edit-confirmation line numbers disagreeing with a later grep.

**How to apply:** Reserve shared/root files for the main agent only (scope subagents to disjoint file sets), do main-agent edits to contested files AFTER all subagents finish, and before wrapping up re-grep each shared file for the exact strings you changed rather than trusting earlier edit confirmations.

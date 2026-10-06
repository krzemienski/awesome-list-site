---
name: Design-system verify skill copies
description: Which copy of the DS verification skill is authoritative and why the frozen one always fails here.
---

- Repo copy is authoritative; mirror into .local after edits: [awesome-ds-verify-skill-copies.md](awesome-ds-verify-skill-copies.md). PASS needs deep mode plus auth env; a non-deep full run caps at INCOMPLETE.
- The frozen verbatim skill always FAILs this app: [verbatim-skill-vs-shadcn-hooks.md](verbatim-skill-vs-shadcn-hooks.md) — its class predicate does not know about the data-ds hooks this app uses by design.

**Why:** two copies drift, and the embedded one is a different skill than the in-repo one.
**How to apply:** md5 both copies before running an audit panel.
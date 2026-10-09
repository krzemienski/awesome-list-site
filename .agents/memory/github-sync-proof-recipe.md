---
name: GitHub sync proof lessons
description: Durable lessons for proving admin GitHub import/export behaviour without touching the live list repo.
---

- Prove GitHub sync against a disposable PRIVATE repo, never a public one: the anonymous raw-file fallback succeeds on public repos and hides auth regressions in the file fetch.
- A rejected-credential failure only appears when EVERY credential source is broken at once (Replit connector, `GITHUB_PERSONAL_ACCESS_TOKEN`, `GITHUB_PUSH_TOKEN`, `GITHUB_TOKEN`); breaking one lets the fallback chain quietly succeed.
- awesome-lint is informational on import, so a lint-invalid list can still write rows; any import entry point (direct, Pull, process-queue) must report outcome/counts, never "rejected".
- Every queued entry point must pass queue-row ownership to the import, or each import leaves two queue rows; count rows in SQL per entry point.

**Why:** a first public-repo-style proof missed that private repos could never be imported, and review later caught a second queued entry point still double-writing rows.
**How to apply:** any change to GitHub sync, its queue/history projection, or the panel polling.

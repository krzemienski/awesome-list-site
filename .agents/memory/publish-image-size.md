---
name: Publishing image size
description: Preserve development evidence while reducing the production image.
---

**Rule:** Trim expendable development bulk only from the publishing copy after quality gates finish. Preserve the workspace evidence and browser tools.

**Why:** Publishing passed compilation and bundle budgets but exceeded the 8 GiB image-layer limit. Baseline captures and browser binaries contributed gigabytes independently of the JavaScript bundle size. The user approved publishing-copy cleanup, not workspace deletion.

**How to apply:** Require publish mode and the platform deployment marker, use a narrow allowlist, reject symlinks, and verify deletion on a disposable copy. Never set the deployment marker in the real workspace just to test cleanup.
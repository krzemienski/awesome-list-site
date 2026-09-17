---
name: Publishing image size
description: Preserve development evidence while reducing the production image.
---

**Rule:** Trim expendable development bulk only from the publishing copy after quality gates finish. Preserve the workspace evidence and browser tools.

**Why:** Publishing passed compilation and bundle budgets but exceeded the 8 GiB image-layer limit. Baseline captures and browser binaries contributed gigabytes independently of the JavaScript bundle size. The user approved publishing-copy cleanup, not workspace deletion.

**Publish build env facts (observed in build logs):** REPLIT_DEPLOYMENT=1 is runtime-only (absent during the build command); REPLIT_DEV_DOMAIN IS present in the publish build container (2026-09-17 build failed on a guard assuming it meant "workspace"). Production env vars (e.g. REPLIT_PUBLISH_IMAGE_TRIM=1) are visible to the build command. Never infer "this is the workspace" from REPL*/REPLIT_* variables — only the production-only marker is a reliable discriminator.

**Frozen baselines:** parity baseline runs are committed with write bits removed (dirs 0555); rmSync on them EACCESes at unlink (needs parent-dir write). Any cleanup must re-grant owner write on directories first — this is why the 2nd 2026-09-17 publish failed.

**The 8 GiB limit counts EVERY layer**, including the Nix layer. This project's `[nix] packages` carry Chromium (1.5 GiB closure alone) + GTK4/GStreamer for WebKit tests, so the repo copy must stay well under ~4 GiB. Trimming only baselines + browser cache was not enough (third 2026-09-17 publish still failed on size); the allowlist also drops `.git` (2.4 GiB packs, runtime only sees the baked BUILD_REVISION), docs/parity* evidence, test output dirs, and `attached_assets` (Vite input already in dist). If size fails again, the remaining lever is removing the browser Nix packages — that breaks workspace Playwright runs, so it is the user's call.

**How to apply:** Require publish mode and the platform deployment marker, use a narrow allowlist, reject symlinks, and verify deletion on a disposable copy. Never set the deployment marker in the real workspace just to test cleanup.
---
name: Radix dialog close lock vs fixed sleeps
description: body{pointer-events:none} persists through Radix close animation; harness clicks after fixed sleeps race it in slow containers
---

Radix Dialog/AlertDialog keeps `body { pointer-events: none }` until the close animation finishes. A Playwright harness that Escape-closes one dialog, sleeps a fixed interval (e.g. 300–500ms), then clicks the next trigger will pass on a fast workspace but flake in slow environments (the publish build container): the click — even `force: true` — dispatches into the lingering lock and the next dialog never opens. This blocked a publish with `dialog did not open`.

**Why:** fixed sleeps encode workspace timing; the build container is slower and the close animation hasn't released the lock yet. `force: true` skips actionability checks but still hit-tests through the locked body.

**How to apply:** in any dialog-sequencing harness, never sleep — condition-wait on real state:
- before clicking a trigger: wait until no `[data-state="open"]` dialog exists AND `getComputedStyle(body).pointerEvents !== 'none'`; if that wait times out, FAIL the check (proceeding would measure the stale dialog under the next check's name — a false pass).
- after clicking: `waitForSelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]')` with one retry click.
- scope any metric `evaluate()` to the open dialog selector, not the first dialog in the DOM.

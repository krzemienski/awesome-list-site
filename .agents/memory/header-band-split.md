---
name: Parity header-band split
description: How the parity runner judges the app header band vs the body, and the rule for adding approved shell deviations.
---
Rule: at widths listed in APPROVED_HEADER_DEVIATIONS (runner.mjs), the header band and the body get separate verdicts. The body must stay ≤0.5% and the band ≤5%. Other widths keep the whole-canvas rule. Nothing is masked.
**Why:** the user approved two tablet header deviations (menu button at 768–1024, "Search" word). On short admin pages the header band alone pushed rows over 0.5%. The user aligned the other two differences: full 44px boxes, and a one-letter initial.
**How to apply:** add a deviation only with explicit user approval, and record it in docs/audit-578/verify/I05.md. Re-calibrate the 5% budget from measured runs: at 768, Brutalist measures 4.3–4.4% and a 4% budget fails it. Band height comes from live header rects (60px at 768/1024, not 61).

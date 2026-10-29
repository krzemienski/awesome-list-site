# C7 AX01 (ux-a11y: landmarks, hashes, drawer/sheet, focus order, targets, contrast, motion) — partial
Worker: sonnet a29f4aeef1193ec66. Revision 130e5829. Evidence: e2e-evidence/cycle-07/AX01/.
Verdict: 0 confirmed defects.
- C7-AX01-01 DISMISSED: journey step anchor smooth scroll under reduced motion. origin/main JourneyDetail.tsx uses `behavior: scrollBehavior()`, and lib/scroll-behavior.ts:4 returns "instant" under prefers-reduced-motion. The worker's claim of a hard-coded "smooth" was wrong; the sampler also saw no animation.
- Admin resource-table checkboxes "32px" DISMISSED: admin-catalog-resources.css:325-334 documents that the Checkbox primitive centres its own 44px hit area below 1024px, and an ::after widens it to 44px above. 32px is the drawn box only.
- Contrast: the accent-chip flags came from attribute swaps without a reload (unreliable). Reload runs (orange, violet) gave 0 failures; emerald editorial dark is an unconfirmed possible case. Carried to AX01b with a full reload-based matrix.
PASS: AX-001, 002, 003, 004 (1440). PARTIAL: AX-005 (no 820), 006 (390 only), 007 (390 grid only), 008 (theme/accent/font radios not reached signed-out), 009 (no Tab walk at 820/390), 010, 011, 012.
Owner homeLayout changed index -> curated -> restored index; lead re-read: index.
Remainder -> AX01b.

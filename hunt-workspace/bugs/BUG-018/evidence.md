# BUG-018 — Forgot-password page renders left-aligned instead of centered at 1440

**Severity:** MEDIUM
**Affected page:** https://awesome.video/forgot-password
**Affected viewport:** 1440 (and 768 — same bug)

## Reproduction
1. Open https://awesome.video/forgot-password at 1440×900.
2. The card sits in the left half of the main content area, leaving ~370px of empty space to its right.
3. Compare with /login (also at 1440), which is properly centered.

## Expected
Like /login, /forgot-password should center horizontally within the main content column.

## Actual
The card hugs the left edge of the content column.

## Evidence
- `screenshots/public2_forgot-password_1440.png` — card is left-aligned
- Confirmed twice — re-run shows identical off-center layout.

## Fix prompt
Task: /forgot-password at 1440px left-aligns the card instead of centering it.

Reproduction: open https://awesome.video/forgot-password at 1440×900; card left edge sits flush against the sidebar.
Acceptance: card is horizontally centered like the /login page in the same column.
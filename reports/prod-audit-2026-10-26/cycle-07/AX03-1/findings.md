# AX03-1 — cycle 7 (live 762a6c0d)

Verdict: ISSUES (3 LOW candidates, in triage). SH-07 is BLOCKED-BY-POLICY.

| Row | Verdict | Widths | Evidence |
|---|---|---|---|
| SH-06 wrong admin password | PASS (+ candidate 01) | submitted once at 1440; inspected only at 820 and 390 | sh06-1440-error.png, sh06-820.png, sh06-390.png |
| SH-07 submit after rate limit | BLOCKED-BY-POLICY | none | would require tripping the rate limit |
| SH-08 submit offline | PASS | 1440/820/390 | sh08-390-offline.png, sh08-820-offline.png |
| SH-09 /admin while auth/user pending | PASS (+ candidates 02, 03) | 1440/820/390 | sh09-1440-pending.png, sh09-390-pending.png |

Candidates (LOW, IN TRIAGE):
- C7-AX03-1-01: the admin password input gets no aria-invalid and no aria-describedby after "Incorrect password." The alert is announced, but the field isn't marked invalid, so the `aria-[invalid=true]` styling never applies.
- C7-AX03-1-02: the "Verifying access..." guard has no role=status or aria-live. With /api/auth/user held forever it never times out or offers retry. That was an artificial forever-hold, so triage must check what happens on a real timeout.
- C7-AX03-1-03: the guard spinner and text sit about 20px left of centre at all three widths. A stray dark rectangle appears at upper right at 1440. Lead confirmed both in sh09-1440-pending.png.

- QA rows: none. Settings: none changed. Wrong-password submits: 1, out of a limit of 1. Revision: 762a6c0d at start and at end.
- Lead spot-check: sh09-1440-pending.png shows the off-centre spinner and the dark box at x≈840-1360. sh06-1440-error.png shows the alert text below the field.

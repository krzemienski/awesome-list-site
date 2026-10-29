# PS05-1 — cycle 7 (live 762a6c0d)

Verdict: ISSUES (3 candidates, in triage). Gaps: the 049 offline state at 820 and 390, and the 051 non-admin half (BLOCKED: no second identity).

| Row | Verdict | Widths | Evidence |
|---|---|---|---|
| C6-PS-049 auth unavailable / offline | FAIL (candidate 01). Offline driven at 1440 only. | 1440 (offline), 1440/820/390 (Clerk fetch rejected) | offline-signin-1440.png, logout-fail-*.png |
| C6-PS-050 /logout + failure | PASS for the guest path. Candidate 02 on the failure copy. Signed-in half BLOCKED-BY-POLICY. | 1440/820/390 | logout-fail-1440b.png, logout-fail-390.png |
| C6-PS-051 protected-page guards | PASS for the guest half. Non-admin half BLOCKED. | 1440/820/390 | guard-admin-820.png |
| C6-PS-052 machine/document surfaces | PASS (candidate 03 noted) | n/a | f_*.txt |

Candidates (IN TRIAGE):
- C7-PS05-1-01 MEDIUM: /sign-in reached by a client-side click while offline stays on "Checking your sign-in status…" for more than 45s, with no Retry and no timeout. It is still stuck 8s after reconnecting. Lead confirmed in offline-signin-1440.png.
- C7-PS05-1-02 LOW: guest /logout with auth fetch failing shows two stacked alerts. One says "couldn't verify … browse as a guest" with Retry. The other says "Failed to fetch. You are still signed in." with Try again. The second contradicts the first for a guest. Lead confirmed in logout-fail-390.png.
- C7-PS05-1-03 LOW: robots.txt Disallow does not list /contributions, /notifications, /onboarding, /logout or /sign-in. Those pages redirect and are noindex, so the impact is crawl budget only.

- QA rows: none. Settings: none changed. Revision: 762a6c0d.

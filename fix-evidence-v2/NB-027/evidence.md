# NB-027 (LOW) — Settings hub Security card → /profile (wrong tab)
**Verdict: FIXED.** Security card on /settings now links to `/profile?tab=security`.

Live probe (Playwright, logged in as admin, July 20 2026):
```
login status: 200
NB-027 security card href: /profile?tab=security
NB-027 landed: http://localhost:5000/profile?tab=security | active tab: Security | password UI elements: 4 PASS
```
Clicking the card lands on /profile with the Security tab active (Radix `data-state="active"`) and the change-password UI present. Probe: /tmp/nbev/probeB.mjs.

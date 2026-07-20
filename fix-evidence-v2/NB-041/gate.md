# NB-041 (incl. merged NB-052) — audit log error state indistinguishable from empty — VG PASS (July 20, 2026)

**Fix**: `AuditTab.tsx` destructures `isError` from the query; fetch failures now render a distinct destructive alert (`alert-audit-error`: "Couldn't load the audit log — The server returned an error while fetching entries. Your filter is still applied — try again.") with a "Try again" button (`button-audit-retry`) instead of the empty-table "No audit log entries match" copy.

**Proof (live, dev, Playwright authed admin)**:
1. Normal load: `/admin/audit` renders table rows — `NB-041-audit-normal.png`.
2. Forced 500 (route interception on `/api/admin/audit-logs*` → 500 JSON): error alert rendered, no empty-state copy — `NB-041-audit-error-state.png`. Alert text captured: "Couldn't load the audit log … Your filter is still applied — try again. Try again".
3. Interception lifted, clicked `button-audit-retry`: table rows returned — `NB-041-audit-retry-recovered.png`.

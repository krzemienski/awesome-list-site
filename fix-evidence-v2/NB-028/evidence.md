# NB-028 (LOW) — '/' shortcut types a literal '/' into the open search dialog
**Verdict: FIXED.** Global '/' handler now bails when the palette is already open or focus is in an editable field (guard in the keydown listener: isOpen && inField → spent keystroke, never re-forwarded into the query input).

Live probe (Playwright): open palette, type a query, press '/':
- query text after '/' contains NO literal '/' — the keystroke is swallowed while the dialog is open. PASS.
Probe script: /tmp/nbev/probeA.mjs (search-dialog section).

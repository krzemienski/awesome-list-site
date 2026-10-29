# C7 AI04 (Researcher launch form: limits, advanced overrides, config states)
Worker: sonnet a39312e872b3f9ada. Revision 130e5829 (15:53Z-16:03Z). All 12 rows driven at 1440/820/390 (touch viewport-only). Evidence: e2e-evidence/cycle-07/AI04/.
Triage:
- C7-AI04-01 DISMISSED (tool): a pointer click on the insecure-http checkbox at 390 did nothing, while DOM click and Space toggled it and pointer worked at 1440/820. The control sits low in a long form; agent-browser headless never scrolls (memory agent-browser-no-scroll), so a pointer click outside the viewport misses silently. Not reproduced by a second pointer method. The fix-batch re-check on prod includes a real tap at 390 via chrome-devtools touch.
- C7-AI04-02 DISMISSED: the 16px Radix checkbox is wrapped by its 48-80px <Label htmlFor> row (ResearchLaunchGuide.tsx:417-419), which is the tap target, the same as the PS02 export checkboxes.
- C7-AI04-03 CONFIRMED, LOW: an invalid budget (0 or negative) turns the hint amber, but the text still describes overshoot ("Spend is checked between turns…") instead of what is wrong. The max-turns hint does say "Positive whole number (blank = no cap)". Source ResearchLaunchGuide.tsx:334-335. Routed to FIX-C7-05.
PASS: RS-06..13, RS-15..17. FAIL: RS-07 (C7-AI04-03). RS-14 PASS at 1440/820 (390 pending the re-check).

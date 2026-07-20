# NB-029 (LOW) — Recent-searches auto-saves junk keystroke strings
**Verdict: FIXED.** Recents are saved only on explicit commit (Enter → /search nav, or clicking a result), not on debounce settle.

Live probe (Playwright):
```
NB-029 recents after junk settle: null PASS
NB-029 landed on: http://localhost:5000/resource/185034   (commit path saves)
```
Typing garbage and letting the debounce settle leaves localStorage recent-searches empty; selecting a result saves the committed query. Probe: /tmp/nbev/probeA.mjs.

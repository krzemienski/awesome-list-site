# NB-030 (LOW) — Search Enter dead no-op until async results render
**Verdict: FIXED.** Enter with no active/highlighted item now falls back to full-search navigation.

Live probe (Playwright): open palette, type "transcoding tools", press Enter immediately (before results render):
```
NB-030 URL after instant Enter: http://localhost:5000/search?q=transcoding%20tools PASS
```
Probe: /tmp/nbev/probeA.mjs.

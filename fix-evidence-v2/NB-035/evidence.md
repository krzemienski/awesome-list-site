# NB-035 (LOW) — Transient ZERO-h1 window during hydration
**Verdict: FIXED.** client/src/main.tsx no longer demotes the SSR h1 eagerly; a MutationObserver on the React root demotes the SSR preview h1 only in the same tick React's own h1 appears (observer disconnected in remove()). At no polled frame does the document have 0 or 2 h1s.

Live probe (Playwright, rAF-resolution poll of document.querySelectorAll('h1').length across the entire load):
```
NB-035 /: frames=441 firstH1@0 zeroFramesAfter=0 multiH1Frames=0 PASS
NB-035 /category/intro-learning: frames=444 firstH1@0 zeroFramesAfter=0 multiH1Frames=0 PASS
NB-035 /resource/185034: frames=435 firstH1@0 zeroFramesAfter=0 multiH1Frames=0 PASS
```
Exactly one h1 at every sampled frame from first paint onward. Probe: /tmp/nbev/probe35.mjs.

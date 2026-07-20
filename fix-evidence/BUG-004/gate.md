# VG-004 — AviSynth outbound link dead (BUG-004) — PASS

**Finding**: Resource 184921 ("AviSynth") pointed to
`http://avisynth.nl/index.php/Main_Page`. Live probe July 19, 2026:
`HTTP/1.1 508 Loop Detected` (Retry-After 14400) on both schemes — origin is
in a permanent redirect loop, not a transient timeout.

**Root-cause candidates considered**:
1. Transient origin outage → rejected: 508 with `Retry-After: 14400` from
   Apache, consistent across schemes and repeat probes (run21 already saw
   507/508 on this host).
2. Bot-block false positive → rejected: 508 is a server-side loop error, not
   an access-control response (403/429/timeout class).
3. Domain genuinely broken → selected: repoint to the project's maintained
   successor, `https://github.com/AviSynth/AviSynthPlus` (AviSynth+ is the
   active continuation; repo links back to avs-plus.net).

**Fix**: `scripts/run22-link-fixes-prod.ts` (idempotent, URL-matched, via the
live admin API — same mechanics as run21). Dev applied: 1 repoint, 0 failures
(`evidence/run22/link-fixes-dev.json`). Exactly one avisynth.nl row exists, so
no dup-collision path was needed. Prod journaled: run the same script against
prod after republish.

**Gate evidence** (live dev):
- `curl-transcript.txt` — `curl -sIL -m 15 https://github.com/AviSynth/AviSynthPlus`
  → `HTTP/2 200` direct, no redirect chain.
- `bug-004-resource-page.png` — /resource/184921 displays the corrected URL
  (both the "Visit Resource" button and the URL field link to
  github.com/AviSynth/AviSynthPlus); page renders correctly (title, tags,
  related resources intact).
- `bug-004-destination.png` — the destination loaded in a real Chromium
  browser: AviSynth/AviSynthPlus repo, status 200, no interstitials.

**Verdict: PASS**

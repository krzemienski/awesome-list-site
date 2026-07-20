# VG-007 — Non-canonical resource URLs self-canonicalize (BUG-007) — PASS

**Finding**: `/resource/0185020`, `/resource/185020%20`, `/resource/185020%09`
each returned HTTP 200 and self-canonicalized the invalid variant
(`before.txt`: canonical + og:url pointed at the variant URL itself) — a
duplicate-content trap.

**Fix** (`server/og-middleware.ts`): new canonicalization rule for
`/resource/:seg` — decode the segment, trim whitespace; if it is a plain
integer whose normalized form (`String(parseInt(...))`, strips leading zeros)
differs from the raw segment, emit a **301** to `/resource/{normalizedId}`,
preserving any query string. Non-numeric segments still fall through to the
existing soft-404 path. Same-origin safety: the Location is built from a
digits-only normalized id, so no open-redirect surface.

**Gate evidence** (live dev):
- `before.txt` — all three variants: 200 + self-canonical (bug reproduced).
- `after.txt` — redirect following disabled:
  - `/resource/0185020` → 301 `Location: /resource/185020`
  - `/resource/185020%20` → 301 `Location: /resource/185020`
  - `/resource/185020%09` → 301 `Location: /resource/185020`
  - canonical `/resource/185020` → 200, canonical + og:url = `https://awesome.video/resource/185020`
  - Regression probes: `/resource/notanid` → 404 (soft-404 intact);
    `/resource/0185020?ref=x` → 301 preserves `?ref=x`; `/resource/0` → 404.
- `bug-007-canonical-page.png` + browser probe: loading `/resource/0185020` in
  real Chromium lands on `http://localhost:5000/resource/185020`;
  post-hydration DOM has exactly **1** canonical tag and og:url, both
  `https://awesome.video/resource/185020`; page renders (h1 present).

**Verdict: PASS**

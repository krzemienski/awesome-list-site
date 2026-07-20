# VG-028 — Ten plain-HTTP destinations (BUG-028)

**Verdict: PASS** — July 20, 2026, live probes + dev data pass applied

## Disposition of all 10 audit URLs (prod corpus)
| ID | URL | Disposition |
|---|---|---|
| 184921 | avisynth.nl | Already repointed → https://github.com/AviSynth/AviSynthPlus (BUG-004, run22-link-fixes journal) |
| 186676 | umezawa.dyndns.info | Already repointed → https://github.com/umezawatakeshi/utvideo (BUG-005, run22-link-fixes journal) |
| 184862 | zuggy.wz.cz | HTTPS = hoster 403 "HTTPS není dostupné" page; dev's broken https:// reverted to http:// + annotated |
| 185555 | www.cinepaint.org | TLS connection refused (errno 111) — HTTP kept + annotated |
| 186553 | infrarecorder.org | Cert is for kindahl.com (mismatch) — HTTP kept + annotated |
| 185277 | lives-video.com | Cert is for *.web-hosting.com (mismatch) — HTTP kept + annotated |
| 184952 | www.live555.com | TLS handshake reset (errno 104) — HTTP kept + annotated |
| 186560 | www.mplayerhq.hu | Cert is for ffmpeg.org (mismatch) — HTTP kept + annotated |
| 186164 | www.dranger.com | Cert is for *.securedata.net (mismatch) — HTTP kept + annotated |
| 186631 | slowmovideo.granjow.net | Cert is for bareware.granjow.net (mismatch) — HTTP kept + annotated |

Full openssl s_client transcript: `tls-transcript.txt` (this directory).
All 8 HTTP destinations verified alive over HTTP (200) at probe time.

## Fixes applied (dev; journaled for prod)
- `scripts/run22-data-fixes-prod.ts` (new): reverts zuggy.wz.cz broken https→http,
  appends the annotation " Note: the official site is served over plain HTTP — the
  host does not support HTTPS." to every HTTP-only resource (marker-idempotent,
  fresh-read-before-write, journaled to `evidence/run22/data-fixes-<env>.json`).
- Dev run: 10 writes, all status 200 (includes 2 non-public pending/rejected
  lives-video rows also annotated — harmless). Second run: 10/10 no-ops.

## Pass criteria
- TLS-capable destinations use HTTPS: the 2 TLS-capable ones were repointed to
  their canonical GitHub homes (BUG-004/005); no other flagged host supports TLS
  for its own hostname — **PASS**
- TLS-less destinations clearly annotated: 8/8 public HTTP resources carry the
  user-visible note (verified via /api/awesome-list scan: annotated 8/8; screenshot
  `mplayer-annotation.jpg` shows it rendered on /resource/186560) — **PASS**
- No secure destination downgraded: the only https→http change is zuggy.wz.cz,
  whose HTTPS serves the hoster's "HTTPS not available" 403 page (i.e. it was
  never a working secure destination); journal confirms no other URL fields
  touched — **PASS**

## Prod follow-up (after republish)
`ADMIN_PASSWORD=... npx tsx scripts/run22-data-fixes-prod.ts` — zuggy is already
http:// on prod (rule no-ops on URL), annotations will apply to the 8 rows.

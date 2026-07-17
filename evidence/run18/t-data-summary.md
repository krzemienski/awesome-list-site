# T-DATA — run18 corpus data fixes (dev applied; prod journaled)

Script: `scripts/run18-data-fixes-prod.ts` (run17 pattern: live admin HTTP API,
base-configurable, guarded + idempotent). Validated end-to-end against dev via
`PROD_BASE=http://localhost:5000` — the exact code path prod will use after republish.

| Finding | Dev result | Detail |
|---|---|---|
| NB-014 | 216 descriptions cleaned → sweep now 0 | trailing GitHub " - owner/repo" og:description suffix stripped |
| NB-015 | ~99 titles re-cased → naive-token sweep now 0 | whole-word brand map (FFmpeg/VLC/iOS/HLS/JS/MP4Box/HLS.js/P2P/NGINX/SCTE/...) |
| NB-016 | 43 placeholder descriptions cleared (24 "— video development resource from", 19 "- Resource from") → 0 | full-string template match, cleared to "" (card omits empty) |
| NB-052 | 0 matches in dev (tight bio-phrase patterns) | dev descriptions already enriched; prod sweep runs same patterns + journals matches |
| NB-008 | 185380 URL → Wayback snapshot (verified 200; original curl 404 ×confirmed) | journey/6 step 1 destination |
| NB-043 | 185228 → optiview.dolby.com/docs/millicast/client-sdks/ (exact successor, 200); 187178 → Wayback (doc.quanteec.com 502 confirmed) | |
| NB-046 | 185662 → "FFmpeg (GitHub mirror)", 185810 → "FFmpeg Docker Images (jrottenberg)"; canonical 185214 "FFmpeg" kept | no duplicate titles remain |
| NB-049 | 186268 → "EZDRM + Bento4 Open Source DRM Guide", 186253 → "DASH-IF IOP v3.2 Change Summary (vs v3.1)" → filename-title sweep 0 | |
| NB-027 | dev journey/6 clean (18 steps, no dup 186145) — prod-only; script deletes later dup row(s) | |

Idempotency proof: second dev run → every step no-op
(`evidence/run18/data-fixes-dev-idempotency-rerun.json`).

**Prod follow-up after republish**: `ADMIN_PASSWORD=... npx tsx scripts/run18-data-fixes-prod.ts`

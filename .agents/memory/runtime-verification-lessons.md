---
name: Runtime and verification lessons
description: Index of runtime edge cases and verification lessons retained during memory consolidation.
---

- [Symbol glyph fallback faces](symbol-glyph-font-faces.md) — unicode-range family augmentation must mirror every weight/style (Chrome); Vite inlines <4KB fonts; no url rebasing.
- [Retry predicates that never stop](query-retry-predicate-forever.md) — a local useQuery retry fn ignoring failureCount loops 5xx forever (skeleton, no error UI); folded admin panels need unfolding in proofs.
- [Vite transformIndexHtml query OOM](vite-transform-html-query-oom.md) — pass pathname only; a query on "/" makes Vite watch the whole filesystem → OOM + fake "all files changed" bursts.
- [Route param names drive validation](route-param-id-inference.md) — any `:xxxId` path param is validated as int4 before the handler; varchar user ids 400 unless the param is renamed.
- [Sync watchdog live ids](sync-watchdog-live-ids.md) — route-started syncs must register live queue ids or the 5-min watchdog orphans them mid-run; link scans hold heavy slot only for DB read.
- [Page title face](page-title-face.md) — page h1s use .page-title (body face 700) per the reference; display face only for wordmark/numerals/state titles/accents.
- [SSR lazy boundary #421](ssr-lazy-boundary-421.md) — env-gated lazy hosts in the hydrated Home tree throw #421/#419; mount closed hosts client-only; diff .replit userenv first.
- [Secret leak scan by value](secret-history-leak-scan.md) — prove 'no secrets committed' by grepping real secret VALUES across all history blobs; owner password leaked via deleted July scripts.

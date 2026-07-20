# NB-043 — duplicate resource pairs (VG-gate)

Three pairs merged via live admin API (`scripts/run23-data-fixes-prod.ts`, section NB-043):
1. Copperpod video-coding analysis — survivor 185007 (copperpodip.com original); twin 185153 (Medium mirror of the identical article) rejected.
2. VCT — survivor 185310 (github.com/zbabac/VCT source home); twin 185466 (SourceForge distribution page) rejected.
3. videojs-ads — survivor 185348 (github.com/dmlap/videojs-ads); twin 184798 (GLStephen fork of dmlap's repo, GitHub API fork pointer verified July 20 2026, last pushed 2013) rejected.

Proof (dev, July 20 2026):
- Script run 1: three `twin-reject` actions status 200 (`evidence/run23/data-fixes-dev.json`).
- Script run 2: all no-ops (`twin-already-non-approved`).
- Live API: 185153 → 404, 185466 → 404, 184798 → 404 (first probe hit the public rate limiter 429; re-probed after cooldown).
- DB: all three rows status='rejected'.

**PASS.** Prod: same script section runs post-republish.

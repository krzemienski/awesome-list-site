# NB-044 — title chrome / sentence-titles (VG-gate)

33 approved resources had scraped `<title>` chrome (" | Site", " - Author - Medium", breadcrumb paths) or whole sentences as titles (186111: 196-char gist summary; 186249: 158-char ISO catalog line). Hand-cased replacements in `RETITLES` (`scripts/run23-data-fixes-prod.ts`), written against each row's URL + description.

Proof (dev, July 20 2026):
- Run 1: 33 `retitle` actions, all status 200 (`evidence/run23/data-fixes-dev.json`).
- Run 2: 33 `noop-already-retitled`.
- Collision guard honored: 185835 → "Open Broadcaster Software (OBS)" because "OBS Studio" (185834, distinct GitHub-repo entry) already exists and the dup-title guard would 409.
- Rendered check: /resource/186176 h1 = "Streaming Video Technology Alliance (SVTA)" (`nb044-186176.png`).
- Post-scan: chrome-pattern SQL scan returns only 185345 "FFmpeg Wiki" (legitimate title, excluded by decision).

**PASS.** Prod: same script section runs post-republish.

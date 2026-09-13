# Task 553 capture follow-up

Run scope: narrow completion only; no new full pass; no auth attempt; no source edits.
Target: real local app `http://127.0.0.1:5000`.

## Rejected / missing

- **Rejected:** `search-ffmpeg-375.png` — visual inspection showed shell/loading skeletons rather than populated Search results. Do not use as populated evidence.
- **Missing before this follow-up:** `advanced-export-1440.png`.
- Grid-state note: prior `categories-*` and `tag-open-source-*` captures are **superseded** because the current Categories/Tag/PublicCollection grid behavior is now bounded 1/2/3. No PublicCollection capture exists because the documented auth/origin blocker prevented collection creation/share; no auth retry was made here.

## Fixed captures

- `search-ffmpeg-375-populated.png`
  - Route: `/search?q=ffmpeg`, viewport 375x900.
  - Explicit readiness selector: `[data-testid="card-resource-185214"]` visible.
  - Assertion: 24 `[data-testid^="card-resource-"]` cards; first card text begins `FFmpeg — FFmpeg is a free and open-source software project...`.
  - `document.fonts.status`: `loaded` after `await document.fonts.ready`.
- `advanced-export-1440-populated.png`
  - Route: `/advanced?tab=export`, viewport 1440x900.
  - Explicit readiness selectors: exact text `Multi-Format Export System` visible and `[data-testid="button-format-markdown"]` visible.
  - Assertion: exact heading text `Multi-Format Export System`; Export tab selected in the resulting live snapshot; `document.fonts.status`: `loaded` after `await document.fonts.ready`.

Machine-readable assertions: `assertions.json` in this directory.

## Other image inspection

Reviewed for premature loading in the retained batch: `categories-375.png`, `categories-1440.png`, `search-ffmpeg-1440.png`, `tag-open-source-375.png`, `tag-open-source-1440.png`, `journeys-375.png`, `journeys-1440.png`, `journey-7-375.png`, `journey-7-1440.png`, `advanced-explorer-375.png`, `advanced-explorer-1440.png`, `advanced-metrics-375.png`, `advanced-metrics-1440.png`, `advanced-export-375.png`, `advanced-recommendations-375.png`, `advanced-recommendations-1440.png`, `recommendations-375.png`, and `recommendations-1440.png`. These reviewed images showed populated content rather than shell-only loading; the explicit exception is `search-ffmpeg-375.png` above. This is image inspection, not a new full pass.

Existing auth blocker remains as previously documented; this follow-up intentionally did not spend on auth.

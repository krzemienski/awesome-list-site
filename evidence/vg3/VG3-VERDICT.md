# VG-3 Verdict — Sitemap, metadata, content, accessibility

**Env:** current source @ http://localhost:5055. Real HTTP + real browser.
**Result:** PASS.

| Check | Result | Evidence |
|-------|--------|----------|
| Sitemap URLs canonical/unique | ✅ PASS | 2000 URLs, 0 duplicates (matrix) |
| Sitemap reachability | ✅ PASS | 40/40 sampled across all 2000 → 200 |
| No future lastmod | ✅ PASS | 0 future dates, single YYYY-MM-DD format |
| No /journey/N in sitemap (BUG-032) | ✅ PASS | grep: none |
| ffmpeg sitemap URLs reachable (BUG-045/089) | ✅ NOT-REPRO | /sub-subcategory/ffmpeg, /subcategory/ffmpeg-tools → 200 |
| robots ↔ route protection (BUG-027) | ✅ PASS | robots Disallow /profile,/bookmarks,/admin,/settings/ — all 302→/login (see evidence/vg3/robots.txt). The `/profile` fix made robots honest. |
| robots "duplicate" Disallow | ✅ NOT-A-BUG | repeated lines belong to two distinct UA groups (`*` + AI-crawlers GPTBot/ClaudeBot/…). Well-formed. |
| Page metadata (title/canonical/JSON-LD) | ✅ PASS | /=jsonld×1+canonical, /about=jsonld×2+canonical, /submit=canonical, distinct titles per route (metadata-robots.txt) |
| Keyboard nav / focus / tabs | ✅ PASS | verify-authed.log V1-V4c, V9 |

## Minor findings (non-blocking)

- `/login`, `/recommendations` lack canonical + JSON-LD (login is noindex; low priority). LOW.
- SSR `<title>` count "1934+" vs live total 1949 — static title string drift. LOW.

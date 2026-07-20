# VG-027 — OG-image kicker shows real category (BUG-027)

**Verdict: PASS (17/17)** — July 20, 2026, dev server localhost:5000

## Fix
- `server/og-middleware.ts` `resolveOgImageMeta`: returns new `kicker` field. For
  `/resource/:id` paths the kicker is the resource's REAL category (server-resolved
  from the stored row via `storage.getResource`); taxonomy pages keep their accurate
  level labels (Category / Subcategory / Topic); root stays Index.
- `server/routes.ts` `buildOgSvg`: eyebrow now `${kicker || category || 'Index'} · Awesome Video`
  (truncated at 36 chars) instead of the hardcoded always-"Category" string.

## Probes (script: /tmp/vg027.sh)
| Probe | Expected kicker | Result |
|---|---|---|
| /resource/185020 (Protocols & Transport) | PROTOCOLS & TRANSPORT · AWESOME VIDEO | PASS |
| /resource/184751 (Community & Events) | COMMUNITY & EVENTS · AWESOME VIDEO | PASS |
| /resource/186145 (Intro & Learning) | INTRO & LEARNING · AWESOME VIDEO | PASS |
| /resource/186477 (Media Tools) | MEDIA TOOLS · AWESOME VIDEO | PASS |
| /resource/185860 (Infrastructure & Delivery — longest) | INFRASTRUCTURE & DELIVERY · AWESOME VIDEO | PASS |
| /resource/185762 (General Tools) | GENERAL TOOLS · AWESOME VIDEO | PASS |
| /resource/185752 (Encoding & Codecs) | ENCODING & CODECS · AWESOME VIDEO | PASS |
| /resource/185893 (Players & Clients) | PLAYERS & CLIENTS · AWESOME VIDEO | PASS |
| /resource/186370 (Standards & Industry) | STANDARDS & INDUSTRY · AWESOME VIDEO | PASS |
| /category/encoding-codecs | CATEGORY · AWESOME VIDEO | PASS |
| /subcategory/encoding-transcoding-guides | SUBCATEGORY · AWESOME VIDEO | PASS |
| /sub-subcategory/hevc | TOPIC · AWESOME VIDEO | PASS |
| / (root) | INDEX · AWESOME VIDEO | PASS |
| ?title=EVIL&category=INJECTED (no path) | INDEX · AWESOME VIDEO, no injected text | PASS |
| PNG short name (186477) | 200, 51,545 bytes | PASS |
| PNG long name (185860) | 200, 73,829 bytes | PASS |
| PNG ampersand (185752) | 200, 70,506 bytes | PASS |

## Visual inspection (PNGs in this directory)
- `bug027-short-media-tools.png` — kicker "MEDIA TOOLS · AWESOME VIDEO", layout intact.
- `bug027-long-infrastructure-delivery.png` — longest category name fits on one
  eyebrow line with clear right margin; title/subtitle/footer unaffected.
- `bug027-amp-encoding-codecs.png` — "&" renders correctly (xmlEscape round-trip).

Pass criteria met: every resource kicker reflects its actual category; the generic
always-"CATEGORY" kicker is absent wherever category data exists; layout correct for
short and long names; caller-supplied text still cannot reach the card.

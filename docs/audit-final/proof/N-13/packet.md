# N-13 — A failed resource thumbnail leaves an empty or blurred box
Commit: dev `ab6da9f940ae994a308857bdc7b44918699fa853+workspace`   Persona: guest   Browser: Chromium 1440 (Playwright, capture-only; no request interception)
System/accent/width: editorial/crimson; 1440

**Status: FIXED in code; AFTER capture pending** a real thumbnail failure (see below).

## How this row was found
The N-01 sweep logged one `429` from another host. Reviewer review-n01 identified it as `opengraph.githubassets.com` (streamband/hydra-srt), a resource-card thumbnail. The 429 itself is GitHub rate-limiting its social-preview images and can't be fixed by this app. What the app controls is what a card shows when its thumbnail fails, and that was broken.

## Reproduction steps
1. Wait until a stored thumbnail URL actually fails. Check with `curl -s -o /dev/null -w '%{http_code}' <metadata.ogImage>` for the 5 dev resources that have one (DRMreview 188011, CTA-WAVE Device Playback Task Force 188012, HydraSRT 188013, srtdroid 188015, Best Practices… 186115). On 2026-10-11 at 19:46 UTC, 188011 and 188012 returned 429.
2. While it's failing, open `/search?q=DRMreview` and `/search?q=CTA-WAVE Device Playback`, and look at the card.

## Before — what was seen
- `before-card-CTA-WAVE.png`
  1. Shows: the CTA-WAVE card with an empty bordered 8rem box between the description and the "Page Title" lines.
  2. Proves: a failed thumbnail leaves an empty frame. The caption reads `frame=true h=128 img=none natural=0 blurhash=false`, and the network log shows `429 GET https://opengraph.githubassets.com/…/cta-wave/device-playback-task-force`.
  3. If fixed: the box would not be there.
  4. Unexpected: none.
- `before-card-DRMreview.png`
  1. Shows: the DRMreview card with a pale lilac blurred placeholder filling the box.
  2. Proves: when the resource has a blurhash, the placeholder never clears after a failure (`blurhash=true`, `img=none`), so the card shows a permanent smear.
  3. If fixed: no box.
  4. Unexpected: none.
- `before-detail-188011.png` and `before-detail-188012.png`: the resource detail pages. They were captured 3 minutes later, when GitHub had stopped returning 429, so the images loaded (`natural=1200`). They show the normal state, not the failure. The detail page has the same `onError → display:none` code, so the same empty 16rem box would appear there.
- Scale: in production only one approved resource has a thumbnail (svta.org, which returns 200), so this affects the 5 dev resources today and any future scraped thumbnails.

## Root cause
`ResourceCard.tsx` and `ResourceDetail.tsx` handled `onError` by setting `display:none` on the `<img>` only. The frame (with its border and fixed height) stayed, and the blurhash, gated on "loaded", stayed forever. ResourceDetail's single `imageLoaded` flag also never reset when navigating from one resource to another inside the same mounted page.

## Fix
Both components track `loadedImage` and `failedImage` keyed by `src`. A failed image removes the whole frame, and the blurhash hides only once that exact `src` has loaded. Keying by `src` also resets the state between resources.

## After — what was seen
_Pending._ Since the fix, the stored thumbnails have returned 200. The AFTER capture runs `capture-script.mjs` (and `capture-script-detail.mjs`) with `PHASE=after` the next time `curl` shows a real failure. Faking the failure (request interception or a fabricated URL) would not be proof.

## Unexpected items → new rows
None.

## Reviewer verdict
_Pending._

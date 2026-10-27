# C6-AX-023 local proof

## Change

Only the List and Compact external anchors in `client/src/components/resource/resource-view-modes.tsx` change: matching `title` and `aria-label` now read `Open Link {resource.title} (opens in new tab)`. Their href, rel, target, test IDs, icons, classes, click handler, Grid renderer and analytics are untouched.

## Environment and checks

- Fresh isolated clone of current origin/main at `/tmp/c6-ax023-contextual-links-20261027`, branch `fix/c6-ax023-contextual-external-links`.
- `npm ci --ignore-scripts`: exit 0, 935 packages installed.
- `npx tsc --noEmit`: exit 0, no output (18.51s).
- `npm run build`: exit 0 (9.46s), complete captured output in `build-output.txt`. Rollup removed two dependency PURE annotations; bundle size warnings remain informational.
- Owned development runtime port 5093, loopback PostgreSQL `awesome_c2_pubsec`, background jobs disabled, auto-seed false. No production database, migrations, authentication bypass, paid AI, tests, mocks or validation scripts used.
- Real Chrome isolated context `c6-ax023-local-20261027`, signed out; category `encoding-codecs?search=ffmpeg&view=list` and `view=compact`.

## Six-state browser result

| State | Actual CSS width / DPR / touch points | External anchors | Target sizes | Keyboard |
|---|---|---:|---|---|
| List desktop | 1440 / 1 / 0 | 24 | all 44×44 | Tab focus-visible; Enter opens FFmpeg |
| List tablet touch | 820 / 1 / 1 | 24 | all 44×44 | Tab focus-visible; Enter opens FFmpeg |
| List phone touch | 390 / 1 / 1 | 24 | all 44×44 | Tab focus-visible; Enter opens FFmpeg |
| Compact desktop | 1440 / 1 / 0 | 24 | all 44×44 | Tab focus-visible; Enter opens FFmpeg |
| Compact tablet touch | 820 / 1 / 1 | 24 | all 44×44 | Tab focus-visible; Enter opens FFmpeg |
| Compact phone touch | 390 / 1 / 1 | 24 | all 44×44 | Tab focus-visible; Enter opens FFmpeg |

Each state has its own PNG, accessibility snapshot, `*-state.json` and `*-activation.json`. Browser captures expose distinct resource context: FFmpeg, FFmpeg Verbose Logging, ffmpeg-go, and the remaining displayed resources. Title/aria-label match. Native keyboard activation events are trusted, detail 0, not prevented, with `target=_blank`. Keyboard traversal begins from the preceding real title link (Compact) or Bookmark control (List), then uses native Tab and Enter; it is not a synthetic DOM keyboard event.

All six screenshots were opened and visually reviewed. Focus rings are visible, external icons remain within their cards/rows, controls remain separated, and document scrollWidth is no larger than the actual viewport (1434 at desktop, 820/390 at touch widths). Narrow List titles and four-column tablet Compact titles are still truncated/wrapped by the existing layout; this label-only fix intentionally does not redesign them. Screenshot review is scoped to no regression from this attribute-only change, not a whole-page WCAG certification.

`console-network.txt` records document/fetch/XHR responses (all 200/304), console output, and native new-tab receipts. A browser issue reports three form fields lacking id/name in both documents; that separate existing form concern is not resolved by this narrowly scoped external-name fix. There are no captured JS console errors or failed document/fetch/XHR requests.

## Remaining UNVERIFIED

- Production behavior after merge/deployment: intentionally not merged or deployed.
- Screen-reader spoken output and physical touchscreen hardware: browser accessibility-tree and touch emulation proof only.
- Unrelated form id/name issue and whole-site accessibility compliance are outside this contract.

## Main synchronization

- Merged current `origin/main` (`2c4a00ee`) into the fix branch at the integration owner's request. The only conflict was additive CHANGELOG content; both entries were preserved.
- Re-ran `npx tsc --noEmit` unpiped: exit 0, no output (7.55s).
- Re-ran `npm run build` unpiped: exit 0 (7.67s); full output in `main-sync-build-output.txt`.
- After PR115 landed, merged newer `origin/main` (`d3bfce3c`) at the integration owner's request, preserving both additive CHANGELOG entries again. Latest `npx tsc --noEmit` exited 0 with no output (4.70s); latest `npm run build` exited 0 (8.92s), captured in `main-sync-d3bfce3c-build-output.txt`.
- The integration owner accepted the existing all-width browser proof for this main sync; those captures were not rerun and remain explicitly tied to the original fix state.
- No merge into main and no deployment performed.

## Capture handling

Chrome DevTools cannot save directly inside `/tmp` (workspace-root restriction). Raw captures were therefore saved under the exact requested report directory in the working workspace, then copied byte-for-byte into this isolated clone for the PR. No application source was edited in the main checkout. An initial alternate browser connection returned zoomed 1152px metrics despite requested 1440 and was discarded; all retained matrix captures use Chrome DevTools page 88 with measured DPR 1 and exact CSS widths.

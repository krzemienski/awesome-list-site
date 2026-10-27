# AX-020 / AX-022 local fix proof

Base: `520d6778369bc7ce495204cfcacc7e0533f941cc`. Branch: `fix/c6-ax020-advanced-offline-recovery`. Source was edited only in the isolated `/tmp/awesome-c6-ax020-ax022.N3IHuj` clone. No merge or deployment.

## Exact checks

- `npx tsc --noEmit`: exit 0, no diagnostics, unpiped.
- `npm run build`: exit 0, unpiped. Raw output is `build-output.txt`; dependency PURE-annotation and bundle-size warnings remain.
- No test files, test suites, mocks, validation scripts or harnesses were created or run.

### Main synchronization

Merged `origin/main` at `2c4a00eed2085561e9170b2575b92837e48ac5da` into this fix branch. The additive CHANGELOG conflict preserves both the Advanced recovery entry and all upstream entries. Re-ran `npx tsc --noEmit` (exit 0, no diagnostics) and `npm run build` (exit 0), both unpiped. See `integration-checks.json` and `integration-build-output.txt`. The existing all-width browser proof was retained as explicitly authorized for this synchronization; it was not repeated solely for integration. This did not merge the PR or deploy.

Subsequently merged `origin/main` at `d3bfce3c88a039cb6819b013a8754808efa49a1e` after PR #115. Preserved both the Advanced recovery and Profile validation CHANGELOG entries. The repeated unpiped typecheck and build both exited 0; receipts are `integration-d3bfce3c-checks.json` and `integration-d3bfce3c-build-output.txt`. Existing browser evidence and its limitations remain unchanged.

## Real runtime and failure method

The existing Express/Vite app ran at `http://127.0.0.1:5167`, using the approved isolated loopback `awesome_c2_pubsec` database, development mode and `DISABLE_BACKGROUND_JOBS=1`. No production database, migration, seeding or paid work was used. Analytics consent was denied and `umami.disabled=1`.

An owned local server was suspended/resumed with SIGSTOP/SIGCONT and the browser's native CDP offline emulation dropped real traffic. Catalog cache entries were cleared to prepare data-less queries; the real Advanced module was warmed to keep chunk failure separate from catalog failure. No fetch replacement or fabricated response was used. Native CDP drove the finished app, actual pointer/keyboard input, and captured screenshots, raw accessibility trees, network events and focus state.

Each stem below has `.png`, `-ax.json`, `-state.json` and `-network.json` companions. Screenshots were personally opened and reviewed; focused H1 claims come from focus state plus AX evidence, not pixels alone.

| Criterion | 1440×900 | 820×1180 touch | 390×844 touch |
|---|---|---|---|
| Offline initial failure | `1440-offline-initial-final` | `820-offline-initial-final-native` | `390-offline-initial-final` |
| Still-offline Retry feedback | `1440-offline-keyboard-retry-space-final` | `820-offline-retry-final-pointer` | `390-offline-retry-final` |
| Online server failure retains generic copy | `1440-online-server-failure-final` | `820-online-server-failure-final` | `390-online-server-failure-final` |
| Automatic reconnect focuses Advanced Features H1 | `1440-auto-recovered-focused-final` | `820-auto-recovered-focused-final` | `390-auto-recovered-focused-final` |
| Ordinary real refetch preserves INPUT focus | `1440-background-refetch-no-focus-theft-final` | `820-background-refetch-no-focus-theft-final` | `390-background-refetch-input-final` |
| Ordinary About navigation preserves subsequent FAQ control focus | `1440-ordinary-navigation-user-focus-final` | `820-ordinary-navigation-user-focus-final` | `390-ordinary-navigation-user-focus` |

All rows above passed the stated local criterion. Touch emulation records `maxTouchPoints=1`, coarse pointer true; desktop records 0/false. Every captured viewport has zero measured horizontal overflow. Retry was Tab+Space at 1440, emulated touch at 390, trusted pointer at 820 with touch emulation active. Automatic recovery required no Retry after reconnect, and retained one document navigation rather than reloading.

The extra `390-click-free-offline-body-final` → `390-click-free-auto-recovered-focused-final` pair proves the original BODY-focus case without activating Retry at any point in that recovery.

## Remaining UNVERIFIED

- Production after deployment: deliberately not deployed.
- Actual screen-reader speech and physical touch devices.
- Whole-app, all-theme and independent color/contrast audit; the scope is these error/recovery fixes.
- The exact negative-control case where the visitor moves focus outside the error panel during pending recovery. Cancellation guards are implemented; ordinary navigation and normal-refetch no-theft controls passed, but that distinct recovery sequence is not promoted to PASS.
- An HTTP 5xx response specifically: genuine online connection-refused/request-timeout failures were exercised instead of fabricating a response.

`summary.json` contains the full per-capture measured state and limitations. `final-console.json` and `final-native-network.json` retain real observed diagnostics, including expected induced failure logs; no zero-console-error claim is made. Exploratory wrapper/MCP timeouts, stale-cache runs and a Vite restart reload were excluded from accepted proof. Final browser network state was restored online and owned services were stopped during closeout.

# iOS/macOS Validation Reference

## Prerequisites

- **Xcode CLI tools**: `xcode-select --install` (if `xcodebuild` not found)
- **idb**: `brew install idb-companion` (if `idb_describe` / `idb_tap` fail)
- **Simulator**: Must be booted — `xcrun simctl boot <UDID>` (get UDIDs with `xcrun simctl list devices available`)

## Decision Tree: What To Validate

Before capturing evidence, decide WHAT proves the feature works:

| Feature Type | What PASS Looks Like | What to Screenshot |
|-------------|---------------------|-------------------|
| New screen | Correct layout, real data displayed, no placeholder text | Full screen with data loaded |
| Data display | Correct count, correct formatting, correct sorting | The specific data element (badge, list, chart) |
| Navigation | Correct destination, back button works, state preserved | Before nav, after nav, after back |
| Error handling | Graceful error UI, no crash, correct message | Error state with readable message |
| API integration | Data from backend appears in UI, correct transformation | Screen showing backend data + curl of API endpoint |

## Build → Install → Launch Sequence

The order is non-negotiable. Skip a step and you get stale binaries or ghost state:

```bash
# 1. Build (capture the .app path)
xcodebuild -scheme <Scheme> -destination 'id=<UDID>' -quiet 2>&1 | tail -5
APP_PATH=$(find ~/Library/Developer/Xcode/DerivedData/<Project>-*/Build/Products/Debug-iphonesimulator/*.app -maxdepth 0 | head -1)

# 2. Terminate existing (stale state causes false results)
xcrun simctl terminate "$UDID" <bundle-id> 2>/dev/null || true

# 3. Install fresh
xcrun simctl install "$UDID" "$APP_PATH"

# 4. Launch
xcrun simctl launch "$UDID" <bundle-id>

# 5. Wait for render (3s minimum, 5s for data-heavy screens)
sleep 3

# 6. Screenshot
xcrun simctl io "$UDID" screenshot evidence/01-screen.png
```

**Critical**: Step 1 builds to DerivedData (`~/Library/Developer/Xcode/DerivedData/`), NOT to a local `build/` directory. The `find` command above gets the correct path. Verify with `stat` that the binary timestamp matches your build time.

## UI Interaction Methods (Ranked by Reliability)

| Method | Reliability | When to Use | Limitation |
|--------|------------|-------------|------------|
| Deep links (`openurl`) | High | Navigate to specific screens | UUIDs must be lowercase; shows "Open in?" dialog if app not foregrounded |
| `idb_describe` + `idb_tap` | High | Tap specific UI elements | Can't reach SwiftUI toolbar buttons; need accessibility tree first |
| Swipe gestures (`idb ui swipe`) | Medium | Open sidebars, pull-to-refresh | Coordinates are logical points, not pixels; timing-sensitive |
| Modify `@State` defaults | High | Force-show specific screens for screenshots | Requires rebuild; must revert after capture |

**The `idb_describe` pattern** (most reliable for taps):
```bash
# Get the accessibility tree with exact coordinates
idb_describe operation:all
# Find the element you need, note its centerX/centerY
# Tap those exact coordinates
idb_tap <centerX> <centerY>
```

## Failure Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Black screenshot | App hasn't rendered yet | Increase sleep to 5s; check if app is actually in foreground |
| Shows onboarding/setup | Backend not running | Start backend, verify with `curl -sf http://localhost:PORT/health` |
| Shows previous screen | Navigation hasn't completed | Increase sleep after deep link/tap; verify URL scheme |
| White flash in dark mode | `preferredColorScheme(.dark)` not set | Add to root view or scene |
| "Open in App?" dialog | App not foregrounded before `openurl` | Launch app first, then `openurl` |
| Screenshot shows other app | Wrong UDID or `booted` resolves to wrong simulator | Use explicit UDID, not `booted` |
| Data shows but wrong count | API pagination — showing page size not total | Check API response includes total field; verify UI reads it |
| Crash on launch | Missing environment object, backend dependency | Check crash report `.ips` files; start backend first |

## Never Do

- **NEVER use `booted` in multi-agent environments** — resolves to a random booted simulator
- **NEVER trust the `build/` directory** — Xcode builds to DerivedData, not local
- **NEVER skip terminate before install** — stale state produces false positive/negative results
- **NEVER guess tap coordinates from screenshots** — use `idb_describe` for exact accessibility coordinates
- **NEVER use XCTest/XCUITest for validation** — that's CI, not user-perspective testing

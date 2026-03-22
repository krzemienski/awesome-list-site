<overview>
End-to-end validation for iOS/macOS applications. Build the REAL app, install on a REAL simulator, launch, interact via deep links and taps, capture screenshots and video, stream logs, and verify the UI shows correct data. Never use XCTest, XCUITest, or test targets.
</overview>

<prerequisites>
- **Xcode CLI tools**: `xcode-select --install` (if `xcodebuild` not found)
- **idb**: `brew install idb-companion` (for `idb_describe` / `idb_tap`)
- **Simulator**: Must be booted — `xcrun simctl boot <UDID>`
- Get available UDIDs: `xcrun simctl list devices available`
</prerequisites>

<five_phase_protocol>
```
SETUP → RECORD → ACT → COLLECT → VERIFY
```

Each phase produces artifacts in `e2e-evidence/ios/`. Phase 5 (VERIFY) is always manual — you MUST visually inspect every screenshot.

**Phase 1: SETUP**
| Check | Command | FAIL Action |
|-------|---------|-------------|
| Simulator booted | `xcrun simctl list devices \| grep "$UDID"` | `xcrun simctl boot "$UDID"` + sleep 5 |
| Evidence dir | `mkdir -p e2e-evidence/ios` | Created |
| Backend healthy | `curl -sf http://localhost:$PORT/health` | Start backend, poll 60s |
| Status bar clean | `xcrun simctl status_bar "$UDID" override --time "9:41"` | Always override |

**Phase 2: RECORD** (start BEFORE launching app)
```bash
# Video — MUST stop with SIGINT, never kill -9
xcrun simctl io "$UDID" recordVideo --codec=h264 --force "e2e-evidence/ios/recording.mov" &
RECORD_PID=$!

# Logs — --info --debug MANDATORY (otherwise you see nothing)
xcrun simctl spawn "$UDID" log stream \
  --predicate "subsystem == \"$BUNDLE_ID\"" \
  --info --debug --style compact \
  > "e2e-evidence/ios/live-logs.txt" 2>/dev/null &
LOG_PID=$!
```

**Phase 3: ACT**
1. Terminate existing: `xcrun simctl terminate "$UDID" "$BUNDLE_ID"`
2. Install fresh: `xcrun simctl install "$UDID" "$APP_PATH"` (DerivedData path, NOT `build/`)
3. Launch: `xcrun simctl launch "$UDID" "$BUNDLE_ID"`
4. Wait 3s minimum for UI to settle
5. Screenshot: `xcrun simctl io "$UDID" screenshot "e2e-evidence/ios/01-launch.png"`
6. Interact: deep links, idb_tap, text input
7. Screenshot after each action (sequential: 01-, 02-, 03-)

**Phase 4: COLLECT**
1. Stop log stream (kill + wait)
2. Historical logs: `log show --last 120s`
3. Stop video: `kill -SIGINT $RECORD_PID` + `wait`
4. Check crashes: `ls -t ~/Library/Logs/DiagnosticReports/*.ips | head -5`
5. Clear status bar

**Phase 5: VERIFY** (the critical phase)
1. READ every screenshot with Read tool
2. Grep logs for errors: `grep -ci "error" live-logs.txt`
3. Check crash reports
4. Note video path
5. Write verdict: PASS/FAIL with evidence references
</five_phase_protocol>

<build_sequence>
```bash
# 1. Build (capture .app path)
xcodebuild -scheme <Scheme> -destination "id=$UDID" -quiet 2>&1 | tail -5
APP_PATH=$(find ~/Library/Developer/Xcode/DerivedData/<Project>-*/Build/Products/Debug-iphonesimulator/*.app -maxdepth 0 | head -1)

# 2. Verify build produced an app
[ -z "$APP_PATH" ] && echo "FAIL: No .app found in DerivedData" && exit 1
echo "Built: $APP_PATH"
```

**CRITICAL**: Xcode builds to `~/Library/Developer/Xcode/DerivedData/`, NOT to `build/`.
</build_sequence>

<interaction_methods>
| Method | Reliability | When to Use |
|--------|------------|-------------|
| Deep links (`openurl`) | High | Navigate to specific screens |
| `idb_describe` + `idb_tap` | High | Tap specific UI elements |
| Swipe gestures | Medium | Sidebars, pull-to-refresh |
| Modify `@State` defaults | High | Force-show specific screens (rebuild required) |

```bash
# Deep link
xcrun simctl openurl "$UDID" "myapp://screen/detail?id=abc123"

# idb tap pattern
idb_describe operation:all  # Get accessibility tree with coordinates
idb_tap <centerX> <centerY>  # Tap exact coordinates
```

Deep link gotchas:
- UUIDs must be LOWERCASE
- App must be foregrounded or you get "Open in App?" dialog
- URL scheme must be registered in Info.plist
</interaction_methods>

<journeys_to_validate>
1. **App launch** — Loads to expected home screen with data
2. **Navigation** — Tab bar, push/pop, modals, sheets
3. **Data display** — Lists, detail views, counts, formatting
4. **Forms/input** — Text fields, pickers, toggles, submit
5. **Authentication** — Login, protected screens, logout
6. **Offline/error** — No network shows appropriate UI
7. **Deep links** — Each URL scheme navigates correctly
8. **Dark mode** — All screens render correctly
9. **Orientation** — Landscape mode (if supported)
10. **Backend integration** — Data from API appears correctly in UI
</journeys_to_validate>

<backend_integration>
If the iOS app depends on a backend:

1. Start backend FIRST, verify health
2. Launch app — it should connect to local backend
3. Validate data flows end-to-end:
   - curl the API to verify data exists
   - Screenshot the app showing the same data
   - Compare: API response count == UI display count
4. Test mutations: create via UI → verify in API/DB, create via API → verify in UI
</backend_integration>

<failure_troubleshooting>
| Symptom | Cause | Fix |
|---------|-------|-----|
| Black screenshot | App hasn't rendered | Increase sleep to 5s |
| Onboarding screen | Backend not running | Start backend, verify health |
| Previous screen showing | Navigation incomplete | Increase sleep after deep link |
| "Open in App?" dialog | App not foregrounded | Launch app first, then openurl |
| Wrong simulator | Wrong UDID | Use explicit UDID, not "booted" |
| Data wrong count | API pagination | Check total field vs page size |
| Crash on launch | Missing env object | Check crash .ips files, start backend |
| Corrupt video | Used kill -9 | MUST use kill -SIGINT |
</failure_troubleshooting>

<never>
- NEVER use `booted` as UDID in multi-session environments
- NEVER trust the `build/` directory — Xcode uses DerivedData
- NEVER skip terminate before install
- NEVER guess tap coordinates — use `idb_describe`
- NEVER use XCTest/XCUITest for validation
- NEVER use kill -9 on video recording — use SIGINT
- NEVER omit --info --debug from log streaming
- NEVER claim PASS without reading every screenshot
</never>

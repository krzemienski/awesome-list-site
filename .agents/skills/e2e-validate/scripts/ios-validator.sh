#!/bin/bash
# ──────────────────────────────────────────────────────────────────
# iOS Validator — Simulator-based iOS app validation
# ──────────────────────────────────────────────────────────────────
# Usage:
#   BUNDLE_ID=com.app.name bash scripts/ios-validator.sh
#   UDID=<uuid> BUNDLE_ID=com.app BACKEND_PORT=9090 bash scripts/ios-validator.sh
#
# Environment Variables:
#   UDID            — Simulator UDID (default: first available booted)
#   BUNDLE_ID       — App bundle identifier (required)
#   LOG_SUBSYSTEM   — os_log subsystem (default: $BUNDLE_ID)
#   BACKEND_PORT    — Backend port to health-check (optional)
#   BACKEND_HEALTH  — Health endpoint path (default: /health)
#   EVIDENCE_DIR    — Output directory (default: e2e-evidence/ios)
#   DURATION        — Record duration in seconds (default: 10)
#   SCHEME          — Xcode scheme to build (auto-detected if omitted)
#   SKIP_BUILD      — Set "1" to skip build (use existing binary)
#   SKIP_VIDEO      — Set "1" to skip video recording
#   SKIP_LOGS       — Set "1" to skip log streaming
# ──────────────────────────────────────────────────────────────────
set -euo pipefail

BUNDLE_ID="${BUNDLE_ID:?ERROR: BUNDLE_ID required. Set BUNDLE_ID=com.your.app}"
LOG_SUBSYSTEM="${LOG_SUBSYSTEM:-$BUNDLE_ID}"
BACKEND_PORT="${BACKEND_PORT:-}"
BACKEND_HEALTH="${BACKEND_HEALTH:-/health}"
EVIDENCE_DIR="${EVIDENCE_DIR:-e2e-evidence/ios}"
DURATION="${DURATION:-10}"
SCHEME="${SCHEME:-}"
SKIP_BUILD="${SKIP_BUILD:-0}"
SKIP_VIDEO="${SKIP_VIDEO:-0}"
SKIP_LOGS="${SKIP_LOGS:-0}"

RECORD_PID=""
LOG_PID=""

mkdir -p "$EVIDENCE_DIR"/{screenshots,video,logs,crashes}

# ─── Auto-detect UDID if not provided ───
if [ -z "${UDID:-}" ]; then
  UDID=$(xcrun simctl list devices available | grep "Booted" | head -1 | grep -oE '[0-9A-F-]{36}')
  if [ -z "$UDID" ]; then
    echo "No booted simulator found. Booting first available iPhone..."
    UDID=$(xcrun simctl list devices available | grep "iPhone" | head -1 | grep -oE '[0-9A-F-]{36}')
    xcrun simctl boot "$UDID"
    sleep 5
  fi
fi

echo "═══════════════════════════════════════════════"
echo "  iOS Validator"
echo "═══════════════════════════════════════════════"
echo "  UDID:       $UDID"
echo "  Bundle ID:  $BUNDLE_ID"
echo "  Evidence:   $EVIDENCE_DIR"
echo "  Duration:   ${DURATION}s"
[ -n "$BACKEND_PORT" ] && echo "  Backend:    localhost:$BACKEND_PORT"
echo "═══════════════════════════════════════════════"

# ─── Cleanup Trap ───
cleanup() {
  echo ""
  echo "── Cleanup ──"
  [ -n "$RECORD_PID" ] && kill -SIGINT "$RECORD_PID" 2>/dev/null && wait "$RECORD_PID" 2>/dev/null || true
  [ -n "$LOG_PID" ] && kill "$LOG_PID" 2>/dev/null && wait "$LOG_PID" 2>/dev/null || true
  xcrun simctl status_bar "$UDID" clear 2>/dev/null || true
  echo "  Done."
}
trap cleanup EXIT

# ═══════════════════════════════════════════════
# Phase 1: SETUP
# ═══════════════════════════════════════════════
echo ""
echo "── Phase 1: SETUP ──"

# Status bar override
xcrun simctl status_bar "$UDID" override \
  --time "9:41" --batteryState charged --batteryLevel 100 \
  --wifiBars 3 --cellularBars 4 --operatorName "" 2>/dev/null || true
echo "  Status bar: overridden"

# Backend health check
if [ -n "$BACKEND_PORT" ]; then
  echo "  Checking backend on port $BACKEND_PORT..."
  for i in $(seq 1 30); do
    curl -sf "http://localhost:${BACKEND_PORT}${BACKEND_HEALTH}" > /dev/null 2>&1 && break
    [ "$i" -eq 30 ] && echo "  ERROR: Backend not healthy" && exit 1
    sleep 1
  done
  echo "  Backend: healthy"
fi

# ═══════════════════════════════════════════════
# Phase 2: BUILD (optional)
# ═══════════════════════════════════════════════
if [ "$SKIP_BUILD" != "1" ]; then
  echo ""
  echo "── Phase 2: BUILD ──"

  # Auto-detect scheme if not provided
  if [ -z "$SCHEME" ]; then
    SCHEME=$(xcodebuild -list 2>/dev/null | grep -A 100 "Schemes:" | grep -v "Schemes:" | head -1 | tr -d ' ')
    echo "  Auto-detected scheme: $SCHEME"
  fi

  xcodebuild -scheme "$SCHEME" -destination "id=$UDID" -quiet 2>&1 \
    | tail -10 | tee "$EVIDENCE_DIR/build.log"
  echo "  Build: complete"

  APP_PATH=$(find ~/Library/Developer/Xcode/DerivedData/ -name "*.app" \
    -path "*/Debug-iphonesimulator/*" -newer "$EVIDENCE_DIR/build.log" 2>/dev/null | head -1)
  [ -z "$APP_PATH" ] && echo "FAIL: No .app found" && exit 1
  echo "  App: $APP_PATH"
fi

# ═══════════════════════════════════════════════
# Phase 3: RECORD
# ═══════════════════════════════════════════════
echo ""
echo "── Phase 3: RECORD ──"

if [ "$SKIP_VIDEO" != "1" ]; then
  xcrun simctl io "$UDID" recordVideo --codec=h264 --force \
    "$EVIDENCE_DIR/video/recording.mov" &
  RECORD_PID=$!
  sleep 2
  echo "  Video: recording (PID $RECORD_PID)"
fi

if [ "$SKIP_LOGS" != "1" ]; then
  xcrun simctl spawn "$UDID" log stream \
    --predicate "subsystem == \"$LOG_SUBSYSTEM\"" \
    --info --debug --style compact \
    > "$EVIDENCE_DIR/logs/live-logs.txt" 2>/dev/null &
  LOG_PID=$!
  echo "  Logs: streaming (PID $LOG_PID)"
fi

# ═══════════════════════════════════════════════
# Phase 4: ACT
# ═══════════════════════════════════════════════
echo ""
echo "── Phase 4: ACT ──"

xcrun simctl terminate "$UDID" "$BUNDLE_ID" 2>/dev/null || true
sleep 1

if [ "$SKIP_BUILD" != "1" ] && [ -n "${APP_PATH:-}" ]; then
  xcrun simctl install "$UDID" "$APP_PATH"
fi

xcrun simctl launch "$UDID" "$BUNDLE_ID"
echo "  App launched"

sleep 3
xcrun simctl io "$UDID" screenshot "$EVIDENCE_DIR/screenshots/01-launch.png" 2>/dev/null
echo "  Screenshot: 01-launch.png"

echo "  Waiting ${DURATION}s for interactions..."
sleep "$DURATION"

xcrun simctl io "$UDID" screenshot "$EVIDENCE_DIR/screenshots/02-final.png" 2>/dev/null
echo "  Screenshot: 02-final.png"

# ═══════════════════════════════════════════════
# Phase 5: COLLECT
# ═══════════════════════════════════════════════
echo ""
echo "── Phase 5: COLLECT ──"

if [ -n "$LOG_PID" ]; then
  kill "$LOG_PID" 2>/dev/null || true; wait "$LOG_PID" 2>/dev/null || true; LOG_PID=""
fi

if [ "$SKIP_LOGS" != "1" ]; then
  xcrun simctl spawn "$UDID" log show \
    --predicate "subsystem == \"$LOG_SUBSYSTEM\"" \
    --last 120s --info --debug --style compact \
    > "$EVIDENCE_DIR/logs/historical-logs.txt" 2>/dev/null
  echo "  Historical logs: captured"
fi

if [ -n "$RECORD_PID" ]; then
  kill -SIGINT "$RECORD_PID" 2>/dev/null || true
  wait "$RECORD_PID" 2>/dev/null || true; RECORD_PID=""
  echo "  Video: finalized"
fi

CRASHES=$(ls -t ~/Library/Logs/DiagnosticReports/*.ips 2>/dev/null | head -5)
if [ -n "$CRASHES" ]; then
  echo "$CRASHES" > "$EVIDENCE_DIR/crashes/recent.txt"
  echo "  Crashes: $(echo "$CRASHES" | wc -l | tr -d ' ') found"
else
  echo "  Crashes: none"
fi

# ─── Summary ───
LIVE_ERRORS=$(grep -ci "error" "$EVIDENCE_DIR/logs/live-logs.txt" 2>/dev/null || echo "0")
HIST_ERRORS=$(grep -ci "error" "$EVIDENCE_DIR/logs/historical-logs.txt" 2>/dev/null || echo "0")

echo ""
echo "═══════════════════════════════════════════════"
echo "  iOS Validation Evidence Collected"
echo "═══════════════════════════════════════════════"
echo "  Evidence: $EVIDENCE_DIR"
echo "  Log errors (live): $LIVE_ERRORS"
echo "  Log errors (hist): $HIST_ERRORS"
echo ""
echo "  NEXT: READ screenshots and video before marking PASS/FAIL"
echo "═══════════════════════════════════════════════"

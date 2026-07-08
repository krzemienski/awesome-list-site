#!/usr/bin/env bash
# Follow-up #52: one-command sidebar exhaustive audit.
# Boots the dev server (if not already up), waits for readiness, runs the
# DOM-driven click walker, exits non-zero on any failure.
#
# Usage: ./scripts/audit-sidebar.sh           # uses existing server if up
#        BASE_URL=https://x.example.com ./scripts/audit-sidebar.sh
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:5000}"
READY_PATH="/api/awesome-list"
READY_TIMEOUT_S="${READY_TIMEOUT_S:-90}"

started_server=0
server_pid=""

cleanup() {
  if [ "$started_server" = "1" ] && [ -n "$server_pid" ]; then
    echo ">>> stopping dev server (pid=$server_pid)"
    kill -TERM "$server_pid" 2>/dev/null || true
    wait "$server_pid" 2>/dev/null || true
  fi
}
trap cleanup EXIT

is_ready() {
  curl -sf -o /dev/null -m 2 "${BASE_URL}${READY_PATH}"
}

if is_ready; then
  echo ">>> dev server already responding at $BASE_URL"
else
  echo ">>> booting dev server (npm run dev)"
  npm run dev > /tmp/audit-sidebar-dev.log 2>&1 &
  server_pid=$!
  started_server=1
  echo ">>> dev server pid=$server_pid, waiting up to ${READY_TIMEOUT_S}s for ${BASE_URL}${READY_PATH}"
  for ((i = 0; i < READY_TIMEOUT_S; i++)); do
    if is_ready; then
      echo ">>> dev server ready after ${i}s"
      break
    fi
    sleep 1
  done
  if ! is_ready; then
    echo "!!! dev server failed to become ready, tail of /tmp/audit-sidebar-dev.log:"
    tail -40 /tmp/audit-sidebar-dev.log || true
    exit 2
  fi
fi

# If the playwright package's expected browser revision isn't downloaded
# (common in the Replit workspace, where an older pinned Chromium lives in
# .cache/ms-playwright), fall back to any locally installed Chromium via
# an explicit executable path. CI installs a matching browser, so this
# branch is a no-op there.
if [ -z "${CHROMIUM_PATH:-}" ]; then
  for c in "$PWD"/.cache/ms-playwright/chromium-*/chrome-linux*/chrome \
           "$HOME"/.cache/ms-playwright/chromium-*/chrome-linux*/chrome; do
    if [ -x "$c" ]; then
      if ! node -e 'require("fs").accessSync(require("playwright").chromium.executablePath())' 2>/dev/null; then
        export CHROMIUM_PATH="$c"
        echo ">>> using local Chromium fallback: $CHROMIUM_PATH"
      fi
      break
    fi
  done
fi

echo ">>> running exhaustive sidebar click audit against $BASE_URL"
BASE_URL="$BASE_URL" node scripts/audit-sidebar-exhaustive-clicks.mjs

RESULT_JSON="_validation/sidebar/exhaustive.json"
if [ ! -f "$RESULT_JSON" ]; then
  echo "!!! audit did not produce $RESULT_JSON"
  exit 3
fi

FAILS=$(node -e 'const j=require("./'"$RESULT_JSON"'"); const r=j.results||[]; console.log(r.filter(x=>!x.ok).length)')
TOTAL=$(node -e 'const j=require("./'"$RESULT_JSON"'"); const r=j.results||[]; console.log(r.length)')
echo ">>> audit result: $((TOTAL - FAILS))/$TOTAL pass, $FAILS fails"

if [ "$FAILS" -gt 0 ]; then
  echo "!!! sidebar audit FAILED — see _validation/sidebar/exhaustive.md + _validation/sidebar/clicks/*.jpg"
  exit 1
fi

echo ">>> sidebar audit PASS"

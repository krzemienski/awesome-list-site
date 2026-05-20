#!/usr/bin/env bash
# Task #58: one-command content-depth CI check.
# Boots the dev server (if not already up), waits for readiness, runs the
# depth verifier which exits non-zero on hierarchy/list mismatch.
#
# Usage: ./scripts/content-depth-audit.sh           # uses existing server if up
#        BASE_URL=https://x.example.com ./scripts/content-depth-audit.sh
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
  npm run dev > /tmp/content-depth-dev.log 2>&1 &
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
    echo "!!! dev server failed to become ready, tail of /tmp/content-depth-dev.log:"
    tail -40 /tmp/content-depth-dev.log || true
    exit 2
  fi
fi

echo ">>> running content depth verifier against $BASE_URL"
AUDIT_BASE_URL="$BASE_URL" node scripts/content-depth-verify.mjs

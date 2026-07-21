#!/usr/bin/env bash
# Pre-publish gate: blocks a publish when any quality check fails.
#
# Runs, in order:
#   1. typecheck        — npx tsc (same as `npm run check`)
#   2. migration-drift  — scripts/check-migration-drift.ts
#   3. print-audit      — scripts/validation/print-audit.mjs      (headless Chromium)
#   4. responsive-audit — scripts/validation/responsive-audit.mjs (headless Chromium)
#   5. npm run build    — the actual production build
#
# The two browser audits need the app serving on :5000 and ADMIN_PASSWORD set.
# In the dev workspace the "Start application" workflow is usually already up;
# in the publish build container nothing is running, so this script boots the
# dev server itself and tears it down afterwards.
#
# Wired into .replit [deployment].build so the Publish flow runs it. Also safe
# to run by hand: bash scripts/pre-publish-gate.sh
#
# Exit code 0 = all checks passed and build produced; 1 = a check failed
# (the FAILED banner names the check, and the log tail shows which page/check).

set -u
LOG_DIR="${PRE_PUBLISH_LOG_DIR:-/tmp/validation/pre-publish}"
mkdir -p "$LOG_DIR"

STARTED_SERVER_PID=""

cleanup() {
  if [ -n "$STARTED_SERVER_PID" ] && kill -0 "$STARTED_SERVER_PID" 2>/dev/null; then
    echo "[pre-publish] stopping temporary dev server (pid $STARTED_SERVER_PID)"
    kill "$STARTED_SERVER_PID" 2>/dev/null
    # kill the whole process group in case tsx spawned children
    pkill -P "$STARTED_SERVER_PID" 2>/dev/null || true
    wait "$STARTED_SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

fail() {
  local step="$1" log="$2"
  echo ""
  echo "================================================================"
  echo "PRE-PUBLISH GATE FAILED: ${step}"
  echo "Publishing is blocked until this check passes."
  echo "Full log: ${log}"
  echo "---- last 40 log lines -----------------------------------------"
  tail -n 40 "$log" 2>/dev/null | sed 's/^/  /'
  echo "================================================================"
  exit 1
}

run_step() {
  local step="$1"; shift
  local log="$LOG_DIR/${step}.log"
  echo "[pre-publish] running ${step}: $*"
  local start=$SECONDS
  if "$@" >"$log" 2>&1; then
    echo "[pre-publish] PASS ${step} ($((SECONDS - start))s)"
  else
    fail "$step" "$log"
  fi
}

server_up() {
  curl -sf -o /dev/null --max-time 5 "http://localhost:5000/api/awesome-list" 2>/dev/null
}

echo "[pre-publish] gate started $(date -u +%FT%TZ) — logs in $LOG_DIR"

# 1. Typecheck
run_step typecheck npx tsc

# 2. Migration drift
run_step migration-drift npx tsx scripts/check-migration-drift.ts

# 3+4. Browser audits need the app on :5000 and ADMIN_PASSWORD.
if [ -z "${ADMIN_PASSWORD:-}" ]; then
  echo "FATAL: ADMIN_PASSWORD is not set — the print/responsive audits cannot log in." >"$LOG_DIR/print-audit.log"
  fail "print-audit (missing ADMIN_PASSWORD)" "$LOG_DIR/print-audit.log"
fi

if server_up; then
  echo "[pre-publish] app already serving on :5000 — reusing it"
else
  echo "[pre-publish] no app on :5000 — starting a temporary dev server"
  NODE_ENV=development npx tsx server/index.ts >"$LOG_DIR/dev-server.log" 2>&1 &
  STARTED_SERVER_PID=$!
  deadline=$((SECONDS + 120))
  until server_up; do
    if ! kill -0 "$STARTED_SERVER_PID" 2>/dev/null; then
      fail "dev-server (crashed during startup)" "$LOG_DIR/dev-server.log"
    fi
    if [ $SECONDS -ge $deadline ]; then
      fail "dev-server (not reachable on :5000 after 120s)" "$LOG_DIR/dev-server.log"
    fi
    sleep 3
  done
  echo "[pre-publish] temporary dev server is up"
fi

run_step print-audit node scripts/validation/print-audit.mjs
run_step responsive-audit node scripts/validation/responsive-audit.mjs

# Stop the temporary server (if we started one) before the production build,
# so vite build isn't competing with the dev server for memory.
cleanup
STARTED_SERVER_PID=""

# 5. Production build
run_step build npm run build

echo ""
echo "[pre-publish] ALL CHECKS PASSED — build artifacts are ready in dist/"

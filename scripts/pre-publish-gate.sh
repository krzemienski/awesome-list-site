#!/usr/bin/env bash
# Pre-publish gate: blocks a publish when any quality check fails.
#
# Runs, in order:
#   1. typecheck        — npx tsc (same as `npm run check`)
#   2. migration-drift  — scripts/check-migration-drift.ts
#   3. print-audit      — scripts/validation/print-audit.mjs      (headless Chromium)
#   4. responsive-audit — scripts/validation/responsive-audit.mjs (headless Chromium)
#   5. npm run build    — the actual production build
#   6. bundle-budget    — deterministic entry/major-route size + isolation gate
#
# The two browser audits need the app already serving on :5000 (the dev
# workspace's "Start application" workflow). In the publish build container
# nothing is running — and booting a server there would connect to the
# PRODUCTION database before the publish flow has applied the dev→prod schema
# diff, which breaks boot on any new column and risks admin writes to prod
# mid-build. So when :5000 is down, the audits are SKIPPED (they run as the
# print-audit / responsive-audit dev workflows instead).
#
# Wired into .replit [deployment].build so the Publish flow runs it. Also safe
# to run by hand: bash scripts/pre-publish-gate.sh
#
# Exit code 0 = all checks passed and build produced; 1 = a check failed
# (the FAILED banner names the check, and the log tail shows which page/check).

set -u
LOG_DIR="${PRE_PUBLISH_LOG_DIR:-/tmp/validation/pre-publish}"
mkdir -p "$LOG_DIR"

# --publish: set by .replit [deployment].build. The publish build container
# carries PRODUCTION env vars (DATABASE_URL = prod), so in this mode the gate
# must never open a database connection or boot the app:
#   - migration-drift runs --journal-only (file checks, no DB); the full
#     scratch-DB reproduction runs in dev (migration-drift workflow).
#   - browser audits are skipped unconditionally.
PUBLISH_MODE=0
if [ "${1:-}" = "--publish" ]; then
  PUBLISH_MODE=1
fi

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

# 2. Migration drift. Full check (scratch DB + sequences) only in dev;
# journal-only (no DB connection) in the publish build container, where
# DATABASE_URL is production and the full check's CREATE/DROP DATABASE
# must never run.
if [ "$PUBLISH_MODE" = 1 ]; then
  run_step migration-drift npx tsx scripts/check-migration-drift.ts --journal-only
else
  run_step migration-drift npx tsx scripts/check-migration-drift.ts
fi

# 3+4. Browser audits run ONLY when an app is already serving on :5000 (dev
# workspace). Never boot a server here: in the publish build container it
# would hit the production DB before the schema diff is applied.
if [ "$PUBLISH_MODE" = 1 ]; then
  echo "[pre-publish] SKIP print-audit + responsive-audit — publish build (no app; these run as dev workflows instead)"
elif server_up; then
  echo "[pre-publish] app already serving on :5000 — running browser audits"
  if [ -z "${ADMIN_PASSWORD:-}" ]; then
    echo "FATAL: ADMIN_PASSWORD is not set — the print/responsive audits cannot log in." >"$LOG_DIR/print-audit.log"
    fail "print-audit (missing ADMIN_PASSWORD)" "$LOG_DIR/print-audit.log"
  fi
  run_step print-audit node scripts/validation/print-audit.mjs
  run_step responsive-audit node scripts/validation/responsive-audit.mjs
else
  echo "[pre-publish] SKIP print-audit + responsive-audit — no app on :5000 (publish build container; these run as dev workflows instead)"
fi

# 5. Production build
run_step build npm run build

# 6. The report consumes Vite's logical manifest and module inventory emitted
# by the production build above. It must run after (never before) that build.
run_step bundle-budget npm run bundle:budget

echo ""
echo "[pre-publish] ALL CHECKS PASSED — build artifacts are ready in dist/"

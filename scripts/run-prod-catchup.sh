#!/bin/bash
# Task #166 — prod data catch-up: run17/18/19 data fixes + retitle + dedupe,
# twice (pass 2 proves idempotency). Logs to /tmp/prod-catchup.log.
set -uo pipefail
LOG=/tmp/prod-catchup.log
: > "$LOG"

run() {
  local label="$1"; shift
  echo "=== [$label] START $(date -u +%FT%TZ) ===" | tee -a "$LOG"
  "$@" 2>&1 | tee -a "$LOG"
  local rc=${PIPESTATUS[0]}
  echo "=== [$label] EXIT $rc $(date -u +%FT%TZ) ===" | tee -a "$LOG"
  if [ "$rc" -ne 0 ]; then
    echo "ABORT at $label (exit $rc)" | tee -a "$LOG"
    exit "$rc"
  fi
}

export PROD_BASE=https://awesome.video

# ---- pass 1 ----
run run17-p1 npx tsx scripts/run17-data-fixes-prod.ts
run run18-p1 npx tsx scripts/run18-data-fixes-prod.ts
run run19-p1 npx tsx scripts/run19-data-fixes-prod.ts
run retitle-p1 npx tsx scripts/run19-retitle-dup-titles.ts
run dedupe-p1 npx tsx scripts/run19-dedupe-subsubcats.ts

cp evidence/run17/data-fixes-prod.json evidence/run17/data-fixes-prod-pass1.json
cp evidence/run18/data-fixes-prod.json evidence/run18/data-fixes-prod-pass1.json
cp evidence/run19/data-fixes-prod.json evidence/run19/data-fixes-prod-pass1.json
cp artifacts/remediation-2026-07/BUG-003/dedupe-prod.json artifacts/remediation-2026-07/BUG-003/dedupe-prod-pass1.json

# ---- pass 2 (idempotency: expect all no-ops) ----
run run17-p2 npx tsx scripts/run17-data-fixes-prod.ts
run run18-p2 npx tsx scripts/run18-data-fixes-prod.ts
run run19-p2 npx tsx scripts/run19-data-fixes-prod.ts
run retitle-p2 npx tsx scripts/run19-retitle-dup-titles.ts
run dedupe-p2 npx tsx scripts/run19-dedupe-subsubcats.ts

echo "ALL DONE $(date -u +%FT%TZ)" | tee -a "$LOG"

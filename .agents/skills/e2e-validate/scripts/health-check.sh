#!/bin/bash
# ──────────────────────────────────────────────────────────────────
# Health Check Script — Poll service until healthy or timeout
# ──────────────────────────────────────────────────────────────────
# Usage: bash scripts/health-check.sh <url> [timeout_seconds] [label]
# Example: bash scripts/health-check.sh http://localhost:8080/health 60 "Backend"
# Exit: 0 if healthy, 1 if timeout
# ──────────────────────────────────────────────────────────────────
set -euo pipefail

URL="${1:?ERROR: URL required. Usage: health-check.sh <url> [timeout] [label]}"
TIMEOUT="${2:-60}"
LABEL="${3:-Service}"

echo "Checking $LABEL at $URL (timeout: ${TIMEOUT}s)..."

for i in $(seq 1 "$TIMEOUT"); do
  if curl -sf "$URL" > /dev/null 2>&1; then
    echo "  ✓ $LABEL healthy after ${i}s"
    exit 0
  fi
  sleep 1
done

echo "  ✗ $LABEL NOT healthy after ${TIMEOUT}s at $URL"
exit 1

#!/bin/bash
# ──────────────────────────────────────────────────────────────────
# API Validator — Automated curl-based API validation
# ──────────────────────────────────────────────────────────────────
# Usage:
#   BASE_URL=http://localhost:8080 bash scripts/api-validator.sh
#   BASE_URL=http://localhost:8080 AUTH_TOKEN=xxx bash scripts/api-validator.sh
#
# Environment Variables:
#   BASE_URL     — API base URL (required)
#   AUTH_TOKEN   — Bearer token for authenticated requests (optional)
#   EVIDENCE_DIR — Output directory (default: e2e-evidence/api)
# ──────────────────────────────────────────────────────────────────
set -euo pipefail

BASE_URL="${BASE_URL:?ERROR: BASE_URL required. Set BASE_URL=http://localhost:PORT}"
AUTH_TOKEN="${AUTH_TOKEN:-}"
EVIDENCE_DIR="${EVIDENCE_DIR:-e2e-evidence/api}"
PASS_COUNT=0
FAIL_COUNT=0
TOTAL=0

mkdir -p "$EVIDENCE_DIR"

echo "═══════════════════════════════════════════════"
echo "  API Validator"
echo "═══════════════════════════════════════════════"
echo "  Base URL: $BASE_URL"
echo "  Evidence: $EVIDENCE_DIR"
echo "═══════════════════════════════════════════════"

# ─── Helper Functions ───

validate_endpoint() {
  local METHOD="$1"
  local PATH="$2"
  local EXPECTED_STATUS="$3"
  local DESCRIPTION="$4"
  local BODY="${5:-}"
  local EVIDENCE_NAME="${6:-$(echo "$PATH" | tr '/' '-' | sed 's/^-//')}"

  TOTAL=$((TOTAL + 1))
  local EVIDENCE_FILE="$EVIDENCE_DIR/${TOTAL}-${METHOD}-${EVIDENCE_NAME}"

  echo ""
  echo "── Test $TOTAL: $DESCRIPTION ──"
  echo "   $METHOD $BASE_URL$PATH"

  local CURL_ARGS=(-s -w "\nHTTP_STATUS:%{http_code}\nTIME:%{time_total}s\n")
  CURL_ARGS+=(-X "$METHOD")
  CURL_ARGS+=(-H "Content-Type: application/json")

  if [ -n "$AUTH_TOKEN" ]; then
    CURL_ARGS+=(-H "Authorization: Bearer $AUTH_TOKEN")
  fi

  if [ -n "$BODY" ]; then
    CURL_ARGS+=(-d "$BODY")
  fi

  local RESPONSE
  RESPONSE=$(curl "${CURL_ARGS[@]}" "$BASE_URL$PATH" 2>&1)

  # Extract status code
  local STATUS
  STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)

  # Extract body (everything before HTTP_STATUS line)
  local BODY_CONTENT
  BODY_CONTENT=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/,$d')

  # Save evidence
  echo "$BODY_CONTENT" > "${EVIDENCE_FILE}.json"
  echo "$RESPONSE" > "${EVIDENCE_FILE}-full.txt"

  # Verify status
  if [ "$STATUS" = "$EXPECTED_STATUS" ]; then
    echo "   ✓ Status: $STATUS (expected: $EXPECTED_STATUS)"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "   ✗ Status: $STATUS (expected: $EXPECTED_STATUS)"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi

  echo "   Evidence: ${EVIDENCE_FILE}.json"
}

verify_json_field() {
  local FILE="$1"
  local JQ_EXPR="$2"
  local DESCRIPTION="$3"

  if jq -e "$JQ_EXPR" "$FILE" > /dev/null 2>&1; then
    echo "   ✓ $DESCRIPTION"
  else
    echo "   ✗ $DESCRIPTION"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    PASS_COUNT=$((PASS_COUNT - 1))  # Revert the status pass
  fi
}

# ─── Example: Health Check ───
validate_endpoint "GET" "/health" "200" "Health check" "" "health"

# ─── Summary ───
echo ""
echo "═══════════════════════════════════════════════"
echo "  API Validation Summary"
echo "═══════════════════════════════════════════════"
echo "  Total:  $TOTAL"
echo "  PASS:   $PASS_COUNT"
echo "  FAIL:   $FAIL_COUNT"
echo "  Evidence: $EVIDENCE_DIR"
echo "═══════════════════════════════════════════════"

# Save summary
cat > "$EVIDENCE_DIR/summary.txt" << EOF
API Validation Summary
======================
Base URL: $BASE_URL
Total:    $TOTAL
PASS:     $PASS_COUNT
FAIL:     $FAIL_COUNT
Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
EOF

[ "$FAIL_COUNT" -gt 0 ] && exit 1 || exit 0

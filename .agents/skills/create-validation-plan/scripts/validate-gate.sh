#!/bin/bash
set -euo pipefail
# validate-gate.sh - Check gate evidence files exist and are non-empty
# Usage: ./validate-gate.sh <evidence-dir> <gate-id> <file1> [file2] ...
# Returns 0 if all present+non-empty, 1 otherwise
# IMPORTANT: File existence is NOT validation. You must still READ and verify content.

EVIDENCE_DIR="${1:?Usage: validate-gate.sh <evidence-dir> <gate-id> <file1> [file2] ...}"
GATE_ID="${2:?Missing gate ID}"
shift 2

[ $# -eq 0 ] && echo "Error: No evidence files specified" && exit 1

GATE_LOG="$EVIDENCE_DIR/gate-log.txt"
ALL_PASS=true

for FILE in "$@"; do
    FILEPATH="$EVIDENCE_DIR/$FILE"
    if [ ! -f "$FILEPATH" ]; then
        echo "  ✗ MISSING: $FILE"
        ALL_PASS=false
    elif [ ! -s "$FILEPATH" ]; then
        echo "  ✗ EMPTY: $FILE"
        ALL_PASS=false
    else
        echo "  ✓ EXISTS: $FILE ($(wc -c < "$FILEPATH" | tr -d ' ') bytes)"
    fi
done

if [ "$ALL_PASS" = true ]; then
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $GATE_ID: EVIDENCE_CHECK PASS" >> "$GATE_LOG"
    echo ""
    echo "Files present. Now READ each file and verify content against PASS criteria."
    echo "A crash dump is also a file. A 404 response is also JSON."
    exit 0
else
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $GATE_ID: EVIDENCE_CHECK FAIL" >> "$GATE_LOG"
    exit 1
fi

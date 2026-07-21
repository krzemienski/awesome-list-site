#!/bin/bash
set -euo pipefail
# collect-evidence.sh - Initialize evidence collection for a phase
# Usage: ./collect-evidence.sh <phase-dir>

PHASE_DIR="${1:?Usage: collect-evidence.sh <phase-dir>}"

if [ ! -d "$PHASE_DIR" ]; then
    echo "Error: Phase directory not found: $PHASE_DIR"
    exit 1
fi

EVIDENCE_DIR="$PHASE_DIR/evidence"
mkdir -p "$EVIDENCE_DIR"

GATE_LOG="$EVIDENCE_DIR/gate-log.txt"
echo "# Gate Execution Log" > "$GATE_LOG"
echo "# Phase: $(basename "$PHASE_DIR")" >> "$GATE_LOG"
echo "# Started: $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$GATE_LOG"
echo "" >> "$GATE_LOG"

echo "Evidence initialized: $EVIDENCE_DIR"
echo "Log gate results: echo \"VG-1: PASS\" >> $GATE_LOG"

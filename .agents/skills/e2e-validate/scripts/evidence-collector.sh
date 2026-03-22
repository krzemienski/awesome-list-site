#!/bin/bash
# ──────────────────────────────────────────────────────────────────
# Evidence Collector — Initialize evidence directory structure
# ──────────────────────────────────────────────────────────────────
# Usage: bash scripts/evidence-collector.sh [platform]
# Creates: e2e-evidence/ with platform-appropriate subdirectories
# ──────────────────────────────────────────────────────────────────
set -euo pipefail

PLATFORM="${1:-generic}"
EVIDENCE_DIR="e2e-evidence"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo "═══════════════════════════════════════════════"
echo "  E2E Evidence Collector"
echo "═══════════════════════════════════════════════"
echo "  Platform:  $PLATFORM"
echo "  Directory: $EVIDENCE_DIR"
echo "  Timestamp: $TIMESTAMP"
echo "═══════════════════════════════════════════════"

# Create base structure
mkdir -p "$EVIDENCE_DIR"/{screenshots,responses,logs,output}

# Platform-specific directories
case "$PLATFORM" in
  ios)
    mkdir -p "$EVIDENCE_DIR"/ios/{screenshots,video,logs,crashes}
    ;;
  cli)
    mkdir -p "$EVIDENCE_DIR"/cli/{stdout,stderr,build}
    ;;
  api)
    mkdir -p "$EVIDENCE_DIR"/api/{endpoints,db-checks}
    ;;
  web)
    mkdir -p "$EVIDENCE_DIR"/web/{screenshots,responsive,console}
    ;;
  fullstack)
    mkdir -p "$EVIDENCE_DIR"/{api/{endpoints,db-checks},web/{screenshots,responsive,console}}
    ;;
esac

# Write metadata
cat > "$EVIDENCE_DIR/run-metadata.txt" << EOF
E2E Validation Run
==================
Platform:  $PLATFORM
Timestamp: $TIMESTAMP
Started:   $(date -u +"%Y-%m-%dT%H:%M:%SZ")
Status:    IN_PROGRESS
EOF

# Initialize gate log
cat > "$EVIDENCE_DIR/gate-log.txt" << EOF
# Validation Gate Log
# Each gate records: timestamp | gate_name | PASS/FAIL | evidence_path
EOF

echo ""
echo "Evidence directory initialized:"
find "$EVIDENCE_DIR" -type d | sort | sed 's/^/  /'
echo ""
echo "Ready for evidence collection."

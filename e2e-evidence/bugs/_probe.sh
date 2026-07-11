#!/usr/bin/env bash
# Reusable curl probe helper for bug reproduction.
# Usage:
#   ./probe.sh <method> <path> [extra curl flags...]
# Captures method, full URL, HTTP code, body size, body (first 4 KB), and
# Content-Security-Policy / Set-Cookie headers to stdout.
set -u
M="${1:-GET}"
P="${2:-/}"
shift 2 || true
BASE="${PROBE_BASE:-http://localhost:5004}"
URL="${BASE}${P}"
echo "----- $M $P -----"
curl -sS -o /tmp/_probe_body -D /tmp/_probe_headers \
  -w 'http=%{http_code} time=%{time_total}s bytes=%{size_download}\n' \
  -X "$M" "$@" "$URL"
echo "CSP:" $(grep -i '^content-security-policy:' /tmp/_probe_headers | head -c 240)
echo
echo "Set-Cookie:" $(grep -i '^set-cookie:' /tmp/_probe_headers | head -c 240)
echo
echo "Body (first 4KB):"
head -c 4096 /tmp/_probe_body
echo
echo "----- end -----"

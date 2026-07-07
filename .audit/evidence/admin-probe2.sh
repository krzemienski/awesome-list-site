#!/bin/bash
SID=$(cat .audit/evidence/sid-active.txt)
echo "===Admin endpoints==="
for ep in /api/admin/pending /api/admin/approvals /api/admin/users /api/admin/stats; do
  for method in GET POST; do
    code=$(curl -s -X $method -A "Mozilla/5.0" --cookie "connect.sid=$SID" -H "Content-Type: application/json" -d '{}' --max-time 8 -o /dev/null -w "%{http_code}" "https://awesome.video${ep}")
    echo "  $method $ep -> $code"
  done
done
echo ""
echo "===Pending content==="
curl -s -A "Mozilla/5.0" --cookie "connect.sid=$SID" --max-time 8 "https://awesome.video/api/admin/pending" | head -c 800
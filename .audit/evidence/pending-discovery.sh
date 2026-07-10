#!/bin/bash
SID="s%3AtfI5dJNq0CJypzWObjHxIgLdICI5UrIq.Fpp%2B6xBcviP77eReG3cRAuXHwTc5mgzeMHp081PoGyw"
echo "===Test: discover pending-approvals endpoint==="
for q in "?status=pending" "?approvalStatus=pending" "?pending=1" "?status=pending_approval"; do
  result=$(curl -s -A "Mozilla/5.0" --cookie "connect.sid=$SID" --max-time 8 "https://awesome.video/api/resources${q}&limit=5" | head -c 200)
  echo "  /api/resources$q: $result"
done
echo ""
echo "===Test submit endpoint explicitly==="
for ep in /api/submit /api/submissions /api/admin/submit /api/resources/submit; do
  for method in GET POST; do
    code=$(curl -s -X $method -A "Mozilla/5.0" --cookie "connect.sid=$SID" -H "Content-Type: application/json" -d '{}' --max-time 8 -o /dev/null -w "%{http_code}" "https://awesome.video${ep}")
    echo "  $method $ep -> $code"
  done
done
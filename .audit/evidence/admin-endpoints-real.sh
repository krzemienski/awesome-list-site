#!/bin/bash
SID="s%3AtfI5dJNq0CJypzWObjHxIgLdICI5UrIq.Fpp%2B6xBcviP77eReG3cRAuXHwTc5mgzeMHp081PoGyw"
echo "===Test pending-resources and stats ==="
curl -s -A "Mozilla/5.0" --cookie "connect.sid=$SID" --max-time 8 "https://awesome.video/api/admin/pending-resources" | head -c 1500
echo ""
echo "---"
echo "===admin/stats==="
curl -s -A "Mozilla/5.0" --cookie "connect.sid=$SID" --max-time 8 "https://awesome.video/api/admin/stats"
echo ""
echo "---"
echo "===List all admin endpoints==="
for ep in admin admin/pending-resources admin/stats admin/pending admin/queue admin/submissions admin/users admin/resources admin/approvals admin/audit admin/ai admin/analytics; do
  for method in GET POST; do
    code=$(curl -s -X $method -A "Mozilla/5.0" --cookie "connect.sid=$SID" -H "Content-Type: application/json" -d '{}' --max-time 8 -o /dev/null -w "%{http_code}" "https://awesome.video/api/${ep}")
    echo "  $method /api/$ep -> $code"
  done
done
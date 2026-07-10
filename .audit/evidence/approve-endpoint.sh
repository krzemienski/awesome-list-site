#!/bin/bash
SID="s%3AtfI5dJNq0CJypzWObjHxIgLdICI5UrIq.Fpp%2B6xBcviP77eReG3cRAuXHwTc5mgzeMHp081PoGyw"
echo "===Find approve/reject endpoints==="
for body in '{"id":187917,"action":"approve"}' '{"resourceId":187917,"action":"approve"}' '{"ids":[187917],"action":"approve"}' '{"resourceId":187917,"status":"approved"}'; do
  for ep in /api/admin/pending-resources /api/admin/approve /api/admin/resources/187917 /api/admin/resources/187917/approve /api/admin/resources /api/admin/submit-decision; do
    code=$(curl -s -X POST -A "Mozilla/5.0" --cookie "connect.sid=$SID" -H "Content-Type: application/json" -d "$body" --max-time 8 -o /dev/null -w "%{http_code}" "https://awesome.video${ep}")
    echo "  POST $ep body=$body -> $code"
  done
done
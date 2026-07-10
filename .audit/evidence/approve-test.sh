#!/bin/bash
SID="s%3AtfI5dJNq0CJypzWObjHxIgLdICI5UrIq.Fpp%2B6xBcviP77eReG3cRAuXHwTc5mgzeMHp081PoGyw"
for body in '{"action":"approve"}' '{"action":"reject"}' '{}' '{"status":"approved"}' '{"status":"rejected"}' '{"id":187917}' '{"resourceId":187917}'; do
  code=$(curl -s -X POST -A "Mozilla/5.0" --cookie "connect.sid=$SID" -H "Content-Type: application/json" -d "$body" --max-time 8 -o /dev/null -w "%{http_code}" "https://awesome.video/api/admin/resources/187917/approve")
  echo "  body=$body -> $code"
done
echo ""
echo "===Verify 187917 is still in pending list (it was the existing QA test, must not be deleted)==="
curl -s -A "Mozilla/5.0" --cookie "connect.sid=$SID" --max-time 8 "https://awesome.video/api/admin/pending-resources" | head -c 600
echo ""
echo "---"
curl -s -A "Mozilla/5.0" --cookie "connect.sid=$SID" --max-time 8 "https://awesome.video/api/resources/187917" | head -c 400
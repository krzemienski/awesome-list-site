#!/bin/bash
SID="s%3AtfI5dJNq0CJypzWObjHxIgLdICI5UrIq.Fpp%2B6xBcviP77eReG3cRAuXHwTc5mgzeMHp081PoGyw"
echo "===Try unapprove/revert/pending actions==="
for action in unapprove revert pending reopen; do
  code=$(curl -s -X POST -A "Mozilla/5.0" --cookie "connect.sid=$SID" -H "Content-Type: application/json" -d "{\"action\":\"$action\"}" --max-time 8 -o /dev/null -w "%{http_code}" "https://awesome.video/api/admin/resources/187917/approve")
  echo "  action=$action -> $code"
done
echo ""
echo "===Look for delete endpoint==="
for ep in /api/admin/resources/187917 /api/admin/resources/187917/delete /api/admin/pending-resources/187917; do
  for method in DELETE PUT PATCH; do
    code=$(curl -s -X $method -A "Mozilla/5.0" --cookie "connect.sid=$SID" --max-time 8 -o /dev/null -w "%{http_code}" "https://awesome.video${ep}")
    echo "  $method $ep -> $code"
  done
done
echo ""
echo "===Try reject==="
code=$(curl -s -X POST -A "Mozilla/5.0" --cookie "connect.sid=$SID" -H "Content-Type: application/json" -d '{"id":187917,"action":"reject"}' --max-time 8 -o /dev/null -w "%{http_code}" "https://awesome.video/api/admin/resources/187917/approve")
echo "  reject -> $code"
code=$(curl -s -X POST -A "Mozilla/5.0" --cookie "connect.sid=$SID" -H "Content-Type: application/json" -d '{"id":187917,"action":"reject"}' --max-time 8 -o /dev/null -w "%{http_code}" "https://awesome.video/api/admin/resources/187917/reject")
echo "  reject-alt -> $code"
#!/bin/bash
SID="s%3AtfI5dJNq0CJypzWObjHxIgLdICI5UrIq.Fpp%2B6xBcviP77eReG3cRAuXHwTc5mgzeMHp081PoGyw"
echo "===Test admin-side endpoints==="
for ep in /api/user/submissions /api/favorites /api/bookmarks /api/user/progress /api/user/journeys /api/resources; do
  for method in GET POST; do
    code=$(curl -s -X $method -A "Mozilla/5.0" --cookie "connect.sid=$SID" -H "Content-Type: application/json" -d '{}' --max-time 8 -o /dev/null -w "%{http_code}" "https://awesome.video${ep}")
    echo "  $method $ep -> $code"
  done
done
echo ""
echo "===Get pending submissions==="
curl -s -A "Mozilla/5.0" --cookie "connect.sid=$SID" --max-time 8 "https://awesome.video/api/user/submissions" | head -c 1000
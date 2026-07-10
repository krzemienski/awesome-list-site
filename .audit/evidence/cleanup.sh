#!/bin/bash
SID="s%3AtfI5dJNq0CJypzWObjHxIgLdICI5UrIq.Fpp%2B6xBcviP77eReG3cRAuXHwTc5mgzeMHp081PoGyw"
for id in 187919 187920; do
  code=$(curl -s -X DELETE -A "Mozilla/5.0" --cookie "connect.sid=$SID" --max-time 8 -o /dev/null -w "%{http_code}" "https://awesome.video/api/admin/resources/${id}")
  echo "  DELETE $id -> $code"
done
echo ""
echo "===Verify pending list==="
curl -s -A "Mozilla/5.0" --cookie "connect.sid=$SID" --max-time 8 "https://awesome.video/api/admin/pending-resources" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(f'Pending count: {d[\"total\"]}')
for r in d.get('resources', []):
    print(f'  id={r[\"id\"]} title={r[\"title\"][:60]}')
"
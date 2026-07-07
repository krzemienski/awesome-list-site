#!/bin/bash
for ep in /api/auth/user /api/favorites /api/bookmarks /api/user/journeys /api/user/progress /api/user/submissions /api/admin/users /api/admin/stats /api/admin/pending /api/admin/approvals /api/interactions; do
  for method in GET POST; do
    code=$(curl -s -X $method -A "Mozilla/5.0" -b .audit/evidence/sid-jar.txt -H "Content-Type: application/json" -d '{}' --max-time 8 -o /dev/null -w "%{http_code}" "https://awesome.video${ep}")
    echo "  $method $ep -> $code"
  done
done
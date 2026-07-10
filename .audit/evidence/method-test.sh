#!/bin/bash
for ep in /api/favorites /api/bookmarks; do
  for method in GET POST PUT DELETE PATCH; do
    code=$(curl -s -X ${method} -A "Mozilla/5.0" -H "Content-Type: application/json" -d '{"resourceId":186621}' --max-time 10 -o /dev/null -w "%{http_code}" "https://awesome.video${ep}")
    echo "  ${method} ${ep} -> ${code}"
  done
done
#!/bin/bash
echo "===Auth surface 401 discovery==="
for ep in /api/favorites /api/bookmarks /api/profile /api/me /api/session /api/user/me /api/users; do
  for method in GET POST; do
    code=$(curl -s -X ${method} -A "Mozilla/5.0" --max-time 10 -o /dev/null -w "%{http_code}" "https://awesome.video${ep}")
    echo "  ${method} ${ep} -> ${code}"
  done
done
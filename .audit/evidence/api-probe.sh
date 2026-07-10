#!/bin/bash
echo "===Probe likely API endpoints==="
for ep in \
  /api/me /api/user /api/users/me /api/auth/me \
  /api/auth/register /api/auth/logout \
  /api/favorites /api/bookmarks /api/profile \
  /api/submissions /api/admin/submissions \
  /api/resources/count /api/search /api/og-image.png \
  /api/tags /api/categories/tree /api/stats; do
  code=$(curl -s -A "Mozilla/5.0" --max-time 10 -o /dev/null -w "%{http_code}" "https://awesome.video${ep}")
  echo "  GET ${ep} -> ${code}"
done
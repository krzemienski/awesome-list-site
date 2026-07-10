#!/bin/bash
echo "===Test all discovered endpoints from JS bundle ==="
for ep in /api/auth/local/login /api/auth/logout /api/auth/register /api/auth/user /api/login /api/recommendations /api/recommendations/feedback /api/user/journeys /api/user/progress /api/user/submissions /api/interactions /api/journeys /api/claude/analyze /api/bookmarks /api/favorites; do
  for method in GET POST; do
    code=$(curl -s -X $method -A "Mozilla/5.0" -H "Content-Type: application/json" -d '{}' --max-time 8 -o /dev/null -w "%{http_code}" "https://awesome.video${ep}")
    echo "  $method $ep -> $code"
  done
done
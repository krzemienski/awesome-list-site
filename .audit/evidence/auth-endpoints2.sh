#!/bin/bash
curl -s -c .audit/evidence/admin-cookies.txt -X POST -A "Mozilla/5.0" -H "Content-Type: application/json" -d '{"email":"admin@example.com","password":"Usmc12345!"}' --max-time 10 "https://awesome.video/api/auth/local/login" > /dev/null
echo "===Saved cookies===" 
cat .audit/evidence/admin-cookies.txt | grep -v "^#" | head -10
echo ""
echo "===Test authenticated endpoints with cookie==="
for ep in /api/auth/user /api/favorites /api/bookmarks /api/user/journeys /api/user/progress /api/user/submissions /api/admin/users /api/admin/stats /api/admin/pending; do
  for method in GET POST; do
    code=$(curl -s -X $method -A "Mozilla/5.0" -b .audit/evidence/admin-cookies.txt -H "Content-Type: application/json" -d '{}' --max-time 8 -o /dev/null -w "%{http_code}" "https://awesome.video${ep}")
    echo "  $method $ep -> $code"
  done
done
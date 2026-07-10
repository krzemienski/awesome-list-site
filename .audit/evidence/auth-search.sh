#!/bin/bash
echo "===Search for auth endpoints ==="
for ep in /auth/login /auth /login /user/login /user/signin /session /auth/session /api/auth/callback /api/oauth; do
  for method in GET POST; do
    code=$(curl -s -X $method -A "Mozilla/5.0" -H "Content-Type: application/json" -d '{"email":"admin@example.com","password":"Usmc12345!"}' --max-time 8 -o /dev/null -w "%{http_code}" "https://awesome.video${ep}")
    echo "  $method $ep -> $code"
  done
done
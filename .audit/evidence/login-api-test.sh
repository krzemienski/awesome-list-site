#!/bin/bash
echo "===Test login API patterns ==="
for ep in /api/auth/login /api/auth/sign-in /api/login /api/session /api/users/login; do
  for format in json form; do
    if [ "$format" = "json" ]; then
      code=$(curl -s -X POST -A "Mozilla/5.0" -H "Content-Type: application/json" -d '{"email":"admin@example.com","password":"Usmc12345!"}' --max-time 8 -o /dev/null -w "%{http_code}" "https://awesome.video${ep}")
    else
      code=$(curl -s -X POST -A "Mozilla/5.0" -d "email=admin@example.com&password=Usmc12345!" --max-time 8 -o /dev/null -w "%{http_code}" "https://awesome.video${ep}")
    fi
    echo "  POST $ep (format=$format) -> $code"
  done
done
#!/bin/bash
echo "===Probe likely auth endpoints==="
for ep in /api/login /api/auth/sign-in /api/authenticate /api/session /api/user/login /api/users/login /api/users/sign_in; do
  code=$(curl -s -X POST -H "Content-Type: application/json" --data-raw '{"email":"admin@example.com","password":"Usmc12345!"}' --max-time 10 -o /dev/null -w "%{http_code}" "https://awesome.video${ep}")
  echo "  POST ${ep} -> ${code}"
done
echo ""
echo "===Try with form-encoded==="
for ep in /api/auth/login /api/login /api/session; do
  code=$(curl -s -X POST --data-urlencode "email=admin@example.com" --data-urlencode "password=Usmc12345!" --max-time 10 -o /dev/null -w "%{http_code}" "https://awesome.video${ep}")
  echo "  POST form ${ep} -> ${code}"
done
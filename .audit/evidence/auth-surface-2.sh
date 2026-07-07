#!/bin/bash
echo "===Test API auth surface after login (using captured session cookie) ==="
for ep in /api/auth/me /api/auth/logout /api/auth/session /api/me /api/session /api/user/me; do
  for method in GET POST DELETE; do
    code=$(curl -s -X $method -A "Mozilla/5.0" -b "connect.sid=s%3AANfSeDPGIEBLvvwC5l2cYQnMa_BHADA3.0rPtTMZGO%2BLsYLPbWr6wwWe%2F1ygZWtmq9l4m58rKkmc" --max-time 8 -o /dev/null -w "%{http_code}" "https://awesome.video${ep}")
    echo "  $method $ep -> $code"
  done
done
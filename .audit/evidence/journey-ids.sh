#!/bin/bash
echo "===Sitemap /journey/* URLs==="
grep '^/journey' .audit/evidence/sitemap-paths.txt
echo ""
echo "===HTTP for each==="
for id in 6 7 8 9 10 11; do
  code=$(curl -sI -A "Mozilla/5.0" --max-time 8 "https://awesome.video/journey/${id}" -o /dev/null -w "%{http_code}")
  echo "  /journey/$id -> $code"
done
#!/bin/bash
echo "===Test direct loading of /journey/* URLs ==="
for slug in $(grep -oE '/journey/[^/]+' .audit/evidence/sitemap-paths.txt | sort -u); do
  code=$(curl -sI -A "Mozilla/5.0" --max-time 8 "https://awesome.video${slug}" -o /dev/null -w "%{http_code}")
  title=$(curl -s -A "Mozilla/5.0" --max-time 8 "https://awesome.video${slug}" | grep -oE '<title>[^<]+</title>' | head -1)
  echo "  ${slug} -> ${code} ${title}"
done
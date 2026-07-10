#!/bin/bash
curl -s -A "Mozilla/5.0" --max-time 30 "https://awesome.video/assets/index-BFm9aE7z.js" -o .audit/evidence/index.js
echo "JS bundle size: $(wc -c < .audit/evidence/index.js)"
echo "---"
echo "===Search for /api/ endpoints referenced in the JS bundle==="
grep -oE '"/api/[a-z/]+"' .audit/evidence/index.js | sort -u | head -50
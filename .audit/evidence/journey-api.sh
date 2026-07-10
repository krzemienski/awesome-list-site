#!/bin/bash
echo "===SSR /journeys HTML check==="
curl -s -A "Mozilla/5.0" --max-time 8 "https://awesome.video/journeys" -o .audit/evidence/journeys.html
echo "size: $(wc -c < .audit/evidence/journeys.html)"
echo "All /journey/ links in HTML:"
grep -oE '/journey/[0-9]+' .audit/evidence/journeys.html | sort -u
echo ""
echo "===/api/journeys content==="
curl -s -A "Mozilla/5.0" --max-time 8 "https://awesome.video/api/journeys" | head -c 2000
echo ""
echo "---"
echo "===Test /api/journeys/<id>==="
curl -s -A "Mozilla/5.0" --max-time 8 "https://awesome.video/api/journeys/6" | head -c 1500
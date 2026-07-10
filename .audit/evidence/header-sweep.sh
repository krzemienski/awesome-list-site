#!/bin/bash
for url in \
  "https://awesome.video/" \
  "https://awesome.video/category/encoding-codecs" \
  "https://awesome.video/resource/185020" \
  "https://awesome.video/journeys" \
  "https://awesome.video/submit" \
  "https://awesome.video/about" \
  "https://awesome.video/advanced"; do
  echo "===== $url ====="
  curl -sI -L -A "Mozilla/5.0" --max-time 10 "$url" 2>&1 | head -40
  echo ""
done

#!/bin/bash
for q in "ffmpe" "ffmpegwasm" "videostreaming" "h.265" "h265" "hevc" "av1 codec" "doom8" "doomo" "encoding" "xiph" "widevine" "doom9" "doom"; do
  result=$(curl -s -A "Mozilla/5.0" --max-time 8 "https://awesome.video/api/search?q=$(echo $q | sed 's/ /%20/g')" 2>&1 | python3 -c "import json,sys;d=json.load(sys.stdin);print(f'{d[\"total\"]} results')" 2>&1)
  echo "  q='$q' -> $result"
done
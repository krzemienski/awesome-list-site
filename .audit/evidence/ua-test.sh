#!/bin/bash
echo "--- Test: count of href=/resource/ in different UA contexts ---"
for ua in "curl/8.0" "Mozilla/5.0" "Googlebot/2.1" "facebookexternalhit/1.1"; do
  c=$(curl -s -A "$ua" --max-time 8 "https://awesome.video/category/community-events" | grep -c 'href="/resource/')
  echo "  UA='$ua' -> $c resource links (community-events)"
done
echo ""
echo "--- Same for encoding-codecs ---"
for ua in "curl/8.0" "Mozilla/5.0" "Googlebot/2.1" "facebookexternalhit/1.1"; do
  c=$(curl -s -A "$ua" --max-time 8 "https://awesome.video/category/encoding-codecs" | grep -c 'href="/resource/')
  echo "  UA='$ua' -> $c resource links (encoding-codecs)"
done
echo ""
echo "--- Resources listed in <li> for community-events (varies) ---"
for ua in "curl/8.0" "Mozilla/5.0" "Googlebot/2.1" "facebookexternalhit/1.1"; do
  c=$(curl -s -A "$ua" --max-time 8 "https://awesome.video/category/community-events" | grep -oE '<li><a href="/resource/[^>]+>' | wc -l)
  echo "  UA='$ua' -> $c <li> entries"
done
#!/bin/bash
curl -s -A "Mozilla/5.0" --max-time 8 "https://awesome.video/category/community-events" | grep -oE 'href="/resource/[0-9]+"' | sort -u > .audit/evidence/ssr-community-ids.txt
curl -s -A "Mozilla/5.0" --max-time 8 "https://awesome.video/api/resources?category=community-events&limit=400" | python3 -c "
import json,sys
d=json.load(sys.stdin)
ids = [str(r['id']) for r in d['resources']]
with open('.audit/evidence/api-community-ids.txt', 'w') as f:
    for i in ids:
        f.write(i + '\n')
print('API count:', len(ids))
"
echo "Compare:"
echo "SSR unique IDs: $(wc -l < .audit/evidence/ssr-community-ids.txt)"
echo "API IDs: $(wc -l < .audit/evidence/api-community-ids.txt)"
echo "API IDs not in SSR (the missing ones):"
comm -23 <(sort -u .audit/evidence/api-community-ids.txt) <(sort -u .audit/evidence/ssr-community-ids.txt)
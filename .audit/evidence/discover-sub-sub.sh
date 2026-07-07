#!/bin/bash
echo "===Subcategories by category==="
curl -s -A "Mozilla/5.0" --max-time 8 "https://awesome.video/api/subcategories" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('count:',len(d))
from collections import Counter
catids = Counter(s['categoryId'] for s in d)
print('Per-category breakdown:')
for k,v in sorted(catids.items()):
    print(f'  categoryId {k}: {v} subcategories')
"
echo ""
echo "===Sub-subcategories endpoints==="
for ep in /api/sub-subcategories /api/subSubcategories /api/level3 /api/leaf /api/subcategory-items /api/level-three /api/subsub; do
  code=$(curl -s -A "Mozilla/5.0" --max-time 10 -o /dev/null -w "%{http_code}" "https://awesome.video${ep}")
  echo "  GET ${ep} -> ${code}"
done
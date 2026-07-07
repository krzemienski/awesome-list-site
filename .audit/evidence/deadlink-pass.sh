#!/bin/bash
TMPF=$(mktemp)
curl -s -A "Mozilla/5.0" --max-time 15 "https://awesome.video/api/resources?limit=400" > "$TMPF"
TOTAL=$(python3 -c "import json;d=json.load(open('$TMPF'));print(d['total'])")
echo "Total resources in API: $TOTAL"
python3 -c "
import json
d=json.load(open('$TMPF'))
seen=set()
out=[]
for r in d['resources']:
    if r['id'] not in seen:
        seen.add(r['id'])
        out.append((r['id'], r['url'], r['category']))
import random
random.seed(42)
sample = random.sample(out, min(25, len(out)))
for sid,url,cat in sample:
    print(f'{sid}\t{cat}\t{url}')
" > .audit/evidence/sampled-urls.tsv
echo "Sampled 25 URLs:"
wc -l .audit/evidence/sampled-urls.tsv
echo ""
echo "===HEAD checks (1s sleep)==="
> .audit/evidence/deadlink-results.txt
while IFS=$'\t' read -r id cat url; do
  code=$(curl -sI -L -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36" --max-time 12 -o /dev/null -w "%{http_code}" "$url" 2>&1)
  eff=$(curl -sIL -A "Mozilla/5.0" --max-time 12 -o /dev/null -w "%{url_effective}" "$url" 2>&1)
  echo "id=$id cat=$cat code=$code effective=$eff original=$url" >> .audit/evidence/deadlink-results.txt
  echo "  [$code] $url"
  sleep 1
done < .audit/evidence/sampled-urls.tsv
echo ""
echo "===Status code summary==="
awk '{print $3}' .audit/evidence/deadlink-results.txt | awk -F= '{print $2}' | sort | uniq -c | sort -rn
echo ""
echo "Non-2xx/3xx:"
grep -vE 'code=[23][0-9][0-9] ' .audit/evidence/deadlink-results.txt | head -20
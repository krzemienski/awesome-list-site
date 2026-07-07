#!/usr/bin/env python3
import urllib.request, re, sys

url = sys.argv[1] if len(sys.argv) > 1 else "https://awesome.video/category/community-events"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
html = urllib.request.urlopen(req, timeout=10).read().decode("utf-8")

m = re.search(r'<ul class="ssr-list"[^>]*>(.*?)</ul>', html, re.DOTALL)
if m:
    items = re.findall(r'<li>(.*?)</li>', m.group(1), re.DOTALL)
    print(f'Items in <ul class="ssr-list">: {len(items)}')
    for it in items[:5]:
        text = re.sub(r'<[^>]+>', ' ', it)
        text = re.sub(r'\s+', ' ', text).strip()
        print(f'  - {text[:120]}')
else:
    print('No <ul class="ssr-list"> found')

# Also look for any <a href="/resource/...">
resource_links = re.findall(r'href="/resource/(\d+)"', html)
print(f'\nTotal href=/resource/ links in HTML: {len(resource_links)}')
print(f'Unique resource IDs: {len(set(resource_links))}')
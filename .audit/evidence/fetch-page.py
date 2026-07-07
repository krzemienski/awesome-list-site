#!/usr/bin/env python3
import urllib.request, re, sys

url = sys.argv[1] if len(sys.argv) > 1 else "https://awesome.video/sub-subcategory/ffmpeg"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
html = urllib.request.urlopen(req, timeout=10).read().decode("utf-8")

m = re.search(r'<title>([^<]+)</title>', html)
if m:
    print(f'Page title: {m.group(1)}')

m = re.search(r'<h1>([^<]+)</h1>', html)
if m:
    print(f'H1: {m.group(1)}')

m = re.search(r'<p class="ssr-lead[^"]*">([^<]+)</p>', html)
if m:
    print(f'Lead: {m.group(1)[:200]}')

m = re.search(r'<nav class="ssr-crumbs[^"]*">(.*?)</nav>', html, re.DOTALL)
if m:
    text = re.sub(r'<[^>]+>', ' ', m.group(1))
    text = re.sub(r'\s+', ' ', text).strip()
    print(f'Breadcrumb: {text}')

m = re.search(r'<ul class="ssr-list"[^>]*>(.*?)</ul>', html, re.DOTALL)
if m:
    items = re.findall(r'<li>(.*?)</li>', m.group(1), re.DOTALL)
    print(f'Resources listed in SSR: {len(items)}')
    for it in items[:5]:
        text = re.sub(r'<[^>]+>', ' ', it)
        text = re.sub(r'\s+', ' ', text).strip()
        print(f'  - {text[:120]}')
else:
    print('No SSR resource list found.')
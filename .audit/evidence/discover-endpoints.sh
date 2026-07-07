#!/bin/bash
for ep in /api/categories/tree /api/taxonomy /api/categories/hierarchy /api/subcategories /api/categories/all /api/categories/with-subcategories /api/subcategories/all; do
  code=$(curl -s -A "Mozilla/5.0" --max-time 10 -o /dev/null -w "%{http_code}" "https://awesome.video${ep}")
  echo "  GET ${ep} -> ${code}"
done
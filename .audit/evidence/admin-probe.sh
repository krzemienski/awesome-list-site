#!/bin/bash
for url in /admin /admin/ /api/admin /api/admin/users /api/admin/resources /internal /config /settings /login /signup /register /bookmarks /profile /settings/ /favorites; do
  code=$(curl -sI -L -A "Mozilla/5.0" -o /dev/null -w "%{http_code}" --max-time 10 "https://awesome.video${url}" 2>&1)
  echo "  ${url} -> ${code}"
done
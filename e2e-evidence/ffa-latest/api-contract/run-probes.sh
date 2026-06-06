#!/bin/bash
D=/Users/nick/Desktop/awesome-list-site/e2e-evidence/ffa-latest/api-contract
B=http://localhost:5001
CURL=/usr/bin/curl
: > "$D/summary.txt"
probe() {
  name="$1"; path="$2"
  code=$("$CURL" -s -o "$D/${name}.body" -w "%{http_code}" "${B}${path}")
  sz=$(/usr/bin/wc -c < "$D/${name}.body" | /usr/bin/tr -d ' ')
  printf "%s  %sB  %s\n" "$code" "$sz" "$path" >> "$D/summary.txt"
}
probe health "/api/health"
probe awesome-list "/api/awesome-list"
probe categories "/api/categories"
probe subcategories "/api/subcategories"
probe sub-subcategories "/api/sub-subcategories"
probe resources "/api/resources"
probe resources-limit5 "/api/resources?limit=5"
probe resources-search-ffmpeg "/api/resources?search=ffmpeg&limit=3"
probe resources-page2 "/api/resources?page=2&limit=5"
probe tags "/api/tags"
probe public-tags "/api/public/tags"
probe public-categories "/api/public/categories"
probe public-resources "/api/public/resources"
probe journeys "/api/journeys"
probe learning-paths-suggested "/api/learning-paths/suggested"
probe recommendations-init "/api/recommendations/init"
probe sitemap "/sitemap.xml"
probe og-png "/og-image.png"
/bin/cat "$D/summary.txt"

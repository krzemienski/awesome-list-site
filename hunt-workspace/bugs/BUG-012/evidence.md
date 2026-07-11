# BUG-012 — /resource?q=<term> returns 404 (no public search endpoint reachable)

**Severity:** HIGH (core search journey broken)
**Affected page:** https://awesome.video/resource?q=ffmpeg (and any other query)

## Reproduction
```bash
for q in ffmpeg codec streaming asdfqwertyzzz; do
  echo -n "/resource?q=$q : "
  curl -sIL -A "Mozilla/5.0" -o /dev/null -w '%{http_code}\n' \
    "https://awesome.video/resource?q=$q"
done
```

All four URLs return **HTTP 404** with a soft "Loading…" SPA placeholder in the rendered body. Searching by URL is not possible.

## Expected
A GET to /resource?q=<query> (or a /search?q=<query> endpoint) should return the matching resources filtered by the query string. Currently the SPA's JS-only client fetches /api/resources?q= but the entry route never resolves server-side.

## Actual
The page returns a hard 404, then renders an SPA "Loading…" placeholder. Search engines and external apps hitting the URL get a soft-404 (a fancy page that says 404 in the status header but doesn't look broken to humans).

## Evidence
- bug-deep-hunt.json, `url_search_ffmpeg.url_search_codec.url_search_streaming.url_search_asdfqwertyzzz` all show `status: 404, text: 'Loading...'`
- `screenshots/url_search_ffmpeg.png` — soft-404 with "Loading…" body

## Fix prompt

```
Task: GET https://awesome.video/resource?q=<query> returns HTTP 404
today. The public search route is unreachable from a typed URL or
external link. The site exposes /api/resources?q=<query> internally,
but the page entry is dead.

Reproduction:
  curl -sIL -o /dev/null -w '%{http_code}\n' \
    https://awesome.video/resource?q=ffmpeg   # prints 404

Acceptance (any one):
(a) Implement server-side rendering or a static-results endpoint at
    /resource (the route or its /search alias) that responds 200 with
    matching cards for valid queries and 200 with empty-state UI for
    no-match queries.
(b) Or change the entry route to /search?q=<query> and make that route
    return 200 with results (rendered server-side or via the SPA
    shell with proper SEO content).
(c) At minimum: stop emitting a hard 404 and instead return 200 with
    the SPA shell that fetches /api/resources?q=<query> on the client.

Verify with curl that the chosen route is reachable and the body
includes rendered results (not just "Loading…").
```

# Production baseline — post-review hardening evidence (2026-09-12)

Architect review of the first commit (`ac1be030`) found: non-atomic per-viewport
resume, silent origin mixing on resume, `--max-navigations` not counting
Lighthouse plus exit-code precedence, compare "same" verdicts that ignored
document bodies / axe node counts / foreign origins, API bodies stored one byte
longer than their recorded `bytes`/`sha256`, and browser traffic not limited to
safe methods. Everything below was run against the fixed scripts from the
uncommitted working tree, so every "commit ac1be030…" in the transcripts names
the previous commit, not the hardening commit that carries these fixes.

## 1. Committed API bodies repaired

The 12 files under `tests/parity/production-baseline/2026-09-12/api/*.json`
had a trailing `\n` appended by the writer. Each was rewritten without it and
re-hashed against `api/shapes.json`:

```
rewritten byte-faithful: 12 mismatch: 0
```

## 2. Compare gate mutation probe (offline, `--candidate`)

A copy of the same-day production candidate (`/tmp/validation/pb-compare-prod-2026-09-12/candidate`)
was mutated in five places, each designed to slip through the old comparison:

| planted change | old verdict | new verdict |
|---|---|---|
| `robots.txt`: one directive altered, same line count | note only | `body` delta |
| `sitemap.xml`: one `<loc>` altered, same URL count | note only | `body` delta |
| `/design-system` axe@375: existing `color-contrast` rule 1 → 2 nodes | same (rule count unchanged) | `axe@375` delta |
| `/category/encoding-codecs` finalUrl → `https://evil.example/category/encoding-codecs` | same (path only) | `final-url` delta |
| `/about` redirect chain → `301 https://evil.example/about` | `∅ → 301→/about` (path only) | `redirects` delta with host shown |

```
- tracked deltas: **5** (5 routes, 0 endpoints)
exit 1
| `/category/encoding-codecs` | 200 | same | +0 / −0 | same | same | 0/0 | 0/0 | final-url |  |
| `/about` | 200 | ∅ → 301→https://evil.example/about | +0 / −0 | same | same | 0/0 | 0/0 | redirects |  |
| `/design-system` | 200 | same | +0 / −0 | same | same | 1/1 → 1/2 | 1/1 | axe@375 |  |
| `/sitemap.xml` | 200 | same | n/a | n/a | n/a | n/a | n/a | body | body differs beyond its own origin |
| `/robots.txt` | 200 | same | n/a | n/a | n/a | n/a | n/a | body | body differs beyond its own origin |
- final URL: `{origin}/category/encoding-codecs` → `https://evil.example/category/encoding-codecs`
- axe @375: +[color-contrast×2] −[color-contrast×1]
```

Control runs on the unmodified candidates after the change:

```
prod  candidate (same day):   tracked deltas 0 · exit 0
local candidate (dev server): tracked deltas 37 (was 36: /sitemap.xml body now tracked; /robots.txt byte-identical → same) · exit 1
```

## 3. Live capture smoke (production, `/tmp/validation/pb-smoke2`)

Exercises: userinfo rejection, `--max-navigations` on routes and Lighthouse,
the atomic resume unit (DOM record deleted while its PNG was kept → the whole
viewport re-captured and the PNG rewritten), `--base` mismatch on resume,
zero blocked non-GET requests, and a 0-delta compare of the re-captured routes
against the committed baseline.

```
== 1 userinfo rejected
Error: --base must not carry credentials (userinfo is written to manifests and reports)
exit 1
== 2 budget 3 over 4 routes (expect exit 2)
Production baseline capture → /tmp/validation/pb-smoke2
  base https://awesome.video · commit ac1be030fe8803c2af47f2b06693bcf42b0e773b · chromium chromium-1223 · lighthouse 12.8.2 · axe 4.13.0
Playwright lease acquired (production-baseline-capture, slot 1/1)
Phase: routes
  status probe /
  capture / @375 +axe
  capture / @768
  capture / @1024
Playwright lease released (production-baseline-capture)
Done in 17s · 3 navigations · 0 throttle retries · 0 failures
  routes complete 0/4 · api 0/12 · lighthouse 0/3
  stopped by --max-navigations; re-run the same command to resume
exit 2
   total 760
   drwxr-xr-x 1 runner runner    128 Sep 12 06:53 .
   drwxr-xr-x 1 runner runner      8 Sep 12 06:53 ..
   -rw-r--r-- 1 runner runner    509 Sep 12 06:53 axe.json
   -rw-r--r-- 1 runner runner  38299 Sep 12 06:53 dom.json
   -rw-r--r-- 1 runner runner 246636 Sep 12 06:53 home@1024.png
   -rw-r--r-- 1 runner runner 218556 Sep 12 06:53 home@375.png
   -rw-r--r-- 1 runner runner 257733 Sep 12 06:53 home@768.png
   -rw-r--r-- 1 runner runner    351 Sep 12 06:53 status.json
== 3 partial unit: drop dom 375 for /, keep PNG
   png mtime before 1789196024234.9797
Production baseline capture → /tmp/validation/pb-smoke2
  base https://awesome.video · commit ac1be030fe8803c2af47f2b06693bcf42b0e773b · chromium chromium-1223 · lighthouse 12.8.2 · axe 4.13.0
Playwright lease acquired (production-baseline-capture, slot 1/1)
Phase: routes
  capture / @375 +axe
  capture / @1440 +axe
Playwright lease released (production-baseline-capture)
Done in 8s · 2 navigations · 0 throttle retries · 0 failures
  routes complete 1/1 · api 0/12 · lighthouse 0/3
exit 0
   png mtime after  1789196034022.9797
   viewports now 375,768,1024,1440 blocked@375 []
== 4 finish the four routes (expect exit 0)
Production baseline capture → /tmp/validation/pb-smoke2
  base https://awesome.video · commit ac1be030fe8803c2af47f2b06693bcf42b0e773b · chromium chromium-1223 · lighthouse 12.8.2 · axe 4.13.0
Playwright lease acquired (production-baseline-capture, slot 1/1)
Phase: routes
  status probe /sign-in
  capture /sign-in @375 +axe
  capture /sign-in @768
  capture /sign-in @1024
  capture /sign-in @1440 +axe
  status probe /submit
  capture /submit @375 +axe
  capture /submit @768
  capture /submit @1024
  capture /submit @1440 +axe
  status probe /recommendations
  capture /recommendations @375 +axe
  capture /recommendations @768
  capture /recommendations @1024
  capture /recommendations @1440 +axe
Playwright lease released (production-baseline-capture)
Done in 37s · 12 navigations · 0 throttle retries · 0 failures
  routes complete 4/4 · api 0/12 · lighthouse 0/3
exit 0
== 5 base mismatch (expect error)
Error: /tmp/validation/pb-smoke2/inventory.json was captured from https://awesome.video, not http://127.0.0.1:5000; use --out/--date for a separate baseline
exit 1
== 5b api from prod
Production baseline capture → /tmp/validation/pb-smoke2
  base https://awesome.video · commit ac1be030fe8803c2af47f2b06693bcf42b0e773b · chromium chromium-1223 · lighthouse 12.8.2 · axe 4.13.0
Phase: api
  api /api/resources?limit=24
  api /api/resources/185020
  api /api/categories
  api /api/subcategories
  api /api/sub-subcategories
  api /api/tags
  api /api/awesome-list/listing?level=category&slug=encoding-codecs
  api /api/journeys
  api /api/journeys/7
  api /api/recommendations
  api /api/health
  api /api/health/ready
Done in 2s · 0 navigations · 0 throttle retries · 0 failures
  routes complete 4/26 · api 12/12 · lighthouse 0/3
exit 0
== 6 lighthouse budget 1 (expect exit 2, 1 report)
Production baseline capture → /tmp/validation/pb-smoke2
  base https://awesome.video · commit ac1be030fe8803c2af47f2b06693bcf42b0e773b · chromium chromium-1223 · lighthouse 12.8.2 · axe 4.13.0
Playwright lease acquired (production-baseline-capture, slot 1/1)
Phase: lighthouse
  lighthouse /
Playwright lease released (production-baseline-capture)
Done in 20s · 1 navigations · 0 throttle retries · 0 failures
  routes complete 4/26 · api 12/12 · lighthouse 1/3
  stopped by --max-navigations; re-run the same command to resume
exit 2
   home.json
   scores.json
== 6b lighthouse budget 2 (expect exit 0, 3 reports)
Production baseline capture → /tmp/validation/pb-smoke2
  base https://awesome.video · commit ac1be030fe8803c2af47f2b06693bcf42b0e773b · chromium chromium-1223 · lighthouse 12.8.2 · axe 4.13.0
Playwright lease acquired (production-baseline-capture, slot 1/1)
Phase: lighthouse
  lighthouse /category/encoding-codecs
  lighthouse /resource/185020
Playwright lease released (production-baseline-capture)
Done in 21s · 2 navigations · 0 throttle retries · 0 failures
  routes complete 4/26 · api 12/12 · lighthouse 3/3
exit 0
   category-encoding-codecs.json
   home.json
   resource-185020.json
   scores.json
== 7 blocked requests across captured routes
   home 375 blocked 0 
   home 768 blocked 0 
   home 1024 blocked 0 
   home 1440 blocked 0 
   recommendations 375 blocked 0 
   recommendations 768 blocked 0 
   recommendations 1024 blocked 0 
   recommendations 1440 blocked 0 
   sign-in 375 blocked 0 
   sign-in 768 blocked 0 
   sign-in 1024 blocked 0 
   sign-in 1440 blocked 0 
   submit 375 blocked 0 
   submit 768 blocked 0 
   submit 1024 blocked 0 
   submit 1440 blocked 0 
== 8 compare the four routes vs baseline (expect 0 deltas)
- routes: 4 · endpoints: 12 · strips: 0 (visual only, never a pixel gate)
- tracked deltas: **0** (0 routes, 0 endpoints)
exit 0
== manifest tail
   routes nav 3 budget 3 stopped true fail 0 17s
   routes nav 2 budget null stopped false fail 0 8s
   routes nav 12 budget null stopped false fail 0 37s
   api nav 0 budget null stopped false fail 0 2s
   lighthouse nav 1 budget 1 stopped true fail 0 20s
   lighthouse nav 2 budget 2 stopped false fail 0 21s
== done
```

## 4. Static gates

```
node --check ×3                                   ok
npx eslint (JS-only config) production-baseline-*.mjs   0 problems
node scripts/validation/root-script-drift.mjs     PASS
```

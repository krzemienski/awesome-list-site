# Handoff: Crawlability & Indexation (robots.txt private-route exclusions)

Date: 2026-10-11

## What the report said

`client/public/robots.txt` put the private-path `Disallow` rules only in the
`User-agent: *` group, and a separate `User-agent: Googlebot` group contained
only `Allow: /`. A crawler follows only the most specific group that names it
(RFC 9309), so Googlebot could crawl `/api/`, `/admin`, `/profile`,
`/bookmarks`, and `/settings/`.

## What was found

This branch already has the fix. No application code changed. Every
named crawler group repeats the default group's five exclusions:

| Group | Agents | Private exclusions |
|---|---|---|
| Default | `*` | yes (plus priority `Allow` lines and `Crawl-delay: 1`) |
| Social preview bots | facebookexternalhit, Facebot, Twitterbot, LinkedInBot, Slackbot, Slackbot-LinkExpanding, WhatsApp, TelegramBot, Discordbot, Applebot | yes |
| Search engines | Googlebot, Googlebot-Image, Bingbot, DuckDuckBot, Baiduspider, YandexBot | yes (plus `Crawl-delay: 1`) |
| AI search/assistant bots | GPTBot, ChatGPT-User, OAI-SearchBot, PerplexityBot, Perplexity-User, ClaudeBot, Claude-Web, anthropic-ai, Google-Extended, Applebot-Extended, Meta-ExternalAgent, Amazonbot, cohere-ai | yes |

The sitemap line is unchanged: `Sitemap: https://awesome.video/sitemap.xml`.

## Evidence from this run (dev, 127.0.0.1:5000)

- `GET /robots.txt` returns HTTP 200 with `text/plain`, and the body is byte-identical
  to `client/public/robots.txt`.
- `robots-parser` (longest-match precedence, the same rule search engines use)
  passed 360/360 assertions. That covers 30 crawler identities, including an unnamed
  crawler that falls back to `*`, each checked on:
  - blocked: `/api/resources?q=video`, `/admin`, `/admin/resources`, `/profile`,
    `/bookmarks`, `/settings/account`
  - allowed: `/`, `/category/video`, `/resource/123`, `/journeys`,
    `/journey/example`, `/about`
- Do not verify with Python's `urllib.robotparser`. It uses first-match rules,
  so `Allow: /` wins and it wrongly reports private paths as allowed.

Production (https://awesome.video, checked 2026-10-11): `/robots.txt` is
byte-identical to the source file, and the parser one-liner in step 2 below
printed only `done [ 'https://awesome.video/sitemap.xml' ]`. Production
already serves the fixed file.

## Validation failures during completion (not caused by this task)

The first completion run failed two checks. Both passed on rerun, and both
failures came from the environment:

1. `npm run validate:response-contracts`: `POST /api/recommendations
   (audit-key admin): fetch failed`. That request is the real, paid AI
   recommendation call. It hung on the external AI router, and the dev server
   was found stopped afterwards. After a restart, a direct POST returned 200 in
   17 s, and the rerun passed: "19 endpoint checks, 0 real mismatches, observer
   liveness verified".
2. `node scripts/validation/ds-button-sweep.mjs`: 8 signed-in checks
   (notifications, onboarding, bookmarks, collection overlays) timed out after
   20 s because the seeded data never appeared on the page. Seeding itself
   succeeded, while signed-in home and settings passed in the same run. This
   fits the server outage above. The rerun passed all 284 checks.

## What main should validate after merge

1. Production robots file (after the next publish):
   `curl -s -A 'Mozilla/5.0' https://awesome.video/robots.txt` should match
   `client/public/robots.txt`. Use a browser user agent; the production edge blocks
   curl's default user agent. Confirm that the `User-agent: Googlebot` group lists the five
   `Disallow` lines.
2. Parser check against production. Run the Node one-liner below with
   `url='https://awesome.video/robots.txt'`. Expect all private paths blocked
   and all public paths allowed for Googlebot, Bingbot, GPTBot, Twitterbot, and an
   unnamed bot:
   ```bash
   node --input-type=module -e "import p from 'robots-parser';const u='https://awesome.video/robots.txt';const b=await (await fetch(u,{headers:{'User-Agent':'Mozilla/5.0'}})).text();const r=p(u,b);for(const a of ['Googlebot','Bingbot','GPTBot','Twitterbot','SomeBot'])for(const [x,want] of [['/api/x',0],['/admin',0],['/profile',0],['/bookmarks',0],['/settings/a',0],['/',1],['/resource/1',1]])if(+r.isAllowed(new URL(x,u).href,a)!==want)console.log('FAIL',a,x);console.log('done',r.getSitemaps())"
   ```
   The only output should be `done [ 'https://awesome.video/sitemap.xml' ]`.
3. Search Console (owner only, optional): open the robots.txt report. It should
   show the fetched file with no errors, and URL Inspection on `/admin` should
   report "Blocked by robots.txt".
4. If either check in the previous section fails again in a combined
   validation run, first confirm `Start application` is still running and rerun
   that check alone. Treat it as a code regression only if it fails against a
   healthy server.

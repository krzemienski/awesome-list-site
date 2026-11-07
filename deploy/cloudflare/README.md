# Cloudflare deployment prerequisites

## AI crawler delivery policy

**Owner:** the Awesome.Video Cloudflare zone administrator is responsible for
edge bot settings and exceptions. The deployment operator must obtain that
administrator's confirmation before treating this hostname as crawler-ready,
and repeat the review after bot-policy, WAF, robots.txt, or hostname changes.

**Scope:** `cf.awesome.video`, as configured in `wrangler.jsonc`, and any future
primary-domain migration behind Cloudflare. Canonicals and the sitemap URL
remain on `https://awesome.video`. This is not evidence that the Replit-served
apex is blocked.

**Current assurance:** this runbook records the required policy, not an inspection
or change of live dashboard settings. Actual edge configuration and verified
crawler access remain unconfirmed until the zone administrator checks them.
Wrangler deployment does not apply these zone settings.

### Required settings before crawler-ready sign-off

1. In the zone's **Security Settings → Configure AI bot policies**, explicitly
   select **Allow (do not block)** for **Search**, **Agent**, and **Training**.
   Training is included because `client/public/robots.txt` deliberately permits
   training and mixed-purpose crawlers such as GPTBot and ClaudeBot as well as
   search and user-initiated agents. Do not rely on defaults or use “Block on
   pages with ads.” If the dashboard still exposes the legacy **Block AI bots**
   toggle, disable it. These zone-level choices need the zone administrator's
   approval because other hostnames may share the zone.
2. If other zone traffic must retain AI blocking, use supported, narrowly scoped
   exceptions instead: restrict them to `cf.awesome.video`, verified intended
   agents, GET/HEAD, and the public discovery routes below. Confirm the exception
   actually bypasses the blocking product; a generic WAF Skip rule does not
   necessarily bypass every bot control. If the plan/product cannot express the
   required exception, resolve the conflict with the zone administrator before
   sign-off rather than disable unrelated security.
3. Review **AI Crawl Control**, Bot Fight Mode/Super Bot Fight Mode, managed and
   custom WAF rules, rate limits, and challenges for overlapping restrictions.
   Intended verified crawlers must receive public content without a JavaScript,
   CAPTCHA, login, payment, or other interstitial. Do not allow a request solely
   because its User-Agent claims to be a crawler.
4. Disable **Enable Bot Preference Sync** (or the legacy **managed robots.txt**
   setting). Serve the checked-in `client/public/robots.txt` without Cloudflare
   prepending conflicting `Disallow` groups or content-use signals. Any future
   managed-policy adoption requires an explicit review against that file,
   including every named AI group and the private-route exclusions.

### Route and security boundaries

- Public discovery: `/`, `/robots.txt`, `/sitemap.xml`, the public pages listed
  in that sitemap (including `/category/…`, `/subcategory/…`,
  `/sub-subcategory/…`, `/resource/…`, published `/journey/…`, `/journeys`,
  `/advanced`, and `/about`), and assets needed to render those pages.
- Keep `/api/`, `/admin`, `/profile`, `/bookmarks`, and `/settings/` outside
  crawler exceptions, matching the checked-in robots exclusions. Keep other
  authentication, account, nonpublic-content, and write routes protected too.
- Preserve application authentication, authorization, private-content status
  checks, and abuse protections. `Allow: /` is a crawl preference, not permission
  to access private data. Never create a global security bypass for crawlers.
- Worker/container code cannot undo an edge rejection: a blocked request never
  reaches `src/index.ts`. Do not add application-level bot bypasses or change
  canonical URLs to compensate.

### Operator confirmation

Before sign-off, record the reviewer, date, hostname, selected policy values,
exception rule IDs/scope (if any), and observations in the deployment change
record; do not put credentials in it.

- Inspect the served robots.txt for unexpected managed additions and verify the
  AI groups, private exclusions, and apex sitemap URL match the checked-in file.
- Check robots.txt, sitemap.xml, home, and a real public resource/category/journey
  page return their expected content without edge challenges. Confirm page
  canonical URLs still use the apex.
- Use Cloudflare Security Events/AI Crawl Control observations from actual
  verified crawler requests to confirm no block or challenge applies. A browser
  visit or a spoofed crawler User-Agent alone cannot prove verified-agent access.
- Confirm anonymous requests to private pages/APIs retain the application's
  expected sign-in/denial behavior and private content is not exposed.

References: Cloudflare's [AI bot policies](https://developers.cloudflare.com/bots/additional-configurations/block-ai-bots/)
and [managed robots.txt / Bot Preference Sync](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/).

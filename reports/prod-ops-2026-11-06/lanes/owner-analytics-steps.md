# Owner steps for decision 4: get analytics the agent can read

Layout is mine. Research only: I changed no account and created no key. Where a doc page did not confirm a click path I say **(from memory, check on screen)**. Google and Replit menus move; if a label differs, send me a screenshot of what you see.
Never paste a key file into chat or commit it. Time: about 10 minutes for step 1, 20 for steps 2-3.

## 1. Replit Analytics (best source: sees visitors before they accept cookies)
Docs: https://docs.replit.com/category/replit-deployments (the Replit docs have no dedicated Analytics page URL I could open; the Growth pane is described there).
1. Open the Awesome Video project in Replit (replit.com/@krzemienski/Awesome-Video).
2. Open the **Tools** pane, and under **Replit Cloud** choose **Growth**. The docs say it shows visitors, top pages, referrers, countries, browsers, devices. (Your Publishing screen may also have an Analytics tab; use whichever shows these.)
3. Set the date range to **Last 28 days**. Take a screenshot of each view: page views and visitors totals, the daily chart, Top pages, Referrers, and Events (custom events, if there is an Events list).
4. Repeat for **Last 90 days** (or the longest range offered; say what the maximum is).
5. Save the PNGs as `28d-overview.png`, `28d-pages.png`, `28d-referrers.png`, `28d-events.png`, and the same with `90d-`, into `reports/prod-ops-2026-11-06/evidence/analytics/owner/`.
Note: Replit's counts include real visitors only; our own admin and test browsers are excluded by the app.

## 2. Google Analytics 4: a read-only robot account
Docs: https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart-client-libraries and https://support.google.com/analytics/answer/9216061
A. **Find the property id.** analytics.google.com → gear icon (Admin) → **Property settings** (older label: Property details). Copy the **Property ID** (digits only, e.g. 123456789). **(from memory, check on screen; docs page did not say.)**
B. **Create a Google Cloud project (or use an existing one).** console.cloud.google.com → project picker → **New project**, name it `awesome-video-analytics-read`.
C. **Enable the API.** In that project: **APIs & Services → Library**, search **Google Analytics Data API**, click **Enable** (the quickstart links the same button).
D. **Create the service account.** **IAM & Admin → Service Accounts → Create service account**, name `analytics-reader`. Skip the optional "grant access" steps (it needs no Cloud role). Finish. Copy its email (ends `@<project>.iam.gserviceaccount.com`). **(from memory, check on screen.)**
E. **Download a key.** Click the account → **Keys → Add key → Create new key → JSON**. Save it to `~/.config/awesome-audit/ga4-reader.json` (outside the repo), then run `chmod 600` on it. If your organization blocks key creation, tell me; the alternative is `gcloud auth application-default login` on your Mac (gcloud is not installed here).
F. **Give the robot read access.** In GA4: Admin → **Property access management** → blue **+** → **Add users** → paste the service-account email → role **Viewer** → untick "Notify new users by email" → **Add**. **(from memory, check on screen.)** Viewer cannot change anything.
G. **Check, do not change, Enhanced measurement.** Admin → **Data streams** → click the web stream → under **Enhanced measurement** click the gear. Open **Page views** → advanced. Look for the browser-history option (docs describe it as "send based on browser-history events"; our docs call it "Page changes based on browser history events"). **Tell me On or Off and send a screenshot. Do not switch it.** (If On, SPA page views may be counted twice; the fix is a separate decision.)
H. Tell me the property id and the key path. Do not send the key contents.

## 3. Search Console
Docs: https://support.google.com/webmasters/answer/7687615
1. search.google.com/search-console → pick the awesome.video property (if none exists, say so; verifying a property is a separate step).
2. **Settings → Users and permissions → Add user**.
3. Paste the same service-account email, permission **Restricted** (view only), **Save**.
Caveat: the docs say only that users need a valid Google account; they do not confirm service-account emails work. If Google rejects it, add your own Google account instead and I will use `gcloud` login, or export the Performance report yourself (28 d and 90 d, queries and pages, as CSV into the same `owner/` folder).

## 4. What the agent runs first (read-only)
Credentials: `GOOGLE_APPLICATION_CREDENTIALS=~/.config/awesome-audit/ga4-reader.json`, property `properties/<ID>`. Output lands in `reports/prod-ops-2026-11-06/evidence/analytics/ga4/` as JSON (no personal data: only paths, counts).
Four `runReport` calls (npm `@google-analytics/data` 7.3.0), each run for `28daysAgo` and `90daysAgo` to `today`:
1. Pages: dimensions `pagePath`; metrics `screenPageViews`, `activeUsers`; order by `screenPageViews` desc; limit 100.
2. Templates: same metrics, dimension `pagePath` then grouped by the agent into home / category / subcategory / resource / tag / journey / search / other (GA4 has no built-in "template" field).
3. Events: dimension `eventName`; metrics `eventCount`, `totalUsers`.
4. Daily: dimension `date`; metrics `screenPageViews`, `activeUsers` (to compare against the publish dates in `lanes/analytics.md`).
Equivalent with Google's analytics-mcp 1.1.0 (read-only unless started with `--allow-write`): tool `run_report` with the same dimensions, metrics and date ranges; needs the `analytics.readonly` scope.
Expect GA4 to show far fewer events than Replit (only visitors who accepted consent), so the two will not match; that gap is itself a finding.

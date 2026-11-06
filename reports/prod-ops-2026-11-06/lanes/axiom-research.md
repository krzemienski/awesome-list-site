# Axiom query/ingest research (closes selfheal untested item 5)

> Research only: official-docs fetches, `npm view`. No account created, no prod contact. Fetched 2026-11-06. "NOT DOCUMENTED" = the page I fetched did not say it; I did not guess.

## 1. Tokens
Source: https://axiom.co/docs/reference/tokens , https://axiom.co/docs/restapi/token
- **API tokens** (limited privileges): **Basic** = ingest only, you pick the datasets ("Dataset access"). **Advanced** = you pick the actions; choose a preset (e.g. "Preset - Evaluations") or **Custom**, which selects datasets plus actions, plus "Org level permissions" for org-wide actions.
- **Personal access tokens (PATs)**: full account control, need the org ID; docs say prefer API tokens. The ingest endpoint rejects PATs ("only supports API tokens").
- Privileges **cannot be changed after creation**; secret shown once. Optional expiry date. Created in Settings > API tokens > New API token.
- **Ingest-only token** = Basic token, dataset access = the one dataset.
- **Query-only token** = Advanced token, Custom, one dataset, query action only.
- **NOT DOCUMENTED:** exact capability strings (`ingest`, `query`, `datasetCapabilities` ...). The token pages describe them in prose and the console UI only. Pick the labels in the UI at creation time and record them then; do not hard-code names from this note.
- Plan: Personal allows **3 datasets** and 1 user (https://axiom.co/docs/reference/limits), so use one dataset (e.g. `awesome-video-logs`) with two tokens.

## 2. Ingest
Source: https://axiom.co/docs/restapi/ingest , https://axiom.co/docs/reference/edge-deployments
- `POST https://<edge-domain>/v1/ingest/<DATASET>`. Edge domains (same domain for ingest and query): `us-east-1.aws.edge.axiom.co`, `eu-central-1.aws.edge.axiom.co`. `api.axiom.co` is the base for other API endpoints; the docs do not say it serves ingest/query. SDKs default to US East 1.
- Headers: `Authorization: Bearer <API_TOKEN>`; `Content-Type: application/x-ndjson` (one JSON object per line), or `application/json` (array), or `text/csv`.
- `_time` field = event time (RFC 3339); optional `timestamp-field` / `timestamp-format` params. Events with `_time` >24 h in the future or before the epoch are not stored.
- Response: `ingested`, `failed`, `failures`, `processedBytes`, `blocksCreated`, `walLength`.
- Limits (https://axiom.co/docs/reference/limits): max **10,000 events per batch**; field size 1 MB; field-name 200 bytes; nesting 100. Oversize values are truncated/replaced, not whole-batch rejected. Personal: 256 fields per dataset; **events adding a new field beyond that are rejected** (keep log fields flat and bounded; do not log arbitrary keys).
- Rate limits: headers `X-RateLimit-Limit/Remaining/Reset/Scope` (per minute), 429 "rate limit exceeded"; `X-IngestLimit-*` (bytes/month). Per-plan numbers **NOT DOCUMENTED** (https://axiom.co/docs/restapi/api-limits). Axiom may suspend ingest for orgs sending far more requests/sec than normal: batch (e.g. flush every 10-30 s or 500 lines), do not send one request per log line.
- Max request body bytes for the event ingest endpoint: **NOT DOCUMENTED** (the 4 MiB figure on the limits page is for `/v1/metrics`). Keep batches well under 1 MB.

## 3. Query
Source: https://axiom.co/docs/restapi/query
- `POST https://<edge-domain>/v1/query/_apl?format=tabular`, headers `Authorization: Bearer <query token>`, `Content-Type: application/json`.
- Body: `{"apl": "<query>", "startTime": "<ts>", "endTime": "<ts>"}` (times optional; docs show only a string placeholder, so use RFC 3339 and confirm once). Alternatively bound time inside APL with `where _time > ago(1h)`; I recommend doing both so a mistaken body cannot scan the retention window.
- Response (tabular): `status` (`elapsedTime`, `rowsExamined`, `rowsMatched`, `isPartial`), `tables[]` each with `fields[]` (name,type) and **`columns[][]`** (column-major, no `rows` key), `datasetNames`. Parse by zipping columns.
- Query limit headers: `X-QueryLimit-Limit/Remaining/Reset` in GB*ms.

Example APL (field names assume our logger emits `level`, `area`, `instance`; adjust to the real schema):
```apl
['awesome-video-logs']
| where _time > ago(1h) and level == 'error'
| summarize errors = count() by area
| order by errors desc
```
```apl
['awesome-video-logs']
| where _time > ago(1h)
| summarize instances = dcount(instance)
```
`dcount` is an approximate distinct count (https://axiom.co/docs/apl/aggregation-function/dcount); `countif` exists (https://axiom.co/docs/apl/aggregation-function/countif) for `summarize errors = countif(level == 'error'), total = count() by area`. `bin_auto(_time)` is available for time series (https://axiom.co/docs/apl/scalar-functions/rounding-functions/bin-auto). I did not run any of these (no account).

## 4. Free plan budget
Sources: https://axiom.co/pricing , https://axiom.co/docs/reference/limits , https://axiom.co/docs/reference/query-hours
- Personal: **500 GB/month** data loading, **25 GB** storage, **10 GB-hours/month** query compute, **30 days** max retention, 3 datasets, 3 monitors.
- GB-hours = query execution time x memory. Docs example: "a typical query analyzing 1 million events might consume approximately 1 GB-second"; 3,600 such queries = 1 GB-hour.
- **Estimate for a 30-min poll** (my arithmetic from that one example, not an Axiom figure): 48 polls/day x 30 = 1,440 polls/month. At 1 GB-s each = 1,440 GB-s = **0.4 GB-hours = ~4 % of 10**. Even at 10x the example cost (10M events scanned) it is ~40 %. Two queries per poll doubles it. Always bound with `ago(1h)` and filter on level first. Tier 0 uses no Axiom queries, so the real load is Tier 1 (every 6 h = 120 polls/month, negligible).
- Ingest sizing: if prod emits e.g. 5 GB/month of logs it is 1 % of 500 GB. Storage 25 GB at 30-day retention is the tighter limit; log only warn/error plus sampled info.
- **What happens at limits:** **not stated for Personal** in the pages I fetched. The usage page (https://axiom.co/docs/reference/usage-billing) only describes paid orgs: when an allowance is used up, queries stop (and monitors cannot query) while ingestion continues as long as the data-loading allowance lasts. The pricing page shows Personal as "n/a (no spend)", i.e. no overage billing. So the expected behaviour is **blocking, not charging**; no forced upgrade is documented, but I could not confirm it. Treat as UNVERIFIED and make the agent handle HTTP 429/403 on query as "Axiom unavailable" (alert via Tier 0 notification, do not retry in a loop).
- Retention: max 30 days on Personal. Whether data older than that is deleted automatically, and whether the retention can be set lower per dataset: **NOT DOCUMENTED** in what I fetched; assume deletion at 30 days.

## 5. Node package vs plain fetch
- `npm view @axiomhq/js`: **version 2.0.0** (modified 2026-09-03), MIT, engines node >=20, single dependency `fetch-retry`, repo github.com/axiomhq/axiom-js.
- **Plain `fetch` is enough** for ingest: one authenticated POST of an NDJSON body. Server already runs Node 22 (global fetch). The SDK adds batching, retry and flush-on-exit; if you skip it, write a small in-process buffer (array, flush every N lines or 10 s, `AbortSignal.timeout(5000)`, drop on failure so logging can never block a request, flush on SIGTERM). That avoids a dependency and is about 30 lines. Take the SDK only if you want its batching without writing it; it is small.
- Query side needs no package: the agent uses `curl` against `/v1/query/_apl` and `jq` over `tables[0].columns`.

## 6. Fallback comparison: Grafana Cloud Loki
Source: https://grafana.com/pricing/ (free tier). Other columns were not fetched, marked "not checked".

| | Axiom Personal | Grafana Cloud free (Loki) |
|---|---|---|
| Ingest allowance | 500 GB/month | 50 GB/month |
| Retention | 30 days | 14 days |
| Query budget | 10 GB-hours/month | not stated on pricing page |
| Query language | APL (SQL-like pipes) | LogQL |
| Push format | NDJSON/JSON to `/v1/ingest/<dataset>` | Loki push API (not checked) |
| At limit | queries blocked per paid-plan docs; Personal unconfirmed | not stated on pricing page |
| Token scoping | Basic (ingest) / Advanced per dataset | not checked |
Verdict: Axiom is the better primary on allowance and retention; Loki is a viable fallback if Axiom's limit behaviour or token scoping disappoints.

## 7. Remaining unknowns (to settle at account-creation time, owner-approved)
1. Exact capability labels in the Advanced/Custom token UI for a query-only, one-dataset token.
2. Personal-plan rate-limit numbers (read `X-RateLimit-Limit` from the first response).
3. Behaviour when query GB-hours run out on Personal.
4. `startTime`/`endTime` accepted formats.
5. Whether auto-delete at 30 days is silent.
Note: the pricing-page fetch result contained some stray terminal/"memory context" text unrelated to pricing; the fetcher ignored it and I did too.

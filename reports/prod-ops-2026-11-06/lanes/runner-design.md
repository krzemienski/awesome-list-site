# prod-check runner design (PLAN §5): `scripts/prod-check/`

> Layout is mine. Design only; no code written. Inputs: `tier1-checks.md`, `tier01-dryrun.md`, `tier3-dryrun.md`, `tier2-spec.md`, PLAN §5. Line counts are estimates. `playwright ^1.60.0` is already in `package.json:134`; `scripts/` holds other `npx tsx` scripts, so no new dependency or tsconfig change is needed (tsconfig `include` does not cover `scripts/`, so the runner is not type-checked by `tsc -p .`; see Risks).

## CLI
`npx tsx scripts/prod-check/index.ts [--tier 0,1,2,3] [--base https://awesome.video] [--only T1-04,T0-01] [--json] [--allow-writes] [--out reports/prod-check]`
- `--tier` default `0,1`. `--only` filters by id after tier selection. `--json` prints `result.json` to stdout and sends all human text to stderr. `--base` must be `https://awesome.video` unless `--allow-other-base` is also given (stops a typo from probing a different host with the owner cookie).
- Tier 2 runs only with `--allow-writes` **and** `PROD_CHECK_AUDIT_MEMBER_COOKIE` + `PROD_CHECK_AUDIT_ADMIN_COOKIE` set; otherwise it exits 3 with a message before any request (see Tier 2 gate).

## Modules (each ≤ 500 lines)
| File | Est. lines | Content |
|---|---|---|
| `index.ts` | 110 | arg parsing (`node:util parseArgs`), tier/only selection, launches browser once if any selected check is `browser`, runs the registry, calls `report.ts`, sets exit code |
| `registry.ts` | 40 | `Check` and `Result` types, `register()`, `select()` (kept out of `index.ts` so check files import it without cycles) |
| `checks/tier0.ts` | 70 | T0-01..03 |
| `checks/tier1-api.ts` | 230 | T1-02..05, 07..09, 14..19 (curl-equivalent via `fetch`) |
| `checks/tier1-browser.ts` | 260 | T1-01, 06, 10..13, NEW-1..4 |
| `checks/tier2.ts` | 330 | T2-00..14, NEW-6/8/9/11 gated; steps from `tier2-spec.md` |
| `checks/tier3.ts` | 200 | T3-j1/j2/t/p1..p6/en/gh/dg/adv; all informational (`blocking:false`) |
| `lib/http.ts` | 90 | `get(url, {ua, auth})` with timeout 15 s, returns `{status, ms, text, json()}`; `ownerHeaders()`; never logs headers |
| `lib/sitemap.ts` | 70 | fetch `/sitemap.xml`, parse `<loc>`, `pick(type, n)` (random but seeded by run id), counts per type |
| `lib/browser.ts` | 110 | launch, contexts per auth state, request guard, console collector, settle helper |
| `report.ts` | 140 | write `result.json`, `summary.md`, screenshot paths; exit code |
Total ≈ 1,650 lines across 11 files.

## Registry shape
```ts
type Result = { status: "pass" | "fail" | "skip" | "info"; detail?: string; values?: Record<string, unknown>; evidence?: string[] };
interface Check { id: string; tier: 0|1|2|3; kind: "api" | "browser"; blocking: boolean; needs?: ("owner"|"auditMember"|"auditAdmin")[];
  run(ctx: Ctx): Promise<Result> }
type Ctx = { base: string; runId: string; http: HttpClient; browser?: BrowserKit; shared: Map<string, unknown> };
```
`ctx.shared` carries values between checks (sitemap list, `totalPublic`, ids). Order is by tier then id; Tier 2 steps are strictly sequential and each is `skip` if a predecessor failed. A check that throws becomes `fail` with the message scrubbed of the cookie strings. A 401 on an `owner` check is reported `fail` with detail `audit session expired`, never as the check's own failure (rule from `tier1-checks.md`).

## Browser use (Playwright)
- **One browser, contexts per auth state:** `chromium.launch()` once; `visitor` context (no cookies), `owner` context (cookie from the owner header), and in Tier 2 `auditMember` / `auditAdmin` contexts. Mobile checks (T1-12) open a 390×844 context. Contexts close after their checks; the browser closes in a `finally`.
- **Loading the session without printing it:** the owner header file already exists (`$HOME/.cache/awesome-audit/owner.hdr`, one `Cookie: …` line). `lib/http.ts` reads the path from `PROD_CHECK_OWNER_HDR` (default that file), parses `Cookie:`, and for Playwright calls `context.addCookies()` from the parsed pairs (domain `awesome.video`, path `/`, secure). The parsed value is never stored in `result.json`, summary, or any log; error strings are passed through a redactor that replaces any cookie value substring. Audit accounts arrive the same way from env (below).
- **Curl-200-before-open rule:** `browser.open(url)` first does `http.get(url)` and requires 200 (or the expected redirect for `/profile`) and a well-formed URL (`new URL()` plus path regex), else the check fails without opening a page. This is the guard against the tier-3 slip (a malformed URL opened in the browser fired a `POST /api/telemetry/dead-link`).
- **Settle:** wait for `networkidle` plus a locator for the thing under test instead of fixed sleeps; use role selectors (`getByRole('combobox')`, `getByRole('option')`), not `cl-` classes, per the dry-run notes. Console collector filters the known external OG-image 429.
- **No analytics:** Playwright's Chromium sets `navigator.webdriver = true`, which the site already uses to suppress analytics; the runner asserts it once per context (`page.evaluate(() => navigator.webdriver)`) and fails the run if false. It also sends no `x-analytics-consent` header.

## Read-only enforcement (Tier 0/1/3)
- Browser: `context.route("**/*", route => …)`: if the request host is `awesome.video` (or a subdomain) and the method is not GET/HEAD/OPTIONS, **abort it and record a violation**. Any recorded violation fails the whole run (`status: fail`, id `GUARD`, exit 2) even if every check passed. Explicit allow-list: none for Tier 0/1/3. Third-party hosts (Clerk, fonts) may POST; only first-party is guarded. Note Clerk traffic proxies through `/api/__clerk/*` on the same host (`server/index.ts:142`), so an owner-context page load could trip the guard on a Clerk POST: allow `POST /api/__clerk/*` only in the `visitor` context sign-in check and log it as `allowed` (**UNVERIFIED**: depends on what the Clerk widget sends on load; the HAR from `visitor2` recorded 0 non-GET, which suggests it sends none).
- API: `lib/http.ts` exposes only `get()` in Tier 0/1/3 (the `HttpClient` type has no `post`); `send(method,…)` exists only on the Tier 2 client object, which is not constructed unless the write gate is open.

## Evidence layout
`reports/prod-check/<UTC yyyymmddThhmmssZ>/`
- `result.json`: `{ schema: 1, runId, startedAt, finishedAt, base, revision, tiers, flags, exit, counts: {pass,fail,skip,info}, guard: {violations:[{method,url}]}, checks: [{id, tier, kind, blocking, status, ms, detail, values}] }`. `revision` = `/api/version`. No cookies, headers, or response bodies.
- `summary.md`: one table (id, status, ms, detail), failures first, the guard result, and the one-line verdict.
- `screenshots/<id>.png` on browser-check failure only, with `evidence` paths in the result. Screenshots of admin lists are masked (skip user-list pages, per lane rules).
- `reports/prod-check/latest` symlink; the previous `result.json` is read only by checks that explicitly want a baseline (none are blocking; T1-03 uses a 4,000 floor).

## Exit codes
0 all blocking checks pass · 1 a blocking check failed · 2 read-only guard violation · 3 bad usage or gate closed (Tier 2 without flag/env, bad `--base`) · 4 runner error (browser would not launch, report not writable) · 5 auth expired (owner 401 on every owner check). Non-blocking (`info`/Tier 3) failures do not change the code but are listed.

## Secrets
Env only, never argv: `PROD_CHECK_OWNER_HDR` (path to the header file, default as above), `PROD_CHECK_AUDIT_MEMBER_COOKIE`, `PROD_CHECK_AUDIT_ADMIN_COOKIE` (full cookie strings). The runner never reads `.env`, never prints env, and `--json` output is built from the same redacted result structure. The audit account passwords are not needed for Tier 2 steps that use the cookie; NEW-6 (sign-in works, wrong password rejected) needs `PROD_CHECK_AUDIT_ADMIN_USER` and `…_PASSWORD` and stays out of the default Tier 2 set.

## Tier 2 gate
Three conditions, all checked in `index.ts` before any check is constructed: `--tier` includes 2, `--allow-writes` is present, and both audit cookie env vars are set. Missing any one: exit 3, no request sent. T2-00 then verifies both sessions (`GET /api/admin/stats` as A, `GET /api/bookmarks` as M), confirms the signed-in users are the audit accounts (not the owner: compare against `PROD_CHECK_AUDIT_*_ID`), records `pendingApprovals` baseline, and aborts on any mismatch. Every created row is titled `[QA-<runId>]`; the cleanup steps T2-10..13 run in a `finally` even when a middle step failed, and Tier 2 never calls approve (NEW-7). The T2-10..13 cleanup endpoints (`qa-rows`) are **not built yet** (#77), so until then Tier 2 stops after T2-05 and reports `skip` for the rest rather than leaving unreachable rows.

## Risks and open points
- `scripts/` is outside tsconfig `include`: add `scripts/prod-check/**/*` to the merge gate's tsc run (or a small `tsconfig.prod-check.json`) so it is type-checked.
- Playwright needs its Chromium binary on the machine that runs it; not verified here.
- Admin-UI checks (NEW-1..3) depend on selectors of a UI that changes; keep them `blocking:false` until they have run clean three times.
- The 6-hourly/30-minute scheduler (B2 design) would run only `--tier 0,1 --only <api checks>`; that wiring is separate.


## Lead amendment (2026-11-06)
Supersedes the cookie env vars on lines 8 and 57: Clerk's `__session` lives ~1 min (`client/src/lib/queryClient.ts:183-184`), so static cookies cannot work. Tier 2 takes `PROD_CHECK_AUDIT_ADMIN_EMAIL/_PASSWORD`, `PROD_CHECK_AUDIT_MEMBER_EMAIL/_PASSWORD` and `PROD_CHECK_AUDIT_ADMIN_ID/_MEMBER_ID`; it signs both accounts in during the run and asserts their ids equal `QA_CLEANUP_USER_IDS` before any write. The owner session is used only for read-only Tier 1 admin GETs, and the runner never opens a resource page on any signed-in context. New flag: `--schedule` (Tier 0 from launchd; T0-01 reported as info).

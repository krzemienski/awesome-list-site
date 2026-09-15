# Task 567 — owned performance replacement

**Verdict: FAIL.** The current real compiled SSR audit server does not meet
the required `local performance >= production performance - 0.03` rule on
Home or category. Resource meets it. No production deploy was made.

## Exact evidence scope

- Production baseline: `https://awesome.video`, mobile Lighthouse 12.8.2,
  routes `/`, `/category/encoding-codecs`, and `/resource/185020`, captured
  in `docs/parity/evidence/audit-567-performance/production-baseline/`.
- Current compiled local run: `http://127.0.0.1:5101`, mobile Lighthouse
  12.8.2, the same three routes, retained in
  `.cache/audit-567-lighthouse-final/`.
- The current compiled server's semantic probes record `data-home-ssr="true"`
  and populated category/resource SSR content in
  `.cache/audit-567-compiled-server-live.log`. That server is an audit-only
  composition whose API GET proxy points at loopback port 5000; it is not a
  production deployment or a claim of deployment parity.
- The earlier compiled Home `0.87` artifact at
  `docs/parity/evidence/audit-567-performance/local-compiled-home/` is not
  used for acceptance. It belongs to the earlier empty-shell/invalid
  compiled capture. The current real-SSR three-route run supersedes it.

## Lighthouse scores

Scores are 0–1. The required minimum is production minus 0.03.

| Route | Production perf | Required minimum | Current compiled perf | Result |
|---|---:|---:|---:|---|
| `/` | 0.91 | 0.88 | 0.60 | **FAIL** |
| `/category/encoding-codecs` | 0.76 | 0.73 | 0.57 | **FAIL** |
| `/resource/185020` | 0.80 | 0.77 | 0.80 | **PASS** |

Full category vectors (`performance / accessibility / best-practices / SEO`):

| Route | Production vector | Current compiled vector |
|---|---|---|
| `/` | `0.91 / 1 / 1 / 1` | `0.60 / 0.98 / 0.96 / 1` |
| `/category/encoding-codecs` | `0.76 / 1 / 1 / 1` | `0.57 / 1 / 0.96 / 1` |
| `/resource/185020` | `0.80 / 1 / 0.96 / 1` | `0.80 / 1 / 0.93 / 1` |

Current compiled metric context from
`.cache/audit-567-lighthouse-final/lighthouse/scores.json`:

| Route | FCP ms | LCP ms | TBT ms | CLS | Interactive ms |
|---|---:|---:|---:|---:|---:|
| `/` | 3543 | 3618 | 924 | 0 | 5145 |
| `/category/encoding-codecs` | 2290 | 5292 | 891 | 0 | 5453 |
| `/resource/185020` | 2292 | 2966 | 482 | 0.051415 | 4774 |

The current run completed all three navigations with zero capture failures.
Its refused Clerk initialization POST is a browser guard observation, not a
score substitution. The separate `perf:mobile` CDP timing command is not
Lighthouse and does not change this verdict.

## Commands and retained evidence

Production baseline command:

```text
npm run baseline:capture -- --base https://awesome.video --only lighthouse --lighthouse-routes /,/category/encoding-codecs,/resource/185020 --out docs/parity/evidence/audit-567-performance/production-baseline --trace-summary
```

Current compiled SSR Lighthouse command:

```text
node scripts/validation/production-baseline-capture.mjs --base http://127.0.0.1:5101 --only lighthouse --lighthouse-routes /,/category/encoding-codecs,/resource/185020 --out .cache/audit-567-lighthouse-final --trace-summary
```

The retained manifest records three navigations, zero throttle retries, and
zero failures. For context only, the old three-route compiled attempt at
`docs/parity/evidence/audit-567-performance/local-compiled-baseline/` stopped
after one navigation with `Target closed` and supplied no category/resource
scores. It cannot fill the current gaps.

The separate CDP timing command was:

```text
PERF_BASE_URL=http://127.0.0.1:5000 PERF_RUNS=3 npm run perf:mobile -- --json docs/parity/evidence/audit-567-performance/perf-mobile-local.json
```

It is retained as timing context only, not as a Lighthouse pass.

## Required follow-up, without waiving the floor

1. Profile and correct the compiled SSR Home path until its performance score
   reaches at least `0.88` under the same pinned mobile Lighthouse command.
2. Profile and correct the compiled SSR category path until it reaches at
   least `0.73`; do not infer this from development mode or Home.
3. Re-run all three routes together with the exact command above and retain the
   complete scores file. Keep the resource route in the run even though it
   currently passes.
4. Reconcile the current SSR server/API composition with the intended
   production topology before any deploy. A loopback audit proxy is evidence
   of this audit server only; it is not permission to publish.
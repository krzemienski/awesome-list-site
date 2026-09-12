---
name: Completion gate database contention
description: How to distinguish configured completion-suite interference from a feature regression.
---

Completion validation can launch database-heavy gates together even when browser audits share a Chromium lease. A pool burst, resilience outage, large SEO crawl, and write-race harness can therefore produce unrelated 503s, empty hydrated pages, and false UI assertion failures.

**Why:** Browser serialization prevents process/thread exhaustion but does not serialize database pressure. A clean restart plus sequential reruns can pass the same UI, race, and SEO gates that fail in the combined suite; the pool probe may also expose an independent capacity baseline.

**How to apply:** Inspect failing logs for 503s or missing content, restart the application, and rerun each failed gate alone. Do not change feature code unless an isolated rerun reproduces a path reached by the feature diff. If an unrelated gate still fails alone, report or skip it explicitly rather than broadening the task.

**Structural fix in place:** the outage-causing resilience gate and the crawl
gates it was killing (SEO snapshot, search typos) now serialize through an
exclusive file lease group ("db-heavy", pid-liveness reclaim, same pattern as
the browser lease — see scripts/validation/gate-lease.mjs). When a NEW gate
either takes a real DB outage or crawls many SSR routes, add it to that lease
group instead of tuning sleep offsets — fixed staggers lose the race as the
suite grows. Verify with a deliberate parallel run of the contentious trio,
not solo reruns.

**Lock ordering:** a gate that holds BOTH the db-heavy lease and the Playwright
browser lease must acquire the gate lease FIRST, then the browser (print-audit,
ds-button-sweep do this). Acquiring them in the opposite order can deadlock
against a gate using the established order. Multi-step authed browser flows
(Clerk sign-in + JIT provisioning) cannot tolerate a DB outage mid-flow, so
any gate that signs in belongs in the db-heavy group.
**Widen the "who needs the lease" test:** it is not only outage-causers and
crawls. Any gate that (a) waits for a real listing to render in a browser or
(b) fires racing writes expecting deterministic status pairs (one 200 + one
409) also fails under the outage/probe window — as a 30 s card-wait timeout or
`fetch failed … ECONNRESET`, which look like app bugs. Both pass solo every
time; the tell is the failure timestamp overlapping the resilience/pool-probe
log window in `.local/state/workflow-logs/<runId>/`. Add the lease rather than
rerunning and hoping.

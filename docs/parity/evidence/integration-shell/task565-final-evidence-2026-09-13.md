# Task 565 final integration evidence — 2026-09-13

This records sanitized results from the frozen candidate runs. It contains no
credential, cookie, audit-key, raw identity response, screenshot, WebSocket
token, or worker URL. It is not a completion claim.

## Authoritative current status

This is the sole current Task 565 status section. The historical appendix
below preserves prior raw-artifact provenance and failed observations; it does
not override this section.

| Area | Current status | Evidence / limit |
|---|---|---|
| Normal application authentication | **PASS.** Real disposable Nick sign-in, reload identity retention, readiness-aware cache-bypass token refresh, authenticated API access, UI sign-out/API 401, protected-route return, and created-identity teardown passed. **No authentication changes are made or proposed.** | [`normal-auth-regression/summary.json`](retained-controls/normal-auth-regression/summary.json) and [`normal-auth-refresh/summary.json`](retained-controls/normal-auth-refresh/summary.json). This is functional auth evidence, not a static-matrix or pixel result. |
| Admin authorization and cold diagnostic | **PASS** for the targeted real-Nick admin contract. The separate injected-abort cold diagnostic remains **FAIL** for Clerk initialization/Worker operations, with no admin exception or allowance. It is a **non-gating historical diagnostic**, not a release gate or application-auth regression. | [`admin-corrected/summary.json`](retained-controls/admin-corrected/summary.json), [`admin-declined/summary.json`](retained-controls/admin-declined/summary.json), and [`admin-initiators/summary.json`](retained-controls/admin-initiators/summary.json). |
| Current four-width admin shell | **PASS** at 375/768/1024/1440 for all six shell checks: four captures, `admin-authorized`, no footer, no horizontal overflow, `1400px` admin measure, and created-identity teardown. | [`current-admin-shell/summary.json`](retained-controls/current-admin-shell/summary.json). This is token-only shell geometry/screenshot evidence, **not an admin-body pixel pass**. |
| Functional dispositions | **Closed.** The 17 retained functional/public dispositions are reconciled with the canonical reachable-state proof; recommendation, drawer/More/taxonomy, and compact-rail controls are real in their prescribed states. | [`task565-public-compare-2026-09-13.md`](task565-public-compare-2026-09-13.md) and [`task565-common-state-proof-2026-09-13/`](task565-common-state-proof-2026-09-13/). This does not assert identical default DOM or data snapshots. |
| Approved Home SSR scope | **Implemented; focused runtime PASS.** Final source-correctness preserves exact Home content while fresh anonymous auth is pending; the initial boot value retires and cannot leak into a later SPA Home mount; unsupported-query SPA fallback keeps the legacy-Curated bridge hidden. Exact-tree SSR remains limited to anonymous public Home, with public-only serialized data, no dehydrated auth, fresh post-hydration auth, legacy Curated/consent reconciliation, four-second fallback clearance, persisted-theme hydration, and exact non-wildcard Clerk CSP. | [`hydration-summary.json`](retained-controls/authorized-lighthouse/normal-lighthouse/fixed-3cold/hydration-summary.json) and [`review69-runtime-summary.json`](retained-controls/authorized-lighthouse/normal-lighthouse/fixed-3cold/review69-runtime-summary.json). The server expansion is authorized only for this public route; signed-in and request-query paths retain the SPA path, with no auth bypass. |
| Home visual evidence | **PASS — current selected 16-row Nick pixel matrix.** All four widths pass the 0.5% ceiling for Home Index (**0.1606/0.1053/0.1738/0.1603%**), Home Curated (**0.1846/0.1977/0.2197/0.2037%**), mobile drawer (**0.4176/0.3091/0.2364/0.1603%**), and palette (**0.4140/0.3748/0.3185/0.3755%**) at 375/768/1024/1440. | [Current run `2026-09-14T16-23-53-893Z-1807`](../../../../tests/parity/baseline/2026-09-14T16-23-53-893Z-1807/results.json): 16/16 PASS, 0 fail/incomplete, 0 API/reference failures. It records clean source state at `a4a7586776406e1dd27936a8a2af6f9dac911035`, a frozen 9-category/1,817-resource snapshot (`a91170d…c0ee0`), and an in-memory reference snapshot. Every row records equal hashes for attempts 1/2 on both actual and expected captures. The run-owned admin Nick identity was torn down locally and in Clerk with no errors; existing identities were retained. The parent’s post-Start-application-restart Home screenshot is healthy smoke evidence only. This is a selected-rows diagnostic (`full: false`; its aggregate `gatePassed: false` is not a full-gate result), not a full-suite, all-screen, or all-resource pixel claim. Retained visitor token-only evidence remains valid but is not a new pixel claim. |
| Deployment-equivalent performance gate (Task 572) | **OPEN in Task 572 — 82 remains required, with no waiver.** The original adjudicated gate is normal, unintercepted Lighthouse and has moved to Task 572. The latest real production-build result on 5105 is **71**, **60**, **68** (median **68/82 FAIL**), but it predates the final auth, CSP, and recovery fixes and is historical, not a fresh final-gate measurement. | [`normal-lighthouse/fixed-3cold/scores.json`](retained-controls/authorized-lighthouse/normal-lighthouse/fixed-3cold/scores.json), [manifest](retained-controls/authorized-lighthouse/normal-lighthouse/fixed-3cold/manifest.json), and [run 3](retained-controls/authorized-lighthouse/normal-lighthouse/fixed-3cold/run-3/run.json). Task 572 owns deployment-equivalent gate resolution. The local development Clerk configuration is not the published live-key baseline, making a deployment-equivalent environment/permission necessary; that constraint does not waive 82 or authorize publishing. |
| Scoped CSS and targeted regression checks | **PASS.** Tailwind now uses `source(none)` with only the client HTML/source roots; the former workspace-default scanner included cache, retained logs, and skills outside the app. Current typecheck, production build, and bundle budget pass; initial gzip is **194.5 KiB** with unchanged caps. | [`client/src/index.css`](../../../../client/src/index.css), [source-root rationale](../../../../.agents/memory/tailwind-v4-source-roots.md), and [`review69-runtime-summary.json`](retained-controls/authorized-lighthouse/normal-lighthouse/fixed-3cold/review69-runtime-summary.json). Earlier retained tablet/design-system/budget logs remain historical and do not waive the gate. |
| Completion-validation and audit recheck | **PASS for responsive and Design System final checks.** The retained final audit reports responsive **58/0** and Design System **284/0**. The five initial source-gate failures are corrected: unused `use-theme` removed; Drawer Escape returns focus to the actual opener; forced-colors changes only the cookie-button border; DS account Home waits for a settled, non-vacuous `h1`; and the canonical parser accepts Tailwind `source(...)` rather than treating it as media syntax. Type, parser, and full canonical cheap checks pass. | [Retained responsive/DS log](retained-controls/completion-responsive-design-system-2026-09-14.log) (SHA-256 `fa2df231775d23298849195bb76f989f3a29172c590b82882726320c87f9b887`). The last platform run reports its other commands PASS, but external `code_review` timed out twice at 600 seconds and is **not PASS**. Independent architect review 94 reports no final critical SSR issue. The remaining external-review infrastructure result is for the parent’s audited exception submission, not a hidden validation waiver or performance claim. Audit-only fixes use optional route settle for no-scenario admin routes and observed actual focus return (687 ms) instead of a 400 ms sleep; they do not alter normal pixel geometry, so the current 16-row evidence remains valid without a rerun. |
| Earlier performance and CPU provenance | **Historical only.** Earlier normal 65/66/72 (median 66), 72/73/66 (median 72), tags/sidebar 62/70/77 (median 70), and strict captures are not fresh final-gate evidence. The genuine closed-tree CPU fix remains retained, but does not establish the required deployment-equivalent score. | [`normal-lighthouse-scoped-css/scores.json`](retained-controls/normal-lighthouse-scoped-css/scores.json), [`normal-lighthouse-final/scores.json`](retained-controls/normal-lighthouse-final/scores.json), [tags/sidebar scores](retained-controls/startup-profile/normal-lighthouse-tags-sidebar-3cold/scores.json), [closed-tree evidence](../sidebar/RESULTS.md), and [strict captures](retained-controls/authorized-lighthouse/faithful-prerender-strict/fixed-3cold/). |

Original audit/E2E evidence is reused with its checks unchanged. This current
report makes no fresh full-suite, all-admin-body-pixel, publication, or
all-screen/resource completion claim. **Task 565's current integration evidence
is reconciled and ready for parent completion review.** Its selected current
16-row pixel matrix passes, while the mandatory deployment-equivalent normal,
unintercepted Lighthouse gate has moved to **Task 572**. The retained 5105
median-68 result remains historical and failed; it is neither waived nor a
fresh final measurement. The completion-validation source recheck is partial
only; responsive 58/0 and Design System 284/0 now pass, while external
`code_review` timed out twice at 600 seconds and is **not PASS**. The parent
will submit that audited infrastructure exception; it creates no hidden
validation waiver or performance claim. Task 572 requires the
environment/permission decision to measure against 82, and that decision does
not authorize automatic publication. The prefetch experiment was removed from
the current approach; its
[retained raw artifacts](retained-controls/authorized-lighthouse/home-prefetch-fixed3/)
are historical only.

## Historical appendix — retained raw-artifact provenance

The sections below are historical evidence and diagnostic context only. They
are intentionally retained, including earlier failures and exception-enabled
performance observations, and must not be read as current status.

### Retained artifacts

- Public comparison: [sanitized summary](task565-public-compare-2026-09-13.md);
  detailed ephemeral output was retained at
  `/tmp/validation/task565-public-compare/` during review.
- Targeted admin candidate: sanitized facts below are from
  `/tmp/validation/task565-admin-candidate-final/summary.json`. The raw summary
  is deliberately not copied. The retained full JSON was reserialized through
  the shared `redactEvidenceUrl` helper: six sensitive URL query values are
  `[REDACTED]`, and no raw sensitive query remains. Its
  refused-development-operation metadata otherwise includes transient URLs.
- Palette evidence:
  [`tests/parity/baseline/2026-09-13T21-47-29-470Z-9558/REPORT.md`](../../../../tests/parity/baseline/2026-09-13T21-47-29-470Z-9558/REPORT.md).
- Static/build/budget output was retained from `/tmp/task565-close-check.log`,
  `/tmp/task565-close-build.log`, and `/tmp/task565-close-budget.log`; the
  sanitized durable log record is
  [task565-close-logs-2026-09-13.md](task565-close-logs-2026-09-13.md).
- Normal-app authentication evidence is retained separately from the static
  read-only capture: the original
  [`normal-auth-regression/summary.json`](retained-controls/normal-auth-regression/summary.json)
  and the focused readiness-corrected
  [`normal-auth-refresh/summary.json`](retained-controls/normal-auth-refresh/summary.json).
  Neither artifact is a read-only-matrix or pixel-pass claim.

### Public comparison: complete, with deltas

The existing comparator completed its four-route, four-width/full-page scope
for `/`, `/about`, `/category/encoding-codecs`, and `/resource/185020`.
There were no missing units, throttling, or capture failures. All documents
were HTTP 200 with the same redirect chains; serious/critical axe findings
were zero at 375 and 1440. It nevertheless reports **17 tracked deltas**:
Home title/test-id (+113/-27), About h1/test-id (+14/-199), Encoding & Codecs
test-id (+15/-31), and resource detail test-id (+9/-205), plus eight API
endpoint deltas.

The production/local dataset remains different (resources 3824→1817,
subcategories 99→92, L3 32→27, tags 1541→1535, and Encoding & Codecs
579→333). This qualifies exchanged resource/page/related-resource IDs; it
does not waive shell/control visibility differences.

#### Visible-ID disposition

An absent ID in the comparator is absent from the **visible rendered set**, not
proof that its source selector was removed.

- `Home.tsx` still has `link-recommendations-heading` (line 399) and
  `button-browse-recommendations` (line 425). They live in `AccountFeatures`,
  which is rendered only for `?context=account` or `?account=1`. The comparator
  captured bare `/`, so this is a prior-mode/current-default-Index state
  distinction. It remains an open product-contract delta unless that account
  content is required in default Home.
- The six `rail-*` IDs are generated by `AppSidebar` only when the persisted
  compact-rail preference is active. The missing visible rail at 768+ is not a
  literal source deletion, but remains a real retained-default/visibility
  difference if production's expected initial preference is compact.
- `nav-advanced`, `nav-learning-journeys`, `nav-submit-resource`, and
  `nav-theme` remain in desktop **More navigation**. That `<details>` is closed
  initially, so visible-set absence is distinct from reachability. It must be
  accepted or changed if direct initial visibility is required.
- `mobile-drawer-trigger` remains in `AppHeader`; canonical CSS only displays
  it through 1024px. Its 1440 absence is expected viewport visibility, not a
  selector removal.
- Taxonomy accordion/expand/L3 IDs and resource/card/paginator/related IDs are
  generated from the current data and disclosure state. Their individual
  visible differences need common-data/state proof; none is blanket-excluded.

### Targeted admin candidate: historical result superseded by static harness diagnosis

The audit-key server identity stayed authorized after API quiet for every
route/width pair, and no visible admin footer was found in any capture. The
hash form `/admin#research` returned HTTP 200 at 375 and 1440, had its Research
tab selected with an active panel, showed `research-review-panel`, and had no
serious/critical axe finding. Thus the review-mode wiring is observed for the
canonical hash form.

`/admin/research` rendered the same selected review panel but its document
status was **404** at both widths in the historical capture. It is not the
canonical tab URL (`/admin#research` is), but it is a server-supported
deep-link contract after the parent resolver fix and has been restored to the
candidate route scope for a fresh HTTP-200 verification. This is not a
status-guard waiver.

Static diagnosis found that the historical bare-`/admin` selection and Settings
failures were harness defects, not established application defects. The script
captured the Overview tab attribute *after* its New entry action deliberately
changed the selected tab to Resources; it sampled Theme Settings immediately
after URL change rather than waiting for the lazy heading; and at desktop it
selected the first generic Theme href, which can be the hidden sidebar
disclosure link instead of the masthead action. The 375 axe sample retained
`route-chunk-skeleton`, so its serious `aria-prohibited-attr` result cannot be
assigned to the settled Admin route from that capture. The corrected harness
waits for the canonical tab/panel (and Research review panel), snapshots route
state before actions, scopes Settings to `.admin-dashboard__actions`, and waits
for the exact Theme Settings heading. It now initializes a real disposable Nick
Clerk session before opening the strict capture browser; it grants no
development-Clerk or empty-environment write exception. Browser-wide Fetch,
context request, and sealed-window Worker/WebSocket guards remain active. If
the initialized session still requires a write, that run must report a blocker
rather than weaken a guard. The next strict run uses the compiled static shell
at `127.0.0.1:5101` and performs Nick setup/promotion/teardown only against
the API-owning `127.0.0.1:5000` origin; both use the same loopback host so the
real session cookie is reusable without proxying setup writes. No passing rerun
was claimed at this historical diagnosis point; the corrected strict result
below supersedes it.

There is one exact source handoff for the former direct-path observation:
`client/src/App.tsx:737-745` declares `/admin/:section`, and
`client/src/pages/AdminDashboard.tsx:58-64` accepts `research`; however
the historical `server/og-middleware.ts:816-819` whitelist omitted
`research`, explaining the observed 404. The parent has corrected that
resolver; the harness now verifies its HTTP-200 deep-link behavior separately
from the canonical hash URL.

### Corrected strict compiled-shell result (supersedes the historical candidate)

The sanitized six-capture result is retained at
[`retained-controls/admin-corrected/summary.json`](retained-controls/admin-corrected/summary.json).
It uses a real, disposable Clerk identity named Nick: authenticated browser
storage state was prepared before the guarded capture, and teardown completed
with both the created local user and Clerk user deleted. The teardown
verification reported two other QA local rows; it did not retain the
created Nick identity, identifier, cookie, audit key, or response body.

All six corrected captures pass the UI/status/axe/action assertions: `/admin`,
`/admin#research`, and `/admin/research` each returned HTTP 200 at 375 and
1440; the expected tab and active panel were visible; both Research forms
showed the review panel; Overview's Settings navigation and New entry dialog
passed; and every settled axe serious/critical list was empty. This is real
browser-session proof, not audit-key header authentication.

The sole remaining capture failure is intentionally fail-closed read-only
refusal. The exact sanitized summary records eight `POST`
`<cross-origin-or-opaque>` entries: two on each Overview capture and one on
each Research capture. The redactor intentionally does not retain an origin
or path for a cross-origin target, so this evidence cannot honestly name one.
It also records two refused `Worker` calls per capture (twelve total), each
from `blob:http://127.0.0.1:5101/<opaque-id>` with no query keys. Its complete
window ledger is `webSockets: 0`, `workers: 2`, `popups: 0`, and
`serviceWorkers: 0` for every capture.

Thus no WebSocket was attempted on compiled shell 5101: the earlier WebSocket
observation was development-runtime/HMR infrastructure removed by the static
shell, not a current app operation. The shared browser guard does not create
WebSockets or Workers; it only rejects requests. The Worker attempts are real
page operations. A prior Amplitude Session Replay attribution is withdrawn:
its two blob-worker constructors only matched the count and were not source
proven by the retained ledger. Axe, Clerk, browser probes, and any other
loaded bundle remain unexcluded until an initiator stack identifies them.

The shared disposable-identity helper now makes the privacy choice through the
shipped UI, not application code or mocked storage: after Nick is authorized,
the setup page opens the static `127.0.0.1:5101` Privacy page and explicitly
clicks **Decline**. If a prior choice hid the banner, it first uses the shipped
Privacy "Open cookie settings" control, then clicks **Decline**. It verifies
that only the boolean `consentDeclined: true` is present for the in-memory
5101 capture state and immediately closes the unguarded setup context.

The follow-up declined run is retained at
[`retained-controls/admin-declined/summary.json`](retained-controls/admin-declined/summary.json).
It records `consentDeclined: true`, all UI/status/axe/action checks passing,
and the same eight refused POSTs/twelve refused Workers. Consequently,
analytics consent is not the cause and the earlier telemetry/Amplitude
attribution is withdrawn.

The partial diagnostic is retained at
[`retained-controls/admin-initiators/summary.json`](retained-controls/admin-initiators/summary.json).
It repeats `/admin` at 375 only with `consentDeclined: true`; status, selected
tab/panel, Settings, New entry, and settled serious/critical axe checks pass.
Its sanitized initiators identify both refused fetch POSTs as the compiled
development Clerk origin's `/v1/environment` path (no query values retained).
Both refused Blob Workers originate at the local static shell and have
`@clerk/clerk-js` v6 `clerk.browser.js` as their sanitized initiating script;
the retained stack identifies the Clerk token-polling/load path. This is
positive initiator evidence, so it supersedes the earlier count-only
telemetry hypothesis.

No strict guard changed: the two POSTs and both Worker constructors were
refused, and no Worker/network operation was allowed. The temporary
development-Clerk initialization exception considered during diagnosis was
revoked and removed; it is not present in the capture policy, source, or a
passing result. The strict static read-only matrix therefore remains a
fail-closed diagnostic with its original restrictions, not a relaxed pass.

### Normal-app authentication lane: no app auth regression reproduced

The static capture answers a different question from normal authentication: it
opens a cold Clerk runtime under a guard that rejects every non-safe operation.
The normal-app lane instead uses the ordinary `127.0.0.1:5000` development app,
a real disposable Nick identity, normal Clerk UI sign-in, and no browser
interception, SDK mock, request exception, or business CRUD interaction.

The original
[`normal-auth-regression/summary.json`](retained-controls/normal-auth-regression/summary.json)
proves, with its normal app session, sign-in/admin authorization and protected
`/api/auth/me` 200, admin access, reload identity retention, UI Clerk sign-out
followed by `/api/auth/me` 401, protected `/admin` return to local `/sign-in`,
and teardown of only the created identity. Its sole failed check was not an
authentication failure: the probe attempted `getToken` immediately after
server-cookie authorization, before the cold browser Clerk runtime exposed a
session token function (`attempted: false`). The artifact's three Clerk
sign-in-attempt path segments were subsequently changed only from an opaque
`sia_…` value to `sia_<id>` for privacy; capture time, statuses, controls,
checks, and result values were not changed.

The focused
[`normal-auth-refresh/summary.json`](retained-controls/normal-auth-refresh/summary.json)
supersedes **only that early-readiness observation**. It repeats real
setup, authenticated API 200, normal reload, then waits (bounded) for public
`window.Clerk.loaded` and `session.getToken` readiness before calling the real
cache-bypass `getToken({ skipCache: true })`. It records readiness, an attempted
and completed refresh, and authenticated admin API 200; it records no Clerk
request failure and completes teardown. It intentionally does not repeat the
already-passing sign-out/protected-route journey.

Accordingly, no normal-app Clerk authentication regression was reproduced and
no Clerk application change is justified. The corrective action is test design:
keep the strict cold static read-only guard as a separate fail-closed
diagnostic, and use a readiness-aware normal-auth lane for real session/token
behavior. This does not convert the strict matrix into a pass or permit its
POST/Worker operations.

### Pixel and static/build results

The historical selected palette diagnostic was **4/4 PASS** at the unchanged 0.5%
ceiling: 375 **0.4140%**, 768 **0.3748%**, 1024 **0.3185%**, and 1440
**0.3755%**. This is a passing selected palette row, not closure of all
application pixel rows or of the task.

The historical post-ancestor-disclosure `npm run build` and `npm run bundle:budget
-- --check` passed; the retained
[`final-shell-build/`](retained-controls/final-shell-build/) logs report initial
**623.3 KiB raw, 193.1 KiB gzip, and 162.4 KiB Brotli**, within unchanged
limits. The earlier **622.5 KiB raw, 192.8 KiB gzip, and 162.1 KiB Brotli**
record is from an earlier checkout and remains historical only.

At the time of this historical artifact, the authorized performance result was
**54** with **0 blocked requests** against the required **82**. It was a FAIL
and is retained as raw failed/exception provenance; see the authoritative
current status for the normal, unintercepted gate rather than treating a strict
diagnostic as current gating evidence.

### Historical former remaining Task 565 work

At the time of this historical record, the strict static read-only diagnostic
was retained separately as FAIL. Original Task 565 did not require zero SDK
denials, and it was not a release gate or policy-approval blocker.

1. At that point, the 17 public tracked visible-ID/API deltas awaited
   data/state or accepted product-contract dispositions.
2. At that point, the 54-to-82 performance recovery awaited a strict run.
3. The then-delegated two-pass shell/admin four-width check has since completed;
   its current PASS is the authoritative report's
   [`current-admin-shell/summary.json`](retained-controls/current-admin-shell/summary.json)
   row, not a pending requirement.

### Workspace-retained proof

The superseding sanitized real-Nick six-capture summary is retained at
[`retained-controls/admin-corrected/summary.json`](retained-controls/admin-corrected/summary.json).
The subsequent real-Nick declined-consent run is retained at
[`retained-controls/admin-declined/summary.json`](retained-controls/admin-declined/summary.json);
it confirms the declined-state boolean but does not resolve the refusal cause.
The partial sanitized initiator proof is retained at
[`retained-controls/admin-initiators/summary.json`](retained-controls/admin-initiators/summary.json).
The normal-app full auth result and its focused token-readiness successor are
retained at
[`retained-controls/normal-auth-regression/summary.json`](retained-controls/normal-auth-regression/summary.json)
and
[`retained-controls/normal-auth-refresh/summary.json`](retained-controls/normal-auth-refresh/summary.json).
The latter supersedes only the former's early unready token probe; all other
normal-auth checks remain historical proof. These normal app results do not
relax or pass the static read-only matrix.
The older
[`retained-controls/admin-candidate-summary.json`](retained-controls/admin-candidate-summary.json)
is historical only and must not be used for current admin conclusions.
All 16 public production/candidate comparison strips are retained under
[`retained-controls/public-compare/strips/`](retained-controls/public-compare/strips/),
including Home and About at 375 and 1440. These are visual comparisons, not
pixel-parity passes or waivers of the tracked deltas.

The final comment-only canonical citations also pass the actual
`node scripts/validation/palette-drift.mjs` gate, not just the standalone gate.

The final preview screenshot at 1280×720 confirms the guest shell and populated
Home Index render without an error screen or obvious horizontal overflow.
The consent banner remains visible and actionable. This screenshot is not a
replacement for the four-width pixel measurements. Recently Indexed visibly
contains another worker's audit resource; no cross-worker data cleanup was
performed. Content-cleanup and production-data parity are not claimed.
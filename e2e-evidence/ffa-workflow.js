export const meta = {
  name: 'ffa-awesome-video',
  description: 'Full functional audit of Awesome Video: contract + count + auth + a11y fan-out, adversarial verify, synthesis',
  phases: [
    { title: 'Find', detail: '7 dimension finders: public-api, auth-gate, counts, pages-data, pages-interaction, a11y, data-edge' },
    { title: 'Verify', detail: 'each finding re-checked against live /api by an independent skeptic' },
    { title: 'Synthesize', detail: 'dedup + rank confirmed defects' },
  ],
}

const BASE = 'http://localhost:5001'
const RUN = args && args.runDir ? args.runDir : 'e2e-evidence/ffa-latest'

// Canonical ground truth — every numeric assertion is checked against these AND live /api.
const TRUTH = `CANONICAL GROUND TRUTH (verified against live /api this session):
- total resources: 1949
- per-category resourceCount: Community & Events 91 | Encoding & Codecs 372 | General Tools 95 | Infrastructure & Delivery 183 | Intro & Learning 227 | Media Tools 304 | Players & Clients 263 | Protocols & Transport 242 | Standards & Industry 172
- subcategory/subsubcategory spot counts: HEVC 10, FFMPEG 65, AV1 5, VP9 1, origin-servers 1
- 9 categories, 19 subcategories
- learning journeys: 0 (empty is expected, not a defect)`

const RULES = `RULES:
- You MUST end by calling the StructuredOutput tool exactly once, even if you found ZERO defects (return an empty findings array with a coverage_note). Do not finish with a prose summary instead of the tool call.
- Base URL is ${BASE} (local Docker container awesome-list-app, seeded DB).
- Use curl for live probes. Every numeric/shape claim MUST be backed by an actual curl you ran — paste the command + the relevant output snippet into evidence.
- Iron Rule: no mocks, no fabricated output. If you didn't run it, you can't claim it.
- Read source under client/src and server/ to establish the contract, then prove behavior live.
- A finding is only real if it produces a wrong outcome for a real user. "Theoretically odd but behaves correctly" is NOT a finding — note it as observation instead.
- Severity: CRITICAL (crash/data-loss/security leak), HIGH (broken core flow/wrong data shown), MEDIUM (degraded UX/minor wrong data), LOW (cosmetic/SEO).
- Write your raw evidence (curl outputs) to files under ${RUN}/ and cite the path.`

const FINDING_SCHEMA = {
  type: 'object',
  properties: {
    dimension: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'short stable slug, e.g. tags-404' },
          severity: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
          title: { type: 'string' },
          location: { type: 'string', description: 'file:line or endpoint path' },
          symptom: { type: 'string', description: 'observed wrong outcome' },
          evidence: { type: 'string', description: 'curl cmd + output snippet, or src cite proving it' },
          expected: { type: 'string' },
          suspected_root_cause: { type: 'string' },
        },
        required: ['id', 'severity', 'title', 'location', 'symptom', 'evidence', 'expected'],
      },
    },
    coverage_note: { type: 'string', description: 'what you probed; what you could not and why' },
  },
  required: ['dimension', 'findings', 'coverage_note'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    is_real: { type: 'boolean', description: 'true only if you independently reproduced the wrong outcome' },
    reproduced: { type: 'string', description: 'the exact command you ran to confirm/refute + its output' },
    adjusted_severity: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NOT_A_DEFECT'] },
    verdict_reason: { type: 'string' },
  },
  required: ['id', 'is_real', 'reproduced', 'adjusted_severity', 'verdict_reason'],
}

const DIMENSIONS = [
  {
    key: 'public-api',
    prompt: `You are auditing the PUBLIC (unauthenticated) read API of Awesome Video.
${RULES}
${TRUTH}

Scope: every public/unauthenticated GET endpoint. Read ${RUN}/endpoint-manifest.txt for the full registered route list, focus on GET routes that should be public:
/api/health, /api/awesome-list, /api/categories, /api/subcategories, /api/sub-subcategories, /api/resources (and ?category=, ?limit=, ?search=, pagination), /api/resources/:id, /api/resources/:id/related, /api/resource/:id, /api/public/categories, /api/public/resources, /api/public/resources/:id, /api/public/tags, /api/tags, /api/journeys, /api/journeys/:id, /api/learning-paths/suggested, /api/recommendations/init, /api/og-image.png, /sitemap.xml.

For each: curl it, capture HTTP status + a body snippet. Flag: non-200 on a route the frontend calls (check client/src for callers), wrong/empty shape, count mismatches vs the ground truth, pagination total wrong, 500s. Specifically verify /api/tags vs /api/public/tags (one may 404 while the frontend calls it). Save outputs to ${RUN}/api-contract/.`,
  },
  {
    key: 'auth-gate',
    prompt: `You are a SECURITY auditor checking that protected endpoints reject unauthenticated/non-admin access and never leak sensitive data.
${RULES}

Scope: every /api/admin/*, /api/user/*, /api/bookmarks*, /api/favorites*, and auth-mutation route in ${RUN}/endpoint-manifest.txt.
For each protected GET: curl WITHOUT credentials, expect 401/403. A 200 that returns real data unauthenticated is CRITICAL.
Specifically re-verify the historical leak: GET /api/admin/users and GET /api/admin/export-json must NOT return bcrypt password hashes even when authenticated — but unauthenticated they must 401/403. curl them unauthenticated and confirm rejection; grep the response for "$2a$"/"$2b$"/"password"/"hash".
Do NOT perform destructive mutations. For POST/DELETE protected routes, only send an unauthenticated request and confirm it is rejected (no state change). Save outputs to ${RUN}/api-contract/auth-*.txt.`,
  },
  {
    key: 'counts',
    prompt: `You are auditing COUNT CORRECTNESS — the historically fragile area of this app.
${RULES}
${TRUTH}

Cross-check every count the user can see against live /api:
1. Home/sidebar per-category counts: curl /api/categories — must equal the 9 ground-truth values exactly.
2. /api/resources?limit=1 total must be 1949.
3. Subcategory page: it queries /api/resources?limit=2000 then filters client-side by r.subcategory. curl /api/resources?limit=2000, then with jq count resources where .subcategory matches "Codecs"-type names; verify a few subcategories are internally consistent (sum of subcategory counts within a category should not exceed the category total).
4. Sub-subcategory spot checks: count resources where subSubcategory == "HEVC" (expect 10), "AV1" (5), "VP9" (1). Build the curl+jq pipeline and run it.
5. Advanced page reads /api/categories resourceCount for its stat cards and /api/awesome-list for tags — verify the "Unique Tags" and "Subcategories" stat math is sound (subcategories stat sums cat.subcategories.length).
Flag any place where a displayed count would differ from the DB truth. Save jq outputs to ${RUN}/api-contract/counts-*.txt.`,
  },
  {
    key: 'pages-data',
    prompt: `You are auditing the DATA-HEAVY pages for contract correctness (does each /api call the page makes actually return what the page renders?).
${RULES}
${TRUTH}

Pages (read each source file fully, list every useQuery/fetch/apiRequest, then prove each endpoint live):
- client/src/pages/Home.tsx (or Home via App.tsx prop)
- client/src/pages/Category.tsx
- client/src/pages/Subcategory.tsx
- client/src/pages/SubSubcategory.tsx
- client/src/pages/ResourceDetail.tsx
- client/src/pages/Advanced.tsx
For each page: (1) enumerate its API calls, (2) curl each with a realistic param (use a real category slug like "encoding-codecs", a real resource id from /api/resources?limit=1, a real subcategory slug), (3) confirm the response shape matches what the JSX destructures. Flag: calls to unregistered/404 endpoints, shape mismatches (page reads .resources but API returns array), empty render where data exists, broken detail-page id resolution (db-<n> prefix handling). Save to ${RUN}/page-contract/.`,
  },
  {
    key: 'pages-interaction',
    prompt: `You are auditing the INTERACTION / FORM / AUTH pages for contract correctness.
${RULES}

Pages (read source, enumerate API calls + form submit targets, prove endpoints live where non-destructive):
- client/src/pages/Login.tsx (POST /api/auth/local/login), Register.tsx (POST /api/auth/register),
- client/src/pages/SubmitResource.tsx (POST /api/resources or /api/resources/:id/edits),
- client/src/pages/Journeys.tsx, JourneyDetail.tsx (/api/journeys*),
- client/src/pages/Profile.tsx, Bookmarks.tsx (/api/bookmarks, /api/favorites, /api/user/*),
- client/src/pages/ThemeSettings.tsx, About.tsx.
For each: confirm the submit/fetch target is a REGISTERED route (cross-ref ${RUN}/endpoint-manifest.txt). For login, curl POST /api/auth/local/login with obviously-bad creds and confirm a clean 401 (not 500). For register, curl POST /api/auth/register with a missing-field body and confirm validation 400 (not 500). Do NOT create real accounts or real resources. Flag: form posting to a 404 route, 500 on bad input (should be 4xx), missing client-side validation that lets a 500 through, dead links. Journeys returns 0 items — confirm the empty state renders gracefully (read the JSX), that is expected not a defect. Save to ${RUN}/page-contract/.`,
  },
  {
    key: 'a11y-visual',
    prompt: `You are auditing STATIC accessibility + visual-correctness signals across the client (no browser; source + token analysis).
${RULES}

Sweep client/src for these known defect classes:
1. Icon-only buttons/links missing accessible names: grep for <Button ... size="icon" or h-8 w-8 / h-9 w-9 patterns without aria-label or title or visible text. List each offender file:line.
2. Heading order: per page component, list the h1/h2/h3 usage; flag pages with no h1 (or sr-only h1 missing) or a jump from h1→h3.
3. Tap targets: interactive controls smaller than 44px with no min-h-[44px]/min-w-[44px] on mobile — flag icon buttons lacking it.
4. Color contrast tokens: grep index.css / design-system css for --text-3 and muted-foreground values; flag any token below WCAG AA 4.5:1 against its surface (compute the ratio).
5. Images missing alt; form inputs missing associated <label>/aria-label.
6. Hardcoded SEO/marketing numbers that contradict the real 1949 total (grep for "2000", "1900", "thousands", etc. in user-visible strings).
Only report concrete offenders with file:line. Save the grep evidence to ${RUN}/visual/a11y-sweep.txt.`,
  },
  {
    key: 'data-edge',
    prompt: `You are auditing EDGE/UTILITY endpoints and error handling.
${RULES}

Probe (live curl) and check graceful behavior:
- GET /api/resources/check-url (and ?url=...) — shape + auth.
- GET /api/resources/:id with a NON-EXISTENT id (e.g. 999999) — must 404 cleanly, not 500.
- GET /api/category/:slug-equivalent and /api/resources?category=Nonexistent — empty result, not error.
- GET /api/resources?limit=2000 — confirm it actually returns all 1949 (not capped at a lower number); paste the returned count.
- GET /api/recommendations, /api/recommendations/init — shape.
- GET /sitemap.xml — valid XML, contains resource URLs, count of <url> entries sane.
- GET /og-image.png and /og-image.svg — 200 + correct content-type.
- /api/health — shape.
- Any endpoint the frontend calls that grep showed as possibly-missing: /api/admin/platforms, /api/admin/your-entities, /api/check-email, /api/resources/picker. Determine if these are real frontend calls or grep artifacts (read the calling source) — if a real call hits an unregistered route, that's a finding.
Save to ${RUN}/api-contract/edge-*.txt.`,
  },
]

phase('Find')
log(`FFA fan-out: ${DIMENSIONS.length} dimension finders against ${BASE}`)

const results = await pipeline(
  DIMENSIONS,
  (d) => agent(d.prompt, { label: `find:${d.key}`, phase: 'Find', schema: FINDING_SCHEMA, model: 'opus' }),
  (res, d) => {
    // For each finding from this dimension, spawn an independent skeptic that re-checks live.
    if (!res || !res.findings || res.findings.length === 0) return { dimension: d.key, verified: [] }
    return parallel(
      res.findings.map((f) => () =>
        agent(
          `You are an independent skeptic. A prior auditor reported this potential defect in Awesome Video (${BASE}, local Docker container).
${RULES}

CLAIM:
- id: ${f.id}
- severity: ${f.severity}
- title: ${f.title}
- location: ${f.location}
- symptom: ${f.symptom}
- expected: ${f.expected}
- their evidence: ${f.evidence}

Your job: independently REPRODUCE the wrong outcome with your OWN curl/Read. Default to is_real=false unless you personally observe the bad outcome. If their evidence cited a count, re-run the count yourself against live /api and compare to ground truth:
${TRUTH}
If the behavior is actually correct (their reasoning was wrong, or it's expected-empty like 0 journeys), return is_real=false, adjusted_severity NOT_A_DEFECT. If real, confirm or adjust severity based on actual user impact.`,
          { label: `verify:${f.id}`, phase: 'Verify', schema: VERDICT_SCHEMA, model: 'opus' }
        ).then((v) => ({ finding: f, verdict: v }))
      )
    ).then((verified) => ({ dimension: d.key, verified: verified.filter(Boolean) }))
  }
)

phase('Synthesize')
const confirmed = []
const dismissed = []
for (const r of results.filter(Boolean)) {
  for (const item of r.verified) {
    if (item.verdict && item.verdict.is_real && item.verdict.adjusted_severity !== 'NOT_A_DEFECT') {
      confirmed.push({ ...item.finding, severity: item.verdict.adjusted_severity, reproduced: item.verdict.reproduced, dimension: r.dimension })
    } else {
      dismissed.push({ id: item.finding.id, why: item.verdict ? item.verdict.verdict_reason : 'no verdict', dimension: r.dimension })
    }
  }
}

const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
confirmed.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9))

log(`Confirmed defects: ${confirmed.length} | Dismissed: ${dismissed.length}`)

return {
  base: BASE,
  confirmed,
  dismissed,
  coverage: results.filter(Boolean).map((r) => ({ dimension: r.dimension, finding_count: r.verified.length })),
}

# Assumptions — contact-api (default-off contact endpoint)

Decisions taken while making the contact backend real. The contact-variant
verification task and the admin operations task inherit them; a task that
overturns one must say so in its own assumptions file and add a pointer here.

## 1. Persistence only — no email is sent

`POST /api/contact` stores the submission in `contact_submissions` and answers
`{ id, status: "received" }`. Nothing is emailed, forwarded or queued. The
receipt wording and `docs/CONTACT-VARIANTS.md` say "received", never
"delivered"; maintainers read the inbox through
`GET /api/admin/contact-submissions`. If delivery is added later it must be a
separate, explicitly configured step so a missing mail provider can never turn
an accepted submission into a silent loss.

## 2. Disabled means `404 { "message": "Not found" }`

While `CONTACT_ENABLED` is not exactly `true`, `POST /api/contact` answers 404
before any origin, limiter or validation work — indistinguishable from a route
that does not exist, which is what production looks like today. The
alternative (`503` + documented body) would advertise a feature that is
switched off and give scanners a distinct signal. `/api/config` is the honest
channel: `form.available: false` with "The contact form is disabled".

`503 { "message": "Contact form is not fully configured" }` is reserved for the
*misconfigured* case: enabled but no usable `CONTACT_IP_HASH_SECRET`.

## 3. `CONTACT_IP_HASH_SECRET` is required once the form is enabled

The plan asks for an IP hash and never a raw IP. An unkeyed SHA-256 of an IPv4
address is reversible by enumeration, so the hash is `HMAC-SHA256` with an
environment-only key of at least 16 characters (shorter values are treated as
unset). Without it the server logs an error at boot, `/api/config` reports the
form unavailable with "The contact form is not fully configured", and the POST
answers 503 rather than storing an unhashed address. Rotating the key only
breaks correlation between old and new rows.

## 4. `issues_url` is never derived from `source.url`

The draft offered the issues destination automatically for any GitHub
`source.url`. That points visitors at whichever repository the *list* is
imported from, which is not necessarily the project's own tracker. Issues are
available only when `CONTACT_ISSUES_URL` / YAML `contact.issues_url` is set
explicitly; Discussions additionally needs `discussions_verified` (variant `c`
stays blocked until a repository with Discussions enabled is configured).

## 5. Same-origin is enforced at the route as well as globally

The global mutating-request guard already applies the origin rule, but the
route repeats it (`Origin` must match the request origin or `PUBLIC_SITE_URL`;
`Sec-Fetch-Site: cross-site` is rejected). Reason: the in-process test app and
any future mount without the global middleware would otherwise silently lose
the check. The draft's `contactJsonBody` (415 on non-JSON) was dropped — the
global JSON body parser and Zod already reject anything that is not a valid
JSON object with the canonical 400 envelope.

## 6. The retention purge exists but is not scheduled

`purgeExpiredContactSubmissions(retentionDays)` is implemented (default 180
days from YAML `contact.retention_days`) but not wired into the maintenance
scheduler. Scheduling a destructive job belongs with the admin inbox work, so
an operator can see what is about to be purged; until then rows are kept.
Proposed as a follow-up.

## 7. Rate limit: 5 per hour per IP, own limiter name, counted before validation

The limiter runs after the origin check and before Zod/honeypot, so a bot
flooding malformed or honeypot-filled bodies is throttled too. It uses the
shared PostgreSQL store under its own name `contact` (key prefix `contact:`);
the `/api` backstop still counts the same requests under *its* name — that is
two limiters with two budgets, not double counting within one. Origin-rejected
requests never reach the limiter.

## 8. Honeypot answers with a real-looking receipt

A non-empty `website` returns `200 { id: <random uuid>, status: "received" }`,
logs `[contact] honeypot triggered` with only the first 12 characters of the IP
hash, and stores nothing. Returning 400 would tell a bot which field gave it
away.

## 9. Admin listing only; no delete endpoint yet

`GET /api/admin/contact-submissions?limit=&offset=` (newest first, `limit`
1–500 default 50, `offset` ≥ 0, `Cache-Control: no-store`) is enough for the
admin operations tab to render the inbox. Deletion is left for that task so the
UI and the endpoint ship together.

## 10. `test:integration` runs files serially

Every integration file calls `cleanupDatabase()` against the single shared
test database, so parallel files delete each other's users and
`rate_limit_hits` mid-test. The npm script now passes `--no-file-parallelism`
(47 s instead of 21 s); measured against HEAD in the same mode no test
regressed and the legacy failing set stopped drifting between runs. Unit tests
are untouched.

# Contact variants

Contact is build-time opt-in through `VITE_CONTACT_VARIANT`. Only `a`, `b`, `c`, `d`, and `e` are accepted; unset and every other value render no new contact feature. Server form enablement is independent and defaults off. The existing Suggest Edit feature remains available when contact variants are off.

| Value | Experience | Required public configuration | Screenshot |
| --- | --- | --- | --- |
| `a` | Footer email and repository issue links. Direct and familiar, but exposes the configured public address and splits requests across channels. | Valid public `mailto:` destination and repository issue URL. Missing destinations render unavailable with the server-provided reason. The current public profile has no email, so email is honestly unavailable rather than invented. | **Verified 2026-09-14:** [1440](parity/evidence/contact-variants/variant-a-1440.png), [375](parity/evidence/contact-variants/variant-a-375.png). The configured Issues link opened its GitHub destination in a new tab; the email unavailable state was visible. |
| `b` | Accessible modal with client validation and inline API errors. A single structured intake is easier to review, but stores personal data and depends on server rate limiting and retention controls. A successful response says only that persistence occurred; it does not claim email delivery. | Default-disabled POST `/api/contact`, database persistence, validation, honeypot, and rate limiting. | **Verified 2026-09-14:** [1440](parity/evidence/contact-variants/variant-b-1440.png), [375](parity/evidence/contact-variants/variant-b-375.png), and readable viewport companions ([1440](parity/evidence/contact-variants/variant-b-1440-viewport.png), [375](parity/evidence/contact-variants/variant-b-375-viewport.png)). Browser validation, Escape focus return, honeypot non-persistence, real sixth-request 429/`Retry-After`, input retention, receipt persistence, authenticated admin inbox listing, and exact cleanup passed. |
| `c` | External GitHub Discussions link. This keeps community conversation on GitHub without unsupported iframe embedding, but requires a repository where Discussions is actually enabled. | Discussions was verified enabled for `https://github.com/krzemienski/awesome-video` through the GitHub API on 2026-09-10. | **Verified 2026-09-14:** [1440](parity/evidence/contact-variants/variant-c-1440.png), [375](parity/evidence/contact-variants/variant-c-375.png). The link opened the configured GitHub Discussions destination in a new tab. |
| `d` | Per-resource Suggest Edit action. It reuses the authenticated edit-suggestion queue and review process, making it best for catalog corrections but not general messages. The original core action remains the fallback for every other flag value. | Existing resource edit endpoint, authentication, queue persistence, and admin review UI. | **Verified 2026-09-14:** [1440](parity/evidence/contact-variants/variant-d-1440.png), [375](parity/evidence/contact-variants/variant-d-375.png), readable companions ([1440](parity/evidence/contact-variants/variant-d-1440-viewport.png), [375](parity/evidence/contact-variants/variant-d-375-viewport.png)), and [admin Edits](parity/evidence/contact-variants/variant-d-admin-edits-1440.png). A real backend-session admin submitted and rejected a queued edit; an invalid-flag run rendered and opened the unchanged core fallback. Exact fixture cleanup passed. |
| `e` | “Contact maintainers” command-palette item. It is fast for keyboard users but less discoverable; it opens the configured persisted form first, then a real configured external destination. | At least one available form, email, Discussions, or issue destination. | **Verified 2026-09-14:** [1440 palette](parity/evidence/contact-variants/variant-e-1440.png), [375 palette](parity/evidence/contact-variants/variant-e-375.png), readable palette companions ([1440](parity/evidence/contact-variants/variant-e-1440-palette-viewport.png), [375](parity/evidence/contact-variants/variant-e-375-viewport.png)), and form extras ([1440 full](parity/evidence/contact-variants/variant-e-1440-form.png), [1440 viewport](parity/evidence/contact-variants/variant-e-1440-form-viewport.png)). Arrow-key selection opened the configured form; a second isolated run opened the configured external fallback. |

## Public API contract

`GET /api/config` includes a `contact` object with `email`, `issues`, `discussions`, and `form`. Each has `available`; unavailable entries include a safe user-facing `unavailableReason`. Link entries expose `href`; the form may expose `persistence: "database"`. No secret or private delivery address is returned.

`POST /api/contact` accepts `{ name, replyTo, subject, message, website? }`. The hidden `website` field is a honeypot. Success is `{ id, status: "received" }`. Validation and rate-limit failures use the existing API error envelope and `Retry-After` for 429 responses. Failed submissions retain all entered values.

## Backend

Submission intake is default-off: a deployment that sets none of the `CONTACT_*` variables (see `docs/ENVIRONMENT.md`) accepts no contact submissions. Retention still removes expired rows left from previously enabled intake. Production keeps `CONTACT_ENABLED` unset.

### Endpoints

| Endpoint | Auth | Behaviour |
| --- | --- | --- |
| `GET /api/config` | none | Public site metadata plus the `contact` object above. Destinations are derived only from server config/env; the response carries `Cache-Control: public, max-age=300`. With the default configuration every destination is `available: false` and `form` is `{ available: false, unavailableReason: "The contact form is disabled" }`. |
| `POST /api/contact` | none (same-origin required) | `404 { "message": "Not found" }` unless `CONTACT_ENABLED=true` — the disabled route is indistinguishable from a missing one and answers before any validation, origin, or limiter work. When enabled but `CONTACT_IP_HASH_SECRET` is missing or shorter than 16 characters it answers `503 { "message": "Contact form is not fully configured" }` (and `/api/config` reports the form unavailable with the matching reason). Otherwise the chain is: same-origin check → rate limiter → Zod validation (`shared/contact.ts`) → honeypot → persistence, and success is `200 { id, status: "received" }`. |
| `GET /api/admin/contact-submissions?limit=&offset=` | authenticated admin | Newest-first page of the inbox: `{ submissions, total, limit, offset }` with `limit` 1–500 (default 50) and `offset` ≥ 0; anything else is `400`. Rows expose `id, name, replyTo, subject, message, createdAt, ipHash, userId` — never a raw IP. `Cache-Control: no-store`. There is no delete endpoint yet. |

### Submission rules

- **Validation** — `name` 1–100 and `subject` 1–200 single-line characters, `replyTo` a valid email ≤ 320, `message` 20–4000 characters (all after trimming; control characters and NUL are rejected); unknown fields and bodies larger than the global 256 kB JSON limit are rejected with the canonical `400` validation envelope (`{ error: "validation_failed", message, fieldErrors, errors }`).
- **Origin** — the request must declare an `Origin` matching the request origin (scheme + host + effective port) or `PUBLIC_SITE_URL`; a missing Origin, a mismatch, or `Sec-Fetch-Site: cross-site` is `403`. This is the same rule the global mutating-request guard applies, enforced again at the route so it also holds for in-process test apps.
- **Rate limit** — 5 submissions per rolling hour per client IP, counted in the shared PostgreSQL `rate_limit_hits` store under its own limiter name `contact` (key prefix `contact:`), so the `/api` backstop and other tiers are never double-charged. The sixth request is `429` with `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, `RateLimit-Policy`, `Retry-After`, and the negotiated body `{ error: "Rate limit exceeded", message, retryAfter }`. Honeypot hits are counted too, so a bot flood still throttles.
- **Honeypot** — a non-empty `website` returns an indistinguishable `200 { id: <random uuid>, status: "received" }`, logs a `[contact] honeypot triggered` line containing only the first 12 characters of the IP hash, and stores nothing.
- **Persistence** — `contact_submissions(id uuid, name, reply_to, subject, message, created_at, ip_hash, user_id)`. `ip_hash` is `HMAC-SHA256(CONTACT_IP_HASH_SECRET, normalized client IP)` — the raw address is never written; `user_id` is the signed-in user's id when a session is present (cascade-deleted with the user), otherwise `null`.
- **Delivery** — persistence only. No email is sent and the receipt never claims delivery; maintainers read the inbox through the admin endpoint.
- **Retention** — `contact.retention_days` (default 180, clamped to 1–3650 days) is enforced by the live contact retention scheduler, 30 seconds after startup and hourly thereafter, outside test runs. It purges only when intake is enabled or stored rows exist, including after intake is disabled. Each cycle deletes expired rows in batches of 500, up to 10,000 per cycle; remaining backlog continues next hour. Overlapping cycles in one process are skipped. JSON ops events `ops.contact_retention_completed` report `deletedCount`, `batches`, and `batchLimitReached`; `ops.contact_retention_failed` is logged to stderr with the count already deleted, without personal data. Failures retry next hour. This is in-process maintenance: it runs while the server is up, with startup catch-up after downtime, not an external cron guarantee.

### Configuration and defaults

| Setting | Source | Default | Effect |
| --- | --- | --- | --- |
| `CONTACT_ENABLED` | env only | unset (off) | Exactly `true` enables `POST /api/contact`. |
| `CONTACT_IP_HASH_SECRET` | env only | unset | ≥ 16 characters; required once enabled, otherwise `503` + form unavailable. |
| `CONTACT_EMAIL` / YAML `contact.email` | env > YAML | empty | `mailto:` destination; anything else is unavailable. |
| `CONTACT_ISSUES_URL` / YAML `contact.issues_url` | env > YAML | empty | `https:` issue tracker; never derived from `source.url`. |
| `CONTACT_DISCUSSIONS_URL` + `CONTACT_DISCUSSIONS_VERIFIED` / YAML | env > YAML | empty / `false` | Discussions is offered only when both the URL and the verified flag are set. |
| YAML `contact.retention_days` | YAML only | 180 | Retention horizon for the scheduled hourly purge. |

Contracts live in `docs/api/openapi.yaml` (`PublicConfigResponse`, `ContactSubmissionReceipt`, `AdminContactSubmissionsResponse`) and are enforced by the `openapi-drift` and `response-contract-drift` gates; behaviour is covered by `tests/integration/api/contact.test.ts` (disabled 404, misconfigured 503, happy path with keyed IP hash and user id, honeypot, validation 400, origin 403, sixth-request 429 with headers, admin listing and pagination).

## Evidence status

**Approved contact-prototype scope passed; full project acceptance remains incomplete.**
The user approved following the archive's new-prototype requirements for this
task: contact behaviour, accessibility, tokens, screenshots, and bundle checks.
Repository-wide green gates and existing-page pixel parity remain required in
task #570. The [archive assessment and scope approval](parity/evidence/contact-variants/gates/REFERENCE-ARCHIVE.md)
explain why no independent contact pixel-reference match is claimed.
The five configured browser flows and their cleanup are verified. The completed
eight-configuration build matrix proves unset/empty/invalid builds emit no optional
contact component or stylesheet; enabled components remain lazy. The shared-wiring
fix and follow-up keyboard/resource smoke are documented in the
[integration handoff](parity/evidence/contact-variants/gates/INTEGRATION-HANDOFF.md).
The [gate results](parity/evidence/contact-variants/gates/RESULTS-SUMMARY.md)
record the repaired harness lint registration, unchanged pre-existing lint findings
in the four integration files, no current full integration/e2e green result, and no measured
375/768/1024/1440 pixel comparison. These are not waived by the screenshots.

The required desktop capture names are [variant-a.png](parity/evidence/contact-variants/variant-a.png),
[variant-b.png](parity/evidence/contact-variants/variant-b.png),
[variant-c.png](parity/evidence/contact-variants/variant-c.png),
[variant-d.png](parity/evidence/contact-variants/variant-d.png), and
[variant-e.png](parity/evidence/contact-variants/variant-e.png). These are byte-identical
copies of the explicitly width-labelled 1440 captures above.

The narrow live-browser evidence and fixture cleanup record is
[contact-variants-566.md](parity/worklog/contact-variants-566.md); its
2026-09-17 section reruns every variant plus the unset state on the redesign
candidate ([rerun-2026-09-17/](parity/evidence/contact-variants/rerun-2026-09-17/)). The captured
canvases establish configured behaviour at 1440 and 375 CSS pixels; they are
not a measured reference-image diff and do **not** claim pixel parity. Variant
D's proof is the harness assertion that the rendered control is the variant-D
component and that clicking it reaches the suggest-edit handler (a negative run
against the variant-off application fails there), not the capture alone.
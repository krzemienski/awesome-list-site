# Contact variants

Contact is build-time opt-in through `VITE_CONTACT_VARIANT`. Only `a`, `b`, `c`, `d`, and `e` are accepted; unset and every other value render no new contact feature. Server form enablement is independent and defaults off. The existing Suggest Edit feature remains available when contact variants are off.

| Value | Experience | Required public configuration | Screenshot |
| --- | --- | --- | --- |
| `a` | Footer email and repository issue links. Direct and familiar, but exposes the configured public address and splits requests across channels. | Valid public `mailto:` destination and repository issue URL. Missing destinations render unavailable with the server-provided reason. The current public profile has no email, so email is honestly unavailable rather than invented. | **UNVERIFIED** — capture after an actual configured run. |
| `b` | Accessible modal with client validation and inline API errors. A single structured intake is easier to review, but stores personal data and depends on server rate limiting and retention controls. A successful response says only that persistence occurred; it does not claim email delivery. | Default-disabled POST `/api/contact`, database persistence, validation, honeypot, and rate limiting. | **UNVERIFIED** — capture and persisted-result verification pending. |
| `c` | External GitHub Discussions link. This keeps community conversation on GitHub without unsupported iframe embedding, but requires a repository where Discussions is actually enabled. | Discussions was verified enabled for `https://github.com/krzemienski/awesome-video` through the GitHub API on 2026-09-10. | **UNVERIFIED** — screenshot pending. |
| `d` | Per-resource Suggest Edit action. It reuses the authenticated edit-suggestion queue and review process, making it best for catalog corrections but not general messages. The original core action remains the fallback for every other flag value. | Existing resource edit endpoint, authentication, queue persistence, and admin review UI. | **UNVERIFIED** — capture and queued-edit verification pending. |
| `e` | “Contact maintainers” command-palette item. It is fast for keyboard users but less discoverable; it opens the configured persisted form first, then a real configured external destination. | At least one available form, email, Discussions, or issue destination. | **UNVERIFIED** — capture and destination verification pending. |

## Public API contract

`GET /api/config` includes a `contact` object with `email`, `issues`, `discussions`, and `form`. Each has `available`; unavailable entries include a safe user-facing `unavailableReason`. Link entries expose `href`; the form may expose `persistence: "database"`. No secret or private delivery address is returned.

`POST /api/contact` accepts `{ name, replyTo, subject, message, website? }`. The hidden `website` field is a honeypot. Success is `{ id, status: "received" }`. Validation and rate-limit failures use the existing API error envelope and `Retry-After` for 429 responses. Failed submissions retain all entered values.

## Evidence status

No contact screenshot or end-to-end persistence check was performed while these files were authored. All screenshot cells intentionally remain **UNVERIFIED** and must be replaced only after real configured browser validation.
# Contact variants — task 566 validation worklog

**Date:** 2026-09-14  
**Harness:** `scripts/validation/contact-variants-566.mjs`  
**Capture staging:** `/tmp/contact-variants-566/screenshots` before the listed
PNG evidence was copied into this repository.

**Continuation:** The original browser evidence below is unchanged. The
2026-09-15 UTC import-integration follow-up resolves default-off chunk emission
and the harness lint registration, with eight real builds and a targeted
default/e/d lazy-loading smoke. See
[the updated gate report](../evidence/contact-variants/gates/RESULTS-SUMMARY.md).
The user subsequently approved the archive's contact-prototype scope for this
task. Full-suite and existing-page four-width pixel acceptance remain required
in task #570, not waived. See the gate report's approved completion boundary.

## Scope and method

Each local configuration used a separately started development server and a
fresh Chromium context. No shared env/default file was changed. The five
variant configurations were:

| Variant | Isolated port | Result |
| --- | ---: | --- |
| `a` | 5051 | Passed: unavailable email state and configured Issues new tab. |
| `b` | 5052 | Passed: browser/persistence checks; later backend-session admin run also verified the inbox listing. |
| `c` | 5053 | Passed: configured Discussions new tab. |
| `d` | 5071 | Passed: disposable resource, real queued edit, admin Edits review/rejection, and cleanup. |
| `e` form-first | 5055 | Passed: keyboard palette selection opened the form. |

An additional isolated `e` fallback run used port 5056. Unset, empty, and
`z` off-state runs used 5057, 5058, and 5059. Every local server was stopped
at the end of its capture command.

## Captures

The required full-page canvases are retained, even though the dialog is small
in a long document. Readable viewport companions were added for the dialog
and palette evidence:

- `variant-a-1440.png`, `variant-a-375.png`
- `variant-b-1440.png`, `variant-b-375.png`
- `variant-b-1440-viewport.png`, `variant-b-375-viewport.png`
- `variant-c-1440.png`, `variant-c-375.png`
- `variant-e-1440.png`, `variant-e-375.png` — palette item before activation
- `variant-e-1440-palette-viewport.png`, `variant-e-375-viewport.png`
- `variant-e-1440-form.png`, `variant-e-1440-form-viewport.png` — extra,
  after keyboard activation

The browser harness confirmed the contact dialog stylesheet contains the
canonical declarations and required every contact CSS variable used by the
stylesheet to resolve in the active system: `--accent`, `--bg-2`, `--border`,
`--border-strong`, `--eyebrow-tracking`, `--font-mono`, `--mono-size-step`,
`--radius-sm`, `--shadow-lg`, `--surface`, `--surface-2`, `--surface-3`,
`--text`, and `--text-2`. In the captured default system, the dialog's
computed `--bg-2`, `--border-strong`, and `--shadow-lg` results were
`rgb(7, 7, 6)`, `rgba(244, 243, 238, 0.16)`, and
`rgba(0, 0, 0, 0.7) 0px 24px 60px -20px`, respectively. This is token
resolution evidence, not a visual reference-diff or a pixel-parity claim.

## Behaviour recorded

- **a:** The footer rendered the configured Issues destination, with
  `target="_blank"` and `rel="noopener noreferrer"`. Keyboard/browser
  activation opened the expected GitHub Issues path. The absent configured
  email remained visibly unavailable.
- **b:** Empty submit showed client validation. Escape returned focus to the
  footer form trigger. A valid submission returned a `received` receipt and
  its UUID was found in `contact_submissions` with the unique task marker.
  A non-empty honeypot returned a receipt-shaped 200. After five accepted
  requests, the sixth returned 429 with a numeric `Retry-After` (3598 seconds
  in this run); the inline error remained visible and retained the subject.
  Axe reported zero serious or critical violations for the open dialog at
  both 1440 and 375.
- **c:** The configured Discussions link opened
  `github.com/krzemienski/awesome-video/discussions` in a new tab.
- **e:** The palette Contact maintainers row was reached with `ArrowDown` and
  activated with `Enter`. The configured form opened. A separate
  external-fallback configuration opened the configured GitHub Issues
  destination with the same keyboard interaction.
- **Off states:** local unset, empty, and `z` values each had zero
  `[data-testid^="contact-"]` DOM surfaces and returned exactly
  `404 { "message": "Not found" }` for a same-origin `POST /api/contact`.
  The same live DOM/API proof was also recorded against
  `https://awesome.video`.
- **Admin/session completion:** A unique Clerk identity with a random numeric
  bridge id was created through the Clerk backend API, given a short-lived
  backend session token, and paired only with a same-id local admin bridge
  row. The signed-in browser asserted its authenticated admin state before
  opening the disposable resource. This avoided the unavailable audit-key
  password path and did not drive a Clerk sign-in UI.
- **d:** The unique approved resource rendered the variant action at 1440 and
  375. The authenticated browser opened the real Suggest Edit dialog, changed
  its title, and received the real 201 queued-edit response. `/admin/edits`
  showed its pending row; the same admin used the real reject UI with a
  contributor-visible cleanup reason, receiving 200 and observing the row
  disappear. `variant-d-admin-edits-1440.png` is the queue evidence before
  that rejection.
- **b admin inbox:** The same authenticated browser made one uniquely marked
  real contact POST, navigated to `/admin/audit`, observed the matching inbox
  row, and made a credentialed page fetch to
  `/api/admin/contact-submissions?limit=50&offset=0`. It returned 200 and
  contained the returned receipt id.
- **Core fallback:** A separate invalid-variant (`z`) run used a new unique
  numeric bridge admin/resource. The original, non-contact Suggest Edit
  control had no `contact-resource-action` class and opened its real dialog.

## Fixture verification and cleanup

The browser-form `b` requests carried the unique marker
`__qa_test_contact_variant_566_b`. The persisted receipt was queried by its
returned UUID before cleanup. The cleanup query found four marker-bearing
accepted rows, deleted exactly those four rows, and then confirmed zero
remaining marker rows. The single `rate_limit_hits` row for the local
127.0.0.1 contact test run was also removed, returning the development test
state to its preceding empty condition. Honeypot input was confirmed absent
from the marker rows.

The backend-session completion used a different one-run marker on its email,
resource URL, contact message, and proposed edit. Cleanup removed exactly one
resource edit, two resource-audit rows created for that fixture, one resource,
one contact submission, and one local bridge user. The post-cleanup scoped
query confirmed zero matching users, resources, edits, and contacts; the
matching Clerk user was then deleted through the backend API. A final
prefix-scoped Clerk backend query returned zero such identities. The separate
core-fallback run likewise removed exactly its one bridge user and one
resource, with zero scoped residue.
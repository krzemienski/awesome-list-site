---
name: QA throwaway-user teardown
description: How to fully net-zero the `__qa_test_%` users this project's QA sessions create, incl. the FK order that blocks a naive DELETE.
---

# QA throwaway-user teardown

QA/validation sessions register throwaway users named `__qa_test_<timestamp>_<purpose>@example.com`. Always sweep `SELECT ... WHERE email LIKE '\_\_qa\_test\_%'` at teardown.

**Why:** these accumulate across sessions — a prior session's "net-zero, users=N" count silently *included* 5 leftover `__qa_test_` users it never deleted. Don't trust a previous session's baseline count; verify the users table directly.

**How to apply — deletion order matters (FKs on `users.id`):**
1. `DELETE FROM resource_edits WHERE submitted_by = <uid>` — `resource_edits.submitted_by` is NOT NULL with **no** ON DELETE, so it RESTRICTs and a naive user delete throws.
2. NULL the other non-cascade refs first (each RESTRICTs otherwise): `resources.approved_by`, `resource_edits.handled_by`, `github_sync_history.performed_by`, `enrichment_jobs.started_by`, `research_jobs.started_by`.
3. `DELETE FROM resource_audit_log WHERE performed_by = <uid>` — it's ON DELETE SET NULL, so deleting the user leaves the audit row behind (just nulled); delete explicitly for true net-zero.
4. `DELETE FROM users WHERE email LIKE '...'` — cascades `user_favorites`, `user_bookmarks`, `user_journey_progress`, `user_interactions`, `user_preferences`, `api_keys`, and `resources.submitted_by` (so a throwaway user's *submitted* resources are cascade-deleted — check `submitted_by` count first if you care).

**Residue is not just users.** A captured start-of-run baseline snapshot can already include prior-run `__qa_test` residue of *any* type — e.g. a leftover `__qa_test` **learning_journey** (published, 0 steps) inflated `learning_journeys` from the true clean 5 to a recorded 6. True net-zero = purge every `__qa_test_%` row across resources/users/categories/subcategories/sub_subcategories/**learning_journeys**/resource_edits, then reconcile — even when that makes a table land *below* the recorded baseline. Sweep by name pattern, not just by a registry of ids you created this session.

**Don't guess FK column names — derive them.** A teardown assuming `resource_edits.user_id` aborted the whole transaction (`column "user_id" does not exist`; real columns are `submitted_by`/`handled_by`). Before writing the sweep, list every FK pointing at users with information_schema (`constraint_column_usage` where `table_name='users'` joined to `key_column_usage`) and generate the DELETE/NULL statements from that list — the FK set also drifts as tables are added (e.g. `password_reset_tokens.user_id`, `user_preferences.user_id`).

**Scope the purge when gates run concurrently.** A *gate that runs inside the parallel completion suite* must create and purge under its own sub-prefix (e.g. `__qa_test_ds_sweep_%`, `__qa_test_collections_audit_%`), never `__qa_test_%` wholesale — a broad sweep deletes a concurrently running gate's live QA user mid-flight and fails that gate spuriously. The full `__qa_test_%` sweep above is for *interactive/session-end* cleanup, when nothing else is running.

**Never use Clerk user search as the delete predicate.** Clerk's `query` matching is fuzzy and can also omit underscore-heavy test emails. Enumerate users with pagination, then apply the exact owned email prefix locally before deleting anything.

**Why:** A prefix cleanup based directly on provider search matched another gate's live identity, while a different underscore-heavy identity was omitted entirely. The result looked like random session expiry and later caused the app's intentional email-collision fail-closed path.

**How to apply:** For long-running gates that need a reusable privileged identity, keep that stable identity outside the disposable `__qa_test_` namespace and rotate its password per run; put only run-seeded data under the gate's scoped prefix and prove that scoped residue is zero in `finally`.

**Verification gotchas:**
- `POST /api/recommendations/feedback` returns 200 even for a **bogus/non-existent userId** — `recordFeedback` swallows the FK failure in its try/catch. A 200 alone does NOT prove persistence; re-POST with a real user id and confirm the `resource_audit_log` + `user_interactions` rows exist.
- Bash `UID` is a readonly builtin (OS uid, e.g. 1000); assigning `UID=<registered-id>` silently fails and your test posts `userId:"1000"`. Use any other var name (e.g. `QUID`).

# VG-019 — BUG-019 (LOW): Logged-out /submit read-only fields lack semantic state

## Status: fixed-prior, re-verified live
The current build already renders every data-entry control inside `<fieldset disabled={!isAuthenticated}>` (SubmitResource.tsx — landed in an earlier remediation run; the audit observed the stale prod build). No code change was needed this run; the gate was executed fresh against the live dev app.

## Live evidence (real logged-out browser @1440 — 5/5 PASS)
DOM log of all 8 visible form controls (`gate run output`, summarized):
- 6 data-entry controls (URL input, title input, description textarea, category combobox trigger, Radix native select shim, tag input) — **all inside `fieldset[disabled]`** → natively disabled semantics (form controls in a disabled fieldset are disabled per HTML spec, exposed to AT accordingly).
- `button-submit` — explicitly `disabled` (also gated on `!isAuthenticated`).
- `button-cancel` — intentionally live: it is a navigation action ("leave this page"), enters no data, and remains meaningful while logged out (user-control heuristic). Not a read-only field.

Pass criteria:
1. **Disabled state exposed**: 7/7 field controls disabled (fieldset or attribute). ✓
2. **Not focusable/editable**: 40 sequential Tab presses — zero form fields ever received keyboard focus; a forced click + `keyboard.type('https://…')` into the URL input left its value empty (`""`). ✓
3. **Login requirement communicated**: `alert-login-required` banner present — "Login required to submit" with an inline log-in link (`/login?next=%2Fsubmit`). ✓

Screenshot: `bug019-submit-loggedout.png`.

**Verdict: PASS**

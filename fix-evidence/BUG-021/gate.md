# VG-021 — BUG-021 (LOW): Empty Description shows misleading min-length error

## Root cause
The submit form's description rule started at `.min(10, "Description must be at least 10 characters")`, so an EMPTY description surfaced the minimum-length message instead of saying the field is required.

## Fix
Prepend `.min(1, "Description is required")` ahead of the min-10 rule in `client/src/pages/SubmitResource.tsx`; zod reports issues in check order, so an empty field now shows exactly "Description is required" while a 1–9-char value still gets the length guidance. Same fix applied to the suggest-edit dialog (`client/src/components/ui/suggest-edit-dialog.tsx`) for consistency.

## Live evidence (Playwright, real logged-in user, 4/4 PASS)
- Filled Title + valid HTTPS URL + Category, left Description empty, clicked Submit.
- Visible validation message under the field: exactly **"Description is required"** (`bug021-desc-required.png`).
- The min-10 message is absent for the empty field.
- No submission was created by the invalid form (user submissions: 0).

**Selector note (for future audits)**: the string "Must be a valid HTTPS URL" appearing in a `form p` scan is the URL field's static `FormDescription` helper text, NOT a validation error — assert against `[id$="-form-item-message"]` only.

**Hygiene**: QA user torn down (`__qa_test_%` = 0).

**Verdict: PASS**

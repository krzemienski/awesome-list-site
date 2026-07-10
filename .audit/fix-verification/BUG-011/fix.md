# BUG-011 — FIXED (code change)
**Severity:** Low
**Fix:** client/src/pages/ResourceDetail.tsx — added a "Suggest an edit" button visible to authenticated users. The button opens the existing SuggestEditDialog component pre-filled with the current resource values. The dialog already POSTs to /api/resources/:id/edits.

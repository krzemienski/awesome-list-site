# BUG-093 — /resource pages don't surface the curators / authors of curated listings

**Severity:** MEDIUM (data integrity)
**Affected page:** /resource/*

## Reproduction
Inspect the metadata block on any /resource/<id>. It shows
"Added on YYYY-MM-DD · Resource ID" but no curator name. Yet the API
emits `submittedBy: <uuid>` — internal info that isn't user-friendly.

## Expected
A human-readable "Curated by <name>" or "Submitted by anon" tag.

## Actual
No curator attribution. The site relies on community submissions but
doesn't credit anyone.

## Evidence
- `resources-audit`, `resource-phase*.json`

## Fix prompt

```
Task: /resource pages should display the curator (or "anonymous" /
"community submission") for each entry.

Acceptance:
1. /resource/<id> shows a "Curated by <handle>" or "Submitted anonymously" line.
2. Verifiable.
```

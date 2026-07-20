# NB-011 — Subcategory/Sub-subcategory tag filters case-insensitive

## Fix
`client/src/pages/Subcategory.tsx` + `client/src/pages/SubSubcategory.tsx`
now match tags through `normalizeTag` from `@/lib/tags`
(trim → lowercase → whitespace/underscore → hyphen), the same normalizer
Home/Category already used — `?tags=av1` and `?tags=AV1` select the same set.

## Live proof (Playwright, dev, July 20, 2026)
The "Adaptive Streaming" subcategory carries real case-variant tags in the
corpus (`HLS` vs `hls` — verified in DB across resource_tags + metadata.tags).

```json
{ "lowerCount": 14, "upperCount": 14, "pass": true }
```

`/subcategory/adaptive-streaming?tags=hls` and `?tags=HLS` render the
identical 14 resource cards.

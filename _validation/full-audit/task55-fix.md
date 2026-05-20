# Task #55 — Repair 241 hidden resources

## Root cause
241 approved resources had `sub_subcategory` text that exists in the `sub_subcategories` table but under a **different parent subcategory** than the resource's own `subcategory` text. The `getAwesomeListFromDatabase()` join requires `(subcategory, sub_subcategory)` parent-match, so those rows fell out of the hierarchy entirely — they remained visible on `/resource/:id` but never appeared in any category drilldown.

Example: a resource with `subcategory='HLS Tools' sub_subcategory='HLS'` was dropped because `'HLS'` only existed under a different subcategory in the `sub_subcategories` table.

## Fix
Inserted the missing `(subcategory_id, name)` rows so every existing `(subcategory, sub_subcategory)` text combination has a matching FK target. **76 rows inserted**, raising `sub_subcategories` from 32 → **107**. No resources moved; no text edited; purely additive.

```sql
INSERT INTO sub_subcategories (name, slug, subcategory_id)
SELECT DISTINCT r.sub_subcategory, lower(regexp_replace(r.sub_subcategory,'[^a-zA-Z0-9]+','-','g'))||'-sc'||sc.id, sc.id
FROM resources r
JOIN categories c   ON c.name = r.category
JOIN subcategories sc ON sc.name = r.subcategory AND sc.category_id = c.id
LEFT JOIN sub_subcategories ssc ON ssc.name = r.sub_subcategory AND ssc.subcategory_id = sc.id
WHERE r.status='approved' AND r.sub_subcategory IS NOT NULL AND r.sub_subcategory<>'' AND ssc.id IS NULL
```

## Verification
| Metric | Before | After |
|---|---:|---:|
| Approved resources | 1951 | 1951 |
| Resources walking the awesome-list hierarchy | 1710 | **1951** |
| Misparented sub_subcategory references | 241 | **0** |
| Rows in `sub_subcategories` | 32 | 107 |
| `depth-verify` `hierarchy === list` | ❌ 1710/1951 | ✅ **1951/1951** |
| Empty leaves | 11 | 11 (unchanged — source-shape carve-out) |

Acceptance criterion from task description (`hierarchy total equals the list total`) → **MET**.

## Evidence
- `_validation/full-audit/depth-verify.json` (re-generated post-fix)
- `_validation/full-audit/depth-verify.md` (re-generated post-fix)
- This file

# Run-owned temporary rows

Only c6-admin-content-gap-sol rows. QA prefix `[QA-audit-1026]`. Cleanup must delete exact IDs child-first and re-read absent before return.

| type | ID | name/slug | current cleanup status |
|---|---:|---|---|
| Category | 1202 | `[QA-audit-1026] Cáfé gap A` / `qa-audit-1026-gap-a` | deleted by ID; step-049 read absent, 9 categories |
| Subcategory | 2340 | `[QA-audit-1026] gap SC A` / `qa-audit-1026-gap-sc-a`, parent 1202 | deleted by ID; step-048 read absent, 99 subcategories |
| Sub-Subcategory | 3777 | `[QA-audit-1026] gap SSC A` / `qa-audit-1026-gap-ssc-a`, parent 2340 | deleted by ID; step-047 read absent, 32 sub-subcategories |
| Resource | 190360 | `[QA-audit-1026] gap resource` / `https://example.com/qa-audit-1026-gap-sol` | deleted by ID; step-050 read HTTP404 Resource not found |
| Journey step | 262 | journey 6, step 7, `[QA-audit-1026] gap journey step` | deleted by UI ID 262 at 390; subsequent read hasQA=false, 13 original rows, maxStep=6 |
| Category | 1203 | `[QA-audit-1026] tablet lifecycle` | deleted by ID; step-060 read absent |
| Category | 1204 | `[QA-audit-1026] mobile lifecycle` | deleted by ID; step-061 read absent |
| Resource | 190361 | `[QA-audit-1026] tablet resource lifecycle` | deleted by ID; step-063 read HTTP404 |
| Resource | 190362 | `[QA-audit-1026] mobile resource lifecycle` | deleted by ID; step-064 read HTTP404 |
| Resource | 190363 | `[QA-audit-1026] edit fixture` | deleted by ID; step-067 read HTTP404 |
| Edit suggestion | 69 | QA resource 190363 description suggestion | removed with QA resource; step-067 pending queue re-read absent |
| Subcategory | 2341 | `[QA-audit-1026] tablet SC lifecycle` | deleted by ID; step-068 read absent |
| Subcategory | 2342 | `[QA-audit-1026] mobile SC lifecycle` | deleted by ID; step-069 read absent |
| Sub-Subcategory | 3778 | `[QA-audit-1026] tablet SSC lifecycle` | deleted by ID; step-070 read absent |
| Sub-Subcategory | 3779 | `[QA-audit-1026] mobile SSC lifecycle` | deleted by ID; step-071 read absent |

No existing row mutated. Admin audit log entries are unavoidable retained administrative history of these authorized operations. Journey QA creation/edit/delete proof: step-018, step-023, step-024 JSON. Browser command attempts step-010/011 used an unaccepted empty-string fill and resaved the same QA name; step-012 removed trailing characters on that same QA row. Whitespace required validation in step-013 is the accepted proof, not step-010/011/012. Resource duplicate probe `https://ffmpeg.org` was not byte-identical to canonical stored URL and was accepted for the QA row; restored exact QA URL in step-034. No other row affected.

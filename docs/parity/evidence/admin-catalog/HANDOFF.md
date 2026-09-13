# Integration handoff: admin catalog

No aggregate inventory was changed. Apply the accompanying inventory fragment
when integrating the parallel admin shell/components.

## Pixel comparison: preserve the original ceiling

Threshold remains 0.1, maximum differing pixels 0.5%, full union canvas.
All measured catalog pixel rows **FAIL**:

| Surface | 375 | 768 | 1024 | 1440 |
|---|---:|---:|---:|---:|
| Resources | 98.289% | 98.738% | 98.700% | 98.736% |
| Categories | 38.008% | 31.148% | 34.045% | 21.336% |
| Subcategories | 26.215% | 25.835% | 9.940% | 21.539% |

Source: `final-parity-resources/run-{375,1440,768-1024}/results.json`
and `final-parity-taxonomy/accepted-run/results.json`.
Sub-subcategories remain **token-only**, not pixel-eligible; the harness records
UNVERIFIED because there is no frozen counterpart.

The resource reference renders the whole corpus while the app retains required
server pagination: at 1440, app height is 1,535px and reference height 116,880px.
Of 166,180,312 differing pixels, 166,096,800 are unmatched-dimension pixels.
Resolve the reference data/pagination contract without making the production
table unpaginated, cropping, or changing the final tolerance.

The current app also has sidebar/shell/tab geometry different from the reference;
the reference reports blur(14px) plus blur(2px), versus app blur(14px).
Owned table changes reduced category mismatch, but do not constitute full-page
parity. The integration task owns shell composition and whole-page recapture.
Further owned table spacing/chip/icon differences must still be evaluated in
that composition; do not attribute every pixel to the shell automatically.

## Remaining final-verification obligations

1. Post-fix axe at 375/1440 for resource create/edit and the integrated tabs.
2. Assert taxonomy rename refreshes the sidebar (invalidation added after the
   recorded failing observation).
3. Verify public detail within one refetch, home FEATURED count, Curated cards,
   Audit-tab DOM, and rollback on a real request failure.
4. Repair/provide the legacy admin-operations authenticated setup in the final
   regression boundary; its existing expectations were not rewritten here.
5. Re-run required final gates after integration, including repository lint and
   all pixel targets. Current failures remain failures.

## Kind-resolution boundary

The narrow APIs and list return raw rows. For now the client shared resolver is
exact because YAML custom maps are empty; a registered gate enforces that.
Before introducing custom mappings, expose server-authoritative `resolvedKind`
on the admin list/PATCH contracts, remove the client-only assumption and update
the gate. Do not copy server config into the frontend or introduce per-row calls.

## Shared imports

Both owned components import their own unique stylesheets. No extra shared
admin.css import is needed. Category wrappers still consume the same configs.
`.replit` changes only register the kind-mapping validation workflow.
# Shared-file focused ESLint baseline comparison

No checkout file swaps were used. Each HEAD file was piped through `eslint --stdin --stdin-filename <actual path>` and compared with the working file using the same command.

| File | HEAD exit | HEAD errors/warnings | Working exit | Working errors/warnings | Per-rule counts unchanged |
| --- | ---: | ---: | ---: | ---: | --- |
| `client/src/components/layout/new/AppFooter.tsx` | 0 | 0/0 | 0 | 0/0 | YES |
| `client/src/components/layout/new/MainLayout.tsx` | 0 | 0/0 | 0 | 0/0 | YES |
| `client/src/components/ui/search-dialog.tsx` | 1 | 4/0 | 1 | 4/0 | YES |
| `client/src/pages/ResourceDetail.tsx` | 1 | 29/2 | 1 | 29/2 | YES |

## Per-rule counts

### `client/src/components/layout/new/AppFooter.tsx`

- HEAD: {}
- Working: {}

### `client/src/components/layout/new/MainLayout.tsx`

- HEAD: {}
- Working: {}

### `client/src/components/ui/search-dialog.tsx`

- HEAD: {"@typescript-eslint/no-misused-promises":1,"@typescript-eslint/no-unsafe-assignment":1,"@typescript-eslint/no-unsafe-return":1,"@typescript-eslint/prefer-nullish-coalescing":1}
- Working: {"@typescript-eslint/no-misused-promises":1,"@typescript-eslint/no-unsafe-assignment":1,"@typescript-eslint/no-unsafe-return":1,"@typescript-eslint/prefer-nullish-coalescing":1}

### `client/src/pages/ResourceDetail.tsx`

- HEAD: {"@typescript-eslint/no-explicit-any":2,"@typescript-eslint/no-floating-promises":6,"@typescript-eslint/no-misused-promises":2,"@typescript-eslint/no-unnecessary-type-assertion":3,"@typescript-eslint/no-unsafe-assignment":6,"@typescript-eslint/no-unsafe-return":3,"@typescript-eslint/no-unused-vars":1,"@typescript-eslint/prefer-nullish-coalescing":5,"react-hooks/exhaustive-deps":2,"react/no-unescaped-entities":1}
- Working: {"@typescript-eslint/no-explicit-any":2,"@typescript-eslint/no-floating-promises":6,"@typescript-eslint/no-misused-promises":2,"@typescript-eslint/no-unnecessary-type-assertion":3,"@typescript-eslint/no-unsafe-assignment":6,"@typescript-eslint/no-unsafe-return":3,"@typescript-eslint/no-unused-vars":1,"@typescript-eslint/prefer-nullish-coalescing":5,"react-hooks/exhaustive-deps":2,"react/no-unescaped-entities":1}

Conclusion: all four shared files have identical focused ESLint totals and per-rule counts to HEAD; no new focused lint errors were introduced. Non-zero exits are pre-existing file-local findings.

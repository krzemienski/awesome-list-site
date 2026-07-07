# BUG-008 — FIXED (code change)
**Severity:** Critical
**Fix:** Added explicit Zod validation in routes.ts createResourceHandler (submitSchema) before insertResourceSchema.parse: url is z.string().url(), title is z.string().min(1).max(200), category is validated against the dynamically-built known-category set from `categoryRepo.listCategories()`. Invalid → 400 { error: validation_failed or invalid_category }.

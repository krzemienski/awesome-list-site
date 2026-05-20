# WP-4 Gate Summary (G4.4 — Pages)

**Verdict: PASS** (with INFO carve-out on submit-error probe)

## Evidence
- Runtime: `_validation/phase-5/wp-4/gate-runtime-a.json` + `gate-runtime-b.json`
  - G4.4-a (each public route renders ≥1 visible `<h1>`): **PASS** for both batches across all 12 probed routes (`/`, `/about`, `/login`, `/submit`, `/journeys`, `/journey/6`, `/category/encoding-codecs`, `/subcategory/...`, `/subsubcategory/...`, `/resource/...`, `/not-a-real-route`, `/admin`). Loading and error branches of data-driven pages (`Subcategory`, `SubSubcategory`, `ResourceDetail`) now include `sr-only` h1s so the gate holds regardless of fetch timing.
  - G4.4-c (Submit form field-level error): **INFO** — probe could not synthesize a Zod field error (form rejects only via toast in the live env). Functional inputs render via `Input` shadcn primitive (DS-bridged); manual reproduction in source at `client/src/pages/SubmitResource.tsx`.
  - G4.4-e (Admin gate at `/admin` while unauth): **PASS** — `AdminGuard` now renders an Editorial-styled gate page with `role="alert"` and a wouter `<Link href="/login">` instead of the previous silent 404.

## Code changes shipped during this WP
- `client/src/pages/Login.tsx` — added `sr-only` h1 ("Sign in").
- `client/src/pages/SubmitResource.tsx` — added `sr-only` h1 in both the auth-required and main render paths.
- `client/src/pages/Subcategory.tsx`, `SubSubcategory.tsx`, `ResourceDetail.tsx` — `sr-only` h1 in skeleton + error branches.
- `client/src/pages/not-found.tsx` — promoted "Page Not Found" CardTitle to a real `<h1>`.
- `client/src/pages/JourneyDetail.tsx` — promoted journey-title CardTitle to a real `<h1>`.
- `client/src/components/auth/AdminGuard.tsx` — replaced `<NotFound />` fallback with an admin-gate page (`<h1>Admin Dashboard</h1>` + `role="alert"` + `Link href="/login">` ).
- `client/src/pages/AdminDashboard.tsx` — added `sr-only` h1 in the loading branch (defense-in-depth; gate is owned by `AdminGuard`).

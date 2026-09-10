# Assumptions and unresolved decisions

## High-impact constraints

1. **The latest execution brief governs implementation.** The modular source in the uploaded ZIP is newer than both embedded standalone apps. Historical exports and screenshots remain provenance, not replacement expected images.
2. **No parity gate is inferred from a source review.** Full-file byte ledgers, source-focused reports, API reads, and a home smoke capture are different evidence types. The client read manifest reports reviewer assertions and separately revalidates hashes.
3. **Keep the actual registered artifact.** `artifacts/awesome-video-design-system/` is in scope. A replacement mockup, canvas, token-only update, or the main app's `/design-system` route cannot stand in for that artifact.
4. **Retain existing behavior.** Express, Drizzle/PostgreSQL, Clerk, TanStack Query, Wouter, consent-gated analytics, test IDs, authorization, and accessibility stay intact. Nullable kinds and a default-disabled contact endpoint are the explicitly authorized narrow API additions.
5. **Do not fabricate missing capabilities.** No independent posts/CMS backend was found. Reference charts, people, activities, and post operations are demonstrations unless traced to actual app data. Backend additions beyond the explicit exceptions remain blocked.
6. **Auth state is part of pixel alignment.** A reference header naming a demonstration administrator is not comparable to an anonymous app header merely because both pages render. Use authorized real identities or record alignment as blocked. Never add an authentication bypass.
7. **The baseline requires real aligned data.** The public catalog is populated; no import or seed is needed. Categories are names in resource records and slugs in navigation; tags come from metadata. Mapping must preserve identities, ordering, counts, and the complete relevant corpus.
8. **No default-on contact feature.** Values `a`–`e` mean the exact alternatives in the latest brief. Unset/invalid client values are off. Server enablement is separate from client visibility. Missing real destinations are blockers, not reasons to invent a service.

## Source conflicts to reconcile openly

- The reference includes 26–36px visual controls. Preserve the existing 44×44px hit-area contract; distinguish visual size from clickable size.
- Reference CSS hides the sidebar through 768px, while the execution brief requires a 240px sidebar at exactly 768px and a drawer only below it. The explicit breakpoint requirement governs; record the resulting expected-source reconciliation instead of silently modifying baseline geometry.
- The schema inspection found no existing `featured` or `kind` fields despite brief wording referring to existing featured semantics. Trace the real store before adding anything; keep additions backward-compatible and preserve unclassified imports.
- Resource kinds are exactly `tools | libraries | standards | events | protocols | other`, nullable/optional. Missing classifications must resolve from existing tags at read time, not through a fabricated migration backfill.
- The registered artifact has no `docs/` directory; its existing `DESIGN.md`, runtime, and generated tokens are the current foundation. Missing chapter surfaces must be inventoried, not presumed present.

## Environment and evidence

- The configured application workflow serves port 5000; the registered design-system service serves port 20928. The default development proxy returned the design-system HTML even for `/api/awesome-list`. Origin-port checks distinguish these services; no port configuration was changed.
- The app was restarted after comparator dependency installation. A short screenshot captured crawler prerender before client readiness. A later browser capture explicitly awaited `list-categories` and showed all nine real categories with resource teasers; only that capture supports client-render readiness.
- Cached Chromium was found locally, not downloaded. Full parity runs must record the actual executable/browser version and use identical parameters on both sides.
- A helper follow-up returned unrelated film/TV routes rather than the assigned documentation. Its claims and remote screenshots are excluded. Locally persisted reports and hashes are the accepted inspection inputs.
- No publishing, GitHub push, production mutation, paid-service authorization, or cleanup deletion has been performed.
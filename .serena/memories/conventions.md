# Project conventions
- Keep imports at module top; no inline imports without a documented circular-dependency reason.
- Client routes are centralized in `client/src/App.tsx`; layout chrome under `client/src/components/layout/new/`; pages under `client/src/pages/`.
- Server routes are primarily registered in `server/routes.ts`; auth-sensitive endpoints compose `isAuthenticated` and role middleware before handlers.
- Data access belongs in domain repositories under `server/repositories/`, not directly in UI or route code.
- Shared DB and API contracts derive from `shared/schema.ts`; preserve public response shapes unless a planned contract change updates all callers.
- React server state uses TanStack Query; routing uses Wouter.
- TypeScript enum/discriminated-union switches require exhaustive `never` handling.
- Existing untracked audit/test artifacts may belong to prior work; do not overwrite or delete them.
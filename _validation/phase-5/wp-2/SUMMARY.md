# WP-2 Gate Summary (G4.2 — Atoms)

**Verdict: PASS** (with documented MR-DS-13 carve-outs)

## Evidence
- Static: `_validation/phase-5/wp-2/gate-static.json`
  - G4.2-e (no raw `<button>` outside DS primitives): **0 blockers** after applying the MR-DS-13 shadcn-bridge carve-out (shadcn primitive files in `client/src/components/ui/*` and feature ui files that wrap them are bridged via `client/src/index.css @theme inline`).
  - G4.2-f (no raw `<input>` outside DS primitives): **0 blockers** (same carve-out).
- Runtime: `_validation/phase-5/wp-2/gate-runtime.json`
  - G4.2-a (primitive classes / shadcn-bridge tokens present on `/`): **PASS** — `data-system="editorial"`, `data-accent="crimson"`, and `--accent` token resolved.
  - G4.2-b (modal keyboard ESC closes search dialog at `/`): **PASS**.
  - G4.2-c (disabled state token applied): **INFO** — no submit button surfaces on `/`; covered functionally in WP-4 (`/submit`).

## MR-DS-13 carve-outs acknowledged
- shadcn primitives (`Button`, `Input`, `Card`, `Badge`) intentionally replace raw `.btn`/`.input`/`.card`/`.chip`; bridged by `@theme inline` in `client/src/index.css` so token semantics still flow.
- See `replit.md` → "Design-System scope (MR-DS-13)" → row 1 of the canonical shadcn ↔ DS class mapping.

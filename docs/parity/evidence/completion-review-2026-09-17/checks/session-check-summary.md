# Session verification transcript summary

These are the final results actually returned during the completion review.
Initial temporary raw logs were unavailable at consolidation; this is an
explicit transcript summary, not fabricated raw command output or a rerun.

- `npm run check`: exit 0; `tsc`.
- `npm run lint:css`: exit 0; `stylelint "client/**/*.css"`.
- `node scripts/validation/dead-exports.mjs`: exit 0.
  - `PASS canaries`: extraction/re-exports/star/namespace/dynamic uses and allowlist contract.
  - `PASS dead-exports`: 852 exports, 218 modules, 807 imported, 45 pinned exceptions.
- `npm run validate:canonical-token-parity`: exit 0; `PASS canonical-token-parity`.
  Its printed pre-existing deviations remain deviations, not pixel equality.
- Existing `renderStatus` with real retained results:
  `PASS retained-results status: 184 compared, 40 blocked, 100 unverified; no capture rerun`.

The subsequent retained `.log` files contain direct output for standalone
palette, registry types, product profiles and artifact-generated-source checks.
The lint JSON summary deliberately omits full source text and raw diagnostic
messages; it preserves totals and rule counts without copying entire files.
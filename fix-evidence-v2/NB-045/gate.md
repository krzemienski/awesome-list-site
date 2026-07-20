# NB-045 — copy-pasted sibling description (VG-gate)

186257 (dash.js WIKI page about ClearKey encryption) carried a verbatim copy of 185806's description (the dash.js player repo) — scraped from repo-level meta tags. Replaced with a description of the actual page content (`NB045_DESCRIPTIONS`, `scripts/run23-data-fixes-prod.ts`).

Proof (dev, July 20 2026):
- Run 1: `rewrite-description` status 200; run 2: `noop-already-fixed`.
- Rendered check: /resource/186257 shows "Step-by-step guide from the dash.js wiki…" and no longer contains the player description (`nb045-186257.png`, data-cluster.json: hasNewDesc=true, hasOldPlayerDesc=false).

**PASS.** Prod: same script section runs post-republish.

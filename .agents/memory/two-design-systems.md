---
name: Two design systems only (Editorial + Geist)
description: Owner decision narrowing the theme systems; where the kept list lives, removed-value handling, and that artifact docs are now hand-owned.
---

Owner asked (Oct 2026) to keep only "the red and the black and the default" design
systems. Decision: Editorial × Crimson (default/red) + Geist (black). Terminal,
Brutalist and Swiss are gone everywhere; the 10-accent and font pickers stay.

**Why:** the user asked; "red" and "default" both map to Editorial × Crimson.

**How to apply:**
- The kept list is ONE array (THEME_SYSTEM_VALUES in shared/onboarding-values.ts);
  boot, client module, server zod and DB check must agree with it. Changing the set
  = that list + CSS + a new idempotent migration narrowing/widening the check.
- Removed values must keep resolving to Editorial × Crimson (localStorage at boot,
  server prefs rewritten on read) — never delete that mapping.
- Narrowing a CHECK while prod rows violate it can break publish's schema diff
  (it runs before the boot migrator's UPDATE). Rewrite offending prod rows first.
- Artifact docs (artifacts/awesome-video-design-system/docs) are hand-owned now;
  the generator only projects tokens.json/contrast.json. Edit docs directly.
- Older backlog/audit rows that mention the removed systems are historical; leave them.
- Proven in dev: with the prod row still on terminal, narrowing the check (what the
  publish diff does first) errors "violated by some row"; with the row rewritten
  first, the diff narrowing and then migration 0057 at boot both apply cleanly.
  Data-only migrations can't fix this ordering — the diff runs before any migration.
- 2026-10-12: with owner approval, the prod owner row was moved to editorial/crimson via
  the live site's own PUT /api/user/preferences (owner password cookie, then logout).
  Read-only prod check showed 0 rows on removed systems. Until this ships, the old prod code
  still offers Terminal etc., so a re-save there would bring the publish blocker back:
  re-run the read-only count right before publishing.

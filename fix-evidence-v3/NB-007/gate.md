# NB-007 — Real per-skill-level recommendation weighting

**Claim: fixed (code).** (HIGH)

Skill level now applies a real per-level weight to resource difficulty (server/ai/recommendations.ts),
replacing the byte-identical beginner/advanced output. Anon path stays O(1) DB (includeLearningPaths=false
where discarded — no N+1).
Unit (units.out) byte-diff grid: beginnerRes 1.0/0.55/0.15, advancedRes 0.15/0.55/1.0, neutral 0.5 flat;
unknown level -> 0.5. No goals/types regression.

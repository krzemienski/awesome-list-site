# NB-034 (LOW) — Home cold-load regressed +17% (corpus + nav dual-fetch)
**Verdict: covered by R-06** (per the finding's own acceptance: "Covered by R-06 acceptance"). See fix-evidence-v2/R-06/ — the awesome-list corpus is fetched exactly once (early-fetch promise consumed by all query sites) and home wire total is verified ≤ 541KB at the final gate CDP log.

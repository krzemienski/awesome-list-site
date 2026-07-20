# NB-039 — Job History silently truncates at 20 — VG PASS (July 20, 2026)

**Fix**: `researchService.ts` gained `countJobs()`; `/api/researcher/jobs` returns `{ jobs, total }`; `ResearcherTab` Job History CardDescription (`data-testid="text-job-history-range"`) reads "Showing latest 20 of N research jobs" whenever total > listed.

**Proof (live, dev)**: dev had 12 jobs (no truncation — label correctly absent). Seeded 9 QA jobs (`__qa_test_run23` prompts) → endpoint returned `total: 21, listed: 20`; rendered label (Playwright, `/admin/researcher` → Job History tab):

```
Showing latest 20 of 21 research jobs
```

Screenshot: `NB-039-job-history-range.png`. Endpoint shape pre-seed: `jobs-before-seed.json` (`{jobs, total}`, `agentLog` stripped from list rows). QA jobs torn down (prompt LIKE '__qa_test_run23%' = 0; total back to 12).

# VG-035 — Journey toggle feedback ~1.45s → PASS

## Fix
`client/src/pages/JourneyDetail.tsx` completeStepMutation: optimistic update —
`onMutate` cancels in-flight journey queries, snapshots the cache, flips
`progress.completedSteps` immediately; `onError` restores the snapshot + shows the
friendly destructive toast; `onSettled` invalidates to reconcile with server truth
(completedAt/currentStepId).

## Live evidence (Playwright, dev, real admin session — no mocks)
- **Click → visual feedback: 25.6ms** (in-page MutationObserver from click to the
  "uncomplete" button appearing; well under the 300ms budget). Screenshot:
  vg035-after-toggle.png
- **Persistence**: full reload → step 1 still completed (real PUT 200 logged).
- **Real failure path (no mock)**: session destroyed server-side via real
  POST /api/auth/logout, then toggle clicked → PUT returned **401** (network log:
  200 then 401), optimistic flip rolled back to snapshot, destructive toast
  "Failed to Update Progress" shown. Screenshot: vg035-failure-toast.png
- Server state after failed uncomplete: completedSteps [181,182,183] unchanged —
  the 401 wrote nothing.
- Teardown: probe progress row deleted (net-zero, j7/admin rows = 0).

tsc clean (verified this run). Verdict: **PASS**

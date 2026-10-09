# Completion-gate fixes (task 585 follow-on, 2026-10-09)

Completion validation run `fomTI4upOsMqJsrEhLBiN` failed six UI/SEO gates
outside this task's area: sticky-preview, tablet, collections, print,
responsive and seo-snapshot parity on /journey/10. All six trace back to the
10-06 design adoption (5099e66a) or the 13:29 UTC publish (723b71dd).

This task fixed all six and proved them green against the live dev app. Task
#580 (merged to main as d454cd67) then landed fixes for the same six gates. When
this task was rebased onto main, its duplicate gate edits were dropped in favour
of main's versions so the project has one implementation:

- Header breakpoint: main sets the shell header to 60px from 768px up and 56px
  below 768px (MainLayout + sticky-preview gate expect 60 at 768). This task's
  alternative (56px through 768px in app-bridge.css plus a token-parity context
  change) was discarded because it contradicts main's layout and gate.
- Theme preview 12px floor: main scopes it to `[data-testid="preview-card"]`
  with its own token-parity deviation. This task's `.theme-preview-card` class
  and deviation were discarded.
- Journey crawler notice: main's og-middleware/seo-content change is the same
  `hasUnavailableResources` separate-paragraph approach this task used.
- collections / print / responsive / tablet gate assertions: main's versions
  kept (equivalent intent).

The completion validation that runs after this rebase is the proof of record
for these gates on the merged code.

# C7 AO02 (admin Export: downloads, history, validation summary)
Worker: sonnet abfbb98a67afab6a4. Revision 130e5829. 401 downloads after the 15:47Z revocation were re-driven on the re-minted session. Evidence: e2e-evidence/cycle-07/AO02/.
Verdict: 0 findings. PASS: EX-13, 14, 15, 18, 19 at all widths; EX-17 (click only) at 1440+390; EX-21 at 1440. PARTIAL: EX-16 (offline toasts at 1440; a live 5xx was not forced), EX-20 (error+Retry pass; zero-total/empty/loading not forceable). BLOCKED-BY-LEAD: EX-22, 23, 24 (need a stored awesome-lint result = validation run, lead job row).
Note (not a defect): the history Next button at the last page uses aria-disabled while staying natively enabled (focusable-disabled pattern).
Side effect: the downloads wrote export-history audit rows (history 207 -> 218; not deletable, expected).
Lead spot-check: viewed t390.png (Export tab at 390: cards, 44px buttons, no overflow) — matches.
Touch not emulated (viewport only).

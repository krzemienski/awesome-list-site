# C7 AX01d (a11y: filter sheet, radios, target sizes, contrast)
Worker: sonnet a542f5c5f29fa639a. Revisions 130e5829 -> 31d0acce (public 006/008/010 on the old revision; /profile, /admin and 011 on the new one). Evidence: e2e-evidence/cycle-07/AX01d/.
Verdict: 0 confirmed.
- 006 PASS at 1440/390 (inline disclosure, not a sheet; no destructive-cancel dialog exists signed out).
- 008 PASS for design system/accent/font (arrows select and wrap, Home/End); home-layout arrow "focus moves, selection waits for Space" NOT A DEFECT: it is a stock Radix RadioGroup (HomeLayoutPreferenceControl.tsx) and the AX01 worker's arrow test did change the preference (index -> curated, restored), so aria-checked lagging was save-round-trip timing. Learning-preference radios render only signed in -> MB lane.
- 010 PASS (/categories, resource detail, /profile 820, /admin resources 390/820; only exemptions: in-text "PRs welcome", 32px drawn checkbox with a 44px hit area).
- 011: there is no light theme. The site is dark-only (html class="dark" forced in index.html and main.tsx), so the "true light mode" row is N/A, not blocked. Dark: 24 combinations (editorial/geist x crimson/violet/lime/amber x /, /categories, resource), floor 4.57 (violet skip link). All >= 4.5:1.
SECURITY NOTE: the worker passed the cookie contents (not the path) to `cookies set --curl` once; the error echoed part of the owner cookie into its transcript (local only). BRIEF now says pass the path. Owner session rotation at the end of the run (already planned) covers it.
Rule note: the worker wrote a throwaway /tmp DOM-measurement helper. 010 admin sizes rest partly on it; they agree with AX01's measurements.

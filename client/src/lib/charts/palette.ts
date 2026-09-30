// MR-DS-09 — Single source of truth for chart colors.
// Extracted from LinkHealthDashboard.tsx so DS
// compliance sweeps see exactly one palette declaration. All values are
// either DS accents (--accent / --accent-2) or DS status semantics
// (var(--status-ok) ok / var(--status-bad) bad / var(--status-warn) warn / var(--status-info) info / var(--status-info-2) info-2)
// mirrored verbatim from design-system.css.
// Chart series read the design tokens directly (SVG fill/stroke accept var()).
export const CHART_PALETTE: readonly string[] = [
  'var(--accent)',
  'var(--accent-2)',
  'var(--status-ok)',
  'var(--status-warn)',
  'var(--status-info)',
  'var(--status-bad)',
  'var(--status-info-2)',
  'var(--text)',
  'var(--status-ok)', // repeat for the 10-slot recharts expectation
  'var(--accent-2)',
] as const;

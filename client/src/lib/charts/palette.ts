// MR-DS-09 — Single source of truth for chart colors.
// Extracted from analytics-dashboard.tsx + LinkHealthDashboard.tsx so DS
// compliance sweeps see exactly one palette declaration. All values are
// either DS accents (--accent / --accent-2) or DS status semantics
// (#34d08c ok / #ff5c7a bad / #ffb84d warn / #5eddf2 info / #9d4edd info-2)
// mirrored verbatim from design-system.css.
// DS-OK: chart palette literals mirror DS status colors verbatim.
export const CHART_PALETTE: readonly string[] = [
  '#ff3d52', // DS --accent (crimson)
  '#b84dff', // DS --accent-2 (violet)
  '#34d08c', // DS ok
  '#ffb84d', // DS warn
  '#5eddf2', // DS cyan info
  '#ff5c7a', // DS bad
  '#9d4edd', // DS violet info
  '#f4f3ee', // DS --text
  '#34d08c', // DS ok (repeat for 10-slot recharts expectation)
  '#b84dff', // DS --accent-2 (repeat)
] as const;

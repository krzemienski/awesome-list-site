// Single source of truth for admin chart colours, per the design system's
// colour rules (awesome-list-site-ds/docs/07-color.md): chart fills use the
// ink ramp, and the accent marks at most ONE highlighted series. Status hues
// are reserved for status indicators, never chart series.
// SVG fill/stroke accept var(), so series track the active design system.
export const CHART_INK = {
  /** Primary series — full-strength ink. */
  primary: "var(--text)",
  /** Secondary series. */
  secondary: "var(--text-2)",
  /** Tertiary series — still readable as a line on the page background. */
  tertiary: "var(--text-3)",
} as const;

/** The one highlighted series per chart. */
export const CHART_ACCENT = "var(--accent)";

/** Gridlines, axis lines and other chart chrome. */
export const CHART_GRID = "var(--border)";

/** Axis tick and label text. */
export const CHART_AXIS_TEXT = "var(--text-3)";

/**
 * Dash patterns keep same-ink series distinguishable without adding hues
 * (and for readers who cannot separate the ramp steps).
 */
export const CHART_DASH = {
  solid: undefined,
  dashed: "6 4",
  dotted: "2 4",
} as const;

/**
 * Single source of truth for the I1 Font override picker.
 *
 * IMPORTANT: the same FONT_STACKS map is duplicated inline in
 * `client/index.html` boot script for pre-paint application (the boot script
 * cannot import TS modules because it runs before bundle resolution).
 *
 * When editing FONT_OPTIONS, keep the inline map in `client/index.html` in
 * sync by hand — there is no build step to catch drift between the two.
 */
export type FontOption = { id: string; name: string; stack: string };

export const FONT_OPTIONS: FontOption[] = [
  { id: "system",       name: "System default",  stack: "" },
  { id: "inter",        name: "Inter",           stack: "'Inter', system-ui, sans-serif" },
  { id: "dm-sans",      name: "DM Sans",         stack: "'DM Sans', system-ui, sans-serif" },
  { id: "source-sans",  name: "Source Sans 3",   stack: "'Source Sans 3', 'Source Sans Pro', system-ui, sans-serif" },
  { id: "ibm-plex",     name: "IBM Plex Sans",   stack: "'IBM Plex Sans', system-ui, sans-serif" },
  { id: "jetbrains",    name: "JetBrains Mono",  stack: "'JetBrains Mono', ui-monospace, monospace" },
];

export const FONT_LS_KEY = "ds-font-override";

export function applyFontOverride(id: string): void {
  const opt = FONT_OPTIONS.find((f) => f.id === id) ?? FONT_OPTIONS[0];
  // Run22 BUG-015: body text renders with `var(--font-body)` (index.css +
  // design-system.css), NOT `--font-sans` — setting only --font-sans was a
  // silent no-op. Override BOTH: --font-body drives the actual body/UI text,
  // --font-sans keeps Tailwind `font-sans` utilities in agreement.
  if (opt.id === "system" || !opt.stack) {
    document.documentElement.style.removeProperty("--font-body");
    document.documentElement.style.removeProperty("--font-sans");
  } else {
    document.documentElement.style.setProperty("--font-body", opt.stack);
    document.documentElement.style.setProperty("--font-sans", opt.stack);
  }
}

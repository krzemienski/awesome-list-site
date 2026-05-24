/**
 * Single source of truth for the I1 Font override picker.
 *
 * IMPORTANT: the same FONT_STACKS map is duplicated inline in
 * `client/index.html` boot script for pre-paint application (the boot script
 * cannot import TS modules because it runs before bundle resolution).
 *
 * `scripts/verify-fixes.mjs` has a runtime test (V11) that iterates EVERY
 * id in FONT_OPTIONS, persists it to localStorage, hard-reloads, and asserts
 * the resulting `--font-sans` matches `stack`. This catches drift between
 * the two definitions without a build step.
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
  if (opt.id === "system" || !opt.stack) {
    document.documentElement.style.removeProperty("--font-sans");
  } else {
    document.documentElement.style.setProperty("--font-sans", opt.stack);
  }
}

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

const FONT_STYLESHEETS: Record<string, string> = {
  inter: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
  "dm-sans": "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap",
  "source-sans": "https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700&display=swap",
  "ibm-plex": "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap",
  jetbrains: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap",
};

const SYSTEM_STYLESHEETS: Record<string, string> = {
  editorial: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700;9..144,800&display=swap",
  terminal: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap",
  geist: "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap",
  brutalist: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap",
  swiss: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap",
};

function loadStylesheet(href: string): void {
  const alreadyLoaded = Array.from(
    document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
  ).some((link) => link.href === href);
  if (alreadyLoaded) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.dataset.fontHref = href;
  document.head.appendChild(link);
}

/** Load an optional picker font only after a visitor has selected it. */
export function loadFontOverride(id: string): void {
  const href = FONT_STYLESHEETS[id];
  if (href) loadStylesheet(href);
}

/** Load the selected design system's display font after the first paint. */
export function loadDesignSystemFont(systemId: string): void {
  const href = SYSTEM_STYLESHEETS[systemId];
  if (href) loadStylesheet(href);
}

export function applyFontOverride(id: string): void {
  const opt = FONT_OPTIONS.find((f) => f.id === id) ?? FONT_OPTIONS[0];
  document.documentElement.setAttribute("data-font", opt.id);
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
    loadFontOverride(opt.id);
  }
}

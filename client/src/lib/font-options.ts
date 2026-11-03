/**
 * Single source of truth for the I1 Font override picker.
 *
 * The pre-paint boot data is generated from FONT_OPTIONS below and injected
 * into `client/index.html` by Vite. The boot script cannot import TS modules
 * because it runs before bundle resolution, so the generated object keeps the
 * no-flash behavior without introducing a second hand-maintained font list.
 * The boot only touches fonts when an override is actually stored.
 *
 * Every family a stack names is self-hosted: client/public/fonts/fonts.css
 * (linked from client/index.html) declares the @font-face set, and nothing
 * here fetches from a third party, so a stored override never contacts Google
 * Fonts. A picker option needs its family added to that stylesheet.
 */
import { getDesignSystems, isSystemId } from "./design-system";

export type FontOption = { id: string; name: string; stack: string };

export const FONT_OPTIONS: FontOption[] = [
  { id: "system",       name: "System default",  stack: "" },
  { id: "inter",        name: "Inter",           stack: "'Inter', 'Inter Fallback', system-ui, sans-serif" },
  { id: "dm-sans",      name: "DM Sans",         stack: "'DM Sans', system-ui, sans-serif" },
  { id: "source-sans",  name: "Source Sans 3",   stack: "'Source Sans 3', 'Source Sans Pro', system-ui, sans-serif" },
  { id: "ibm-plex",     name: "IBM Plex Sans",   stack: "'IBM Plex Sans', system-ui, sans-serif" },
  { id: "jetbrains",    name: "JetBrains Mono",  stack: "'JetBrains Mono', 'JetBrains Mono Fallback', ui-monospace, monospace" },
];

export const FONT_LS_KEY = "ds-font-override";

export function resolveFontOverrideId(id: string | null): string {
  return FONT_OPTIONS.some((option) => option.id === id) ? id! : FONT_OPTIONS[0].id;
}

/** Data injected by Vite into client/index.html before the first paint. */
export const FONT_BOOT_DATA = {
  stacks: Object.fromEntries(FONT_OPTIONS.map(({ id, stack }) => [id, stack])),
  fallback: FONT_OPTIONS[0].id,
} as const;

/** What "System default" means: the given design system's own body face. */
export function systemFontStack(system: string | null): string | undefined {
  return isSystemId(system) ? getDesignSystems()[system].vars["--font-body"] : undefined;
}

export function applyFontOverride(id: string): void {
  const resolvedId = resolveFontOverrideId(id);
  const opt = FONT_OPTIONS.find((f) => f.id === resolvedId)!;
  const root = document.documentElement;
  root.setAttribute("data-font", opt.id);
  // Run22 BUG-015: body text renders with `var(--font-body)` (index.css +
  // design-system.css), NOT `--font-sans` — setting only --font-sans was a
  // silent no-op. Override BOTH: --font-body drives the actual body/UI text,
  // --font-sans keeps Tailwind `font-sans` utilities in agreement.
  if (opt.id === "system" || !opt.stack) {
    // "System default" means the ACTIVE design system's own body face. The
    // applier owns --font-body, so hand it back its value rather than
    // removing the property (which would leave nothing behind).
    const owned = systemFontStack(root.getAttribute("data-system"));
    if (owned) root.style.setProperty("--font-body", owned);
    root.style.removeProperty("--font-sans");
  } else {
    root.style.setProperty("--font-body", opt.stack);
    root.style.setProperty("--font-sans", opt.stack);
  }
}

/**
 * Re-assert a stored picker override. window.applyDesignSystem clears every
 * key it set (including --font-body) on each call, so anything that switches
 * system or accent must be followed by this. It is a no-op when no override
 * is stored — a first visit stays pure applier state.
 */
export function reapplyStoredFontOverride(): void {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(FONT_LS_KEY);
  } catch {
    return;
  }
  const id = resolveFontOverrideId(stored);
  if (id === "system") return;
  applyFontOverride(id);
}

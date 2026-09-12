/**
 * Single source of truth for the I1 Font override picker.
 *
 * The pre-paint boot data is generated from FONT_OPTIONS below and injected
 * into `client/index.html` by Vite. The boot script cannot import TS modules
 * because it runs before bundle resolution, so the generated object keeps the
 * no-flash behavior without introducing a second hand-maintained font list.
 *
 * A stack is only half of a webfont: something has to download the files.
 * The always-on <link rel="stylesheet"> in `client/index.html` is the ONE
 * request for every family the five design systems name — it is copied
 * byte-for-byte from the design source (awesome-list-site-ds/index.html) so
 * both documents declare the same @font-face set, which pixel parity
 * requires. Switching systems therefore fetches nothing; the map below only
 * covers picker overrides, and the same gate holds it to FONT_OPTIONS — see
 * the rule stated above it. That failure is quieter than a reset: an option
 * whose stack is right but whose stylesheet is missing (or which fetches a
 * family the stack never names) reports the new setting and keeps rendering
 * in the fallback face, so the page just looks unchanged.
 *
 * That gate is offline: it can only catch the two sides DISAGREEING. A family
 * misspelled in BOTH the stack and its URL agrees with itself and passes,
 * while Google Fonts answers 400 and the face never arrives. After editing
 * any URL below, run the opt-in live probe — `npm run validate:webfont-fetch`
 * — which fetches every URL here (plus the pre-paint <link> in
 * `client/index.html`) and requires HTTP 200 AND an @font-face declaring
 * every family the URL asks for. It hits the network, so it is deliberately
 * not part of the validation suite; nothing runs it for you.
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

export function resolveFontOverrideId(id: string | null): string {
  return FONT_OPTIONS.some((option) => option.id === id) ? id! : FONT_OPTIONS[0].id;
}

/** Data injected by Vite into client/index.html before the first paint. */
export const FONT_BOOT_DATA = {
  stacks: Object.fromEntries(FONT_OPTIONS.map(({ id, stack }) => [id, stack])),
  fallback: FONT_OPTIONS[0].id,
} as const;

// RULE (enforced by the `accent-drift` gate): a FONT_OPTIONS entry has an
// entry here IF AND ONLY IF it declares a non-empty stack, and every family
// the URL fetches must be one that entry's stack names. "System default"
// (stack: "") is the one option with no webfont — that exemption belongs to
// the empty stack, not to the id, and is checked in both directions.
//
// Families the canonical shell request already carries (Inter, IBM Plex
// Sans, JetBrains Mono) keep an entry so the picker contract stays uniform;
// their weights mirror the shell's so the two declarations agree. The
// per-system faces need no map at all: the shell <link> in client/index.html
// fetches every family the five systems name (see the header above), so
// switching systems is attribute-only.
const FONT_STYLESHEETS: Record<string, string> = {
  inter: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
  "dm-sans": "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap",
  "source-sans": "https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700&display=swap",
  "ibm-plex": "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap",
  jetbrains: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap",
};

function loadStylesheet(href: string, fontOptionId?: string): void {
  const alreadyLoaded = Array.from(
    document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
  ).find((link) => link.href === href);
  if (alreadyLoaded) {
    if (fontOptionId) alreadyLoaded.dataset.fontOption = fontOptionId;
    return;
  }
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.dataset.fontHref = href;
  if (fontOptionId) link.dataset.fontOption = fontOptionId;
  document.head.appendChild(link);
}

/** Load an optional picker font only after a visitor has selected it. */
export function loadFontOverride(id: string): void {
  const href = FONT_STYLESHEETS[id];
  if (href) loadStylesheet(href, id);
}

export function applyFontOverride(id: string): void {
  const resolvedId = resolveFontOverrideId(id);
  const opt = FONT_OPTIONS.find((f) => f.id === resolvedId)!;
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

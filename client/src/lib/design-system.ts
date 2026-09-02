/* =====================================================================
   AWESOME.VIDEO DESIGN SYSTEM — RUNTIME APPLIER
   Five systems × ten accents (Editorial / Terminal / Geist / Brutalist /
   Swiss × Crimson / Magenta / Orange / Amber / Emerald / Matrix / Cyan /
   Violet / Lime / Rose). Default: Editorial + Crimson.

   Token application is CSS-driven: per-system + per-accent blocks live
   in client/src/styles/design-system.css under :root[data-system="..."]
   and :root[data-accent="..."] selectors. applyDesignSystem() therefore
   only needs to toggle the two attributes on <html> and persist the
   selection to localStorage — no inline style writes, no FOUC.

   The DESIGN_SYSTEMS / ACCENTS / SYSTEM_DEFAULT_ACCENT dictionaries here
   exist purely so the picker UI at /settings/theme can render labels,
   taglines, descriptions, and accent swatches. They mirror the handoff
   project/design-system.js metadata verbatim.
   ===================================================================== */

export interface DesignSystem {
  name: string;
  tag: string;
  desc: string;
}

export interface Accent {
  id: string;
  name: string;
  primary: string;
  secondary: string;
}

// The five system ids are mirrored by the pre-paint SYSTEMS allowlist in
// client/index.html — a system missing from that list is rejected before
// React boots, so choosing it would silently reset to DEFAULT_SYSTEM on the
// next reload. The mirror is enforced: the `accent-drift` validation gate
// (scripts/validation/accent-drift.mjs) fails when a system id or the boot
// fallback here and there disagree.
// The id is only half of it: each system's LOOK is a :root[data-system="…"]
// token block in client/src/styles/design-system.css, and the same gate fails
// when one is missing — an id both lists agree on but nothing paints is a
// theme that sticks and does nothing. Editorial is the documented exception:
// the bare :root block carries its tokens, so the gate exempts it by name,
// with a written reason.
export const DESIGN_SYSTEMS: Record<string, DesignSystem> = {
  editorial: {
    name: 'Editorial',
    tag: 'Magazine · Fraunces',
    desc: 'Refined editorial — italic Fraunces drops, warm ink, generous leading.',
  },
  terminal: {
    name: 'Terminal',
    tag: 'CRT · IBM Plex Mono',
    desc: 'Mono-first terminal — square edges, scanlines, blinking carets.',
  },
  geist: {
    name: 'Geist',
    tag: 'Modern · Geist Sans',
    desc: 'Vercel-clean — neutral, soft 8px radii, quiet hover glow.',
  },
  brutalist: {
    name: 'Brutalist',
    tag: 'Slab · Instrument Serif',
    desc: 'Concrete slab — hard 2px borders, offset shadows, monumental serif.',
  },
  swiss: {
    name: 'Swiss',
    tag: 'Grid · Manrope',
    desc: 'Tight Swiss grid — hairline rules, lining figures, clinical whitespace.',
  },
};

export const ACCENTS: Accent[] = [
  // Swatch metadata for the /settings/theme picker, which paints all ten
  // accents at once. Only the ACTIVE accent's --accent/--accent-2 are readable
  // at runtime, so every accent's paint has to be inlined here, mirroring the
  // :root[data-accent="…"] blocks in client/src/styles/design-system.css.
  // The mirror is enforced: the `accent-drift` validation gate
  // (scripts/validation/accent-drift.mjs) fails when an id or a value here
  // disagrees with that stylesheet or with the pre-paint allowlist in
  // client/index.html.
  // DS-OK: mirrored DS accent constants — keep the two files in sync.
  { id: 'crimson', name: 'Crimson', primary: '#ff3d52', secondary: '#b84dff' },
  { id: 'magenta', name: 'Magenta', primary: '#ec4899', secondary: '#f472b6' },
  { id: 'orange',  name: 'Orange',  primary: '#ff7a3d', secondary: '#ffb84d' },
  { id: 'amber',   name: 'Amber',   primary: '#ffb84d', secondary: '#ffd86b' },
  { id: 'emerald', name: 'Emerald', primary: '#34d08c', secondary: '#5ee6b8' },
  // DS-OK: mirrored DS accent constants (continued — see the note above).
  { id: 'matrix',  name: 'Matrix',  primary: '#00ff88', secondary: '#39ff14' },
  { id: 'cyan',    name: 'Cyan',    primary: '#5eddf2', secondary: '#7dd3fc' },
  { id: 'violet',  name: 'Violet',  primary: '#9d4edd', secondary: '#c77dff' },
  { id: 'lime',    name: 'Lime',    primary: '#aaff00', secondary: '#00ff88' },
  { id: 'rose',    name: 'Rose',    primary: '#ff7a8a', secondary: '#ffb3c1' },
];

// The accent each system is meant to arrive with. Read as
// `SYSTEM_DEFAULT_ACCENT[id] || DEFAULT_ACCENT` by applyDesignSystem() below
// and by the theme provider, so a system with no entry here quietly keeps
// whatever accent is already active instead of its own intended look. That is
// enforced, not trusted: the `accent-drift` validation gate
// (scripts/validation/accent-drift.mjs) fails when a DESIGN_SYSTEMS id has no
// entry, when an entry names a system that no longer exists, or when an entry
// names an accent id that is not in ACCENTS. Adding a system means adding a
// row here too.
export const SYSTEM_DEFAULT_ACCENT: Record<string, string> = {
  editorial: 'crimson',
  terminal:  'matrix',
  geist:     'cyan',
  brutalist: 'amber',
  swiss:     'orange',
};

export const DEFAULT_SYSTEM = 'editorial';
export const DEFAULT_ACCENT = 'crimson';

/**
 * Is this string one of the systems we actually offer?
 *
 * OWN properties only. `id in DESIGN_SYSTEMS` and `DESIGN_SYSTEMS[id] ? …`
 * both say yes to inherited keys — 'toString', 'constructor', '__proto__' —
 * and a stored `ds-system` is arbitrary text: anyone can type one into
 * localStorage, and a retired system id ages into the same state. Those
 * values PAINT as DEFAULT_SYSTEM (the pre-paint boot script in
 * client/index.html resolves against a literal id list) while a prototype
 * -chain test resolves them as themselves, so the two halves disagree and
 * the loader looks up a stylesheet that cannot exist: the page paints
 * Editorial with none of Editorial's faces downloaded (#411).
 */
export function isSystemId(id: string | null | undefined): boolean {
  // hasOwnProperty.call, not Object.hasOwn: this runs on the boot path, and
  // Object.hasOwn is ES2022 — Vite's default build target still includes
  // Safari 14, where it is undefined and would throw before anything renders.
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(DESIGN_SYSTEMS, id);
}

/** The offered system this stored value means — DEFAULT_SYSTEM if it means none. */
export function resolveSystemId(id: string | null | undefined): string {
  return isSystemId(id) ? (id as string) : DEFAULT_SYSTEM;
}

declare global {
  interface Window {
    DESIGN_SYSTEMS?: typeof DESIGN_SYSTEMS;
    ACCENTS?: typeof ACCENTS;
    SYSTEM_DEFAULT_ACCENT?: typeof SYSTEM_DEFAULT_ACCENT;
    applyDesignSystem?: typeof applyDesignSystem;
  }
}

export function applyDesignSystem(systemId: string, accentId: string): { system: string; accent: string } {
  const resolvedSystem = resolveSystemId(systemId);
  const validAccent = ACCENTS.find((x) => x.id === accentId);
  const fallbackAccentId = SYSTEM_DEFAULT_ACCENT[resolvedSystem] || DEFAULT_ACCENT;
  const resolvedAccent = (validAccent && validAccent.id) || fallbackAccentId;

  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.setAttribute('data-system', resolvedSystem);
    root.setAttribute('data-accent', resolvedAccent);
  }

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('ds-system', resolvedSystem);
      localStorage.setItem('ds-accent', resolvedAccent);
    } catch {
      /* localStorage may be unavailable (private mode, quota, etc.) */
    }
  }

  return { system: resolvedSystem, accent: resolvedAccent };
}

if (typeof window !== 'undefined') {
  window.DESIGN_SYSTEMS = DESIGN_SYSTEMS;
  window.ACCENTS = ACCENTS;
  window.SYSTEM_DEFAULT_ACCENT = SYSTEM_DEFAULT_ACCENT;
  window.applyDesignSystem = applyDesignSystem;
}

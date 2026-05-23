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
  { id: 'crimson', name: 'Crimson', primary: '#ff3d52', secondary: '#b84dff' },
  { id: 'magenta', name: 'Magenta', primary: '#ec4899', secondary: '#f472b6' },
  { id: 'orange',  name: 'Orange',  primary: '#ff7a3d', secondary: '#ffb84d' },
  { id: 'amber',   name: 'Amber',   primary: '#ffb84d', secondary: '#ffd86b' },
  { id: 'emerald', name: 'Emerald', primary: '#34d08c', secondary: '#5ee6b8' },
  { id: 'matrix',  name: 'Matrix',  primary: '#00ff88', secondary: '#39ff14' },
  { id: 'cyan',    name: 'Cyan',    primary: '#5eddf2', secondary: '#7dd3fc' },
  { id: 'violet',  name: 'Violet',  primary: '#9d4edd', secondary: '#c77dff' },
  { id: 'lime',    name: 'Lime',    primary: '#aaff00', secondary: '#00ff88' },
  { id: 'rose',    name: 'Rose',    primary: '#ff7a8a', secondary: '#ffb3c1' },
];

export const SYSTEM_DEFAULT_ACCENT: Record<string, string> = {
  editorial: 'crimson',
  terminal:  'matrix',
  geist:     'cyan',
  brutalist: 'amber',
  swiss:     'orange',
};

export const DEFAULT_SYSTEM = 'editorial';
export const DEFAULT_ACCENT = 'crimson';

declare global {
  interface Window {
    DESIGN_SYSTEMS?: typeof DESIGN_SYSTEMS;
    ACCENTS?: typeof ACCENTS;
    SYSTEM_DEFAULT_ACCENT?: typeof SYSTEM_DEFAULT_ACCENT;
    applyDesignSystem?: typeof applyDesignSystem;
  }
}

export function applyDesignSystem(systemId: string, accentId: string): { system: string; accent: string } {
  const resolvedSystem = DESIGN_SYSTEMS[systemId] ? systemId : DEFAULT_SYSTEM;
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

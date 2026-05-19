/* =====================================================================
   AWESOME.VIDEO DESIGN SYSTEM — RUNTIME APPLIER (WP-1)
   Port of awesome-list-site-ds/design-systems.jsx, Terminal-only.
   Side-effectful import: attaches globals, restores saved accent from
   localStorage, applies once.
   ===================================================================== */

export interface DesignSystem {
  name: string;
  tag: string;
  desc: string;
  vars: Record<string, string>;
}

export interface Accent {
  id: string;
  name: string;
  primary: string;
  secondary: string;
}

/* Terminal — all other systems intentionally absent under Option A. */
export const DESIGN_SYSTEMS: Record<string, DesignSystem> = {
  terminal: {
    name: 'Terminal',
    tag: 'CRT · IBM Plex Mono',
    desc: 'Mono-first terminal — square edges, scanlines, blinking carets.',
    vars: {
      '--bg':            '#000000',
      '--bg-2':          '#040404',
      '--surface':       'rgba(0,255,136,0.012)',
      '--surface-2':     'rgba(0,255,136,0.025)',
      '--surface-3':     'rgba(0,255,136,0.05)',
      '--border':        'rgba(232,232,224,0.14)',
      '--border-strong': 'rgba(232,232,224,0.32)',
      '--hairline':      'rgba(232,232,224,0.08)',

      '--text':   '#e8e8e0',
      '--text-2': 'rgba(232,232,224,0.62)',
      '--text-3': 'rgba(232,232,224,0.36)',
      '--text-4': 'rgba(232,232,224,0.2)',

      '--font-body':    "'IBM Plex Mono', ui-monospace, monospace",
      '--font-display': "'IBM Plex Mono', ui-monospace, monospace",
      '--font-mono':    "'IBM Plex Mono', ui-monospace, monospace",
      '--display-weight':   '600',
      '--display-tracking': '-0.01em',
      '--display-leading':  '1.1',
      '--body-leading':     '1.55',
      '--eyebrow-tracking': '0.2em',
      '--mono-size-step':   '12px',

      '--radius':      '0px',
      '--radius-sm':   '0px',
      '--radius-pill': '0px',
      '--border-w':    '1px',
      '--hairline-w':  '1px',

      '--shadow-sm':     'none',
      '--shadow':        'none',
      '--shadow-lg':     '0 0 0 1px var(--accent), inset 0 0 60px color-mix(in srgb, var(--accent) 8%, transparent)',
      '--shadow-accent': '0 0 0 1px var(--accent), 0 0 24px color-mix(in srgb, var(--accent) 30%, transparent)',

      '--bg-atmosphere':
        'repeating-linear-gradient(0deg, transparent 0, transparent 2px, rgba(255,255,255,0.018) 2px, rgba(255,255,255,0.018) 3px),' +
        'radial-gradient(ellipse 800px 600px at 50% 50%, color-mix(in srgb, var(--accent) 4%, transparent), transparent 70%)',
      '--grain-opacity': '0.5',
    },
  },
};

/* 10-accent palette — identical to upstream. */
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
  terminal: 'matrix',
};

declare global {
  interface Window {
    DESIGN_SYSTEMS?: typeof DESIGN_SYSTEMS;
    ACCENTS?: typeof ACCENTS;
    SYSTEM_DEFAULT_ACCENT?: typeof SYSTEM_DEFAULT_ACCENT;
    applyDesignSystem?: typeof applyDesignSystem;
  }
}

interface RootWithKeys extends HTMLElement {
  __appliedKeys?: string[];
}

export function applyDesignSystem(systemId: string, accentId: string): void {
  if (typeof document === 'undefined') return;

  /* Option A: hard-lock to Terminal regardless of input. */
  const resolvedSystem = DESIGN_SYSTEMS[systemId] ? systemId : 'terminal';
  const sys = DESIGN_SYSTEMS[resolvedSystem];

  /* Resolve accent: explicit valid → keep; else system default → matrix. */
  const validAccent = ACCENTS.find((x) => x.id === accentId);
  const fallbackAccentId =
    SYSTEM_DEFAULT_ACCENT[resolvedSystem] || 'matrix';
  const a =
    validAccent ||
    ACCENTS.find((x) => x.id === fallbackAccentId) ||
    ACCENTS[0];
  const resolvedAccentId = a.id;

  const root = document.documentElement as RootWithKeys;

  if (root.__appliedKeys) {
    root.__appliedKeys.forEach((k) => root.style.removeProperty(k));
  }
  const applied: string[] = [];
  Object.entries(sys.vars).forEach(([k, v]) => {
    root.style.setProperty(k, v);
    applied.push(k);
  });

  root.style.setProperty('--accent', a.primary);
  root.style.setProperty('--accent-2', a.secondary);
  applied.push('--accent', '--accent-2');
  root.__appliedKeys = applied;

  root.setAttribute('data-system', resolvedSystem);
  root.setAttribute('data-accent', resolvedAccentId);

  try {
    localStorage.setItem('ds-system', resolvedSystem);
    localStorage.setItem('ds-accent', resolvedAccentId);
  } catch {
    /* localStorage may be unavailable (SSR / privacy mode) */
  }
}

/* Self-register: attach globals + restore saved accent (or default). */
if (typeof window !== 'undefined') {
  window.DESIGN_SYSTEMS = DESIGN_SYSTEMS;
  window.ACCENTS = ACCENTS;
  window.SYSTEM_DEFAULT_ACCENT = SYSTEM_DEFAULT_ACCENT;
  window.applyDesignSystem = applyDesignSystem;

  let savedSystem = 'terminal';
  let savedAccent = SYSTEM_DEFAULT_ACCENT.terminal;
  try {
    savedSystem = localStorage.getItem('ds-system') || 'terminal';
    savedAccent =
      localStorage.getItem('ds-accent') ||
      SYSTEM_DEFAULT_ACCENT[savedSystem] ||
      'matrix';
  } catch {
    /* ignore */
  }
  /* Lock to Terminal under Option A regardless of legacy values. */
  applyDesignSystem('terminal', savedAccent);
}

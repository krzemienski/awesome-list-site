/* =====================================================================
   AWESOME.VIDEO DESIGN SYSTEM — RUNTIME APPLIER (WP-1, Editorial)
   Single-personality build: Editorial + Crimson.

   The CSS in client/src/styles/design-system.css already declares the
   canonical Editorial token values at :root, and client/index.html sets
   <html data-system="editorial" data-accent="crimson"> before any module
   paints. This module therefore intentionally does NOT push inline styles
   onto documentElement at boot — doing so would override the CSS layer
   and re-introduce drift.

   It still exports DESIGN_SYSTEMS / ACCENTS / applyDesignSystem because
   /settings/theme and a few other surfaces consume them. applyDesignSystem
   remains callable for future re-introduction of a switcher, but the
   self-init block below is now a no-op.
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

export const DESIGN_SYSTEMS: Record<string, DesignSystem> = {
  editorial: {
    name: 'Editorial',
    tag: 'Serif display · Fraunces / Inter',
    desc: 'Refined editorial voice — italic accents, soft radii, warm ink on near-black.',
    vars: {
      '--bg':            '#000000',
      '--bg-2':          '#0a0a0a',
      '--surface':       'rgba(244,243,238,0.025)',
      '--surface-2':     'rgba(244,243,238,0.05)',
      '--surface-3':     'rgba(244,243,238,0.08)',
      '--border':        'rgba(244,243,238,0.08)',
      '--border-strong': 'rgba(244,243,238,0.16)',
      '--hairline':      'rgba(244,243,238,0.06)',

      '--text':   '#f4f3ee',
      '--text-2': 'rgba(244,243,238,0.66)',
      '--text-3': 'rgba(244,243,238,0.4)',
      '--text-4': 'rgba(244,243,238,0.22)',

      '--font-body':    "'Inter', system-ui, sans-serif",
      '--font-display': "'Fraunces', Georgia, serif",
      '--font-mono':    "'JetBrains Mono', ui-monospace, monospace",
      '--display-weight':   '500',
      '--display-tracking': '-0.02em',
      '--display-leading':  '1.04',
      '--body-leading':     '1.6',
      '--eyebrow-tracking': '0.18em',
      '--mono-size-step':   '11px',

      '--radius':      '12px',
      '--radius-sm':   '8px',
      '--radius-pill': '999px',
      '--border-w':    '1px',
      '--hairline-w':  '1px',

      '--shadow-sm':     '0 1px 2px rgba(0,0,0,0.3)',
      '--shadow':        '0 6px 24px -8px rgba(0,0,0,0.5)',
      '--shadow-lg':     '0 24px 60px -20px rgba(0,0,0,0.7)',
      '--shadow-accent': '0 0 0 1px color-mix(in srgb, var(--accent) 25%, transparent), 0 12px 36px -12px color-mix(in srgb, var(--accent) 40%, transparent)',

      '--bg-atmosphere':
        'radial-gradient(ellipse 1200px 800px at 50% 0%, color-mix(in srgb, var(--accent) 5%, transparent), transparent 60%),' +
        'radial-gradient(ellipse 800px 600px at 50% 100%, color-mix(in srgb, var(--accent-2) 3%, transparent), transparent 60%)',
      '--grain-opacity': '0.32',
    },
  },
};

/* 10-accent palette retained for /settings/theme consumer compatibility. */
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

/* Callable for future switcher reintroduction. NOT invoked at boot. */
export function applyDesignSystem(systemId: string, accentId: string): void {
  if (typeof document === 'undefined') return;

  const resolvedSystem = DESIGN_SYSTEMS[systemId] ? systemId : 'editorial';
  const sys = DESIGN_SYSTEMS[resolvedSystem];

  const validAccent = ACCENTS.find((x) => x.id === accentId);
  const fallbackAccentId = SYSTEM_DEFAULT_ACCENT[resolvedSystem] || 'crimson';
  const a = validAccent || ACCENTS.find((x) => x.id === fallbackAccentId) || ACCENTS[0];

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
  root.setAttribute('data-accent', a.id);

  try {
    localStorage.setItem('ds-system', resolvedSystem);
    localStorage.setItem('ds-accent', a.id);
  } catch {
    /* localStorage may be unavailable */
  }
}

/* Self-register globals only. Do NOT apply inline styles at boot — the
   CSS layer + index.html boot attributes already lock Editorial+Crimson. */
if (typeof window !== 'undefined') {
  window.DESIGN_SYSTEMS = DESIGN_SYSTEMS;
  window.ACCENTS = ACCENTS;
  window.SYSTEM_DEFAULT_ACCENT = SYSTEM_DEFAULT_ACCENT;
  window.applyDesignSystem = applyDesignSystem;
}

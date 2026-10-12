/* =====================================================================
   DESIGN SYSTEMS — Awesome.Video
   Two kept systems: Editorial (the default, Crimson red) and Geist
   (neutral black). All flat-black background. The kept list lives in
   shared/onboarding-values.ts (THEME_SYSTEM_VALUES).
   Each system overrides ~30 tokens AND triggers a [data-system] attribute
   on <html> so component skins can shift in CSS (see styles.css).
   ===================================================================== */

window.DESIGN_SYSTEMS = {

  /* ───────────────────────── EDITORIAL ─────────────────────────
     Refined magazine. Fraunces italic display, generous leading,
     warm off-white ink, soft surfaces, accent reserved for italics.
  */
  editorial: {
    name: 'Editorial',
    tag: 'Magazine · Fraunces',
    desc: 'Refined editorial — italic Fraunces drops, warm ink, generous leading.',
    vars: {
      /* surface */
      '--bg':            '#000000',
      '--bg-2':          '#070706',
      '--surface':       'rgba(244,243,238,0.025)',
      '--surface-2':     'rgba(244,243,238,0.05)',
      '--surface-3':     'rgba(244,243,238,0.08)',
      '--border':        'rgba(244,243,238,0.08)',
      '--border-strong': 'rgba(244,243,238,0.16)',
      '--hairline':      'rgba(244,243,238,0.06)',

      /* ink */
      '--text':   '#f4f3ee',
      '--text-2': 'rgba(244,243,238,0.66)',
      '--text-3': 'rgba(244,243,238,0.4)',
      '--text-4': 'rgba(244,243,238,0.22)',

      /* type */
      '--font-body':    "'Inter', system-ui, sans-serif",
      '--font-display': "'Fraunces', Georgia, serif",
      '--font-mono':    "'JetBrains Mono', ui-monospace, monospace",
      '--display-weight': '500',
      '--display-tracking': '-0.02em',
      '--display-leading':  '1.04',
      '--body-leading':     '1.6',
      '--eyebrow-tracking': '0.18em',
      '--mono-size-step':   '11px',

      /* shape */
      '--radius':    '12px',
      '--radius-sm': '8px',
      '--radius-pill': '999px',
      '--border-w':  '1px',
      '--hairline-w': '1px',

      /* shadow */
      '--shadow-sm':  '0 1px 2px rgba(0,0,0,0.3)',
      '--shadow':     '0 6px 24px -8px rgba(0,0,0,0.5)',
      '--shadow-lg':  '0 24px 60px -20px rgba(0,0,0,0.7)',
      '--shadow-accent': '0 0 0 1px color-mix(in srgb, var(--accent) 25%, transparent), 0 12px 36px -12px color-mix(in srgb, var(--accent) 40%, transparent)',

      /* atmosphere */
      '--bg-atmosphere':
        'radial-gradient(ellipse 1100px 700px at 88% -8%, color-mix(in srgb, var(--accent) 7%, transparent), transparent 60%),' +
        'radial-gradient(ellipse 900px 500px at -8% 110%, color-mix(in srgb, var(--accent-2) 6%, transparent), transparent 60%)',
      '--grain-opacity': '0.32',
    },
  },

  /* ───────────────────────── GEIST ─────────────────────────
     Vercel-clean. Geist sans, neutral grays, soft 8px radii,
     subtle hover glow, no decoration. Quiet confidence.
  */
  geist: {
    name: 'Geist',
    tag: 'Modern · Geist Sans',
    desc: 'Vercel-clean — neutral, soft 8px radii, quiet hover glow.',
    vars: {
      '--bg':            '#000000',
      '--bg-2':          '#0a0a0a',
      '--surface':       'rgba(255,255,255,0.04)',
      '--surface-2':     'rgba(255,255,255,0.07)',
      '--surface-3':     'rgba(255,255,255,0.1)',
      '--border':        'rgba(255,255,255,0.1)',
      '--border-strong': 'rgba(255,255,255,0.18)',
      '--hairline':      'rgba(255,255,255,0.07)',

      '--text':   '#fafafa',
      '--text-2': 'rgba(250,250,250,0.62)',
      '--text-3': 'rgba(250,250,250,0.38)',
      '--text-4': 'rgba(250,250,250,0.2)',

      '--font-body':    "'Geist', 'Inter', system-ui, sans-serif",
      '--font-display': "'Geist', 'Inter', system-ui, sans-serif",
      '--font-mono':    "'JetBrains Mono', ui-monospace, monospace",
      '--display-weight': '600',
      '--display-tracking': '-0.035em',
      '--display-leading':  '1.05',
      '--body-leading':     '1.55',
      '--eyebrow-tracking': '0.06em',
      '--mono-size-step':   '11px',

      '--radius':    '10px',
      '--radius-sm': '6px',
      '--radius-pill': '999px',
      '--border-w':  '1px',
      '--hairline-w': '1px',

      '--shadow-sm':  '0 1px 2px rgba(0,0,0,0.4)',
      '--shadow':     '0 0 0 1px rgba(255,255,255,0.04), 0 8px 24px rgba(0,0,0,0.4)',
      '--shadow-lg':  '0 0 0 1px rgba(255,255,255,0.06), 0 24px 56px rgba(0,0,0,0.55)',
      '--shadow-accent': '0 0 0 1px color-mix(in srgb, var(--accent) 50%, transparent), 0 0 32px color-mix(in srgb, var(--accent) 25%, transparent)',

      '--bg-atmosphere':
        'radial-gradient(ellipse 1200px 800px at 50% -20%, rgba(255,255,255,0.03), transparent 60%)',
      '--grain-opacity': '0',
    },
  },

};

/* Accent palette — used across all systems. Each system tones them differently. */
window.ACCENTS = [
  { id: 'crimson',  name: 'Crimson',  primary: '#ff3d52', secondary: '#b84dff' },
  { id: 'magenta',  name: 'Magenta',  primary: '#ec4899', secondary: '#f472b6' },
  { id: 'orange',   name: 'Orange',   primary: '#ff7a3d', secondary: '#ffb84d' },
  { id: 'amber',    name: 'Amber',    primary: '#ffb84d', secondary: '#ffd86b' },
  { id: 'emerald',  name: 'Emerald',  primary: '#34d08c', secondary: '#5ee6b8' },
  { id: 'matrix',   name: 'Matrix',   primary: '#00ff88', secondary: '#39ff14' },
  { id: 'cyan',     name: 'Cyan',     primary: '#5eddf2', secondary: '#7dd3fc' },
  { id: 'violet',   name: 'Violet',   primary: '#9d4edd', secondary: '#c77dff' },
  { id: 'lime',     name: 'Lime',     primary: '#aaff00', secondary: '#00ff88' },
  { id: 'rose',     name: 'Rose',     primary: '#ff7a8a', secondary: '#ffb3c1' },
];

/* Smart accent default per system — nudges users toward the system's natural color. */
window.SYSTEM_DEFAULT_ACCENT = {
  editorial: 'crimson',
  geist:     'cyan',
};

/* Type scale — semantic sizes the showcase + components can use. */
window.TYPE_SCALE = [
  { name: 'display-xl', px: 72, label: 'Display XL', use: 'Hero, single-line' },
  { name: 'display',    px: 56, label: 'Display',    use: 'Page hero' },
  { name: 'h1',         px: 40, label: 'H1',         use: 'Section anchor' },
  { name: 'h2',         px: 28, label: 'H2',         use: 'Subsection' },
  { name: 'h3',         px: 20, label: 'H3',         use: 'Card heading' },
  { name: 'h4',         px: 16, label: 'H4',         use: 'List item title' },
  { name: 'body',       px: 14, label: 'Body',       use: 'Prose, default' },
  { name: 'small',      px: 13, label: 'Small',      use: 'Meta, secondary' },
  { name: 'caption',    px: 11, label: 'Caption',    use: 'Mono, eyebrow, kbd' },
];

/* Spacing scale — 4px base. */
window.SPACE_SCALE = [
  { name: '0',  px: 0  },
  { name: '1',  px: 4  },
  { name: '2',  px: 8  },
  { name: '3',  px: 12 },
  { name: '4',  px: 16 },
  { name: '5',  px: 20 },
  { name: '6',  px: 24 },
  { name: '8',  px: 32 },
  { name: '10', px: 40 },
  { name: '12', px: 48 },
  { name: '16', px: 64 },
  { name: '20', px: 80 },
];

window.applyDesignSystem = function(systemId, accentId) {
  const sys = window.DESIGN_SYSTEMS[systemId] || window.DESIGN_SYSTEMS.editorial;
  const root = document.documentElement;

  /* Clear any previously-set vars from a prior system so nothing leaks across switches.
     We track which keys we've ever applied on a single property of root. */
  if (root.__appliedKeys) {
    root.__appliedKeys.forEach(k => root.style.removeProperty(k));
  }
  const applied = [];
  Object.entries(sys.vars).forEach(([k, v]) => {
    root.style.setProperty(k, v);
    applied.push(k);
  });
  root.__appliedKeys = applied;

  const a = window.ACCENTS.find(x => x.id === accentId) || window.ACCENTS[0];
  root.style.setProperty('--accent',   a.primary);
  root.style.setProperty('--accent-2', a.secondary);
  root.__appliedKeys.push('--accent', '--accent-2');

  /* data-system attr drives per-system component skins in styles.css. */
  root.setAttribute('data-system', systemId);
  root.setAttribute('data-accent', accentId);
};

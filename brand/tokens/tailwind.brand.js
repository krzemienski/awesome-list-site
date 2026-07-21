/**
 * awesome.video brand tokens — Tailwind snippet.
 * Mirror of brand/tokens/brand.css; values map 1:1 onto the runtime
 * Editorial + Crimson skin in client/src/styles/design-system.css.
 * Spread into `theme.extend` of a tailwind.config:
 *
 *   const brand = require('./brand/tokens/tailwind.brand.js');
 *   module.exports = { theme: { extend: brand } };
 */
module.exports = {
  colors: {
    'brand-bg': '#000000',
    'brand-surface': '#0e0d0c',
    'brand-ink': '#f4f3ee',
    'brand-muted': '#a8a4a0',
    'brand-crimson': '#ff3d52',
    'brand-crimson-tint': '#ffb4be',
    'brand-violet': '#b84dff',
    'brand-hairline': 'rgba(244,243,238,0.12)',
    'brand-ok': '#34d08c',
    'brand-warn': '#ffb84d',
    'brand-bad': '#ff5c7a',
    'brand-info': '#5eddf2',
  },
  fontFamily: {
    'brand-sans': ['Inter', 'Helvetica Neue', 'sans-serif'],
    'brand-serif': ['Fraunces', 'Times New Roman', 'serif'],
    'brand-mono': ['JetBrains Mono', 'monospace'],
  },
};

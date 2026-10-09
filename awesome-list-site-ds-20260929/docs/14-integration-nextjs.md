# 14 · Integration: Next.js

> App Router, server components, and zero-flash theming.

## Setup

### 1. Copy the files

```
/styles/design-system.css       ← was styles.css
/lib/design-system.ts            ← was design-systems.jsx
```

Make `design-system.ts` a plain TypeScript module:

```ts
// lib/design-system.ts
"use client"; // not strictly needed for the exports themselves,
              // but the provider that imports this will be a client component.

export const DESIGN_SYSTEMS = { /* ... */ };
export const ACCENTS = [ /* ... */ ];
export const SYSTEM_DEFAULT_ACCENT = { /* ... */ };

export function applyDesignSystem(systemId: SystemId, accentId: AccentId) {
  /* …existing body… */
}
```

### 2. Import the CSS in your root layout

```tsx
// app/layout.tsx
import '@/styles/design-system.css';
import { ReactNode } from 'react';
import { DesignSystemProvider } from '@/components/DesignSystemProvider';
import { PreApplyScript } from '@/components/PreApplyScript';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <PreApplyScript />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital@0;1&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
        />
      </head>
      <body>
        <div className="page">
          <div className="grain" />
          <DesignSystemProvider>{children}</DesignSystemProvider>
        </div>
      </body>
    </html>
  );
}
```

`suppressHydrationWarning` on `<html>` is required — we'll mutate
`data-system` before hydration, and React would otherwise complain about
the mismatch.

## No-FOUT

The critical piece. Render a sync inline script in `<head>` that runs
before React hydrates:

```tsx
// components/PreApplyScript.tsx
import Script from 'next/script';

export function PreApplyScript() {
  /*
   * This script needs to run synchronously, before paint. We inline it
   * with `dangerouslySetInnerHTML` rather than next/script so it executes
   * immediately, not via the script-loading scheduler.
   *
   * It is intentionally written without imports — it inlines the system
   * defaults map verbatim so it can run before any module is parsed.
   */
  const code = `
(function(){
  var SYS_DEFAULT = {
    editorial:'crimson',
    terminal:'matrix',
    geist:'cyan',
    brutalist:'amber',
    swiss:'orange'
  };
  try {
    var sys = localStorage.getItem('ds-system') || 'editorial';
    var acc = localStorage.getItem('ds-accent') || SYS_DEFAULT[sys] || 'crimson';
    document.documentElement.setAttribute('data-system', sys);
    document.documentElement.setAttribute('data-accent', acc);
  } catch (e) {}
})();
`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
```

Wait — this only sets the `data-system` attribute, not the tokens. Why?

Because we can't safely run the full `applyDesignSystem` (which depends on
the 36-token object) without bundling it. Two options:

### Option A (recommended) — inline the tokens too

Build a static CSS file per system that pre-declares tokens scoped by
attribute:

```css
/* styles/themes.css — generated build-time from design-system.ts */
[data-system="editorial"] {
  --bg: #000;
  --surface: rgba(244,243,238,0.025);
  --text: #f4f3ee;
  --font-display: 'Fraunces', Georgia, serif;
  /* ...all 30 tokens... */
}
[data-system="terminal"] { /* ... */ }
[data-system="geist"]    { /* ... */ }
[data-system="brutalist"]{ /* ... */ }
[data-system="swiss"]    { /* ... */ }

[data-accent="crimson"]  { --accent: #ff3d52; --accent-2: #b84dff; }
[data-accent="matrix"]   { --accent: #00ff88; --accent-2: #39ff14; }
/* ...all 10 accents... */
```

Generate this once at build time with a tiny Node script:

```js
// scripts/build-themes.mjs
import { DESIGN_SYSTEMS, ACCENTS } from '../lib/design-system.js';
import { writeFileSync } from 'node:fs';

let css = '';
for (const [id, sys] of Object.entries(DESIGN_SYSTEMS)) {
  css += `[data-system="${id}"] {\n`;
  for (const [k, v] of Object.entries(sys.vars)) {
    css += `  ${k}: ${v};\n`;
  }
  css += `}\n\n`;
}
for (const a of ACCENTS) {
  css += `[data-accent="${a.id}"] { --accent: ${a.primary}; --accent-2: ${a.secondary}; }\n`;
}
writeFileSync('./styles/themes.css', css);
```

Run as a `prebuild` hook in `package.json`:

```json
{
  "scripts": {
    "prebuild": "node scripts/build-themes.mjs",
    "build": "next build"
  }
}
```

Now setting `data-system="terminal"` in the inline script is enough — the
tokens cascade via the attribute selector. **Zero flash, zero JS for
theming.**

### Option B — accept a one-frame flicker

Keep `applyDesignSystem` as the only path. The inline script only sets the
attribute (no tokens). On client mount, the provider runs
`applyDesignSystem` which writes the tokens. Users see one frame of
unstyled tokens for ~16ms. In a dark theme on black, this is barely
visible.

We use **Option A** in production.

## The provider (client component)

```tsx
// components/DesignSystemProvider.tsx
'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { SYSTEM_DEFAULT_ACCENT, type SystemId, type AccentId } from '@/lib/design-system';

const Ctx = createContext<{
  system: SystemId; accent: AccentId;
  setSystem: (id: SystemId) => void;
  setAccent: (id: AccentId) => void;
} | null>(null);

export function DesignSystemProvider({ children }: { children: ReactNode }) {
  const [system, setS] = useState<SystemId>('editorial');
  const [accent, setA] = useState<AccentId>('crimson');

  // Read from DOM (set by PreApplyScript) on mount
  useEffect(() => {
    const sys = (document.documentElement.getAttribute('data-system') as SystemId) || 'editorial';
    const acc = (document.documentElement.getAttribute('data-accent') as AccentId) || SYSTEM_DEFAULT_ACCENT[sys];
    setS(sys);
    setA(acc);
  }, []);

  // Persist + update DOM on change
  useEffect(() => {
    document.documentElement.setAttribute('data-system', system);
    document.documentElement.setAttribute('data-accent', accent);
    localStorage.setItem('ds-system', system);
    localStorage.setItem('ds-accent', accent);
  }, [system, accent]);

  const setSystem = (id: SystemId) => {
    const prevNatural = SYSTEM_DEFAULT_ACCENT[system];
    if (accent === prevNatural) setA(SYSTEM_DEFAULT_ACCENT[id]);
    setS(id);
  };

  return <Ctx.Provider value={{ system, accent, setSystem, setAccent: setA }}>{children}</Ctx.Provider>;
}

export function useDesignSystem() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('Missing DesignSystemProvider');
  return ctx;
}
```

## Server components

Server components can't use the provider hook. But they don't need to —
they render HTML with the design-system classes (`.btn`, `.card`), and the
attribute-selector CSS handles the rest.

```tsx
// app/page.tsx — a server component
export default async function HomePage() {
  const resources = await fetchResources();
  return (
    <main style={{ maxWidth: 1240, margin: '0 auto', padding: '48px 40px' }}>
      <div className="eyebrow">── INDEX</div>
      <h1 className="display-h" style={{ fontSize: 'clamp(40px, 6vw, 72px)' }}>
        Resources
      </h1>

      {resources.map(r => (
        <article key={r.id} className="card hoverable">
          <h3>{r.title}</h3>
          <p style={{ color: 'var(--text-2)' }}>{r.desc}</p>
        </article>
      ))}
    </main>
  );
}
```

System picker UIs must be client components:

```tsx
// components/SystemPicker.tsx
'use client';
import { useDesignSystem } from './DesignSystemProvider';
// ...
```

## Per-route system pinning

Some routes might want to ship a specific system regardless of user
preference (a marketing landing, a print view, an embedded widget). Force
the attribute on `<html>`:

```tsx
// app/embed/layout.tsx
export default function EmbedLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-system="terminal" data-accent="matrix">
      <body>{children}</body>
    </html>
  );
}
```

This route ignores localStorage entirely.

## Image optimization

The grain SVG is inline in CSS (`url("data:image/svg+xml;...")`). Don't
import it through `next/image` — it's a CSS background, not a content
image.

For accent-tinted illustrations, generate per-accent variants at build
time or use CSS masks:

```tsx
<div style={{
  width: 200, height: 200,
  background: 'var(--accent)',
  WebkitMaskImage: 'url(/my-icon.svg)',
  WebkitMaskRepeat: 'no-repeat',
  WebkitMaskSize: 'contain',
}} />
```

---

**Next:** **[15 · Integration: Vue / Nuxt →](./15-integration-vue.md)**

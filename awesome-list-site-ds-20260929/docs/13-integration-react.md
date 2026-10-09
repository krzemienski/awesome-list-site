# 13 · Integration: React

> Provider, hooks, and component patterns for a React app.

## Files

Keep the same two files; rename for clarity:

```
/src/styles/design-system.css      ← was styles.css
/src/lib/design-system.ts          ← was design-systems.jsx, now typed JS
```

## Type the system

`design-systems.jsx` is plain JS with no types. Add a `.d.ts` next to it
(or convert to TS):

```ts
// design-system.ts
export type SystemId = 'editorial' | 'terminal' | 'geist' | 'brutalist' | 'swiss';
export type AccentId =
  | 'crimson' | 'magenta' | 'orange' | 'amber' | 'emerald'
  | 'matrix' | 'cyan' | 'violet' | 'lime' | 'rose';

export interface SystemDef {
  name: string;
  tag: string;
  desc: string;
  vars: Record<string, string>;
}

export const DESIGN_SYSTEMS: Record<SystemId, SystemDef> = { /* … */ };
export const ACCENTS: { id: AccentId; name: string; primary: string; secondary: string }[] = [/* … */];
export const SYSTEM_DEFAULT_ACCENT: Record<SystemId, AccentId> = { /* … */ };

export function applyDesignSystem(systemId: SystemId, accentId: AccentId): void {
  // …same body as before…
}
```

The body is the same imperative DOM logic. Calling it in a React app still
mutates `:root` and `<html>` — React doesn't manage those.

## The provider + hook

The idiomatic React layer:

```tsx
// DesignSystemProvider.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { applyDesignSystem, SystemId, AccentId, SYSTEM_DEFAULT_ACCENT } from './design-system';

interface Ctx {
  system: SystemId;
  accent: AccentId;
  setSystem: (id: SystemId) => void;
  setAccent: (id: AccentId) => void;
}

const DesignSystemCtx = createContext<Ctx | null>(null);

export function DesignSystemProvider({
  children,
  defaultSystem = 'editorial',
  defaultAccent,
}: {
  children: ReactNode;
  defaultSystem?: SystemId;
  defaultAccent?: AccentId;
}) {
  const [system, setSystem] = useState<SystemId>(() => {
    if (typeof window === 'undefined') return defaultSystem;
    return (localStorage.getItem('ds-system') as SystemId) || defaultSystem;
  });
  const [accent, setAccent] = useState<AccentId>(() => {
    if (typeof window === 'undefined') return defaultAccent || SYSTEM_DEFAULT_ACCENT[defaultSystem];
    return (localStorage.getItem('ds-accent') as AccentId)
        || SYSTEM_DEFAULT_ACCENT[(localStorage.getItem('ds-system') as SystemId) || defaultSystem];
  });

  useEffect(() => {
    applyDesignSystem(system, accent);
    localStorage.setItem('ds-system', system);
    localStorage.setItem('ds-accent', accent);
  }, [system, accent]);

  // Smart accent shift when user picks a fresh system
  const handleSetSystem = (next: SystemId) => {
    const prevNatural = SYSTEM_DEFAULT_ACCENT[system];
    if (accent === prevNatural) setAccent(SYSTEM_DEFAULT_ACCENT[next]);
    setSystem(next);
  };

  return (
    <DesignSystemCtx.Provider value={{
      system, accent,
      setSystem: handleSetSystem,
      setAccent,
    }}>
      {children}
    </DesignSystemCtx.Provider>
  );
}

export function useDesignSystem(): Ctx {
  const ctx = useContext(DesignSystemCtx);
  if (!ctx) throw new Error('useDesignSystem must be used inside <DesignSystemProvider>');
  return ctx;
}
```

## Wire at the root

```tsx
// main.tsx
import { createRoot } from 'react-dom/client';
import { DesignSystemProvider } from './DesignSystemProvider';
import './styles/design-system.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <DesignSystemProvider defaultSystem="editorial">
    <App />
  </DesignSystemProvider>
);
```

## Use anywhere

```tsx
// SystemPicker.tsx
import { useDesignSystem } from './DesignSystemProvider';
import { DESIGN_SYSTEMS } from './design-system';

export function SystemPicker() {
  const { system, setSystem } = useDesignSystem();
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {Object.entries(DESIGN_SYSTEMS).map(([id, def]) => (
        <button
          key={id}
          className="btn ghost"
          aria-pressed={system === id}
          onClick={() => setSystem(id as SystemId)}
        >
          {def.name}
        </button>
      ))}
    </div>
  );
}
```

## Reusable React components

Wrap classes in idiomatic React components. The classes are still the
source of truth — components are thin sugar.

```tsx
// Button.tsx
import { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'default' | 'ghost' | 'danger' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({
  variant = 'default',
  className = '',
  ...rest
}: ButtonProps) {
  const variantClass = variant === 'default' ? 'btn'
    : variant === 'icon' ? 'btn icon ghost'
    : `btn ${variant}`;
  return <button className={`${variantClass} ${className}`} {...rest} />;
}
```

```tsx
// Card.tsx
import { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLElement> {
  hoverable?: boolean;
  glow?: boolean;
  children: ReactNode;
}

export function Card({ hoverable, glow, className = '', children, ...rest }: CardProps) {
  const cls = ['card', hoverable && 'hoverable', glow && 'glow', className]
    .filter(Boolean).join(' ');
  return <article className={cls} {...rest}>{children}</article>;
}
```

```tsx
// Chip.tsx
type ChipKind = 'default' | 'accent' | 'ok' | 'warn' | 'bad' | 'muted';

export function Chip({ kind = 'default', children }: { kind?: ChipKind; children: ReactNode }) {
  const cls = kind === 'default' ? 'chip' : `chip ${kind}`;
  return <span className={cls}>{children}</span>;
}
```

```tsx
// Eyebrow.tsx
export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="eyebrow">── {children}</div>;
}
```

## Preventing the flash in CSR

In a pure-CSR React app, the provider applies the system in
`useEffect`, which runs after first paint. That's a flash.

Fix: drop a tiny inline script in `index.html` *before* React mounts:

```html
<!-- public/index.html -->
<script src="/design-system.js"></script>
<script>
  const sys = localStorage.getItem('ds-system') || 'editorial';
  const acc = localStorage.getItem('ds-accent')
            || window.SYSTEM_DEFAULT_ACCENT[sys];
  window.applyDesignSystem(sys, acc);
</script>
```

Now the system is applied before any React render. The provider's
`useEffect` reapplies the same values — no observable change.

For Next.js / SSR, see **[14-integration-nextjs](./14-integration-nextjs.md)**.

## Testing

```ts
// design-system.test.tsx
import { render, screen } from '@testing-library/react';
import { DesignSystemProvider } from './DesignSystemProvider';

test('applies data-system attribute', () => {
  render(
    <DesignSystemProvider defaultSystem="terminal">
      <div data-testid="x">x</div>
    </DesignSystemProvider>
  );
  expect(document.documentElement.getAttribute('data-system'))
    .toBe('terminal');
});
```

## Performance notes

- `applyDesignSystem` mutates `:root` style. React doesn't re-render on
  CSS variable changes — only browser repaint. So switching systems is
  basically free in React terms.
- Avoid running the apply in render. Always wrap in `useEffect`.
- Memoize accent palette lookups if you render 100+ swatches.

---

**Next:** **[14 · Integration: Next.js →](./14-integration-nextjs.md)**

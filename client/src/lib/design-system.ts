/* ---------------------------------------------------------------------
   AWESOME.VIDEO DESIGN SYSTEM — RUNTIME APPLIER
   Five systems × ten accents (Editorial / Terminal / Geist / Brutalist /
   Swiss × Crimson / Magenta / Orange / Amber / Emerald / Matrix / Cyan /
   Violet / Lime / Rose). Default: Editorial + Crimson.

   Token application is CSS-driven: per-system + per-accent blocks live
   in client/src/styles/design-system.css under :root[data-system="..."]
   and :root[data-accent="..."] selectors. applyDesignSystem() therefore
   only needs to toggle the two attributes on <html> and persist the
   selection to localStorage — no inline style writes, no FOUC.

   THEME_FALLBACK_REGISTRY is the source of truth for the picker metadata,
   system accents, and first-visit defaults. The derived exports below keep
   the existing picker/runtime API stable, while Vite injects the same
   registry into the pre-paint boot script.
   --------------------------------------------------------------------- */

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

interface ThemeRegistryShape {
  defaultSystem: string;
  defaultAccent: string;
  systems: readonly (DesignSystem & {
    id: string;
    defaultAccent: string;
  })[];
  accents: readonly Accent[];
}

type ThemeRegistryWithKnownReferences<T extends ThemeRegistryShape> =
  Exclude<T['defaultSystem'], T['systems'][number]['id']> extends never
    ? Exclude<T['defaultAccent'], T['accents'][number]['id']> extends never
      ? Exclude<T['systems'][number]['defaultAccent'], T['accents'][number]['id']> extends never
        ? T
        : never
      : never
    : never;

function defineThemeFallbackRegistry<const T extends ThemeRegistryShape>(
  registry: T & ThemeRegistryWithKnownReferences<T>,
): T {
  return registry;
}

export const THEME_FALLBACK_REGISTRY = defineThemeFallbackRegistry({
  defaultSystem: 'editorial',
  defaultAccent: 'crimson',
  systems: [
    {
      id: 'editorial',
      name: 'Editorial',
      tag: 'Magazine · Fraunces',
      desc: 'Refined editorial — italic Fraunces drops, warm ink, generous leading.',
      defaultAccent: 'crimson',
    },
    {
      id: 'terminal',
      name: 'Terminal',
      tag: 'CRT · IBM Plex Mono',
      desc: 'Mono-first terminal — square edges, scanlines, blinking carets.',
      defaultAccent: 'matrix',
    },
    {
      id: 'geist',
      name: 'Geist',
      tag: 'Modern · Geist Sans',
      desc: 'Vercel-clean — neutral, soft 8px radii, quiet hover glow.',
      defaultAccent: 'cyan',
    },
    {
      id: 'brutalist',
      name: 'Brutalist',
      tag: 'Slab · Instrument Serif',
      desc: 'Concrete slab — hard 2px borders, offset shadows, monumental serif.',
      defaultAccent: 'amber',
    },
    {
      id: 'swiss',
      name: 'Swiss',
      tag: 'Grid · Manrope',
      desc: 'Tight Swiss grid — hairline rules, lining figures, clinical whitespace.',
      defaultAccent: 'orange',
    },
  ],
  accents: [
    // DS-OK: picker swatches mirror the enforced --accent token registry.
    { id: 'crimson', name: 'Crimson', primary: '#ff3d52', secondary: '#b84dff' },
    { id: 'magenta', name: 'Magenta', primary: '#ec4899', secondary: '#f472b6' },
    { id: 'orange',  name: 'Orange',  primary: '#ff7a3d', secondary: '#ffb84d' },
    { id: 'amber',   name: 'Amber',   primary: '#ffb84d', secondary: '#ffd86b' },
    { id: 'emerald', name: 'Emerald', primary: '#34d08c', secondary: '#5ee6b8' },
    // DS-OK: picker swatches mirror the enforced --accent token registry.
    { id: 'matrix',  name: 'Matrix',  primary: '#00ff88', secondary: '#39ff14' },
    { id: 'cyan',    name: 'Cyan',    primary: '#5eddf2', secondary: '#7dd3fc' },
    { id: 'violet',  name: 'Violet',  primary: '#9d4edd', secondary: '#c77dff' },
    { id: 'lime',    name: 'Lime',    primary: '#aaff00', secondary: '#00ff88' },
    { id: 'rose',    name: 'Rose',    primary: '#ff7a8a', secondary: '#ffb3c1' },
  ],
});

export type DesignSystemId = (typeof THEME_FALLBACK_REGISTRY.systems)[number]['id'];
export type AccentId = (typeof THEME_FALLBACK_REGISTRY.accents)[number]['id'];

export interface ProductProfile {
  name: string;
  defaultSystem: DesignSystemId | null;
  defaultAccent: AccentId | null;
  density: "comfortable" | "balanced" | "dense" | "document" | "compact";
}

export const PRODUCT_PROFILES = {
  "public-discovery": {
    name: "Public discovery",
    defaultSystem: "editorial",
    defaultAccent: "crimson",
    density: "comfortable",
  },
  "learning-workspace": {
    name: "Learning workspace",
    defaultSystem: "geist",
    defaultAccent: "cyan",
    density: "balanced",
  },
  "admin-operations": {
    name: "Admin operations",
    defaultSystem: "swiss",
    defaultAccent: "orange",
    density: "dense",
  },
  "standalone-exports": {
    name: "Standalone exports",
    defaultSystem: "editorial",
    defaultAccent: "crimson",
    density: "document",
  },
  "embedded-integrations": {
    name: "Embedded integrations",
    defaultSystem: null,
    defaultAccent: null,
    density: "compact",
  },
} as const satisfies Record<string, ProductProfile>;

export type ProductProfileId = keyof typeof PRODUCT_PROFILES;

const PRODUCT_PROFILE_ROUTE_PATTERNS = {
  admin: "^/admin(?:/|$)",
  learning:
    "^/(?:journeys|journey(?:/|$)|continue-learning|recommendations|bookmarks|favorites|profile|contributions|notifications|onboarding|settings(?:/|$)|account(?:/|$))",
} as const;

const ADMIN_PROFILE_PATH = new RegExp(PRODUCT_PROFILE_ROUTE_PATTERNS.admin);
const LEARNING_PROFILE_PATH = new RegExp(PRODUCT_PROFILE_ROUTE_PATTERNS.learning);

/** Classify every SPA route without changing the visitor's selected personality. */
export function resolveProductProfile(pathname: string): ProductProfileId {
  if (ADMIN_PROFILE_PATH.test(pathname)) return "admin-operations";
  if (LEARNING_PROFILE_PATH.test(pathname)) return "learning-workspace";
  return "public-discovery";
}

export function applyProductProfile(profileId: ProductProfileId): ProductProfileId {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-product-profile", profileId);
  }
  return profileId;
}

export const DESIGN_SYSTEMS: Record<DesignSystemId, DesignSystem> = Object.fromEntries(
  THEME_FALLBACK_REGISTRY.systems.map(({ id, name, tag, desc }) => [id, { name, tag, desc }]),
) as Record<DesignSystemId, DesignSystem>;

export const ACCENTS: Accent[] = THEME_FALLBACK_REGISTRY.accents.map((accent) => ({ ...accent }));

export const SYSTEM_DEFAULT_ACCENT: Record<DesignSystemId, AccentId> = Object.fromEntries(
  THEME_FALLBACK_REGISTRY.systems.map(({ id, defaultAccent }) => [id, defaultAccent]),
) as Record<DesignSystemId, AccentId>;

export const DEFAULT_SYSTEM = THEME_FALLBACK_REGISTRY.defaultSystem;
export const DEFAULT_ACCENT = THEME_FALLBACK_REGISTRY.defaultAccent;

/** Data injected by Vite into client/index.html before the first paint. */
export const THEME_BOOT_DATA = {
  systems: Object.keys(DESIGN_SYSTEMS),
  accents: ACCENTS.map(({ id }) => id),
  defaultSystem: DEFAULT_SYSTEM,
  defaultAccent: DEFAULT_ACCENT,
} as const;

export const PRODUCT_PROFILE_BOOT_DATA = {
  profiles: PRODUCT_PROFILES,
  routePatterns: PRODUCT_PROFILE_ROUTE_PATTERNS,
} as const;

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
export function isSystemId(id: string | null | undefined): id is DesignSystemId {
  // hasOwnProperty.call, not Object.hasOwn: this runs on the boot path, and
  // Object.hasOwn is ES2022 — Vite's default build target still includes
  // Safari 14, where it is undefined and would throw before anything renders.
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(DESIGN_SYSTEMS, id);
}

export function isAccentId(id: string | null | undefined): id is AccentId {
  return typeof id === 'string' && ACCENTS.some((accent) => accent.id === id);
}

/** The offered system this stored value means — DEFAULT_SYSTEM if it means none. */
export function resolveSystemId(id: string | null | undefined): DesignSystemId {
  return isSystemId(id) ? id : DEFAULT_SYSTEM;
}

/** The offered accent this stored value means, using the resolved system's natural fallback. */
export function resolveAccentId(
  id: string | null | undefined,
  systemId: string | null | undefined,
): AccentId {
  const resolvedSystem = resolveSystemId(systemId);
  return isAccentId(id)
    ? id
    : SYSTEM_DEFAULT_ACCENT[resolvedSystem] || DEFAULT_ACCENT;
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
  const resolvedAccent = resolveAccentId(accentId, resolvedSystem);

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

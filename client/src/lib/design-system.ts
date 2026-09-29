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

type ThemeRegistryIdsAreUnique<
  Entries extends readonly { id: string }[],
  Seen extends string = never,
> = Entries extends readonly [
  infer Head extends { id: string },
  ...infer Tail extends readonly { id: string }[],
]
  ? Head['id'] extends Seen
    ? never
    : ThemeRegistryIdsAreUnique<Tail, Seen | Head['id']>
  : unknown;

type ThemeRegistryWithUniqueIds<T extends ThemeRegistryShape> =
  ThemeRegistryIdsAreUnique<T['systems']> &
  ThemeRegistryIdsAreUnique<T['accents']>;

function defineThemeFallbackRegistry<const T extends ThemeRegistryShape>(
  registry: T & ThemeRegistryWithKnownReferences<T> & ThemeRegistryWithUniqueIds<T>,
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
  // A missing/invalid stored accent falls back to the resolved system's
  // natural accent (HANDOFF §5: `ds-accent || SYSTEM_DEFAULT_ACCENT[sys]`).
  systemDefaultAccent: SYSTEM_DEFAULT_ACCENT,
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

const SYSTEM_FONT_TOKENS = ['--font-display', '--font-body', '--font-mono'] as const;

/**
 * Warm the regular (400) face of every family the active system names.
 * The canonical Google Fonts request already ships those faces, but the
 * browser fetches a face only when text first renders in it; Editorial
 * headings render Fraunces at 500 only, so the 400 face stays unloaded and
 * `document.fonts.check('16px "Fraunces"')` reports the family as absent.
 * Loading the regular face on every apply keeps the family fully resident
 * for any 400-weight usage (blockquotes, previews) and makes the readiness
 * probe truthful. Fire-and-forget; a missing FontFaceSet is a no-op.
 */
function warmSystemFaces(root: HTMLElement): void {
  if (typeof document === 'undefined' || !document.fonts?.load) return;
  const styles = getComputedStyle(root);
  for (const token of SYSTEM_FONT_TOKENS) {
    const family = styles.getPropertyValue(token).split(',')[0].replace(/['"]/g, '').trim();
    if (!family) continue;
    void document.fonts.load(`16px "${family}"`).catch(() => undefined);
  }
}

/**
 * Chromium rebuilds every CSS-connected FontFace when the device metrics
 * change (full-page captures, DPR/zoom changes, some window resizes): the
 * new objects start "unloaded" and only faces that text re-shapes are
 * reloaded, so a warmed-but-unused face silently drops out of the set.
 * Re-warm on resize so the active system's faces stay resident across
 * those rebuilds. Installed once per document; the listener is passive and
 * the work is one style read plus already-cached font loads.
 */
let resizeRewarmInstalled = false;

function installResizeRewarm(root: HTMLElement): void {
  if (resizeRewarmInstalled || typeof window === 'undefined') return;
  resizeRewarmInstalled = true;
  window.addEventListener('resize', () => warmSystemFaces(root), { passive: true });
  installStylesheetRewarm(root);
}

/**
 * The same rebuild happens whenever a stylesheet joins the document after
 * boot: Chromium recreates the CSS-connected FontFaces and the warmed face is
 * "unloaded" again on any page whose text never shapes it. Clerk mounts its
 * own `<style>` about a second after first paint, so `/sign-in` lost the
 * Editorial 400 face the boot warm-up had just loaded. Two signals cover it:
 *
 * 1. A `<style>` / `<link rel="stylesheet">` insertion — the rebuild lands at
 *    the next style recalc, not at insertion time (CSS-in-JS inserts an empty
 *    `<style>` first and fills it via CSSOM), and that recalc can be delayed
 *    in a throttled or background document, so re-warm on a short timer
 *    ladder instead of trusting one animation frame.
 * 2. `FontFaceSet` `loadingdone` — after a rebuild the faces that visible text
 *    does use are reloaded and the set reports done; that is the rebuild's own
 *    signal, independent of timing. Our loads only fire it when they actually
 *    load something, so the listener settles once every face is resident.
 *
 * Every re-warm is a handful of cached `fonts.load()` calls; idempotent.
 */
const STYLESHEET_REWARM_LADDER_MS = [0, 50, 100, 200, 400, 800, 1600] as const;

function installStylesheetRewarm(root: HTMLElement): void {
  if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;
  const rewarm = () => warmSystemFaces(root);
  document.fonts?.addEventListener?.('loadingdone', rewarm);
  let pending = 0;
  const isStylesheetNode = (node: Node): boolean => {
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    const el = node as Element;
    return el.tagName === 'STYLE' || (el.tagName === 'LINK' && (el.getAttribute('rel') ?? '').includes('stylesheet'));
  };
  const observer = new MutationObserver((records) => {
    if (pending > 0) return;
    if (!records.some((record) => Array.from(record.addedNodes).some(isStylesheetNode))) return;
    pending = STYLESHEET_REWARM_LADDER_MS.length;
    for (const delay of STYLESHEET_REWARM_LADDER_MS) {
      setTimeout(() => {
        pending -= 1;
        rewarm();
      }, delay);
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

/**
 * Switching systems names families the current page has never shaped, so
 * their faces are still on the network when the switch lands: the first
 * frames render the fallback stack and `document.fonts.check` reports the
 * new family absent until the fetch completes. Warm the regular face of
 * every family in the shell's canonical Google Fonts request once the page
 * is idle after load — the CSS for all of them is already resident, this
 * only pulls the latin regular files (a few small woff2s) ahead of a switch,
 * and it never competes with first paint. The `<link>` is the single source
 * of truth for which families exist, so nothing here can drift from it.
 */
let idleFacePrewarmInstalled = false;

function familiesInCanonicalRequest(): string[] {
  const link = document.querySelector<HTMLLinkElement>('link[href*="fonts.googleapis.com/css2"]');
  if (!link) return [];
  try {
    return new URL(link.href).searchParams
      .getAll('family')
      .map((entry) => entry.split(':')[0].replace(/\+/g, ' ').trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function installIdleFacePrewarm(): void {
  if (idleFacePrewarmInstalled || typeof window === 'undefined' || !document.fonts?.load) return;
  idleFacePrewarmInstalled = true;
  const warmAll = () => {
    for (const family of familiesInCanonicalRequest()) {
      void document.fonts.load(`16px "${family}"`).catch(() => undefined);
    }
  };
  const whenIdle = () => {
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(warmAll, { timeout: 4000 });
    else setTimeout(warmAll, 2000);
  };
  if (document.readyState === 'complete') whenIdle();
  else window.addEventListener('load', whenIdle, { once: true });
}

export function applyDesignSystem(systemId: string, accentId: string): { system: string; accent: string } {
  const resolvedSystem = resolveSystemId(systemId);
  const resolvedAccent = resolveAccentId(accentId, resolvedSystem);

  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.setAttribute('data-system', resolvedSystem);
    root.setAttribute('data-accent', resolvedAccent);
    warmSystemFaces(root);
    installResizeRewarm(root);
    installIdleFacePrewarm();
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

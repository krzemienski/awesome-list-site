/*
  Typed wrapper around the canonical design-system runtime.

  The tables (DESIGN_SYSTEMS, ACCENTS, SYSTEM_DEFAULT_ACCENT, TYPE_SCALE,
  SPACE_SCALE) and the applier live in /ds/design-system.js, a verbatim copy of
  the design source that index.html loads synchronously before first paint.
  This module reads the window globals, adds types, and provides persistence.
  Boot-only id/default metadata is checked against the canonical tables by
  canonical-token-parity; app-owned accessible text corrections live here.

  Import-safe on the server: nothing here touches `window` at module load, and
  every reader falls back to an empty table when the globals don't exist.
*/

export type SystemId = "editorial" | "terminal" | "geist" | "brutalist" | "swiss";
export type AccentId =
  | "crimson" | "magenta" | "orange" | "amber" | "emerald"
  | "matrix" | "cyan" | "violet" | "lime" | "rose";

/** Kept for existing importers; identical to SystemId. */
export type DesignSystemId = SystemId;

export interface DesignSystem {
  name: string;
  tag: string;
  desc: string;
  vars: Record<string, string>;
}

export interface Accent {
  id: AccentId;
  name: string;
  primary: string;
  secondary: string;
}

interface TypeScaleEntry {
  name: string;
  px: number;
  label: string;
  use: string;
}

interface SpaceScaleEntry {
  name: string;
  px: number;
}

// Optional: /ds/design-system.js may fail to load, and none of it exists on
// the server. Read them through the getters below, never directly.
declare global {
  interface Window {
    DESIGN_SYSTEMS?: Record<SystemId, DesignSystem>;
    ACCENTS?: Accent[];
    SYSTEM_DEFAULT_ACCENT?: Record<SystemId, AccentId>;
    TYPE_SCALE?: TypeScaleEntry[];
    SPACE_SCALE?: SpaceScaleEntry[];
    applyDesignSystem?: (systemId: SystemId, accentId: AccentId) => void;
  }
}

const SYSTEM_STORAGE_KEY = "ds-system";
const ACCENT_STORAGE_KEY = "ds-accent";

/** The applier's own fallbacks (docs/05: editorial, then ACCENTS[0] = crimson). */
export const DEFAULT_SYSTEM: SystemId = "editorial";
export const DEFAULT_ACCENT: AccentId = "crimson";

/**
 * Data injected by Vite into client/index.html (__AWESOME_VIDEO_THEME_BOOT__)
 * so the pre-paint boot reads the same storage keys and fallback system as
 * this module instead of restating them.
 */
export const THEME_BOOT_DATA = {
  systemKey: SYSTEM_STORAGE_KEY,
  accentKey: ACCENT_STORAGE_KEY,
  defaultSystem: DEFAULT_SYSTEM,
  systemIds: ["editorial", "terminal", "geist", "brutalist", "swiss"],
  accentIds: ["crimson", "magenta", "orange", "amber", "emerald", "matrix", "cyan", "violet", "lime", "rose"],
  defaultAccents: { editorial: "crimson", terminal: "matrix", geist: "cyan", brutalist: "amber", swiss: "orange" },
  // Minimum hundredth alpha for >=4.6:1 across bg, bg-2 and all three
  // surfaces composited on bg-2 (the lightest backing). Surface-3 is the
  // limiting surface: editorial 4.6728, terminal 4.6253, geist 4.7085,
  // brutalist 4.6763, swiss 4.7518. One hundredth lower fails each.
  // RGB is unchanged from each canonical system; --text-4 is untouched.
  text3Corrections: {
    // DS-OK: app-owned AA token corrections; canonical-token-parity recomputes contrast and minimal alpha.
    editorial: "rgba(244,243,238,0.49)",
    terminal: "rgba(232,232,224,0.51)",
    geist: "rgba(250,250,250,0.49)",
    brutalist: "rgba(245,245,240,0.50)",
    swiss: "rgba(250,250,248,0.48)",
  },
} as const;

const hasWindow = () => typeof window !== "undefined";

const NO_SYSTEMS = Object.freeze({}) as Record<SystemId, DesignSystem>;
const NO_ACCENTS: Accent[] = [];
const NO_DEFAULTS = Object.freeze({}) as Record<SystemId, AccentId>;

export function getDesignSystems(): Record<SystemId, DesignSystem> {
  return (hasWindow() ? window.DESIGN_SYSTEMS : undefined) ?? NO_SYSTEMS;
}

export function getAccents(): Accent[] {
  return (hasWindow() ? window.ACCENTS : undefined) ?? NO_ACCENTS;
}

export function getSystemDefaultAccents(): Record<SystemId, AccentId> {
  return (hasWindow() ? window.SYSTEM_DEFAULT_ACCENT : undefined) ?? NO_DEFAULTS;
}

/** Own-property test: a stored `ds-system` is arbitrary text ('toString', '__proto__'…). */
export function isSystemId(id: string | null | undefined): id is SystemId {
  return typeof id === "string" && Object.prototype.hasOwnProperty.call(getDesignSystems(), id);
}

export function isAccentId(id: string | null | undefined): id is AccentId {
  return typeof id === "string" && getAccents().some((accent) => accent.id === id);
}

export function resolveSystemId(id: string | null | undefined): SystemId {
  return isSystemId(id) ? id : DEFAULT_SYSTEM;
}

/** A system's natural accent (terminal→matrix, geist→cyan…). */
export function getSystemDefaultAccent(systemId: string | null | undefined): AccentId {
  return getSystemDefaultAccents()[resolveSystemId(systemId)] ?? DEFAULT_ACCENT;
}

export function resolveAccentId(
  id: string | null | undefined,
  systemId: string | null | undefined,
): AccentId {
  return isAccentId(id) ? id : getSystemDefaultAccent(systemId);
}

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode, quota) — the switch still applies */
  }
}

/** The system + accent currently on <html>, as set by the boot script or the applier. */
export function readAppliedTheme(): { system: SystemId; accent: AccentId } {
  if (typeof document === "undefined") return { system: DEFAULT_SYSTEM, accent: DEFAULT_ACCENT };
  const root = document.documentElement;
  const system = resolveSystemId(root.getAttribute("data-system"));
  return { system, accent: resolveAccentId(root.getAttribute("data-accent"), system) };
}

/**
 * Switch personality (docs/05 "Smart accent defaults"): the accent follows the
 * system's natural default only when the visitor never moved off the previous
 * system's natural default; an explicitly chosen accent survives the switch.
 */
export function selectSystem(id: string): { system: SystemId; accent: AccentId } | null {
  if (!hasWindow() || !isSystemId(id) || typeof window.applyDesignSystem !== "function") return null;
  const defaults = getSystemDefaultAccents();
  const storedAccent = readStored(ACCENT_STORAGE_KEY);
  const previousSystem = readStored(SYSTEM_STORAGE_KEY) ?? readAppliedTheme().system;
  const previousNatural = defaults[resolveSystemId(previousSystem)];

  let accent: AccentId;
  if (isAccentId(storedAccent) && storedAccent !== previousNatural) accent = storedAccent;
  else accent = defaults[id] ?? DEFAULT_ACCENT;

  writeStored(SYSTEM_STORAGE_KEY, id);
  writeStored(ACCENT_STORAGE_KEY, accent);
  window.applyDesignSystem(id, accent);
  return { system: id, accent };
}

/** Change the accent on the current system and persist it. */
export function setAccent(id: string): { system: SystemId; accent: AccentId } | null {
  if (!hasWindow() || !isAccentId(id) || typeof window.applyDesignSystem !== "function") return null;
  const { system } = readAppliedTheme();
  writeStored(SYSTEM_STORAGE_KEY, system);
  writeStored(ACCENT_STORAGE_KEY, id);
  window.applyDesignSystem(system, id);
  return { system, accent: id };
}

/* ---------------------------------------------------------------------
   Product profiles — layout density hooks only. shared/styles/
   product-profiles.css keys off <html data-product-profile>; the profile
   no longer picks a default system (the visitor's saved system, or
   editorial, applies on every route).
   --------------------------------------------------------------------- */

export interface ProductProfile {
  name: string;
  density: "comfortable" | "balanced" | "dense" | "document" | "compact";
}

export const PRODUCT_PROFILES = {
  "public-discovery": {
    name: "Public discovery",
    density: "comfortable",
  },
  "learning-workspace": {
    name: "Learning workspace",
    density: "balanced",
  },
  "admin-operations": {
    name: "Admin operations",
    density: "dense",
  },
  "standalone-exports": {
    name: "Standalone exports",
    density: "document",
  },
  "embedded-integrations": {
    name: "Embedded integrations",
    density: "compact",
  },
} as const satisfies Record<string, ProductProfile>;

export type ProductProfileId = keyof typeof PRODUCT_PROFILES;

const PRODUCT_PROFILE_ROUTE_PATTERNS = {
  admin: "^/admin(?:/|$)",
  learning:
    "^/(?:journeys|journey(?:/|$)|continue-learning|recommendations|bookmarks|favorites|profile|contributions|notifications|onboarding|settings(?:/|$)|account(?:/|$))",
} as const;

/** Data injected by Vite into client/index.html for the pre-paint profile attribute. */
export const PRODUCT_PROFILE_BOOT_DATA = {
  routePatterns: PRODUCT_PROFILE_ROUTE_PATTERNS,
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

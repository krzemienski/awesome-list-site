/* =====================================================================
   CLERK APPEARANCE — DESIGN-SYSTEM TOKEN BRIDGE (task #376)

   Clerk's hosted widget paints from its own stylesheet, and its appearance
   API parses the colors it is given in JS to derive the hover / active /
   alpha ramps around them. A `var(--…)` reference therefore resolves to
   nothing inside it, which is why /sign-in and /sign-up used to carry a
   private literal ramp of their own: a different black, a different
   off-white, and a fixed red that ignored the accent the visitor picked at
   /settings/theme.

   Instead of hardcoding a second palette, the DS tokens are RESOLVED off
   <html> at runtime and handed to Clerk as plain hex strings. The browser
   itself does the parsing (a throwaway hidden span is the canonicaliser),
   so whatever notation a token is authored in is understood, and anything
   unparseable simply leaves that variable unset — Clerk then falls back to
   its own dark-theme default rather than to an off-system literal.

   The corner radius rides along the same way (task #404): it is a length
   rather than a color, so it skips the canonicaliser and is read straight
   off <html> — but it is still a DS token, not the 0px literal the widget
   used to be pinned to while every other surface on the site rounded.

   Re-resolving whenever data-system / data-accent flip on <html> keeps the
   auth screens tracking the visitor's selection like every other page.
   ===================================================================== */
import { useEffect, useMemo, useState } from "react";
import { dark } from "@clerk/themes";
import { brandMarkDataUri } from "@/lib/brand-mark";

/** Red / green / blue channels (0–255) plus alpha (0–1). */
type Channels = [number, number, number, number];

/** Matches the canonical color notation `getComputedStyle` hands back. */
const COMPUTED_COLOR = /^rgba?\(([^)]+)\)$/;

/** The backdrop the boot script paints on <html> before React starts, and
 *  the fallback a translucent token is composited onto. */
const BACKDROP: Channels = [0, 0, 0, 1];

/** DS tokens the auth screens need, keyed by the role they play there. */
const TOKENS = {
  accent: "--accent",
  background: "--bg",
  ink: "--text",
  mutedInk: "--text-3",
  border: "--border-strong",
  fieldSurface: "--surface",
} as const;

/** Roles Clerk re-tints with an alpha ramp of its OWN before painting.
 *
 *  Every hairline in the widget (card, divider, social buttons, and the field
 *  itself) is drawn as `colorBorder` at 3–11% — 28% on hover/focus. Handing
 *  that role a pre-composited value would dilute an already-dim near-black
 *  twice over and erase the border completely, so it is resolved at full
 *  opacity instead and Clerk's ramp lands it where the DS hairline sits. The
 *  token's own alpha is therefore intentionally dropped for this role — it is
 *  Clerk's ramp, not ours, that decides the weight. */
const RAMPED_ROLES = new Set<keyof typeof TOKENS>(["border"]);
export type DesignSystemPalette = Partial<Record<keyof typeof TOKENS, string>>;

/** DS corner radii, keyed by the surface they round. Task #404: these are
 *  LENGTHS, not colors — a custom property comes back from
 *  `getComputedStyle` as authored, so they are read straight off <html> and
 *  never touch the color canonicaliser above. */
const RADIUS_TOKENS = {
  /** Cards and other large surfaces (12px on the default system). */
  card: "--radius",
  /** Controls: buttons, inputs, OTP cells (8px on the default system). */
  control: "--radius-sm",
} as const;

type DesignSystemRadii = Partial<Record<keyof typeof RADIUS_TOKENS, string>>;

/** Everything the widget reads off <html>: the colors Clerk re-parses plus
 *  the corner radii it rounds with. */
type DesignSystemTokens = { palette: DesignSystemPalette; radii: DesignSystemRadii };

/** A plain, non-negative CSS length. Clerk does not hand `borderRadius`
 *  straight to CSS — it splits the value into number + unit and derives its
 *  own sm/lg/xl steps from it, so a `calc()`, a `clamp()` or a unitless
 *  number would come back out as `NaNpx`. Anything that is not a simple
 *  length therefore leaves the variable unset, exactly as an unparseable
 *  color does, and Clerk keeps its own default. */
const CSS_LENGTH = /^(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em)$/;

/** Parses any CSS color notation by handing it to the browser: the CSSOM
 *  silently drops a value it cannot parse, so an empty `style.color`
 *  afterwards is the "not a color" signal. */
function parseColor(probe: HTMLElement, value: string): Channels | null {
  if (!value) return null;
  probe.style.color = "";
  probe.style.color = value;
  if (!probe.style.color) return null;

  const computed = window.getComputedStyle(probe).color;
  const match = COMPUTED_COLOR.exec(computed);
  // Wide-gamut notations (a token composed with color-mix, say) come back in
  // a form with no 8-bit channels to read. Leave the variable unset.
  if (!match) return null;

  const parts = match[1].split(",").map((part) => Number.parseFloat(part.trim()));
  if (parts.length < 3 || parts.slice(0, 3).some((n) => !Number.isFinite(n))) return null;
  const alpha = parts.length > 3 && Number.isFinite(parts[3]) ? parts[3] : 1;
  return [parts[0], parts[1], parts[2], alpha];
}

function toHex(channels: Channels, backdrop: Channels): string {
  // Several DS tokens are translucent ink over the page background. Clerk
  // paints them on its own card and derives further ramps from them, so they
  // have to be pre-composited or they land at a different lightness than the
  // same token does on the rest of the site.
  const alpha = Math.min(Math.max(channels[3], 0), 1);
  const pair = (index: 0 | 1 | 2) => {
    const mixed = Math.round(channels[index] * alpha + backdrop[index] * (1 - alpha));
    return Math.min(255, Math.max(0, mixed)).toString(16).padStart(2, "0");
  };
  return `#${pair(0)}${pair(1)}${pair(2)}`;
}

/** Reads the active DS tokens off <html>. Returns only the roles that
 *  resolved, so a missing token never overwrites a Clerk default with
 *  `undefined`. */
function resolveDesignSystemTokens(): DesignSystemTokens {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return { palette: {}, radii: {} };
  }

  const root = document.documentElement;
  const probe = document.createElement("span");
  probe.setAttribute("aria-hidden", "true");
  probe.style.display = "none";
  (document.body ?? root).appendChild(probe);

  try {
    const tokens = window.getComputedStyle(root);
    const read = (token: string) => parseColor(probe, tokens.getPropertyValue(token).trim());

    const background = read(TOKENS.background);
    const backdrop: Channels = background
      ? [background[0], background[1], background[2], 1]
      : BACKDROP;

    const palette: DesignSystemPalette = {};
    for (const [role, token] of Object.entries(TOKENS) as [keyof typeof TOKENS, string][]) {
      const channels = read(token);
      if (!channels) continue;
      palette[role] = RAMPED_ROLES.has(role)
        ? toHex([channels[0], channels[1], channels[2], 1], backdrop)
        : toHex(channels, backdrop);
    }

    const radii: DesignSystemRadii = {};
    for (const [surface, token] of Object.entries(RADIUS_TOKENS) as [
      keyof typeof RADIUS_TOKENS,
      string,
    ][]) {
      const length = tokens.getPropertyValue(token).trim();
      if (CSS_LENGTH.test(length)) radii[surface] = length;
    }

    return { palette, radii };
  } finally {
    probe.remove();
  }
}

function sameTokens(a: DesignSystemTokens, b: DesignSystemTokens): boolean {
  return (
    (Object.keys(TOKENS) as (keyof typeof TOKENS)[]).every(
      (role) => a.palette[role] === b.palette[role],
    ) &&
    (Object.keys(RADIUS_TOKENS) as (keyof typeof RADIUS_TOKENS)[]).every(
      (surface) => a.radii[surface] === b.radii[surface],
    )
  );
}

/** Builds the Clerk appearance object from resolved DS tokens. Clerk's
 *  `dark` base theme supplies everything not listed here (including the
 *  on-accent ink, which it already keeps at black — the same choice the DS
 *  makes for accent CTAs). */
function buildClerkAppearance({ palette, radii }: DesignSystemTokens, basePath: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  // The card's mark is an IMAGE URL to Clerk, not a node, so it cannot follow
  // var(--accent) the way <BrandMark> does in the site header — which is why
  // it used to be the only crimson thing left on a Matrix or Violet card.
  // Serialise the same geometry with the resolved accent baked in. The static
  // brand file (locked to Editorial+Crimson, and still the browser-tab
  // favicon) stays the fallback for when the accent token does not resolve.
  const logoImageUrl =
    (palette.accent ? brandMarkDataUri(palette.accent) : null) ??
    `${origin}${basePath}/favicon.svg`;

  return {
    theme: dark,
    options: {
      logoPlacement: "inside" as const,
      logoLinkUrl: basePath || "/",
      logoImageUrl,
    },
    variables: {
      ...(palette.accent ? { colorPrimary: palette.accent } : {}),
      ...(palette.background ? { colorBackground: palette.background } : {}),
      ...(palette.ink ? { colorForeground: palette.ink } : {}),
      ...(palette.mutedInk ? { colorMutedForeground: palette.mutedInk } : {}),
      // Task #390: the dark base theme fills every input with a mid-grey of its
      // own (~15% lightness), which reads as a lighter patch stuck onto the
      // true-black card. The DS paints text fields as the surface token over
      // the page background with a hairline border — hand Clerk those instead.
      // The placeholder is colorMutedForeground (already the --text-3 ink) and
      // keyboard focus is the global 2px accent outline in design-system.css,
      // so both stay on-system for free once the field itself is.
      ...(palette.fieldSurface ? { colorInput: palette.fieldSurface } : {}),
      ...(palette.ink ? { colorInputForeground: palette.ink } : {}),
      ...(palette.border ? { colorBorder: palette.border } : {}),
      // Task #404: the widget used to be pinned to square corners while every
      // other surface on the site rounds with the active system. Clerk derives
      // its whole radius ladder from this one base, so it gets the DS CONTROL
      // radius (buttons, inputs, OTP cells sit at the same step as the rest of
      // the app's controls) and the card is pinned separately below — Clerk's
      // own card step is a multiple of the base, which would overshoot the DS
      // card token. Terminal and Brutalist author 0px, so they stay square.
      ...(radii.control ? { borderRadius: radii.control } : {}),
    },
    elements: {
      // Task #404: Clerk rounds the card at TWICE the base above (its own
      // ladder step), which overshoots the DS card token — 16px against the
      // 12px every other card on the page sits at. `cardBox` is the outer,
      // clipping surface (it wraps the card and the sign-up footer strip), so
      // it is the corner a visitor actually sees; pin it to the card token and
      // let Clerk's slightly tighter inner step nest inside it as designed.
      ...(radii.card ? { cardBox: { borderRadius: radii.card } } : {}),
      // OAuth provider marks default to dark ink. Keep the dark card
      // treatment, but invert those marks so Apple, GitHub, and other
      // monochrome providers remain visible against their near-black buttons.
      // (No borderColor here: Clerk draws these buttons at border-width 0 and
      // rings them from `colorBorder`, which task #390 now maps, so a
      // per-element override would only be a dormant second source of truth.)
      socialButtonsBlockButton: {
        ...(palette.ink ? { color: palette.ink } : {}),
        minHeight: "40px",
      },
      socialButtonsBlockButtonText: {
        ...(palette.ink ? { color: palette.ink } : {}),
      },
      socialButtonsProviderIcon: {
        filter: "brightness(0) invert(1)",
      },
      // Clerk's default control height renders ~32px, below the 40px touch
      // minimum the rest of the app holds to. Raise the interactive surfaces
      // (submit, inputs, OTP cells, and the footer sign-up/sign-in switch)
      // without altering the branded look.
      formButtonPrimary: {
        minHeight: "40px",
      },
      formFieldInput: {
        minHeight: "40px",
      },
      otpCodeFieldInput: {
        minHeight: "40px",
        minWidth: "40px",
      },
      footerActionLink: {
        display: "inline-flex",
        alignItems: "center",
        minHeight: "40px",
      },
      identityPreviewEditButton: {
        minHeight: "40px",
        minWidth: "40px",
      },
    },
  };
}

/** Clerk appearance that follows the active design system.
 *
 *  The <html> attributes are watched directly rather than reading
 *  ThemeProvider: ClerkProvider is mounted ABOVE that provider, and the
 *  attributes are the real source of truth anyway — the pre-paint boot
 *  script in index.html sets them before React exists. */
export function useClerkAppearance(basePath: string) {
  const [tokens, setTokens] = useState<DesignSystemTokens>(() => resolveDesignSystemTokens());

  useEffect(() => {
    const sync = () => {
      const next = resolveDesignSystemTokens();
      setTokens((prev) => (sameTokens(prev, next) ? prev : next));
    };

    // The dev server injects stylesheets from JS, so the first render can
    // resolve before the DS tokens exist. Re-read once on mount.
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-system", "data-accent"],
    });
    return () => observer.disconnect();
  }, []);

  // Identity has to stay stable across unrelated re-renders: ClerkProvider
  // pushes the appearance into the widget from an effect keyed on this object.
  return useMemo(() => buildClerkAppearance(tokens, basePath), [tokens, basePath]);
}

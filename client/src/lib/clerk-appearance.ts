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
} as const;

export type DesignSystemPalette = Partial<Record<keyof typeof TOKENS, string>>;

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
function resolveDesignSystemPalette(): DesignSystemPalette {
  if (typeof document === "undefined" || typeof window === "undefined") return {};

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
      if (channels) palette[role] = toHex(channels, backdrop);
    }
    return palette;
  } finally {
    probe.remove();
  }
}

function samePalette(a: DesignSystemPalette, b: DesignSystemPalette): boolean {
  return (Object.keys(TOKENS) as (keyof typeof TOKENS)[]).every((role) => a[role] === b[role]);
}

/** Builds the Clerk appearance object from a resolved DS palette. Clerk's
 *  `dark` base theme supplies everything not listed here (including the
 *  on-accent ink, which it already keeps at black — the same choice the DS
 *  makes for accent CTAs). */
function buildClerkAppearance(palette: DesignSystemPalette, basePath: string) {
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
      borderRadius: "0px",
    },
    elements: {
      // OAuth provider marks default to dark ink. Keep the dark card
      // treatment, but invert those marks so Apple, GitHub, and other
      // monochrome providers remain visible against their near-black buttons.
      socialButtonsBlockButton: {
        ...(palette.ink ? { color: palette.ink } : {}),
        ...(palette.border ? { borderColor: palette.border } : {}),
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
  const [palette, setPalette] = useState<DesignSystemPalette>(() => resolveDesignSystemPalette());

  useEffect(() => {
    const sync = () => {
      const next = resolveDesignSystemPalette();
      setPalette((prev) => (samePalette(prev, next) ? prev : next));
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
  return useMemo(() => buildClerkAppearance(palette, basePath), [palette, basePath]);
}

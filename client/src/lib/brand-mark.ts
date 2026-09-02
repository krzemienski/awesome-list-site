/* =====================================================================
   BRAND MARK GEOMETRY — ONE COPY, TWO RENDERERS (task #389)

   The awesome.video mark ("Inverted Monogram") has to be painted two
   different ways inside the app:
     · <BrandMark> renders it inline as JSX, so its border and glyphs can
       reference var(--accent) and repaint the moment the visitor changes
       design system or accent at /settings/theme.
     · Clerk's auth card takes an image URL, not a node — a var() reference
       resolves to nothing inside a standalone SVG document — so the same
       mark has to be serialised with the RESOLVED accent baked in.

   Both read the geometry from here. Hand-copying the paths a second time is
   exactly how the auth-card mark ended up frozen at crimson while the header
   mark tracked the accent.

   Geometry is a 1:1 mirror of the generated asset
   brand/logo/svg/mark-small.svg (black rx16 tile, 5-unit border, outlined
   "AV" glyph paths). Never edit the generated brand outputs — if the mark
   changes, regenerate the brand kit via scripts/brand/build-brand-assets.mjs
   and re-mirror the paths here.

   NOT the browser-tab favicon: that stays client/public/favicon.svg, the
   official Editorial+Crimson brand file, which is also the fallback for when
   the accent token cannot be resolved.
   ===================================================================== */

export const BRAND_MARK_VIEWBOX = "0 0 76 76";

/** The rounded tile the monogram sits on. Its stroke carries the accent. */
export const BRAND_MARK_TILE = {
  x: 2.5,
  y: 2.5,
  width: 71,
  height: 71,
  rx: 16,
  strokeWidth: 5,
} as const;

/* DS-OK — divergence from the exported brand kit (intentional, MR-DS-13):
   the exported assets are locked to Editorial+Crimson; in-app chrome is a
   product surface, so border + glyphs track the active accent while the tile
   fill stays literal black (all five runtime skins are dark). On the default
   Editorial+Crimson skin this renders the exact official mark. */
export const BRAND_MARK_TILE_FILL = "#000000"; // DS-OK: fixed brand paint

/** The outlined "A" and "V" glyphs, in the accent. */
export const BRAND_MARK_GLYPHS = [
  {
    transform: "translate(12.34 51.00) scale(0.016602 -0.016602)",
    d: "M439 0L47 0L544 1490L1017 1490L1529 0L1133 0L926 651Q876 814 829.500 997.500Q783 1181 736 1378L815 1378Q770 1180 728 996.500Q686 813 639 651ZM1192 317L385 317L385 587L1192 587Z",
  },
  {
    transform: "translate(37.50 51.00) scale(0.016602 -0.016602)",
    d: "M1031 0L559 0L47 1490L444 1490L651 839Q700 677 745.500 499Q791 321 837 124L760 124Q805 322 848 499.500Q891 677 938 839L1137 1490L1529 1490Z",
  },
] as const;

/** `#rgb` … `#rrggbbaa`. The accent arrives already resolved to a hex string,
 *  and it is interpolated straight into markup, so anything else is refused
 *  rather than serialised. */
const HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/;

/**
 * The mark as a `data:` URI, with `accent` baked in, for surfaces that can
 * only take an image URL. Returns null when `accent` is not a plain hex
 * color, so the caller can fall back to the static brand file instead of
 * emitting broken markup.
 */
export function brandMarkDataUri(accent: string): string | null {
  if (!HEX_COLOR.test(accent)) return null;

  const { x, y, width, height, rx, strokeWidth } = BRAND_MARK_TILE;
  const glyphs = BRAND_MARK_GLYPHS.map(
    (glyph) => `<path transform="${glyph.transform}" d="${glyph.d}"/>`,
  ).join("");

  const markup =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${BRAND_MARK_VIEWBOX}">` +
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}" ` +
    `fill="${BRAND_MARK_TILE_FILL}" stroke="${accent}" stroke-width="${strokeWidth}"/>` +
    `<g fill="${accent}">${glyphs}</g>` +
    `</svg>`;

  // Percent-encoded rather than base64: the payload stays readable in
  // devtools, and encodeURIComponent escapes the `#` that would otherwise
  // truncate the URI at the first accent color.
  return `data:image/svg+xml,${encodeURIComponent(markup)}`;
}

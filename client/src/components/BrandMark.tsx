/**
 * Official awesome.video brand mark ("Inverted Monogram"), rendered inline so
 * chrome usage can track the active design-system accent via var(--accent).
 *
 * Geometry comes from @/lib/brand-mark, which is also what the Clerk auth card
 * serialises into an accent-colored data URI (task #389) — the two surfaces
 * share one copy of the path data so they cannot drift apart.
 */
import {
  BRAND_MARK_GLYPHS,
  BRAND_MARK_TILE,
  BRAND_MARK_TILE_FILL,
  BRAND_MARK_VIEWBOX,
} from "@/lib/brand-mark";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox={BRAND_MARK_VIEWBOX}
      className={className}
      aria-hidden="true"
      focusable="false"
      data-testid="brand-mark"
    >
      {/* The tile fill is fixed brand paint (see BRAND_MARK_TILE_FILL); the
          border and glyphs track var(--accent). */}
      <rect
        fill={BRAND_MARK_TILE_FILL}
        x={BRAND_MARK_TILE.x}
        y={BRAND_MARK_TILE.y}
        width={BRAND_MARK_TILE.width}
        height={BRAND_MARK_TILE.height}
        rx={BRAND_MARK_TILE.rx}
        stroke="var(--accent)"
        strokeWidth={BRAND_MARK_TILE.strokeWidth}
      />
      <g fill="var(--accent)">
        {BRAND_MARK_GLYPHS.map((glyph) => (
          <path key={glyph.transform} transform={glyph.transform} d={glyph.d} />
        ))}
      </g>
    </svg>
  );
}

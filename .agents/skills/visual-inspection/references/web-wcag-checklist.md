# Web Visual Inspection — WCAG 2.2 & Responsive Checklist

Platform-specific checks supplementing the universal checklist in SKILL.md.

## Color Contrast (WCAG 2.2 AA)

| Check | Rule | Tool |
|-------|------|------|
| Normal text | 4.5:1 contrast ratio (text <18pt or <14pt bold) | WebAIM Contrast Checker |
| Large text | 3:1 contrast ratio (text ≥18pt or ≥14pt bold) | DevTools color picker |
| UI components | 3:1 for borders, icons, form controls against background | Manual inspection |
| Focus indicators | 3:1 contrast for focus ring against adjacent colors | Tab through elements |
| Disabled elements | No contrast requirement, but must look intentionally disabled | Visual inspection |
| Placeholder text | 4.5:1 — placeholders are NOT exempt from contrast rules | Common violation |

## Touch/Click Targets (WCAG 2.5.8)

| Check | Rule | Common Violation |
|-------|------|-----------------|
| Minimum size | 24x24 CSS px target size (WCAG 2.2 AA) | Tiny icon buttons at 16x16 |
| Recommended size | 44x44 CSS px (Apple HIG / best practice) | Links with no padding |
| Target spacing | 8px min between adjacent targets | Navigation links touching |
| Inline exceptions | Inline text links exempt from size requirement | N/A |
| Padding expansion | Use `padding` to expand clickable area beyond visual size | Icon-only buttons with no padding |

## Responsive Layout

| Viewport | Width | Check |
|----------|-------|-------|
| Mobile S | 320px | No horizontal scroll, all content reachable |
| Mobile M | 375px | Standard iPhone — primary mobile test |
| Tablet | 768px | Layout adapts (single → multi column) |
| Desktop | 1024px | Full layout with sidebars/panels |
| Wide | 1440px | Content doesn't stretch beyond readable width |

### Per-Viewport Checks
- [ ] No horizontal scrollbar at any viewport
- [ ] Text readable without zooming (16px min body)
- [ ] Navigation accessible (hamburger menu on mobile works)
- [ ] Images scale without overflow
- [ ] Tables scroll horizontally OR reflow to cards
- [ ] Modals/dialogs fit within viewport
- [ ] Fixed/sticky elements don't cover content

## Typography

| Check | Rule | Common Violation |
|-------|------|-----------------|
| Body text | Min 16px (1rem) on mobile | 12px or 14px body text |
| Line height | 1.5-1.75 for body text | Line height 1.0 or 1.2 |
| Line length | 65-75 characters max per line | Full-width text at 1440px |
| Heading hierarchy | h1 → h2 → h3 (no skipping levels) | h1 → h3 (missing h2) |
| Font loading | Text visible during web font load (FOUT over FOIT) | Blank text until font loads |
| Tabular numbers | Use `font-variant-numeric: tabular-nums` for data | Numbers misaligning in tables |

## Interactive States

| State | Required Visual Change | Common Violation |
|-------|----------------------|-----------------|
| Hover | Color/opacity/shadow change | No hover indication |
| Focus | Visible focus ring (2px+ outline, 3:1 contrast) | `outline: none` with no replacement |
| Active/Pressed | Visual depression or color shift | No active state |
| Disabled | Reduced opacity + `cursor: not-allowed` | Looks enabled but doesn't work |
| Loading | Spinner/skeleton + disabled interaction | Frozen UI, multiple clicks queue |
| Error | Red border + icon + text message near field | Only color change (inaccessible) |
| Selected | Background change + checkmark or bold | Only color difference |

## Dark Mode

| Check | Rule | Common Violation |
|-------|------|-----------------|
| CSS variables | Use semantic tokens (`--foreground`, `--background`) | Hardcoded hex values |
| Glass cards light mode | `bg-white/80` or higher opacity | `bg-white/10` (invisible) |
| Text contrast light | `slate-900` (#0F172A) for body text | `slate-400` (#94A3B8) too light |
| Muted text light | `slate-600` (#475569) minimum | `gray-400` or lighter |
| Border visibility | `border-gray-200` light / `border-gray-700` dark | `border-white/10` (invisible in light) |
| Both modes tested | Screenshot evidence in BOTH light and dark | Only tested in one mode |

## Forms

| Check | Rule | Common Violation |
|-------|------|-----------------|
| Labels | Every input has visible `<label>` with `for` attribute | Placeholder-only labels |
| Error messages | Inline, near the field, not just toast | Toast disappears before user reads it |
| Required fields | Marked with asterisk AND `aria-required` | Only visual asterisk |
| Autocomplete | `autocomplete` attribute on name/email/address fields | No autocomplete hints |
| Validation timing | On blur or submit, not on every keystroke | Errors while still typing |

## Navigation & Structure

| Check | Rule | Common Violation |
|-------|------|-----------------|
| Skip link | "Skip to content" link as first focusable element | No skip navigation |
| Landmark roles | `<main>`, `<nav>`, `<header>`, `<footer>` present | All `<div>` structure |
| Heading structure | Single `<h1>`, logical h2-h6 hierarchy | Multiple h1s, skipped levels |
| Tab order | Matches visual reading order (no positive `tabindex`) | `tabindex="5"` creating chaos |
| Keyboard navigation | All features accessible via keyboard alone | Mouse-only interactions |

## Images & Media

| Check | Rule | Common Violation |
|-------|------|-----------------|
| Alt text | Meaningful alt for content images, `alt=""` for decorative | Missing alt, generic "image" |
| SVG accessibility | `role="img"` + `aria-label` on meaningful SVGs | Unlabeled SVG icons |
| Lazy loading | `loading="lazy"` on below-fold images | All images eager-loaded |
| Aspect ratio | `aspect-ratio` or `width`/`height` to prevent CLS | Layout shift on image load |
| Video captions | Captions/subtitles for video content | No captions |

## Performance Visual Impact

| Check | What to Look For |
|-------|-----------------|
| Cumulative Layout Shift | Elements jumping as page loads (images, ads, fonts) |
| Content flash | White flash before dark mode applies |
| Skeleton screens | Loading state shows content shape, not blank space |
| Progressive loading | Above-fold content renders first |
| Font flash | Text invisible then suddenly appears (FOIT) |

## Evidence Capture

```javascript
// Playwright screenshot at multiple viewports
const viewports = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];
for (const vp of viewports) {
  await page.setViewportSize(vp);
  await page.screenshot({ path: `evidence/${vp.name}.png`, fullPage: true });
}

// Dark mode screenshot
await page.emulateMedia({ colorScheme: 'dark' });
await page.screenshot({ path: 'evidence/dark-mode.png', fullPage: true });
```

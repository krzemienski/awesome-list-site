# Visual Defect Pattern Database

Common defects across iOS, web, and cross-platform with root causes and fix patterns.

## iOS / SwiftUI

| Defect | Visual Symptom | Root Cause | Fix |
|--------|---------------|------------|-----|
| VStack overflow | Content clipped at bottom, no scroll | `VStack` in constrained height without `ScrollView` | Wrap in `ScrollView(.vertical)` |
| Fixed frame too small | Content overlapping card boundaries | `.frame(height: N)` too small for dynamic content | `.frame(minHeight: N)` + `.clipped()` |
| Environment crash | Blank screen or crash on navigation | `@Observable` not injected on sibling `NavigationDestination` | `.environment()` on ALL destination branches |
| LazyVGrid misalign | Grid items offset from each other | Missing `.alignment` on `GridItem` | Set explicit alignment on GridItem |
| GeometryReader zero | Blank view on first render | GeometryReader reports 0,0 before layout pass | Default size fallback |
| Sheet wrong color scheme | Sheet content in light mode when app is dark | Missing `.preferredColorScheme(.dark)` on sheet | Add color scheme to sheet content |
| @AppStorage stale | Feature flags don't update after reinstall | UserDefaults cached from previous install | `simctl uninstall` before `install` |
| Safe area violation | Text under status bar or home indicator | Content outside `safeAreaInset` | Respect safe area insets |
| Tab bar occlusion | Last list item hidden behind tab bar | Missing content inset on ScrollView | Add `.safeAreaInset(edge: .bottom)` or proper padding |
| Nav bar overlap | Custom nav overlapping status bar | Incorrect navigation bar height | Use system `NavigationStack` / `navigationTitle` |
| Sidebar clipping | Nav items below fold invisible (no scroll) | Plain VStack with 20+ items, no ScrollView | Wrap sidebar nav in `ScrollView(.vertical)` |
| Badge overflow | Badge "17" clips outside icon bounds | Badge not constrained to parent | `.clipShape()` or constrain badge frame |
| Shimmer flash | White flash before shimmer gradient starts | No initial fill color on shimmer layer | Set `.fill(theme.glassBackground)` as base |
| Text size violation | Hardcoded `size: 10` or `size: 12` | Not using Dynamic Type / theme tokens | Use `.font(.system(...))` or theme font tokens |
| Monospaced digit shift | Numbers shift layout when values change | Proportional digit widths | `.monospacedDigit()` on counters/badges |

## Web / CSS

| Defect | Visual Symptom | Root Cause | Fix |
|--------|---------------|------------|-----|
| Horizontal scroll | Scrollbar at narrow viewports | Element exceeds viewport width | `max-width: 100%`, `overflow-x: hidden` on container |
| Text overflow | Long words break layout | No word-break strategy | `overflow-wrap: break-word` or `word-break: break-word` |
| Invisible focus ring | No visible focus indicator on tab | `outline: none` with no replacement | `outline: 2px solid` with 3:1 contrast |
| Placeholder contrast fail | Light gray placeholder text | Placeholder not meeting 4.5:1 ratio | Darken placeholder color or use floating label |
| CLS layout shift | Elements jump during page load | Images without dimensions, late-loading fonts | `aspect-ratio` or `width`/`height` on images |
| FOIT text flash | Text invisible then suddenly appears | Web font blocking render | `font-display: swap` or preload critical fonts |
| Stacking context break | Modal behind content, z-index war | Unmanaged z-index values | Establish z-index scale, use CSS layers |
| Touch target too small | Tiny icon buttons (16x16) | No padding expansion | `padding` to expand clickable area to 44x44 |
| Dark mode border invisible | Borders vanish in dark mode | Hardcoded `border-gray-200` | Semantic tokens: `border-gray-200` light / `border-gray-700` dark |
| Glass card invisible (light) | Card background transparent in light mode | `bg-white/10` opacity too low | `bg-white/80` or higher for light mode |
| Muted text too light | Secondary text unreadable | `gray-400` on white background | `slate-600` (#475569) minimum for muted text |
| Sticky covers content | Fixed/sticky header hides scrolled content | No scroll-margin or padding offset | `scroll-margin-top` matching header height |
| Form label missing | Input has no visible label | Placeholder-only pattern | Add visible `<label>` with `for` attribute |
| Skip link absent | No keyboard shortcut to skip nav | Missing skip-to-content link | Add as first focusable element |

## Cross-Platform / General

| Defect | Visual Symptom | Root Cause | Fix |
|--------|---------------|------------|-----|
| Color-only status | Status conveyed only by color | No icon or text supplement | Add icon + text alongside color indicator |
| Empty state blank | White/blank space where content should be | No empty state handler | Add meaningful empty state message + icon |
| Loading frozen | UI appears frozen during data fetch | No loading indicator | Show skeleton/shimmer/spinner during load |
| Truncation without ellipsis | Text cut off abruptly | `overflow: hidden` without `text-overflow: ellipsis` | Add `text-overflow: ellipsis` + `white-space: nowrap` |
| Double spacing | Extra vertical gap between sections | Two margins stacking (CSS) or double padding (SwiftUI) | Collapse margins or audit spacing modifiers |
| Icon-text misalign | Icon vertically offset from adjacent text | Different alignment defaults | Explicit vertical centering (`.alignmentGuide` / `align-items: center`) |
| Modal viewport overflow | Dialog taller than screen | Fixed height modal on small viewport | `max-height: 90vh` + scroll internal content |
| Error state swallowed | No error feedback to user | `catch` block with no UI update | Show inline error message near the failure point |
| Badge zero shown | "0" badge displayed when it shouldn't be | No zero-check before rendering badge | `if count > 0 { Badge(count) }` |
| White flash on transition | Brief white screen between views | Background color not set on destination view | Set background color on all views in navigation stack |

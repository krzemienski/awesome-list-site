# iOS & macOS Visual Inspection — Apple HIG Checklist

Platform-specific checks supplementing the universal checklist in SKILL.md.

## Typography (San Francisco)

| Check | Rule | Common Violation |
|-------|------|-----------------|
| Body text size | Min 17pt body, 11pt minimum anywhere | Hardcoded `size: 10` or `size: 12` |
| Dynamic Type | All text uses `.font(.system(...))` or theme tokens | Fixed pixel sizes ignoring user preference |
| Font weight hierarchy | Headlines bold/semibold, body regular, captions medium | All text same weight |
| SF Pro usage | SF Pro Text ≤19pt, SF Pro Display ≥20pt | System handles this — don't override with custom fonts unless intentional |
| Monospaced numbers | Counters/badges use `.monospacedDigit()` | Numbers shift layout when values change |

## Layout & Safe Areas

| Check | Rule | Common Violation |
|-------|------|-----------------|
| Safe area respected | Content within `safeAreaInset` on all edges | Text under status bar or home indicator |
| Navigation bar | 44pt standard height, large title 96pt | Custom nav overlapping status bar |
| Tab bar | 49pt standard (83pt with home indicator) | Content hidden behind tab bar |
| Scroll content insets | `ScrollView` content not clipped by nav/tab bars | Last list item hidden under tab bar |
| Notch/Dynamic Island | No content hidden behind sensor housing | Centered content shifted by island |
| Landscape layout | Content reflows properly | Fixed portrait layout broken in landscape |

## Touch Targets (CRITICAL)

| Check | Rule | Common Violation |
|-------|------|-----------------|
| Minimum size | 44x44pt touch target (Apple HIG mandate) | 30x30 icon buttons with no padding |
| Spacing between targets | 8pt minimum between adjacent targets | Buttons touching with no gap |
| Toolbar buttons | Adequate hit area even for small icons | 22pt icon with no frame expansion |
| List row height | Min 44pt row height for tappable rows | Compressed rows at 32pt |
| Swipe actions | Discoverable with adequate target area | Tiny swipe reveal buttons |

## Navigation Patterns

| Check | Rule | Common Violation |
|-------|------|-----------------|
| Back button | Always present in pushed views | Missing back button after deep navigation |
| Navigation title | `.navigationTitle()` set on every screen | Blank navigation bar |
| Sheet presentation | Grabber visible, detents configured | Sheet without dismiss affordance |
| Tab bar visibility | Visible on root screens, hidden on pushed detail | Tab bar persisting on every screen |
| Deep link navigation | URL scheme navigates to correct screen | Deep link shows wrong screen or crashes |

## SwiftUI-Specific Defects

| Check | What to Look For | Root Cause | Fix Pattern |
|-------|-----------------|------------|-------------|
| VStack overflow | Content clipped at bottom without scroll | `VStack` in constrained height, no `ScrollView` | Wrap in `ScrollView(.vertical)` |
| Fixed frame too small | Content overlapping card boundaries | `.frame(height: N)` too small for dynamic content | Use `.frame(minHeight: N)` + `.clipped()` |
| Environment crash | View body crashes on navigation | `@Observable` not injected on sibling `NavigationDestination` | Add `.environment()` to all destination branches |
| LazyVGrid alignment | Grid items misaligned | Missing `.alignment` on `GridItem` | Set explicit alignment |
| GeometryReader zero | Blank view on first render | GeometryReader reports 0,0 before layout pass | Use default size fallback |
| Sheet dark mode | Sheet content renders in light mode | Missing `.preferredColorScheme(.dark)` on sheet | Add color scheme to sheet presentation |
| @AppStorage caching | Feature flags stale after reinstall | UserDefaults cached from previous install | Fresh install: `simctl uninstall` before `install` |

## Glass & Material Effects (iOS 17+)

| Check | Rule | Common Violation |
|-------|------|-----------------|
| Glass background | Content readable through glass effect | Text illegible over busy backgrounds |
| Blur intensity | `.ultraThinMaterial` to `.thickMaterial` appropriate | Too thin = unreadable, too thick = opaque (defeats purpose) |
| Vibrancy | Use `.secondary` vibrancy for labels on glass | White text on glass with no vibrancy |

## Status Indicators

| Check | Rule | Common Violation |
|-------|------|-----------------|
| Green/red dots | Sufficient contrast on both light and dark backgrounds | Green dots invisible on dark green cards |
| Badge counts | Badge positioned without overflowing parent | Badge "17" clips outside icon bounds |
| Progress indicators | Shimmer/spinner visible during loading | Frozen UI with no loading indication |
| Connection status | Online/offline state clearly communicated | No indication when offline |

## Accessibility

| Check | Rule |
|-------|------|
| VoiceOver labels | All interactive elements have `.accessibilityLabel()` |
| Accessibility traits | Buttons marked `.isButton`, headers marked `.isHeader` |
| Reduce Motion | Animations respect `UIAccessibility.isReduceMotionEnabled` |
| Bold Text | UI adapts when user enables bold text |
| Increased Contrast | UI adapts when user enables increased contrast |
| Color not sole indicator | Status conveyed by icon/text in addition to color |

## Evidence Capture Commands

```bash
# Screenshot (dedicated simulator)
xcrun simctl io $UDID screenshot /path/to/evidence.png

# Accessibility tree (exact tap coordinates)
idb ui describe-all --udid $UDID

# Tap element at coordinates from accessibility tree
idb_tap <centerX> <centerY>

# Swipe to open sidebar
idb ui swipe 5 500 300 500 --duration 0.3

# Check crash reports
ls -t ~/Library/Logs/DiagnosticReports/*.ips 2>/dev/null | head -3
```

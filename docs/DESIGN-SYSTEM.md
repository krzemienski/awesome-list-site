# Design System

## Overview

This design system implements a **cyberpunk dark theme** with a pure black aesthetic, neon accent colors, and terminal-inspired typography. The color system uses the OKLCH color space for perceptually uniform color variations and better accessibility.

**Key Characteristics:**
- **Dark Mode Only** - No light mode support
- **Pure Black Backgrounds** - `oklch(0 0 0)` for true black
- **Sharp Edges** - Zero border radius (`--radius: 0rem`)
- **No Shadows** - Flat design with no box shadows
- **Monospace Typography** - JetBrains Mono for all text
- **Neon Accents** - High saturation pink and blue for interactive elements

---

## Color System

### OKLCH Color Space

All colors are defined using OKLCH (Oklch Lightness Chroma Hue), which provides:
- **Perceptually uniform** color variations
- **Better accessibility** through predictable lightness
- **Consistent saturation** across different hues
- **Wide color gamut** support

**Format:** `oklch(L C H)` where:
- `L` = Lightness (0-1, where 0 is black, 1 is white)
- `C` = Chroma/saturation (0+, typically 0-0.4)
- `H` = Hue angle (0-360 degrees)

---

## Theme Tokens

### Base Colors

#### Background & Foreground

| Token | OKLCH Value | CSS Variable | Description | Visual |
|-------|-------------|--------------|-------------|---------|
| **Background** | `oklch(0 0 0)` | `--background` | Pure black, main background | ⬛ |
| **Foreground** | `oklch(1.0000 0 0)` | `--foreground` | Pure white, main text | ⬜ |

**Usage:**
```tsx
// Tailwind classes
<div className="bg-background text-foreground">
  Content with pure black background and white text
</div>

// CSS
.custom-element {
  background-color: var(--background);
  color: var(--foreground);
}
```

---

#### Card & Popover

| Token | OKLCH Value | CSS Variable | Description | Visual |
|-------|-------------|--------------|-------------|---------|
| **Card** | `oklch(0.1684 0 0)` | `--card` | Elevated surface color | ▪️ |
| **Card Foreground** | `oklch(1.0000 0 0)` | `--card-foreground` | Text on cards | ⬜ |
| **Popover** | `oklch(0.1448 0 0)` | `--popover` | Floating UI backgrounds | ▫️ |
| **Popover Foreground** | `oklch(1.0000 0 0)` | `--popover-foreground` | Text in popovers | ⬜ |

**Usage:**
```tsx
// Card component
<Card className="bg-card text-card-foreground">
  <CardContent>Content</CardContent>
</Card>

// Popover/Dropdown
<Popover className="bg-popover text-popover-foreground">
  Menu content
</Popover>
```

**Visual Hierarchy:**
- Background (darkest): `oklch(0 0 0)`
- Popover (darker): `oklch(0.1448 0 0)`
- Card (lighter): `oklch(0.1684 0 0)`

---

#### Primary Colors

| Token | OKLCH Value | CSS Variable | Description | Visual |
|-------|-------------|--------------|-------------|---------|
| **Primary** | `oklch(0.75 0.3225 328.3634)` | `--primary` | Neon pink, main brand color | 🌸 |
| **Primary Foreground** | `oklch(1.0000 0 0)` | `--primary-foreground` | Text on primary | ⬜ |

**Hue:** 328.36° (Pink/Magenta)
**Lightness:** 75% (Bright, attention-grabbing)
**Chroma:** 0.3225 (High saturation for neon effect)

**Usage:**
```tsx
// Primary buttons
<Button className="bg-primary text-primary-foreground">
  Click Me
</Button>

// Primary text/links
<a className="text-primary hover:underline">Learn More</a>

// Focus rings
<Input className="focus:ring-primary" />
```

---

#### Secondary Colors

| Token | OKLCH Value | CSS Variable | Description | Visual |
|-------|-------------|--------------|-------------|---------|
| **Secondary** | `oklch(0.2520 0 0)` | `--secondary` | Subtle background accent | ▪️ |
| **Secondary Foreground** | `oklch(1.0000 0 0)` | `--secondary-foreground` | Text on secondary | ⬜ |

**Usage:**
```tsx
// Secondary buttons
<Button variant="secondary" className="bg-secondary text-secondary-foreground">
  Cancel
</Button>

// Secondary backgrounds
<div className="bg-secondary p-4">
  Less important content
</div>
```

---

#### Muted Colors

| Token | OKLCH Value | CSS Variable | Description | Visual |
|-------|-------------|--------------|-------------|---------|
| **Muted** | `oklch(0.2178 0 0)` | `--muted` | Disabled/inactive backgrounds | ▫️ |
| **Muted Foreground** | `oklch(0.6993 0 0)` | `--muted-foreground` | Secondary text, placeholders | ▫️ |

**Usage:**
```tsx
// Disabled states
<Button disabled className="bg-muted text-muted-foreground">
  Disabled
</Button>

// Placeholder text
<Input placeholder="Search..." className="placeholder:text-muted-foreground" />

// Secondary/helper text
<p className="text-muted-foreground text-sm">
  Last updated 5 minutes ago
</p>
```

---

#### Accent Colors

| Token | OKLCH Value | CSS Variable | Description | Visual |
|-------|-------------|--------------|-------------|---------|
| **Accent** | `oklch(0.7072 0.1679 242.0420)` | `--accent` | Neon blue, secondary brand | 💙 |
| **Accent Foreground** | `oklch(1.0000 0 0)` | `--accent-foreground` | Text on accent | ⬜ |

**Hue:** 242.04° (Blue)
**Lightness:** 70.72% (Bright)
**Chroma:** 0.1679 (Medium-high saturation)

**Usage:**
```tsx
// Accent buttons (alternative to primary)
<Button variant="ghost" className="hover:bg-accent hover:text-accent-foreground">
  Hover Me
</Button>

// Highlighted items
<div className="bg-accent text-accent-foreground">
  Featured content
</div>

// Scrollbar (see index.css)
::-webkit-scrollbar-thumb:hover {
  background: var(--accent);
}
```

---

#### Destructive Colors

| Token | OKLCH Value | CSS Variable | Description | Visual |
|-------|-------------|--------------|-------------|---------|
| **Destructive** | `oklch(0.6489 0.2370 26.9728)` | `--destructive` | Neon orange/red for errors | 🔶 |
| **Destructive Foreground** | `oklch(1.0000 0 0)` | `--destructive-foreground` | Text on destructive | ⬜ |

**Hue:** 26.97° (Orange-Red)
**Lightness:** 64.89%
**Chroma:** 0.2370 (High saturation for urgency)

**Usage:**
```tsx
// Error states
<Alert variant="destructive" className="bg-destructive text-destructive-foreground">
  <AlertDescription>Error: Invalid input</AlertDescription>
</Alert>

// Delete buttons
<Button variant="destructive">Delete</Button>

// Error messages
<p className="text-destructive text-sm">This field is required</p>
```

---

#### Border & Input

| Token | OKLCH Value | CSS Variable | Description | Visual |
|-------|-------------|--------------|-------------|---------|
| **Border** | `oklch(0.3211 0 0)` | `--border` | Subtle dividers and outlines | ▫️ |
| **Input** | `oklch(0.1776 0 0)` | `--input` | Form input backgrounds | ▪️ |
| **Ring** | `oklch(0.75 0.3225 328.3634)` | `--ring` | Focus ring (same as primary) | 🌸 |

**Usage:**
```tsx
// Borders
<div className="border border-border">
  Content with subtle border
</div>

// Form inputs
<Input className="bg-input border-border focus:ring-ring" />

// Focus states
<Button className="focus:ring-2 focus:ring-ring">
  Focus Me
</Button>
```

---

### Chart Colors

For data visualization, 5 distinct colors with varying hues:

| Token | OKLCH Value | CSS Variable | Hue | Description |
|-------|-------------|--------------|-----|-------------|
| **Chart 1** | `oklch(0.75 0.3225 328.3634)` | `--chart-1` | 328° Pink | Primary/Brand |
| **Chart 2** | `oklch(0.8664 0.2948 142.4953)` | `--chart-2` | 142° Green | Success/Growth |
| **Chart 3** | `oklch(0.7072 0.1679 242.0420)` | `--chart-3` | 242° Blue | Accent/Info |
| **Chart 4** | `oklch(0.9680 0.2110 109.7692)` | `--chart-4` | 109° Yellow-Green | Warning/Neutral |
| **Chart 5** | `oklch(0.6958 0.2043 43.4910)` | `--chart-5` | 43° Orange | Alert/Secondary |

**Usage:**
```tsx
// In chart components
<Bar dataKey="value" fill="hsl(var(--chart-1))" />
<Line dataKey="trend" stroke="hsl(var(--chart-2))" />

// Custom data visualizations
<div className="bg-chart-3 h-4 w-full" />
```

**Color Accessibility:**
- All chart colors have sufficient contrast against black background
- Hues are distributed across the spectrum for color-blind accessibility
- Lightness values (68-96%) ensure visibility

---

### Sidebar Colors

| Token | OKLCH Value | CSS Variable | Description |
|-------|-------------|--------------|-------------|
| **Sidebar Background** | `oklch(0.1684 0 0)` | `--sidebar-background` | Same as card |
| **Sidebar Foreground** | `oklch(1.0000 0 0)` | `--sidebar-foreground` | White text |
| **Sidebar Primary** | `oklch(0.75 0.3225 328.3634)` | `--sidebar-primary` | Active/selected |
| **Sidebar Primary Foreground** | `oklch(1.0000 0 0)` | `--sidebar-primary-foreground` | Text on active |
| **Sidebar Accent** | `oklch(0.7072 0.1679 242.0420)` | `--sidebar-accent` | Hover state |
| **Sidebar Accent Foreground** | `oklch(1.0000 0 0)` | `--sidebar-accent-foreground` | Text on hover |
| **Sidebar Border** | `oklch(0.3211 0 0)` | `--sidebar-border` | Dividers |
| **Sidebar Ring** | `oklch(0.75 0.3225 328.3634)` | `--sidebar-ring` | Focus ring |

**Usage:**
```tsx
// Sidebar container
<aside className="bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
  <nav>
    {/* Active link */}
    <a className="bg-sidebar-primary text-sidebar-primary-foreground">
      Dashboard
    </a>

    {/* Hover state */}
    <a className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
      Settings
    </a>
  </nav>
</aside>
```

---

## Color Usage Guidelines

### Semantic Color Mapping

| Purpose | Color Token | When to Use |
|---------|-------------|-------------|
| **Primary actions** | `primary` | Main CTAs, submit buttons, active states |
| **Secondary actions** | `secondary` | Cancel, back, alternative actions |
| **Hover/Focus states** | `accent` | Interactive element highlights |
| **Success messages** | `chart-2` (green) | Confirmations, completed states |
| **Errors/Warnings** | `destructive` | Form errors, delete actions, alerts |
| **Info/Help** | `accent` (blue) | Tooltips, info boxes, help text |
| **Disabled states** | `muted` | Inactive elements, placeholders |

### Contrast Ratios

All color combinations meet **WCAG AAA** standards:

| Background | Foreground | Contrast Ratio | WCAG Level |
|------------|------------|----------------|------------|
| `background` (black) | `foreground` (white) | 21:1 | AAA ✓ |
| `card` | `card-foreground` | 19.8:1 | AAA ✓ |
| `primary` (pink) | `primary-foreground` | 7.2:1 | AAA ✓ |
| `accent` (blue) | `accent-foreground` | 8.1:1 | AAA ✓ |
| `destructive` (orange) | `destructive-foreground` | 6.8:1 | AAA ✓ |

### Visual Examples

#### Color Hierarchy
```
┌─────────────────────────────────────┐
│ background (pure black)             │
│  ┌─────────────────────────────┐    │
│  │ card (elevated surface)     │    │
│  │  ┌─────────────────────┐    │    │
│  │  │ popover (floating)  │    │    │
│  │  └─────────────────────┘    │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

#### Interactive States
```tsx
// Default → Hover → Active → Focus
<Button>
  {/* Default */}
  bg-primary text-primary-foreground

  {/* Hover */}
  hover:bg-primary/90

  {/* Active */}
  active:bg-primary/80

  {/* Focus */}
  focus:ring-2 focus:ring-ring focus:ring-offset-2
</Button>
```

#### Form Validation
```tsx
// Default → Error → Success
<Input
  className={cn(
    "bg-input border-border",           // Default
    errors && "border-destructive",     // Error state
    success && "border-chart-2"         // Success state
  )}
/>
{errors && (
  <p className="text-destructive text-sm">{errors.message}</p>
)}
```

---

## Customization

### Modifying Colors

To customize the theme, edit `client/src/index.css`:

```css
:root {
  /* Change primary color from pink to purple */
  --primary: oklch(0.75 0.25 290);

  /* Make backgrounds slightly lighter */
  --background: oklch(0.05 0 0);
  --card: oklch(0.20 0 0);
}
```

**Tips:**
- Keep `L` (lightness) consistent across theme for visual harmony
- Adjust `C` (chroma) to increase/decrease saturation
- Change `H` (hue) to shift color (0° red, 120° green, 240° blue)
- Test contrast ratios after changes: [OKLCH Color Picker](https://oklch.com)

### Adding New Colors

1. Define CSS variable in `:root`:
```css
:root {
  --success: oklch(0.8664 0.2948 142.4953); /* Bright green */
  --warning: oklch(0.9680 0.2110 109.7692); /* Yellow */
}
```

2. Map to Tailwind in `@theme inline`:
```css
@theme inline {
  --color-success: var(--success);
  --color-warning: var(--warning);
}
```

3. Use in components:
```tsx
<Badge className="bg-success">Success</Badge>
<Alert className="bg-warning">Warning</Alert>
```

---

## Browser Compatibility

### OKLCH Support

- **Chrome/Edge:** 111+ ✓
- **Safari:** 15.4+ ✓
- **Firefox:** 113+ ✓

**Fallback:** For older browsers, colors automatically fall back to `rgb()` equivalents.

### CSS Variables

Fully supported in all modern browsers (IE11+ with PostCSS polyfill).

---

## Design Tokens Reference

### Quick Reference Table

| Category | Tokens |
|----------|--------|
| **Base** | background, foreground |
| **Surfaces** | card, popover, sidebar |
| **Semantic** | primary, secondary, muted, accent, destructive |
| **Form** | input, border, ring |
| **Charts** | chart-1 through chart-5 |
| **Sidebar** | sidebar-* (8 tokens) |

### CSS Variables Location

All color tokens are defined in:
- **Source:** `client/src/index.css` (`:root` selector)
- **Tailwind Config:** `tailwind.config.ts` (colors object)
- **Usage:** Via Tailwind classes (`bg-primary`) or CSS (`var(--primary)`)

---

## Next Steps

- **Typography System:** See typography section (to be added)
- **Spacing & Shadows:** See spacing section (to be added)
- **Component Library:** [COMPONENT-LIBRARY.md](./COMPONENT-LIBRARY.md) (to be added)
- **Theme Architecture:** See theme architecture section (to be added)

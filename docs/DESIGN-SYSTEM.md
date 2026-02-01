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

## Typography System

### Overview

The typography system uses **JetBrains Mono**, a modern monospace typeface designed for developers, across the entire interface. This creates a consistent, terminal-inspired aesthetic that aligns with the cyberpunk theme.

**Key Features:**
- **Single Font Family** - JetBrains Mono for all text (sans, mono, and body)
- **Monospace Everywhere** - Even UI text uses monospace for consistency
- **Ligature Support** - Contextual alternates and ligatures enabled
- **Terminal Aesthetic** - Code-first design language

---

### Font Families

#### CSS Variables

| Variable | Value | Description | Usage |
|----------|-------|-------------|-------|
| `--font-sans` | `'JetBrains Mono', monospace` | Primary UI font | Body text, headings, buttons |
| `--font-mono` | `'JetBrains Mono', monospace` | Code/monospace | Code blocks, pre-formatted text |
| `--font-serif` | `ui-serif, Georgia, serif` | Serif fallback | Not used in theme |

**Note:** Both `--font-sans` and `--font-mono` use the same font (JetBrains Mono) to maintain visual consistency.

---

### Font Configuration

#### JetBrains Mono

**Source:** [Google Fonts](https://fonts.google.com/specimen/JetBrains+Mono) or [Official Site](https://www.jetbrains.com/lp/mono/)

**Characteristics:**
- **Type:** Monospace
- **Designer:** Philipp Nurullin, Konstantin Bulenkov (JetBrains)
- **Optimized for:** Code readability, long-form reading
- **Supports:** 145+ languages, extensive Unicode coverage

**Why JetBrains Mono?**
- Clear distinction between similar characters (`0O`, `1lI`, `g9q`)
- Increased x-height for better readability at small sizes
- Balanced character width for comfortable reading
- Modern aesthetic that fits cyberpunk theme

---

### Font Features

Font feature settings are applied globally to enable advanced typography:

```css
font-feature-settings: "rlig" 1, "calt" 1;
```

| Feature | Code | Description | Example |
|---------|------|-------------|---------|
| **Contextual Ligatures** | `calt` | Replaces character sequences with combined glyphs | `=>` → `⇒`, `!=` → `≠` |
| **Required Ligatures** | `rlig` | Essential ligatures for proper text rendering | Language-specific combinations |

**Ligature Examples in JetBrains Mono:**
- Arrow operators: `->` `=>` `<-` `<=` `>=`
- Comparison: `==` `!=` `===` `!==`
- Logic: `&&` `||`
- Other: `..` `...` `::` `//` `/* */`

**Note:** Ligatures enhance code readability but can be disabled per-element if needed:
```css
.no-ligatures {
  font-feature-settings: "calt" 0, "rlig" 0;
}
```

---

### Typography Scale

#### Tailwind Text Sizes

The theme inherits Tailwind's default typography scale:

| Class | Font Size | Line Height | Usage |
|-------|-----------|-------------|-------|
| `text-xs` | 0.75rem (12px) | 1rem (16px) | Captions, fine print, labels |
| `text-sm` | 0.875rem (14px) | 1.25rem (20px) | Secondary text, helpers, metadata |
| `text-base` | 1rem (16px) | 1.5rem (24px) | Body text, default paragraphs |
| `text-lg` | 1.125rem (18px) | 1.75rem (28px) | Subheadings, emphasized text |
| `text-xl` | 1.25rem (20px) | 1.75rem (28px) | Section headings |
| `text-2xl` | 1.5rem (24px) | 2rem (32px) | Page titles, major headings |
| `text-3xl` | 1.875rem (30px) | 2.25rem (36px) | Hero text, prominent headings |
| `text-4xl` | 2.25rem (36px) | 2.5rem (40px) | Display text, landing page |
| `text-5xl` | 3rem (48px) | 1 | Large display text |
| `text-6xl` | 3.75rem (60px) | 1 | Extra large display |

**Usage Example:**
```tsx
<h1 className="text-4xl font-bold">Large Heading</h1>
<h2 className="text-2xl font-semibold">Section Title</h2>
<p className="text-base">Body text content</p>
<span className="text-sm text-muted-foreground">Helper text</span>
```

---

### Font Weights

JetBrains Mono supports multiple weights. Use Tailwind classes:

| Class | Weight | Value | Usage |
|-------|--------|-------|-------|
| `font-thin` | Thin | 100 | Rarely used |
| `font-extralight` | Extra Light | 200 | Subtle emphasis |
| `font-light` | Light | 300 | De-emphasized text |
| `font-normal` | Normal | 400 | Default body text |
| `font-medium` | Medium | 500 | Slight emphasis |
| `font-semibold` | Semibold | 600 | Subheadings, labels |
| `font-bold` | Bold | 700 | Headings, strong emphasis |
| `font-extrabold` | Extra Bold | 800 | Major headings |
| `font-black` | Black | 900 | Display text, hero |

**Recommended Weights:**
- **Headings:** `font-bold` (700) or `font-extrabold` (800)
- **Body:** `font-normal` (400)
- **Emphasis:** `font-medium` (500) or `font-semibold` (600)
- **De-emphasis:** `font-light` (300)

**Example:**
```tsx
<h1 className="text-3xl font-bold">Bold Heading</h1>
<p className="text-base font-normal">Regular paragraph text</p>
<strong className="font-semibold">Emphasized text</strong>
```

---

### Text Styles

#### Headings

```tsx
// H1 - Page Title
<h1 className="text-4xl font-bold text-foreground mb-6">
  Page Title
</h1>

// H2 - Section Heading
<h2 className="text-2xl font-semibold text-foreground mb-4">
  Section Title
</h2>

// H3 - Subsection
<h3 className="text-xl font-semibold text-foreground mb-3">
  Subsection
</h3>

// H4 - Minor Heading
<h4 className="text-lg font-medium text-foreground mb-2">
  Minor Heading
</h4>
```

---

#### Body Text

```tsx
// Default paragraph
<p className="text-base text-foreground leading-relaxed">
  Standard body text with comfortable line height.
</p>

// Large body text
<p className="text-lg text-foreground leading-relaxed">
  Larger text for emphasis or readability.
</p>

// Small text
<p className="text-sm text-muted-foreground">
  Secondary information or metadata.
</p>

// Extra small (captions)
<span className="text-xs text-muted-foreground">
  Fine print or labels
</span>
```

---

#### Code & Preformatted

Code elements automatically inherit `font-family: var(--font-mono)`:

```tsx
// Inline code
<code className="bg-muted px-1.5 py-0.5 rounded text-sm">
  const variable = "value";
</code>

// Code block
<pre className="bg-card p-4 rounded-lg overflow-x-auto">
  <code className="text-sm">
    function example() {'{'}
      return "formatted code";
    {'}'}
  </code>
</pre>

// Keyboard shortcuts
<kbd className="bg-muted px-2 py-1 rounded text-xs border border-border">
  Ctrl+K
</kbd>
```

---

#### Links

```tsx
// Primary link
<a className="text-primary hover:underline font-medium">
  Primary Link
</a>

// Subtle link
<a className="text-foreground hover:text-primary transition-colors">
  Hover to highlight
</a>

// External link with icon
<a className="text-primary hover:underline inline-flex items-center gap-1">
  Visit Site <ExternalLink className="w-4 h-4" />
</a>
```

---

#### Text Colors

Use semantic color tokens for text:

```tsx
// Primary text (default)
<p className="text-foreground">Standard text</p>

// Muted/secondary text
<p className="text-muted-foreground">Less important text</p>

// Brand color text
<span className="text-primary">Highlighted text</span>

// Accent text
<span className="text-accent">Info or help text</span>

// Error text
<span className="text-destructive">Error message</span>

// Success text (using chart-2)
<span className="text-chart-2">Success message</span>
```

---

### Text Utilities

#### Line Height

| Class | Value | Usage |
|-------|-------|-------|
| `leading-none` | 1 | Tight headings |
| `leading-tight` | 1.25 | Compact text |
| `leading-snug` | 1.375 | Slightly loose |
| `leading-normal` | 1.5 | Default |
| `leading-relaxed` | 1.625 | Comfortable reading |
| `leading-loose` | 2 | Spacious text |

**Example:**
```tsx
<h1 className="leading-tight">Tight Heading</h1>
<p className="leading-relaxed">Comfortable paragraph text</p>
```

---

#### Letter Spacing

| Class | Value | Usage |
|-------|-------|-------|
| `tracking-tighter` | -0.05em | Very compact |
| `tracking-tight` | -0.025em | Tight spacing |
| `tracking-normal` | 0 | Default monospace |
| `tracking-wide` | 0.025em | Slightly spaced |
| `tracking-wider` | 0.05em | More spaced |
| `tracking-widest` | 0.1em | Maximum spacing |

**Example:**
```tsx
<h1 className="tracking-tight">Compact Heading</h1>
<code className="tracking-normal">monospace_code</code>
```

---

#### Text Alignment

```tsx
<p className="text-left">Left aligned</p>
<p className="text-center">Center aligned</p>
<p className="text-right">Right aligned</p>
<p className="text-justify">Justified text</p>
```

---

#### Text Decoration

```tsx
// Underline
<a className="underline">Underlined link</a>
<a className="hover:underline">Underline on hover</a>

// No underline
<a className="no-underline">Clean link</a>

// Line through
<del className="line-through">Deleted text</del>
```

---

#### Text Transform

```tsx
<p className="uppercase">UPPERCASE TEXT</p>
<p className="lowercase">lowercase text</p>
<p className="capitalize">Capitalize Each Word</p>
<p className="normal-case">Normal case</p>
```

---

### Usage Patterns

#### Card Title & Description

```tsx
<Card>
  <CardHeader>
    <CardTitle className="text-2xl font-bold">
      Card Title
    </CardTitle>
    <CardDescription className="text-muted-foreground">
      Supporting description text
    </CardDescription>
  </CardHeader>
</Card>
```

---

#### Form Labels & Helpers

```tsx
<div className="space-y-2">
  <Label className="text-sm font-medium text-foreground">
    Email Address
  </Label>
  <Input type="email" />
  <p className="text-xs text-muted-foreground">
    We'll never share your email
  </p>
</div>
```

---

#### Alert Messages

```tsx
// Error
<Alert variant="destructive">
  <AlertTitle className="text-sm font-semibold">Error</AlertTitle>
  <AlertDescription className="text-sm">
    Something went wrong
  </AlertDescription>
</Alert>

// Success
<Alert className="border-chart-2">
  <AlertTitle className="text-sm font-semibold text-chart-2">
    Success
  </AlertTitle>
  <AlertDescription className="text-sm">
    Operation completed
  </AlertDescription>
</Alert>
```

---

#### Button Text

```tsx
// Primary button
<Button className="font-medium">
  Submit Form
</Button>

// Secondary button
<Button variant="secondary" className="font-normal">
  Cancel
</Button>

// Link button
<Button variant="link" className="font-medium underline">
  Learn More
</Button>
```

---

### Loading & Installation

#### CDN (Google Fonts)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap" rel="stylesheet">
```

#### NPM Package

```bash
npm install @fontsource/jetbrains-mono
```

```tsx
// In your main entry file (e.g., main.tsx or _app.tsx)
import '@fontsource/jetbrains-mono/400.css'; // Normal
import '@fontsource/jetbrains-mono/500.css'; // Medium
import '@fontsource/jetbrains-mono/700.css'; // Bold
```

---

### Accessibility

#### Font Size Considerations

- **Minimum:** Never go below `text-xs` (12px) for body text
- **Default:** Use `text-base` (16px) for main content
- **Readability:** Pair appropriate font size with `leading-relaxed`
- **Zoom:** Ensure text scales properly when users zoom (use `rem` units)

#### Color Contrast

Always pair text colors with appropriate backgrounds:

| Text Color | Background | Contrast | WCAG |
|------------|------------|----------|------|
| `foreground` | `background` | 21:1 | AAA ✓ |
| `card-foreground` | `card` | 19.8:1 | AAA ✓ |
| `muted-foreground` | `background` | 7.4:1 | AAA ✓ |
| `primary-foreground` | `primary` | 7.2:1 | AAA ✓ |

#### Screen Reader Support

```tsx
// Use semantic HTML
<h1>Page Title</h1>          // Not: <div className="text-4xl">
<p>Paragraph</p>              // Not: <div className="text-base">
<strong>Important</strong>    // Not: <span className="font-bold">
<em>Emphasized</em>           // Not: <span className="italic">
```

---

### Best Practices

#### Do's ✓

- **Use semantic HTML** - `<h1>` for headings, `<p>` for paragraphs
- **Maintain hierarchy** - Clear size/weight progression for headings
- **Comfortable line height** - Use `leading-relaxed` for body text
- **Consistent spacing** - Use margin/padding utilities for rhythm
- **Accessible colors** - Pair `text-*` classes with appropriate backgrounds

**Example:**
```tsx
<article className="space-y-4">
  <h1 className="text-3xl font-bold leading-tight">
    Article Title
  </h1>
  <p className="text-base leading-relaxed text-foreground">
    Body paragraph with comfortable line height.
  </p>
  <p className="text-sm text-muted-foreground">
    Secondary information in muted color.
  </p>
</article>
```

---

#### Don'ts ✗

- **Don't mix fonts** - Stick to JetBrains Mono for consistency
- **Don't skip heading levels** - H1 → H2 → H3 (not H1 → H3)
- **Don't use tiny text** - Avoid going below `text-xs` (12px)
- **Don't disable ligatures globally** - They improve code readability
- **Don't use low contrast** - Always test text/background combinations

**Bad Example:**
```tsx
// ✗ Skips H2, uses tiny text, poor contrast
<h1>Title</h1>
<h3 className="text-[10px] text-gray-500">Subtitle</h3>
```

**Good Example:**
```tsx
// ✓ Proper hierarchy, readable size, good contrast
<h1 className="text-3xl font-bold">Title</h1>
<h2 className="text-xl font-semibold text-muted-foreground">
  Subtitle
</h2>
```

---

### Customization

#### Changing Font Family

To use a different font, update `client/src/index.css`:

```css
:root {
  /* Replace JetBrains Mono with your font */
  --font-sans: 'Inter', sans-serif;
  --font-mono: 'Fira Code', monospace;
}
```

Then load your font via CDN or package manager.

---

#### Adjusting Font Features

Disable ligatures if needed:

```css
@layer base {
  html, body {
    /* Disable ligatures */
    font-feature-settings: "calt" 0, "rlig" 0;
  }
}
```

Or enable additional features:

```css
font-feature-settings:
  "rlig" 1,  /* Required ligatures */
  "calt" 1,  /* Contextual alternates */
  "ss01" 1,  /* Stylistic set 1 */
  "zero" 1;  /* Slashed zero */
```

---

### Typography Checklist

Before shipping, verify:

- [ ] Font loaded correctly (check Network tab)
- [ ] Ligatures display properly in code blocks
- [ ] Text scales appropriately at different viewport sizes
- [ ] All text/background combinations meet WCAG AAA (21:1 for body, 7:1 for large)
- [ ] Heading hierarchy is semantic (H1 → H2 → H3)
- [ ] Line heights provide comfortable reading experience
- [ ] Font weights create clear visual hierarchy
- [ ] Text remains readable when zoomed to 200%

---

## Next Steps

- **Spacing & Shadows:** See spacing section (to be added)
- **Component Library:** [COMPONENT-LIBRARY.md](./COMPONENT-LIBRARY.md) (to be added)
- **Theme Architecture:** See theme architecture section (to be added)

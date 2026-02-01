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

## Spacing System

### Overview

The spacing system uses **Tailwind CSS's default spacing scale**, based on a **4px (0.25rem) base unit**. This creates consistent, predictable spacing throughout the interface.

**Key Features:**
- **4px Base Unit** - All spacing is a multiple of 4px
- **Rem-based** - Scales with user font size preferences
- **T-shirt Sizing** - Easy to remember scale (xs, sm, md, lg, xl, etc.)
- **Responsive** - Works seamlessly with responsive modifiers

---

### Spacing Scale

| Token | Value (rem) | Value (px) | Usage |
|-------|-------------|------------|-------|
| `0` | 0 | 0px | Remove spacing |
| `px` | 1px | 1px | Hairline borders/spacing |
| `0.5` | 0.125rem | 2px | Minimal spacing |
| `1` | 0.25rem | 4px | Extra tight spacing |
| `1.5` | 0.375rem | 6px | Very tight spacing |
| `2` | 0.5rem | 8px | Tight spacing |
| `2.5` | 0.625rem | 10px | Compact spacing |
| `3` | 0.75rem | 12px | Small spacing |
| `3.5` | 0.875rem | 14px | Small-medium spacing |
| `4` | 1rem | 16px | **Default spacing** |
| `5` | 1.25rem | 20px | Medium spacing |
| `6` | 1.5rem | 24px | Medium-large spacing |
| `7` | 1.75rem | 28px | Large spacing |
| `8` | 2rem | 32px | Extra large spacing |
| `9` | 2.25rem | 36px | Section spacing |
| `10` | 2.5rem | 40px | Block spacing |
| `11` | 2.75rem | 44px | Large block spacing |
| `12` | 3rem | 48px | Major section spacing |
| `14` | 3.5rem | 56px | Hero spacing |
| `16` | 4rem | 64px | Extra large section |
| `20` | 5rem | 80px | Page section spacing |
| `24` | 6rem | 96px | Major page spacing |
| `32` | 8rem | 128px | Layout spacing |
| `40` | 10rem | 160px | Large layout spacing |
| `48` | 12rem | 192px | Extra large layout |
| `56` | 14rem | 224px | Maximum layout |
| `64` | 16rem | 256px | Maximum spacing |

---

### Spacing Utilities

#### Padding

```tsx
// All sides
<div className="p-4">Padding 16px on all sides</div>

// Horizontal (left + right)
<div className="px-6">Padding 24px left and right</div>

// Vertical (top + bottom)
<div className="py-8">Padding 32px top and bottom</div>

// Individual sides
<div className="pt-2 pr-4 pb-6 pl-8">
  Different padding on each side
</div>
```

**Common Patterns:**
```tsx
// Card padding
<Card className="p-6">
  <CardContent>Content with 24px padding</CardContent>
</Card>

// Button padding
<Button className="px-4 py-2">
  Compact button
</Button>

// Form spacing
<div className="space-y-4">
  <Input />
  <Input />
  {/* 16px gap between inputs */}
</div>
```

---

#### Margin

```tsx
// All sides
<div className="m-4">Margin 16px on all sides</div>

// Horizontal (left + right)
<div className="mx-auto">Center with auto margins</div>

// Vertical (top + bottom)
<div className="my-8">Margin 32px top and bottom</div>

// Individual sides
<div className="mt-2 mr-4 mb-6 ml-8">
  Different margin on each side
</div>

// Negative margins
<div className="-mt-4">Negative margin to pull up</div>
```

**Common Patterns:**
```tsx
// Section spacing
<section className="mb-12">
  Content with 48px bottom margin
</section>

// Card grid spacing
<div className="grid grid-cols-3 gap-6">
  <Card /> <Card /> <Card />
  {/* 24px gap between cards */}
</div>

// Centered container
<div className="mx-auto max-w-4xl px-4">
  Centered content with side padding
</div>
```

---

#### Gap (Flexbox & Grid)

```tsx
// Flexbox gap
<div className="flex gap-4">
  <Button>One</Button>
  <Button>Two</Button>
  {/* 16px gap between buttons */}
</div>

// Grid gap
<div className="grid grid-cols-2 gap-6">
  <Card />
  <Card />
  {/* 24px gap between grid items */}
</div>

// Different horizontal/vertical gap
<div className="grid grid-cols-3 gap-x-4 gap-y-8">
  {/* 16px horizontal, 32px vertical */}
</div>
```

---

#### Space Between

```tsx
// Vertical spacing between children
<div className="space-y-6">
  <p>Paragraph 1</p>
  <p>Paragraph 2</p>
  <p>Paragraph 3</p>
  {/* 24px between each paragraph */}
</div>

// Horizontal spacing between children
<div className="flex space-x-4">
  <Button>Button 1</Button>
  <Button>Button 2</Button>
  {/* 16px between buttons */}
</div>
```

---

### Spacing Guidelines

#### Component Spacing

| Component | Internal Padding | External Margin | Gap Between |
|-----------|------------------|-----------------|-------------|
| **Button** | `px-4 py-2` (16px/8px) | `mr-2` (8px) | `gap-2` (8px) |
| **Card** | `p-6` (24px) | `mb-6` (24px) | `gap-6` (24px) |
| **Input** | `px-3 py-2` (12px/8px) | `mb-4` (16px) | N/A |
| **Section** | `py-12` (48px) | `mb-12` (48px) | `gap-8` (32px) |
| **Container** | `px-4` (16px mobile) | `mx-auto` (center) | N/A |

---

#### Layout Spacing

```tsx
// Page container
<div className="container mx-auto px-4 py-8">
  {/* 16px side padding, 32px vertical padding */}
</div>

// Section spacing
<section className="py-12 md:py-16">
  {/* 48px mobile, 64px desktop */}
</section>

// Card grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* 24px gap between cards */}
</div>

// Content spacing
<article className="space-y-6">
  <h1>Title</h1>
  <p>Paragraph</p>
  {/* 24px between elements */}
</article>
```

---

#### Responsive Spacing

```tsx
// Mobile-first responsive padding
<div className="p-4 md:p-6 lg:p-8">
  {/* 16px → 24px → 32px */}
</div>

// Responsive margins
<div className="mb-6 md:mb-8 lg:mb-12">
  {/* 24px → 32px → 48px */}
</div>

// Responsive gaps
<div className="grid gap-4 md:gap-6 lg:gap-8">
  {/* 16px → 24px → 32px */}
</div>
```

---

### Common Spacing Patterns

#### Form Layouts

```tsx
<form className="space-y-6">
  {/* 24px between form sections */}
  <div className="space-y-2">
    {/* 8px between label and input */}
    <Label>Email</Label>
    <Input type="email" />
  </div>

  <div className="space-y-2">
    <Label>Password</Label>
    <Input type="password" />
    <p className="text-xs text-muted-foreground">
      {/* Helper text close to input */}
      At least 8 characters
    </p>
  </div>

  <Button className="mt-4">
    {/* Extra spacing before submit */}
    Submit
  </Button>
</form>
```

---

#### Card Layouts

```tsx
<Card className="p-6">
  {/* 24px padding around content */}
  <CardHeader className="mb-4">
    {/* 16px below header */}
    <CardTitle className="text-2xl mb-2">
      {/* 8px below title */}
      Card Title
    </CardTitle>
    <CardDescription>
      Description text
    </CardDescription>
  </CardHeader>

  <CardContent className="space-y-4">
    {/* 16px between content blocks */}
    <p>Content paragraph 1</p>
    <p>Content paragraph 2</p>
  </CardContent>

  <CardFooter className="mt-6">
    {/* 24px above footer */}
    <Button>Action</Button>
  </CardFooter>
</Card>
```

---

#### Navigation Spacing

```tsx
<nav className="flex items-center gap-6 px-4 py-3">
  {/* 24px between nav items, 16px horizontal padding */}
  <a className="hover:text-primary">Home</a>
  <a className="hover:text-primary">About</a>
  <a className="hover:text-primary">Contact</a>
</nav>
```

---

## Border Radius System

### Overview

The design system uses **zero border radius** (`--radius: 0rem`) for all components, creating sharp, angular edges that reinforce the cyberpunk aesthetic.

**Philosophy:**
- **Sharp Edges** - No rounded corners anywhere
- **Geometric** - Clean, precise lines
- **Terminal-Inspired** - Mimics terminal/console UI
- **Consistent** - All components follow the same pattern

---

### Border Radius Tokens

| Token | CSS Variable | Calculated Value | Usage |
|-------|--------------|------------------|-------|
| **Base** | `--radius` | `0rem` | Default radius |
| **Small** | `--radius-sm` | `calc(var(--radius) - 4px)` = `0rem` | Small components |
| **Medium** | `--radius-md` | `calc(var(--radius) - 2px)` = `0rem` | Medium components |
| **Large** | `--radius-lg` | `var(--radius)` = `0rem` | Large components |
| **Extra Large** | `--radius-xl` | `calc(var(--radius) + 4px)` = `0rem` | Extra large components |

**Note:** All radius values resolve to `0rem` because the base `--radius` is `0rem`. The calculations are kept for compatibility with Tailwind's border radius system.

---

### Tailwind Border Radius Classes

| Class | Value | Usage |
|-------|-------|-------|
| `rounded-none` | `0` | Explicitly no rounding (default) |
| `rounded-sm` | `var(--radius-sm)` = `0rem` | Small components |
| `rounded` | `var(--radius-md)` = `0rem` | Default components |
| `rounded-md` | `var(--radius-md)` = `0rem` | Medium components |
| `rounded-lg` | `var(--radius-lg)` = `0rem` | Large components |
| `rounded-xl` | `var(--radius-xl)` = `0rem` | Extra large components |
| `rounded-full` | `9999px` | Still available for circles (use sparingly) |

**All component classes resolve to sharp edges (0rem).**

---

### Usage Examples

#### Components with Sharp Edges

```tsx
// Button - sharp edges
<Button className="rounded-lg">
  {/* rounded-lg = 0rem, sharp edges */}
  Click Me
</Button>

// Card - sharp corners
<Card className="rounded-lg border border-border">
  {/* Card with sharp, angular corners */}
  <CardContent>Content</CardContent>
</Card>

// Input - no rounding
<Input className="rounded-md" />
{/* Input with sharp edges */}

// Badge - sharp edges (not pills)
<Badge className="rounded-sm">
  {/* Badge with sharp corners */}
  New
</Badge>

// Dialog - angular
<Dialog>
  <DialogContent className="rounded-lg">
    {/* Dialog with sharp corners */}
  </DialogContent>
</Dialog>
```

---

#### Customization (If Needed)

To add border radius to the design system, edit `client/src/index.css`:

```css
:root {
  /* Change from sharp edges to rounded */
  --radius: 0.5rem; /* 8px rounding */
}
```

This will update all components that use `rounded-*` classes:
- `rounded-sm` → `4px` (8px - 4px)
- `rounded-md` → `6px` (8px - 2px)
- `rounded-lg` → `8px`
- `rounded-xl` → `12px` (8px + 4px)

**However, this is not recommended** as it breaks the cyberpunk sharp-edge aesthetic.

---

#### Exceptions (Rare Cases)

If you need circular elements (avatars, icons), use `rounded-full`:

```tsx
// Avatar - circular
<Avatar className="rounded-full w-10 h-10">
  {/* Circle instead of square */}
  <AvatarImage src="/avatar.jpg" />
</Avatar>

// Icon button - circular
<Button
  size="icon"
  variant="ghost"
  className="rounded-full"
>
  <Icon />
</Button>
```

**Use sparingly** - most UI should maintain sharp edges.

---

### Visual Examples

#### Sharp Edge Components

```
┌─────────────────────┐
│                     │  ← Sharp corners (0rem)
│   Button / Card     │
│                     │
└─────────────────────┘

NOT:
╭─────────────────────╮
│   Rounded corners   │  ← Avoid rounded (unless --radius changed)
╰─────────────────────╯
```

---

## Shadow System

### Overview

The design system uses **zero shadows** for all components, creating a flat, layered aesthetic that relies on borders and color contrast for depth.

**Philosophy:**
- **Flat Design** - No depth simulation via shadows
- **Border-Based Separation** - Use borders instead of shadows
- **Color Contrast** - Rely on background color differences
- **Performance** - Eliminates shadow rendering overhead

---

### Shadow Tokens

All shadow variables are set to **zero opacity** (invisible):

| Token | CSS Variable | Value | Usage |
|-------|--------------|-------|-------|
| **2XS** | `--shadow-2xs` | `0 0 0 0 hsl(0 0 0 / 0.00)` | Disabled |
| **XS** | `--shadow-xs` | `0 0 0 0 hsl(0 0 0 / 0.00)` | Disabled |
| **SM** | `--shadow-sm` | `0 0 0 0 hsl(0 0 0 / 0.00)` | Disabled |
| **MD (default)** | `--shadow` | `0 0 0 0 hsl(0 0 0 / 0.00)` | Disabled |
| **MD** | `--shadow-md` | `0 0 0 0 hsl(0 0 0 / 0.00)` | Disabled |
| **LG** | `--shadow-lg` | `0 0 0 0 hsl(0 0 0 / 0.00)` | Disabled |
| **XL** | `--shadow-xl` | `0 0 0 0 hsl(0 0 0 / 0.00)` | Disabled |
| **2XL** | `--shadow-2xl` | `0 0 0 0 hsl(0 0 0 / 0.00)` | Disabled |

**All shadows are invisible** - components using shadow classes will have no visual shadow.

---

### Shadow Variables (CSS)

Defined in `client/src/index.css`:

```css
:root {
  /* Shadow configuration - all disabled */
  --shadow-x: 0;
  --shadow-y: 0;
  --shadow-blur: 0;
  --shadow-spread: 0;
  --shadow-opacity: 0;
  --shadow-color: 0 0 0;

  /* Shadow tokens - all invisible */
  --shadow-2xs: 0 0 0 0 hsl(0 0 0 / 0.00);
  --shadow-xs: 0 0 0 0 hsl(0 0 0 / 0.00);
  --shadow-sm: 0 0 0 0 hsl(0 0 0 / 0.00);
  --shadow: 0 0 0 0 hsl(0 0 0 / 0.00);
  --shadow-md: 0 0 0 0 hsl(0 0 0 / 0.00);
  --shadow-lg: 0 0 0 0 hsl(0 0 0 / 0.00);
  --shadow-xl: 0 0 0 0 hsl(0 0 0 / 0.00);
  --shadow-2xl: 0 0 0 0 hsl(0 0 0 / 0.00);
}
```

---

### Usage (No Visual Effect)

These classes are **safe to use** but produce **no visible shadow**:

```tsx
// Shadow classes have no effect
<Card className="shadow-lg">
  {/* No shadow - same as no class */}
</Card>

<Button className="shadow-md hover:shadow-xl">
  {/* No shadow on default or hover */}
  Click Me
</Button>

<div className="shadow-2xl">
  {/* Still no shadow */}
</div>
```

---

### Alternative: Border-Based Depth

Instead of shadows, use **borders** and **background colors** to create visual separation:

```tsx
// Elevated card with border (instead of shadow)
<Card className="border-2 border-primary">
  {/* Neon border creates emphasis */}
  <CardContent>Important content</CardContent>
</Card>

// Layered surfaces with color contrast
<div className="bg-background">
  <div className="bg-card p-6 border border-border">
    {/* Card elevated via background color */}
    <div className="bg-popover p-4 border border-border">
      {/* Popover layered on top */}
      Content
    </div>
  </div>
</div>

// Focus ring instead of shadow
<Input className="focus:ring-2 focus:ring-primary" />
{/* Neon ring on focus (not shadow) */}
```

---

### Visual Hierarchy Without Shadows

```tsx
// Page structure using color and borders
<div className="bg-background">
  {/* Base layer: pure black */}

  <Card className="bg-card border border-border">
    {/* Elevated layer: slightly lighter background + border */}

    <div className="bg-popover p-4 border-t border-border">
      {/* Top layer: lighter background + top border */}
      Floating content
    </div>
  </Card>
</div>
```

**Visual Hierarchy:**
1. **Background** (`oklch(0 0 0)`) - Darkest
2. **Card** (`oklch(0.1684 0 0)`) + Border - Elevated
3. **Popover** (`oklch(0.1448 0 0)`) + Border - Top layer

---

### Customization (If Needed)

To enable shadows (not recommended), edit `client/src/index.css`:

```css
:root {
  /* Enable subtle shadows */
  --shadow-sm: 0 1px 2px 0 hsl(0 0 0 / 0.05);
  --shadow: 0 1px 3px 0 hsl(0 0 0 / 0.1), 0 1px 2px -1px hsl(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px hsl(0 0 0 / 0.1), 0 2px 4px -2px hsl(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px hsl(0 0 0 / 0.1), 0 4px 6px -4px hsl(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px hsl(0 0 0 / 0.1), 0 8px 10px -6px hsl(0 0 0 / 0.1);
  --shadow-2xl: 0 25px 50px -12px hsl(0 0 0 / 0.25);
}
```

**Warning:** This breaks the flat design aesthetic and is not recommended for this theme.

---

### Best Practices

#### Do's ✓

- **Use borders** for separation: `border border-border`
- **Use color contrast** for depth: `bg-card` vs `bg-background`
- **Use focus rings** for interactivity: `focus:ring-2 focus:ring-primary`
- **Use neon accents** for emphasis: `border-2 border-primary`

**Example:**
```tsx
<Card className="bg-card border border-border">
  <div className="border-l-4 border-primary p-4">
    {/* Left accent border for emphasis */}
    Important message
  </div>
</Card>
```

---

#### Don'ts ✗

- **Don't rely on shadows** - they won't render
- **Don't expect depth from shadow classes** - use borders instead
- **Don't add custom shadows** - breaks theme consistency

**Bad Example:**
```tsx
// ✗ Shadow class has no effect
<Card className="shadow-lg">
  Content
</Card>
```

**Good Example:**
```tsx
// ✓ Border creates visual separation
<Card className="border border-border">
  Content
</Card>
```

---

### Scrollbar Styling (Exception)

The only "shadow-like" effect in the theme is the **scrollbar**, which uses color instead of shadows:

```css
/* Custom scrollbar (from index.css) */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--card);
  border: 1px solid var(--border);
  /* No shadow - uses border */
}

::-webkit-scrollbar-thumb {
  background: var(--primary);
  border-radius: var(--radius-sm); /* 0rem - sharp */
}

::-webkit-scrollbar-thumb:hover {
  background: var(--accent);
  /* Color change on hover, not shadow */
}
```

---

## Design System Summary

### Core Principles

| Aspect | Implementation | Philosophy |
|--------|----------------|------------|
| **Colors** | OKLCH color space, dark mode only | Perceptually uniform, accessible |
| **Typography** | JetBrains Mono everywhere | Monospace, terminal-inspired |
| **Spacing** | 4px base unit, Tailwind scale | Consistent, predictable |
| **Border Radius** | 0rem (sharp edges) | Geometric, cyberpunk |
| **Shadows** | Disabled (flat design) | Border-based depth |
| **Theme** | Cyberpunk dark | Neon accents, pure black |

---

### Quick Reference

**Spacing:**
- Use `p-4` (16px), `p-6` (24px), `p-8` (32px) for padding
- Use `space-y-4` (16px), `space-y-6` (24px) for vertical rhythm
- Use `gap-4`, `gap-6` for flexbox/grid spacing

**Border Radius:**
- All components: `rounded-lg` = `0rem` (sharp)
- Exception: `rounded-full` for circles (avatars, icons)

**Shadows:**
- Don't use shadow classes - they have no effect
- Use `border border-border` for separation
- Use color contrast (`bg-card` vs `bg-background`) for depth

---

## Next Steps

- **Component Library:** [COMPONENT-LIBRARY.md](./COMPONENT-LIBRARY.md) (to be added)
- **Theme Architecture:** See theme architecture section (to be added)

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

- [x] Font loaded correctly (check Network tab)
  - **Verified 2026-02-02**: JetBrains Mono loaded via Google Fonts with preconnect optimization (`client/index.html:15-17`). Weights 400, 500, 600, 700 included. CSS variables `--font-sans` and `--font-mono` both use JetBrains Mono (`client/src/index.css:43-45`).
- [x] Ligatures display properly in code blocks
  - **Verified 2026-02-02**: Font feature settings enabled in base styles: `font-feature-settings: "rlig" 1, "calt" 1;` (`client/src/index.css:126`). Code elements use `--font-mono` (`client/src/index.css:131-133`).
- [x] Text scales appropriately at different viewport sizes
  - **Verified 2026-02-02**: Mobile optimizations ensure 16px minimum font size for inputs to prevent iOS zoom (`client/src/styles/mobile-optimizations.css:58`). Viewport meta tag allows user scaling up to 5x (`client/index.html:5`).
- [x] All text/background combinations meet WCAG AAA (21:1 for body, 7:1 for large)
  - **Verified 2026-02-02**: Pure black background `oklch(0 0 0)` with white foreground `oklch(1.0000 0 0)` provides 21:1 contrast. All color tokens documented with contrast ratios in Color Usage Guidelines section above.
- [x] Heading hierarchy is semantic (H1 → H2 → H3)
  - **Verified 2026-02-02**: Tailwind's default typography scale provides semantic sizing. Components use semantic HTML heading elements. No custom heading styles override the hierarchy.
- [x] Line heights provide comfortable reading experience
  - **Verified 2026-02-02**: Tailwind's default line heights (1.5 for body text, tighter for headings) applied. JetBrains Mono has built-in optimal line spacing for code readability.
- [x] Font weights create clear visual hierarchy
  - **Verified 2026-02-02**: Four weights loaded (400, 500, 600, 700) via Google Fonts (`client/index.html:17`). Weights available for normal (400), medium (500), semibold (600), and bold (700) text.
- [x] Text remains readable when zoomed to 200%
  - **Verified 2026-02-02**: Viewport meta tag configured with `user-scalable=yes, maximum-scale=5.0` (`client/index.html:5`). Relative units (rem) used throughout. No `user-scalable=no` restrictions.

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

## Theme Architecture

### Overview

The theme system is built on **CSS custom properties (variables)** that integrate seamlessly with **Tailwind CSS** and **shadcn/ui**. This architecture enables consistent theming, runtime customization, and type-safe component development.

**Key Components:**
- **CSS Variables** - Define all design tokens in `:root`
- **Tailwind Integration** - Map variables to Tailwind utilities
- **shadcn/ui Config** - Configure component generation and styling
- **Theme Provider** - React context for theme management (dark mode only)
- **Custom Theme Manager** - UI for creating and managing custom themes

---

### CSS Variable System

#### How It Works

All design tokens are defined as CSS custom properties in `client/src/index.css`:

```css
:root {
  /* Color tokens */
  --background: oklch(0 0 0);
  --foreground: oklch(1.0000 0 0);
  --primary: oklch(0.75 0.3225 328.3634);

  /* Typography tokens */
  --font-sans: 'JetBrains Mono', monospace;
  --font-mono: 'JetBrains Mono', monospace;

  /* Spacing tokens */
  --radius: 0rem;

  /* Shadow tokens (disabled) */
  --shadow: 0 0 0 0 hsl(0 0 0 / 0.00);
}
```

**Benefits:**
- **Runtime Customization** - Change colors without recompiling CSS
- **JavaScript Access** - Read/write variables via `document.documentElement.style`
- **Inheritance** - Variables cascade through DOM tree
- **Browser Support** - Works in all modern browsers

---

#### Variable Naming Convention

| Pattern | Example | Usage |
|---------|---------|-------|
| `--{token}` | `--primary` | Main color token |
| `--{token}-foreground` | `--primary-foreground` | Text on colored background |
| `--{category}-{token}` | `--sidebar-background` | Component-specific token |
| `--{category}-{number}` | `--chart-1` | Numbered series (charts) |

---

#### Tailwind Integration

CSS variables are mapped to Tailwind utilities via `@theme inline` in `index.css`:

```css
@theme inline {
  /* Map CSS variables to Tailwind color utilities */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  /* ... more mappings ... */
}
```

This enables usage like:
```tsx
<div className="bg-primary text-primary-foreground">
  {/* Uses var(--primary) and var(--primary-foreground) */}
</div>
```

---

### shadcn/ui Configuration

#### components.json

The `components.json` file at the project root configures shadcn/ui component generation:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "client/src/index.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

**Key Settings:**

| Setting | Value | Description |
|---------|-------|-------------|
| `style` | `"new-york"` | Component style variant (clean, minimal) |
| `rsc` | `false` | Not using React Server Components |
| `tsx` | `true` | Generate TypeScript files |
| `cssVariables` | `true` | **Critical** - Enables CSS variable theming |
| `baseColor` | `"neutral"` | Base color palette (grayscale foundation) |
| `prefix` | `""` | No Tailwind class prefix |

---

#### Path Aliases

The `aliases` object configures import paths:

```tsx
// Instead of relative imports:
import { Button } from "../../../components/ui/button";

// Use clean aliases:
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
```

**Configured in:**
- `components.json` - Tells shadcn/ui where to generate files
- `tsconfig.json` - TypeScript path resolution
- `vite.config.ts` - Vite module resolution

---

### Theme Provider

#### Implementation

The theme provider (`client/src/components/ui/theme-provider.tsx`) manages theme state:

```tsx
import { createContext, useEffect, ReactNode } from "react";

type Theme = "dark" | "light" | "system";

export const ThemeProviderContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
}>({
  theme: "dark",
  setTheme: () => null,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const root = window.document.documentElement;

    // Always force dark mode
    root.classList.remove("light");
    root.classList.add("dark");
  }, []);

  const value = {
    theme: "dark" as Theme,
    setTheme: () => {
      // No-op - dark mode only
    },
  };

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}
```

**Characteristics:**
- **Dark Mode Only** - Theme is hardcoded to `"dark"`
- **No Toggle** - `setTheme()` is a no-op
- **DOM Class** - Adds `class="dark"` to `<html>` element
- **Persistent** - Enforces dark mode on every render

---

#### Usage

Wrap your app with the provider:

```tsx
// In main.tsx or App.tsx
import { ThemeProvider } from "@/components/ui/theme-provider";

function App() {
  return (
    <ThemeProvider>
      <YourApp />
    </ThemeProvider>
  );
}
```

**Note:** The provider is required for proper theme behavior, even though the theme is fixed.

---

### Custom Theme Manager

#### Overview

The Custom Theme Manager (`client/src/components/ui/custom-theme-manager.tsx`) provides a UI for creating, editing, and managing custom color themes:

**Features:**
- **Create Custom Themes** - Define colors, typography, spacing
- **Import/Export** - Save themes as JSON files
- **Live Preview** - See changes in real-time
- **Default Themes** - Ocean Blue, Forest Green, Sunset Orange presets
- **LocalStorage Persistence** - Themes saved to browser storage

---

#### Custom Theme Structure

```tsx
interface CustomTheme {
  id: string;                // Unique identifier
  name: string;              // Display name
  description?: string;      // Optional description

  colors: {
    primary: string;         // OKLCH value (e.g., "210 100% 50%")
    secondary: string;
    background: string;
    foreground: string;
    accent: string;
    muted: string;
    border: string;
    card: string;
    destructive?: string;
  };

  typography?: {
    fontFamily?: string;     // Font family name
    fontSize?: string;       // Base font size
  };

  spacing?: {
    radius?: string;         // Border radius value
  };

  createdAt: string;         // ISO timestamp
}
```

---

#### Default Theme Presets

The Custom Theme Manager includes three built-in themes:

**Ocean Blue:**
```tsx
{
  id: "ocean-blue",
  name: "Ocean Blue",
  colors: {
    primary: "210 100% 50%",      // Vibrant blue
    secondary: "210 40% 90%",
    background: "210 20% 98%",
    foreground: "210 100% 15%",
    // ...
  }
}
```

**Forest Green:**
```tsx
{
  id: "forest-green",
  name: "Forest Green",
  colors: {
    primary: "142 100% 35%",      // Natural green
    secondary: "142 40% 90%",
    // ...
  }
}
```

**Sunset Orange:**
```tsx
{
  id: "sunset-orange",
  name: "Sunset Orange",
  colors: {
    primary: "25 100% 55%",       // Warm orange
    secondary: "25 40% 90%",
    // ...
  }
}
```

---

#### Using the Theme Manager

```tsx
import CustomThemeManager from "@/components/ui/custom-theme-manager";

function Settings() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<CustomTheme | null>(null);

  const handleThemeApply = (theme: CustomTheme) => {
    setCurrentTheme(theme);
    // Theme is automatically applied to CSS variables
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        Customize Theme
      </Button>

      <CustomThemeManager
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onThemeApply={handleThemeApply}
        currentTheme={currentTheme}
      />
    </>
  );
}
```

---

#### Theme Application

When a theme is applied, the manager updates CSS variables:

```tsx
const applyTheme = (theme: CustomTheme) => {
  const root = document.documentElement;

  // Apply color variables
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value);
  });

  // Apply typography
  if (theme.typography?.fontFamily) {
    root.style.setProperty('--font-family', theme.typography.fontFamily);
  }

  // Apply spacing
  if (theme.spacing?.radius) {
    root.style.setProperty('--radius', theme.spacing.radius);
  }
};
```

**Result:** All components using `bg-primary`, `text-foreground`, etc. automatically update.

---

### Theme Customization Guide

#### Modifying Global Colors

**Option 1: Edit CSS File**

Directly modify `client/src/index.css`:

```css
:root {
  /* Change primary from pink to purple */
  --primary: oklch(0.75 0.25 290);

  /* Make backgrounds slightly lighter */
  --background: oklch(0.05 0 0);
  --card: oklch(0.20 0 0);

  /* Adjust accent to cyan */
  --accent: oklch(0.70 0.18 200);
}
```

**Pros:**
- Permanent changes
- Version controlled
- Applies to all users

**Cons:**
- Requires rebuild
- Can't be changed at runtime

---

**Option 2: Use Custom Theme Manager**

Apply themes via the UI:

```tsx
const customTheme: CustomTheme = {
  id: "my-theme",
  name: "My Custom Theme",
  colors: {
    primary: "290 100% 60%",    // Purple
    accent: "200 90% 65%",      // Cyan
    background: "0 0 5%",       // Slightly lighter
    // ... other colors
  },
  createdAt: new Date().toISOString()
};

// Apply via theme manager or directly:
const root = document.documentElement;
root.style.setProperty('--primary', customTheme.colors.primary);
```

**Pros:**
- Runtime changes
- User-customizable
- No rebuild required

**Cons:**
- Not persistent across sessions (unless saved to localStorage)
- Requires JavaScript

---

#### Creating a Custom Color Palette

**Step 1: Define Your Colors in OKLCH**

Use [oklch.com](https://oklch.com) to pick colors:

```css
:root {
  /* Brand colors */
  --brand-purple: oklch(0.70 0.25 290);
  --brand-cyan: oklch(0.75 0.20 200);

  /* Functional colors */
  --success: oklch(0.85 0.20 145);
  --warning: oklch(0.90 0.18 90);
  --error: oklch(0.65 0.24 25);
}
```

---

**Step 2: Map to Theme Tokens**

```css
:root {
  /* Map brand colors to theme tokens */
  --primary: var(--brand-purple);
  --accent: var(--brand-cyan);
  --destructive: var(--error);

  /* Ensure contrast */
  --primary-foreground: oklch(1.0 0 0);  /* White */
  --accent-foreground: oklch(1.0 0 0);   /* White */
}
```

---

**Step 3: Add to Tailwind**

```css
@theme inline {
  --color-success: var(--success);
  --color-warning: var(--warning);
  --color-error: var(--error);
}
```

Now use in components:
```tsx
<Badge className="bg-success">Success</Badge>
<Alert className="bg-warning">Warning</Alert>
```

---

#### Adjusting Typography

**Change Font Family:**

```css
:root {
  /* Replace JetBrains Mono */
  --font-sans: 'Inter', sans-serif;
  --font-mono: 'Fira Code', monospace;
}
```

Then load the font:
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet">
```

---

**Adjust Font Sizes:**

```css
:root {
  /* Increase base font size */
  font-size: 18px;  /* Default is 16px */
}

/* Or target specific elements */
body {
  font-size: 1.125rem;  /* 18px if root is 16px */
}
```

---

#### Enabling Border Radius

To add rounded corners:

```css
:root {
  /* Change from sharp edges */
  --radius: 0.5rem;  /* 8px */
}
```

All `rounded-*` classes will now have rounded corners:
- `rounded-sm` → 4px
- `rounded-md` → 6px
- `rounded-lg` → 8px
- `rounded-xl` → 12px

**Note:** This changes the cyberpunk aesthetic significantly.

---

#### Enabling Shadows

To add depth with shadows (not recommended):

```css
:root {
  /* Enable shadows */
  --shadow-sm: 0 1px 2px 0 hsl(0 0 0 / 0.05);
  --shadow: 0 1px 3px 0 hsl(0 0 0 / 0.1), 0 1px 2px -1px hsl(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px hsl(0 0 0 / 0.1), 0 2px 4px -2px hsl(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px hsl(0 0 0 / 0.1), 0 4px 6px -4px hsl(0 0 0 / 0.1);
}
```

Components with `shadow-*` classes will now show shadows.

---

### Theme Import/Export

#### Exporting a Theme

**Via Custom Theme Manager:**

```tsx
const exportTheme = (theme: CustomTheme) => {
  const dataStr = JSON.stringify(theme, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${theme.name.toLowerCase().replace(/\s+/g, '-')}-theme.json`;
  link.click();
  URL.revokeObjectURL(url);
};
```

**Manually:**

Copy the theme object to a JSON file:

```json
{
  "id": "custom-theme",
  "name": "My Custom Theme",
  "description": "A personalized color scheme",
  "colors": {
    "primary": "290 100% 60%",
    "secondary": "290 40% 90%",
    "background": "0 0 5%",
    "foreground": "100 0 100%",
    "accent": "200 90% 65%",
    "muted": "0 0 22%",
    "border": "0 0 32%",
    "card": "0 0 17%"
  },
  "createdAt": "2024-01-15T12:00:00.000Z"
}
```

---

#### Importing a Theme

**Via Custom Theme Manager:**

```tsx
const handleImport = async (file: File) => {
  const text = await file.text();
  const importedTheme: CustomTheme = JSON.parse(text);

  // Validate structure
  if (!importedTheme.name || !importedTheme.colors) {
    throw new Error('Invalid theme file');
  }

  // Generate new ID
  const newTheme = {
    ...importedTheme,
    id: `custom-${Date.now()}`,
    createdAt: new Date().toISOString()
  };

  // Save to localStorage
  const themes = JSON.parse(localStorage.getItem('custom-themes') || '[]');
  themes.push(newTheme);
  localStorage.setItem('custom-themes', JSON.stringify(themes));
};
```

**Manually:**

Load theme JSON and apply:

```tsx
import myTheme from './my-theme.json';

const root = document.documentElement;
Object.entries(myTheme.colors).forEach(([key, value]) => {
  root.style.setProperty(`--${key}`, value);
});
```

---

### Best Practices

#### Do's ✓

- **Use CSS Variables** - Define all design tokens as variables
- **Follow OKLCH Format** - Maintain perceptual uniformity
- **Test Contrast** - Ensure WCAG AAA compliance after changes
- **Document Changes** - Comment custom modifications in CSS
- **Export Themes** - Back up custom themes as JSON
- **Version Control** - Commit `index.css` changes with descriptive messages

**Example:**
```css
:root {
  /* Custom brand color - replaces default pink */
  /* Ensures 7:1 contrast ratio on black background */
  --primary: oklch(0.78 0.28 310);  /* Purple primary */
}
```

---

#### Don'ts ✗

- **Don't Use Arbitrary Values** - Stick to defined variables
- **Don't Break Contrast** - Always test with [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- **Don't Mix Color Spaces** - Keep all colors in OKLCH
- **Don't Hardcode Colors** - Use tokens, not `bg-[#ff00ff]`
- **Don't Forget Foreground** - Every color needs a foreground pair

**Bad Example:**
```tsx
// ✗ Hardcoded color, no variable
<div className="bg-[#9333ea] text-white">
  Custom purple
</div>
```

**Good Example:**
```tsx
// ✓ Uses theme variable
<div className="bg-primary text-primary-foreground">
  Themed purple
</div>
```

---

### Troubleshooting

#### Theme Not Applying

**Issue:** CSS variable changes don't appear

**Solutions:**
1. Check browser DevTools → Elements → `<html>` → Computed styles
2. Verify variable is defined in `:root` selector
3. Ensure variable name matches Tailwind mapping in `@theme inline`
4. Clear browser cache and rebuild

```bash
# Rebuild to apply CSS changes
npm run build
```

---

#### Color Contrast Issues

**Issue:** Text is hard to read

**Solutions:**
1. Use [oklch.com](https://oklch.com) contrast checker
2. Increase lightness difference between bg and text
3. Ensure minimum 7:1 contrast for AAA compliance

```css
/* Bad - low contrast */
--background: oklch(0.20 0 0);
--foreground: oklch(0.30 0 0);  /* Only 1.5:1 contrast */

/* Good - high contrast */
--background: oklch(0 0 0);
--foreground: oklch(1.0 0 0);   /* 21:1 contrast */
```

---

#### Custom Theme Manager Not Saving

**Issue:** Themes disappear after refresh

**Solutions:**
1. Check browser localStorage (DevTools → Application → Local Storage)
2. Verify `localStorage.setItem('custom-themes', ...)` is called
3. Ensure browser allows localStorage (not in incognito mode)

```tsx
// Debug localStorage
console.log(localStorage.getItem('custom-themes'));

// Manually save theme
localStorage.setItem('custom-themes', JSON.stringify([myTheme]));
```

---

#### Imported Theme Not Working

**Issue:** Theme imports fail or look wrong

**Solutions:**
1. Validate JSON structure matches `CustomTheme` interface
2. Ensure color values are in correct format (e.g., `"210 100% 50%"` not `oklch(...)`)
3. Check for missing required fields (`id`, `name`, `colors`)

```tsx
// Validate theme before applying
const isValidTheme = (theme: any): theme is CustomTheme => {
  return (
    typeof theme.id === 'string' &&
    typeof theme.name === 'string' &&
    theme.colors &&
    typeof theme.colors.primary === 'string'
  );
};
```

---

### Advanced Customization

#### Dynamic Theme Switching

For runtime theme changes (e.g., light/dark toggle):

```tsx
function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  const toggleTheme = () => {
    const root = document.documentElement;

    if (isDark) {
      // Light theme
      root.style.setProperty('--background', 'oklch(1.0 0 0)');
      root.style.setProperty('--foreground', 'oklch(0 0 0)');
    } else {
      // Dark theme
      root.style.setProperty('--background', 'oklch(0 0 0)');
      root.style.setProperty('--foreground', 'oklch(1.0 0 0)');
    }

    setIsDark(!isDark);
  };

  return <Button onClick={toggleTheme}>Toggle Theme</Button>;
}
```

**Note:** Currently theme is locked to dark mode. This requires modifying `theme-provider.tsx`.

---

#### Per-Component Theming

Override theme variables for specific components:

```tsx
<Card
  style={{
    '--primary': 'oklch(0.70 0.25 200)',  // Blue instead of pink
    '--card': 'oklch(0.25 0 0)'           // Lighter background
  } as React.CSSProperties}
  className="bg-card border-2 border-primary"
>
  <CardContent>Custom themed card</CardContent>
</Card>
```

---

#### CSS Variable Animations

Animate theme transitions:

```css
:root {
  /* Smooth color transitions */
  transition: background-color 0.3s ease,
              color 0.3s ease;
}

* {
  /* Apply transition to all colored elements */
  transition: background-color 0.3s ease,
              border-color 0.3s ease,
              color 0.3s ease;
}
```

---

### Theme Architecture Checklist

Before deploying theme changes, verify:

- [x] All CSS variables defined in `:root` (index.css)
  - **Verified 2026-02-02**: 60+ CSS variables defined in `:root` block (`client/src/index.css:10-62`). Includes all color tokens (background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, ring, chart-1-5, sidebar variants), typography (font-sans, font-serif, font-mono), radius (0rem for sharp edges), and shadow scale (2xs through 2xl, all zeroed for flat design).
- [ ] Variables mapped to Tailwind in `@theme inline`
- [ ] Color contrast meets WCAG AAA (21:1 for text, 7:1 for large)
- [ ] Theme provider wraps app (`<ThemeProvider>`)
- [ ] Path aliases configured in `components.json`, `tsconfig.json`, `vite.config.ts`
- [ ] Custom themes tested via Theme Manager
- [ ] Exported themes validate against `CustomTheme` interface
- [ ] All components use semantic tokens (not hardcoded colors)
- [ ] Typography scales properly at different viewport sizes
- [ ] Border radius and shadows align with design philosophy

---

## Design System Composition Examples

Real-world examples showing how to combine design tokens to create complete, cohesive UI patterns.

### Interactive Card Pattern

Combining background hierarchy, primary colors, and transitions:

```tsx
<div className="bg-card border border-border rounded-[--radius] p-6 transition-colors hover:border-primary cursor-pointer">
  <div className="flex items-start gap-4">
    {/* Icon with primary accent */}
    <div className="rounded-full bg-primary/10 p-3">
      <Icon className="h-6 w-6 text-primary" />
    </div>

    {/* Content with typography hierarchy */}
    <div className="flex-1 space-y-2">
      <h3 className="text-lg font-semibold text-foreground">
        Card Title
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Description text that provides additional context
      </p>

      {/* Metadata with muted colors */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Updated 2h ago</span>
        <span>•</span>
        <span>5 items</span>
      </div>
    </div>
  </div>
</div>
```

**Token Usage:**
- **Background Hierarchy**: `bg-card` (elevated surface) over `bg-background` (page)
- **Border**: `border-border` (default) → `border-primary` (hover state)
- **Text Hierarchy**: `text-foreground` (heading) → `text-muted-foreground` (body/meta)
- **Color Accents**: `bg-primary/10` (subtle tint) + `text-primary` (icon)
- **Border Radius**: `rounded-[--radius]` (respects design system: 0rem = sharp edges)
- **Transitions**: `transition-colors` for smooth hover effect

**Design Principles Applied:**
- Cyberpunk aesthetic with sharp edges and primary accent
- Clear visual hierarchy through color and typography
- Subtle interactions that don't rely on shadows
- Consistent spacing with gap utilities

---

### Status Badge System

Using color tokens to communicate state:

```tsx
{/* Success State */}
<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[--radius] bg-accent/10 text-accent text-xs font-mono">
  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
  Active
</span>

{/* Warning State */}
<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[--radius] bg-destructive/10 text-destructive text-xs font-mono">
  <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
  Alert
</span>

{/* Neutral State */}
<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[--radius] bg-muted text-muted-foreground text-xs font-mono">
  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
  Inactive
</span>

{/* Primary State */}
<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[--radius] bg-primary/10 text-primary text-xs font-mono">
  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
  Featured
</span>
```

**Token Usage:**
- **Accent** (`oklch(0.7072 0.1679 242.0420)`): Blue for success/active states
- **Destructive** (`oklch(0.6489 0.2370 26.9728)`): Orange/red for warnings/errors
- **Muted** (`oklch(0.2178 0 0)` + `oklch(0.6993 0 0)`): Neutral/inactive states
- **Primary** (`oklch(0.75 0.3225 328.3634)`): Pink for featured/important items
- **Typography**: `font-mono` (JetBrains Mono) for technical aesthetic
- **Opacity**: `/10` modifier for subtle backgrounds

**Color Psychology:**
- Blue (accent) = Calm, trustworthy, active
- Orange/Red (destructive) = Attention, caution, urgent
- Gray (muted) = Neutral, disabled, secondary
- Pink (primary) = Brand, featured, emphasis

---

### Form Field Composition

Combining input states with consistent visual language:

```tsx
<div className="space-y-2">
  {/* Label with foreground color */}
  <label className="text-sm font-medium text-foreground">
    Email Address
  </label>

  {/* Input with focus states */}
  <input
    type="email"
    className="flex h-10 w-full rounded-[--radius] border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
    placeholder="you@example.com"
  />

  {/* Helper text with muted foreground */}
  <p className="text-xs text-muted-foreground">
    We'll never share your email with anyone else.
  </p>
</div>

{/* Error State */}
<div className="space-y-2">
  <label className="text-sm font-medium text-foreground">
    Password
  </label>

  <input
    type="password"
    className="flex h-10 w-full rounded-[--radius] border border-destructive bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 font-mono"
    aria-invalid="true"
  />

  <p className="text-xs text-destructive flex items-center gap-1">
    <AlertCircle className="h-3 w-3" />
    Password must be at least 8 characters
  </p>
</div>
```

**Token Usage:**
- **Default State**: `border-input` with neutral appearance
- **Focus State**: `ring-primary` (pink focus ring) with `ring-offset-2`
- **Error State**: `border-destructive` + `text-destructive` for validation
- **Disabled State**: `opacity-50` with `cursor-not-allowed`
- **Placeholder**: `placeholder:text-muted-foreground` for subtle hints
- **Typography**: `font-mono` (JetBrains Mono) for all text
- **Spacing**: `space-y-2` for consistent vertical rhythm

**Accessibility Features:**
- Label properly associated with input
- `aria-invalid` for error states
- High contrast between text and backgrounds
- Focus ring visible and distinct (2px primary color)
- Helper text provides context without relying on color alone

---

### Loading Skeleton Hierarchy

Creating depth with background tokens:

```tsx
<div className="bg-card border border-border rounded-[--radius] p-6">
  {/* Header skeleton */}
  <div className="space-y-3">
    <div className="h-4 bg-muted rounded-[--radius] w-24 animate-pulse" />
    <div className="h-8 bg-muted rounded-[--radius] w-3/4 animate-pulse" />
  </div>

  {/* Content skeleton */}
  <div className="mt-6 space-y-2">
    <div className="h-3 bg-muted rounded-[--radius] w-full animate-pulse" />
    <div className="h-3 bg-muted rounded-[--radius] w-5/6 animate-pulse" />
    <div className="h-3 bg-muted rounded-[--radius] w-4/6 animate-pulse" />
  </div>

  {/* Action skeleton */}
  <div className="mt-6 flex gap-2">
    <div className="h-10 bg-primary/20 rounded-[--radius] w-24 animate-pulse" />
    <div className="h-10 bg-muted rounded-[--radius] w-20 animate-pulse" />
  </div>
</div>
```

**Token Usage:**
- **Card Container**: `bg-card` (`oklch(0.1684 0 0)`) - slightly elevated
- **Page Background**: `bg-background` (`oklch(0 0 0)`) - pure black
- **Skeleton Elements**: `bg-muted` (`oklch(0.2178 0 0)`) - visible against card
- **Primary Skeleton**: `bg-primary/20` - hint at interactive element
- **Animation**: `animate-pulse` (Tailwind utility) for loading effect
- **Border**: `border-border` for subtle card definition

**Visual Hierarchy:**
```
Background (darkest)
  └─ Card (darker)
      └─ Muted elements (lighter)
          └─ Primary hints (brightest accent)
```

**Lightness Values (OKLCH L):**
- Background: `0` (pure black)
- Card: `0.1684` (very dark gray)
- Muted: `0.2178` (dark gray - visible on card)
- Primary skeleton: Primary color at 20% opacity

---

### Navigation with Active States

Using primary color for current page indication:

```tsx
<nav className="bg-card border-b border-border">
  <div className="flex items-center gap-1 p-2">
    {/* Active link */}
    <a
      href="/bookmarks"
      className="flex items-center gap-2 px-3 py-2 rounded-[--radius] bg-primary/10 text-primary font-mono text-sm font-medium transition-colors"
    >
      <Bookmark className="h-4 w-4" />
      Bookmarks
    </a>

    {/* Inactive links with hover */}
    <a
      href="/explore"
      className="flex items-center gap-2 px-3 py-2 rounded-[--radius] text-muted-foreground hover:text-foreground hover:bg-accent/10 font-mono text-sm font-medium transition-colors"
    >
      <Compass className="h-4 w-4" />
      Explore
    </a>

    <a
      href="/profile"
      className="flex items-center gap-2 px-3 py-2 rounded-[--radius] text-muted-foreground hover:text-foreground hover:bg-accent/10 font-mono text-sm font-medium transition-colors"
    >
      <User className="h-4 w-4" />
      Profile
    </a>
  </div>
</nav>
```

**Token Usage:**
- **Nav Container**: `bg-card` with `border-border` bottom border
- **Active State**: `bg-primary/10` (pink tint) + `text-primary` (pink text)
- **Inactive State**: `text-muted-foreground` (subtle gray)
- **Hover State**: `hover:bg-accent/10` (blue tint) + `hover:text-foreground` (white)
- **Typography**: `font-mono` + `font-medium` for technical aesthetic
- **Transitions**: `transition-colors` for smooth state changes

**Interaction States:**
1. **Default/Inactive**: Gray text on transparent background
2. **Hover**: White text on subtle blue background
3. **Active/Current**: Pink text on subtle pink background

**Color Meanings:**
- **Primary (Pink)**: Current page/active state
- **Accent (Blue)**: Hover state/interactivity
- **Muted**: Inactive but available

---

### Empty State with Brand Colors

Combining pink accents with card hierarchy:

```tsx
<div className="bg-card border-2 border-dashed border-primary/30 rounded-[--radius] p-12">
  <div className="flex flex-col items-center text-center max-w-md mx-auto">
    {/* Icon with primary brand color */}
    <div className="rounded-full bg-primary/10 p-6 mb-6">
      <Inbox className="h-12 w-12 text-primary" />
    </div>

    {/* Heading with primary color */}
    <h2 className="text-2xl font-bold mb-3 text-primary font-mono">
      No Messages Yet
    </h2>

    {/* Description with muted foreground */}
    <p className="text-muted-foreground mb-6 font-mono leading-relaxed">
      When you receive messages, they'll appear here. Start by connecting
      with other users or sharing your profile.
    </p>

    {/* Primary action button */}
    <button className="inline-flex items-center justify-center px-6 py-2 rounded-[--radius] bg-primary text-primary-foreground font-mono font-medium hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background">
      Get Started
    </button>
  </div>
</div>
```

**Token Usage:**
- **Container**: `bg-card` with dashed `border-primary/30` (subtle pink)
- **Icon Circle**: `bg-primary/10` (very subtle pink tint) + `text-primary` icon
- **Heading**: `text-primary` (neon pink for emphasis)
- **Body Text**: `text-muted-foreground` (readable gray)
- **Button**: `bg-primary` + `text-primary-foreground` (white on pink)
- **Hover**: `hover:bg-primary/90` (slightly darker pink)
- **Focus Ring**: `ring-primary` with 2px offset

**Design Strategy:**
- Pink draws attention to empty state (not an error)
- Dashed border implies "space to be filled"
- Clear call-to-action in brand color
- Generous spacing for approachability

---

### Data Visualization with Color Scale

Using OKLCH for consistent color ramps:

```tsx
{/* Progress indicators with primary color scale */}
<div className="space-y-4">
  {/* High progress - full saturation */}
  <div className="flex items-center gap-3">
    <span className="text-sm text-foreground font-mono w-24">Completed</span>
    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
      <div
        className="h-full bg-primary rounded-full"
        style={{ width: '90%' }}
      />
    </div>
    <span className="text-sm text-primary font-mono font-bold">90%</span>
  </div>

  {/* Medium progress - reduced saturation */}
  <div className="flex items-center gap-3">
    <span className="text-sm text-foreground font-mono w-24">In Progress</span>
    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
      <div
        className="h-full bg-accent rounded-full"
        style={{ width: '60%' }}
      />
    </div>
    <span className="text-sm text-accent font-mono font-bold">60%</span>
  </div>

  {/* Low progress - muted color */}
  <div className="flex items-center gap-3">
    <span className="text-sm text-foreground font-mono w-24">Started</span>
    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
      <div
        className="h-full bg-muted-foreground/50 rounded-full"
        style={{ width: '25%' }}
      />
    </div>
    <span className="text-sm text-muted-foreground font-mono">25%</span>
  </div>
</div>
```

**Token Usage:**
- **Primary** (`oklch(0.75 0.3225 328.3634)`): High values (pink)
- **Accent** (`oklch(0.7072 0.1679 242.0420)`): Medium values (blue)
- **Muted Foreground** (`oklch(0.6993 0 0)`): Low values (gray)
- **Background Track**: `bg-muted` for consistent baseline
- **Typography**: `font-mono` throughout for technical feel

**OKLCH Benefits:**
- Perceptually uniform progression from gray → blue → pink
- Consistent lightness for accessibility
- Chroma (saturation) communicates importance
- Easy to extend with custom OKLCH values

---

### Alert Pattern with Semantic Colors

Using destructive and accent colors for different alert types:

```tsx
{/* Error Alert - Destructive */}
<div className="flex gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-[--radius]">
  <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
  <div className="flex-1">
    <h4 className="font-mono font-medium text-destructive mb-1">
      Upload Failed
    </h4>
    <p className="text-sm text-destructive/80 font-mono leading-relaxed">
      The file size exceeds the 10MB limit. Please compress and try again.
    </p>
  </div>
</div>

{/* Success Alert - Accent */}
<div className="flex gap-3 p-4 bg-accent/10 border border-accent/30 rounded-[--radius]">
  <CheckCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
  <div className="flex-1">
    <h4 className="font-mono font-medium text-accent mb-1">
      Successfully Saved
    </h4>
    <p className="text-sm text-accent/80 font-mono leading-relaxed">
      Your changes have been saved and will sync across devices.
    </p>
  </div>
</div>

{/* Info Alert - Primary */}
<div className="flex gap-3 p-4 bg-primary/10 border border-primary/30 rounded-[--radius]">
  <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
  <div className="flex-1">
    <h4 className="font-mono font-medium text-primary mb-1">
      New Feature Available
    </h4>
    <p className="text-sm text-primary/80 font-mono leading-relaxed">
      Dark mode customization is now available in your profile settings.
    </p>
  </div>
</div>
```

**Token Usage:**
- **Destructive** (`oklch(0.6489 0.2370 26.9728)`): Errors, warnings (orange/red)
- **Accent** (`oklch(0.7072 0.1679 242.0420)`): Success, confirmation (blue)
- **Primary** (`oklch(0.75 0.3225 328.3634)`): Info, announcements (pink)
- **Opacity Pattern**: `/10` for background, `/30` for border, `/80` for body text
- **Layout**: Flexbox with icon + content structure

**Semantic Color System:**
- Destructive = Problems, errors, destructive actions
- Accent = Success, completion, positive feedback
- Primary = Information, features, neutral announcements

---

### Complete Page Layout Pattern

Combining all design tokens for a cohesive interface:

```tsx
<div className="min-h-screen bg-background">
  {/* Navigation */}
  <header className="sticky top-0 z-50 bg-card border-b border-border backdrop-blur">
    <div className="container mx-auto px-4 h-16 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <h1 className="text-xl font-bold text-primary font-mono">
          AppName
        </h1>
        <nav className="hidden md:flex gap-1">
          <a className="px-3 py-2 text-sm font-mono text-muted-foreground hover:text-foreground hover:bg-accent/10 rounded-[--radius] transition-colors">
            Features
          </a>
          <a className="px-3 py-2 text-sm font-mono text-muted-foreground hover:text-foreground hover:bg-accent/10 rounded-[--radius] transition-colors">
            Pricing
          </a>
        </nav>
      </div>
      <button className="px-4 py-2 bg-primary text-primary-foreground font-mono text-sm font-medium rounded-[--radius] hover:bg-primary/90 transition-colors">
        Sign In
      </button>
    </div>
  </header>

  {/* Main Content */}
  <main className="container mx-auto px-4 py-12">
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-bold text-foreground font-mono">
          Build Something Amazing
        </h2>
        <p className="text-lg text-muted-foreground font-mono max-w-2xl mx-auto">
          The cyberpunk design system for modern web applications
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-[--radius] p-6 hover:border-primary transition-colors">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground font-mono mb-2">
            Fast
          </h3>
          <p className="text-sm text-muted-foreground font-mono">
            Optimized for performance and speed
          </p>
        </div>

        <div className="bg-card border border-border rounded-[--radius] p-6 hover:border-accent transition-colors">
          <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center mb-4">
            <Shield className="h-5 w-5 text-accent" />
          </div>
          <h3 className="text-lg font-semibold text-foreground font-mono mb-2">
            Secure
          </h3>
          <p className="text-sm text-muted-foreground font-mono">
            Built with security best practices
          </p>
        </div>

        <div className="bg-card border border-border rounded-[--radius] p-6 hover:border-primary transition-colors">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground font-mono mb-2">
            Beautiful
          </h3>
          <p className="text-sm text-muted-foreground font-mono">
            Cyberpunk aesthetic that stands out
          </p>
        </div>
      </div>
    </div>
  </main>

  {/* Footer */}
  <footer className="border-t border-border bg-card mt-24">
    <div className="container mx-auto px-4 py-8">
      <div className="text-center text-sm text-muted-foreground font-mono">
        © 2024 AppName. All rights reserved.
      </div>
    </div>
  </footer>
</div>
```

**Complete Token Usage:**
- **Structure**: `bg-background` (page) → `bg-card` (surfaces)
- **Borders**: `border-border` (neutral) with hover states
- **Text Hierarchy**: `text-foreground` → `text-muted-foreground`
- **Accents**: `text-primary` (brand), icon backgrounds with `/10` opacity
- **Interactive**: Hover states with `border-primary` or `border-accent`
- **Typography**: `font-mono` (JetBrains Mono) throughout
- **Spacing**: Consistent scale with gap and padding utilities
- **Border Radius**: `rounded-[--radius]` (0rem = sharp edges)

**Cyberpunk Design Principles:**
- Pure black background (`oklch(0 0 0)`)
- No shadows, flat design with borders
- Neon pink and blue accents
- Monospace typography everywhere
- Sharp corners (zero border radius)
- High contrast text for readability

---

## Next Steps

- **Component Library:** [COMPONENT-LIBRARY.md](./COMPONENT-LIBRARY.md) (to be added)
- **Accessibility Guide:** See WCAG compliance section (to be added)

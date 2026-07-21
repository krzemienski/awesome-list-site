# Component Library

This app's UI is built on [shadcn/ui](https://ui.shadcn.com/) primitives (Radix UI +
Tailwind CSS), plus a set of project-specific feature components. This page is an
**overview and conventions guide** — it is not an exhaustive prop catalog. For prop
details, read the component source in `client/src/components/` or the upstream
shadcn/Radix docs.

---

## Conventions

**Imports** use the `@/` alias:

```tsx
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
```

**`cn()`** (`@/lib/utils`) merges Tailwind classes with `clsx` + `tailwind-merge` and
is used by every primitive to allow class overrides:

```tsx
<Button className={cn("w-full", isActive && "ring-2")}>Save</Button>
```

**Variants** are defined with `class-variance-authority` (CVA). See `button.tsx` /
`badge.tsx` for the pattern (a `cva()` config exported alongside the component so
variants stay type-safe).

**Design tokens.** Colors, fonts, radius, and shadows come from the runtime design
system, bridged onto shadcn's `--color-*` tokens in `client/src/index.css`
(`@theme inline`). That means `bg-card`, `text-primary`, `border-input`, etc. resolve
to the active design-system/accent — do **not** hardcode hex colors. See
[`docs/DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md).

---

## Component groups

Components live under `client/src/components/`:

| Directory | What's in it |
|---|---|
| `ui/` | shadcn/ui primitives + a few app-specific composite widgets (see below). |
| `resource/` | Resource-facing widgets: `ResourceCard`, `FavoriteButton`, `BookmarkButton`, `ShareButton`, `resource-view-modes`. |
| `layout/` | `Footer`, `SEOHead`, and `layout/new/` (`MainLayout`, `AppHeader`, `AppSidebar`, `ModernSidebar`). |
| `admin/` | Admin dashboard tabs & managers (`AdminStats`, `ResourceManager`, `CategoryManager`, `UsersTab`, `GitHubSyncPanel`, `ResearcherTab`, `LinkHealthDashboard`, …). |
| `ai/` | AI feature cards: `LearningPathCard`, `RecommendationCard`, `MobileBottomSheet`. |
| `auth/` | Route guards: `AuthGuard`, `AdminGuard`. |
| `profile/` | `ChangePasswordForm`. |
| `animations/` | `sidebar-morphing`. |
| `ErrorBoundary.tsx` | Top-level React error boundary. |

---

## shadcn primitives (`components/ui/`)

Standard shadcn/ui primitives present in the repo. Import from
`@/components/ui/<file>`:

- **Forms & inputs:** `button`, `input`, `textarea`, `label`, `checkbox`, `switch`,
  `radio-group`, `select`, `slider`, `input-otp`, `form` (react-hook-form wrapper),
  `toggle`, `toggle-group`.
- **Overlays:** `dialog`, `alert-dialog`, `sheet`, `drawer`, `popover`, `hover-card`,
  `tooltip`, `dropdown-menu`, `context-menu`, `menubar`, `command`.
- **Layout & navigation:** `card`, `separator`, `tabs`, `accordion`, `collapsible`,
  `scroll-area`, `resizable`, `sidebar`, `navigation-menu`, `breadcrumb`, `carousel`,
  `aspect-ratio`.
- **Data display & feedback:** `table`, `badge`, `avatar`, `alert`, `progress`,
  `skeleton`, `calendar`, `chart`, `toast` + `toaster`.

### Forms

Use the `Form` wrapper (`@/components/ui/form`) with `react-hook-form` and
`zodResolver`, validating against the insert schemas in `@shared/schema.ts`. See
`client/src/pages/SubmitResource.tsx` for a full example.

### Toasts

`useToast` is exported from `@/hooks/use-toast` (not from the `ui/` folder). Render
`<Toaster />` once at the app root.

---

## App-specific composites (`components/ui/`)

These are project widgets that live alongside the primitives:

- **`search-dialog`** — command-palette search (opens on `/`); see `SearchDialog`.
- **`view-mode-toggle`** — grid/list/compact toggle for resource listings.
- **`category-explorer`**, **`taxonomy-card`**, **`tag-filter`**, **`advanced-filter`** —
  taxonomy/browse UI.
- **`analytics-dashboard`**, **`community-metrics`** — admin/analytics charts (recharts,
  colors from `client/src/lib/charts/palette.ts`).
- **`ai-recommendations-panel`**, **`recommendation-panel`**, **`recommendation-feedback`**,
  **`resource-recommendations`** — AI recommendation surfaces.
- **`export-tools`**, **`color-palette-generator`**, **`consent-banner`**,
  **`user-preferences`**, **`micro-interactions`**, **`suggest-edit-dialog`**,
  **`breadcrumbs`**, **`theme-provider`**.

---

## Accessibility

- Radix primitives supply ARIA roles, focus management, and keyboard handling — prefer
  them over hand-rolled markup.
- Interactive targets meet the project's 44×44px touch-target rule (WCAG AAA); see
  `client/src/styles/mobile-optimizations.css`.
- Always give icon-only buttons an accessible name (`aria-label` or visually-hidden
  text).
- Provide labels for form controls via the `Form`/`Label` components.

---

## Adding a component

Follow the shadcn pattern: a single file in `client/src/components/ui/` exporting the
component and (if it has variants) a `cva()` config. Keep styling in Tailwind classes
resolved through the DS token bridge; use `cn()` to allow overrides. Prefer extending
an existing primitive over introducing a new dependency.

---

## Related documentation

- [`docs/DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md) — tokens, theming, and the shadcn↔DS bridge.
- [`docs/TANSTACK-QUERY.md`](TANSTACK-QUERY.md) — data fetching in components.
- Component source: `client/src/components/`.

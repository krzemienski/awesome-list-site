# Awesome Video — Claude Design Redesign Brief

> **Source of truth for the redesign.** Every page below is keyed to a real screenshot in `screenshots/production/` so you (or any agent) can compare the current cyberpunk look side-by-side with the proposed Claude-style direction.

---

## 1. Why we are redesigning

The current site uses a **pure-black cyberpunk theme**: JetBrains Mono everywhere, neon-pink/cyan accents, zero border-radius, no shadows, monospaced everything. It is striking but it is also high-friction for reading long descriptions, scanning 1,953 resources, and onboarding non-technical users.

The new direction is **"Claude design"** — the warm, editorial, conversational aesthetic of Anthropic's Claude.ai. The goal is the same data, but the experience should feel like a curated reading library rather than a hacker terminal.

---

## 2. Design system — current vs. target

| Token | Current (Cyberpunk) | Target (Claude) |
|---|---|---|
| Background | `oklch(0 0 0)` pure black | `#F5F4ED` warm cream (`oklch(0.97 0.01 85)`) |
| Surface | Same as background | `#FFFFFF` paper white with 1px warm border |
| Primary text | `#FFFFFF` | `#2C2A26` near-black warm |
| Secondary text | `#888888` | `#6B6862` warm gray |
| Primary accent | Neon pink `oklch(0.7 0.3 350)` | Claude coral `#D97757` |
| Secondary accent | Neon cyan | Muted clay `#C9A57B` |
| Success / warning / error | Saturated neons | Muted naturals (sage, amber, terracotta) |
| Border-radius | `0rem` (sharp) | `0.5rem` cards, `0.375rem` inputs, `9999px` pills |
| Shadow | None | Soft warm shadows: `0 1px 2px rgb(0 0 0 / 0.04), 0 4px 12px rgb(0 0 0 / 0.04)` |
| Heading font | JetBrains Mono | **Tiempos Headline** or fallback **Source Serif 4** |
| Body font | JetBrains Mono | **Inter** or system sans |
| Mono font | JetBrains Mono | Keep JetBrains Mono only inside `<code>` |
| Theme modes | Dark only | Light (default) + Dark (warm dark, not pure black) |
| Density | Tight, terminal | Generous whitespace, 24/32/48 spacing scale |

**Component ground rules**
- Cards: white surface, 1px `#E8E4D8` border, soft shadow on hover only, 12–16 px padding, 8 px radius.
- Buttons: pill shape, coral primary, ghost secondary, no neon glows.
- Sidebar: cream surface (slightly darker than page), serif section labels, no badges shouting in red — counts in muted gray pills.
- Tables / lists: zebra-strip with `#FAF8F1`, generous row height (52 px), serif column headers small-caps.
- Empty states: friendly serif headline + one-sentence helper — never a terminal-style ASCII glyph.

---

## 3. Page-by-page walkthrough

For each page: **what it shows today**, **how it works**, **what the redesign should change**.

### 3.1 Home — `01_home.png` — `/`

**Today.** Black hero with title "Awesome Video" and subtitle "1,953 hand-picked tools, libraries, and tutorials..." Two pill CTAs (Browse Categories / Random Resource). A stats strip (`1,953 resources`, `9 categories`, `Open source`). A 3×3 grid of category cards with neon icons and resource counts. Left sidebar lists the 9 categories with badge counts.

**How it works.** Categories are pulled from `/api/categories` (database-backed). The hero CTAs route to `/category/{slug}` and `/random`. Sidebar is the same hierarchy used on every page.

**Redesign.**
- Replace the black hero with a cream "magazine cover" hero: large serif headline (`Curated video infrastructure, in one place.`) and one-line lede.
- Drop the pill CTAs to a single coral primary button + a quiet text link.
- Stats strip becomes inline serif numerals, not pill chips.
- Category grid uses paper-white cards with a small coral icon, serif title, sans description, and a muted count chip in the corner.
- Sidebar: replace neon counts with right-aligned `123` in muted gray.

### 3.2 About — `02_about.png` — `/about`

**Today.** Long-scroll page: hero ("About Awesome Video"), Mission card, Tech Stack chips, Open Source notice, and a footer-style stats strip.

**How it works.** Static page rendered from `client/src/pages/About.tsx`.

**Redesign.**
- Convert into a **two-column editorial layout**: left = serif body copy with proper paragraph rhythm; right = sticky "At a glance" rail with the stats and the tech stack as small monospace chips.
- Remove the boxed "card" feel — let prose breathe on cream paper.

### 3.3 Advanced features — `03_advanced.png` — `/advanced`

**Today.** A 2×2 grid of feature cards (Resource Explorer, Performance Metrics, Export Tools, AI Recommendations) plus a "Power User Tools" rail with neon icons.

**How it works.** Each card links to the relevant tool (explorer, export, AI panel).

**Redesign.**
- Keep the 2×2 grid but make each card a paper tile with a coral leading icon, serif h3, and a muted `Open →` text link instead of a glowing button.
- "Power User Tools" becomes a single horizontal strip of icon + label, no boxes.

### 3.4 Learning Journeys — `04_learning_journeys.png` — `/journeys`

**Today.** Header "Learning Journeys" with description, then a grid of 5 journey cards (Beginner / Intermediate / Advanced badges, hours, resource count).

**How it works.** Pulls from `/api/learning-journeys`. Each card routes to `/journey/:id`.

**Redesign.**
- Card layout becomes a **catalogue**: serif title, level shown as a small word ("Beginner") not a colored chip, hours and resource count as inline meta.
- Add a faint background swatch per level (sage / clay / coral) instead of badges.

### 3.5 Journey detail — `05_journey_detail.png` — `/journey/6`

**Today.** Title "Video Streaming Fundamentals", green "Beginner" pill, meta row, login prompt, and an empty "Learning Path" section.

**How it works.** `/api/learning-journeys/:id` returns the journey + ordered steps. Empty state shown when zero steps.

**Redesign.**
- Move the level badge to a small caption above the title.
- Replace the "Please log in to start..." admonition box with a soft cream callout — coral border-left, no icon shouting.
- Empty learning-path becomes a friendly serif sentence, not a boxed warning.

### 3.6 Login — `06_login.png` — `/login`

**Today.** Centered card with email/password fields, "Sign In" button, and three SSO buttons (Replit, Google, GitHub).

**How it works.** Posts to `/api/auth/login`. SSO redirects through Replit Auth.

**Redesign.**
- Two-column split: left = serif marketing pitch ("Welcome back to Awesome Video"); right = the form.
- Coral primary button. SSO buttons become outline pills with the brand monogram on the left.
- Move "Forgot password?" / "Create account" links to the bottom in muted text.

### 3.7 Submit Resource (auth gate) — `07_submit_resource_authgate.png` — `/submit`

**Today.** A boxed warning that says "Sign in required" with a coral "Sign In" button.

**How it works.** Route renders the auth gate when `useAuth().isAuthenticated === false`. Logged-in users see the multi-step submission form.

**Redesign.**
- Replace the boxed warning with a centered serif headline ("Submit a resource"), a one-sentence description, and the sign-in button — no scary alert frame.
- For the authenticated form (not screenshotted), apply Form-component styling pass: serif labels, soft inputs with 1px borders, helper text in muted italic.

### 3.8 Theme Settings — `08_theme_settings.png` — `/settings/theme`

**Today.** Two grids: "Font" (5 options including Cyberpunk Mono, Modern Sans, etc.) and "Color Theme" (5 swatches incl. Pure Black Cyberpunk, Hacker Green, Synthwave Purple…).

**How it works.** Stores preference in localStorage and applies CSS variables.

**Redesign.**
- This page **stays** but becomes the home of the new system. Add a "Claude (default)" theme as the first swatch and make it the default.
- Keep cyberpunk as an **opt-in** theme for nostalgia, but reset all new users to Claude.
- Re-skin the swatches: each preview tile shows a tiny mock card in that theme's palette, not just a color block.

### 3.9–3.17 Category pages — `09_…` through `17_…` — `/category/:slug`

**Today.** Title (e.g. "Encoding & Codecs"), big resource counter (`114`), a "Default" sort dropdown, "Showing 114 of 114 resources", and a 3-column grid of resource cards. Each card has a title, one-line description, and an external-link icon. Sidebar shows expanded subcategory tree with badge counts.

**How it works.** Data via `/api/categories/:slug/resources`. Resource cards open the external URL in a new tab unless they are DB-backed (then they go to `/resource/:id`).

**Redesign.**
- Title becomes a serif h1; the giant counter chip becomes a small caption underneath ("114 resources · sorted by popularity").
- Add **view-mode toggle** (grid / list / compact) prominently on the right — use the existing ToggleGroup.
- Cards: white paper, 1px warm border, 16 px padding, hover lift + faint coral underline on the title. Show favicon + tags row.
- Sidebar subcategory tree: indent with thin vertical guide lines, counts right-aligned in muted gray.
- Add a sticky toolbar at top with sort + filter + view toggle; current page jams them into different rows.

### 3.18 Subcategory — `18_subcategory_ai-ml-tools.png` — `/subcategory/:slug`

**Today.** Same chrome as category page, just one level deeper. Breadcrumb shows `Home › Subcategory › Ai Machine Learning Tools`.

**Redesign.**
- Breadcrumb becomes serif italic, separators are `·` not `›`.
- Add a "Back to {Parent Category}" text link beneath the breadcrumb (currently buried).

### 3.19–3.20 Sub-subcategory — `19_sub-subcategory_hls.png`, `20_sub-subcategory_dash.png` — `/sub-subcategory/:slug`

**Today.** Three-deep breadcrumb (`Protocols & Transport › Adaptive Streaming › HLS`). Otherwise identical card grid.

**Redesign.**
- Add a small "Sibling protocols" rail at the top — for HLS, show DASH / CMAF / Low-Latency Streaming as quick chips. This is a real navigation gap today.

### 3.21 Resource detail — `21_resource_detail.png` — `/resource/:id`

**Today.** Page for a single DB-backed resource (e.g. "MPEG Standards Documentation"). Shows favicon, title, description, tags, and an external-link button.

**How it works.** `/api/resources/:id` returns full record including `metadata` (OG image, scraped description, tags). Related resources from the same category are also fetched.

**Redesign.**
- **Magazine layout**: hero band with the OG image (or muted cream placeholder) bleeding to edge; serif title overlaid; tags below as small caps.
- Two-column body: left = description, scraped excerpt, tags; right = sticky meta card (Source, Added, Category, External link as primary coral button, "Suggest Edit" as text link).
- Related Resources rail below as a horizontal scroll of small cards.

### 3.22 404 Not Found — `22_404_not_found.png` — `/this-route-does-not-exist`

**Today.** Boxed warning card with "404 Page Not Found" and "Did you forget to add the page to the router?".

**Redesign.**
- Friendly serif "We can't find that page." + a one-sentence apology + a coral "Back to home" button. Drop the developer-facing line entirely.

### 3.23 Authenticated areas (not screenshotted)

Behind login: `/profile`, `/bookmarks`, `/admin` (with 11 tabs), and the populated `/submit` form.

**How they work.**
- `/profile` — user info, role, joined date.
- `/bookmarks` — list of saved resources.
- `/admin` — tab registry in `client/src/pages/AdminDashboard.tsx`. Tabs include Categories, Subcategories, Sub-subcategories, Pending Resources, Pending Edits, Users, Audit, Export, Database, GitHub Sync, Link Health, Researcher, Stats, Enrichment.

**Redesign principles for admin.**
- Move from neon dashboard to **library catalogue**: white paper cards on cream, serif section headers, table rows at 52 px with zebra cream stripes.
- Tab bar becomes a left-rail vertical list (more tabs = better as a side menu than a horizontal scroll).
- Keep dense data tables readable: small monospace numerals, generous row padding, sticky header, cream sub-bar on hover.

---

## 4. Component-level translation map

When implementing, swap the following:

| Current class / token | Replace with |
|---|---|
| `bg-black` everywhere | `bg-background` (cream) |
| `font-mono` on body / headings | `font-serif` for h1–h3, `font-sans` for body, `font-mono` only for `<code>` |
| `rounded-none` | drop entirely; rely on theme `--radius: 0.5rem` |
| Neon pink `oklch(0.7 0.3 350)` | `--primary: oklch(0.66 0.14 38)` (Claude coral) |
| Neon cyan accent | `--accent: oklch(0.78 0.08 75)` (clay) |
| `text-pink-400 hover:text-pink-300` glow | `text-primary hover:underline underline-offset-4` |
| Sidebar `bg-black border-pink-900/30` | `bg-sidebar border-r border-border` |
| Card without shadow | `shadow-sm hover:shadow-md transition-shadow` |
| Pill badges with bright fills | Outline pills: `border border-border text-muted-foreground bg-transparent` |

CSS variables to set in `client/src/index.css` `:root`:

```css
:root {
  --background: oklch(0.97 0.01 85);
  --foreground: oklch(0.20 0.01 60);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.20 0.01 60);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.20 0.01 60);
  --primary: oklch(0.66 0.14 38);          /* Claude coral */
  --primary-foreground: oklch(0.98 0 0);
  --secondary: oklch(0.94 0.02 80);
  --secondary-foreground: oklch(0.30 0.02 60);
  --muted: oklch(0.94 0.02 80);
  --muted-foreground: oklch(0.45 0.02 60);
  --accent: oklch(0.78 0.08 75);           /* Clay */
  --accent-foreground: oklch(0.20 0.01 60);
  --destructive: oklch(0.55 0.18 28);      /* Terracotta */
  --border: oklch(0.90 0.02 75);
  --input: oklch(0.90 0.02 75);
  --ring: oklch(0.66 0.14 38);
  --radius: 0.5rem;
  --sidebar: oklch(0.95 0.02 82);
  --sidebar-foreground: oklch(0.30 0.02 60);
  --sidebar-border: oklch(0.88 0.02 75);
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-serif: 'Source Serif 4', 'Tiempos Headline', Georgia, serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

A matching **warm dark mode** should live in `.dark`:
```css
.dark {
  --background: oklch(0.17 0.01 60);   /* warm charcoal, not pure black */
  --foreground: oklch(0.95 0.01 80);
  --card: oklch(0.20 0.01 60);
  --primary: oklch(0.72 0.13 38);
  /* …rest mirrors above with inverted lightness */
}
```

---

## 5. Rollout plan (suggested order)

1. **Foundations** — update `client/src/index.css` tokens, swap fonts in `index.html`, add Claude theme to `/settings/theme`.
2. **Primitives** — restyle Button, Card, Badge, Input, Sidebar, Breadcrumb, Toggle in `client/src/components/ui/*` so they read the new tokens (most already do; only the cyberpunk overrides need to come out).
3. **Public pages** — Home, About, Advanced, Journeys, Journey detail, Login, Theme settings.
4. **Catalogue pages** — Category, Subcategory, Sub-subcategory, Resource detail (these share the most layout code).
5. **Auth-gated pages** — Profile, Bookmarks, Submit form.
6. **Admin** — tab registry refactor to left rail, then per-tab pass.
7. **404 + small states** — last polish pass.

Each step should land behind the new theme being **default** but with the cyberpunk theme still selectable in `/settings/theme`, so power users do not lose their look.

---

## 6. Acceptance criteria

The redesign is done when:

- [ ] Default theme is Claude (cream + coral + serif). Cyberpunk is opt-in.
- [ ] All 22 pages above render in the new system with no leftover `bg-black` / `font-mono` / `rounded-none` overrides.
- [ ] Light and warm-dark modes both pass WCAG AA contrast for body text and AAA for headings.
- [ ] Every interactive element keeps its 44×44 px touch target.
- [ ] Mobile layouts (400 px) and tablet (768 px) still work — no horizontal scroll, sidebar still collapses.
- [ ] Existing keyboard shortcut (`/` for search, `⌘K`) still works.
- [ ] No regression in the admin panel's data tables.

---

## 7. How to use this document as a prompt

Paste the whole file (or sections 2 + 3 + 4) into a fresh agent task with this preamble:

> You are redesigning the Awesome Video Resource Viewer to match the "Claude" aesthetic described in `screenshots/production/DESIGN-BRIEF.md`. Use the `screenshots/production/INDEX.md` and the 22 PNGs there as the visual baseline of the current state. Implement section 5's rollout plan one stage at a time, opening a Canvas mockup for each public page before touching production code. Acceptance criteria are in section 6.

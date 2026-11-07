# Verify scout: what "the site looks correct" means (visual, read-only)

Scope: criteria an agent can check by eye and with read-only browser inspection
(screenshot, a11y snapshot, `evaluate_script` reading computed styles). No scripts,
no pixel gates; the gates were deleted in `b4040bfe` (2026-10-11). Sources were read
on 2026-10-25 at HEAD `5a4e0d87`. Where a doc and the shipping CSS disagree, the CSS
wins. Section 0 lists the disagreements so the skill doesn't inherit them.

---

## 0. Doc drift you must not encode (code wins)

| Stale claim | Where | What ships |
|---|---|---|
| "5 systems × 10 accents" | `docs/DESIGN-SYSTEM.md:4`; the deleted verify skill throughout (terminal/brutalist/swiss) | 2 systems: Editorial and Geist (`DESIGN-SYSTEM.md:70-82`, `.agents/memory/two-design-systems.md:7-8`, `client/src/lib/design-system.ts:89-90`) |
| `applyDesignSystem` makes "no inline style writes, ever" | `DESIGN-SYSTEM.md:43-45` | It writes about 36 tokens into `<html style>` (`client/public/ds/design-system.js:177-188`; the boot comment at `client/index.html:302`). Inline `--*` on `<html>` is normal. |
| `--text-3` is 0.52 | `DESIGN-SYSTEM.md:117,122`; deleted `rulebook-drift.md:67` | **0.49** in both systems (`client/src/lib/design-system.ts:96-99`, patched in at boot at `client/index.html:336-338`; artifact `docs/07-color.md:7-10`). The canonical sheet still says 0.4 (`design-system.css:19`) but is overridden. |
| Page `h1`s use `.display-h` | `DESIGN-SYSTEM.md:141-142`, `docs/AGENTS.md:55-57,120` | Page `h1`s use **`.page-title`**: body face, weight 700, -0.027em tracking, 1.1 leading (`client/src/styles/app-bridge.css:106-114`; `.agents/memory/page-title-face.md:5-8`; artifact `docs/06-typography.md:19-30`). There are 29 `h1.page-title`. `.display-h` is only on state panels (`client/src/App.tsx`, `client/src/pages/not-found.tsx`). |
| `.page contents` wrapper; atmosphere on `body` | `replit.md:122` (divergence #2) | `<div class="page app-shell-page">` is a real flex box (`MainLayout.tsx:216-219`, `client/src/styles/shell/layout.css:3-9`). The atmosphere paints as `.page`'s background (`design-system.css:80-86`). |
| Sidebar is the shadcn fixed panel offset by `top-[var(--header-height)]`; wordmark hidden below `lg` | `replit.md:124` (divergence #4) | A custom `.av-sidebar-shell`, `position: sticky; top: var(--header-height)` (`shell/sidebar-shell.css:9-22`). The wordmark hides only at ≤480px (`shell/header.css:89-91`). |
| "Pure black cyberpunk, JetBrains Mono throughout, zero radius" | `replit.md:156-158` | Obsolete; ignore it entirely. |
| Sidebar is "280/56" at every width | brief, `docs/AGENTS.md:98` | 280px desktop, **240px at 768–1024** (`shell/sidebar.css:129-133`), hidden at ≤767px (`shell/sidebar.css:178-182`) |

---

## 1. Per-width checklist

The default is Editorial × Crimson for a guest with fresh storage. Each line gives what
correct looks like, then the read-only check. ("ES" = `evaluate_script`.)

### 1440 × 900 (desktop)

**Shell**
- [ ] **Header:** full-width, 60px tall, sticky at the top, z 30, translucent with a 14px backdrop blur (`shell/header.css:3-11`, `app-bridge.css:46`). From left to right: a 28px crimson "AV" tile with a soft accent glow, the `AWESOME.VIDEO` mono wordmark at 11px/700, breadcrumbs, the search pill, and the auth controls (`header.css:22-28`, `replit.md:124`). The search pill is 44px tall and 240–360px wide, showing a label, a `text-3` count tail and a ⌘K kbd (`header.css:41-45`). There is **no** hamburger/sidebar trigger above 1024px (`shell/sidebar.css:190-194`).
  - ES: `document.querySelector('.app-canonical-header').getBoundingClientRect().height === 60`.
- [ ] **Sidebar:** 280px, starting below the header (top = 60), sticky, a translucent `--bg` panel at 88% with a hairline right border (`sidebar-shell.css:9-31`). If the user collapsed it, it becomes a 56px icon rail with no brand (`sidebar-shell.css:197-200`, `AppSidebar.tsx:670`). The active category shows a 2px accent left rail (`10-components.md:276-278`). Counts are mono `text-3`.
  - ES: `getComputedStyle(document.querySelector('.av-sidebar-shell')).width` → `"280px"`, or `"56px"` with `.av-sidebar-rail-compact`.
- [ ] **Content column:** max 1240px (admin: 1400px, left-anchored), 48px/40px padding (`app-bridge.css:47-50`, `shell/layout.css:35-47`). Resource detail is also left-anchored (`styles/pages/resource.css:2-5`).
- [ ] **Footer:** a sibling of `<main>` with a hairline-topped meta strip, `text-3` 10.5–11px meta (`app-bridge.css:255-269`). Absent on admin (`MainLayout.tsx:271`).

**General**
- [ ] **No horizontal overflow** (see the method in §2.1).
- [ ] **Targets ≥ 44×44 px** for standalone controls; inline text links ≥ 24px (`docs/AGENTS.md:76-77`, `DESIGN-SYSTEM.md:331`).
- [ ] **Focus visible:** pressing Tab shows a 2px solid crimson outline offset 2px on every interactive role (3px offset inside the header) (`app-bridge.css:142-151`, `header.css:57`). The first Tab reveals a crimson 44px "Skip to main content" chip at top-left (`app-bridge.css:116-140`, `MainLayout.tsx:210`).
- [ ] **Accent discipline:** at most one accent moment per surface and roughly 8 or fewer per viewport. Allowed uses: primary action, active nav, eyebrows, live dot, focus ring, selection, a key chart point, `em`/serif-italic in a title, and the brand tile (`DESIGN-SYSTEM.md:296-299`, `07-color.md:108-127`). Everything else is ink. Never two filled primaries side by side (`10-components.md:48`).
- [ ] **Ink tiers:** headings and key labels in `--text` (#f4f3ee); body copy in `--text-2` (66%); only meta (timestamps, counts, captions) in `--text-3` (49%); `--text-4` (22%) only decorative. No paragraph in tier 3 or 4 (`DESIGN-SYSTEM.md:300-303`).
- [ ] **Page title face:** the `h1` is set in Inter 700 and reads as tight, bold sans, not Fraunces serif (`app-bridge.css:109-114`). Fraunces italic appears only on accent words inside a title (`.serif-italic`, crimson) and on state-panel/404 titles (`page-title-face.md:5`). The home index title is mono (`HomePresentation.tsx:615`).
- [ ] **Fonts loaded:** Inter (body), Fraunces (display/italic accents) and JetBrains Mono (eyebrows, chips, counts, kbd) are all real faces, not Georgia, system-ui or Menlo (`DESIGN-SYSTEM.md:126-138`, `index.html:281-282`).
- [ ] **Dark colour scheme:** native scrollbars, `<select>` popups, date inputs and checkboxes render dark (`index.css:82-84`, `index.html:5`).
- [ ] **Atmosphere:** a faint warm crimson wash in the top-right corner at the top of the page, and a faint violet wash at the bottom-left of the *document* (near the footer, not the viewport). There is a fine film-grain texture everywhere (overlay blend, 0.32) (`design-system.js:60-65`, `design-system.css:87-92`). No page paints an opaque background over it (`docs/AGENTS.md:97-99`).
- [ ] **Cards** (`ResourceCard`, `TaxonomyCard`, `data-ds="card-hover"`): `--surface` fill, `--border` hairline, 12px radius. On hover they lift 2px, the border goes to `--border-strong`, the fill to `--surface-2`, and a soft drop shadow appears over 220ms (`design-system.css:130-143`, `09-motion.md:116`). Titles are clamped and never exceed their clamp (`.agents/memory/line-clamp-anchor.md`). Tags show at most 4, then `+N` (`08-spacing-layout.md:184-185`).
- [ ] **Chips:** a pill radius, `--surface` fill, hairline border, mono **UPPERCASE** at 10.5px with 0.6px tracking in `--text-2` (`design-system.css:226-240`). `chip.accent` is crimson text on an 8% crimson wash. Status chips are always #34d08c / #ffb84d / #ff5c7a and are never re-themed (`design-system.css:246-248`).
- [ ] **Dialogs:** a black 80% backdrop; content centred, max 512px (`max-w-lg`), `--bg-2` fill (`bg-popover`), 12px radius, `--shadow-lg`, and a 44×44 close button at top-right. Tall content scrolls inside, capped at `100dvh-4rem`. Long URLs wrap rather than widen the dialog (`components/ui/dialog.tsx:79,88`).
- [ ] **Toasts:** stacked bottom-right, max 420px wide, lifted above any consent bar by `--app-bottom-inset` (`components/ui/toast.tsx:24`). Each is an `li[data-state].system-toast` (`styles/pages/system-overlays.css:113`).
- [ ] **Consent banner** (first visit only): a sticky bottom row at every width. It is in flow, so it never covers the footer, even at first paint before scrolling. Scrolled to the end, the last row of content (the footer, or an admin tab's last table row and its buttons) sits fully above it, and back-to-top and toasts are lifted above it by `--app-bottom-inset`. "Skip to main content" stays the first Tab stop (`index.css:95-114`, `.agents/memory/app-shell-bottom-bar.md:17-23`).

### 820 × 1180 (tablet)

- [ ] **Header** is still 60px (`MainLayout.tsx:207`: 56px below 768, 60px from 768). The **menu button appears** at 44×44 (`header.css:60-64`). The search pill is 180px and shows the short word "Search" plus the ⌘K kbd, with the count tail hidden (`header.css:65-79`). The wordmark is still visible (it hides only at ≤480px).
- [ ] **Sidebar stays visible at 240px** *and* the menu button opens the drawer. That dual navigation is intended (`.agents/memory/tablet-dual-navigation.md:10-12`, `shell/sidebar.css:127-133`). At 240px, category names wrap rather than ellipsize, and the footer's "indexed · live" words become sr-only with only the dot showing (`sidebar.css:135-162`).
- [ ] **Drawer** (open it with the menu button): it slides in from the left over 280ms, is 86% wide with a max of 340px, sits over a black 60% backdrop, and carries the brand row (`shell/drawer.css:9-62`, `replit.md:124`). Esc and backdrop click both close it (`10-components.md:295-298`).
- [ ] The content column keeps its 40px gutter, with no clipped chips or tabs and no squeezed grid. The tablet squeeze was a past bug (`MainLayout.tsx:185-190`).
- [ ] Everything in the 1440 general list still holds.

### 390 × 844 (phone)

- [ ] **Header is 56px** with 14px side padding (`header.css:92-93`), and the mobile 56px header is a documented divergence (`replit.md:124`). It shows the logo tile only (no wordmark), a 44×44 icon-only search button, a 44px avatar-only user pill, and the menu button (`header.css:89-99`).
- [ ] **No sidebar at all** (`sidebar.css:178-182`), and no icon rail on phone. Navigation comes only from the drawer: 86% of 390 ≈ 335px, under the 340px cap (`drawer.css:41,51`).
- [ ] The content gutter is 14–24px (`18-launch-checklist.md:38`, `08-spacing-layout.md:68-72`), and content is single column.
- [ ] **Consent banner** is the same sticky bottom row as at 1440, never in flow at the top. With it open, scroll a long page or admin tab to the end: the last row and its buttons, back-to-top and toasts all sit above its top edge (`styles/pages/system-overlays.css:18-21`).
- [ ] **Dialogs** are `calc(100vw - 2rem)` = 358px wide. Sheets use `w-3/4` (`sheet.tsx:41-43`).
- [ ] **Toasts** are full width at the bottom, never covering the header (`toast.tsx:18-24`).
- [ ] **Targets:** every header and drawer row is ≥ 44px tall (`17-accessibility.md:208-214`).
- [ ] Content scrolls *under* the 56px sticky header by design (`.agents/memory/tester-finding-retractions.md:16`).

---

## 2. Read-only browser checks (how, and the traps)

General capture discipline:
- Use `navigate_page`, then `wait_for` a real element, then wait about 2.5s more. Don't use `networkidle`, which can hang on this app (`.agents/memory/headless-e2e-gotchas.md:17`).
- In prod, `.page` is prerendered before the bundle runs. Wait until `typeof window.applyDesignSystem === 'function'` **and** `#ssr-seo-hold` is gone before judging (`fonts-check-vs-load.md:15-19`, `headless-capture-determinism.md` "Do not trust selectors before React mounts", `index.html:413-433`).
- Prefer **viewport** screenshots. A full-page capture rebuilds the FontFaceSet and can paint an all-black sticky-header band (`fonts-check-capture-rebuild.md:5`, `headless-e2e-gotchas.md:11-13`). Pages taller than 16384px degrade silently (`chromium-capture-ceiling.md`).
- Use `resize_page` for widths and reload after resizing. Some layout decisions are taken at mount: `MainLayout.tsx:191` uses `window.innerWidth >= 1024` for `defaultOpen`.
- Scroll with `window.scrollTo({top:N, behavior:'instant'})`. The site uses `scroll-behavior: smooth` (`styles/scrolling-fix.css:3`), so a plain scroll followed by a measurement reads the pre-scroll position (`headless-e2e-gotchas.md:20`).
- On a fresh profile, look at the consent banner first, then dismiss it with Decline before any click near the bottom of the page (`headless-e2e-gotchas.md:6-8`).

### 2.1 No horizontal overflow
- **Trap:** `html`, `body` and `#root` all carry `overflow-x: clip !important` (`styles/scrolling-fix.css:2-27`). Overflow is **silently clipped**: you get no scrollbar, and content is just cut off at the right edge. Don't wait for a scrollbar.
- Screenshot: look at the right edge for cut-off text, half-visible buttons, or a card that runs off the edge.
- ES (authoritative), listing offenders:
  ```js
  [...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>innerWidth+1&&getComputedStyle(e).position!=='fixed'}).slice(0,20).map(e=>[e.tagName,e.className,e.dataset.testid,Math.round(e.getBoundingClientRect().right)])
  ```
  Then drop offenders that sit inside an ancestor with `overflow-x` auto/scroll/hidden/clip whose own right edge is inside the viewport: those are scroll regions (admin tab strip, tables), not page overflow. On /admin/researcher at 390, 75 raw hits were all contained (2026-10-25).
  Also run `document.documentElement.scrollWidth > innerWidth` as a secondary signal. It may stay `false` under `clip`, so it is not sufficient alone.
- Run it inside every open dialog too: `[role=dialog][data-state=open]` → `el.scrollWidth <= el.clientWidth`. The known culprit is raw URL text directly inside a flex `<a>`, which gets `min-width:auto` (`.agents/memory/flex-anchor-min-width.md:6-10`).
- Ignore the closed drawer and the off-screen skip link (`top:-100px`). Filter out `position: fixed` elements and elements with `data-state="closed"`.

### 2.2 Shell geometry
- ES:
  ```js
  ({h:document.querySelector('.app-canonical-header')?.getBoundingClientRect().height, sb:getComputedStyle(document.querySelector('.av-sidebar-shell')).display+' '+getComputedStyle(document.querySelector('.av-sidebar-shell')).width, hh:getComputedStyle(document.querySelector('[data-sidebar="wrapper"],.page')).getPropertyValue('--header-height')})
  ```
  Expected values: 1440 → 60 / `flex 280px`; 820 → 60 / `flex 240px`; 390 → 56 / `display:none`. If the `--header-height` selector misses, read it from the SidebarProvider root instead, the element carrying the `[--header-height:…]` class.
- **Sticky header:** scroll 800px instantly, then check `document.querySelector('.app-canonical-header').getBoundingClientRect().top === 0`. A negative value means sticky is dead. In that case walk the ancestors for a computed `overflow` other than `visible`/`clip` (`.agents/memory/sticky-vs-overflow-hidden.md:21-23`, `MainLayout.tsx:260-265`). Check the sidebar the same way: its `top` should equal the header height.
- **Drawer:** use `click` on the menu button, then `wait_for` `.av-sidebar-drawer[data-state="open"]`, then screenshot. Before asserting anything else, wait for `data-state="open"` on *that* element, not just any `[role=dialog]` (`.agents/memory/dialog-open-locator-race.md`).

### 2.3 44px targets
Use this one probe and the triage below unchanged in every cycle, so two cycles' counts compare. Do not edit the probe for one page.
- ES (it skips `.sr-only`, `aria-hidden` and `inert` nodes, and in-viewport nodes covered by an overlay; `op` is the resting opacity):
  ```js
  [...document.querySelectorAll('a,button,[role=button],[role=tab],[role=menuitem],[role=option],input,select,[role=combobox],[role=checkbox],[role=radio],[role=switch]')].filter(e=>{if(e.closest('.sr-only,[aria-hidden=true],[inert]'))return false;const r=e.getBoundingClientRect(),s=getComputedStyle(e);if(!r.width||!r.height||s.visibility==='hidden'||(r.height>=44&&r.width>=44))return false;if(r.bottom<=0||r.top>=innerHeight)return true;const h=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return !!h&&(e.contains(h)||h.contains(e))}).map(e=>{const r=e.getBoundingClientRect();return [e.tagName,e.dataset.testid||e.getAttribute('aria-label')||e.textContent.trim().slice(0,30),Math.round(r.width),Math.round(r.height),'op '+getComputedStyle(e).opacity]})
  ```
- Triage each hit, in this order:
  1. Inline text links (in a sentence, footer or banner) need 24px, not 44px (WCAG 2.5.8 inline exception, `docs/AGENTS.md:77`).
  2. Accepted small controls are listed in §5.
  3. A hit under 24px fails unless WCAG 2.5.8's spacing exception holds: a 24px circle centred on it intersects no other target and no other target's circle.
  4. At 820 and 390 (touch), buttons, icon buttons, pills, tabs, pagination and menu items need 44px. A smaller one is a FAIL.
  5. A control at `op 0` is hover-reveal, hidden at rest. Touch has no hover, so it is a touch FAIL. Confirm it with a real tap (`click` on its snapshot uid under touch emulation) and record what the tap did.
- A wrapper hit area counts: measure the element under `elementFromPoint`, not the painted glyph.

### 2.4 Focus visible
- Use `press_key Tab` (real keyboard), then `take_screenshot`, and look for the crimson 2px ring with a visible gap.
- **Do not** call `el.focus()` and then read `getComputedStyle(el).outline`. It reads mid-transition values, and it reads `0px` while a ring is visible (`.agents/memory/verifying-css-states.md:21-35`, `tester-finding-retractions.md:8`). The screenshot pixels are authoritative.
- The skip link should be the first Tab stop: the crimson chip appears top-left. Pressing Enter moves focus to `main#main` (`MainLayout.tsx:256-258`).
- Inside an `inert` subtree, `tabIndex` stays ≥0. Prove a node is unreachable with a real Tab sequence instead (`verifying-css-states.md:44-45`).

### 2.5 Accent discipline
- Screenshot: count the crimson moments in the viewport, aiming for 8 or fewer. Look for two filled crimson buttons side by side, crimson body text, crimson on regular tags, or crimson chart series.
- ES (the probe-element method; the deleted skill's hex-substring snippet never matched, per deleted `rulebook-drift.md:37-56`):
  ```js
  const p=Object.assign(document.createElement('i'),{style:'color:var(--accent)'});document.body.append(p);const a=getComputedStyle(p).color;p.remove();const rgb=c=>(c.match(/[\d.]+/g)||[]).slice(0,3).join(',');[...document.querySelectorAll('body *')].filter(el=>{const r=el.getBoundingClientRect();if(!r.width||r.bottom<0||r.top>innerHeight)return false;const s=getComputedStyle(el);return [s.color,s.backgroundColor,s.borderTopColor].some(c=>rgb(c)===rgb(a)&&!/, 0\)$/.test(c))}).map(e=>[e.tagName,e.className.toString().slice(0,40),e.textContent.trim().slice(0,30)])
  ```
  This counts viewport-only hits. Nested hits inside one button or chip count as one moment. Small accent *text* uses `--accent-ink`, which is crimson mixed with 92% white in Editorial (`app-bridge.css:31,56`), so it won't match exact `--accent`. That is correct, so judge those by eye.

### 2.6 Ink tiers
- ES:
  ```js
  const t=(v)=>{const p=Object.assign(document.createElement('i'),{style:'color:var('+v+')'});document.body.append(p);const c=getComputedStyle(p).color;p.remove();return c};const t3=t('--text-3'),t4=t('--text-4');[...document.querySelectorAll('p,li')].filter(p=>p.textContent.trim().length>60&&[t3,t4].includes(getComputedStyle(p).color)).map(p=>p.textContent.trim().slice(0,60))
  ```
  This should return `[]`. Expect `t3` = `rgba(244, 243, 238, 0.49)`. A value of 0.4 means the boot correction did not run, which is a red flag (`index.html:336-338`). Strict string equality on raw `getPropertyValue` is unreliable, so always resolve through a probe (deleted `rulebook-drift.md:58-65`).

### 2.7 Page-title face
- ES:
  ```js
  [...document.querySelectorAll('main h1')].map(h=>{const s=getComputedStyle(h);return [h.className,s.fontFamily.split(',')[0],s.fontWeight,s.letterSpacing]})
  ```
  Expected: `page-title` → `Inter` (Editorial) or `Geist`, at `700`, about -0.027em (shown in px). Allowed exceptions: `home-index-title mono` → JetBrains Mono; `display-h` only on 404 and state panels → Fraunces 500; `submit-title` → body face (`styles/pages/submit.css:29-32`); and `sr-only` titles. Every route should render at least one `h1` (deleted verify-design-system §"Page-title sweep").
- By eye: the title is bold sans. If a serif-italic word is present, it is crimson Fraunces italic.

### 2.8 Fonts loaded
- Wait for `document.fonts.ready` **and** `document.getElementById('shell-webfonts').media === 'all'`. The link starts as `media="print"` and flips on load (`index.html:281-290`).
- ES: `await Promise.all(['700 16px Inter','500 16px Fraunces','italic 400 16px Fraunces','400 16px "JetBrains Mono"'].map(f=>document.fonts.load(f).then(a=>[f,a.length>0&&a.every(x=>x.status==='loaded')])))`. All should be `true`. Use `load()`, never `check()` (`.agents/memory/fonts-check-vs-load.md:5-12`, `fonts-check-capture-rebuild.md:5`).
- Take this proof **before** any full-page screenshot, and re-warm after one (`fonts-check-capture-rebuild.md:7`). On `/sign-in`, Clerk injects a late stylesheet that rebuilds the FontFaceSet, so take the proof about 2s after load (`fontfaceset-rebuild-on-stylesheet-insert.md:5-18`).
- By eye: compare Fraunces with Georgia. Fraunces has soft, high-contrast "wonky" italics; Georgia's are plain. Compare JetBrains Mono with Menlo: JetBrains has the taller x-height and a slashed or dotted zero. Category glyphs (⟁ etc.) must not render as tofu boxes (`.agents/memory/symbol-glyph-font-faces.md:5-9`).

### 2.9 Dark colour scheme
- ES: `[getComputedStyle(document.documentElement).colorScheme, document.querySelector('meta[name=color-scheme]')?.content]` → `["dark","dark"]`.
- By eye: open a native `<select>` or look at a scrollbar or checkbox. Each should be dark, never a light UA control (`.agents/memory/dark-only-color-scheme.md:19-23`).

### 2.10 System applied and atmosphere
- ES:
  ```js
  ({sys:document.documentElement.dataset.system, acc:document.documentElement.dataset.accent, bg:getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(), pageBg:getComputedStyle(document.querySelector('.page')).backgroundImage.slice(0,40), grain:getComputedStyle(document.querySelector('.grain')).opacity})
  ```
  Expected: `editorial` / `crimson` / `#000…` / starts with `radial-gradient` / `0.32` (deleted verify-design-system stages 1, 2 and 4).
- Screenshot at scrollY 0: a faint red glow in the top-right corner, and grain visible in flat black areas when zoomed. A flat, dead black page means the atmosphere is missing (deleted skill stage-11 table: "Page looks black/empty").

### 2.11 Cards and hover
- Use the chrome-devtools `hover` on a `[data-ds="card-hover"]`, wait at least 300ms (the transition is 220ms), then screenshot. Never read hover styles programmatically (deleted verify-design-system stage-7 browser note; `verifying-css-states.md:21-29`).
- ES (resting state):
  ```js
  const c=document.querySelector('[data-ds="card-hover"]');const s=getComputedStyle(c);[s.borderRadius,s.backgroundColor,s.borderTopColor]
  ```
  Expect `12px` in Editorial.
- Check card titles at 1024–1279px as well. That range is where the clamp failed before (`line-clamp-anchor.md:6`).

### 2.12 Chips
- ES: `[...document.querySelectorAll('[data-ds="chip"]')].slice(0,3).map(e=>{const s=getComputedStyle(e);return [s.fontFamily.split(',')[0],s.textTransform,s.borderRadius]})` → `JetBrains Mono`, `uppercase`, a pill radius in Editorial.
- A hand-rolled pill on a raw span is a finding. Any `Badge` variant is compliant (deleted verify-design-system "Same idea for the rest").

### 2.13 Dialogs and sheets
- Open one with a real click, then `wait_for` `[role="dialog"][data-state="open"]`, then screenshot. Check that the first and last items are actually hittable and not under the sticky header (`elementFromPoint` at the item centre returns the item). Check that the backdrop is opaque enough that page text doesn't show through (`verifying-css-states.md:8-19`).
- After closing, wait until `getComputedStyle(document.body).pointerEvents !== 'none'` before the next click (`.agents/memory/radix-dialog-close-lock.md:5-11`).
- Keyboard: Esc closes it, and Tab stays inside (`17-accessibility.md:183-189`).

### 2.14 Toasts
- Screenshot **immediately** after the triggering action, because toasts close after about 5s (`tester-finding-retractions.md:24`). Use the selector `li[data-state]`, not `ol li`, which matches the breadcrumb (`headless-e2e-gotchas.md:9`).
- Guest "Favorite" shows a non-modal toast. "Share" in mobile emulation hands off to Web Share instead (`tester-finding-retractions.md:12`).

### 2.15 A11y snapshot
- `take_snapshot`: confirm a single `main`, a `banner` header and a `contentinfo` footer (except on admin), and that every icon-only control has a name. Never hand-compute accessible names from DOM attributes (`.agents/memory/a11y-gate-hidden-probes.md:12`).
- The shell breadcrumb is sr-only by design. Judge it by a11y-tree membership, not by its width (`a11y-gate-hidden-probes.md:8-10`).

---

## 3. Per-system sanity

**Editorial × Crimson is the audited default.** The formal target is the shipped default only (`replit.md:149`, `DESIGN-SYSTEM.md:316-317`, `docs/AGENTS.md:92-93`). Everything in §1 and §2 is written for it. It is also the brand (`replit.md:107`).

**Geist: a glance, not an audit.** Switch as a **guest** with `window.applyDesignSystem('geist','cyan')` (or the picker while signed out). For a signed-in user, the picker writes server preferences and changes every later session's baseline (`.agents/memory/shared-account-theme-writes.md:5-8`). Restore with `applyDesignSystem('editorial','crimson')` afterwards (deleted verify-design-system stage 11). Then look for:
- The page **looks different, not broken**. Identical-looking pages across systems mean something is hardcoded (deleted skill stage-11 table).
- Body and display text are both Geist Sans. The page `h1` is Geist 700, and `.display-h` tightens to -0.04em (`DESIGN-SYSTEM.md:129-131`, `design-system.css:592`). **No italics anywhere**: `.serif-italic` renders upright, which is correct (`06-typography.md:137-160`).
- Chips are sentence case in the body face at weight 500, not mono caps (`design-system.css:597`).
- Card hover shows a 1px `--border-strong` ring plus a large soft shadow, with **no lift** (`design-system.css:593-595`, `09-motion.md:117`).
- No grain (opacity 0). The atmosphere is a faint white top vignette only (`design-system.js:113-115`, `DESIGN-SYSTEM.md:172-176`).
- The radius is 10px for cards and 6px for small elements (`DESIGN-SYSTEM.md:146-151`). The accent is cyan (the natural default) with black on-accent ink.
- Still dark, with the same shell geometry, 44px targets and focus ring.
- `--text-3` is `rgba(250,250,250,0.49)` (`design-system.ts:99`).

---

## 4. Visual red flags (these mean broken)

1. **Unstyled flash or unstyled page:** a white background, Times-like serif, blue underlined links, or an empty `--bg`. This means `/ds/design-system.css` didn't load (deleted verify-design-system stage 1). A first frame in Geist cyan, or with no `data-system` on `<html>`, is a pre-paint boot failure (`DESIGN-SYSTEM.md:312-313`). (A *white* first filmstrip frame is a false positive; see §5.)
2. **Light UA controls on the dark page** (white select popups or scrollbars): `color-scheme` is missing (`dark-only-color-scheme.md:19-23`).
3. **Two React copies:** console shows "Invalid hook call", and the page is blank or showing an error boundary. Every interactive surface fails at once. The cause is a second dev instance sharing `node_modules/.vite` (`.agents/memory/before-fix-proof-instance.md:8-9`).
4. **Stuck skeleton:** the pre-boot pulsing `.bsk` bars never get replaced (`index.html:405-445`). Or `#ssr-seo-hold`, a fixed full-screen overlay at z 2147483000, is still present after load, so you are looking at the prerender, not the app (`index.html:413-433`). Or a query skeleton spins forever with no error UI, from a 5xx retry loop (`.agents/memory/runtime-verification-lessons.md:7`).
5. **Content clipped at the right edge** with no scrollbar: overflow hidden by `overflow-x: clip` (§2.1). Long URLs that widen a dialog are the classic case (`flex-anchor-min-width.md`).
6. **The sticky header scrolls away**, or the sidebar scrolls with the page: an ancestor has `overflow: hidden/auto` (`sticky-vs-overflow-hidden.md`, `app-shell-bottom-bar.md:28-30`).
7. **Wrong shell for the width:** the sidebar shows at 390, no menu button at 820, a hamburger at 1440, or a 280px sidebar at 820 (`sidebar.css:129-194`).
8. **Font fallback:** Fraunces rendered as Georgia ("the magazine vibe collapses", deleted verify-design-system stage 9), mono labels in Menlo, or tofu boxes for category glyphs.
9. **Flat black page** with no top-right crimson wash and no grain, or a page with an opaque background covering the atmosphere (`docs/AGENTS.md:97-99`).
10. **Accent overuse:** two filled crimson buttons, crimson on every chip or tag, crimson body text, or multi-hue chart series. Charts should be the ink ramp plus one accent series (`docs/AGENTS.md:61-63`, `07-color.md:201-203`).
11. **Paragraph copy in `--text-3` or `--text-4`**, or `--text-3` measuring 0.4 (the boot correction didn't run).
12. **Page `h1` in Fraunces** where the page should use `.page-title` (a regression to `display-h`), or the reverse on 404 and state panels (`page-title-face.md`).
13. **Card titles exceeding their clamp** at 1024–1279px (`line-clamp-anchor.md`).
14. **The consent banner covering the footer** or the last table row at first paint (`app-shell-bottom-bar.md:17-23`), at any width.
15. **An overlay hidden under the header**, or page text showing through a menu or dialog surface (`verifying-css-states.md:8-19`).
16. **No visible ring after a real Tab press**, or a suppressed outline (`docs/AGENTS.md:122-123`).
17. **A removed system** (Terminal, Brutalist, Swiss) is rendering, or the picker offers it (`two-design-systems.md:13-16`).
18. **Status colours re-themed** (an "ok" chip in accent colour) (`DESIGN-SYSTEM.md:305-306`).

---

## 5. Known visual false positives (don't log these)

**Theme and colour**
- "Light mode is broken." The site is dark-only by design (`dark-only-color-scheme.md:5-28`). Print, however, *should* force light (`index.css:243-248`).
- A white first frame in a filmstrip is `about:blank` from before the response arrived, not a flash (`.agents/memory/filmstrip-prepaint-check.md:8-15`).
- Near-black intermediate captures are a capture-pipeline artifact. Judge by the settled capture (`tester-finding-retractions.md:17`).
- Phantom low contrast from axe or a computed-colour check at the first animation frame (opacity 0 under `fadeIn`). Wait two rAFs and await animations first (`.agents/memory/axe-first-frame-race.md:6-14`).
- Inline `--*` tokens in `<html style>`: this is how `applyDesignSystem` works (`design-system.js:177-188`).
- `--text-3` reading 0.49 rather than the 0.52 or 0.4 that the docs claim (§0).
- Small accent text not matching `--accent` exactly: it uses `--accent-ink` (`app-bridge.css:27-31,56-61`).

**Typography**
- A page `h1` in body-face Inter 700 rather than Fraunces is correct (`page-title-face.md:5-8`). Also correct: the resource-detail `h1` in the body face with 10px mono accent card labels; the taxonomy breadcrumbs as an 11px mono uppercase row; and the home index title in mono (deleted verify-design-system "Known composite chrome" and "Page-title sweep" sections).
- `document.fonts.check()` returning false for a face that visibly renders (`fonts-check-vs-load.md`, `fonts-check-capture-rebuild.md`).
- Fonts reading "unloaded" after a full-page screenshot, or about 1s after Clerk mounts on `/sign-in` (`fontfaceset-rebuild-on-stylesheet-insert.md`).
- Geist rendering "italic" text upright (`06-typography.md:158-160`).

**Layout and shell**
- The mobile header is 56px, not 60px (`replit.md:124`).
- At tablet widths a menu button shows *and* the 240px sidebar is visible (`tablet-dual-navigation.md`, `header.css:60-79`).
- Content scrolls under the sticky header at 375/390 (`tester-finding-retractions.md:16`).
- An all-black sticky-header band in a full-page capture while the live header paints fine. Re-capture the viewport (`headless-e2e-gotchas.md:11-13`).
- `body { overflow-x: hidden }` in the canonical sheet (`design-system.css:56`) is overridden by `clip !important` (`scrolling-fix.css:10-11`), so it is not a sticky killer.
- "Opening a Select jumps to top": a click issued during a smooth scroll. Use an instant scroll (`tester-finding-retractions.md:20`).
- The home page has no resource cards; it's a dashboard. Listing tag pills are filter chips, not links (`tester-finding-retractions.md:13-14`).
- A 404 route answers HTTP 404 *and* renders the design-system 404 page (deleted verify-design-system coverage matrix).

**Components and divergences** (`replit.md:121-126`, `DESIGN-SYSTEM.md:283-292`)
- Lots of raw `<button>` elements without `.btn`: that's shadcn working as designed.
- Secondary, ghost and destructive buttons and admin status badges keep plain shadcn styling. The brand tile stays rounded.
- The category-header count chip is neutral, not accent. The admin "Pending approvals" stat is in ink. Activity-feed actor names are `--text` at weight 500. These are deliberate accent-discipline divergences.
- The reference "nav links" are missing from the header: breadcrumbs, search and auth replace them by design.

**Targets and a11y**
- Accepted sub-44px controls on the 24px text-link floor: search "Clear recent" (24px), scrubbed-params Dismiss (32px), the Privacy page's inline cookie-settings link (24px), and in-card "+N more" tag expanders (deleted verify-design-system "Known composite chrome").
- The 44px floor versus 26–36px frozen controls on the design-system *artifact's* docs and showcase is an accepted residual (`accessible-floor-vs-frozen-controls.md:8-12`).
- A sr-only breadcrumb with width 0. The 1×1 `aria-hidden` native `<select>` that shadcn Select renders. `tabIndex >= 0` under `inert` (`a11y-gate-hidden-probes.md:8-12`, `verifying-css-states.md:44-45`).
- A focused control reporting `outline: 0px` while a ring is visible: it is mid-transition (`tester-finding-retractions.md:8`).
- Fractional border widths reading floored, e.g. 1.5px reported as 1px (`verifying-css-states.md:46-51`).
- CSSOM `cssRules` throwing SecurityError, so a rule looks "absent". Read the `<style>` textContent instead (`verifying-css-states.md:31-40`).

**Overlays and timing**
- `[role=dialog]` matching the *closing* sheet. Wait for `data-state="open"` on the target (`dialog-open-locator-race.md`).
- A click after a dialog closes "doing nothing" because the Radix `body{pointer-events:none}` lock is still releasing (`radix-dialog-close-lock.md`).
- Radix menu ArrowDown "not moving" when pressed too early, or cmdk highlight resetting while results debounce (`tester-finding-retractions.md:6-7`).
- "No toast" when the capture came after the ~5s lifetime (`tester-finding-retractions.md:24`).
- A dead click on `/submit` because the consent banner was over the button (`headless-e2e-gotchas.md:6-8`).
- A blank or empty `h1` right after a server restart is a cold-boot skeleton. Re-check once (`.agents/memory/audit-cold-boot-flake.md:5-9`).

/* =====================================================================
   DOCS CONTENT — PART 2 (Components, Patterns, Apply)
   ===================================================================== */

const H1b = ({ children }) => <h1 className="docs-h1">{children}</h1>;
const H2b = ({ children }) => <h2 className="docs-h2">{children}</h2>;
const H3b = ({ children }) => <h3 className="docs-h3">{children}</h3>;
const Pb  = ({ children }) => <p className="docs-p">{children}</p>;
const Leadb = ({ children }) => <p className="docs-lead">{children}</p>;
const ULb = ({ items }) => (
  <ul className="docs-ul">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
);
const Codeb = ({ children }) => (
  <div className="code-block" dangerouslySetInnerHTML={{ __html: children }} />
);
const Calloutb = ({ kind = 'NOTE', children }) => (
  <div className="callout"><strong>{kind}</strong>{children}</div>
);
const Surfaceb = ({ children, padded = true, style }) => (
  <div style={{
    border: 'var(--hairline-w) solid var(--border)',
    borderRadius: 'var(--radius)',
    background: 'var(--surface)',
    padding: padded ? 24 : 0, margin: '12px 0 24px',
    ...(style || {}),
  }}>{children}</div>
);
const Specb = ({ rows }) => (
  <div style={{ margin: '14px 0 24px', border: 'var(--hairline-w) solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
    {rows.map((r, i) => (
      <div key={i} style={{
        display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16, padding: '12px 16px',
        borderTop: i ? 'var(--hairline-w) solid var(--hairline)' : 'none', fontSize: 13,
      }}>
        <code className="mono" style={{ fontSize: 11.5, color: 'var(--accent)' }}>{r[0]}</code>
        <span style={{ color: 'var(--text-2)' }}>{r[1]}</span>
      </div>
    ))}
  </div>
);

/* ---------- 10 Buttons ---------- */
function ButtonsDoc() {
  return (
    <>
      <H1b>Buttons</H1b>
      <Leadb>Five variants. Same class API across systems — the system reshapes them.</Leadb>
      <Surfaceb>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn primary">Primary</button>
          <button className="btn">Default</button>
          <button className="btn ghost">Ghost</button>
          <button className="btn danger">Danger</button>
          <button className="btn icon ghost">⌘</button>
        </div>
      </Surfaceb>
      <H2b>Variants</H2b>
      <Specb rows={[
        ['.btn',          'Default — outlined, surface fill.'],
        ['.btn.primary',  'Primary action — accent fill (Editorial/Geist), accent outline+glow (Terminal), accent fill + offset shadow (Brutalist).'],
        ['.btn.ghost',    'Tertiary — transparent until hover.'],
        ['.btn.danger',   'Destructive — accent-tinted with danger affordance.'],
        ['.btn.icon',     '36×36 square. Combine with .ghost.'],
      ]} />
      <H2b>Anatomy</H2b>
      <Specb rows={[
        ['Padding',     '9px 16px (default), 36×36 (icon)'],
        ['Gap',         '8px between icon and label'],
        ['Font size',   '13px (12px in Brutalist with uppercase)'],
        ['Font weight', '500 default, 600 primary'],
        ['Radius',      'var(--radius-sm) — 0 in Terminal/Brutalist, 6 in Geist'],
      ]} />
      <H2b>Usage</H2b>
      <ULb items={[
        'One primary per surface. Never two primaries side-by-side.',
        'Destructive lives on the right of a row, separated by 16px+ from confirmations.',
        'Icon-only requires aria-label.',
      ]} />
      <Codeb>{`<span class="c-key">&lt;button</span> class=<span class="c-str">"btn primary"</span><span class="c-key">&gt;</span>Save<span class="c-key">&lt;/button&gt;</span>
<span class="c-key">&lt;button</span> class=<span class="c-str">"btn ghost"</span><span class="c-key">&gt;</span>Cancel<span class="c-key">&lt;/button&gt;</span>`}</Codeb>
    </>
  );
}

/* ---------- 11 Cards ---------- */
function CardsDoc() {
  return (
    <>
      <H1b>Cards</H1b>
      <Leadb>The container of everything. Three variants modulate hover.</Leadb>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, margin: '12px 0 24px' }}>
        <div className="card" style={{ padding: 20 }}>
          <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.18em', marginBottom: 8 }}>STATIC</div>
          <Pb>.card — no hover.</Pb>
        </div>
        <div className="card hoverable" style={{ padding: 20 }}>
          <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.18em', marginBottom: 8 }}>HOVERABLE</div>
          <Pb>Hover lifts it.</Pb>
        </div>
        <div className="card hoverable glow" style={{ padding: 20 }}>
          <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.18em', marginBottom: 8 }}>GLOW</div>
          <Pb>Adds accent halo.</Pb>
        </div>
      </div>
      <H2b>Anatomy</H2b>
      <Specb rows={[
        ['Padding',     '20-28px depending on density'],
        ['Border',      'var(--border-w) solid var(--border)'],
        ['Radius',      'var(--radius)'],
        ['Hover',       'translateY(-2px) + brighter border + shadow (Brutalist offsets, Geist glows, Swiss none)'],
      ]} />
      <H2b>Composition</H2b>
      <ULb items={[
        'Eyebrow at top (mono, 10px, accent or text-3).',
        'Title (display family for h-cards, body for utility cards).',
        'Body — one paragraph max. If you need more, use a detail page.',
        'Footer row of meta — keep to one line.',
      ]} />
      <Codeb>{`<span class="c-key">&lt;article</span> class=<span class="c-str">"card hoverable glow"</span><span class="c-key">&gt;</span>
  <span class="c-key">&lt;div</span> class=<span class="c-str">"eyebrow"</span><span class="c-key">&gt;</span>── 03 / Encoding<span class="c-key">&lt;/div&gt;</span>
  <span class="c-key">&lt;h3&gt;</span>FFmpeg<span class="c-key">&lt;/h3&gt;</span>
  <span class="c-key">&lt;p&gt;</span>Cross-platform A/V toolchain.<span class="c-key">&lt;/p&gt;</span>
<span class="c-key">&lt;/article&gt;</span>`}</Codeb>
    </>
  );
}

/* ---------- 12 Forms ---------- */
function FormsDoc() {
  return (
    <>
      <H1b>Forms</H1b>
      <Leadb>Three primitives: input, select, textarea. Wrap each in <code className="mono" style={{color:'var(--accent)'}}>.field</code>.</Leadb>
      <Surfaceb>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="field"><label>Label</label><input className="input" defaultValue="Default value" /></div>
          <div className="field"><label>Category</label><select className="select"><option>Encoding</option><option>Streaming</option></select></div>
          <div className="field" style={{ gridColumn: '1 / -1' }}><label>Description</label><textarea className="textarea" defaultValue="A complete cross-platform solution for A/V." /></div>
        </div>
      </Surfaceb>
      <H2b>Spec</H2b>
      <Specb rows={[
        ['.field',     'Wrapper — flex column, 8px gap, 12px label.'],
        ['.input',     'Single-line. 10×14px padding, 13px text.'],
        ['.select',    'Native select with the same chrome.'],
        ['.textarea',  'Min 96px height. Mono font (it\'s usually code/markdown).'],
        ['Focus ring', 'border-color → mix(accent 50%, border-strong).'],
      ]} />
      <H2b>Validation</H2b>
      <ULb items={[
        'Errors set border-color → var(--accent) on the danger accent.',
        'Helper text under input: 12px, var(--text-3) for hint, var(--accent) for error.',
        'Never use color alone — pair with iconography or an explicit error message.',
      ]} />
    </>
  );
}

/* ---------- 13 Navigation ---------- */
function NavDoc() {
  return (
    <>
      <H1b>Navigation</H1b>
      <Leadb>Sticky header, accordion sidebar, tabs, breadcrumbs. All baseline-aligned.</Leadb>
      <H2b>Header</H2b>
      <Specb rows={[
        ['Height',      '60px desktop, 56px mobile'],
        ['Background',  'mix(--bg 78% transparent) + 14px backdrop-blur'],
        ['Border',      'hairline bottom'],
        ['Items',       'logo, primary nav links (text-2 → text on hover), search, action group'],
      ]} />
      <H2b>Accordion sidebar</H2b>
      <Specb rows={[
        ['Width',       '280px desktop, 240px tablet, hidden on mobile (drawer)'],
        ['Item height', '46-50px'],
        ['Active mark', '2px accent left rail, glow in Editorial/Geist, hard in Brutalist/Swiss'],
        ['Sub items',   '7px y-padding, 1px translate-x on hover'],
      ]} />
      <H2b>Tabs</H2b>
      <Specb rows={[
        ['.tabs',       'Flex container, hairline bottom border'],
        ['.tab',        '12-16px padding, transparent → 2px accent underline when active'],
      ]} />
      <H2b>Mobile drawer</H2b>
      <ULb items={[
        '86% width (max 340px) sliding from left.',
        '280ms cubic-bezier slide.',
        'Backdrop is rgba(0,0,0,0.6) + 2px blur, click-to-dismiss.',
      ]} />
    </>
  );
}

/* ---------- 14 Lists ---------- */
function ListsDoc() {
  return (
    <>
      <H1b>List patterns</H1b>
      <Leadb>The unit of an awesome-list site. Get this right and the site is built.</Leadb>
      <H2b>Anatomy of a row</H2b>
      <Surfaceb padded={false}>
        <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 140px 100px', gap: 24, padding: '20px 22px', alignItems: 'baseline' }}>
          <code className="mono" style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.1em' }}>01</code>
          <div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 6, flexWrap: 'wrap' }}>
              <h4 style={{ fontSize: 16, fontWeight: 600 }}>FFmpeg</h4>
              <span className="chip muted" style={{ fontSize: 9.5, padding: '2px 7px' }}>encoding</span>
              <span className="chip muted" style={{ fontSize: 9.5, padding: '2px 7px' }}>cli</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
              A complete cross-platform solution to record, convert, and stream audio/video.
            </p>
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>★ 44.2k</div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'right' }}>2 days ago</div>
        </div>
      </Surfaceb>
      <H2b>Grid columns</H2b>
      <Specb rows={[
        ['Index',      '60px — mono, text-3, 0.1em tracking'],
        ['Content',    'flex 1 — title + tag chips inline + description'],
        ['Stat',       '140px — mono, e.g. ★ 44.2k'],
        ['Updated',    '100px right-aligned mono'],
      ]} />
      <H2b>Variations</H2b>
      <ULb items={[
        'Compact — hide description, single line, 56px row height.',
        'Detailed — add 2-line description + 4-tag cap + status chip.',
        'Card-grid — same fields, packed into 3-up cards instead of rows.',
      ]} />
      <Calloutb kind="HARD RULE">
        Tag chips never wrap to a third line. Cap at 4 visible chips, then "+N" overflow.
      </Calloutb>
    </>
  );
}

/* ---------- 15 Flows ---------- */
function FlowsDoc() {
  return (
    <>
      <H1b>Flow diagrams</H1b>
      <Leadb>Each system ships a flow-diagram grammar — see the Showcase → Flow Diagrams section for a live render in all five languages.</Leadb>
      <H2b>Primitives</H2b>
      <Specb rows={[
        ['Node',     'Process step. Filled surface, system-appropriate edge.'],
        ['Decision', 'Branch. Diamond (rotated 45°) in most systems, `&lt; ?&gt;` brackets in Terminal.'],
        ['Arrow',    'Edge between nodes. Straight in Geist/Brutalist/Swiss, slight curve in Editorial, ASCII `▶` in Terminal.'],
        ['Lane',     'Optional swim-lane divider. Dashed mono rule in Terminal, hairline elsewhere.'],
        ['Accent node', 'Highlighted current step or output. Accent fill or accent border + glow.'],
      ]} />
      <H2b>Per-system grammar</H2b>
      <Specb rows={[
        ['Editorial', 'Soft cards, classic diamonds, curved edges with serif edge labels.'],
        ['Terminal',  '`[&gt; NODE ]` brackets, `&lt; ? &gt;` decision, `▶` arrowheads, dashed lane rules.'],
        ['Geist',     '10px rounded blocks, thin straight arrows, mono labels.'],
        ['Brutalist', 'Hard 4px-offset shadows, rotated square diamonds, block arrowheads.'],
        ['Swiss',     '0.5px hairlines on a 32px grid, minimal diamond, no shadow.'],
      ]} />
      <H2b>When to use</H2b>
      <ULb items={[
        'Architecture diagrams — Source → Transcode → Format? → HLS/DASH → CDN.',
        'Onboarding state — gate, intermediate, success.',
        'Pipeline status dashboards — current node = accent.',
      ]} />
    </>
  );
}

/* ---------- 16 Page templates ---------- */
function PagesDoc() {
  return (
    <>
      <H1b>Page templates</H1b>
      <Leadb>Four canonical layouts. All share a sticky header, optional sidebar, and a centered content column.</Leadb>
      <H2b>Home — featured + categories</H2b>
      <ULb items={[
        'Hero with stats grid (5 columns of mono labels + display numbers).',
        'Featured row of 3-4 hoverable+glow cards.',
        'Category grid below — 8 cards, 2 rows.',
        'Activity rail at the right (recent additions).',
      ]} />
      <H2b>Category — filtered list</H2b>
      <ULb items={[
        'Header with breadcrumb + count + sort/filter chips.',
        'Sidebar accordion with subcategories.',
        'Main: list-pattern rows. Pagination at the bottom.',
      ]} />
      <H2b>Resource detail</H2b>
      <ULb items={[
        'Hero: name, eyebrow (category), tags, primary action.',
        'Stats strip (stars, last updated, license, language).',
        'Description (reading column, 640px max).',
        'Related resources (3-up cards).',
      ]} />
      <H2b>Submit / admin</H2b>
      <ULb items={[
        'Form-first. No sidebar. 760px max content.',
        'Multi-step with progress chips at the top.',
        'Preview card live-updating on the right at desktop, below at mobile.',
      ]} />
    </>
  );
}

/* ---------- 17 Density ---------- */
function DensityDoc() {
  return (
    <>
      <H1b>Data density</H1b>
      <Leadb>An indexed atlas needs density. Three modes per list view.</Leadb>
      <Specb rows={[
        ['Compact',  'Single line. 44-48px row. Title + 2 chips + stat. Use for power users.'],
        ['Default',  '2-line. 76-92px row. Title + chips + 1-line description.'],
        ['Detail',   '3-line. 110-130px row. Adds status, last update, owner.'],
      ]} />
      <H2b>Tables</H2b>
      <ULb items={[
        '11px uppercase mono header (text-3, 0.5px tracking).',
        '14px row content, 13px meta.',
        'Hairline between rows. Row hover = surface bg.',
        'Right-align numerics. Left-align text. Center status chips.',
      ]} />
      <H2b>Numerics</H2b>
      <ULb items={[
        'Always tabular (font-feature-settings tnum).',
        'Compact magnitudes: 44.2k, 1.3M, 9.6B.',
        'Use mono family for stats — never display.',
      ]} />
    </>
  );
}

/* ---------- 18 Integration ---------- */
function IntegrationDoc() {
  return (
    <>
      <H1b>Integrate the system</H1b>
      <Leadb>How to drop the system into a new app or an existing site.</Leadb>
      <H2b>The 4-file system</H2b>
      <Specb rows={[
        ['styles.css',           'Tokens, components, per-system skins.'],
        ['design-systems.jsx',   'The 5 system definitions, accents, applyDesignSystem().'],
        ['Fonts',                'Loaded via Google Fonts CSS — see <head> snippet below.'],
        ['Optional: layout.jsx', 'Header + Sidebar React components if you want them.'],
      ]} />
      <H2b>HTML scaffold</H2b>
      <Codeb>{`<span class="c-key">&lt;!DOCTYPE html&gt;</span>
<span class="c-key">&lt;html lang=<span class="c-str">"en"</span>&gt;</span>
<span class="c-key">&lt;head&gt;</span>
  <span class="c-key">&lt;meta</span> charset=<span class="c-str">"UTF-8"</span> /<span class="c-key">&gt;</span>
  <span class="c-key">&lt;meta</span> name=<span class="c-str">"viewport"</span> content=<span class="c-str">"width=device-width, initial-scale=1"</span> /<span class="c-key">&gt;</span>
  <span class="c-key">&lt;link</span> href=<span class="c-str">"https://fonts.googleapis.com/css2?family=Fraunces:ital@0;1&amp;family=Inter:wght@400;500;600;700&amp;family=JetBrains+Mono:wght@400;500;600&amp;display=swap"</span> rel=<span class="c-str">"stylesheet"</span><span class="c-key">&gt;</span>
  <span class="c-key">&lt;link</span> rel=<span class="c-str">"stylesheet"</span> href=<span class="c-str">"styles.css"</span><span class="c-key">&gt;</span>
<span class="c-key">&lt;/head&gt;</span>
<span class="c-key">&lt;body&gt;</span>
  <span class="c-key">&lt;div</span> class=<span class="c-str">"page"</span><span class="c-key">&gt;</span>
    <span class="c-key">&lt;div</span> class=<span class="c-str">"grain"</span><span class="c-key">&gt;&lt;/div&gt;</span>
    <span class="c-com">&lt;!-- your app --&gt;</span>
  <span class="c-key">&lt;/div&gt;</span>
  <span class="c-key">&lt;script</span> src=<span class="c-str">"design-systems.jsx"</span><span class="c-key">&gt;&lt;/script&gt;</span>
  <span class="c-key">&lt;script&gt;</span>
    applyDesignSystem(<span class="c-str">'editorial'</span>, <span class="c-str">'crimson'</span>);
  <span class="c-key">&lt;/script&gt;</span>
<span class="c-key">&lt;/body&gt;</span>
<span class="c-key">&lt;/html&gt;</span>`}</Codeb>
      <H2b>If you're React</H2b>
      <Pb>Wrap your app shell in a <code className="mono" style={{color:'var(--accent)'}}>useEffect</code> that calls <code className="mono" style={{color:'var(--accent)'}}>applyDesignSystem</code> on mount and on theme change. Persist to localStorage. Read pre-paint in a sync script.</Pb>
      <H2b>If you're a static site</H2b>
      <Pb>Paste the apply script in <code className="mono" style={{color:'var(--accent)'}}>&lt;head&gt;</code> directly above <code className="mono" style={{color:'var(--accent)'}}>&lt;/head&gt;</code> after the systems file. Read localStorage in the same inline script to set tokens before paint.</Pb>
    </>
  );
}

/* ---------- 19 Theming app ---------- */
function ThemingAppDoc() {
  return (
    <>
      <H1b>Theming an app</H1b>
      <Leadb>How the production app exposes the system to users.</Leadb>
      <H2b>Tweaks panel</H2b>
      <Pb>The app ships a Tweaks panel (toggled by the toolbar) with system + accent pickers. It uses the same <code className="mono" style={{color:'var(--accent)'}}>applyDesignSystem</code>.</Pb>
      <H2b>System defaults map</H2b>
      <Codeb>{`<span class="c-key">window.SYSTEM_DEFAULT_ACCENT</span> = {
  editorial: <span class="c-str">'crimson'</span>,
  terminal:  <span class="c-str">'matrix'</span>,
  geist:     <span class="c-str">'cyan'</span>,
  brutalist: <span class="c-str">'amber'</span>,
  swiss:     <span class="c-str">'orange'</span>,
};`}</Codeb>
      <H2b>UX rules</H2b>
      <ULb items={[
        'When a user picks a system without an explicit accent, default to the system\'s natural accent.',
        'If they\'ve manually picked an accent that doesn\'t match the system\'s natural, keep it.',
        'Persist both choices independently in localStorage.',
        'Do NOT auto-detect prefers-color-scheme: every system is dark; we don\'t serve a light variant.',
      ]} />
    </>
  );
}

/* ---------- 20 A11y ---------- */
function A11yDoc() {
  return (
    <>
      <H1b>Accessibility</H1b>
      <Leadb>Dark with confidence — but every system has to clear the bar.</Leadb>
      <H2b>Contrast</H2b>
      <Specb rows={[
        ['Body / bg',       '14:1 — far above WCAG AA.'],
        ['text-2 / bg',     '7-9:1 — passes AAA for normal text.'],
        ['text-3 / bg',     '4.6:1 — passes AA for normal text. Avoid for body copy.'],
        ['text-4 / bg',     '~2.7:1 — UI hints only, never readable copy.'],
        ['Accent / bg',     '6-9:1 — verify per accent before shipping.'],
      ]} />
      <H2b>Focus</H2b>
      <ULb items={[
        'Every interactive element shows a visible focus state — accent border + 2px outline.',
        'Skip links: hidden offscreen, visible on focus.',
        'Modals trap focus. ESC closes. Backdrop click closes.',
      ]} />
      <H2b>Motion</H2b>
      <ULb items={[
        'Honor prefers-reduced-motion: caret stops, dot stops, shimmer stops.',
        'No autoplaying video on background. No parallax.',
      ]} />
      <H2b>ARIA</H2b>
      <ULb items={[
        'Icon buttons have aria-label.',
        'Tabs: role="tablist" + role="tab" + aria-selected.',
        'Accordion: aria-expanded on header, aria-controls pointing at body.',
      ]} />
      <Calloutb kind="TEST">
        Run each system × each accent through axe-core or WAVE before shipping. Pay extra attention to Brutalist with Amber and Swiss with Orange — bright accents on near-pure-white tokens can trip warnings.
      </Calloutb>
    </>
  );
}

/* ---------- 21 Checklist ---------- */
function ChecklistDoc() {
  const sections = [
    { label: 'TOKENS', items: [
      'All five systems define ~36 tokens — no missing keys.',
      'No hex values or px numbers outside design-systems.jsx and the per-system skin section of styles.css.',
      'Default accent declared per system in SYSTEM_DEFAULT_ACCENT.',
    ]},
    { label: 'COMPONENTS', items: [
      'Every component reads tokens; none use hardcoded color/border values.',
      'Buttons: primary, default, ghost, danger, icon variants tested in all 5 systems.',
      'Cards: hoverable + glow tested.',
      'Inputs: focus state visible in every system × every accent.',
    ]},
    { label: 'LAYOUT', items: [
      'Mobile drawer works at <768px.',
      'Accordion sidebar scrolls independently.',
      'Header sticks correctly at top.',
      'Page padding 14-24px on mobile, 40-64px desktop.',
    ]},
    { label: 'MOTION', items: [
      'prefers-reduced-motion respected.',
      'No transition longer than 320ms (except indeterminate loops).',
      'Caret + live-dot + shimmer animations have .no-anim escape hatch.',
    ]},
    { label: 'A11Y', items: [
      'Body copy ≥14px; meta ≥11px.',
      'Focus visible on every interactive.',
      'Modals trap focus.',
      'Color contrast verified per system × per accent.',
    ]},
    { label: 'PERFORMANCE', items: [
      'Fonts: 1 display + 1 body + 1 mono per system, weight subsets only.',
      'CSS variables read pre-paint via inline script — no flash of default theme.',
      'Grain is SVG data URI; no external image asset.',
    ]},
  ];
  return (
    <>
      <H1b>Launch checklist</H1b>
      <Leadb>Run this before pushing the design system into a real product surface.</Leadb>
      {sections.map(s => (
        <div key={s.label} style={{ marginBottom: 28 }}>
          <H3b>{s.label}</H3b>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {s.items.map((it, i) => (
              <li key={i} style={{
                display: 'grid', gridTemplateColumns: '24px 1fr', gap: 10, padding: '10px 0',
                borderTop: 'var(--hairline-w) solid var(--hairline)',
                fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.5,
              }}>
                <span style={{
                  width: 16, height: 16, borderRadius: 3,
                  border: '1px solid var(--border-strong)',
                  background: 'var(--surface)', marginTop: 2,
                }} />
                <span>{it}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <Calloutb kind="DONE?">
        When every box is checked, you've shipped a system, not a stylesheet.
      </Calloutb>
    </>
  );
}

window.DOC_PAGES = Object.assign({}, window.DOC_PAGES_PART_1 || {}, {
  buttons: ButtonsDoc,
  cards: CardsDoc,
  forms: FormsDoc,
  navigation: NavDoc,
  lists: ListsDoc,
  flows: FlowsDoc,
  pages: PagesDoc,
  'data-density': DensityDoc,
  integration: IntegrationDoc,
  'theming-app': ThemingAppDoc,
  a11y: A11yDoc,
  checklist: ChecklistDoc,
});

// @ts-nocheck
import { ACCENTS } from "../../../../client/src/lib/design-system";
const SPACE_SCALE = [{name:'0',px:0},{name:'1',px:4},{name:'2',px:8},{name:'3',px:12},{name:'4',px:16},{name:'5',px:20},{name:'6',px:24},{name:'8',px:32},{name:'10',px:40},{name:'12',px:48},{name:'16',px:64},{name:'20',px:80}];
/* =====================================================================
   DOCS CONTENT — every page lives here
   ===================================================================== */

/* ---------- Helpers ---------- */
const H1 = ({ children }) => <h1 className="docs-h1">{children}</h1>;
const H2 = ({ children, id }) => <h2 className="docs-h2" id={id}>{children}</h2>;
const H3 = ({ children }) => <h3 className="docs-h3">{children}</h3>;
const P  = ({ children }) => <p className="docs-p">{children}</p>;
const Lead = ({ children }) => <p className="docs-lead">{children}</p>;
const UL = ({ items }) => (
  <ul className="docs-ul">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
);
const Code = ({ children }) => (
  <div className="code-block" dangerouslySetInnerHTML={{ __html: children }} />
);
const Callout = ({ kind = 'NOTE', children }) => (
  <div className="callout"><strong>{kind}</strong>{children}</div>
);

/* Shared: example surface for showing components */
const Surface = ({ children, padded = true, style }) => (
  <div style={{
    border: 'var(--hairline-w) solid var(--border)',
    borderRadius: 'var(--radius)',
    background: 'var(--surface)',
    padding: padded ? 28 : 0,
    margin: '12px 0 24px',
    ...(style || {}),
  }}>{children}</div>
);

const Grid2 = ({ children, gap = 14 }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap, margin: '14px 0 24px' }}>{children}</div>
);

const Spec = ({ rows }) => (
  <div style={{ margin: '14px 0 24px', border: 'var(--hairline-w) solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
    {rows.map((r, i) => (
      <div key={i} style={{
        display: 'grid', gridTemplateColumns: '200px 1fr',
        gap: 16, padding: '12px 16px',
        borderTop: i ? 'var(--hairline-w) solid var(--hairline)' : 'none',
        fontSize: 13,
      }}>
        <code className="mono" style={{ fontSize: 11.5, color: 'var(--accent)' }}>{r[0]}</code>
        <span style={{ color: 'var(--text-2)' }}>{r[1]}</span>
      </div>
    ))}
  </div>
);

/* ---------- 01 Overview ---------- */
function Overview() {
  return (
    <>
      <H1>Awesome.Video Design System</H1>
      <Lead>
        A token-based, multi-personality dark design system. Five distinct visual languages share one
        component contract — switch them with a single attribute.
      </Lead>
      <Grid2>
        <div className="card" style={{ padding: 22 }}>
          <div className="mono" style={{ fontSize: 10, color: 'var(--accent)', letterSpacing: '0.18em', marginBottom: 8 }}>5 SYSTEMS</div>
          <P>Editorial, Terminal, Geist, Brutalist, Swiss. Each commits hard to a personality.</P>
        </div>
        <div className="card" style={{ padding: 22 }}>
          <div className="mono" style={{ fontSize: 10, color: 'var(--accent)', letterSpacing: '0.18em', marginBottom: 8 }}>~36 TOKENS</div>
          <P>Per system. Surface, ink, type metrics, shape, shadow, atmosphere — exposed as CSS vars.</P>
        </div>
        <div className="card" style={{ padding: 22 }}>
          <div className="mono" style={{ fontSize: 10, color: 'var(--accent)', letterSpacing: '0.18em', marginBottom: 8 }}>10 ACCENTS</div>
          <P>One chromatic moment per page. Each system nudges toward a natural default.</P>
        </div>
        <div className="card" style={{ padding: 22 }}>
          <div className="mono" style={{ fontSize: 10, color: 'var(--accent)', letterSpacing: '0.18em', marginBottom: 8 }}>FLAT BLACK</div>
          <P>Every system uses pure #000000. Atmosphere is layered above, never colored backgrounds.</P>
        </div>
      </Grid2>
      <H2>What's in here</H2>
      <UL items={[
        <span><strong style={{color:'var(--text)'}}>Foundations</strong> — token contract, theming protocol, typography, color, spacing, motion.</span>,
        <span><strong style={{color:'var(--text)'}}>Components</strong> — buttons, cards, forms, navigation, list patterns. Every component reads tokens; no hardcoded values.</span>,
        <span><strong style={{color:'var(--text)'}}>Patterns</strong> — flow diagrams, page templates, density rules.</span>,
        <span><strong style={{color:'var(--text)'}}>Apply</strong> — how to integrate the system into any HTML page, theme an app, ship accessibly.</span>,
      ]} />
      <Callout kind="HOW TO READ">
        Every page is theme-aware. Open a doc, then jump to the showcase or app to switch theme — return and the docs pick up the change. Code samples are copy-paste ready.
      </Callout>
    </>
  );
}

/* ---------- 02 Principles ---------- */
function Principles() {
  const ps = [
    { n: '01', t: 'Commit to the personality', d: 'A system fails when it hedges. Editorial is genuinely soft. Brutalist genuinely yells. Don\'t average them.' },
    { n: '02', t: 'Black is the canvas, not a color', d: 'Backgrounds are flat #000. Surfaces are alpha overlays. The page atmosphere is the only background art.' },
    { n: '03', t: 'One accent per page', d: 'Accent is reserved. It marks the active state, the primary action, the brand moment — never decoration.' },
    { n: '04', t: 'Tokens before classes', d: 'If a value appears in two places, it\'s a token. We add tokens before we copy values.' },
    { n: '05', t: 'Mono is the meta-language', d: 'Eyebrows, codes, keys, indices — anything pointing at the structure of the page is mono.' },
    { n: '06', t: 'Density is dignity', d: 'An awesome list lives or dies on the row. Generous leading, tight stacking, baseline alignment.' },
  ];
  return (
    <>
      <H1>Principles</H1>
      <Lead>Six rules that make these five systems feel like one product.</Lead>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--border)', border: 'var(--hairline-w) solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        {ps.map(p => (
          <div key={p.n} style={{ background: 'var(--bg)', padding: '24px 28px', display: 'grid', gridTemplateColumns: '60px 1fr', gap: 24 }}>
            <code className="mono" style={{ fontSize: 12, color: 'var(--accent)', letterSpacing: '0.12em' }}>{p.n}</code>
            <div>
              <div className="display-h" style={{ fontSize: 22, marginBottom: 8 }}>{p.t}</div>
              <P>{p.d}</P>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------- 03 Getting started ---------- */
function GettingStarted() {
  return (
    <>
      <H1>Getting started</H1>
      <Lead>Add the system to any HTML page in three steps.</Lead>
      <H2>1. Drop in the styles + system definitions</H2>
      <P>Two files: <code className="mono" style={{color:'var(--accent)'}}>styles.css</code> defines tokens + components; <code className="mono" style={{color:'var(--accent)'}}>design-systems.jsx</code> defines the five token packs and the apply function.</P>
      <Code>{`<span class="c-com">&lt;!-- in &lt;head&gt; --&gt;</span>
<span class="c-key">&lt;link</span> rel=<span class="c-str">"stylesheet"</span> href=<span class="c-str">"styles.css"</span><span class="c-key">&gt;</span>

<span class="c-com">&lt;!-- before &lt;/body&gt; --&gt;</span>
<span class="c-key">&lt;script</span> src=<span class="c-str">"design-systems.jsx"</span><span class="c-key">&gt;&lt;/script&gt;</span>`}</Code>
      <H2>2. Apply a system on load</H2>
      <Code>{`<span class="c-key">&lt;script&gt;</span>
  <span class="c-com">// system, accent</span>
  applyDesignSystem(<span class="c-str">'editorial'</span>, <span class="c-str">'crimson'</span>);
<span class="c-key">&lt;/script&gt;</span>`}</Code>
      <P>That sets <code className="mono" style={{color:'var(--accent)'}}>data-system</code> + <code className="mono" style={{color:'var(--accent)'}}>data-accent</code> on <code className="mono" style={{color:'var(--accent)'}}>&lt;html&gt;</code> and writes ~36 CSS variables to the root.</P>
      <H2>3. Use the components</H2>
      <P>Every component is a class. No JS framework required — they all consume CSS variables.</P>
      <Code>{`<span class="c-key">&lt;button</span> class=<span class="c-str">"btn primary"</span><span class="c-key">&gt;</span>Submit<span class="c-key">&lt;/button&gt;</span>
<span class="c-key">&lt;span</span> class=<span class="c-str">"chip accent"</span><span class="c-key">&gt;</span>live<span class="c-key">&lt;/span&gt;</span>
<span class="c-key">&lt;div</span> class=<span class="c-str">"card hoverable"</span><span class="c-key">&gt;</span>...<span class="c-key">&lt;/div&gt;</span>`}</Code>
      <Callout kind="LIVE">
        Switch the active system (in the showcase or main app) and watch this page reshape — the docs aren't a separate world.
      </Callout>
    </>
  );
}

/* ---------- 04 Tokens ---------- */
function Tokens() {
  return (
    <>
      <H1>Token contract</H1>
      <Lead>Every token a system must define. Adding a system means filling out this form.</Lead>
      <H2>Surface</H2>
      <Spec rows={[
        ['--bg', 'Page background. Always pure #000.'],
        ['--bg-2', 'Slightly raised areas — sidebars, code blocks. Near-black.'],
        ['--surface', 'Card / input idle. Alpha overlay (~2-4%).'],
        ['--surface-2', 'Card hover, secondary surface. ~5-8% alpha.'],
        ['--surface-3', 'Pressed / focused surface. ~8-12% alpha.'],
        ['--bg-atmosphere', 'Background art behind everything. Gradients, scanlines, grid lines.'],
        ['--grain-opacity', 'Strength of the noise overlay. 0 in Geist, 0.55 in Brutalist.'],
      ]} />
      <H2>Border</H2>
      <Spec rows={[
        ['--border', 'Default edge. ~8% white in dark systems.'],
        ['--border-strong', 'Hover / active edge. ~16% white.'],
        ['--hairline', 'Sub-divider edge. ~6% white. Used between rows of a table.'],
        ['--border-w', 'Default border width. 1px most systems, 2px in Brutalist.'],
        ['--hairline-w', 'Sub-divider width. 0.5px in Swiss, 1px elsewhere.'],
      ]} />
      <H2>Text</H2>
      <Spec rows={[
        ['--text', 'Primary ink.'],
        ['--text-2', 'Secondary — body copy.'],
        ['--text-3', 'Tertiary — meta, captions.'],
        ['--text-4', 'Quaternary — disabled.'],
      ]} />
      <H2>Type</H2>
      <Spec rows={[
        ['--font-display', 'Display family — headlines.'],
        ['--font-body', 'Body family — UI + prose.'],
        ['--font-mono', 'Mono family — code, eyebrows, keys.'],
        ['--display-weight', 'Display weight. 400 (Brutalist) → 700 (Swiss).'],
        ['--display-tracking', 'Display letter-spacing. Tight everywhere.'],
        ['--display-leading', 'Display line-height.'],
        ['--body-leading', 'Body line-height.'],
        ['--eyebrow-tracking', 'Mono eyebrow letter-spacing.'],
        ['--mono-size-step', 'Mono micro-scale base size.'],
      ]} />
      <H2>Shape</H2>
      <Spec rows={[
        ['--radius', 'Default radius. 0 in Terminal/Brutalist, 4 in Swiss, 10-12 in Editorial/Geist.'],
        ['--radius-sm', 'Small radius for chips, inputs.'],
        ['--radius-pill', '999px or 0px depending on system.'],
      ]} />
      <H2>Shadow</H2>
      <Spec rows={[
        ['--shadow-sm', 'Resting shadow. None in Terminal/Swiss.'],
        ['--shadow', 'Hover shadow.'],
        ['--shadow-lg', 'Modal / floating panel.'],
        ['--shadow-accent', 'Accent glow / accent halo.'],
      ]} />
      <H2>Accent (set per page)</H2>
      <Spec rows={[
        ['--accent', 'Primary accent — chromatic moment.'],
        ['--accent-2', 'Accent companion — gradients, hover-2.'],
      ]} />
      <Callout kind="RULE">
        If you find yourself writing a hex value or px number in a component file, that's a missing token. Promote it.
      </Callout>
    </>
  );
}

/* ---------- 05 Theming ---------- */
function Theming() {
  return (
    <>
      <H1>Theming & switching</H1>
      <Lead>How systems are stored, applied, and persisted.</Lead>
      <H2>The apply function</H2>
      <Code>{`<span class="c-com">// design-systems.jsx</span>
applyDesignSystem(systemId, accentId);

<span class="c-com">// effects:</span>
<span class="c-com">// 1. clears previously-applied vars from :root</span>
<span class="c-com">// 2. writes ~36 CSS variables to :root</span>
<span class="c-com">// 3. sets data-system + data-accent on &lt;html&gt;</span>`}</Code>
      <H2>Why the data-system attribute matters</H2>
      <P>Tokens cover most differences, but some component shifts can't be expressed as a single value: square-vs-pill, brackets around chips, offset shadow vs. soft falloff. Those live as <code className="mono" style={{color:'var(--accent)'}}>[data-system="…"]</code> overrides in styles.css.</P>
      <Code>{`<span class="c-key">[data-system=<span class="c-str">"terminal"</span>] .chip::before</span> {
  content: <span class="c-str">'['</span>;
  margin-right: <span class="c-num">2px</span>;
}

<span class="c-key">[data-system=<span class="c-str">"brutalist"</span>] .card.hoverable:hover</span> {
  transform: translate(-<span class="c-num">2px</span>, -<span class="c-num">2px</span>);
  box-shadow: <span class="c-num">6px</span> <span class="c-num">6px</span> <span class="c-num">0</span> <span class="c-num">0</span> var(--text);
}`}</Code>
      <H2>Persistence</H2>
      <P>The app stores choices in <code className="mono" style={{color:'var(--accent)'}}>localStorage</code> as <code className="mono" style={{color:'var(--accent)'}}>av-ds-system</code> + <code className="mono" style={{color:'var(--accent)'}}>av-ds-accent</code>. Reading them on load before first paint avoids the flash of default theme.</P>
      <Code>{`<span class="c-key">&lt;script&gt;</span>
  <span class="c-key">const</span> sys = localStorage.getItem(<span class="c-str">'av-ds-system'</span>) || <span class="c-str">'editorial'</span>;
  <span class="c-key">const</span> acc = localStorage.getItem(<span class="c-str">'av-ds-accent'</span>)
            || SYSTEM_DEFAULT_ACCENT[sys];
  applyDesignSystem(sys, acc);
<span class="c-key">&lt;/script&gt;</span>`}</Code>
      <H2>Smart accent defaults</H2>
      <P>Each system declares its natural accent. When the user picks a fresh system without specifying an accent, we move them to that system's default — Editorial→Crimson, Terminal→Matrix, Geist→Cyan, Brutalist→Amber, Swiss→Orange.</P>
    </>
  );
}

/* ---------- 06 Typography ---------- */
function TypographyDoc() {
  return (
    <>
      <H1>Typography</H1>
      <Lead>Three families per system. The display does the personality work.</Lead>
      <Surface>
        <div className="display-h" style={{ fontSize: 56, marginBottom: 12 }}>The quick brown fox</div>
        <p style={{ fontSize: 18, color: 'var(--text-2)', marginBottom: 12, maxWidth: 560 }}>
          Body copy in the system's body face, set at 1.55–1.6 leading and a comfortable 14–18px.
        </p>
        <code className="mono" style={{ fontSize: 12, color: 'var(--text-3)' }}>
          mono · 0123456789 · &lt;tag&gt; · ⌘K
        </code>
      </Surface>
      <H2>The three families</H2>
      <UL items={[
        <span><strong style={{color:'var(--text)'}}>Display</strong> — used for h1–h2 and any moment of voice. Italic in Editorial, mono in Terminal.</span>,
        <span><strong style={{color:'var(--text)'}}>Body</strong> — UI labels, prose, inputs, table cells. Always sans except in Terminal (mono).</span>,
        <span><strong style={{color:'var(--text)'}}>Mono</strong> — eyebrows, codes, indices, keys, anything indicating structure.</span>,
      ]} />
      <H2>Per-system stacks</H2>
      <Spec rows={[
        ['Editorial', 'Display: Fraunces (italic) · Body: Inter · Mono: JetBrains Mono'],
        ['Terminal',  'All three: IBM Plex Mono'],
        ['Geist',     'Display: Geist · Body: Geist · Mono: JetBrains Mono'],
        ['Brutalist', 'Display: Instrument Serif · Body: Space Grotesk · Mono: JetBrains Mono'],
        ['Swiss',     'Display: Manrope · Body: Manrope · Mono: IBM Plex Mono'],
      ]} />
      <H2>Type scale</H2>
      <Spec rows={[
        ['display-xl · 72px', 'Hero, single line.'],
        ['display · 56px', 'Page hero.'],
        ['h1 · 40px', 'Section anchor.'],
        ['h2 · 28px', 'Subsection.'],
        ['h3 · 20px', 'Card heading.'],
        ['h4 · 16px', 'List item title.'],
        ['body · 14px', 'Default prose.'],
        ['small · 13px', 'Meta, secondary.'],
        ['caption · 11px', 'Mono, eyebrow, kbd.'],
      ]} />
      <H2>Rules</H2>
      <UL items={[
        'Headlines never go below 16px — drop to small/caption instead.',
        'Mono caps + 0.18em tracking for eyebrows. Body sentence-case for content.',
        'Italics in Editorial = accent moments. Don\'t italicize for random emphasis.',
        'Use display family ONLY for true display sizes (≥28px). Below that, body.',
      ]} />
    </>
  );
}

/* ---------- 07 Color ---------- */
function ColorDoc() {
  return (
    <>
      <H1>Color & accent</H1>
      <Lead>Black canvas. Alpha-overlay surfaces. One accent per page.</Lead>
      <H2>The 4-tier ink scale</H2>
      <P>All systems use a four-step text ramp. Stick to these — don't invent intermediate alphas.</P>
      <Surface>
        {[
          ['--text',   'Primary',   'Headlines, key UI labels'],
          ['--text-2', 'Secondary', 'Body copy, table values'],
          ['--text-3', 'Tertiary',  'Meta, captions, eyebrows'],
          ['--text-4', 'Quaternary','Disabled, dividers'],
        ].map(([v, n, u]) => (
          <div key={v} style={{ display: 'grid', gridTemplateColumns: '160px 100px 1fr', gap: 16, padding: '8px 0', borderTop: 'var(--hairline-w) solid var(--hairline)', alignItems: 'center' }}>
            <code className="mono" style={{ fontSize: 11.5, color: 'var(--accent)' }}>{v}</code>
            <span style={{ color: `var(${v})`, fontSize: 14, fontWeight: 500 }}>{n}</span>
            <span style={{ color: 'var(--text-3)', fontSize: 12 }}>{u}</span>
          </div>
        ))}
      </Surface>
      <H2>The 10 accent palette</H2>
      <Surface>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {ACCENTS.map(a => (
            <div key={a.id}>
              <div style={{ height: 64, background: a.primary, borderRadius: 'var(--radius-sm)' }} />
              <div className="mono" style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 6, letterSpacing: '0.1em' }}>{a.name.toUpperCase()}</div>
              <div className="mono" style={{ fontSize: 9, color: 'var(--text-3)' }}>{a.primary}</div>
            </div>
          ))}
        </div>
      </Surface>
      <H2>Where accent appears</H2>
      <UL items={[
        'Primary buttons (filled in most systems, outlined+glow in Terminal).',
        'Active nav indicator — left rail of the active accordion item.',
        'Eyebrows — `── 02 / SECTION` style mono labels.',
        'Hover ring on cards (.card.glow:hover).',
        'Caret + selection color.',
        'Active tab underline.',
        'Live-dot pulse.',
      ]} />
      <Callout kind="ANTI-PATTERN">
        Never set a chip, badge, or chart bar to a free color. Use accent, the four ink tiers, or one of the semantic tokens (#34d08c ok, #ffb84d warn, #ff5c7a bad).
      </Callout>
      <H2>Status colors</H2>
      <Spec rows={[
        ['#34d08c', 'OK — healthy, indexed, up.'],
        ['#ffb84d', 'WARN — stale, deprecated, archived.'],
        ['#ff5c7a', 'BAD — broken, down, error.'],
      ]} />
    </>
  );
}

/* ---------- 08 Spacing ---------- */
function SpacingDoc() {
  return (
    <>
      <H1>Spacing & layout</H1>
      <Lead>4px base. 12-column max. Centered content with hairline rules.</Lead>
      <H2>Spacing scale</H2>
      <Surface>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
          {SPACE_SCALE.map(s => (
            <div key={s.name} style={{ textAlign: 'center' }}>
              <div style={{ width: Math.max(s.px, 8), height: Math.max(s.px, 8), background: 'var(--accent)', borderRadius: 'var(--radius-sm)', opacity: s.px ? 1 : 0.3, border: s.px ? 'none' : '1px dashed var(--accent)' }} />
              <code className="mono" style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 6, display: 'block' }}>s-{s.name}</code>
              <code className="mono" style={{ fontSize: 9, color: 'var(--text-3)' }}>{s.px}px</code>
            </div>
          ))}
        </div>
      </Surface>
      <H2>Stack vs. inline</H2>
      <UL items={[
        'Vertical rhythm: 8px between paired (label/value), 16px between unrelated, 32px before section heads, 56-64px between major sections.',
        'Horizontal: 8px gaps inside chips, 12px between buttons, 14-16px between cards.',
      ]} />
      <H2>Page width</H2>
      <Spec rows={[
        ['Reading column', '640-680px max — for prose.'],
        ['App content', '1240px max — for tables, dashboards.'],
        ['Hero', 'Full bleed within 1240px shell.'],
        ['Page padding', '40-64px desktop, 14-24px mobile.'],
      ]} />
      <H2>Grid</H2>
      <P>12-column responsive grid for app layout. List patterns use a hand-tuned grid (index, content, meta-1, meta-2) — see Patterns → List patterns.</P>
    </>
  );
}

/* ---------- 09 Motion ---------- */
function MotionDoc() {
  return (
    <>
      <H1>Motion</H1>
      <Lead>Confident, brief, structural. Motion clarifies state — it never decorates.</Lead>
      <H2>Durations</H2>
      <Spec rows={[
        ['140ms', 'Pointer feedback — color, opacity.'],
        ['160ms', 'Focus, hover, simple state.'],
        ['220ms', 'Card lift, transform.'],
        ['280ms', 'Drawer open / overlay.'],
        ['320ms', 'Accordion expand.'],
        ['1100ms', 'Caret blink (steps).'],
        ['2000ms', 'Live-dot pulse.'],
        ['6000ms', 'Border sweep gradient.'],
      ]} />
      <H2>Easing</H2>
      <UL items={[
        'cubic-bezier(0.2, 0.65, 0.3, 1) — default. Snappy with soft landing.',
        'ease — for opacity-only fades.',
        'steps(1) — caret blinks. Never tween a binary.',
        'linear — only for indeterminate loops (sweep).',
      ]} />
      <H2>Live atoms</H2>
      <UL items={[
        '.live-dot — accent pulse, 6px circle, glow shadow.',
        '.caret — `_` after text, accent color, blinking.',
        '.shimmer-line — gradient sweep across a 1px line.',
      ]} />
      <H2>Per-system motion grammar</H2>
      <Spec rows={[
        ['Editorial', 'Soft transforms, opacity fades. No bounces.'],
        ['Terminal',  'Step animations only. Caret + scanlines. Hover = glow, not transform.'],
        ['Geist',     'Subtle. Hover = box-shadow ring, no lift.'],
        ['Brutalist', 'Hard. translate(-2px,-2px) on hover, instant. No easing on shadow.'],
        ['Swiss',     'Almost none. Color shift on hover, that\'s it.'],
      ]} />
      <Callout kind="REDUCED MOTION">
        Add <code className="mono" style={{color:'var(--accent)'}}>.no-anim</code> to a parent (or honor <code className="mono" style={{color:'var(--accent)'}}>prefers-reduced-motion</code>) — it freezes caret, shimmer, and dot pulse.
      </Callout>
    </>
  );
}

const DOC_PAGES_PART_1 = {
  overview: Overview,
  principles: Principles,
  'getting-started': GettingStarted,
  tokens: Tokens,
  theming: Theming,
  typography: TypographyDoc,
  color: ColorDoc,
  spacing: SpacingDoc,
  motion: MotionDoc,
};
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
          <button className="btn icon ghost" aria-label="Command menu">⌘</button>
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
          <div className="field"><label htmlFor="docs-example-label">Label</label><input id="docs-example-label" className="input" defaultValue="Default value" /></div>
          <div className="field"><label htmlFor="docs-example-category">Category</label><select id="docs-example-category" className="select"><option>Encoding</option><option>Streaming</option></select></div>
          <div className="field" style={{ gridColumn: '1 / -1' }}><label htmlFor="docs-example-description">Description</label><textarea id="docs-example-description" className="textarea" defaultValue="A complete cross-platform solution for A/V." /></div>
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

export const DOC_PAGES = Object.assign({}, DOC_PAGES_PART_1 || {}, {
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

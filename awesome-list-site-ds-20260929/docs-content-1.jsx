/* =====================================================================
   DOCS CONTENT — every page lives here
   ===================================================================== */
const { useState: useSc } = React;

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
          {window.ACCENTS.map(a => (
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
          {window.SPACE_SCALE.map(s => (
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

window.DOC_PAGES_PART_1 = {
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

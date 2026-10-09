/* =====================================================================
   DESIGN SYSTEM SHOWCASE
   Documents the 5 systems and their token contract, with live components.
   ===================================================================== */
const { useState, useEffect, useMemo } = React;

/* ------------------------------------------------------------------ */
/* Reusable showcase primitives                                       */
/* ------------------------------------------------------------------ */

function Eyebrow({ children }) {
  return <div className="eyebrow" style={{ marginBottom: 14 }}>{children}</div>;
}

function SectionHead({ eyebrow, title, sub }) {
  return (
    <header style={{ marginBottom: 32 }}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="ds-h" style={{ fontSize: 'clamp(28px, 4vw, 44px)', marginBottom: 12 }}>
        {title}
      </h2>
      {sub && <p style={{ fontSize: 15, color: 'var(--text-2)', maxWidth: 640 }}>{sub}</p>}
    </header>
  );
}

function TokenRow({ name, swatch, value, note }) {
  return (
    <div className="ds-token-row">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {swatch}
        <code className="mono" style={{ fontSize: 12, color: 'var(--text)' }}>{name}</code>
      </div>
      <code className="mono" style={{ fontSize: 11, color: 'var(--text-3)', wordBreak: 'break-all' }}>{value}</code>
      <span style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'right' }}>{note}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SYSTEM SWITCHER — sticky bar                                       */
/* ------------------------------------------------------------------ */

function SystemSwitcher({ system, accent, onSystem, onAccent }) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 30,
      background: 'color-mix(in srgb, var(--bg) 86%, transparent)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      borderBottom: 'var(--hairline-w) solid var(--border)',
      padding: '14px 24px',
      display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 14,
    }}>
      <a href="index.html" className="mono" style={{
        fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
        color: 'var(--text-2)', textDecoration: 'none',
      }}>← AWESOME.VIDEO</a>
      <span style={{ color: 'var(--text-4)' }}>/</span>
      <span className="mono" style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
        Design System
      </span>
      <a href="docs.html" className="mono" style={{
        fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
        color: 'var(--text-2)', textDecoration: 'none', marginLeft: 8,
        padding: '4px 10px', border: 'var(--hairline-w) solid var(--border)',
        borderRadius: 'var(--radius-pill)',
      }}>Docs ↗</a>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {Object.entries(DESIGN_SYSTEMS).map(([k, sys]) => (
          <button key={k} className={'ds-system-pill' + (system === k ? ' active' : '')}
            onClick={() => onSystem(k)}>
            <span style={{ fontWeight: 600 }}>{sys.name}</span>
            <span style={{ opacity: 0.65 }}>·</span>
            <span style={{ opacity: 0.7 }}>{sys.tag}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 4, alignItems: 'center', borderLeft: '1px solid var(--border)', paddingLeft: 12, marginLeft: 4 }}>
        {ACCENTS.map(a => (
          <button key={a.id} title={a.name} onClick={() => onAccent(a.id)}
            style={{
              width: 18, height: 18,
              borderRadius: 'var(--radius-pill)',
              border: accent === a.id ? '2px solid var(--text)' : '1px solid var(--border)',
              background: a.primary, cursor: 'pointer', padding: 0,
            }} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* HERO                                                               */
/* ------------------------------------------------------------------ */

function Hero({ system }) {
  const sys = DESIGN_SYSTEMS[system];
  return (
    <section style={{ padding: '80px 0 48px', borderBottom: 'var(--hairline-w) solid var(--border)' }}>
      <div className="mono" style={{ fontSize: 11, letterSpacing: '0.2em', color: 'var(--accent)', marginBottom: 24 }}>
        ── DESIGN&nbsp;SYSTEM&nbsp;v1.0 / awesome.video
      </div>
      <h1 className="ds-h" style={{ fontSize: 'clamp(48px, 8vw, 96px)', marginBottom: 24 }}>
        Five systems.<br/>
        <span style={{ color: 'var(--accent)' }}>One taxonomy.</span>
      </h1>
      <p style={{
        fontSize: 19, color: 'var(--text-2)', maxWidth: 720, lineHeight: 1.55, marginBottom: 32,
      }}>
        A token contract that swaps the entire visual personality with one attribute change.
        Every system is dark, flat-black, and dense — but each commits to its own grammar of edges,
        type, surface, and rhythm.
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 48 }}>
        <span className="chip">Currently: {sys.name}</span>
        <span className="chip muted">{sys.tag}</span>
        <span className="chip muted">flat-black bg</span>
        <span className="chip muted">dense / reference</span>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 1, background: 'var(--border)',
        border: 'var(--hairline-w) solid var(--border)',
      }}>
        {[
          ['SYSTEMS', '5'],
          ['ACCENTS', '10'],
          ['TYPE STEPS', String(TYPE_SCALE.length)],
          ['SPACE STEPS', String(SPACE_SCALE.length)],
          ['TOKENS / SYS', '~36'],
        ].map(([k, v]) => (
          <div key={k} style={{ background: 'var(--bg)', padding: '20px 22px' }}>
            <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.18em', marginBottom: 8 }}>{k}</div>
            <div className="ds-h" style={{ fontSize: 32 }}>{v}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* SYSTEMS OVERVIEW — side-by-side cards                              */
/* ------------------------------------------------------------------ */

function SystemsOverview({ system, onSystem }) {
  return (
    <section className="ds-section">
      <SectionHead
        eyebrow="── 01 / SYSTEMS"
        title={<>Five distinct <em style={{ fontStyle: 'italic', color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>personalities</em></>}
        sub="Each system is more than a recolor — different edges, type stacks, surface treatments, and component grammars. Click to apply globally."
      />
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14,
      }}>
        {Object.entries(DESIGN_SYSTEMS).map(([k, sys]) => {
          const active = system === k;
          return (
            <button key={k} onClick={() => onSystem(k)}
              className={'card hoverable' + (active ? ' glow' : '')}
              style={{
                padding: 22, textAlign: 'left', cursor: 'pointer',
                border: active ? '1px solid var(--accent)' : undefined,
                fontFamily: 'inherit', color: 'inherit',
                /* preview the system's font in its own card */
              }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: active ? 'var(--accent)' : 'var(--text-3)', marginBottom: 12 }}>
                0{Object.keys(DESIGN_SYSTEMS).indexOf(k) + 1} / {sys.tag.split(' · ')[0].toUpperCase()}
              </div>
              <div style={{
                fontFamily: sys.vars['--font-display'],
                fontSize: 28,
                fontWeight: sys.vars['--display-weight'] || 600,
                letterSpacing: sys.vars['--display-tracking'] || '-0.02em',
                lineHeight: 1.05,
                marginBottom: 8,
                fontStyle: k === 'editorial' ? 'italic' : 'normal',
              }}>{sys.name}</div>
              <p style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.55, marginBottom: 14 }}>
                {sys.desc}
              </p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span className="chip muted" style={{
                  fontFamily: sys.vars['--font-mono'],
                  borderRadius: sys.vars['--radius-pill'],
                  border: `${sys.vars['--hairline-w']} solid var(--border)`,
                }}>{sys.vars['--font-body'].split(',')[0].replace(/'/g, '')}</span>
                <span className="chip muted" style={{
                  fontFamily: sys.vars['--font-mono'],
                  borderRadius: sys.vars['--radius-pill'],
                }}>r:{sys.vars['--radius']}</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* TYPOGRAPHY                                                         */
/* ------------------------------------------------------------------ */

function Typography({ system }) {
  const sys = DESIGN_SYSTEMS[system];
  return (
    <section className="ds-section">
      <SectionHead
        eyebrow="── 02 / TYPOGRAPHY"
        title="Type scale & families"
        sub={`Display = ${sys.vars['--font-display'].split(',')[0].replace(/'/g, '')}, Body = ${sys.vars['--font-body'].split(',')[0].replace(/'/g, '')}, Mono = ${sys.vars['--font-mono'].split(',')[0].replace(/'/g, '')}.`}
      />

      {/* Stack samples */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 1,
        background: 'var(--border)', border: 'var(--hairline-w) solid var(--border)', marginBottom: 48,
      }}>
        {[
          { label: 'DISPLAY', font: 'var(--font-display)', sample: 'Hand-picked', w: sys.vars['--display-weight'], extra: { letterSpacing: sys.vars['--display-tracking'], fontStyle: system === 'editorial' ? 'italic' : 'normal' } },
          { label: 'BODY', font: 'var(--font-body)', sample: 'Indexed atlas', w: 500 },
          { label: 'MONO', font: 'var(--font-mono)', sample: '0123 / abc', w: 500 },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg)', padding: '24px 22px' }}>
            <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.18em', marginBottom: 14 }}>{s.label}</div>
            <div style={{ fontFamily: s.font, fontSize: 36, fontWeight: s.w, lineHeight: 1.1, ...(s.extra || {}) }}>
              {s.sample}
            </div>
          </div>
        ))}
      </div>

      {/* Scale */}
      <div>
        {TYPE_SCALE.map(t => (
          <div key={t.name} style={{
            display: 'grid', gridTemplateColumns: '120px 100px 1fr 160px', gap: 24,
            padding: '20px 0', borderTop: 'var(--hairline-w) solid var(--hairline)',
            alignItems: 'baseline',
          }}>
            <code className="mono" style={{ fontSize: 12, color: 'var(--text)' }}>{t.name}</code>
            <code className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{t.px}px</code>
            <div style={{
              fontFamily: t.px >= 28 ? 'var(--font-display)' : 'var(--font-body)',
              fontSize: t.px,
              fontWeight: t.px >= 28 ? sys.vars['--display-weight'] : (t.px >= 16 ? 600 : 400),
              letterSpacing: t.px >= 28 ? sys.vars['--display-tracking'] : 0,
              lineHeight: t.px >= 28 ? 1.05 : 1.4,
              color: 'var(--text)',
            }}>
              {t.label}
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'right' }}>{t.use}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* COLOR — surface, text, accent                                      */
/* ------------------------------------------------------------------ */

function Color({ system, accent }) {
  const sys = DESIGN_SYSTEMS[system];
  const groups = [
    { label: 'BACKGROUND', tokens: ['--bg', '--bg-2'] },
    { label: 'SURFACE',    tokens: ['--surface', '--surface-2', '--surface-3'] },
    { label: 'BORDER',     tokens: ['--border', '--border-strong', '--hairline'] },
    { label: 'TEXT',       tokens: ['--text', '--text-2', '--text-3', '--text-4'] },
  ];
  const a = ACCENTS.find(x => x.id === accent) || ACCENTS[0];

  return (
    <section className="ds-section">
      <SectionHead
        eyebrow="── 03 / COLOR"
        title="Surface, ink, & accent"
        sub="Every system commits to flat #000000 backgrounds. Surfaces and borders are alpha overlays so the page atmosphere shines through. Accent is the single chromatic moment."
      />

      {/* Accent showcase */}
      <div style={{
        border: 'var(--hairline-w) solid var(--border)', borderRadius: 'var(--radius)',
        padding: 28, marginBottom: 40, background: 'var(--surface)',
      }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-3)', marginBottom: 20 }}>
          ACTIVE ACCENT — {a.name.toUpperCase()}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
          <div style={{ height: 96, background: a.primary, borderRadius: 'var(--radius-sm)', position: 'relative' }}>
            <code className="mono" style={{ position: 'absolute', bottom: 8, left: 10, fontSize: 10, color: '#000', fontWeight: 700 }}>{a.primary}</code>
          </div>
          <div style={{ height: 96, background: a.secondary, borderRadius: 'var(--radius-sm)', position: 'relative' }}>
            <code className="mono" style={{ position: 'absolute', bottom: 8, left: 10, fontSize: 10, color: '#000', fontWeight: 700 }}>{a.secondary}</code>
          </div>
          <div style={{
            height: 96, borderRadius: 'var(--radius-sm)',
            background: `linear-gradient(135deg, ${a.primary}, ${a.secondary})`,
            position: 'relative',
          }}>
            <code className="mono" style={{ position: 'absolute', bottom: 8, left: 10, fontSize: 10, color: '#000', fontWeight: 700 }}>gradient</code>
          </div>
          <div style={{
            height: 96, borderRadius: 'var(--radius-sm)',
            background: `color-mix(in srgb, ${a.primary} 14%, transparent)`,
            border: `1px solid color-mix(in srgb, ${a.primary} 35%, transparent)`,
            color: a.primary, fontFamily: 'var(--font-mono)', fontSize: 10,
            display: 'flex', alignItems: 'flex-end', padding: 10,
          }}>14% wash</div>
        </div>
      </div>

      {/* Token tables */}
      {groups.map(g => (
        <div key={g.label} style={{ marginBottom: 32 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-3)', marginBottom: 6 }}>
            {g.label}
          </div>
          {g.tokens.map(t => (
            <TokenRow key={t} name={t}
              swatch={
                <div style={{
                  width: 28, height: 28, borderRadius: 'var(--radius-sm)',
                  background: sys.vars[t] || 'var(--surface)',
                  border: '1px solid var(--border)',
                  flexShrink: 0,
                }} />
              }
              value={sys.vars[t]}
              note={t.includes('text') ? 'ink' : t.includes('border') ? 'edge' : t.includes('surface') ? 'overlay' : 'page'} />
          ))}
        </div>
      ))}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* SPACING + RADIUS + SHADOW                                          */
/* ------------------------------------------------------------------ */

function Geometry({ system }) {
  const sys = DESIGN_SYSTEMS[system];
  return (
    <section className="ds-section">
      <SectionHead
        eyebrow="── 04 / GEOMETRY"
        title="Spacing, radius, shadow"
        sub="A 4px base spacing scale, system-specific radii, and shadow tokens that range from soft falloff (Editorial) to hard offset (Brutalist) to none (Swiss)."
      />

      {/* Spacing */}
      <div style={{ marginBottom: 48 }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-3)', marginBottom: 16 }}>SPACE SCALE</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
          {SPACE_SCALE.map(s => (
            <div key={s.name} style={{ textAlign: 'center' }}>
              <div style={{
                width: Math.max(s.px, 8), height: Math.max(s.px, 8),
                background: 'var(--accent)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 8,
                opacity: s.px === 0 ? 0.3 : 1,
                border: s.px === 0 ? '1px dashed var(--accent)' : 'none',
              }} />
              <code className="mono" style={{ fontSize: 10, color: 'var(--text-2)' }}>s-{s.name}</code>
              <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)' }}>{s.px}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Radius */}
      <div style={{ marginBottom: 48 }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-3)', marginBottom: 16 }}>RADIUS</div>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          {[
            ['--radius-sm', sys.vars['--radius-sm']],
            ['--radius', sys.vars['--radius']],
            ['--radius-pill', sys.vars['--radius-pill']],
          ].map(([n, v]) => (
            <div key={n} style={{ flex: '1 1 200px' }}>
              <div style={{
                height: 80,
                borderRadius: v,
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
                marginBottom: 8,
              }} />
              <code className="mono" style={{ fontSize: 11, color: 'var(--text-2)' }}>{n}</code>
              <span className="mono" style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 8 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Shadow */}
      <div>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-3)', marginBottom: 16 }}>SHADOW</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, paddingBottom: 40 }}>
          {[
            ['--shadow-sm', sys.vars['--shadow-sm']],
            ['--shadow', sys.vars['--shadow']],
            ['--shadow-lg', sys.vars['--shadow-lg']],
            ['--shadow-accent', 'accent glow'],
          ].map(([n, label]) => (
            <div key={n} style={{
              height: 100,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              boxShadow: `var(${n})`,
              padding: 14, fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)',
            }}>{n}</div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* COMPONENTS — the actual UI primitives                              */
/* ------------------------------------------------------------------ */

function Components() {
  return (
    <section className="ds-section">
      <SectionHead
        eyebrow="── 05 / COMPONENTS"
        title="Primitives"
        sub="Every component reads from the token contract. Switch systems above to see them shape-shift live."
      />

      {/* Buttons */}
      <div style={{ marginBottom: 48 }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-3)', marginBottom: 14 }}>BUTTONS</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn primary">Primary action</button>
          <button className="btn">Default</button>
          <button className="btn ghost">Ghost</button>
          <button className="btn danger">Danger</button>
          <button className="btn icon ghost" aria-label="search">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5"/><path d="M11 11 L14 14"/></svg>
          </button>
        </div>
      </div>

      {/* Chips */}
      <div style={{ marginBottom: 48 }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-3)', marginBottom: 14 }}>CHIPS</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="chip">default</span>
          <span className="chip accent">accent</span>
          <span className="chip ok">ok · 12.4k</span>
          <span className="chip warn">warn</span>
          <span className="chip bad">bad</span>
          <span className="chip muted">muted</span>
          <span className="kbd">⌘K</span>
          <span className="kbd">esc</span>
        </div>
      </div>

      {/* Form */}
      <div style={{ marginBottom: 48 }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-3)', marginBottom: 14 }}>FORM</div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16,
          maxWidth: 760,
        }}>
          <div className="field">
            <label>Resource title</label>
            <input className="input" defaultValue="ffmpeg-libav" />
          </div>
          <div className="field">
            <label>Category</label>
            <select className="select" defaultValue="encoding">
              <option value="encoding">Encoding</option>
              <option value="streaming">Streaming</option>
              <option value="ai">AI / ML</option>
            </select>
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Description</label>
            <textarea className="textarea" defaultValue="A complete, cross-platform solution to record, convert and stream audio and video." />
          </div>
        </div>
      </div>

      {/* Cards */}
      <div style={{ marginBottom: 48 }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-3)', marginBottom: 14 }}>CARDS</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
          {[
            { i: '◢', t: 'Encoding', d: 'FFmpeg, x264, AV1 toolchains, transcoders, color pipelines.', n: 312 },
            { i: '⌬', t: 'Streaming', d: 'HLS, DASH, RTMP, WebRTC servers and edge delivery stacks.', n: 184 },
            { i: '◈', t: 'Players', d: 'HTML5, embeddable, native SDKs and adaptive bitrate clients.', n: 96 },
          ].map((c, i) => (
            <div key={i} className="card hoverable glow" style={{ padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--accent)', fontSize: 16,
                }}>{c.i}</div>
                <h3 className="ds-h" style={{ fontSize: 17, flex: 1 }}>{c.t}</h3>
                <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.n}</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55 }}>{c.d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Table — list pattern, the core unit */}
      <div style={{ marginBottom: 48 }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-3)', marginBottom: 14 }}>LIST PATTERN — the core unit of the site</div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Resource</th>
                <th>Category</th>
                <th style={{ width: 120 }}>Stars</th>
                <th style={{ width: 80 }}>Health</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['01', 'FFmpeg', 'Encoding', '44.2k', 'ok'],
                ['02', 'Shaka Player', 'Players', '7.1k', 'ok'],
                ['03', 'Bento4', 'Packaging', '1.2k', 'warn'],
                ['04', 'OBS Studio', 'Capture', '63.8k', 'ok'],
                ['05', 'gst-plugins-bad', 'Pipelines', '512', 'bad'],
              ].map(([i, name, cat, stars, h]) => (
                <tr key={i}>
                  <td className="mono" style={{ color: 'var(--text-3)' }}>{i}</td>
                  <td style={{ color: 'var(--text)', fontWeight: 500 }}>{name}</td>
                  <td>{cat}</td>
                  <td className="mono" style={{ color: 'var(--text-2)' }}>{stars}</td>
                  <td><span className={'chip ' + h}>{h}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: 48 }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-3)', marginBottom: 14 }}>TABS</div>
        <div className="tabs">
          <button className="tab active">Overview</button>
          <button className="tab">Subcategories <span className="mono" style={{ color: 'var(--text-3)' }}>· 14</span></button>
          <button className="tab">Activity</button>
          <button className="tab">Stats</button>
        </div>
      </div>

      {/* Live signals */}
      <div>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-3)', marginBottom: 14 }}>LIVE SIGNALS</div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-2)' }}>
            <span className="live-dot" />
            <span className="mono" style={{ letterSpacing: '0.08em' }}>indexed · live</span>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span className="dot ok" />
            <span style={{ color: 'var(--text-2)' }}>up</span>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span className="dot warn" />
            <span style={{ color: 'var(--text-2)' }}>stale</span>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span className="dot bad" />
            <span style={{ color: 'var(--text-2)' }}>down</span>
          </span>
          <span className="caret" style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>type to search</span>
          <div className="shimmer-line" style={{ width: 200 }} />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* LIST ROW — the awesome-list unit                                   */
/* ------------------------------------------------------------------ */

function ListUnit() {
  const items = [
    { idx: '01', name: 'FFmpeg', tags: ['encoding', 'cli', 'cross-platform'], desc: 'A complete, cross-platform solution to record, convert and stream audio and video.', stars: '44.2k', updated: '2 days ago' },
    { idx: '02', name: 'Shaka Player', tags: ['players', 'js', 'dash', 'hls'], desc: 'Open-source JavaScript library that plays adaptive media in a browser.', stars: '7.1k', updated: '5 days ago' },
    { idx: '03', name: 'video.js', tags: ['players', 'web', 'plugins'], desc: 'Open source HTML5 video player. Battle-tested, framework-agnostic, plugin ecosystem.', stars: '38.4k', updated: '1 week ago' },
    { idx: '04', name: 'OBS Studio', tags: ['capture', 'streaming', 'desktop'], desc: 'Free and open source software for video recording and live streaming.', stars: '63.8k', updated: '3 days ago' },
    { idx: '05', name: 'Mux Video API', tags: ['saas', 'streaming', 'analytics'], desc: 'Video infrastructure for developers — encoding, delivery, real-time data.', stars: '—', updated: 'today' },
  ];
  return (
    <section className="ds-section">
      <SectionHead
        eyebrow="── 06 / LIST PATTERN"
        title="The core unit"
        sub="Awesome-list directories live and die on the resource row. Index, title, tags, description, signals — all aligned to the same baseline grid."
      />
      <div style={{ borderTop: 'var(--hairline-w) solid var(--border)' }}>
        {items.map(it => (
          <div key={it.idx} style={{
            display: 'grid',
            gridTemplateColumns: '60px 1fr 140px 100px',
            gap: 24, padding: '20px 8px',
            borderBottom: 'var(--hairline-w) solid var(--hairline)',
            alignItems: 'baseline',
            cursor: 'pointer',
            transition: 'background 160ms ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <code className="mono" style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.1em' }}>{it.idx}</code>
            <div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 6, flexWrap: 'wrap' }}>
                <h4 style={{ fontSize: 16, fontWeight: 600 }}>{it.name}</h4>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {it.tags.map(t => <span key={t} className="chip muted" style={{ fontSize: 9.5, padding: '2px 7px' }}>{t}</span>)}
                </div>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5, maxWidth: 640 }}>{it.desc}</p>
            </div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>★ {it.stars}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'right' }}>{it.updated}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* PAGE TEMPLATES — thumbnails of how the system composes             */
/* ------------------------------------------------------------------ */

function PageTemplates() {
  const templates = [
    { name: 'Home · Featured', desc: 'Hero + featured grid + categories', sketch: 'home' },
    { name: 'Category', desc: 'Header + filter rail + list of resources', sketch: 'cat' },
    { name: 'Resource Detail', desc: 'Title, meta, description, related', sketch: 'detail' },
    { name: 'Submit', desc: 'Form-first — minimal chrome', sketch: 'submit' },
  ];
  return (
    <section className="ds-section">
      <SectionHead
        eyebrow="── 07 / TEMPLATES"
        title="Page compositions"
        sub="Four canonical layouts. All share a sticky header, an optional sidebar accordion, and a centered content column."
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
        {templates.map(t => (
          <div key={t.name} className="card" style={{ padding: 18 }}>
            {/* Mini wireframe */}
            <div style={{
              aspectRatio: '4/3',
              background: 'var(--bg-2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: 8,
              display: 'flex', flexDirection: 'column', gap: 4,
              marginBottom: 14,
            }}>
              <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: 2 }} />
              <div style={{ display: 'flex', gap: 4, flex: 1, marginTop: 4 }}>
                {t.sketch !== 'submit' && <div style={{ width: '22%', background: 'var(--surface)', borderRadius: 2 }} />}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {t.sketch === 'home' && <>
                    <div style={{ height: 16, background: 'var(--surface-2)', borderRadius: 2 }} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, flex: 1 }}>
                      {[1,2,3,4].map(i => <div key={i} style={{ background: 'var(--surface)', borderRadius: 2 }} />)}
                    </div>
                  </>}
                  {t.sketch === 'cat' && <>
                    <div style={{ height: 14, background: 'var(--surface-2)', borderRadius: 2 }} />
                    {[1,2,3,4,5].map(i => <div key={i} style={{ height: 6, background: 'var(--surface)', borderRadius: 1 }} />)}
                  </>}
                  {t.sketch === 'detail' && <>
                    <div style={{ height: 18, background: 'var(--surface-2)', borderRadius: 2 }} />
                    <div style={{ height: 4, background: 'var(--surface)', borderRadius: 1 }} />
                    <div style={{ height: 4, background: 'var(--surface)', borderRadius: 1, width: '70%' }} />
                    <div style={{ flex: 1, background: 'var(--surface)', borderRadius: 2, marginTop: 4 }} />
                  </>}
                  {t.sketch === 'submit' && <>
                    <div style={{ height: 12, background: 'var(--surface-2)', borderRadius: 2, width: '60%' }} />
                    {[1,2,3].map(i => <div key={i} style={{ height: 10, background: 'var(--surface)', borderRadius: 2 }} />)}
                    <div style={{ height: 14, background: 'var(--accent)', borderRadius: 2, marginTop: 4, opacity: 0.7 }} />
                  </>}
                </div>
              </div>
            </div>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{t.name}</h4>
            <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>{t.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* FOOTER                                                             */
/* ------------------------------------------------------------------ */

function Footer({ system }) {
  const sys = DESIGN_SYSTEMS[system];
  return (
    <footer style={{
      borderTop: 'var(--hairline-w) solid var(--border)',
      padding: '32px 0 24px',
      display: 'flex', justifyContent: 'space-between',
      alignItems: 'baseline', flexWrap: 'wrap', gap: 16,
      color: 'var(--text-3)', fontSize: 12, fontFamily: 'var(--font-mono)',
    }}>
      <span>awesome.video / design system v1.0</span>
      <span>{sys.name.toUpperCase()} · {Object.keys(sys.vars).length} tokens</span>
      <a href="index.html" style={{ color: 'var(--text-2)', textDecoration: 'underline' }}>← back to site</a>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/* APP                                                                */
/* ------------------------------------------------------------------ */

function App() {
  const [system, setSystem] = useState(() => {
    try { return localStorage.getItem('av-ds-system') || 'editorial'; } catch (e) { return 'editorial'; }
  });
  const [accent, setAccent] = useState(() => {
    try { return localStorage.getItem('av-ds-accent') || 'crimson'; } catch (e) { return 'crimson'; }
  });

  useEffect(() => {
    window.applyDesignSystem(system, accent);
    try { localStorage.setItem('av-ds-system', system); } catch (e) {}
    try { localStorage.setItem('av-ds-accent', accent); } catch (e) {}
  }, [system, accent]);

  /* When user picks a system, nudge accent to that system's natural default
     UNLESS they've manually set a non-default accent already. */
  const handleSystem = (k) => {
    setSystem(k);
    const naturalDefault = window.SYSTEM_DEFAULT_ACCENT?.[k];
    /* Auto-shift accent only if current is the previous system's natural default */
    const prevNatural = window.SYSTEM_DEFAULT_ACCENT?.[system];
    if (naturalDefault && accent === prevNatural) setAccent(naturalDefault);
  };

  return (
    <div className="page">
      <div className="grain" />
      <SystemSwitcher
        system={system}
        accent={accent}
        onSystem={handleSystem}
        onAccent={setAccent}
      />
      <main className="ds-shell">
        <Hero system={system} />
        <SystemsOverview system={system} onSystem={handleSystem} />
        <FlowDiagramsSection accent={accent} />
        <Typography system={system} />
        <Color system={system} accent={accent} />
        <Geometry system={system} />
        <Components />
        <ListUnit />
        <PageTemplates />
        <Footer system={system} />
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

/* Home Layouts — two directions, both hero-less.
   index   · dense reference-book listing (L1 → L2 with L3 counts)
   curated · featured-first grid with stats + recently indexed          */
const Icon3 = window.AVIcon;
const subsOf = id => window.AV_SUBCATEGORIES[id] || [];
const l3Of = id => (window.AV_SUBSUBCATEGORIES || {})[id] || [];

/* Content kinds — the "future content types" axis. Derived from tags today;
   admin can later promote this to a first-class field on each resource. */
window.AV_KINDS = [
  { id: 'tools',     name: 'Tools & SDKs',   match: r => ['sdk','cli','gpu','pipeline','automation'].some(t => (r.tags||[]).includes(t)) },
  { id: 'libraries', name: 'Libraries',      match: r => ['javascript','python','bindings','mse'].some(t => (r.tags||[]).includes(t)) },
  { id: 'standards', name: 'Standards',      match: r => r.cat === 'standards-industry' },
  { id: 'events',    name: 'Events',         match: r => r.cat === 'community-events' },
  { id: 'protocols', name: 'Protocols',      match: r => r.cat === 'protocols-transport' },
];
const kindCount = k => AV_RESOURCES.filter(k.match).length;

/* ─── shared atoms ─── */
function StatStrip({ items }) {
  return (
    <div className="stat-strip" style={{
      display: 'grid', gridTemplateColumns: `repeat(${items.length}, minmax(0,1fr))`,
      gap: 1, background: 'var(--border)', border: 'var(--hairline-w) solid var(--border)',
      borderRadius: 'var(--radius)', overflow: 'hidden',
    }}>
      {items.map(([k, v, sub]) => (
        <div key={k} style={{ background: 'var(--bg)', padding: '16px 18px', minWidth: 0 }}>
          <div className="mono" style={{ fontSize: 9.5, letterSpacing: '0.18em', color: 'var(--text-3)', marginBottom: 6 }}>{k}</div>
          <div className="display-h" style={{ fontSize: 26, fontFeatureSettings: '"tnum"' }}>{v}</div>
          {sub && <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 4 }}>{sub}</div>}
        </div>
      ))}
    </div>
  );
}

function KindStrip() {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }} aria-label="Content types in this index">
      {AV_KINDS.map(k => (
        <span key={k.id} className="chip" style={{ padding: '6px 12px', fontSize: 10.5, background: 'var(--surface)', cursor: 'default' }}>
          {k.name}<span style={{ color: 'var(--text-3)', marginLeft: 6 }}>{kindCount(k)}</span>
        </span>
      ))}
    </div>
  );
}

function ResCard({ r, go, delay = 0 }) {
  const cat = AV_CATEGORIES.find(c => c.id === r.cat);
  return (
    <div className="card hoverable glow" style={{ padding: 20, animation: `fadeIn 400ms ease ${delay}ms backwards` }} onClick={() => go('resource', { resource: r })}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', flexShrink: 0, color: 'var(--accent)', fontSize: 16 }}>{cat?.icon || '◆'}</div>
        {r.featured && <span className="chip accent" style={{ fontSize: 9.5 }}>★ FEATURED</span>}
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 600, letterSpacing: -0.2, marginBottom: 8, lineHeight: 1.3 }}>{r.title}</h3>
      <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55, marginBottom: 14 }}>{r.desc}</p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {(r.tags || []).slice(0, 3).map((tag, i) => <span key={i} className="chip mono">#{tag}</span>)}
      </div>
    </div>
  );
}
window.ResCard = ResCard;

function CatCard({ cat, go, delay = 0 }) {
  return (
    <div className="card hoverable glow" style={{ padding: 22, animation: `fadeIn 400ms ease ${delay}ms backwards`, cursor: 'pointer' }} onClick={() => go('category', { cat })}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', fontSize: 18, color: 'var(--accent)' }}>{cat.icon}</div>
        <span className="chip mono">{cat.count}</span>
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 600, letterSpacing: -0.3, marginBottom: 8 }}>{cat.name}</h3>
      <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55 }}>{cat.desc}</p>
      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>Explore<Icon3 name="arrow" size={10} /></div>
    </div>
  );
}
window.CatCard = CatCard;

function SectionHeader({ eyebrow, title, sub, aside }) {
  return (
    <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <div>
        {eyebrow && <div className="eyebrow" style={{ marginBottom: 10 }}>{eyebrow}</div>}
        <h2 className="display-h" style={{ fontSize: 'clamp(22px, 3vw, 30px)' }}>{title}</h2>
        {sub && <p style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 8, maxWidth: 600 }}>{sub}</p>}
      </div>
      {aside}
    </div>
  );
}
window.SectionHeader = SectionHeader;

const l3Total = () => Object.values(window.AV_SUBSUBCATEGORIES || {}).flat().length;

/* ═══ A · INDEX — dense reference book ═══ */
function HomeIndex({ go, t }) {
  const recent = AV_RESOURCES.slice(0, 5);
  return (
    <div style={{ animation: 'fadeIn 0.5s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div className="eyebrow"><span className="live-dot" />INDEX · {AV_TOTAL.toLocaleString()} ENTRIES · UPDATED TODAY</div>
        <KindStrip go={go} />
      </div>
      <StatStrip items={[
        ['RESOURCES', AV_TOTAL.toLocaleString(), '+12 this week'],
        ['CATEGORIES', AV_CATEGORIES.length, `${AV_TOTAL_SUBCATS} subcategories`],
        ['NESTED GROUPS', l3Total(), 'L3 depth'],
        ['FEATURED', AV_RESOURCES.filter(r => r.featured).length, 'hand-picked'],
      ]} />

      <div className="index-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 40, marginTop: 40, alignItems: 'start' }}>
        {/* Main: every category, every sub, L3 counts */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '28px 32px' }}>
          {AV_CATEGORIES.map((cat, i) => {
            const subs = subsOf(cat.id);
            return (
              <section key={cat.id} style={{ animation: `fadeIn 400ms ease ${i * 30}ms backwards` }}>
                <button onClick={() => go('category', { cat })} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '0 0 10px', borderBottom: 'var(--hairline-w) solid var(--border-strong)', marginBottom: 6 }}>
                  <span style={{ color: 'var(--accent)', fontSize: 15 }}>{cat.icon}</span>
                  <h3 style={{ fontSize: 15, fontWeight: 600, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat.name}</h3>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{cat.count}</span>
                </button>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {subs.map(sub => {
                    const n3 = l3Of(sub.id).length;
                    return (
                      <button key={sub.id} onClick={() => go('subcategory', { cat, sub })} className="index-row"
                        style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto auto', gap: 10, alignItems: 'center', padding: '7px 0', background: 'transparent', border: 'none', borderBottom: 'var(--hairline-w) solid var(--hairline)', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, textAlign: 'left' }}>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub.name}</span>
                        {n3 > 0 ? <span className="mono" title={`${n3} nested groups`} style={{ fontSize: 9, color: 'var(--text-3)', border: '1px solid var(--border)', borderRadius: 3, padding: '0 4px' }}>+{n3}</span> : <span />}
                        <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)', fontFeatureSettings: '"tnum"', minWidth: 28, textAlign: 'right' }}>{sub.count}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {/* Rail: recently indexed + featured shortlist */}
        <aside className="index-rail" style={{ position: 'sticky', top: 84, display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 12 }}>── RECENTLY INDEXED</div>
            <div style={{ borderTop: 'var(--hairline-w) solid var(--border)' }}>
              {recent.map((r, i) => (
                <button key={r.id} onClick={() => go('resource', { resource: r })} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: 'var(--hairline-w) solid var(--hairline)', padding: '10px 0', color: 'inherit', cursor: 'pointer', fontFamily: 'inherit', display: 'grid', gridTemplateColumns: '28px 1fr', gap: 10 }}>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--text-3)', paddingTop: 2 }}>0{i + 1}</span>
                  <span>
                    <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, lineHeight: 1.3 }}>{r.title}</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{AV_CATEGORIES.find(c => c.id === r.cat)?.short} · {r.tags?.[0]}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="card" style={{ padding: 18 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>── CONTRIBUTE</div>
            <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5, marginBottom: 12 }}>Know a tool, spec, or event that belongs here? Submissions are reviewed weekly.</p>
            <button className="btn primary" onClick={() => go('submit')} style={{ width: '100%' }}>Submit a resource</button>
          </div>
        </aside>
      </div>
      <style>{`
        .index-row:hover { color: var(--text) !important; }
        @media (max-width: 1024px) { .index-grid { grid-template-columns: 1fr !important; } .index-rail { position: static !important; } }
        @media (max-width: 640px) { .stat-strip { grid-template-columns: repeat(2, minmax(0,1fr)) !important; } }
      `}</style>
    </div>
  );
}
window.HomeIndex = HomeIndex;

/* ═══ B · CURATED — featured-first, no hero ═══ */
function HomeCurated({ go, t }) {
  const featured = AV_RESOURCES.filter(r => r.featured).slice(0, 6);
  const recent = AV_RESOURCES.slice(6, 12);
  return (
    <div style={{ animation: 'fadeIn 0.5s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div className="eyebrow"><span className="live-dot" />CURATED · WEEK 37 · {AV_TOTAL.toLocaleString()} INDEXED</div>
        <KindStrip go={go} />
      </div>
      <StatStrip items={[
        ['RESOURCES', AV_TOTAL.toLocaleString(), '+12 this week'],
        ['CATEGORIES', AV_CATEGORIES.length, `${AV_TOTAL_SUBCATS} subcategories`],
        ['FEATURED', featured.length, 'this week'],
        ['CONTRIBUTORS', 3, 'reviewing'],
      ]} />

      <div style={{ marginTop: 48 }}>
        <SectionHeader eyebrow="── FEATURED" title={<>Hand-picked <span className="serif-italic" style={{ color: 'var(--accent)' }}>highlights</span></>}
          aside={<button className="btn ghost" onClick={() => go('category', { cat: AV_CATEGORIES[1] })}>Browse all →</button>} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {featured.map((r, i) => <ResCard key={r.id} r={r} go={go} delay={i * 40} />)}
        </div>
      </div>

      <div style={{ marginTop: 64 }}>
        <SectionHeader eyebrow="── RECENTLY INDEXED" title="Fresh from the index" />
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {recent.map((r, i) => {
            const cat = AV_CATEGORIES.find(c => c.id === r.cat);
            return (
              <button key={r.id} onClick={() => go('resource', { resource: r })} className="recent-row"
                style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', borderTop: i ? 'var(--hairline-w) solid var(--hairline)' : 'none', padding: '14px 18px', color: 'inherit', cursor: 'pointer', fontFamily: 'inherit', display: 'grid', gridTemplateColumns: '36px minmax(0,1fr) auto', gap: 14, alignItems: 'center' }}>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)' }}>0{i + 1}</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14.5, fontWeight: 600 }}>{r.title}</span>
                    <span className="chip muted" style={{ fontSize: 9, padding: '1px 6px' }}>{cat?.short}</span>
                  </span>
                  <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-2)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.desc}</span>
                </span>
                <span style={{ color: 'var(--text-3)', display: 'flex' }}><Icon3 name="arrow" size={12} /></span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 64 }}>
        <SectionHeader eyebrow="── CATEGORIES" title={<>Nine domains, <span className="serif-italic" style={{ color: 'var(--text-2)' }}>one taxonomy</span></>} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {AV_CATEGORIES.map((cat, i) => <CatCard key={cat.id} cat={cat} go={go} delay={i * 30} />)}
        </div>
      </div>
      <style>{`
        .recent-row:hover { background: var(--surface) !important; }
        @media (max-width: 640px) { .stat-strip { grid-template-columns: repeat(2, minmax(0,1fr)) !important; } }
      `}</style>
    </div>
  );
}
window.HomeCurated = HomeCurated;
/* Back-compat aliases so nothing else breaks */
window.HomeFeaturedGrid = HomeCurated;
window.HomeCategoryFirst = HomeCurated;
window.HomeMagazine = HomeCurated;

/* Home Layouts — multiple swappable variants, no hero */
const Icon3 = window.AVIcon;

function ResCard({ r, go, delay = 0 }) {
  const cat = AV_CATEGORIES.find(c => c.id === r.cat);
  return (
    <div
      className="card hoverable glow"
      style={{ padding: 20, animation: `fadeIn 400ms ease ${delay}ms backwards` }}
      onClick={() => go('resource', { resource: r })}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, color: 'var(--accent)', fontSize: 16,
        }}>
          {cat?.icon || '◆'}
        </div>
        {r.featured && <span className="chip accent" style={{ fontSize: 9.5 }}>★ FEATURED</span>}
      </div>
      <h3 style={{
        fontSize: 16, fontWeight: 600, letterSpacing: -0.2,
        marginBottom: 8, lineHeight: 1.3,
      }}>{r.title}</h3>
      <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55, marginBottom: 14 }}>
        {r.desc}
      </p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {(r.tags || []).slice(0, 3).map((tag, i) => (
          <span key={i} className="chip mono">#{tag}</span>
        ))}
      </div>
    </div>
  );
}
window.ResCard = ResCard;

function CatCard({ cat, go, delay = 0, big = false }) {
  return (
    <div
      className="card hoverable glow"
      style={{
        padding: big ? 28 : 22,
        animation: `fadeIn 400ms ease ${delay}ms backwards`,
        cursor: 'pointer',
      }}
      onClick={() => go('category', { cat })}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: big ? 22 : 16 }}>
        <div style={{
          width: big ? 52 : 40, height: big ? 52 : 40, borderRadius: big ? 10 : 8,
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: big ? 22 : 18, color: 'var(--accent)',
        }}>
          {cat.icon}
        </div>
        <span className="chip mono">{cat.count}</span>
      </div>
      <h3 style={{
        fontSize: big ? 20 : 16, fontWeight: 600, letterSpacing: -0.3, marginBottom: 8,
      }}>{cat.name}</h3>
      <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55 }}>
        {cat.desc}
      </p>
      <div style={{
        marginTop: big ? 22 : 16, display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 12, color: 'var(--accent)', fontWeight: 500,
      }}>
        Explore
        <Icon3 name="arrow" size={10} />
      </div>
    </div>
  );
}
window.CatCard = CatCard;

/* ============== HOME LAYOUTS ============== */

function HomeFeaturedGrid({ go, t }) {
  const featured = AV_RESOURCES.filter(r => r.featured).slice(0, 6);
  return (
    <div style={{ animation: 'fadeIn 0.5s ease' }}>
      <SectionHeader
        eyebrow="── FEATURED RESOURCES"
        title={<>Hand-picked <span className="serif-italic" style={{ color: 'var(--accent)' }}>highlights</span></>}
        sub={`${featured.length} of ${AV_TOTAL.toLocaleString()} resources stand out this week.`}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginBottom: 64 }}>
        {featured.map((r, i) => <ResCard key={r.id} r={r} go={go} delay={i * 40} />)}
      </div>

      <SectionHeader
        eyebrow="── ALL CATEGORIES"
        title={<>Nine domains, <span className="serif-italic" style={{ color: 'var(--text-2)' }}>one taxonomy</span></>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {AV_CATEGORIES.map((cat, i) => (
          <CatCard key={cat.id} cat={cat} go={go} delay={i * 30} />
        ))}
      </div>
    </div>
  );
}
window.HomeFeaturedGrid = HomeFeaturedGrid;

function HomeCategoryFirst({ go, t }) {
  return (
    <div style={{ animation: 'fadeIn 0.5s ease' }}>
      <div style={{ marginBottom: 48 }}>
        <div className="eyebrow" style={{ marginBottom: 16 }}>
          <span className="live-dot" />
          BROWSE BY CATEGORY · {AV_TOTAL.toLocaleString()} RESOURCES
        </div>
        <h1 style={{
          fontSize: 'clamp(28px, 4vw, 44px)',
          fontWeight: 700, letterSpacing: -1.2, lineHeight: 1.1,
          maxWidth: 700,
        }}>
          A curated, indexed atlas of <span className="serif-italic" style={{ color: 'var(--accent)' }}>video tooling.</span>
        </h1>
        <div className="shimmer-line" style={{ width: 200, marginTop: 18 }} />
      </div>

      {/* Featured 2-up + 8 small */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16, marginBottom: 18,
      }}>
        {AV_CATEGORIES.slice(0, 2).map((cat, i) => (
          <CatCard key={cat.id} cat={cat} go={go} delay={i * 40} big />
        ))}
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, marginBottom: 56,
      }}>
        {AV_CATEGORIES.slice(2).map((cat, i) => (
          <div
            key={cat.id}
            className="card hoverable"
            style={{ padding: 16, animation: `fadeIn 400ms ease ${i * 30}ms backwards`, cursor: 'pointer' }}
            onClick={() => go('category', { cat })}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 14, color: 'var(--accent)' }}>{cat.icon}</span>
              <h4 style={{ fontSize: 13.5, fontWeight: 600, flex: 1 }}>{cat.name}</h4>
              <span className="mono" style={{ fontSize: 10, color: 'var(--text-3)' }}>{cat.count}</span>
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.5 }}>
              {cat.short}
            </p>
          </div>
        ))}
      </div>

      <SectionHeader
        eyebrow="── RECENTLY UPDATED"
        title={<>Fresh from <span className="serif-italic" style={{ color: 'var(--text-2)' }}>the index</span></>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {AV_RESOURCES.slice(0, 6).map((r, i) => <ResCard key={r.id} r={r} go={go} delay={i * 30} />)}
      </div>
    </div>
  );
}
window.HomeCategoryFirst = HomeCategoryFirst;

function HomeMagazine({ go, t }) {
  const [hero, ...rest] = AV_RESOURCES.filter(r => r.featured);
  return (
    <div style={{ animation: 'fadeIn 0.5s ease' }}>
      <div className="eyebrow" style={{ marginBottom: 24 }}>
        <span className="live-dot" />
        FIELD JOURNAL · ISSUE 26 · MAY 2026
      </div>

      {/* Magazine: large lead + sidebar */}
      <div style={{
        display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 28,
        marginBottom: 64,
      }} className="mag-grid">
        <div
          className="card hoverable glow"
          style={{ padding: 32, cursor: 'pointer', animation: 'fadeIn 400ms ease backwards' }}
          onClick={() => hero && go('resource', { resource: hero })}
        >
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            <span className="chip accent">LEAD STORY</span>
            <span className="chip">{hero?.cat}</span>
          </div>
          <h2 className="serif-italic" style={{
            fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 400, letterSpacing: -1, lineHeight: 1.1,
            marginBottom: 16, color: 'var(--text)',
          }}>
            {hero?.title}
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.6, maxWidth: 580 }}>
            {hero?.desc}
          </p>
          <div style={{ marginTop: 24, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(hero?.tags || []).map((tag, i) => (
              <span key={i} className="chip mono">#{tag}</span>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {rest.slice(0, 4).map((r, i) => (
            <div key={r.id}
              className="card hoverable"
              style={{ padding: 16, cursor: 'pointer', animation: `fadeIn 400ms ease ${i * 50}ms backwards` }}
              onClick={() => go('resource', { resource: r })}
            >
              <div className="mono" style={{ fontSize: 10, color: 'var(--accent)', marginBottom: 6, letterSpacing: 1 }}>
                0{i + 1}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                {r.title}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                {r.desc.slice(0, 80)}…
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) { .mag-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      <SectionHeader
        eyebrow="── DEPARTMENTS"
        title={<>Browse by <span className="serif-italic" style={{ color: 'var(--text-2)' }}>category</span></>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {AV_CATEGORIES.map((cat, i) => (
          <CatCard key={cat.id} cat={cat} go={go} delay={i * 30} />
        ))}
      </div>
    </div>
  );
}
window.HomeMagazine = HomeMagazine;

function HomeIndex({ go, t }) {
  // Dense, low-graphic, ASCII-vibe index
  return (
    <div style={{ animation: 'fadeIn 0.5s ease' }}>
      <div className="eyebrow" style={{ marginBottom: 16 }}>
        <span className="live-dot" />
        INDEX · {AV_TOTAL.toLocaleString()} ENTRIES
      </div>
      <h1 className="mono" style={{
        fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 600, letterSpacing: -0.5, marginBottom: 36,
        lineHeight: 1.3,
      }}>
        <span className="caret">~/awesome.video</span>
      </h1>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 32,
      }}>
        {AV_CATEGORIES.map((cat, i) => {
          const subs = AV_SUBCATEGORIES[cat.id] || [];
          return (
            <div key={cat.id} style={{ animation: `fadeIn 400ms ease ${i * 30}ms backwards` }}>
              <div
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}
                onClick={() => go('category', { cat })}
              >
                <span style={{ color: 'var(--accent)', fontSize: 16 }}>{cat.icon}</span>
                <h3 style={{ fontSize: 16, fontWeight: 600, flex: 1 }}>{cat.name}</h3>
                <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{cat.count}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {subs.slice(0, 6).map((sub) => (
                  <div
                    key={sub.id}
                    onClick={() => go('subcategory', { cat, sub })}
                    style={{
                      display: 'flex', justifyContent: 'space-between',
                      padding: '6px 0', cursor: 'pointer', fontSize: 13,
                      color: 'var(--text-2)', transition: 'color 160ms ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-2)'}
                  >
                    <span>– {sub.name}</span>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{sub.count}</span>
                  </div>
                ))}
                {subs.length > 6 && (
                  <div onClick={() => go('category', { cat })}
                    style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic', marginTop: 4, cursor: 'pointer' }}>
                    + {subs.length - 6} more →
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
window.HomeIndex = HomeIndex;

/* Helper */
function SectionHeader({ eyebrow, title, sub }) {
  return (
    <div style={{ marginBottom: 24 }}>
      {eyebrow && (
        <div className="mono" style={{ fontSize: 11, letterSpacing: 1.8, color: 'var(--accent)', fontWeight: 700, marginBottom: 10 }}>
          {eyebrow}
        </div>
      )}
      <h2 style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 700, letterSpacing: -0.8, lineHeight: 1.15 }}>
        {title}
      </h2>
      {sub && <p style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 8, maxWidth: 600 }}>{sub}</p>}
    </div>
  );
}
window.SectionHeader = SectionHeader;

/* Page Components — Category, Subcategory, Resource, Submit, About */
const Icon4 = window.AVIcon;

/* ============== CATEGORY PAGE ============== */
function CategoryPage({ cat, go, t }) {
  const subs = AV_SUBCATEGORIES[cat.id] || [];
  const resources = AV_RESOURCES.filter(r => r.cat === cat.id);

  return (
    <div className="page-content" style={{ animation: 'fadeIn 0.5s ease' }}>
      <button className="btn ghost" style={{ marginBottom: 20 }} onClick={() => go('home')}>
        <Icon4 name="arrowLeft" size={12} />
        Browse
      </button>

      <div>
        <div className="eyebrow" style={{ marginBottom: 16 }}>
          <span style={{ fontSize: 14 }}>{cat.icon}</span>
          CATEGORY · {cat.short.toUpperCase()}
        </div>
        <h1 style={{
          fontSize: 'clamp(36px, 5vw, 56px)',
          fontWeight: 700, letterSpacing: -1.5, lineHeight: 1.05, marginBottom: 16,
        }}>
          {cat.name}
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text-2)', maxWidth: 700, lineHeight: 1.6 }}>
          {cat.desc}
        </p>
        <div style={{ marginTop: 18, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className="chip accent">{cat.count} resources</span>
          {subs.length > 0 && <span className="chip">{subs.length} subcategories</span>}
        </div>
      </div>

      {subs.length > 0 && (
        <section style={{ marginTop: 56 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-2)' }}>
            Subcategories
          </h2>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12,
          }}>
            {subs.map((s, i) => (
              <div key={s.id} className="card hoverable" style={{
                padding: '14px 18px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                animation: `fadeIn 400ms ease ${i * 30}ms backwards`,
              }} onClick={() => go('subcategory', { cat, sub: s })}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{s.name}</span>
                <span className="chip mono">{s.count}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section style={{ marginTop: 56 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-2)' }}>
          {resources.length > 0 ? `Resources (${resources.length})` : 'Coming soon'}
        </h2>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16,
        }}>
          {(resources.length > 0 ? resources : AV_RESOURCES.slice(0, 6)).map((r, i) => (
            <ResCard key={r.id} r={r} go={go} delay={i * 30} />
          ))}
        </div>
      </section>
    </div>
  );
}
window.CategoryPage = CategoryPage;

/* ============== SUBCATEGORY PAGE ============== */
function SubcategoryPage({ cat, sub, go, t }) {
  const resources = AV_RESOURCES.filter(r => r.cat === cat.id && r.sub === sub.id);
  const fallback = AV_RESOURCES.filter(r => r.cat === cat.id).slice(0, 6);
  const list = resources.length ? resources : fallback;

  return (
    <div className="page-content" style={{ animation: 'fadeIn 0.5s ease' }}>
      {/* Breadcrumbs */}
      <div className="mono" style={{
        fontSize: 11, letterSpacing: 1.4, color: 'var(--text-3)',
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, flexWrap: 'wrap',
      }}>
        <a onClick={() => go('home')} style={{ cursor: 'pointer', color: 'var(--text-2)' }}>HOME</a>
        <span>/</span>
        <a onClick={() => go('category', { cat })} style={{ cursor: 'pointer', color: 'var(--text-2)' }}>
          {cat.name.toUpperCase()}
        </a>
        <span>/</span>
        <span style={{ color: 'var(--accent)' }}>{sub.name.toUpperCase()}</span>
      </div>

      <div>
        <h1 style={{
          fontSize: 'clamp(32px, 5vw, 52px)',
          fontWeight: 700, letterSpacing: -1.5, lineHeight: 1.05, marginBottom: 12,
        }}>
          <span className="serif-italic" style={{ color: 'var(--accent)' }}>{sub.name.split(' ')[0]}</span>
          {sub.name.split(' ').slice(1).length > 0 && ' ' + sub.name.split(' ').slice(1).join(' ')}
        </h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text-2)', flexWrap: 'wrap' }}>
          <span className="chip accent">{sub.count} resources</span>
          <span style={{ fontSize: 13 }}>in {cat.name}</span>
        </div>
      </div>

      <section style={{ marginTop: 40 }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16,
        }}>
          {list.map((r, i) => (
            <ResCard key={r.id || i} r={r} go={go} delay={i * 30} />
          ))}
        </div>
      </section>
    </div>
  );
}
window.SubcategoryPage = SubcategoryPage;

/* ============== RESOURCE DETAIL ============== */
function ResourcePage({ resource, go }) {
  const cat = AV_CATEGORIES.find(c => c.id === resource.cat);

  return (
    <div className="page-content" style={{ maxWidth: 880, animation: 'fadeIn 0.5s ease' }}>
      <button className="btn ghost" style={{ marginBottom: 28 }} onClick={() => go('home')}>
        <Icon4 name="arrowLeft" size={12} />
        Back
      </button>

      <div>
        <div className="eyebrow">RESOURCE · DETAIL</div>
        <h1 style={{
          fontSize: 'clamp(28px, 4vw, 44px)',
          fontWeight: 700, letterSpacing: -1.2, lineHeight: 1.1, marginBottom: 18, marginTop: 18,
        }}>
          {resource.title}
        </h1>
        <div className="shimmer-line" style={{ width: 200, marginBottom: 24 }} />

        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {cat && <span className="chip">{cat.icon} {cat.name}</span>}
          {resource.featured && <span className="chip accent">★ FEATURED</span>}
        </div>
      </div>

      <div className="card" style={{ padding: 28, marginBottom: 16 }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: 1.4, color: 'var(--accent)', marginBottom: 10 }}>
          DESCRIPTION
        </div>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--text)' }}>
          {resource.desc}
        </p>
      </div>

      {resource.url && (
        <div className="card" style={{ padding: 28, marginBottom: 16 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: 1.4, color: 'var(--accent)', marginBottom: 10 }}>
            CANONICAL URL
          </div>
          <a href={resource.url} target="_blank" rel="noreferrer" style={{
            color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 13,
            textDecoration: 'none', wordBreak: 'break-all',
          }}>
            {resource.url} ↗
          </a>
        </div>
      )}

      <div className="card" style={{ padding: 28 }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: 1.4, color: 'var(--accent)', marginBottom: 12 }}>
          TAGS
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(resource.tags || []).map((tag, i) => (
            <span key={i} className="chip mono accent">#{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
window.ResourcePage = ResourcePage;

/* ============== SUBMIT PAGE ============== */
function SubmitPage({ go }) {
  return (
    <div className="page-content" style={{ maxWidth: 720, animation: 'fadeIn 0.5s ease' }}>
      <div className="eyebrow" style={{ marginBottom: 16 }}>
        <Icon4 name="plus" size={12} />
        SUBMIT A RESOURCE
      </div>
      <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, letterSpacing: -1, lineHeight: 1.1, marginBottom: 14 }}>
        Add to the <span className="serif-italic" style={{ color: 'var(--accent)' }}>index</span>
      </h1>
      <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 36 }}>
        Submit a tool, library, paper, or talk. We hand-review every entry before it lands in the catalog.
      </p>

      <div className="card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="field">
          <label>Title</label>
          <input className="input" placeholder="e.g. ffmpeg-python" />
        </div>
        <div className="field">
          <label>URL</label>
          <input className="input" placeholder="https://github.com/..." />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="field">
            <label>Category</label>
            <select className="select" defaultValue="">
              <option value="" disabled>Select…</option>
              {AV_CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Tags</label>
            <input className="input" placeholder="comma,separated" />
          </div>
        </div>
        <div className="field">
          <label>Description</label>
          <textarea className="textarea" placeholder="What does this do? Why is it useful?" />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
          <button className="btn ghost" onClick={() => go('home')}>Cancel</button>
          <button className="btn primary">Submit for review</button>
        </div>
      </div>
    </div>
  );
}
window.SubmitPage = SubmitPage;

/* ============== ABOUT PAGE ============== */
function AboutPage({ go }) {
  return (
    <div className="page-content" style={{ maxWidth: 760, animation: 'fadeIn 0.5s ease' }}>
      <div className="eyebrow" style={{ marginBottom: 16 }}>
        <Icon4 name="book" size={12} />
        ABOUT THIS PROJECT
      </div>
      <h1 style={{ fontSize: 'clamp(32px, 4.5vw, 48px)', fontWeight: 700, letterSpacing: -1.2, lineHeight: 1.1, marginBottom: 18 }}>
        A field journal for <span className="serif-italic" style={{ color: 'var(--accent)' }}>video engineers</span>
      </h1>
      <div className="shimmer-line" style={{ width: 220, marginBottom: 28 }} />

      <div className="card" style={{ padding: 28, marginBottom: 14 }}>
        <p style={{ fontSize: 15.5, lineHeight: 1.7, color: 'var(--text)' }}>
          Awesome.video is a hand-curated index of {AV_TOTAL.toLocaleString()} resources across {AV_CATEGORIES.length} domains —
          encoding, transport, players, infrastructure, standards. Maintained as the canonical reference for people
          who actually ship video in production.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginTop: 14 }}>
        {[
          { k: 'No link farms', v: 'Every entry is read, classified, and tested before inclusion.' },
          { k: 'Open source', v: 'All metadata lives in a public repo. Submit corrections via PR or form.' },
          { k: 'Versioned', v: 'Quarterly snapshots. Archive of every entry change.' },
          { k: 'Built for ops', v: 'Designed to be readable from a terminal as much as a browser.' },
        ].map((it, i) => (
          <div key={i} className="card" style={{ padding: 18 }}>
            <div className="mono" style={{ fontSize: 10, color: 'var(--accent)', marginBottom: 6 }}>
              0{i + 1}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{it.k}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5 }}>{it.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
window.AboutPage = AboutPage;

// Home / Category / Subcategory / Resource detail / 404
const { useState: useStateP, useEffect: useEffectP } = React;

window.HomePage = function HomePage({ navigate }) {
  const cats = window.AV_CATEGORIES;
  const accentMap = {
    primary: 'var(--accent-primary)',
    secondary: 'var(--accent-secondary)',
    tertiary: 'var(--accent-tertiary)',
    quaternary: 'var(--accent-quaternary)',
  };

  return (
    <div style={{ padding: '40px 48px', maxWidth: '1400px' }}>
      <div style={{ marginBottom: '36px', animation: 'fadeInUp 0.6s ease-out 0.1s both' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-primary)', letterSpacing: '2px', marginBottom: '8px' }}>// AWESOME.VIDEO :: v2.0_NEONCORE</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '48px', fontWeight: 900, letterSpacing: '2px', marginBottom: '12px', color: 'var(--text-primary)', textShadow: '0 0 20px var(--accent-primary)' }}>
          AWESOME <span style={{ color: 'var(--accent-primary)' }}>VIDEO</span>
        </h1>
        <p style={{ fontSize: '17px', color: 'var(--text-secondary)', maxWidth: '720px', lineHeight: 1.6 }}>
          A curated collection of <span style={{ color: 'var(--accent-primary)' }}>1,953 resources</span> across <span style={{ color: 'var(--accent-tertiary)' }}>9 categories</span> covering everything from codecs to delivery, players to standards.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
        {cats.map((cat, idx) => {
          const color = accentMap[cat.accent];
          return (
            <div key={cat.id}
              onClick={() => navigate({ view: 'category', categoryId: cat.id })}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '20px',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                animation: `fadeInUp 0.5s ease-out ${0.15 + idx * 0.05}s both`,
                transition: 'transform 0.25s, border-color 0.25s, box-shadow 0.25s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = color;
                e.currentTarget.style.boxShadow = `0 8px 30px ${color}33, 0 0 20px ${color}55`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', background: color, boxShadow: `0 0 12px ${color}` }}></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' }}>
                <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${color}`, borderRadius: '4px', color, fontSize: '18px', fontFamily: 'var(--font-mono)' }}>{cat.icon}</div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>{cat.name}</h3>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color, marginTop: '2px' }}>{cat.count} RESOURCES</div>
                </div>
                <span style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>→</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{cat.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

window.CategoryPage = function CategoryPage({ categoryId, navigate }) {
  const cat = window.AV_CATEGORIES.find(c => c.id === categoryId);
  if (!cat) return null;
  const accentMap = { primary: 'var(--accent-primary)', secondary: 'var(--accent-secondary)', tertiary: 'var(--accent-tertiary)', quaternary: 'var(--accent-quaternary)' };
  const color = accentMap[cat.accent];

  // get sample resources or fallback
  const resources = window.AV_RESOURCES.filter(r => r.cat === categoryId);
  const subs = window.AV_SUBCATEGORIES[categoryId] || [];

  return (
    <div style={{ padding: '36px 48px', maxWidth: '1400px' }}>
      <div style={{ marginBottom: '32px', animation: 'fadeInUp 0.5s ease-out both' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' }}>
          <div style={{ width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${color}`, borderRadius: '4px', color, fontSize: '20px' }}>{cat.icon}</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '34px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '1px', textShadow: `0 0 14px ${color}` }}>
            {cat.name}
          </h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '720px' }}>{cat.desc}</p>
        <div style={{ marginTop: '12px', fontFamily: 'var(--font-mono)', fontSize: '12px', color }}>
          {cat.count} resources {subs.length > 0 && ` · ${subs.length} subcategories`}
        </div>
      </div>

      {subs.length > 0 && (
        <div style={{ marginBottom: '36px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '14px', color: 'var(--text-tertiary)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '14px' }}>// SUBCATEGORIES</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {subs.map((sub, i) => (
              <div key={sub.id}
                onClick={() => navigate({ view: 'subcategory', categoryId, subcategoryId: sub.id })}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.2s',
                  animation: `fadeInUp 0.4s ease-out ${0.1 + i * 0.03}s both`,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateX(4px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'translateX(0)'; }}
              >
                <span style={{ fontSize: '14px', fontWeight: 600 }}>{sub.name}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color, padding: '2px 8px', border: `1px solid ${color}`, borderRadius: '3px' }}>{sub.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '14px', color: 'var(--text-tertiary)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '14px' }}>// RESOURCES</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '16px' }}>
        {(resources.length > 0 ? resources : Array.from({ length: 9 }, (_, i) => ({ id: `mock-${i}`, title: `${cat.short} Resource ${i+1}`, desc: 'A curated resource related to this category. Click through for full details and external link.', tags: ['video', 'streaming'] }))).map((r, i) => (
          <div key={r.id}
            onClick={() => navigate({ view: 'resource', resourceId: r.id || 184739 })}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderLeft: `2px solid ${color}`,
              borderRadius: '4px',
              padding: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              animation: `fadeInUp 0.4s ease-out ${0.15 + i * 0.04}s both`,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 4px 18px ${color}33`; e.currentTarget.style.borderLeftWidth = '4px'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderLeftWidth = '2px'; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
              <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>{r.title}</h3>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>↗</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '10px' }}>{r.desc}</p>
            {r.tags && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {r.tags.slice(0, 3).map(t => (
                  <span key={t} style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color, padding: '2px 6px', background: 'var(--bg-elevated)', border: `1px solid ${color}55`, borderRadius: '3px' }}>#{t}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

window.SubcategoryPage = function SubcategoryPage({ categoryId, subcategoryId, subSubId, navigate }) {
  const cat = window.AV_CATEGORIES.find(c => c.id === categoryId);
  const accentMap = { primary: 'var(--accent-primary)', secondary: 'var(--accent-secondary)', tertiary: 'var(--accent-tertiary)', quaternary: 'var(--accent-quaternary)' };
  const color = cat ? accentMap[cat.accent] : 'var(--accent-primary)';
  const subs = (window.AV_SUBCATEGORIES[categoryId] || []);
  const sub = subs.find(s => s.id === subcategoryId);
  const subSub = subSubId && sub?.children ? sub.children.find(c => c.id === subSubId) : null;

  // Pick resources
  let resources = [];
  let title = '';
  let count = 0;
  if (subSub) {
    title = subSub.name;
    count = subSub.count;
    resources = subSubId === 'hls' ? window.AV_HLS_RESOURCES : Array.from({ length: subSub.count }, (_, i) => ({ title: `${title} Resource ${i+1}`, desc: `Resource within the ${title} sub-subcategory.` }));
  } else if (sub) {
    title = sub.name;
    count = sub.count;
    resources = subcategoryId === 'ai-machine-learning-tools' ? window.AV_AIML_RESOURCES : Array.from({ length: Math.min(sub.count, 12) }, (_, i) => ({ title: `${title} Resource ${i+1}`, desc: `Resource within the ${title} subcategory.` }));
  }

  return (
    <div style={{ padding: '32px 48px', maxWidth: '1400px' }}>
      <div onClick={() => navigate(subSub ? { view: 'subcategory', categoryId, subcategoryId } : { view: 'category', categoryId })}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', marginBottom: '20px', transition: 'color 0.15s' }}
        onMouseEnter={(e) => e.currentTarget.style.color = color}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
      >
        ← Back to {subSub ? sub?.name : cat?.name}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '1px' }}>
          {title}
        </h1>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '14px', color, padding: '4px 10px', border: `1px solid ${color}`, borderRadius: '4px' }}>{count}</span>
      </div>
      {!subSub && cat && <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>Category: {cat.name}</div>}

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
        <select style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '6px 10px', borderRadius: '4px', fontSize: '13px' }}>
          <option>Default</option>
          <option>Alphabetical</option>
          <option>Newest</option>
        </select>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-tertiary)' }}>Showing {resources.length} of {count} resources</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '14px' }}>
        {resources.map((r, i) => (
          <div key={i}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              animation: `fadeInUp 0.4s ease-out ${0.1 + i * 0.025}s both`,
            }}
            onClick={() => navigate({ view: 'resource', resourceId: 184739 })}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = `0 0 14px ${color}33`; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '6px' }}>
              <h3 style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{r.title}</h3>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>↗</span>
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.55 }}>{r.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

window.ResourcePage = function ResourcePage({ resourceId, navigate }) {
  const r = window.AV_RESOURCES.find(x => x.id === resourceId) || window.AV_RESOURCES.find(x => x.id === 184739);

  return (
    <div style={{ padding: '36px 48px', maxWidth: '900px' }}>
      <div onClick={() => navigate({ view: 'home' })}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', marginBottom: '24px', transition: 'color 0.15s' }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-primary)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
      >← Back</div>

      <div style={{ animation: 'fadeInUp 0.5s ease-out both' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-primary)', letterSpacing: '2px', marginBottom: '8px' }}>// RESOURCE :: #{r.id}</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '24px', letterSpacing: '0.5px', textShadow: '0 0 14px var(--accent-primary)' }}>
          {r.title}
        </h1>

        {[
          { label: 'DESCRIPTION', content: r.desc },
          { label: 'URL', content: <a href={r.url || '#'} style={{ color: 'var(--accent-primary)', textDecoration: 'underline', wordBreak: 'break-all' }}>{r.url || 'https://www.mpeg.org/standards/'}</a> },
          { label: 'TAGS', content: <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>{(r.tags || ['video']).map(t => <span key={t} style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent-primary)', padding: '4px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--accent-primary)', borderRadius: '4px' }}>#{t}</span>)}</div> },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', borderLeft: '2px solid var(--accent-primary)', borderRadius: '4px', padding: '18px 20px', marginBottom: '14px', animation: `fadeInUp 0.4s ease-out ${0.15 + i*0.08}s both` }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '2px', color: 'var(--accent-primary)', marginBottom: '8px' }}>{s.label}</div>
            <div style={{ fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.7 }}>{s.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

window.NotFoundPage = function NotFoundPage({ navigate }) {
  return (
    <div style={{ padding: '80px 48px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '40px', maxWidth: '500px', textAlign: 'center', animation: 'fadeInUp 0.5s ease-out both' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <span style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>!</span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: 'var(--text-primary)', letterSpacing: '1px' }}>Page Not Found</h1>
        </div>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>We couldn't find the page you're looking for. The page may have been moved or doesn't exist.</p>
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '24px' }}>You can return to the home page to explore our curated collection of awesome resources.</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button onClick={() => navigate({ view: 'home' })} style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '8px 16px', color: 'var(--text-primary)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>≡ Browse Categories</button>
          <button onClick={() => navigate({ view: 'home' })} style={{ background: 'var(--accent-primary)', border: 'none', borderRadius: '4px', padding: '8px 16px', color: 'var(--bg-base)', fontSize: '13px', cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font-body)', boxShadow: '0 0 12px var(--accent-primary)' }}>⌂ Go Home</button>
        </div>
      </div>
    </div>
  );
};

// All views: Home, About, Advanced, Journeys, JourneyDetail, Login, Submit, Theme, Category, Subcategory, SubSubcategory, Resource, 404
const { useState: useStateV, useEffect: useEffectV } = React;

// =================== HOME ===================
function HomeView({ navigate, tweaks }) {
  return (
    <div style={{ padding: '40px 48px', maxWidth: '1400px', animation: 'fadeInUp 0.6s ease-out 0.1s both' }}>
      <div style={{ marginBottom: '40px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-primary)', letterSpacing: '2px', marginBottom: '12px', textShadow: '0 0 8px var(--accent-primary)' }}>// SYS.AWESOME-VIDEO_v2.0 — ONLINE</div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '56px',
          fontWeight: 900,
          letterSpacing: '2px',
          lineHeight: 1.05,
          marginBottom: '16px',
          color: 'var(--text-primary)',
          textShadow: `0 0 ${30 * tweaks.glowIntensity}px var(--accent-primary)`,
        }}>
          AWESOME<span style={{ color: 'var(--accent-primary)' }}>::</span>VIDEO
        </h1>
        <p style={{ fontSize: '18px', color: 'var(--text-secondary)', maxWidth: '720px', marginBottom: '8px' }}>
          A curated index of <span style={{ color: 'var(--accent-tertiary)', fontFamily: 'var(--font-mono)' }}>1,953</span> resources across <span style={{ color: 'var(--accent-secondary)', fontFamily: 'var(--font-mono)' }}>9</span> categories — codecs, players, protocols, tooling, and the people building it all.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: tweaks.layoutDensity === 'compact' ? '12px' : tweaks.layoutDensity === 'spacious' ? '24px' : '16px' }}>
        {window.CATEGORIES.map((cat, i) => (
          <CategoryTile key={cat.id} category={cat} index={i} navigate={navigate} tweaks={tweaks} />
        ))}
      </div>
    </div>
  );
}

function CategoryTile({ category, index, navigate, tweaks }) {
  const [hovered, setHovered] = useStateV(false);

  const cardStyle = {
    background: tweaks.cardStyle === 'glass' ? 'rgba(20,20,25,0.5)' : 'var(--bg-card)',
    backdropFilter: tweaks.cardStyle === 'glass' ? 'blur(10px)' : 'none',
    border: `1px solid ${hovered ? category.color : 'var(--border-subtle)'}`,
    borderRadius: tweaks.cardStyle === 'minimal' ? '0' : '8px',
    padding: '20px',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
    boxShadow: hovered && tweaks.glowIntensity > 0
      ? `0 8px 30px rgba(0,0,0,0.5), 0 0 ${20 * tweaks.glowIntensity}px ${category.color}`
      : '0 2px 12px rgba(0,0,0,0.3)',
    animation: `fadeInUp 0.5s ease-out ${0.15 + index * 0.04}s both`,
  };

  return (
    <div style={cardStyle} onClick={() => navigate({ view: 'category', categoryId: category.id })}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    >
      {tweaks.cardStyle !== 'minimal' && (
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: category.color, boxShadow: `0 0 12px ${category.color}` }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '44px', height: '44px',
          background: 'var(--bg-elevated)',
          border: `1px solid ${category.color}`,
          borderRadius: '6px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px', color: category.color,
          boxShadow: hovered ? `0 0 12px ${category.color}` : 'none',
          transition: 'all 0.25s',
          flexShrink: 0,
        }}>{category.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px', letterSpacing: '0.3px' }}>{category.name}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: category.color, fontWeight: 600 }}>
            {category.count} resources <span style={{ color: 'var(--text-tertiary)', marginLeft: '6px' }}>→</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// =================== ABOUT ===================
function AboutView({ navigate, tweaks }) {
  const featList = [
    { icon: '◇', name: 'Responsive Design', desc: 'Mobile-first' },
    { icon: '◆', name: 'Fast Performance', desc: 'Static generation' },
    { icon: '◈', name: 'Fuzzy Search', desc: 'Find anything' },
    { icon: '◉', name: 'Multiple Themes', desc: 'Customizable' },
    { icon: '○', name: 'Accessible', desc: 'WCAG compliant' },
    { icon: '◎', name: 'SEO Optimized', desc: 'Discoverable' },
    { icon: '◊', name: 'Keyboard Shortcuts', desc: 'Power user' },
    { icon: '◍', name: 'Component Library', desc: 'shadcn/ui' },
  ];
  const techStack = [
    { name: 'React', desc: 'UI component framework', dot: 'var(--accent-primary)' },
    { name: 'Tailwind CSS', desc: 'Utility-first styling', dot: 'var(--text-secondary)' },
    { name: 'shadcn/ui', desc: 'Component library', dot: 'var(--accent-primary)' },
    { name: 'Fuse.js', desc: 'Fuzzy search engine', dot: 'var(--text-secondary)' },
    { name: 'Framer Motion', desc: 'Smooth animations', dot: 'var(--accent-primary)' },
    { name: 'TypeScript', desc: 'Type safety', dot: 'var(--text-secondary)' },
  ];

  return (
    <div style={{ padding: '40px 48px', maxWidth: '1100px', animation: 'fadeInUp 0.5s ease-out both' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <span style={{ fontSize: '24px', color: 'var(--accent-primary)' }}>◈</span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '1px' }}>About</h1>
      </div>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '720px', marginBottom: '40px', fontSize: '15px' }}>
        An SEO-friendly, mobile-first platform that transforms GitHub's curated "Awesome Lists" into beautiful, searchable websites.
      </p>

      <Section title="What is this?" subtitle="Following the tradition of awesome repositories" tweaks={tweaks}>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '12px' }}>
          Awesome List Static Site is an SEO-friendly, mobile-first website that transforms GitHub's curated "Awesome Lists" into beautiful, searchable websites.
        </p>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          This project follows the tradition of the "awesome" repositories on GitHub, which are community-curated lists of resources on various technologies and topics.
        </p>
      </Section>

      <Section title="Features" subtitle="Built for speed, accessibility, and user experience" tweaks={tweaks}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
          {featList.map((f, i) => (
            <div key={f.name} style={{
              padding: '14px 16px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderLeft: `2px solid var(--accent-primary)`,
              borderRadius: '4px',
              animation: `fadeInUp 0.4s ease-out ${0.1 + i * 0.04}s both`,
            }}>
              <div style={{ color: 'var(--accent-primary)', fontSize: '16px', marginBottom: '6px' }}>{f.icon}</div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '2px' }}>{f.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Technology Stack" subtitle="Modern web technologies for optimal performance" tweaks={tweaks}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 32px' }}>
          {techStack.map(t => (
            <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0' }}>
              <span style={{ width: '6px', height: '6px', background: t.dot, borderRadius: '50%', boxShadow: t.dot.includes('primary') ? `0 0 6px ${t.dot}` : 'none' }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{t.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{t.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, subtitle, children, tweaks }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '8px',
      padding: '24px',
      marginBottom: '20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: subtitle ? '4px' : '16px' }}>
        <span style={{ color: 'var(--accent-primary)', fontSize: '14px' }}>◆</span>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h2>
      </div>
      {subtitle && <div style={{ fontSize: '12.5px', color: 'var(--text-tertiary)', marginBottom: '20px', marginLeft: '22px' }}>{subtitle}</div>}
      {children}
    </div>
  );
}

window.HomeView = HomeView;
window.AboutView = AboutView;
window.Section = Section;

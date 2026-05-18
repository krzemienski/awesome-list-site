// About / Advanced / Journeys / Login / Submit / Theme

window.AboutPage = function AboutPage() {
  const features = [
    { icon: '⚡', title: 'Responsive Design', desc: 'Mobile-first', color: 'primary' },
    { icon: '◇', title: 'Fast Performance', desc: 'Static generation', color: 'secondary' },
    { icon: '⌕', title: 'Fuzzy Search', desc: 'Find anything', color: 'tertiary' },
    { icon: '◐', title: 'Multiple Themes', desc: 'Customizable', color: 'quaternary' },
    { icon: '◈', title: 'Accessible', desc: 'WCAG compliant', color: 'primary' },
    { icon: '◉', title: 'SEO Optimized', desc: 'Discoverable', color: 'secondary' },
    { icon: '⌘', title: 'Keyboard Shortcuts', desc: 'Power user', color: 'tertiary' },
    { icon: '▣', title: 'Component Library', desc: 'shadcn/ui', color: 'quaternary' },
  ];
  const stack = [
    { name: 'React', desc: 'UI component framework' },
    { name: 'Tailwind CSS', desc: 'Utility-first styling' },
    { name: 'shadcn/ui', desc: 'Component library' },
    { name: 'Fuse.js', desc: 'Fuzzy search engine' },
    { name: 'Framer Motion', desc: 'Smooth animations' },
    { name: 'TypeScript', desc: 'Type-safe code' },
  ];
  const aMap = { primary: 'var(--accent-primary)', secondary: 'var(--accent-secondary)', tertiary: 'var(--accent-tertiary)', quaternary: 'var(--accent-quaternary)' };

  return (
    <div style={{ padding: '36px 48px', maxWidth: '1200px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', animation: 'fadeInUp 0.5s ease-out both' }}>
        <span style={{ fontSize: '24px', color: 'var(--accent-primary)' }}>✦</span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '34px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '1px' }}>About</h1>
      </div>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '720px', marginBottom: '32px', animation: 'fadeInUp 0.5s ease-out 0.1s both' }}>
        An SEO-friendly, mobile-first platform that transforms GitHub's curated "Awesome Lists" into beautiful, searchable websites.
      </p>

      <Section icon="✶" title="What is this?" subtitle="Following the tradition of awesome repositories">
        <p style={{ marginBottom: '12px' }}>Awesome List Static Site is an SEO-friendly, mobile-first website that transforms GitHub's curated "Awesome Lists" into beautiful, searchable websites.</p>
        <p>This project follows the tradition of the "awesome" repositories on GitHub, which are community-curated lists of resources on various technologies and topics.</p>
      </Section>

      <Section icon="✦" title="Features" subtitle="Built for speed, accessibility, and user experience">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
          {features.map((f, i) => (
            <div key={i} style={{ padding: '14px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '4px', animation: `fadeInUp 0.4s ease-out ${0.2 + i*0.04}s both` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <span style={{ width: '6px', height: '6px', background: aMap[f.color], borderRadius: '1px', boxShadow: `0 0 6px ${aMap[f.color]}` }}></span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{f.title}</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', paddingLeft: '16px' }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section icon="⟨/⟩" title="Technology Stack" subtitle="Modern web technologies for optimal performance">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
          {stack.map((t, i) => (
            <div key={t.name} style={{ display: 'flex', alignItems: 'baseline', gap: '10px', animation: `fadeInUp 0.4s ease-out ${0.2 + i*0.05}s both` }}>
              <span style={{ width: '6px', height: '6px', background: 'var(--accent-primary)', borderRadius: '1px', boxShadow: '0 0 6px var(--accent-primary)' }}></span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{t.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{t.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};

function Section({ icon, title, subtitle, children }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '22px 24px', marginBottom: '18px', animation: 'fadeInUp 0.5s ease-out 0.15s both' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
        <span style={{ color: 'var(--accent-primary)', fontSize: '16px' }}>{icon}</span>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h2>
      </div>
      {subtitle && <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '14px', paddingLeft: '24px' }}>{subtitle}</p>}
      <div style={{ paddingLeft: '24px', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.7 }}>{children}</div>
    </div>
  );
}

window.AdvancedPage = function AdvancedPage() {
  const [tab, setTab] = React.useState('explorer');
  const tabs = [
    { id: 'explorer', icon: '◎', label: 'Explorer' },
    { id: 'metrics', icon: '◫', label: 'Metrics' },
    { id: 'export', icon: '↓', label: 'Export' },
    { id: 'ai', icon: '✦', label: 'AI Recommendations' },
  ];
  const stats = [
    { label: 'Categories', value: '9', color: 'primary' },
    { label: 'Resources', value: '1953', color: 'tertiary' },
    { label: 'Unique Tags', value: '0', color: 'secondary' },
    { label: 'Subcategories', value: '102', color: 'quaternary' },
  ];
  const aMap = { primary: 'var(--accent-primary)', secondary: 'var(--accent-secondary)', tertiary: 'var(--accent-tertiary)', quaternary: 'var(--accent-quaternary)' };

  return (
    <div style={{ padding: '36px 48px', maxWidth: '1400px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <span style={{ fontSize: '24px', color: 'var(--accent-primary)' }}>✦</span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)' }}>Advanced Features</h1>
      </div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Discover powerful tools for exploring, analyzing, and sharing awesome list data</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '4px', marginBottom: '24px' }}>
        {tabs.map(t => (
          <div key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: '10px',
              textAlign: 'center',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              color: tab === t.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: tab === t.id ? 'var(--bg-base)' : 'transparent',
              borderRadius: '3px',
              border: tab === t.id ? '1px solid var(--accent-primary)' : '1px solid transparent',
              transition: 'all 0.2s',
            }}>
            <span style={{ marginRight: '6px', color: tab === t.id ? 'var(--accent-primary)' : 'inherit' }}>{t.icon}</span>{t.label}
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '22px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <span style={{ color: 'var(--accent-primary)' }}>◎</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700 }}>Interactive Category Explorer</h2>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>Advanced search and filtering capabilities with real-time category statistics and interactive exploration</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {stats.map((s, i) => (
            <div key={s.label} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '20px', textAlign: 'center', animation: `fadeInUp 0.4s ease-out ${0.1 + i*0.06}s both` }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 800, color: aMap[s.color], textShadow: `0 0 12px ${aMap[s.color]}`, marginBottom: '4px' }}>{s.value}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <span style={{ color: 'var(--accent-primary)' }}>▣</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700 }}>Category Explorer</h2>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '14px' }}>Discover and explore 9 categories with 1953 total resources</p>
        <input placeholder="⌕ Search categories and resources..." style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '13px', marginBottom: '14px' }} />
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>▽ Sort:</span>
          <select style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '5px 10px', borderRadius: '3px', fontSize: '12px' }}>
            <option>Name</option>
          </select>
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '14px', height: '14px', borderRadius: '2px', background: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bg-base)', fontSize: '10px' }}>✓</span>
            Show subcategories
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
          {window.AV_CATEGORIES.slice(0, 6).map((c, i) => (
            <div key={c.id} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '14px', animation: `fadeInUp 0.4s ease-out ${0.15 + i*0.05}s both` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '13px', color: aMap[c.accent] }}>{c.short} ↗</span>
                <span style={{ marginLeft: 'auto', color: 'var(--text-tertiary)' }}>›</span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '10px' }}>{c.count} resources · {(window.AV_SUBCATEGORIES[c.id]?.length || Math.floor(c.count/8))} subcategories · 0 tags</div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{c.desc.slice(0, 90)}...</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

window.JourneysPage = function JourneysPage({ navigate }) {
  const aMap = { primary: 'var(--accent-primary)', secondary: 'var(--accent-secondary)', tertiary: 'var(--accent-tertiary)', quaternary: 'var(--accent-quaternary)' };
  const levelColor = { Beginner: 'var(--accent-tertiary)', Intermediate: 'var(--accent-secondary)', Advanced: 'var(--accent-primary)' };

  return (
    <div style={{ padding: '36px 48px', maxWidth: '1300px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <span style={{ fontSize: '24px', color: 'var(--accent-primary)' }}>◫</span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '34px', fontWeight: 800, color: 'var(--text-primary)' }}>Learning Journeys</h1>
      </div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Explore structured learning paths to master new skills step by step</p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Filter by category:</span>
          <select style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '6px 12px', borderRadius: '4px', fontSize: '13px' }}>
            <option>All Categories</option>
          </select>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-tertiary)' }}>5 journeys available</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '18px' }}>
        {window.AV_JOURNEYS.map((j, i) => {
          const color = levelColor[j.level];
          return (
            <div key={j.id}
              onClick={() => navigate({ view: 'journey', journeyId: j.id })}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '20px', cursor: 'pointer', transition: 'all 0.25s', animation: `fadeInUp 0.4s ease-out ${0.1 + i*0.06}s both` }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 6px 22px ${color}33`; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '14px' }}>
                <div style={{ width: '46px', height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${color}`, borderRadius: '4px', color, fontSize: '20px', boxShadow: `0 0 10px ${color}55` }}>◫</div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color, padding: '3px 10px', border: `1px solid ${color}`, borderRadius: '12px' }}>● {j.level}</span>
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>{j.title}</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '14px' }}>{j.desc}</p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)', padding: '3px 8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '3px' }}>◷ {j.duration}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)', padding: '3px 8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '3px' }}>{j.cat}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)', padding: '3px 8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '3px' }}>◯ {j.steps}</span>
              </div>
              <button style={{ width: '100%', padding: '10px', background: 'var(--accent-primary)', border: 'none', borderRadius: '4px', color: 'var(--bg-base)', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 0 12px var(--accent-primary)', fontFamily: 'var(--font-body)' }}>
                ▶ Start Journey →
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

window.JourneyDetailPage = function JourneyDetailPage({ journeyId, navigate }) {
  const j = window.AV_JOURNEYS.find(x => x.id === journeyId) || window.AV_JOURNEYS[0];
  const levelColor = { Beginner: 'var(--accent-tertiary)', Intermediate: 'var(--accent-secondary)', Advanced: 'var(--accent-primary)' };
  const color = levelColor[j.level];

  return (
    <div style={{ padding: '36px 48px', maxWidth: '900px', margin: '0 auto' }}>
      <div onClick={() => navigate({ view: 'journeys' })}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', marginBottom: '24px' }}>
        ← Back to Journeys
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '28px', animation: 'fadeInUp 0.5s ease-out both' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '14px' }}>
          <div style={{ width: '54px', height: '54px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${color}`, borderRadius: '4px', color, fontSize: '24px' }}>◫</div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color, padding: '3px 10px', border: `1px solid ${color}`, borderRadius: '12px' }}>● {j.level}</span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>{j.title}</h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '18px' }}>{j.desc}</p>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)', padding: '4px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '3px' }}>◷ {j.duration}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)', padding: '4px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '3px' }}>{j.cat}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)', padding: '4px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '3px' }}>◯ {j.steps} steps</span>
        </div>
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '14px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          <span>◷</span>
          <span>Please <a onClick={() => navigate({ view: 'login' })} style={{ color: 'var(--accent-primary)', textDecoration: 'underline', cursor: 'pointer' }}>log in</a> to start this journey and track your progress.</span>
        </div>
      </div>

      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: '28px 0 14px' }}>Learning Path</h2>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '18px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-tertiary)', fontSize: '13px' }}>
        <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>!</span>
        This journey doesn't have any steps yet. Check back later!
      </div>
    </div>
  );
};

window.LoginPage = function LoginPage({ navigate }) {
  return (
    <div style={{ padding: '60px 24px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '70vh' }}>
      <div style={{ width: '100%', maxWidth: '400px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '32px', animation: 'fadeInUp 0.5s ease-out both' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--accent-primary)', boxShadow: '0 0 18px var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', marginBottom: '14px', fontSize: '20px' }}>⮕</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>Welcome back</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Sign in to access the admin dashboard</p>
        </div>

        <Field label="Email" icon="✉" placeholder="admin@example.com" />
        <Field label="Password" icon="⚿" placeholder="Enter your password" type="password" />

        <button style={{ width: '100%', padding: '11px', background: 'var(--accent-primary)', border: 'none', borderRadius: '4px', color: 'var(--bg-base)', fontWeight: 700, fontSize: '14px', cursor: 'pointer', boxShadow: '0 0 14px var(--accent-primary)', marginTop: '6px', fontFamily: 'var(--font-body)' }}>
          Sign in
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '18px 0', fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', letterSpacing: '1px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
          OR CONTINUE WITH
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button style={{ padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>◉ Google</button>
          <button style={{ padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>⌕ GitHub</button>
        </div>

        <div style={{ marginTop: '22px', textAlign: 'center', fontSize: '12px', color: 'var(--text-tertiary)' }}>
          <div style={{ marginBottom: '4px' }}>Default admin credentials:</div>
          <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>admin@example.com / admin123</div>
          <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-secondary)', marginTop: '6px' }}>⚠ Change password after first login</div>
        </div>
      </div>
    </div>
  );
};

function Field({ label, icon, placeholder, type = 'text' }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>{icon}</span>
        <input type={type} placeholder={placeholder}
          style={{ width: '100%', padding: '10px 12px 10px 34px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--accent-primary)'; e.target.style.boxShadow = '0 0 8px var(--accent-primary)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
        />
      </div>
    </div>
  );
}

window.SubmitPage = function SubmitPage({ navigate }) {
  return (
    <div style={{ padding: '60px 24px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '70vh' }}>
      <div style={{ width: '100%', maxWidth: '420px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '32px', textAlign: 'center', animation: 'fadeInUp 0.5s ease-out both' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--accent-primary)', boxShadow: '0 0 18px var(--accent-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', marginBottom: '14px', fontSize: '20px' }}>⮕</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>Authentication Required</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>You need to be logged in to submit resources. Please login to continue.</p>

        <button onClick={() => navigate({ view: 'login' })} style={{ width: '100%', padding: '11px', background: 'var(--accent-primary)', border: 'none', borderRadius: '4px', color: 'var(--bg-base)', fontWeight: 700, fontSize: '14px', cursor: 'pointer', boxShadow: '0 0 14px var(--accent-primary)', marginBottom: '10px', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          ⮕ Login to Continue
        </button>
        <button onClick={() => navigate({ view: 'home' })} style={{ width: '100%', padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '13px', fontFamily: 'var(--font-body)' }}>
          Back to Home
        </button>
      </div>
    </div>
  );
};

window.ThemePage = function ThemePage({ activeTheme, setTheme, activeFont, setFont }) {
  const themes = window.AV_THEMES;
  const fonts = [
    { id: 'Inter', name: 'Inter', desc: 'Clean and modern, great readability' },
    { id: 'DM Sans', name: 'DM Sans', desc: 'Geometric, friendly and professional' },
    { id: 'Source Sans 3', name: 'Source Sans 3', desc: "Adobe's open-source workhorse" },
    { id: 'IBM Plex Sans', name: 'IBM Plex Sans', desc: 'Corporate, highly legible' },
    { id: 'JetBrains Mono', name: 'JetBrains Mono', desc: 'Developer-focused monospace' },
    { id: 'system', name: 'System Default', desc: "Uses your device's native font" },
  ];

  return (
    <div style={{ padding: '36px 48px', maxWidth: '1200px' }}>
      <div onClick={() => history.back()} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', marginBottom: '20px' }}>← Back</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
        <span style={{ fontSize: '24px', color: 'var(--accent-primary)' }}>◐</span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)' }}>Theme Settings</h1>
      </div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '28px' }}>
        Customize colors and fonts. Active: <span style={{ background: 'var(--accent-primary)', color: 'var(--bg-base)', padding: '2px 10px', borderRadius: '12px', fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600 }}>{themes.find(t => t.id === activeTheme)?.name || 'Cyberpunk'}</span>
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <span style={{ color: 'var(--accent-primary)', fontFamily: 'serif' }}>T</span>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700 }}>Font</h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', marginBottom: '32px' }}>
        {fonts.map(f => (
          <div key={f.id} onClick={() => setFont(f.id)}
            style={{
              background: activeFont === f.id ? 'var(--bg-card)' : 'var(--bg-card)',
              border: activeFont === f.id ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '14px',
              cursor: 'pointer',
              position: 'relative',
              boxShadow: activeFont === f.id ? '0 0 14px var(--accent-primary)33' : 'none',
              transition: 'all 0.2s',
            }}>
            {activeFont === f.id && (
              <span style={{ position: 'absolute', top: '10px', right: '10px', width: '20px', height: '20px', borderRadius: '50%', background: 'var(--accent-primary)', color: 'var(--bg-base)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>✓</span>
            )}
            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '2px' }}>{f.name}</div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-tertiary)', marginBottom: '10px' }}>{f.desc}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: f.id === 'system' ? 'system-ui' : f.id === 'JetBrains Mono' ? 'monospace' : 'inherit', lineHeight: 1.5 }}>
              The quick brown fox jumps over the lazy dog. 0123456789
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <span style={{ color: 'var(--accent-primary)' }}>◐</span>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700 }}>Color Theme</h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
        {themes.map(t => (
          <div key={t.id} onClick={() => setTheme(t.id)}
            style={{
              background: 'var(--bg-card)',
              border: activeTheme === t.id ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '14px',
              cursor: 'pointer',
              position: 'relative',
              boxShadow: activeTheme === t.id ? '0 0 14px var(--accent-primary)33' : 'none',
              transition: 'all 0.2s',
            }}>
            {activeTheme === t.id && (
              <span style={{ position: 'absolute', top: '10px', right: '10px', width: '20px', height: '20px', borderRadius: '50%', background: 'var(--accent-primary)', color: 'var(--bg-base)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>✓</span>
            )}
            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '2px' }}>{t.name}</div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>{t.desc}</div>
            {/* preview */}
            <div style={{ background: '#000', borderRadius: '4px', padding: '10px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                <span style={{ width: '20px', height: '4px', background: t.colors.primary, borderRadius: '2px' }}></span>
                <span style={{ width: '36px', height: '4px', background: t.colors.secondary, borderRadius: '2px' }}></span>
                <span style={{ width: '24px', height: '4px', background: t.colors.tertiary, borderRadius: '2px' }}></span>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <span style={{ flex: 1, height: '24px', background: '#1a1a22', borderRadius: '2px' }}></span>
                <span style={{ flex: 1, height: '24px', background: '#1a1a22', borderRadius: '2px' }}></span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {Object.values(t.colors).map((c, i) => (
                <span key={i} style={{ width: '18px', height: '18px', borderRadius: '50%', background: c, border: '1px solid rgba(255,255,255,0.2)' }}></span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

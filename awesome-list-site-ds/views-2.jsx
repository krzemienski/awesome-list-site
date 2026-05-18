// Advanced, Journeys, JourneyDetail, Login, Submit, Theme
const { useState: useStateV2 } = React;

// =================== ADVANCED ===================
function AdvancedView({ navigate, tweaks }) {
  const [tab, setTab] = useStateV2('explorer');
  const tabs = [
    { id: 'explorer', label: 'Explorer', icon: '◎' },
    { id: 'metrics', label: 'Metrics', icon: '◈' },
    { id: 'export', label: 'Export', icon: '↓' },
    { id: 'ai', label: 'AI Recommendations', icon: '◇' },
  ];

  const stats = [
    { value: 9, label: 'Categories', color: 'var(--accent-primary)' },
    { value: 1953, label: 'Resources', color: 'var(--accent-tertiary)' },
    { value: 0, label: 'Unique Tags', color: 'var(--accent-secondary)' },
    { value: 102, label: 'Subcategories', color: 'var(--accent-quaternary)' },
  ];

  return (
    <div style={{ padding: '40px 48px', maxWidth: '1300px', animation: 'fadeInUp 0.5s ease-out both' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <span style={{ fontSize: '24px', color: 'var(--accent-primary)' }}>◈</span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 800, letterSpacing: '1px' }}>Advanced Features</h1>
      </div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Discover powerful tools for exploring, analyzing, and sharing awesome list data</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', background: 'var(--bg-card)', padding: '6px', borderRadius: '8px', marginBottom: '24px', border: '1px solid var(--border-subtle)' }}>
        {tabs.map(t => (
          <button key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '10px 16px',
              background: tab === t.id ? 'var(--bg-elevated)' : 'transparent',
              border: tab === t.id ? '1px solid var(--accent-primary)' : '1px solid transparent',
              boxShadow: tab === t.id ? `0 0 8px var(--accent-primary)` : 'none',
              borderRadius: '6px',
              color: tab === t.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.2s',
              fontFamily: 'var(--font-body)',
            }}
          >
            <span style={{ color: tab === t.id ? 'var(--accent-primary)' : 'var(--text-tertiary)' }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ color: 'var(--accent-primary)' }}>◎</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700 }}>Interactive Category Explorer</h2>
        </div>
        <div style={{ fontSize: '12.5px', color: 'var(--text-tertiary)', marginBottom: '24px', marginLeft: '22px' }}>Advanced search and filtering capabilities with real-time category statistics and interactive exploration</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {stats.map((s, i) => (
            <div key={s.label} style={{
              background: 'var(--bg-elevated)',
              border: `1px solid var(--border-subtle)`,
              borderRadius: '6px',
              padding: '20px',
              textAlign: 'center',
              animation: `fadeInUp 0.4s ease-out ${0.1 + i * 0.05}s both`,
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 800, color: s.color, textShadow: `0 0 10px ${s.color}`, marginBottom: '4px' }}>{s.value.toLocaleString()}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ color: 'var(--accent-primary)' }}>📁</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700 }}>Category Explorer</h2>
        </div>
        <div style={{ fontSize: '12.5px', color: 'var(--text-tertiary)', marginBottom: '20px', marginLeft: '22px' }}>Discover and explore 9 categories with 1953 total resources</div>

        <input placeholder="◯ Search categories and resources..."
          style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', marginBottom: '16px' }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
          <span>⌄ Sort: <strong style={{ color: 'var(--text-primary)' }}>Name</strong></span>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <span style={{ width: '14px', height: '14px', background: 'var(--accent-primary)', borderRadius: '3px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'var(--bg-base)' }}>✓</span>
            Show subcategories
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '12px' }}>
          {window.CATEGORIES.slice(0, 6).map((cat, i) => (
            <div key={cat.id} onClick={() => navigate({ view: 'category', categoryId: cat.id })} style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '14px 16px',
              cursor: 'pointer',
              animation: `fadeInUp 0.4s ease-out ${0.15 + i * 0.04}s both`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{cat.name} <span style={{ color: 'var(--text-tertiary)' }}>↗</span></div>
                <span style={{ color: 'var(--text-tertiary)' }}>›</span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
                {cat.count} resources · 16 subcategories · 0 tags
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Sample resource title — A descriptive lead from the first item in this category set, lightly truncated to fit.
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =================== JOURNEYS ===================
function JourneysView({ navigate, tweaks }) {
  return (
    <div style={{ padding: '40px 48px', maxWidth: '1300px', animation: 'fadeInUp 0.5s ease-out both' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <span style={{ fontSize: '24px', color: 'var(--accent-primary)' }}>◧</span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 800, letterSpacing: '1px' }}>Learning Journeys</h1>
      </div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Explore structured learning paths to master new skills step by step</p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Filter by category:
          <select style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', outline: 'none' }}>
            <option>All Categories</option>
          </select>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>5 journeys available</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
        {window.JOURNEYS.map((j, i) => <JourneyCard key={j.id} journey={j} index={i} navigate={navigate} tweaks={tweaks} />)}
      </div>
    </div>
  );
}

function JourneyCard({ journey, index, navigate, tweaks }) {
  const [hovered, setHovered] = useStateV2(false);
  const levelColors = { Beginner: '#00ff88', Intermediate: '#ffaa00', Advanced: '#ff3366' };
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${hovered ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
      borderRadius: '8px',
      padding: '24px',
      transition: 'all 0.25s',
      transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
      boxShadow: hovered ? `0 6px 20px rgba(0,0,0,0.4), 0 0 12px var(--accent-primary)` : 'none',
      animation: `fadeInUp 0.5s ease-out ${0.1 + index * 0.05}s both`,
    }} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div style={{ width: '48px', height: '48px', background: 'var(--bg-elevated)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>📚</div>
        <span style={{
          fontSize: '11px', fontFamily: 'var(--font-mono)',
          color: levelColors[journey.level],
          border: `1px solid ${levelColors[journey.level]}`,
          padding: '3px 10px', borderRadius: '12px',
          textShadow: `0 0 6px ${levelColors[journey.level]}`,
        }}>◈ {journey.level}</span>
      </div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>{journey.name}</h3>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '16px' }}>{journey.desc}</p>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', background: 'var(--bg-elevated)', padding: '4px 10px', borderRadius: '12px' }}>◷ {journey.hours}</span>
        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', background: 'var(--bg-elevated)', padding: '4px 10px', borderRadius: '12px' }}>{journey.cat}</span>
        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', padding: '4px 10px' }}>0</span>
      </div>
      <button onClick={() => navigate({ view: 'journey', journeyId: journey.id })} style={{
        width: '100%', padding: '10px', background: 'var(--accent-primary)', border: 'none', borderRadius: '6px',
        color: 'var(--bg-base)', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
        boxShadow: `0 0 12px var(--accent-primary)`, fontFamily: 'var(--font-body)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
      }}>▶ Start Journey →</button>
    </div>
  );
}

function JourneyDetailView({ navigate, tweaks, journeyId }) {
  const journey = window.JOURNEYS.find(j => j.id === journeyId) || window.JOURNEYS[0];
  return (
    <div style={{ padding: '40px 48px', maxWidth: '900px', margin: '0 auto', animation: 'fadeInUp 0.5s ease-out both' }}>
      <button onClick={() => navigate({ view: 'journeys' })} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>← Back to Journeys</button>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '32px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div style={{ width: '64px', height: '64px', background: 'var(--bg-elevated)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>📚</div>
          <span style={{ fontSize: '11px', color: '#00ff88', border: '1px solid #00ff88', padding: '4px 12px', borderRadius: '12px', fontFamily: 'var(--font-mono)' }}>◈ {journey.level}</span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, marginBottom: '12px', color: 'var(--text-primary)', textShadow: `0 0 ${15 * tweaks.glowIntensity}px var(--accent-primary)` }}>{journey.name}</h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>{journey.desc}</p>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', background: 'var(--bg-elevated)', padding: '4px 10px', borderRadius: '12px' }}>◷ {journey.hours}</span>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', background: 'var(--bg-elevated)', padding: '4px 10px', borderRadius: '12px' }}>{journey.cat}</span>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', background: 'var(--bg-elevated)', padding: '4px 10px', borderRadius: '12px' }}>{journey.steps} steps</span>
        </div>
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '14px 18px', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--accent-primary)' }}>◷</span>
          Please <a onClick={() => navigate({ view: 'login' })} style={{ color: 'var(--accent-primary)', cursor: 'pointer', textDecoration: 'underline' }}>log in</a> to start this journey and track your progress.
        </div>
      </div>

      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>Learning Path</h2>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '18px', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ color: 'var(--accent-secondary)' }}>◯</span>
        This journey doesn't have any steps yet. Check back later!
      </div>
    </div>
  );
}

// =================== LOGIN ===================
function LoginView({ navigate, tweaks }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 56px)', padding: '40px', animation: 'fadeInUp 0.4s ease-out both' }}>
      <div style={{ width: '100%', maxWidth: '420px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '40px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '-1px', left: '20%', right: '20%', height: '1px', background: 'var(--accent-primary)', boxShadow: '0 0 12px var(--accent-primary)' }} />
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,0,128,0.1)', border: '1px solid var(--accent-primary)', boxShadow: '0 0 16px var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '22px', color: 'var(--accent-primary)' }}>→]</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 800, textAlign: 'center', color: 'var(--text-primary)', marginBottom: '6px' }}>Welcome back</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', textAlign: 'center', marginBottom: '28px' }}>Sign in to access the admin dashboard</p>

        <Field label="Email" placeholder="admin@example.com" icon="✉" />
        <Field label="Password" placeholder="Enter your password" icon="◉" type="password" />

        <button style={{ width: '100%', padding: '11px', background: 'var(--accent-primary)', border: 'none', borderRadius: '6px', color: 'var(--bg-base)', fontWeight: 700, fontSize: '14px', cursor: 'pointer', marginTop: '8px', boxShadow: '0 0 12px var(--accent-primary)', fontFamily: 'var(--font-body)' }}>Sign in</button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0', fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
          OR CONTINUE WITH
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          <button style={{ padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'var(--font-body)' }}>◉ Google</button>
          <button style={{ padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'var(--font-body)' }}>◇ GitHub</button>
        </div>

        <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
          <div>Default admin credentials:</div>
          <div style={{ marginTop: '4px' }}>admin@example.com / admin123</div>
          <div style={{ marginTop: '8px', color: 'var(--accent-secondary)' }}>⚠ Change password after first login</div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, placeholder, icon, type = 'text' }) {
  const [focused, setFocused] = useStateV2(false);
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>{icon}</span>
        <input type={type} placeholder={placeholder}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            padding: '10px 14px 10px 36px',
            background: 'var(--bg-elevated)',
            border: `1px solid ${focused ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
            borderRadius: '6px',
            color: 'var(--text-primary)',
            fontSize: '13px',
            outline: 'none',
            boxShadow: focused ? '0 0 8px rgba(255,0,128,0.3)' : 'none',
            transition: 'all 0.2s',
          }}
        />
      </div>
    </div>
  );
}

// =================== SUBMIT ===================
function SubmitView({ navigate, tweaks }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 56px)', padding: '40px', animation: 'fadeInUp 0.4s ease-out both' }}>
      <div style={{ width: '100%', maxWidth: '440px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,0,128,0.1)', border: '1px solid var(--accent-primary)', boxShadow: '0 0 16px var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontSize: '22px', color: 'var(--accent-primary)' }}>→]</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>Authentication Required</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '24px' }}>You need to be logged in to submit resources. Please login to continue.</p>
        <button onClick={() => navigate({ view: 'login' })} style={{ width: '100%', padding: '11px', background: 'var(--accent-primary)', border: 'none', borderRadius: '6px', color: 'var(--bg-base)', fontWeight: 700, fontSize: '13px', cursor: 'pointer', marginBottom: '8px', boxShadow: '0 0 12px var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>→] Login</button>
        <button onClick={() => navigate({ view: 'home' })} style={{ width: '100%', padding: '11px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Back to Home</button>
      </div>
    </div>
  );
}

// =================== THEME SETTINGS ===================
function ThemeView({ navigate, tweaks, applyPreset }) {
  return (
    <div style={{ padding: '40px 48px', maxWidth: '1200px', animation: 'fadeInUp 0.5s ease-out both' }}>
      <button onClick={() => navigate({ view: 'home' })} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>← Back</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <span style={{ fontSize: '24px', color: 'var(--accent-primary)' }}>◐</span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, letterSpacing: '1px' }}>Theme Settings</h1>
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '32px' }}>
        Customize colors and fonts. Active: <span style={{ color: 'var(--bg-base)', background: 'var(--accent-primary)', padding: '2px 10px', borderRadius: '10px', fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{tweaks.activePreset || 'Cyberpunk'}</span>
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span style={{ color: 'var(--accent-primary)' }}>T</span>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700 }}>Font</h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', marginBottom: '36px' }}>
        {window.FONT_PRESETS.map(f => {
          const active = (tweaks.fontDisplay === f.name) || (f.id === 'orbitron' && tweaks.fontDisplay === 'Orbitron');
          return (
            <div key={f.id} onClick={() => applyPreset({ fontDisplay: f.name === 'Orbitron' ? 'Orbitron' : f.name === 'Rajdhani' ? 'Rajdhani' : f.name === 'Space Mono' ? 'Space Mono' : f.name })}
              style={{
                background: 'var(--bg-card)',
                border: `1px solid ${active ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                borderRadius: '8px',
                padding: '16px',
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.2s',
                boxShadow: active ? '0 0 10px var(--accent-primary)' : 'none',
              }}>
              {active && <span style={{ position: 'absolute', top: '12px', right: '12px', width: '20px', height: '20px', background: 'var(--accent-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bg-base)', fontSize: '11px', fontWeight: 'bold' }}>✓</span>}
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{f.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>{f.desc}</div>
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>The quick brown fox jumps over the lazy dog. 0123456789</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span style={{ color: 'var(--accent-primary)' }}>◐</span>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700 }}>Color Theme</h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
        {window.COLOR_PRESETS.map(p => {
          const active = tweaks.activePreset === p.name;
          return (
            <div key={p.id}
              onClick={() => applyPreset({ accentPrimary: p.primary, accentSecondary: p.secondary, accentTertiary: p.tertiary, accentQuaternary: p.quaternary, activePreset: p.name })}
              style={{
                background: 'var(--bg-card)',
                border: `1px solid ${active ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                borderRadius: '8px',
                padding: '16px',
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.2s',
                boxShadow: active ? '0 0 12px var(--accent-primary)' : 'none',
              }}>
              {active && <span style={{ position: 'absolute', top: '12px', right: '12px', width: '20px', height: '20px', background: 'var(--accent-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bg-base)', fontSize: '11px', fontWeight: 'bold' }}>✓</span>}
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{p.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '12px', lineHeight: 1.4 }}>{p.desc}</div>
              <div style={{ background: '#000', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <div style={{ height: '8px', width: '20%', background: p.primary, borderRadius: '2px' }} />
                  <div style={{ height: '8px', width: '40%', background: p.secondary, borderRadius: '2px' }} />
                  <div style={{ height: '8px', width: '30%', background: '#444', borderRadius: '2px' }} />
                </div>
                <div style={{ height: '24px', background: 'rgba(255,255,255,0.04)', borderRadius: '2px' }} />
                <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                  <div style={{ width: '12px', height: '12px', background: p.primary, borderRadius: '50%' }} />
                  <div style={{ width: '12px', height: '12px', background: p.secondary, borderRadius: '50%' }} />
                  <div style={{ width: '12px', height: '12px', background: p.quaternary, borderRadius: '50%' }} />
                  <div style={{ width: '12px', height: '12px', background: '#fff', borderRadius: '50%', marginLeft: 'auto' }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

window.AdvancedView = AdvancedView;
window.JourneysView = JourneysView;
window.JourneyDetailView = JourneyDetailView;
window.LoginView = LoginView;
window.SubmitView = SubmitView;
window.ThemeView = ThemeView;

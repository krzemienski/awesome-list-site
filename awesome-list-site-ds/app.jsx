/* Main App */
const { useState: useStateApp, useEffect: useEffectApp } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "system": "editorial",
  "accent": "crimson",
  "homeLayout": "index",
  "showSubtleAnim": true,
  "density": "comfortable",
  "siteName": "awesome.video",
  "siteTag": "An indexed atlas of video tooling.",
  "repoUrl": "https://github.com/krzemienski/awesome-video",
  "searchPlacement": "header"
}/*EDITMODE-END*/;

function App() {
  const [t, setT] = useTweaks(TWEAK_DEFAULTS);
  const [page, setPage] = useStateApp({ kind: 'home' });
  const [openCat, setOpenCat] = useStateApp(null);
  const [drawerOpen, setDrawerOpen] = useStateApp(false);
  const [cmdOpen, setCmdOpen] = useStateApp(false);

  useEffectApp(() => {
    window.applyDesignSystem(t.system, t.accent);
  }, [t.system, t.accent]);

  /* Global ⌘K / Ctrl+K to open the search palette */
  useEffectApp(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setCmdOpen(o => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffectApp(() => {
    if (t.showSubtleAnim) document.body.classList.remove('no-anim');
    else document.body.classList.add('no-anim');
  }, [t.showSubtleAnim]);

  const go = (kind, payload = {}) => {
    setPage({ kind, ...payload });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* Expose `go` for components rendered outside the React tree (page footer
     nav links etc.). They use window.__avGo. */
  useEffectApp(() => { window.__avGo = go; }, []);

  const padding = t.density === 'compact' ? '32px 28px'
    : t.density === 'spacious' ? '72px 56px'
    : '48px 40px';

  return (
    <div className="page">
      <div className="grain" />
      <AVHeader
        go={go}
        page={page.kind}
        onOpenMobile={() => setDrawerOpen(true)}
        siteName={t.siteName}
        siteTag={t.siteTag}
        onOpenSearch={() => setCmdOpen(true)}
        showSearch={t.searchPlacement === 'header'}
      />

      <AVMobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        go={go}
        activePage={page}
        siteName={t.siteName}
        repoUrl={t.repoUrl}
      />

      <div style={{ display: 'flex', position: 'relative', zIndex: 2 }}>
        {(page.kind === 'home' || page.kind === 'category' || page.kind === 'subcategory') && (
          window.AVSidebarV2 ? (
            <window.AVSidebarV2
              go={go}
              activePage={page}
              siteName={t.siteName}
              siteTag={t.siteTag}
              repoUrl={t.repoUrl}
              showSearch={t.searchPlacement === 'sidebar'}
              onOpenSearch={() => setCmdOpen(true)}
            />
          ) : (
            <AVSidebar
              openCat={openCat}
              setOpenCat={setOpenCat}
              go={go}
              activePage={page}
            />
          )
        )}

        <main style={{ flex: 1, minWidth: 0 }}>
          <div className="page-content-wrap" style={{ padding, maxWidth: page.kind === 'admin' ? 1400 : 1240 }}>
            {page.kind === 'home' && (
              <>
                {t.homeLayout === 'curated' ? <HomeCurated go={go} t={t} /> : <HomeIndex go={go} t={t} />}
              </>
            )}
            {page.kind === 'category' && <CategoryPage cat={page.cat} go={go} t={t} />}
            {page.kind === 'subcategory' && <SubcategoryPage cat={page.cat} sub={page.sub} subSub={page.subSub} go={go} t={t} />}
            {page.kind === 'resource' && <ResourcePage resource={page.resource} go={go} />}
            {page.kind === 'submit' && <SubmitPage go={go} />}
            {page.kind === 'about' && <AboutPage go={go} />}
            {page.kind === 'admin' && <AdminPage go={go} t={t} />}
          </div>
        </main>
      </div>

      {window.AVSiteFooter && page.kind !== 'admin' && (
        <window.AVSiteFooter go={go} siteName={t.siteName} siteTag={t.siteTag} repoUrl={t.repoUrl} />
      )}

      {window.AVCmdPalette && (
        <window.AVCmdPalette open={cmdOpen} onClose={() => setCmdOpen(false)} go={go} />
      )}

      {/* Floating search FAB — bottom-right */}
      {t.searchPlacement === 'floating' && !cmdOpen && (
        <button
          onClick={() => setCmdOpen(true)}
          aria-label="Open search (⌘K)"
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 40,
            width: 52, height: 52,
            display: 'grid', placeItems: 'center', gap: 0,
            borderRadius: 'var(--radius-pill)',
            background: 'var(--accent)',
            color: '#0a0a0a',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 12px 32px -8px color-mix(in srgb, var(--accent) 50%, transparent), 0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent)',
            transition: 'transform 200ms cubic-bezier(0.2,0.65,0.3,1), box-shadow 200ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.04)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; }}>
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="7" cy="7" r="5"/><path d="M11 11 L14 14"/>
          </svg>
        </button>
      )}

      <TweaksPanel title="Awesome Video · Tweaks">
        <TweakSection label="Design System">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 4 }}>
            {Object.entries(DESIGN_SYSTEMS).map(([k, sys]) => (
              <button key={k} onClick={() => {
                const next = { system: k };
                if (window.SYSTEM_DEFAULT_ACCENT?.[k]) next.accent = window.SYSTEM_DEFAULT_ACCENT[k];
                setT(next);
              }} style={{
                height: 36, borderRadius: 6, padding: '4px 8px',
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center',
                border: t.system === k ? '2px solid #29261b' : '0.5px solid rgba(0,0,0,0.12)',
                background: t.system === k ? '#29261b' : '#f5f2ea',
                color: t.system === k ? '#fff' : '#29261b',
                fontSize: 11, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
              }}>
                <span>{sys.name}</span>
                <span style={{ fontSize: 9, fontWeight: 500, opacity: 0.65, marginTop: 1 }}>{sys.tag}</span>
              </button>
            ))}
          </div>
          <div style={{ fontSize: 10.5, color: 'rgba(0,0,0,0.55)', marginTop: 6, lineHeight: 1.4 }}>
            {DESIGN_SYSTEMS[t.system]?.desc}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8, fontSize: 10.5, fontFamily: 'var(--font-mono)' }}>
            <a href="design-system.html" target="_blank" style={{ color: '#29261b', textDecoration: 'underline' }}>Showcase →</a>
            <a href="docs.html" target="_blank" style={{ color: '#29261b', textDecoration: 'underline' }}>Docs →</a>
          </div>
        </TweakSection>

        <TweakSection label="Accent Color">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginTop: 4 }}>
            {ACCENTS.map((a) => (
              <button key={a.id} onClick={() => setT('accent', a.id)} title={a.name} style={{
                height: 28, borderRadius: 5,
                border: t.accent === a.id ? '2px solid #29261b' : '0.5px solid rgba(0,0,0,0.1)',
                background: a.primary, cursor: 'pointer', padding: 0,
              }} />
            ))}
          </div>
          <div style={{ fontSize: 10.5, color: 'rgba(0,0,0,0.55)', marginTop: 6 }}>
            {ACCENTS.find(a => a.id === t.accent)?.name}
          </div>
        </TweakSection>

        <TweakSection label="Home Layout">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 4 }}>
            {[
              { k: 'index', label: 'Index · reference book' },
              { k: 'curated', label: 'Curated · featured-first' },
            ].map(opt => (
              <button key={opt.k} onClick={() => setT('homeLayout', opt.k)} style={{
                height: 28, borderRadius: 6,
                border: t.homeLayout === opt.k ? '2px solid #29261b' : '0.5px solid rgba(0,0,0,0.12)',
                background: t.homeLayout === opt.k ? '#29261b' : '#f5f2ea',
                color: t.homeLayout === opt.k ? '#fff' : '#29261b',
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
              }}>{opt.label}</button>
            ))}
          </div>
        </TweakSection>

        <TweakSection label="Site Identity">
          <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.6)', marginTop: 4, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em' }}>
            SITE NAME
          </div>
          <input type="text" value={t.siteName || ''}
            onChange={e => setT('siteName', e.target.value)}
            placeholder="awesome.video"
            style={{
              width: '100%', padding: '6px 10px', fontSize: 11.5,
              fontFamily: 'inherit',
              border: '0.5px solid rgba(0,0,0,0.18)',
              borderRadius: 4, background: '#fff', color: '#29261b',
            }} />
          <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.6)', marginTop: 8, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em' }}>
            TAGLINE
          </div>
          <input type="text" value={t.siteTag || ''}
            onChange={e => setT('siteTag', e.target.value)}
            placeholder="An indexed atlas…"
            style={{
              width: '100%', padding: '6px 10px', fontSize: 11.5,
              fontFamily: 'inherit',
              border: '0.5px solid rgba(0,0,0,0.18)',
              borderRadius: 4, background: '#fff', color: '#29261b',
            }} />
          <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.6)', marginTop: 8, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em' }}>
            SOURCE REPO
          </div>
          <input type="text" value={t.repoUrl || ''}
            onChange={e => setT('repoUrl', e.target.value)}
            placeholder="https://github.com/owner/repo"
            style={{
              width: '100%', padding: '6px 10px', fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
              border: '0.5px solid rgba(0,0,0,0.18)',
              borderRadius: 4, background: '#fff', color: '#29261b',
            }} />
          <div style={{ fontSize: 10.5, color: 'rgba(0,0,0,0.55)', marginTop: 6, lineHeight: 1.45 }}>
            Every awesome-list ships from a GitHub repo. Wires the sidebar footer back to source.
          </div>
        </TweakSection>

        <TweakSection label="Search Placement">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 4 }}>
            {[
              { k: 'header', label: 'Header' },
              { k: 'sidebar', label: 'Sidebar' },
              { k: 'floating', label: 'Floating' },
            ].map(opt => (
              <button key={opt.k} onClick={() => setT('searchPlacement', opt.k)} style={{
                height: 28, borderRadius: 6,
                border: t.searchPlacement === opt.k ? '2px solid #29261b' : '0.5px solid rgba(0,0,0,0.12)',
                background: t.searchPlacement === opt.k ? '#29261b' : '#f5f2ea',
                color: t.searchPlacement === opt.k ? '#fff' : '#29261b',
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
              }}>{opt.label}</button>
            ))}
          </div>
          <div style={{ fontSize: 10.5, color: 'rgba(0,0,0,0.55)', marginTop: 6, lineHeight: 1.45 }}>
            ⌘K opens the palette regardless of where the trigger lives.
          </div>
        </TweakSection>

        <TweakSection label="Density">
          <TweakRadio
            value={t.density}
            onChange={(v) => setT('density', v)}
            options={['compact', 'comfortable', 'spacious']}
          />
        </TweakSection>

        <TweakSection label="Subtle Animations">
          <TweakToggle value={t.showSubtleAnim} onChange={(v) => setT('showSubtleAnim', v)} />
        </TweakSection>

        <TweakSection label="Navigate">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 4 }}>
            {[
              { k: 'home', label: 'Home' },
              { k: 'admin', label: 'Admin' },
              { k: 'submit', label: 'Submit' },
              { k: 'about', label: 'About' },
              { k: 'category', label: 'Category', payload: { cat: AV_CATEGORIES[5] } },
              { k: 'subcategory', label: 'Subcategory', payload: { cat: AV_CATEGORIES[7], sub: AV_SUBCATEGORIES['protocols-transport'][1] } },
              { k: 'resource', label: 'Resource', payload: { resource: AV_RESOURCES[9] } },
            ].map((it, i) => (
              <button key={i} onClick={() => go(it.k, it.payload || {})} style={{
                height: 26, borderRadius: 5, border: '0.5px solid rgba(0,0,0,0.12)',
                background: '#f5f2ea', color: '#29261b',
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
              }}>{it.label}</button>
            ))}
          </div>
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

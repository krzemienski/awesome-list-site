/* Main App */
const { useState: useStateApp, useEffect: useEffectApp } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "system": "editorial",
  "accent": "crimson",
  "homeLayout": "featured",
  "showSubtleAnim": true,
  "density": "comfortable"
}/*EDITMODE-END*/;

function App() {
  const [t, setT] = useTweaks(TWEAK_DEFAULTS);
  const [page, setPage] = useStateApp({ kind: 'home' });
  const [openCat, setOpenCat] = useStateApp(null);
  const [drawerOpen, setDrawerOpen] = useStateApp(false);

  useEffectApp(() => {
    window.applyDesignSystem(t.system, t.accent);
  }, [t.system, t.accent]);

  useEffectApp(() => {
    if (t.showSubtleAnim) document.body.classList.remove('no-anim');
    else document.body.classList.add('no-anim');
  }, [t.showSubtleAnim]);

  const go = (kind, payload = {}) => {
    setPage({ kind, ...payload });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
      />

      <AVMobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        go={go}
        activePage={page}
      />

      <div style={{ display: 'flex', position: 'relative', zIndex: 2 }}>
        {(page.kind === 'home' || page.kind === 'category' || page.kind === 'subcategory') && (
          <AVSidebar
            openCat={openCat}
            setOpenCat={setOpenCat}
            go={go}
            activePage={page}
          />
        )}

        <main style={{ flex: 1, minWidth: 0 }}>
          <div className="page-content-wrap" style={{ padding, maxWidth: page.kind === 'admin' ? 1400 : 1240 }}>
            {page.kind === 'home' && (
              <>
                {t.homeLayout === 'featured' && <HomeFeaturedGrid go={go} t={t} />}
                {t.homeLayout === 'categories' && <HomeCategoryFirst go={go} t={t} />}
                {t.homeLayout === 'magazine' && <HomeMagazine go={go} t={t} />}
                {t.homeLayout === 'index' && <HomeIndex go={go} t={t} />}
              </>
            )}
            {page.kind === 'category' && <CategoryPage cat={page.cat} go={go} t={t} />}
            {page.kind === 'subcategory' && <SubcategoryPage cat={page.cat} sub={page.sub} go={go} t={t} />}
            {page.kind === 'resource' && <ResourcePage resource={page.resource} go={go} />}
            {page.kind === 'submit' && <SubmitPage go={go} />}
            {page.kind === 'about' && <AboutPage go={go} />}
            {page.kind === 'admin' && <AdminPage go={go} t={t} />}
          </div>
        </main>
      </div>

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
              { k: 'featured', label: 'Featured Grid' },
              { k: 'categories', label: 'Category-First' },
              { k: 'magazine', label: 'Magazine' },
              { k: 'index', label: 'Index' },
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

/* =====================================================================
   DOCS ROUTER + SHELL
   Hash-routed docs site with sidebar nav and per-page content.
   Content lives in docs-content.jsx as DOC_PAGES.
   ===================================================================== */
const { useState: useS, useEffect: useE } = React;

const NAV_GROUPS = [
  {
    label: 'Start',
    items: [
      { id: 'overview',     title: 'Overview' },
      { id: 'principles',   title: 'Principles' },
      { id: 'getting-started', title: 'Getting started' },
    ],
  },
  {
    label: 'Foundations',
    items: [
      { id: 'tokens',       title: 'Token contract' },
      { id: 'theming',      title: 'Theming & switching' },
      { id: 'typography',   title: 'Typography' },
      { id: 'color',        title: 'Color & accent' },
      { id: 'spacing',      title: 'Spacing & layout' },
      { id: 'motion',       title: 'Motion' },
    ],
  },
  {
    label: 'Components',
    items: [
      { id: 'buttons',      title: 'Buttons' },
      { id: 'cards',        title: 'Cards' },
      { id: 'forms',        title: 'Forms' },
      { id: 'navigation',   title: 'Navigation' },
      { id: 'lists',        title: 'List patterns' },
    ],
  },
  {
    label: 'Patterns',
    items: [
      { id: 'flows',        title: 'Flow diagrams' },
      { id: 'pages',        title: 'Page templates' },
      { id: 'data-density', title: 'Data density' },
    ],
  },
  {
    label: 'Apply',
    items: [
      { id: 'integration',  title: 'Integrate the system' },
      { id: 'theming-app',  title: 'Theming an app' },
      { id: 'a11y',         title: 'Accessibility' },
      { id: 'checklist',    title: 'Launch checklist' },
    ],
  },
];

const ALL_IDS = NAV_GROUPS.flatMap(g => g.items.map(i => i.id));

function useHashRoute(defaultId) {
  const [id, setId] = useS(() => {
    const h = (window.location.hash || '').replace('#', '');
    return ALL_IDS.includes(h) ? h : defaultId;
  });
  useE(() => {
    const onHash = () => {
      const h = (window.location.hash || '').replace('#', '');
      if (ALL_IDS.includes(h)) setId(h);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useE(() => {
    if (window.location.hash !== '#' + id) {
      window.history.replaceState(null, '', '#' + id);
    }
    /* scroll docs-main to top on page change */
    const m = document.querySelector('.docs-main');
    if (m) m.scrollTo?.({ top: 0 });
    window.scrollTo?.({ top: 0, behavior: 'instant' });
  }, [id]);
  return [id, setId];
}

function DocsNav({ active, onPick }) {
  return (
    <nav className="docs-nav">
      <div style={{ marginBottom: 28 }}>
        <a href="index.html" className="mono" style={{
          fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
          color: 'var(--text-2)', textDecoration: 'none', display: 'block',
        }}>← AWESOME.VIDEO</a>
        <div className="display-h" style={{ fontSize: 22, marginTop: 8 }}>Docs</div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.12em', marginTop: 4 }}>
          v1.0 · MAY&nbsp;2026
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
          <a href="design-system.html" className="chip muted" style={{ textDecoration: 'none', cursor: 'pointer' }}>showcase ↗</a>
          <a href="index.html" className="chip muted" style={{ textDecoration: 'none', cursor: 'pointer' }}>app ↗</a>
          <a href="docs/README.md" className="chip muted" style={{ textDecoration: 'none', cursor: 'pointer' }}>.md ↗</a>
        </div>
      </div>
      {NAV_GROUPS.map(g => (
        <div key={g.label} className="docs-nav-group">
          <div className="docs-nav-label">{g.label}</div>
          {g.items.map(it => (
            <button
              key={it.id}
              className={'docs-nav-item' + (active === it.id ? ' active' : '')}
              onClick={() => onPick(it.id)}>
              {it.title}
            </button>
          ))}
        </div>
      ))}
    </nav>
  );
}

function DocsApp() {
  /* Apply default theme on docs */
  useE(() => {
    const sys = localStorage.getItem('av-ds-system') || 'editorial';
    const acc = localStorage.getItem('av-ds-accent') || (window.SYSTEM_DEFAULT_ACCENT?.[sys] || 'crimson');
    window.applyDesignSystem(sys, acc);
  }, []);

  const [active, setActive] = useHashRoute('overview');
  const Page = window.DOC_PAGES[active] || window.DOC_PAGES.overview;
  const meta = NAV_GROUPS.flatMap(g => g.items.map(i => ({ ...i, group: g.label })))
                .find(i => i.id === active);

  /* Prev / next */
  const idx = ALL_IDS.indexOf(active);
  const prevId = idx > 0 ? ALL_IDS[idx - 1] : null;
  const nextId = idx < ALL_IDS.length - 1 ? ALL_IDS[idx + 1] : null;
  const lookup = id => NAV_GROUPS.flatMap(g => g.items).find(i => i.id === id);

  return (
    <div className="docs-shell">
      <DocsNav active={active} onPick={setActive} />
      <main className="docs-main">
        <div className="docs-meta">
          <span>{meta?.group}</span>
          <span style={{ color: 'var(--text-3)' }}>/</span>
          <span style={{ color: 'var(--text-2)' }}>{meta?.title}</span>
        </div>
        <Page />
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14,
          marginTop: 80, paddingTop: 32, borderTop: 'var(--hairline-w) solid var(--border)',
        }}>
          {prevId ? (
            <button className="card hoverable" onClick={() => setActive(prevId)} style={{
              padding: 20, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', color: 'inherit',
            }}>
              <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.18em', marginBottom: 8 }}>← PREVIOUS</div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{lookup(prevId)?.title}</div>
            </button>
          ) : <div />}
          {nextId ? (
            <button className="card hoverable" onClick={() => setActive(nextId)} style={{
              padding: 20, textAlign: 'right', cursor: 'pointer', fontFamily: 'inherit', color: 'inherit',
            }}>
              <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.18em', marginBottom: 8 }}>NEXT →</div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{lookup(nextId)?.title}</div>
            </button>
          ) : <div />}
        </div>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<DocsApp />);

/* Layout — Header, Sidebar, Mobile Drawer */
const { useState: useStateL, useEffect: useEffectL } = React;

function Logo({ accent }) {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: 6,
      background: 'var(--accent)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#000', fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: 13,
      boxShadow: '0 0 16px color-mix(in srgb, var(--accent) 35%, transparent)',
      flexShrink: 0,
    }}>av</div>
  );
}

function Icon({ name, size = 16, color = 'currentColor' }) {
  const icons = {
    home: <path d="M2 8 L8 2 L14 8 V14 H10 V10 H6 V14 H2 Z" />,
    plus: <path d="M8 2 V14 M2 8 H14" />,
    book: <path d="M3 2 H13 V14 H3 Z M3 12 H13" />,
    bolt: <path d="M9 1 L3 9 H7 L7 15 L13 7 H9 Z" />,
    palette: <path d="M8 1 A7 7 0 0 0 1 8 A7 7 0 0 0 8 15 C9 15 9 14 9 13 A1 1 0 0 1 10 12 H12 A3 3 0 0 0 15 9 A8 8 0 0 0 8 1 Z M4 7 A1 1 0 1 1 4 9 A1 1 0 1 1 4 7 Z M7 4 A1 1 0 1 1 7 6 A1 1 0 1 1 7 4 Z M11 4 A1 1 0 1 1 11 6 A1 1 0 1 1 11 4 Z" />,
    shield: <path d="M8 1 L14 3 V8 C14 11 11 14 8 15 C5 14 2 11 2 8 V3 Z" />,
    list: <path d="M2 4 H14 M2 8 H14 M2 12 H14" />,
    search: <><circle cx="7" cy="7" r="5" /><path d="M11 11 L14 14" /></>,
    chevron: <path d="M5 3 L11 8 L5 13" />,
    chevronDown: <path d="M3 6 L8 11 L13 6" />,
    folder: <path d="M2 4 V12 A1 1 0 0 0 3 13 H13 A1 1 0 0 0 14 12 V6 A1 1 0 0 0 13 5 H8 L7 4 H3 A1 1 0 0 0 2 4 Z" />,
    menu: <path d="M2 4 H14 M2 8 H14 M2 12 H14" />,
    close: <path d="M3 3 L13 13 M13 3 L3 13" />,
    arrow: <path d="M2 8 H14 M10 4 L14 8 L10 12" />,
    arrowLeft: <path d="M14 8 H2 M6 4 L2 8 L6 12" />,
    grid: <path d="M2 2 H7 V7 H2 Z M9 2 H14 V7 H9 Z M2 9 H7 V14 H2 Z M9 9 H14 V14 H9 Z" />,
    sparkles: <path d="M8 1 L9 5 L13 6 L9 7 L8 11 L7 7 L3 6 L7 5 Z M12 11 L12.5 12.5 L14 13 L12.5 13.5 L12 15 L11.5 13.5 L10 13 L11.5 12.5 Z" />,
    gear: <path d="M8 1 L9 3 L11 2 L11 4 L13 5 L11 7 L13 9 L11 11 L11 13 L9 12 L8 14 L7 12 L5 13 L5 11 L3 9 L5 7 L3 5 L5 4 L5 2 L7 3 Z M8 5 A3 3 0 1 0 8 11 A3 3 0 1 0 8 5 Z" />,
    activity: <path d="M2 8 H5 L7 3 L9 13 L11 8 H14" />,
    db: <path d="M2 4 A6 2 0 0 0 14 4 A6 2 0 0 0 2 4 V12 A6 2 0 0 0 14 12 V4 M2 8 A6 2 0 0 0 14 8" />,
    users: <path d="M5 7 A2 2 0 1 0 5 3 A2 2 0 1 0 5 7 Z M11 7 A2 2 0 1 0 11 3 A2 2 0 1 0 11 7 Z M1 14 C1 11 3 9 5 9 C7 9 9 11 9 14 M7 14 C7 11 9 9 11 9 C13 9 15 11 15 14" />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {icons[name] || null}
    </svg>
  );
}
window.AVIcon = Icon;

function Header({ go, page, onOpenMobile, siteName, siteTag, onOpenSearch, showSearch = true }) {
  const displayName = (siteName || 'awesome.video').toUpperCase();
  return (
    <header className="header" style={{ gap: 14 }}>
      {/* LEFT: mobile menu + logo + site name */}
      <button
        className="btn icon ghost mobile-menu-btn"
        onClick={onOpenMobile}
        aria-label="Open menu"
        style={{ display: 'none' }}
      >
        <Icon name="menu" />
      </button>

      <div onClick={() => go('home')} style={{
        display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
        minWidth: 0, flexShrink: 0,
      }}>
        <Logo />
        <span className="mono hide-tablet" style={{
          fontSize: 11, fontWeight: 700, letterSpacing: 1.8,
          whiteSpace: 'nowrap',
        }}>
          {displayName}
        </span>
      </div>

      {/* spacer pushes everything else right */}
      <div style={{ flex: 1 }} />

      {/* RIGHT cluster: search trigger (optional), nav, user */}
      {showSearch && (
        <button
          onClick={onOpenSearch}
          className="header-search-trigger hide-mobile"
          aria-label="Search resources"
        >
          <span style={{ color: 'var(--text-3)', display: 'flex' }}>
            <Icon name="search" size={14} />
          </span>
          <span className="header-search-label">
            Search <span style={{ color: 'var(--text-3)' }}>{AV_TOTAL.toLocaleString()} resources…</span>
          </span>
          <span className="kbd">⌘K</span>
        </button>
      )}

      {/* Mobile always shows compact icon (regardless of placement) */}
      <button
        onClick={onOpenSearch}
        className="btn icon ghost show-mobile"
        aria-label="Search"
      >
        <Icon name="search" />
      </button>

      <nav className="hide-tablet" style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
        <a className={'nav-link' + (page === 'home' ? ' active' : '')} onClick={() => go('home')}>Browse</a>
        <a className={'nav-link' + (page === 'submit' ? ' active' : '')} onClick={() => go('submit')}>Submit</a>
        <a className={'nav-link' + (page === 'about' ? ' active' : '')} onClick={() => go('about')}>About</a>
        <a className="nav-link" href="docs.html" target="_blank" rel="noopener">Docs ↗</a>
        <a className={'nav-link' + (page === 'admin' ? ' active' : '')} onClick={() => go('admin')}>
          Admin
          <span className="live-dot" style={{ marginLeft: 6, width: 5, height: 5 }} />
        </a>
      </nav>

      {/* user pill — always rightmost */}
      <button
        className="user-pill"
        onClick={() => go('admin')}
        aria-label="Account · Admin"
      >
        <span style={{
          width: 22, height: 22, borderRadius: 'var(--radius-pill)',
          background: 'color-mix(in srgb, #0a0a0a 80%, var(--accent))',
          color: 'var(--accent)',
          display: 'grid', placeItems: 'center',
          fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
        }}>N</span>
        <span className="hide-mobile" style={{ fontSize: 12, fontWeight: 600 }}>Nick</span>
      </button>
    </header>
  );
}
window.AVHeader = Header;

/* =========== Command Palette (⌘K) =========== */
function CmdPalette({ open, onClose, go }) {
  const [q, setQ] = useStateL('');
  const [sel, setSel] = useStateL(0);

  const items = React.useMemo(() => {
    if (!q.trim()) {
      return [
        ...AV_CATEGORIES.slice(0, 5).map(c => ({ type: 'cat', label: c.name, sub: 'category · ' + c.count, cat: c })),
        ...AV_RESOURCES.filter(r => r.featured).slice(0, 4).map(r => ({ type: 'res', label: r.title, sub: r.desc?.slice(0, 60), resource: r })),
      ];
    }
    const Q = q.toLowerCase();
    const results = [];
    for (const c of AV_CATEGORIES) {
      if (c.name.toLowerCase().includes(Q) || c.desc?.toLowerCase().includes(Q)) {
        results.push({ type: 'cat', label: c.name, sub: 'category · ' + c.count, cat: c });
      }
      for (const s of (AV_SUBCATEGORIES[c.id] || [])) {
        if (s.name.toLowerCase().includes(Q)) {
          results.push({ type: 'sub', label: s.name, sub: c.short + ' / ' + s.count, cat: c, sub_: s });
        }
      }
    }
    for (const r of AV_RESOURCES) {
      const hit = r.title.toLowerCase().includes(Q)
        || r.desc?.toLowerCase().includes(Q)
        || r.tags?.some(t => t.toLowerCase().includes(Q));
      if (hit) results.push({ type: 'res', label: r.title, sub: r.desc?.slice(0, 70), resource: r });
    }
    return results.slice(0, 30);
  }, [q]);

  useEffectL(() => { setSel(0); }, [q]);

  const choose = (it) => {
    if (!it) return;
    if (it.type === 'cat') go('category', { cat: it.cat });
    else if (it.type === 'sub') go('subcategory', { cat: it.cat, sub: it.sub_ });
    else if (it.type === 'res') go('resource', { resource: it.resource });
    onClose();
  };

  useEffectL(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, items.length - 1)); }
      else if (e.key === 'ArrowUp')   { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
      else if (e.key === 'Enter')     { e.preventDefault(); choose(items[sel]); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, items, sel]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ alignItems: 'flex-start', paddingTop: '12vh' }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{
        maxWidth: 640, padding: 0, overflow: 'hidden', maxHeight: '76vh',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid var(--hairline)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ color: 'var(--accent)', display: 'flex' }}>
            <Icon name="search" size={16} />
          </span>
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Find resources, categories, or tags…"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text)', fontSize: 15, fontFamily: 'inherit',
            }}
          />
          <span className="kbd">esc</span>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px' }}>
          {!q.trim() && (
            <div style={{ padding: '10px 12px 4px' }}>
              <div className="mono" style={{ fontSize: 9.5, letterSpacing: '0.18em', color: 'var(--text-3)', fontWeight: 700 }}>
                JUMP TO
              </div>
            </div>
          )}
          {items.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
              <span className="caret">no matches</span>
            </div>
          ) : items.map((it, i) => (
            <button key={i}
              onClick={() => choose(it)}
              onMouseEnter={() => setSel(i)}
              style={{
                width: '100%', textAlign: 'left',
                padding: '10px 12px',
                border: 'none', borderRadius: 6,
                background: sel === i ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent',
                color: 'var(--text-2)', cursor: 'pointer',
                display: 'grid', gridTemplateColumns: '54px 1fr auto',
                gap: 12, alignItems: 'center', fontFamily: 'inherit',
                transition: 'background 100ms',
              }}>
              <span className="mono" style={{
                fontSize: 9, padding: '2px 6px', borderRadius: 3,
                border: '1px solid var(--border)',
                textAlign: 'center',
                color: it.type === 'cat' ? 'var(--accent)' : it.type === 'sub' ? 'var(--text)' : 'var(--text-3)',
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>
                {it.type === 'cat' ? 'cat' : it.type === 'sub' ? 'sub' : 'item'}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 13.5, fontWeight: 500,
                  color: sel === i ? 'var(--accent)' : 'var(--text)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{it.label}</div>
                {it.sub && (
                  <div style={{
                    fontSize: 11, color: 'var(--text-3)', marginTop: 2,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{it.sub}</div>
                )}
              </div>
              <span style={{
                color: 'var(--accent)',
                visibility: sel === i ? 'visible' : 'hidden',
                display: 'flex',
              }}>
                <Icon name="arrow" size={13} />
              </span>
            </button>
          ))}
        </div>

        <div style={{
          padding: '10px 18px', borderTop: '1px solid var(--hairline)',
          display: 'flex', gap: 16, alignItems: 'center',
          fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)',
          flexWrap: 'wrap',
        }}>
          <span><span className="kbd">↑↓</span> navigate</span>
          <span><span className="kbd">↵</span> open</span>
          <span><span className="kbd">esc</span> close</span>
          <span style={{ flex: 1 }} />
          <span>{items.length} result{items.length === 1 ? '' : 's'}</span>
        </div>
      </div>
    </div>
  );
}
window.AVCmdPalette = CmdPalette;

/* =========== Sidebar (desktop accordion) =========== */
function Sidebar({ openCat, setOpenCat, go, activePage }) {
  return (
    <aside className="sidebar hide-mobile">
      <div style={{ padding: '18px 18px 8px' }}>
        <div className="mono" style={{ fontSize: 9.5, letterSpacing: 1.8, color: 'var(--text-3)', fontWeight: 700 }}>
          BROWSE
        </div>
        <div style={{ marginTop: 6, fontSize: 13.5, fontWeight: 600 }}>
          Categories <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>· {AV_CATEGORIES.length}</span>
        </div>
      </div>

      <div style={{ padding: '0 12px 8px' }}>
        <button
          className={'sub-item' + (activePage.kind === 'home' ? ' active' : '')}
          onClick={() => go('home')}
          style={{ background: activePage.kind === 'home' ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : undefined, width: '100%', border: 'none', textAlign: 'left' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="home" size={13} />
            <span>Home</span>
          </span>
        </button>
      </div>

      {AV_CATEGORIES.map((cat) => {
        const subs = AV_SUBCATEGORIES[cat.id] || [];
        const isOpen = openCat === cat.id;
        const isActive = activePage.cat?.id === cat.id;
        return (
          <div key={cat.id} className="accordion-item">
            <button
              className={'accordion-header' + (isActive ? ' active' : '')}
              onClick={() => {
                if (subs.length === 0) {
                  go('category', { cat });
                } else {
                  setOpenCat(isOpen ? null : cat.id);
                }
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 5,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isActive ? 'color-mix(in srgb, var(--accent) 25%, transparent)' : 'rgba(255,255,255,0.04)',
                  color: isActive ? 'var(--accent)' : 'var(--text-2)',
                  fontSize: 12, flexShrink: 0,
                }}>{cat.icon}</span>
                <span style={{
                  fontSize: 13, fontWeight: 500,
                  color: isActive ? 'var(--text)' : 'var(--text-2)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  minWidth: 0, flex: 1,
                }}>
                  {cat.name}
                </span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span className="mono" style={{ fontSize: 10, color: 'var(--text-3)' }}>{cat.count}</span>
                {subs.length > 0 && (
                  <span style={{
                    transition: 'transform 240ms cubic-bezier(0.2, 0.65, 0.3, 1)',
                    transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                    color: 'var(--text-3)', display: 'flex',
                  }}>
                    <Icon name="chevron" size={10} />
                  </span>
                )}
              </span>
            </button>

            <div className="accordion-body" style={{ maxHeight: isOpen ? subs.length * 40 + 80 : 0 }}>
              <div className="accordion-body-inner">
                <div
                  className="sub-item"
                  onClick={() => go('category', { cat })}
                  style={{ color: 'var(--text-3)', fontStyle: 'italic' }}
                >
                  <span>All in {cat.short || cat.name} →</span>
                </div>
                {subs.map((sub) => {
                  const isSubActive = activePage.sub?.id === sub.id;
                  return (
                    <div
                      key={sub.id}
                      className={'sub-item' + (isSubActive ? ' active' : '')}
                      onClick={() => go('subcategory', { cat, sub })}
                    >
                      <span style={{
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        flex: 1, minWidth: 0,
                      }}>
                        {sub.name}
                      </span>
                      <span className="mono" style={{ fontSize: 10, color: 'var(--text-3)' }}>
                        {sub.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}

      <div style={{ padding: '18px', marginTop: 8 }}>
        <div className="mono" style={{ fontSize: 9.5, letterSpacing: 1.8, color: 'var(--text-3)', fontWeight: 700, marginBottom: 10 }}>
          OPS
        </div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.7 }}>
          {AV_TOTAL.toLocaleString()} resources<br/>
          {AV_TOTAL_SUBCATS} subcategories<br/>
          {AV_CATEGORIES.length} top-level<br/>
          <span style={{ color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <span className="live-dot" />
            indexed
          </span>
        </div>
      </div>
    </aside>
  );
}
window.AVSidebar = Sidebar;

/* =========== Site Footer =========== */
function SiteFooter({ go, siteName, siteTag, repoUrl }) {
  const repo = repoUrl ? repoUrl.replace(/^https?:\/\/(www\.)?github\.com\//, '').replace(/\/$/, '') : null;
  const Col = ({ title, children }) => (
    <div style={{ minWidth: 0 }}>
      <div className="mono" style={{ fontSize: 9.5, letterSpacing: '0.18em', color: 'var(--text-3)', fontWeight: 700, marginBottom: 12 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </div>
  );
  const L = ({ children, onClick, href }) => href
    ? <a className="nav-link footer-link" href={href} target="_blank" rel="noopener">{children}</a>
    : <a className="nav-link footer-link" onClick={onClick}>{children}</a>;
  return (
    <footer className="site-footer" style={{ borderTop: 'var(--hairline-w) solid var(--border)', background: 'var(--bg-2)', position: 'relative', zIndex: 2 }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '48px 40px 32px' }}>
        <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) repeat(3, minmax(0, 1fr))', gap: 32 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Logo /><span className="mono" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.8 }}>{(siteName || 'awesome.video').toUpperCase()}</span>
            </div>
            <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.55, maxWidth: 360, marginBottom: 14 }}>{siteTag}</p>
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.7 }}>
              {AV_TOTAL.toLocaleString()} resources · {AV_CATEGORIES.length} categories · {AV_TOTAL_SUBCATS} subcategories<br/>
              <span style={{ color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 6 }}><span className="live-dot" />indexed live</span>
            </div>
          </div>
          <Col title="BROWSE">
            {AV_CATEGORIES.slice(0, 6).map(c => <L key={c.id} onClick={() => go('category', { cat: c })}>{c.short || c.name}</L>)}
            <L onClick={() => go('home')}>All categories →</L>
          </Col>
          <Col title="PROJECT">
            <L onClick={() => go('about')}>About</L>
            <L onClick={() => go('submit')}>Submit a resource</L>
            <L onClick={() => go('admin')}>Admin</L>
            <L href="docs.html">Docs ↗</L>
            <L href="design-system.html">Design system ↗</L>
          </Col>
          <Col title="SOURCE">
            {repo && <L href={repoUrl}>{repo} ↗</L>}
            {repo && <L href={repoUrl + '/issues'}>Report an issue ↗</L>}
            {repo && <L href={repoUrl + '/blob/main/CONTRIBUTING.md'}>Contributing ↗</L>}
            <L href="https://github.com/sindresorhus/awesome">awesome-list guidelines ↗</L>
          </Col>
        </div>
        <div style={{ marginTop: 40, paddingTop: 20, borderTop: 'var(--hairline-w) solid var(--hairline)', display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-3)', letterSpacing: '0.04em' }}>
          <span>© {new Date().getFullYear()} {siteName || 'awesome.video'} · content CC0, code MIT</span>
          <span>built on the awesome-list design system · v1.0</span>
        </div>
      </div>
      <style>{`
        .site-footer .footer-link { font-size: 13px; white-space: normal; overflow-wrap: anywhere; min-width: 0; display: block; }
        @media (max-width: 900px) { .footer-grid { grid-template-columns: 1fr 1fr !important; } .footer-grid > :first-child { grid-column: 1 / -1; } }
        @media (max-width: 520px) { .footer-grid { grid-template-columns: 1fr !important; } .site-footer > div { padding: 36px 20px 24px !important; } }
      `}</style>
    </footer>
  );
}
window.AVSiteFooter = SiteFooter;

/* =========== Mobile Drawer =========== */
function MobileDrawer({ open, onClose, go, activePage, siteName, repoUrl }) {
  const [openCat, setOpenCat] = useStateL(null);

  useEffectL(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const navigate = (kind, payload) => {
    go(kind, payload);
    onClose();
  };

  return (
    <>
      <div className={'mobile-overlay' + (open ? ' open' : '')} onClick={onClose} />
      <div className={'mobile-drawer' + (open ? ' open' : '')} role="dialog" aria-modal="true" aria-label="Navigation" aria-hidden={!open}>
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Logo />
            <span className="mono" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.8 }}>
              {(siteName || 'awesome.video').toUpperCase()}
            </span>
          </div>
          <button className="btn icon ghost" onClick={onClose} aria-label="Close menu">
            <Icon name="close" />
          </button>
        </div>

        <div style={{ padding: '14px 18px' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', display: 'flex' }}>
              <Icon name="search" size={14} />
            </span>
            <input className="search-input" placeholder="Search..." />
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', padding: '0 12px', gap: 2 }}>
          {[
            { kind: 'home', label: 'Home', icon: 'home' },
            { kind: 'submit', label: 'Submit', icon: 'plus' },
            { kind: 'about', label: 'About', icon: 'book' },
            { kind: 'admin', label: 'Admin', icon: 'shield' },
          ].map((item) => (
            <div
              key={item.kind}
              className={'sub-item' + (activePage.kind === item.kind ? ' active' : '')}
              onClick={() => navigate(item.kind)}
              style={{ padding: '10px 12px' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                <Icon name={item.icon} size={14} />
                {item.label}
              </span>
            </div>
          ))}
        </nav>

        <div style={{ padding: '12px 18px 6px', marginTop: 8 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: 1.6, color: 'var(--text-3)', fontWeight: 700 }}>
            CATEGORIES
          </div>
        </div>

        {AV_CATEGORIES.map((cat) => {
          const subs = AV_SUBCATEGORIES[cat.id] || [];
          const isOpen = openCat === cat.id;
          return (
            <div key={cat.id} className="accordion-item">
              <button
                className="accordion-header"
                onClick={() => {
                  if (subs.length === 0) navigate('category', { cat });
                  else setOpenCat(isOpen ? null : cat.id);
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: 5,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(255,255,255,0.04)', color: 'var(--text-2)',
                    fontSize: 12, flexShrink: 0,
                  }}>{cat.icon}</span>
                  <span style={{
                    fontSize: 13, fontWeight: 500,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    flex: 1, minWidth: 0,
                  }}>
                    {cat.name}
                  </span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--text-3)' }}>{cat.count}</span>
                  {subs.length > 0 && (
                    <span style={{
                      transition: 'transform 240ms ease',
                      transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                      color: 'var(--text-3)', display: 'flex',
                    }}>
                      <Icon name="chevron" size={10} />
                    </span>
                  )}
                </span>
              </button>
              <div className="accordion-body" style={{ maxHeight: isOpen ? subs.length * 40 + 60 : 0 }}>
                <div className="accordion-body-inner">
                  <div className="sub-item" onClick={() => navigate('category', { cat })}
                    style={{ color: 'var(--text-3)', fontStyle: 'italic' }}>
                    <span>All in {cat.short} →</span>
                  </div>
                  {subs.map((sub) => (
                    <div key={sub.id} className="sub-item"
                      onClick={() => navigate('subcategory', { cat, sub })}>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>
                        {sub.name}
                      </span>
                      <span className="mono" style={{ fontSize: 10, color: 'var(--text-3)' }}>{sub.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        <div style={{ padding: '18px', marginTop: 'auto', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ color: 'var(--text-3)', fontSize: 11.5, fontFamily: 'var(--font-mono)' }}>
            {AV_TOTAL.toLocaleString()} indexed
          </span>
          <div style={{ display: 'flex', gap: 14 }}>
            <a className="nav-link" href="docs.html" target="_blank" rel="noopener" style={{ fontSize: 12 }}>Docs ↗</a>
            {repoUrl && <a className="nav-link" href={repoUrl} target="_blank" rel="noopener" style={{ fontSize: 12 }}>GitHub ↗</a>}
          </div>
        </div>
      </div>
    </>
  );
}
window.AVMobileDrawer = MobileDrawer;

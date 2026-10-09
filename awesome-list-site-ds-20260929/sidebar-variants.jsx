/* =====================================================================
   SIDEBAR · refined accordion
   - Always-collapsible (full ↔ 56px icon rail)
   - Clear L3 visual: tree connectors + "nested" indicator on rows with kids
   - Site identity footer with link to source repo (every awesome-list has one)
   - Persists collapse state and open paths in localStorage
   ===================================================================== */

const { useState: useStateSB, useEffect: useEffectSB, useRef: useRefSB } = React;

function getSubs(catId)    { return window.AV_SUBCATEGORIES[catId]    || []; }
function getSubSubs(subId) { return window.AV_SUBSUBCATEGORIES?.[subId] || []; }

/* Per-category default icon when the data file gives a glyph;
   used as-is. Subs/sub-subs get connectors instead of icons. */

/* ─────────────── Collapsed icon rail ─────────────── */

function CollapsedRail({ activePage, go, onExpand, repoUrl, siteName }) {
  return (
    <aside className="sidebar hide-mobile" style={{
      width: 56, display: 'flex', flexDirection: 'column',
      padding: '12px 0', gap: 4,
    }}>
      <button
        onClick={onExpand}
        title="Expand sidebar"
        style={{
          margin: '0 auto 10px', width: 36, height: 36,
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          color: 'var(--text-2)', cursor: 'pointer',
          borderRadius: 'var(--radius-sm)',
          display: 'grid', placeItems: 'center',
        }}>
        <AVIcon name="chevron" size={11} />
      </button>

      <button
        onClick={() => go('home')}
        title="Home"
        style={railBtn(activePage.kind === 'home')}>
        <AVIcon name="home" size={15} />
      </button>

      <div style={{
        margin: '6px 12px 4px', height: 1, background: 'var(--hairline)',
      }} />

      {AV_CATEGORIES.map(cat => (
        <button
          key={cat.id}
          onClick={() => go('category', { cat })}
          title={cat.name + ' · ' + cat.count}
          style={railBtn(activePage.cat?.id === cat.id)}>
          <span style={{ fontSize: 16, lineHeight: 1 }}>{cat.icon}</span>
        </button>
      ))}

      <div style={{ flex: 1 }} />

      {repoUrl && (
        <a href={repoUrl} target="_blank" rel="noopener"
          title={`Source: ${repoUrl.replace('https://github.com/', '')}`}
          style={{
            margin: '0 auto 6px', width: 36, height: 36,
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-2)', cursor: 'pointer',
            borderRadius: 'var(--radius-sm)',
            display: 'grid', placeItems: 'center', textDecoration: 'none',
          }}>
          <span className="mono" style={{ fontSize: 14, lineHeight: 1 }}>↗</span>
        </a>
      )}
    </aside>
  );
}

function railBtn(active) {
  return {
    margin: '0 auto', width: 36, height: 36,
    border: '1px solid ' + (active ? 'color-mix(in srgb, var(--accent) 35%, var(--border))' : 'transparent'),
    background: active ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--text-2)',
    cursor: 'pointer',
    borderRadius: 'var(--radius-sm)',
    display: 'grid', placeItems: 'center',
    transition: 'all 140ms ease',
    fontFamily: 'inherit',
  };
}

/* ─────────────── Sub-sub row (L3) ─────────────── */

function L3Row({ ss, isLast, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', textAlign: 'left',
      display: 'grid', gridTemplateColumns: '14px 1fr auto',
      alignItems: 'center', gap: 8,
      padding: '5px 11px 5px 0',
      border: 'none', background: 'transparent',
      color: 'var(--text-3)',
      fontFamily: 'inherit', fontSize: 12,
      cursor: 'pointer',
      transition: 'color 140ms',
    }}
    onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; }}
    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; }}>
      <span className="mono" style={{
        color: 'var(--text-4)', fontSize: 11, textAlign: 'center', lineHeight: 1,
      }}>{isLast ? '└' : '├'}</span>
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {ss.name}
      </span>
      <span className="mono" style={{ fontSize: 9.5, color: 'var(--text-4)' }}>{ss.count}</span>
    </button>
  );
}

/* ─────────────── Sub row (L2) ─────────────── */

function L2Row({ sub, isActive, isOpen, hasL3, count, onToggle, onOpen }) {
  return (
    <button
      onClick={hasL3 ? onToggle : onOpen}
      style={{
        width: '100%', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 11px',
        background: isActive ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
        border: 'none', borderRadius: 6,
        cursor: 'pointer',
        color: isActive ? 'var(--accent)' : 'var(--text-2)',
        fontFamily: 'inherit', fontSize: 12.5,
        transition: 'background 140ms, color 140ms',
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--surface)'; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}>
      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {sub.name}
      </span>
      {hasL3 && (
        <span className="mono" style={{
          fontSize: 9, color: isActive ? 'var(--accent)' : 'var(--text-3)',
          padding: '1px 5px', borderRadius: 3,
          border: '1px solid ' + (isActive ? 'color-mix(in srgb, var(--accent) 30%, var(--border))' : 'var(--border)'),
          letterSpacing: '0.06em',
        }}>
          +{count}
        </span>
      )}
      <span className="mono" style={{ fontSize: 10, color: isActive ? 'var(--accent)' : 'var(--text-3)' }}>
        {sub.count}
      </span>
      {hasL3 && (
        <span style={{
          color: 'var(--text-3)',
          transition: 'transform 200ms cubic-bezier(0.2,0.65,0.3,1)',
          transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
          display: 'flex',
        }}><AVIcon name="chevron" size={9} /></span>
      )}
    </button>
  );
}

/* ─────────────── Cat row (L1) ─────────────── */

function L1Header({ cat, isActive, isOpen, subs, onToggle, onOpen }) {
  const hasChildren = subs.length > 0;
  const hasGrand = subs.some(s => getSubSubs(s.id).length > 0);
  return (
    <button
      className={'accordion-header' + (isActive ? ' active' : '')}
      onClick={hasChildren ? onToggle : onOpen}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
        <span style={{
          width: 24, height: 24, borderRadius: 'var(--radius-sm)',
          display: 'grid', placeItems: 'center',
          background: isActive ? 'color-mix(in srgb, var(--accent) 25%, transparent)' : 'var(--surface)',
          color: isActive ? 'var(--accent)' : 'var(--text-2)',
          fontSize: 13, flexShrink: 0,
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
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {hasGrand && (
          <span title="Contains nested subcategories" className="mono" style={{
            fontSize: 8.5, letterSpacing: '0.12em',
            color: 'var(--text-3)',
            padding: '1px 4px', borderRadius: 3,
            background: 'var(--surface)',
          }}>L3</span>
        )}
        <span className="mono" style={{ fontSize: 10, color: 'var(--text-3)' }}>{cat.count}</span>
        {hasChildren && (
          <span style={{
            transition: 'transform 240ms cubic-bezier(0.2,0.65,0.3,1)',
            transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
            color: 'var(--text-3)', display: 'flex',
          }}>
            <AVIcon name="chevron" size={10} />
          </span>
        )}
      </span>
    </button>
  );
}

/* ─────────────── Site identity footer (compact, pinned at sidebar bottom) ─────────────── */

function SiteFooter({ siteName, siteTag, repoUrl, total }) {
  const repoLabel = repoUrl
    ? repoUrl.replace(/^https?:\/\/(www\.)?github\.com\//, '').replace(/\/$/, '')
    : null;
  return (
    <div style={{
      padding: '10px 14px',
      borderTop: '1px solid var(--border)',
      background: 'var(--bg)',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span className="live-dot" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="mono" style={{
          fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.06em',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {(total ?? AV_TOTAL).toLocaleString()} indexed · live
        </div>
      </div>
      {repoUrl && (
        <a href={repoUrl} target="_blank" rel="noopener"
          title={repoLabel ? `Source: ${repoLabel}` : 'Source repo'}
          style={{
            width: 28, height: 28,
            display: 'grid', placeItems: 'center',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-2)', textDecoration: 'none',
            background: 'var(--surface)',
            flexShrink: 0,
            transition: 'all 160ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--accent) 35%, var(--border))'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
          </svg>
        </a>
      )}
    </div>
  );
}

/* ─────────────── Top brand row + collapse toggle ─────────────── */

function CollapseToggle({ onCollapse, expanded = true }) {
  return (
    <button
      onClick={onCollapse}
      title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
      aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
      style={{
        width: 26, height: 26,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        color: 'var(--text-3)',
        cursor: 'pointer',
        borderRadius: 'var(--radius-sm)',
        display: 'grid', placeItems: 'center',
        flexShrink: 0,
        transition: 'all 140ms',
        padding: 0,
      }}
      onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
      <span style={{ display: 'flex', transform: expanded ? 'scaleX(-1)' : 'none' }}>
        <AVIcon name="chevron" size={10} />
      </span>
    </button>
  );
}

/* ─────────────── Main full accordion ─────────────── */

function SidebarFull({ go, activePage, siteName, siteTag, repoUrl, onCollapse, showSearch, onOpenSearch }) {
  const [openCats, setOpenCats] = useStateSB(() => {
    try { return JSON.parse(localStorage.getItem('av-sb-cats') || '{}'); }
    catch (e) { return {}; }
  });
  const [openSubs, setOpenSubs] = useStateSB(() => {
    try { return JSON.parse(localStorage.getItem('av-sb-subs') || '{}'); }
    catch (e) { return {}; }
  });

  /* Auto-open the active path */
  useEffectSB(() => {
    if (activePage.cat?.id) setOpenCats(s => ({ ...s, [activePage.cat.id]: true }));
    if (activePage.sub?.id) setOpenSubs(s => ({ ...s, [activePage.sub.id]: true }));
  }, [activePage.cat?.id, activePage.sub?.id]);

  useEffectSB(() => {
    try { localStorage.setItem('av-sb-cats', JSON.stringify(openCats)); } catch (e) {}
  }, [openCats]);
  useEffectSB(() => {
    try { localStorage.setItem('av-sb-subs', JSON.stringify(openSubs)); } catch (e) {}
  }, [openSubs]);

  const toggleCat = id => setOpenCats(s => ({ ...s, [id]: !s[id] }));
  const toggleSub = id => setOpenSubs(s => ({ ...s, [id]: !s[id] }));

  return (
    <aside className="sidebar hide-mobile" style={{ display: 'flex', flexDirection: 'column' }}>
      {showSearch && (
        <div style={{ padding: '14px 14px 0' }}>
          <button
            onClick={onOpenSearch}
            aria-label="Search resources"
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text-2)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 12.5, fontWeight: 500,
              transition: 'all 160ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}>
            <AVIcon name="search" size={13} />
            <span style={{ flex: 1, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Search resources…
            </span>
            <span className="kbd">⌘K</span>
          </button>
        </div>
      )}

      <div style={{ padding: '14px 14px 8px' }}>
        <button
          className={'sub-item' + (activePage.kind === 'home' ? ' active' : '')}
          onClick={() => go('home')}
          style={{ width: '100%', border: 'none', textAlign: 'left',
            background: activePage.kind === 'home' ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : undefined }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AVIcon name="home" size={13} />
            <span>Home</span>
          </span>
        </button>
      </div>

      <div style={{
        padding: '6px 14px 10px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      }}>
        <div className="mono" style={{
          fontSize: 9.5, letterSpacing: '0.18em', color: 'var(--text-3)',
          fontWeight: 700,
        }}>
          CATEGORIES · {AV_CATEGORIES.length}
        </div>
        <CollapseToggle expanded onCollapse={onCollapse} />
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {AV_CATEGORIES.map(cat => {
          const subs = getSubs(cat.id);
          const isCatOpen = !!openCats[cat.id];
          const isCatActive = activePage.cat?.id === cat.id;
          return (
            <div key={cat.id} className="accordion-item">
              <L1Header
                cat={cat}
                subs={subs}
                isActive={isCatActive}
                isOpen={isCatOpen}
                onToggle={() => toggleCat(cat.id)}
                onOpen={() => go('category', { cat })}
              />

              <div className="accordion-body" style={{
                maxHeight: isCatOpen ? 4000 : 0,
              }}>
                <div className="accordion-body-inner">
                  <div className="sub-item"
                    onClick={() => go('category', { cat })}
                    style={{ color: 'var(--text-3)', fontStyle: 'italic' }}>
                    <span>All in {cat.short || cat.name} →</span>
                  </div>
                  {subs.map(sub => {
                    const ss = getSubSubs(sub.id);
                    const isSubOpen = !!openSubs[sub.id];
                    const isSubActive = activePage.sub?.id === sub.id;
                    return (
                      <div key={sub.id}>
                        <L2Row
                          sub={sub}
                          isActive={isSubActive}
                          isOpen={isSubOpen}
                          hasL3={ss.length > 0}
                          count={ss.length}
                          onToggle={() => toggleSub(sub.id)}
                          onOpen={() => go('subcategory', { cat, sub })}
                        />
                        {ss.length > 0 && (
                          <div style={{
                            overflow: 'hidden',
                            maxHeight: isSubOpen ? ss.length * 32 + 16 : 0,
                            transition: 'max-height 240ms cubic-bezier(0.2,0.65,0.3,1)',
                          }}>
                            <div style={{
                              marginLeft: 6, paddingLeft: 8,
                              borderLeft: '1px solid var(--border)',
                              paddingTop: 4, paddingBottom: 4,
                            }}>
                              {/* "All" pill at top of L3 */}
                              <button
                                onClick={() => go('subcategory', { cat, sub })}
                                style={{
                                  width: '100%', textAlign: 'left',
                                  display: 'grid', gridTemplateColumns: '14px 1fr',
                                  alignItems: 'center', gap: 8,
                                  padding: '4px 11px 4px 0', marginBottom: 2,
                                  border: 'none', background: 'transparent',
                                  color: 'var(--text-3)', fontStyle: 'italic',
                                  fontFamily: 'inherit', fontSize: 11.5,
                                  cursor: 'pointer',
                                }}>
                                <span className="mono" style={{ fontSize: 11, color: 'var(--text-4)', textAlign: 'center', lineHeight: 1 }}>•</span>
                                <span>All in {sub.name}</span>
                              </button>
                              {ss.map((s, i) => (
                                <L3Row
                                  key={s.id}
                                  ss={s}
                                  isLast={i === ss.length - 1}
                                  onClick={() => go('subcategory', { cat, sub })}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <SiteFooter siteName={siteName} siteTag={siteTag} repoUrl={repoUrl} />
    </aside>
  );
}

/* ─────────────── Public component (with collapse state) ─────────────── */

function SidebarAccordionV2({ go, activePage, siteName, siteTag, repoUrl, collapsed, onCollapseChange, showSearch, onOpenSearch }) {
  /* Read initial collapsed state from prop, but allow internal toggle */
  const [internalCollapsed, setInternalCollapsed] = useStateSB(() => {
    if (typeof collapsed === 'boolean') return collapsed;
    try { return localStorage.getItem('av-sb-collapsed') === '1'; }
    catch (e) { return false; }
  });

  /* Sync external prop changes */
  useEffectSB(() => {
    if (typeof collapsed === 'boolean') setInternalCollapsed(collapsed);
  }, [collapsed]);

  const setCollapsed = (v) => {
    setInternalCollapsed(v);
    try { localStorage.setItem('av-sb-collapsed', v ? '1' : '0'); } catch (e) {}
    if (onCollapseChange) onCollapseChange(v);
  };

  if (internalCollapsed) {
    return (
      <CollapsedRail
        activePage={activePage}
        go={go}
        onExpand={() => setCollapsed(false)}
        repoUrl={repoUrl}
        siteName={siteName}
      />
    );
  }
  return (
    <SidebarFull
      go={go}
      activePage={activePage}
      siteName={siteName}
      siteTag={siteTag}
      repoUrl={repoUrl}
      onCollapse={() => setCollapsed(true)}
      showSearch={showSearch}
      onOpenSearch={onOpenSearch}
    />
  );
}

window.AVSidebarV2 = SidebarAccordionV2;

/* =====================================================================
   PAGE FOOTER — horizontal site identity block at the bottom of content
   ===================================================================== */

function PageFooter({ siteName, siteTag, repoUrl, total }) {
  const repoLabel = repoUrl
    ? repoUrl.replace(/^https?:\/\/(www\.)?github\.com\//, '').replace(/\/$/, '')
    : null;
  return (
    <footer style={{
      marginTop: 80,
      borderTop: '1px solid var(--border)',
      padding: '48px 40px 56px',
      position: 'relative', zIndex: 2,
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
        gap: 48,
        maxWidth: 1240,
        margin: '0 auto',
      }}>
        {/* identity */}
        <div>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--accent)', fontWeight: 700, marginBottom: 12 }}>
            ── INDEX
          </div>
          <div className="display-h" style={{
            fontSize: 'clamp(28px, 3.4vw, 40px)',
            lineHeight: 1.05, marginBottom: 12,
          }}>
            {siteName || 'awesome.list'}
          </div>
          {siteTag && (
            <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.55, maxWidth: 380 }}>
              {siteTag}
            </p>
          )}
          <div className="shimmer-line" style={{ width: 160, marginTop: 18 }} />
        </div>

        {/* stats */}
        <div>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-3)', fontWeight: 700, marginBottom: 14 }}>
            INDEXED
          </div>
          <div className="display-h" style={{ fontSize: 32, lineHeight: 1, marginBottom: 6 }}>
            {(total ?? AV_TOTAL).toLocaleString()}
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.7, marginTop: 8 }}>
            {AV_CATEGORIES.length} categories<br/>
            {AV_TOTAL_SUBCATS} subcategories<br/>
            <span style={{ color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <span className="live-dot" /> live
            </span>
          </div>
        </div>

        {/* nav */}
        <div>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-3)', fontWeight: 700, marginBottom: 14 }}>
            EXPLORE
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {AV_CATEGORIES.slice(0, 6).map(c => (
              <a key={c.id} href="#" onClick={(e) => {
                e.preventDefault();
                if (window.__avGo) window.__avGo('category', { cat: c });
              }} style={{
                color: 'var(--text-2)', textDecoration: 'none', fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'color 140ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; }}>
                <span style={{ color: 'var(--text-3)' }}>{c.icon}</span>
                <span>{c.short || c.name}</span>
              </a>
            ))}
          </div>
        </div>

        {/* source / meta */}
        <div>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-3)', fontWeight: 700, marginBottom: 14 }}>
            SOURCE
          </div>
          {repoUrl ? (
            <>
              <a href={repoUrl} target="_blank" rel="noopener"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '10px 14px',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12, color: 'var(--text)',
                  textDecoration: 'none',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.04em',
                  background: 'var(--surface)',
                  transition: 'all 160ms',
                  marginBottom: 12,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text)'; }}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
                </svg>
                <span>{repoLabel || 'source'}</span>
                <span style={{ color: 'var(--text-3)' }}>↗</span>
              </a>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.6 }}>
                Open-source. PRs welcome.<br/>
                Indexed automatically from <span style={{ fontFamily: 'var(--font-mono)' }}>README.md</span>.
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>No source repo configured.</div>
          )}
        </div>
      </div>

      {/* meta strip */}
      <div style={{
        maxWidth: 1240, margin: '40px auto 0',
        paddingTop: 18, borderTop: '1px solid var(--hairline)',
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', gap: 16, flexWrap: 'wrap',
        fontFamily: 'var(--font-mono)', fontSize: 10.5,
        color: 'var(--text-3)', letterSpacing: '0.06em',
      }}>
        <span>© {new Date().getFullYear()} {(siteName || 'awesome.list')} · MIT</span>
        <span>built with the awesome-list framework</span>
      </div>
    </footer>
  );
}

window.AVPageFooter = PageFooter;

/* Admin Dashboard — all tabs */
const { useState: useStateA } = React;
const Icon5 = window.AVIcon;

const ADMIN_TABS = [
  { id: 'overview',     label: 'Overview',     icon: 'grid' },
  { id: 'approvals',    label: 'Approvals',    icon: 'shield' },
  { id: 'edits',        label: 'Edits',        icon: 'list' },
  { id: 'enrichment',   label: 'Enrichment',   icon: 'sparkles' },
  { id: 'researcher',   label: 'Researcher',   icon: 'bolt' },
  { id: 'export',       label: 'Export',       icon: 'arrow' },
  { id: 'database',     label: 'Database',     icon: 'db' },
  { id: 'resources',    label: 'Resources',    icon: 'folder' },
  { id: 'categories',   label: 'Categories',   icon: 'list' },
  { id: 'subcategories',label: 'Subcategories',icon: 'list' },
  { id: 'users',        label: 'Users',        icon: 'users' },
  { id: 'github',       label: 'GitHub',       icon: 'gear' },
  { id: 'linkhealth',   label: 'Link Health',  icon: 'activity' },
  { id: 'audit',        label: 'Audit',        icon: 'list' },
  { id: 'research',     label: 'Research',     icon: 'sparkles' },
];

function Stat({ label, value, sub, accent }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div className="mono" style={{ fontSize: 10, letterSpacing: 1.4, color: 'var(--text-3)', marginBottom: 10, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{
        fontSize: 32, fontWeight: 700, letterSpacing: -1, lineHeight: 1,
        color: accent ? 'var(--accent)' : 'var(--text)',
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-2)' }}>{sub}</div>
      )}
    </div>
  );
}

function StatusChip({ status }) {
  const map = {
    completed: 'ok', pending: 'warn', failed: 'bad',
    cancelled: 'muted', approved: 'ok', rejected: 'bad',
  };
  return <span className={'chip ' + (map[status] || '')}>{status}</span>;
}

/* ============== ADMIN PAGE SHELL ============== */
function AdminPage({ go, t }) {
  const [tab, setTab] = useStateA('overview');

  return (
    <div className="page-content" style={{ animation: 'fadeIn 0.5s ease', maxWidth: 1280 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 12 }}>
            <span className="live-dot" />
            ADMIN CONSOLE · NICK KRZEMIENSKI
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, letterSpacing: -1, lineHeight: 1.1 }}>
            Operations <span className="serif-italic" style={{ color: 'var(--accent)' }}>dashboard</span>
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 8 }}>
            Manage the {AV_TOTAL.toLocaleString()} resources, jobs, and contributors that keep the index alive.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn ghost"><Icon5 name="gear" size={12} /> Settings</button>
          <button className="btn primary"><Icon5 name="plus" size={12} color="#0a0a0a" /> New entry</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 28 }}>
        {ADMIN_TABS.map((tb) => (
          <button
            key={tb.id}
            className={'tab' + (tab === tb.id ? ' active' : '')}
            onClick={() => setTab(tb.id)}
          >
            <Icon5 name={tb.icon} size={12} />
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <AdminOverview />}
      {tab === 'approvals' && <AdminApprovals />}
      {tab === 'edits' && <AdminEdits />}
      {tab === 'enrichment' && <AdminEnrichment />}
      {tab === 'researcher' && <AdminResearcher />}
      {tab === 'export' && <AdminExport />}
      {tab === 'database' && <AdminDatabase />}
      {tab === 'resources' && <AdminResources go={go} />}
      {tab === 'categories' && <AdminCategories />}
      {tab === 'subcategories' && <AdminSubcategories />}
      {tab === 'users' && <AdminUsers />}
      {tab === 'github' && <AdminGitHub />}
      {tab === 'linkhealth' && <AdminLinkHealth />}
      {tab === 'audit' && <AdminAudit />}
      {tab === 'research' && <AdminResearch />}
    </div>
  );
}
window.AdminPage = AdminPage;

/* ============== TABS ============== */

function AdminOverview() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
        <Stat label="Resources" value={AV_TOTAL.toLocaleString()} sub="across 9 categories" />
        <Stat label="Subcategories" value={AV_TOTAL_SUBCATS} sub="all canonical" />
        <Stat label="Active users" value={AV_TOTAL_USERS} sub="2 admins · 1 contributor" />
        <Stat label="Pending approvals" value="7" sub="oldest 14m ago" accent />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
        <div className="card" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Recent activity</h3>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>Last 24 hours</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {AV_RECENT_ACTIVITY.slice(0, 6).map((a) => (
              <div key={a.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, padding: '6px 0',
                borderBottom: '1px solid var(--border)',
              }}>
                <span className="mono" style={{ color: 'var(--text-3)', fontSize: 10, width: 38 }}>{a.id}</span>
                <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{a.user}</span>
                <span style={{ color: 'var(--text-2)' }}>{a.action}</span>
                <span style={{ color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.target}</span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--text-3)' }}>{a.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>System health</h3>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>All systems nominal</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { k: 'Database', v: 'healthy', ok: true },
              { k: 'GitHub sync', v: 'last: 1h ago', ok: true },
              { k: 'Link checker', v: 'running · 47%', ok: true, warn: true },
              { k: 'Enrichment queue', v: '0 pending', ok: true },
              { k: 'Researcher API', v: 'healthy', ok: true },
            ].map((row, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
                padding: '8px 0', borderBottom: '1px solid var(--border)',
              }}>
                <span className={'dot ' + (row.warn ? 'warn' : row.ok ? 'ok' : 'bad')} />
                <span style={{ flex: 1 }}>{row.k}</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{row.v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Top categories</h3>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>By resource count</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...AV_CATEGORIES].sort((a, b) => b.count - a.count).slice(0, 5).map((c, i) => {
              const max = Math.max(...AV_CATEGORIES.map(x => x.count));
              const pct = (c.count / max) * 100;
              return (
                <div key={c.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span>{c.icon} {c.name}</span>
                    <span className="mono" style={{ color: 'var(--text-3)' }}>{c.count}</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 2 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function TableShell({ title, sub, actions, children }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{
        padding: '18px 22px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600 }}>{title}</h3>
          {sub && <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{sub}</p>}
        </div>
        {actions}
      </div>
      <div style={{ overflowX: 'auto' }}>
        {children}
      </div>
    </div>
  );
}

function AdminApprovals() {
  const pending = [
    { id: 1, title: 'WebCodecs API Reference', cat: 'Standards', user: 'guest', time: '14m ago' },
    { id: 2, title: 'av1-encoder-bench', cat: 'Encoding', user: 'guest', time: '1h ago' },
    { id: 3, title: 'OBS Lua Plugin Helper', cat: 'Media Tools', user: 'mhanssen', time: '3h ago' },
    { id: 4, title: 'low-latency-cmaf-spec.pdf', cat: 'Standards', user: 'guest', time: '5h ago' },
    { id: 5, title: 'react-native-track-player', cat: 'Players', user: 'guest', time: '1d ago' },
  ];
  return (
    <TableShell
      title="Pending approvals"
      sub={`${pending.length} submissions awaiting review`}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn ghost">Bulk reject</button>
          <button className="btn primary">Approve all</button>
        </div>
      }
    >
      <table className="table">
        <thead>
          <tr>
            <th>Title</th><th>Category</th><th>Submitted by</th><th>When</th><th></th>
          </tr>
        </thead>
        <tbody>
          {pending.map((p) => (
            <tr key={p.id}>
              <td style={{ color: 'var(--text)', fontWeight: 500 }}>{p.title}</td>
              <td>{p.cat}</td>
              <td className="mono" style={{ fontSize: 12 }}>{p.user}</td>
              <td className="mono" style={{ fontSize: 12, color: 'var(--text-3)' }}>{p.time}</td>
              <td style={{ textAlign: 'right' }}>
                <div style={{ display: 'inline-flex', gap: 6 }}>
                  <button className="btn ghost" style={{ padding: '5px 10px', fontSize: 12 }}>Review</button>
                  <button className="btn primary" style={{ padding: '5px 10px', fontSize: 12 }}>Approve</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}

function AdminEdits() {
  const edits = [
    { id: 1, target: 'ffmpeg-python', field: 'description', user: 'krzemienski', time: '2h ago' },
    { id: 2, target: 'shaka-player', field: 'tags', user: 'mhanssen', time: '5h ago' },
    { id: 3, target: 'WebRTC.org', field: 'url', user: 'admin', time: '1d ago' },
  ];
  return (
    <TableShell title="Edit history" sub="Pending and recent edits to resources">
      <table className="table">
        <thead><tr><th>Resource</th><th>Field</th><th>Editor</th><th>When</th><th></th></tr></thead>
        <tbody>
          {edits.map(e => (
            <tr key={e.id}>
              <td style={{ fontWeight: 500, color: 'var(--text)' }}>{e.target}</td>
              <td className="mono" style={{ fontSize: 12 }}>{e.field}</td>
              <td className="mono" style={{ fontSize: 12 }}>{e.user}</td>
              <td className="mono" style={{ fontSize: 12, color: 'var(--text-3)' }}>{e.time}</td>
              <td style={{ textAlign: 'right' }}>
                <button className="btn ghost" style={{ padding: '5px 10px', fontSize: 12 }}>Diff</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}

function AdminEnrichment() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
        <Stat label="Last enriched" value="3h ago" sub="batch #21 · 47 entries" />
        <Stat label="Queue" value="0" sub="idle" />
        <Stat label="Avg cost" value="$0.34" sub="per batch" />
      </div>
      <TableShell
        title="Enrichment jobs"
        sub="LLM-driven metadata enhancement"
        actions={<button className="btn primary"><Icon5 name="bolt" size={12} color="#0a0a0a" /> Run job</button>}
      >
        <table className="table">
          <thead><tr><th>Job</th><th>Status</th><th>Started</th><th>Completed</th><th></th></tr></thead>
          <tbody>
            {AV_ENRICHMENT_JOBS.map(j => (
              <tr key={j.id}>
                <td className="mono" style={{ fontSize: 12 }}>{j.id}</td>
                <td><StatusChip status={j.status} /></td>
                <td className="mono" style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{j.started}</td>
                <td className="mono" style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{j.completed}</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn ghost" style={{ padding: '5px 10px', fontSize: 12 }}>Logs</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
}

function AdminResearcher() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Run a research task</h3>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>The agent will scour the web for new resources matching your prompt.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="field">
            <label>Prompt</label>
            <textarea className="textarea" placeholder="e.g. Find 5 new open-source AV1 encoders not yet in the index" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            <div className="field">
              <label>Max turns</label>
              <input className="input" defaultValue="15" />
            </div>
            <div className="field">
              <label>Budget</label>
              <input className="input" defaultValue="$1.00" />
            </div>
            <div className="field">
              <label>Auto-approve</label>
              <select className="select"><option>No</option><option>If confidence &gt; 0.8</option></select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn ghost">Save preset</button>
            <button className="btn primary">Run job</button>
          </div>
        </div>
      </div>

      <TableShell title="Researcher jobs" sub="Recent agentic research runs">
        <table className="table">
          <thead><tr><th>Status</th><th>Prompt</th><th>Found</th><th>Approved</th><th>Cost</th><th>Turns</th><th>Created</th></tr></thead>
          <tbody>
            {AV_RESEARCH_JOBS.map(j => (
              <tr key={j.id}>
                <td><StatusChip status={j.status} /></td>
                <td style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>{j.prompt}</td>
                <td className="mono" style={{ fontSize: 12 }}>{j.found}</td>
                <td className="mono" style={{ fontSize: 12 }}>{j.approved}</td>
                <td className="mono" style={{ fontSize: 12, color: 'var(--accent)' }}>{j.cost}</td>
                <td className="mono" style={{ fontSize: 12 }}>{j.turns}</td>
                <td className="mono" style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{j.created}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
}

function AdminExport() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
      {[
        { k: 'JSON Snapshot', desc: 'Complete dataset as a single JSON file. ~12 MB.', cmd: 'download' },
        { k: 'CSV (resources)', desc: 'Flat resource table for spreadsheet workflows.', cmd: 'download' },
        { k: 'README.md', desc: 'Awesome-list flavored Markdown for the GitHub repo.', cmd: 'generate' },
        { k: 'OPML (categories)', desc: 'Hierarchical export for feed readers.', cmd: 'download' },
        { k: 'SQL dump', desc: 'PostgreSQL-compatible schema + data.', cmd: 'download' },
        { k: 'API token', desc: 'Generate a personal access token.', cmd: 'generate' },
      ].map((x, i) => (
        <div key={i} className="card hoverable" style={{ padding: 22 }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{x.k}</h4>
          <p style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5, marginBottom: 16 }}>{x.desc}</p>
          <button className="btn primary" style={{ width: '100%' }}>{x.cmd === 'download' ? 'Download' : 'Generate'}</button>
        </div>
      ))}
    </div>
  );
}

function AdminDatabase() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
        <Stat label="Tables" value="12" />
        <Stat label="Rows" value="3,847" />
        <Stat label="Disk" value="34 MB" />
        <Stat label="Migrations" value="47" sub="0 pending" accent />
      </div>

      <TableShell title="Tables" sub="PostgreSQL — primary database">
        <table className="table">
          <thead><tr><th>Name</th><th>Rows</th><th>Size</th><th>Last write</th><th></th></tr></thead>
          <tbody>
            {[
              ['resources', '1,953', '12.4 MB', '2m ago'],
              ['categories', '9', '24 KB', '4d ago'],
              ['subcategories', '102', '88 KB', '4d ago'],
              ['users', '3', '8 KB', '1d ago'],
              ['audit_log', '14,329', '8.7 MB', '12s ago'],
              ['enrichment_jobs', '21', '156 KB', '3h ago'],
            ].map((row, i) => (
              <tr key={i}>
                <td className="mono" style={{ color: 'var(--accent)', fontSize: 12 }}>{row[0]}</td>
                <td className="mono" style={{ fontSize: 12 }}>{row[1]}</td>
                <td className="mono" style={{ fontSize: 12 }}>{row[2]}</td>
                <td className="mono" style={{ fontSize: 12, color: 'var(--text-3)' }}>{row[3]}</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn ghost" style={{ padding: '5px 10px', fontSize: 12 }}>Inspect</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>

      <div className="card" style={{ padding: 22 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>SQL Console</h3>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14 }}>Read-only — write queries require an admin token.</p>
        <textarea className="textarea" defaultValue="SELECT * FROM resources WHERE cat = 'protocols-transport' LIMIT 10;" style={{ fontSize: 12.5, minHeight: 110 }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
          <button className="btn ghost">Clear</button>
          <button className="btn primary">Run</button>
        </div>
      </div>
    </div>
  );
}

function AdminResources({ go }) {
  const [search, setSearch] = useStateA('');
  const filtered = AV_RESOURCES.filter(r => r.title.toLowerCase().includes(search.toLowerCase()));
  return (
    <TableShell
      title={`Resources (${AV_RESOURCES.length} of ${AV_TOTAL.toLocaleString()})`}
      sub="Manage every entry in the index"
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" placeholder="Search…" style={{ width: 200, padding: '7px 10px' }}
            value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn primary"><Icon5 name="plus" size={12} color="#0a0a0a" /> Add</button>
        </div>
      }
    >
      <table className="table">
        <thead><tr><th>ID</th><th>Title</th><th>Category</th><th>Tags</th><th>Featured</th><th></th></tr></thead>
        <tbody>
          {filtered.map(r => (
            <tr key={r.id}>
              <td className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{r.id}</td>
              <td style={{ fontWeight: 500, color: 'var(--text)' }}>{r.title}</td>
              <td>{AV_CATEGORIES.find(c => c.id === r.cat)?.short}</td>
              <td>
                <div style={{ display: 'flex', gap: 4 }}>
                  {(r.tags || []).slice(0, 2).map((tag, i) => (
                    <span key={i} className="chip mono" style={{ fontSize: 9.5, padding: '2px 6px' }}>{tag}</span>
                  ))}
                </div>
              </td>
              <td>{r.featured ? <span className="chip accent" style={{ fontSize: 9.5 }}>★</span> : <span style={{ color: 'var(--text-3)' }}>—</span>}</td>
              <td style={{ textAlign: 'right' }}>
                <div style={{ display: 'inline-flex', gap: 6 }}>
                  <button className="btn ghost" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => go('resource', { resource: r })}>View</button>
                  <button className="btn ghost" style={{ padding: '5px 10px', fontSize: 12 }}>Edit</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}

function AdminCategories() {
  return (
    <TableShell
      title="Categories"
      sub={`${AV_CATEGORIES.length} top-level domains`}
      actions={<button className="btn primary"><Icon5 name="plus" size={12} color="#0a0a0a" /> Add category</button>}
    >
      <table className="table">
        <thead><tr><th>Icon</th><th>Name</th><th>Slug</th><th>Resources</th><th>Subcategories</th><th></th></tr></thead>
        <tbody>
          {AV_CATEGORIES.map(c => (
            <tr key={c.id}>
              <td style={{ fontSize: 18, color: 'var(--accent)' }}>{c.icon}</td>
              <td style={{ fontWeight: 500, color: 'var(--text)' }}>{c.name}</td>
              <td className="mono" style={{ fontSize: 12, color: 'var(--text-3)' }}>{c.id}</td>
              <td className="mono" style={{ fontSize: 12 }}>{c.count}</td>
              <td className="mono" style={{ fontSize: 12 }}>{(AV_SUBCATEGORIES[c.id] || []).length}</td>
              <td style={{ textAlign: 'right' }}>
                <button className="btn ghost" style={{ padding: '5px 10px', fontSize: 12 }}>Edit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}

function AdminSubcategories() {
  const all = Object.entries(AV_SUBCATEGORIES).flatMap(([catId, subs]) =>
    subs.map(s => ({ ...s, catId }))
  );
  return (
    <TableShell
      title="Subcategories"
      sub={`${all.length} second-level groupings`}
      actions={<button className="btn primary"><Icon5 name="plus" size={12} color="#0a0a0a" /> Add subcategory</button>}
    >
      <table className="table">
        <thead><tr><th>Name</th><th>Slug</th><th>Parent</th><th>Resources</th><th></th></tr></thead>
        <tbody>
          {all.slice(0, 24).map((s, i) => (
            <tr key={i}>
              <td style={{ fontWeight: 500, color: 'var(--text)' }}>{s.name}</td>
              <td className="mono" style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{s.id}</td>
              <td>{AV_CATEGORIES.find(c => c.id === s.catId)?.short}</td>
              <td className="mono" style={{ fontSize: 12 }}>{s.count}</td>
              <td style={{ textAlign: 'right' }}>
                <button className="btn ghost" style={{ padding: '5px 10px', fontSize: 12 }}>Edit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}

function AdminUsers() {
  return (
    <TableShell
      title={`Users (${AV_USERS.length})`}
      sub="Admins and contributors"
      actions={<button className="btn primary"><Icon5 name="plus" size={12} color="#0a0a0a" /> Invite</button>}
    >
      <table className="table">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th></th></tr></thead>
        <tbody>
          {AV_USERS.map(u => (
            <tr key={u.id}>
              <td style={{ fontWeight: 500, color: 'var(--text)' }}>{u.name}</td>
              <td className="mono" style={{ fontSize: 12 }}>{u.email}</td>
              <td>
                <span className={'chip ' + (u.role === 'admin' ? 'accent' : '')}>{u.role}</span>
              </td>
              <td className="mono" style={{ fontSize: 12, color: 'var(--text-3)' }}>{u.joined}</td>
              <td style={{ textAlign: 'right' }}>
                <button className="btn ghost" style={{ padding: '5px 10px', fontSize: 12 }}>Edit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}

function AdminGitHub() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="card" style={{ padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 8, background: 'var(--surface-2)',
            border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent)',
          }}>
            <Icon5 name="folder" size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>krzemienski/awesome-video</h3>
            <p className="mono" style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 4 }}>
              main · last sync 1h ago · 47 commits ahead
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn ghost">Pull</button>
            <button className="btn primary">Sync now</button>
          </div>
        </div>
      </div>

      <TableShell title="Sync jobs" sub="Last 5 import/export operations">
        <table className="table">
          <thead><tr><th>ID</th><th>Type</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {AV_SYNC_JOBS.map(j => (
              <tr key={j.id}>
                <td className="mono" style={{ fontSize: 12 }}>#{j.id}</td>
                <td>{j.type}</td>
                <td><StatusChip status={j.status} /></td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn ghost" style={{ padding: '5px 10px', fontSize: 12 }}>Logs</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
}

function AdminLinkHealth() {
  const stats = [
    { k: '200 OK', v: '1,847', color: '#34d08c' },
    { k: '301/302', v: '78', color: '#ffb84d' },
    { k: '404', v: '21', color: '#ff5c7a' },
    { k: 'Timeout', v: '7', color: '#ff5c7a' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
        {stats.map((s, i) => (
          <div key={i} className="card" style={{ padding: 20 }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: 1.4, color: 'var(--text-3)', marginBottom: 10 }}>
              {s.k}
            </div>
            <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -1, color: s.color }}>{s.v}</div>
          </div>
        ))}
      </div>
      <TableShell title="Recent failures" sub="404s and timeouts from last sweep">
        <table className="table">
          <thead><tr><th>Resource</th><th>URL</th><th>Status</th><th>Last checked</th><th></th></tr></thead>
          <tbody>
            {[
              { t: 'AviSynth', u: 'http://avisynth.org/', s: '404', when: '2h ago' },
              { t: 'OpenVisualCloud/Smart-City', u: 'github.com/OpenVisualCloud/...', s: 'timeout', when: '2h ago' },
              { t: 'M3U8Kit/M3U8Parser', u: 'github.com/M3U8Kit/...', s: '301', when: '2h ago' },
            ].map((r, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 500, color: 'var(--text)' }}>{r.t}</td>
                <td className="mono" style={{ fontSize: 11.5, color: 'var(--accent)' }}>{r.u}</td>
                <td><span className="chip bad" style={{ fontSize: 10 }}>{r.s}</span></td>
                <td className="mono" style={{ fontSize: 12, color: 'var(--text-3)' }}>{r.when}</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn ghost" style={{ padding: '5px 10px', fontSize: 12 }}>Recheck</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
}

function AdminAudit() {
  return (
    <TableShell title="Audit log" sub="Append-only · last 100 events">
      <table className="table">
        <thead><tr><th>ID</th><th>Actor</th><th>Action</th><th>Target</th><th>Status</th><th>When</th></tr></thead>
        <tbody>
          {AV_RECENT_ACTIVITY.map(a => (
            <tr key={a.id}>
              <td className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{a.id}</td>
              <td className="mono" style={{ fontSize: 12, color: 'var(--accent)' }}>{a.user}</td>
              <td className="mono" style={{ fontSize: 12 }}>{a.action}</td>
              <td style={{ color: 'var(--text)' }}>{a.target}</td>
              <td><StatusChip status={a.status} /></td>
              <td className="mono" style={{ fontSize: 12, color: 'var(--text-3)' }}>{a.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}

function AdminResearch() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Research workspace</h3>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 18 }}>
          Drafts, notes, and research-in-progress. Promote to "Approvals" once ready.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {[
            { k: 'AV1 hardware encoders 2026', n: 12, d: 'Active' },
            { k: 'Emerging WebRTC SFUs', n: 7, d: '2 days ago' },
            { k: 'Subtitle ML pipelines', n: 4, d: '1 week ago' },
            { k: 'Low-latency CMAF survey', n: 9, d: 'Active' },
          ].map((p, i) => (
            <div key={i} className="card hoverable" style={{ padding: 16 }}>
              <div className="mono" style={{ fontSize: 10, color: 'var(--accent)', marginBottom: 6, letterSpacing: 1 }}>
                NOTE · 0{i + 1}
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 6 }}>{p.k}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)', display: 'flex', justifyContent: 'space-between' }}>
                <span>{p.n} candidates</span>
                <span>{p.d}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

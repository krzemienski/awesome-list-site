// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { DOC_PAGES } from "./DocsContent";

export const NAV_GROUPS = [
  { label: "Start", items: [{ id: "overview", title: "Overview" }, { id: "principles", title: "Principles" }, { id: "getting-started", title: "Getting started" }] },
  { label: "Foundations", items: [{ id: "tokens", title: "Token contract" }, { id: "theming", title: "Theming & switching" }, { id: "typography", title: "Typography" }, { id: "color", title: "Color & accent" }, { id: "spacing", title: "Spacing & layout" }, { id: "motion", title: "Motion" }] },
  { label: "Components", items: [{ id: "buttons", title: "Buttons" }, { id: "cards", title: "Cards" }, { id: "forms", title: "Forms" }, { id: "navigation", title: "Navigation" }, { id: "lists", title: "List patterns" }] },
  { label: "Patterns", items: [{ id: "flows", title: "Flow diagrams" }, { id: "pages", title: "Page templates" }, { id: "data-density", title: "Data density" }] },
  { label: "Apply", items: [{ id: "integration", title: "Integrate the system" }, { id: "theming-app", title: "Theming an app" }, { id: "a11y", title: "Accessibility" }, { id: "checklist", title: "Launch checklist" }] },
];
const ALL_IDS = NAV_GROUPS.flatMap(group => group.items.map(item => item.id));

function routeId() {
  const hash = window.location.hash.replace(/^#(?:docs-)?/, "");
  return ALL_IDS.includes(hash) ? hash : "overview";
}

function DocsNav({ active, onPick }) {
  return <nav className="docs-nav">
    <div style={{ marginBottom: 28 }}>
      <a href="#showcase" className="mono" style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-2)", textDecoration: "none", display: "block" }}>← AWESOME.VIDEO</a>
      <div className="display-h" style={{ fontSize: 22, marginTop: 8 }}>Docs</div>
      <div className="mono" style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: "0.12em", marginTop: 4 }}>v1.0 · MAY&nbsp;2026</div>
      <div style={{ display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap" }}>
        <a href="#showcase" className="chip muted" style={{ textDecoration: "none", cursor: "pointer" }}>showcase ↗</a>
        <a href="#anatomy" className="chip muted" style={{ textDecoration: "none", cursor: "pointer" }}>anatomy ↗</a>
        <a href="#docs-integration" className="chip muted" style={{ textDecoration: "none", cursor: "pointer" }}>integration ↗</a>
      </div>
    </div>
    {NAV_GROUPS.map(group => <div key={group.label} className="docs-nav-group">
      <div className="docs-nav-label">{group.label}</div>
      {group.items.map(item => <button key={item.id} className={`docs-nav-item${active === item.id ? " active" : ""}`} onClick={() => onPick(item.id)}>{item.title}</button>)}
    </div>)}
  </nav>;
}

export function CanonicalDocs() {
  const [active, setActive] = useState(routeId);
  useEffect(() => {
    const update = () => setActive(routeId());
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  useEffect(() => {
    const target = `#docs-${active}`;
    if (window.location.hash !== target) window.history.replaceState(null, "", target);
    document.querySelector(".docs-main")?.scrollTo?.({ top: 0 });
    window.scrollTo?.({ top: 0, behavior: "instant" });
  }, [active]);

  const flat = useMemo(() => NAV_GROUPS.flatMap(group => group.items.map(item => ({ ...item, group: group.label }))), []);
  const Page = DOC_PAGES[active] || DOC_PAGES.overview;
  const meta = flat.find(item => item.id === active);
  const index = ALL_IDS.indexOf(active);
  const previous = index > 0 ? ALL_IDS[index - 1] : null;
  const next = index < ALL_IDS.length - 1 ? ALL_IDS[index + 1] : null;
  const lookup = id => flat.find(item => item.id === id);
  const pick = id => { window.location.hash = `docs-${id}`; setActive(id); };

  return <div className="page"><div className="grain" aria-hidden="true" /><div className="docs-shell">
    <DocsNav active={active} onPick={pick} />
    <main className="docs-main">
      <div className="docs-meta"><span>{meta?.group}</span><span style={{ color: "var(--text-3)" }}>/</span><span style={{ color: "var(--text-2)" }}>{meta?.title}</span></div>
      <Page />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 80, paddingTop: 32, borderTop: "var(--hairline-w) solid var(--border)" }}>
        {previous ? <button className="card hoverable" onClick={() => pick(previous)} style={{ padding: 20, textAlign: "left", cursor: "pointer", fontFamily: "inherit", color: "inherit" }}><div className="mono" style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: "0.18em", marginBottom: 8 }}>← PREVIOUS</div><div style={{ fontWeight: 600, fontSize: 15 }}>{lookup(previous)?.title}</div></button> : <div />}
        {next ? <button className="card hoverable" onClick={() => pick(next)} style={{ padding: 20, textAlign: "right", cursor: "pointer", fontFamily: "inherit", color: "inherit" }}><div className="mono" style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: "0.18em", marginBottom: 8 }}>NEXT →</div><div style={{ fontWeight: 600, fontSize: 15 }}>{lookup(next)?.title}</div></button> : <div />}
      </div>
    </main>
  </div></div>;
}

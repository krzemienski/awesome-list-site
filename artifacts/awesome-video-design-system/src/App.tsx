import { useMemo, useState } from "react";
import {
  ACCENTS,
  DEFAULT_ACCENT,
  DEFAULT_SYSTEM,
  DESIGN_SYSTEMS,
  PRODUCT_PROFILES,
  SYSTEM_DEFAULT_ACCENT,
  applyDesignSystem,
  isSystemId,
  type AccentId,
  type DesignSystemId,
} from "../../../client/src/lib/design-system";

const foundationTokens = [
  ["Page", "--bg"],
  ["Raised", "--bg-2"],
  ["Surface", "--surface"],
  ["Surface strong", "--surface-3"],
  ["Primary ink", "--text"],
  ["Secondary ink", "--text-2"],
  ["Border", "--border-strong"],
  ["Accent", "--accent"],
] as const;

const sourceRows = [
  ["Replit artifact contract", "artifacts/awesome-video-design-system/DESIGN.md"],
  ["Machine-readable tokens", "artifacts/awesome-video-design-system/tokens.json"],
  ["Shipping CSS tokens and skins", "client/src/styles/design-system.css"],
  ["Runtime registry and profiles", "client/src/lib/design-system.ts"],
  ["Cross-product profile roles", "shared/styles/product-profiles.css"],
] as const;

function currentSystem(): DesignSystemId {
  const value = document.documentElement.dataset.system;
  return isSystemId(value) ? value : DEFAULT_SYSTEM;
}

function currentAccent(): AccentId {
  const value = document.documentElement.dataset.accent;
  return ACCENTS.some((item) => item.id === value)
    ? (value as AccentId)
    : DEFAULT_ACCENT;
}

export default function App() {
  const [system, setSystem] = useState<DesignSystemId>(currentSystem);
  const [accent, setAccent] = useState<AccentId>(currentAccent);
  const systems = useMemo(
    () =>
      Object.entries(DESIGN_SYSTEMS) as [
        DesignSystemId,
        (typeof DESIGN_SYSTEMS)[DesignSystemId],
      ][],
    [],
  );

  const chooseSystem = (nextSystem: DesignSystemId) => {
    const nextAccent = SYSTEM_DEFAULT_ACCENT[nextSystem];
    applyDesignSystem(nextSystem, nextAccent);
    setSystem(nextSystem);
    setAccent(nextAccent);
  };

  const chooseAccent = (nextAccent: AccentId) => {
    applyDesignSystem(system, nextAccent);
    setAccent(nextAccent);
  };

  return (
    <div className="ds-artifact">
      <div className="grain" aria-hidden="true" />
      <header className="artifact-header">
        <a className="artifact-brand" href="#top" aria-label="Awesome.Video design system home">
          <span aria-hidden="true">AV</span>
          <strong>AWESOME.VIDEO</strong>
        </a>
        <nav aria-label="Design system sections">
          <a href="#foundations">Foundations</a>
          <a href="#themes">Themes</a>
          <a href="#components">Components</a>
          <a href="#profiles">Profiles</a>
          <a href="#governance">Governance</a>
        </nav>
      </header>

      <main id="top">
        <section className="hero section-shell">
          <div>
            <p className="eyebrow">Canonical Replit design-system artifact</p>
            <h1 className="display-h">
              One system. <em>Every product.</em>
            </h1>
            <p className="hero-copy">
              The canonical home of Awesome.Video’s five personalities, ten accents,
              semantic product profiles, accessible component contract, and release rules.
            </p>
            <div className="hero-actions">
              <a className="btn primary" href="#themes">Explore live themes</a>
              <a className="btn ghost" href="#governance">Read the contract</a>
            </div>
          </div>
          <aside className="artifact-status card">
            <span className="chip ok">Canonical</span>
            <dl>
              <div><dt>Default</dt><dd>Editorial + Crimson</dd></div>
              <div><dt>Systems</dt><dd>{systems.length}</dd></div>
              <div><dt>Accents</dt><dd>{ACCENTS.length}</dd></div>
              <div><dt>Profiles</dt><dd>{Object.keys(PRODUCT_PROFILES).length}</dd></div>
            </dl>
          </aside>
        </section>

        <section className="section-shell" id="foundations">
          <SectionHeading
            index="01"
            title="Shared foundations"
            copy="Every specimen is rendered by the stylesheet that ships in the app. The artifact carries no second palette or visual implementation."
          />
          <div className="swatch-grid">
            {foundationTokens.map(([label, token]) => (
              <article className="token-card card" key={token}>
                <div className="token-swatch" style={{ background: `var(${token})` }} />
                <strong>{label}</strong>
                <code>{token}</code>
              </article>
            ))}
          </div>
          <div className="foundation-grid">
            <article className="card">
              <p className="eyebrow">Typography</p>
              <h3 className="display-h">Frame by frame.</h3>
              <p>Display, body, and mono roles change personality without changing meaning.</p>
              <code>--font-display · --font-body · --font-mono</code>
            </article>
            <article className="card rhythm-card">
              <p className="eyebrow">Rhythm and behavior</p>
              <div><span>Space</span><strong>4 · 8 · 12 · 16 · 24 · 32 · 48 · 64</strong></div>
              <div><span>Motion</span><strong>160 · 240 · 400</strong></div>
              <div><span>Targets</span><strong>44 minimum</strong></div>
              <div><span>Mode</span><strong>Dark only</strong></div>
            </article>
          </div>
        </section>

        <section className="section-shell" id="themes">
          <SectionHeading
            index="02"
            title="Personality and accent layers"
            copy="These controls use the shipping runtime applier. Products may select approved layers; they may not fork foundations."
          />
          <div className="theme-grid">
            {systems.map(([id, item]) => (
              <button
                className="theme-card card hoverable"
                data-ds="card-hover"
                aria-pressed={system === id}
                key={id}
                onClick={() => chooseSystem(id)}
              >
                <span className="eyebrow">{item.tag}</span>
                <strong>{item.name}</strong>
                <small>{item.desc}</small>
                <code>{id}</code>
              </button>
            ))}
          </div>
          <div className="accent-list" aria-label="Accent choices">
            {ACCENTS.map((item) => (
              <button
                className="accent-choice"
                aria-pressed={accent === item.id}
                key={item.id}
                onClick={() => chooseAccent(item.id as AccentId)}
              >
                <span className="accent-dot" style={{ background: item.primary }} aria-hidden="true" />
                <span>{item.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="section-shell" id="components">
          <SectionHeading
            index="03"
            title="Component contract"
            copy="Components own accessible names, keyboard behavior, focus, states, and targets. Themes only change their finish."
          />
          <div className="component-grid">
            <article className="card">
              <p className="eyebrow">Actions</p>
              <div className="component-row">
                <button className="btn primary">Save resource</button>
                <button className="btn">Secondary</button>
                <button className="btn danger">Remove</button>
                <button className="btn" disabled>Unavailable</button>
              </div>
              <code>default · hover · focus · active · disabled</code>
            </article>
            <article className="card">
              <p className="eyebrow">Fields</p>
              <label htmlFor="artifact-note">Operational note</label>
              <input className="input" id="artifact-note" placeholder="Add context for the next editor" />
              <code>Persistent label · visible focus · explicit error copy</code>
            </article>
            <article className="card">
              <p className="eyebrow">Status semantics</p>
              <div className="component-row">
                <span className="chip ok">Healthy</span>
                <span className="chip warn">Review</span>
                <span className="chip bad">Blocked</span>
                <span className="chip muted">Draft</span>
              </div>
              <code>Text + border + accessible name</code>
            </article>
          </div>
        </section>

        <section className="section-shell" id="profiles">
          <SectionHeading
            index="04"
            title="Federated product profiles"
            copy="Profiles provide responsible first-visit defaults and density. They are not separate design systems, and saved choices always win."
          />
          <div className="profile-table card" role="region" aria-label="Product profiles" tabIndex={0}>
            <table>
              <thead>
                <tr><th>Profile</th><th>Default expression</th><th>Density</th><th>Ownership</th></tr>
              </thead>
              <tbody>
                {Object.entries(PRODUCT_PROFILES).map(([id, profile]) => (
                  <tr key={id}>
                    <td><strong>{profile.name}</strong><code>{id}</code></td>
                    <td>{profile.defaultSystem ? `${profile.defaultSystem} + ${profile.defaultAccent}` : "Host inherited"}</td>
                    <td><span className="chip muted">{profile.density}</span></td>
                    <td>{profile.defaultSystem ? "Product composition" : "Integration boundary"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="section-shell" id="governance">
          <SectionHeading
            index="05"
            title="One ownership chain"
            copy="Replit discovers this artifact; the app and artifact consume the same implementation sources; generated resources fail closed when they drift."
          />
          <div className="governance-grid">
            <article className="card source-map">
              <p className="eyebrow">Canonical resource map</p>
              {sourceRows.map(([label, path]) => (
                <div key={path}><strong>{label}</strong><code>{path}</code></div>
              ))}
            </article>
            <article className="card">
              <p className="eyebrow">Release contract</p>
              <ol className="release-list">
                <li><span>1</span><div><strong>Change the runtime source</strong><p>Token, registry, primitive, or profile contract.</p></div></li>
                <li><span>2</span><div><strong>Generate artifact resources</strong><p><code>npm run generate:design-system-artifact</code></p></div></li>
                <li><span>3</span><div><strong>Run drift and accessibility gates</strong><p>No raw values or behavioral forks.</p></div></li>
                <li><span>4</span><div><strong>Save the workspace template</strong><p>Consumers receive the same approved release.</p></div></li>
              </ol>
            </article>
          </div>
        </section>
      </main>
      <footer className="section-shell">
        <span>Awesome.Video federated design system</span>
        <span>One logical system · runtime + artifact + template</span>
      </footer>
    </div>
  );
}

function SectionHeading({ index, title, copy }: { index: string; title: string; copy: string }) {
  return (
    <div className="section-heading">
      <span className="eyebrow">{index} / System manual</span>
      <h2>{title}</h2>
      <p>{copy}</p>
    </div>
  );
}
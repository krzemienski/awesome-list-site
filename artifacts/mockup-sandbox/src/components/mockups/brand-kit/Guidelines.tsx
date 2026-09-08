import React from "react";

export function Guidelines() {
  return (
    <div className="brand-kit-page p-8 md:p-16">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,500;1,9..144,600&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />

      <div className="max-w-[1000px] mx-auto space-y-16">
        <header className="space-y-4 mb-16">
          <p className="font-display italic text-accent-tint text-sm uppercase tracking-[3px]">Spec Board</p>
          <h1 className="font-sans font-extrabold text-5xl tracking-[-1.5px] text-ink">Guidelines & Accessibility</h1>
        </header>

        {/* Voice & Tone */}
        <section className="space-y-6">
          <h2 className="font-mono text-muted text-sm uppercase tracking-wider">01. Voice & Tone</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            <div className="brand-kit-card p-6 space-y-6">
              <h3 className="font-sans font-bold text-lg text-ink">Precise</h3>
              <p className="font-sans text-sm text-muted">Say the codec or the standard. Avoid vague "cutting-edge" marketing speak. Be a reliable narrator.</p>
              <div className="space-y-3">
                <div className="brand-kit-status-ok border rounded-[var(--radius-sm)] p-3">
                  <span className="font-mono text-xs uppercase tracking-wider block mb-1">Write</span>
                  <span className="font-sans text-sm">HLS, DASH & CMAF packaging — 214 resources.</span>
                </div>
                <div className="brand-kit-status-bad border rounded-[var(--radius-sm)] p-3">
                  <span className="font-mono text-xs uppercase tracking-wider block mb-1">Avoid</span>
                  <span className="font-sans text-sm">Amazing streaming tools you'll love!</span>
                </div>
              </div>
            </div>

            <div className="brand-kit-card p-6 space-y-6">
              <h3 className="font-sans font-bold text-lg text-ink">Editorial</h3>
              <p className="font-sans text-sm text-muted">Use sentence case for headlines. Employ Fraunces italic for emphasis. Absolutely no exclamation marks.</p>
              <div className="space-y-3">
                <div className="brand-kit-status-ok border rounded-[var(--radius-sm)] p-3">
                  <span className="font-mono text-xs uppercase tracking-wider block mb-1">Write</span>
                  <span className="font-sans text-sm">The index for people who ship <span className="font-display italic">video</span>.</span>
                </div>
                <div className="brand-kit-status-bad border rounded-[var(--radius-sm)] p-3">
                  <span className="font-mono text-xs uppercase tracking-wider block mb-1">Avoid</span>
                  <span className="font-sans text-sm">Welcome to Awesome Video!</span>
                </div>
              </div>
            </div>

            <div className="brand-kit-card p-6 space-y-6">
              <h3 className="font-sans font-bold text-lg text-ink">Technical-first</h3>
              <p className="font-sans text-sm text-muted">Data matters. Ensure numerals, specs, and chips are set in monospace for clear parsing.</p>
              <div className="space-y-3">
                <div className="brand-kit-status-ok border rounded-[var(--radius-sm)] p-3">
                  <span className="font-mono text-xs uppercase tracking-wider block mb-1">Write</span>
                  <span className="font-sans text-sm">Latency: <span className="font-mono text-ink">~400ms</span></span>
                </div>
                <div className="brand-kit-status-bad border rounded-[var(--radius-sm)] p-3">
                  <span className="font-mono text-xs uppercase tracking-wider block mb-1">Avoid</span>
                  <span className="font-sans text-sm">Super fast latency.</span>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Accessibility Rules */}
        <section className="space-y-6">
          <h2 className="font-mono text-muted text-sm uppercase tracking-wider">02. Accessibility</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div className="brand-kit-card p-6 space-y-4">
              <h3 className="font-sans font-bold text-lg text-ink mb-4">Contrast on Black (#000000)</h3>
              <table className="w-full text-left font-mono text-sm border-collapse">
                <tbody>
                  <tr className="border-b border-hairline">
                    <td className="py-3 text-ink"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#f4f3ee]"></div> #f4f3ee</div></td>
                    <td className="py-3 text-muted">Ink</td>
                    <td className="py-3 text-right">AAA 19.9:1</td>
                  </tr>
                  <tr className="border-b border-hairline">
                    <td className="py-3 text-[#a8a4a0]"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#a8a4a0]"></div> #a8a4a0</div></td>
                    <td className="py-3 text-muted">Muted</td>
                    <td className="py-3 text-right">AAA 9.4:1</td>
                  </tr>
                  <tr className="border-b border-hairline">
                    <td className="py-3 text-[#ffb4be]"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#ffb4be]"></div> #ffb4be</div></td>
                    <td className="py-3 text-muted">Accent Tint</td>
                    <td className="py-3 text-right">AAA 11.2:1</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-[#ff3d52]"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#ff3d52]"></div> #ff3d52</div></td>
                    <td className="py-3 text-muted">Accent</td>
                    <td className="py-3 text-right">AA lg 5.5:1</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-6">
              <div className="brand-kit-card p-6">
                <h3 className="font-sans font-bold text-lg text-ink mb-4">Focus & Interaction</h3>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-6">
                    <div className="focus-ring-example">
                      <button className="bg-[var(--accent)] text-[var(--bg)] font-sans font-semibold px-4 py-2 rounded-[var(--radius-sm)] focus:outline-none">
                        Button focused
                      </button>
                    </div>
                    <div className="font-mono text-xs text-muted">
                      2px solid #ff3d52<br/>2px offset
                    </div>
                  </div>
                  <div className="flex items-center gap-6 mt-4">
                    <div className="w-[44px] h-[44px] border border-dashed border-[var(--text-2)] flex items-center justify-center text-muted">
                      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"></path></svg>
                    </div>
                    <div className="font-mono text-xs text-muted">
                      Min touch target<br/>44×44 px
                    </div>
                  </div>
                </div>
              </div>

              <div className="brand-kit-card p-6">
                <h3 className="font-sans font-bold text-sm text-ink mb-4">State + Color rule</h3>
                <p className="font-sans text-xs text-muted mb-4">Never convey state by color alone. Pair chips with explicit text labels.</p>
                <div className="flex gap-4">
                  <span className="brand-kit-status-ok font-mono text-xs px-2 py-1 border rounded-[var(--radius-sm)]">OK</span>
                  <span className="brand-kit-status-warn font-mono text-xs px-2 py-1 border rounded-[var(--radius-sm)]">WARN</span>
                  <span className="brand-kit-status-bad font-mono text-xs px-2 py-1 border rounded-[var(--radius-sm)]">BAD</span>
                  <span className="brand-kit-status-info font-mono text-xs px-2 py-1 border rounded-[var(--radius-sm)]">INFO</span>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Tokens Table */}
        <section className="space-y-6">
          <h2 className="font-mono text-muted text-sm uppercase tracking-wider">03. Token Quick-Reference</h2>
          <div className="brand-kit-card p-0 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-6 border-b md:border-b-0 md:border-r border-hairline font-mono text-sm space-y-4">
                {/* DS-OK: literal values are the fixed token reference this brand guideline documents. */}
                <div className="flex justify-between"><span>--bg</span> <span className="text-ink">#000000</span></div>
                <div className="flex justify-between"><span>--surface</span> <span className="text-ink">#0e0d0c</span></div>
                <div className="flex justify-between"><span>--ink</span> <span className="text-ink">#f4f3ee</span></div>
                <div className="flex justify-between"><span>--muted</span> <span className="text-ink">#a8a4a0</span></div>
                {/* DS-OK: literal values are the fixed token reference this brand guideline documents. */}
                <div className="flex justify-between"><span>--accent</span> <span className="text-ink">#ff3d52</span></div>
                <div className="flex justify-between"><span>--accent-tint</span> <span className="text-ink">#ffb4be</span></div>
                <div className="flex justify-between"><span>--accent-2</span> <span className="text-ink">#b84dff</span></div>
                <div className="flex justify-between"><span>--hairline</span> <span className="text-ink">rgba(244,243,238,.12)</span></div>
              </div>
              <div className="p-6 font-mono text-sm space-y-4">
                <div className="flex justify-between"><span>radius-card</span> <span className="text-ink">14px</span></div>
                <div className="flex justify-between"><span>radius-logo</span> <span className="text-ink">16/76</span></div>
                <div className="flex justify-between"><span>font-sans</span> <span className="text-ink">Inter</span></div>
                <div className="flex justify-between"><span>font-display</span> <span className="text-ink">Fraunces italic</span></div>
                <div className="flex justify-between"><span>font-mono</span> <span className="text-ink">JetBrains Mono</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* Usage Rules */}
        <section className="space-y-6">
          <h2 className="font-mono text-muted text-sm uppercase tracking-wider">04. Usage Rules</h2>
          <div className="brand-kit-card p-8">
            <ul className="space-y-4 font-sans text-muted list-disc list-outside ml-4">
              <li><span className="text-ink font-medium">Pure black only</span> — never use near-black for the page background. The void is absolute.</li>
              <li><span className="text-ink font-medium">No shadows</span> — depth is created entirely via hairlines and surface background tints.</li>
              <li><span className="text-ink font-medium">Crimson is identity</span> — use it for primary actions, branding, and emphasis.</li>
              <li><span className="text-ink font-medium">Violet is seasoning</span> — use it rarely, as a secondary accent when a second color is strictly required.</li>
              <li><span className="text-ink font-medium">Fraunces never for body text</span> — use it exclusively for eyebrows, accents, and selective headline emphasis.</li>
            </ul>
          </div>
        </section>

      </div>
    </div>
  );
}

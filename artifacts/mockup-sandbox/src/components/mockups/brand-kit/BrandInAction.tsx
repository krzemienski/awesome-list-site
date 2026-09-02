import React from "react";

export function BrandInAction() {
  return (
    <div className="min-h-screen bg-[#000000] p-8 md:p-16 text-[#f4f3ee] overflow-y-auto">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,500;1,9..144,600&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />

      <style>{`
        .font-sans { font-family: 'Inter', sans-serif; }
        .font-display { font-family: 'Fraunces', serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        .border-hairline { border: 1px solid rgba(244,243,238,0.12); }
        .bg-surface { background-color: #0e0d0c; }
        .text-ink { color: #f4f3ee; }
        .text-muted { color: #a8a4a0; }
        .text-accent { color: #ff3d52; }
        .text-accent-tint { color: #ffb4be; }
        .bg-accent-wash { background-color: rgba(255,61,82,0.08); }
      `}</style>

      <div className="max-w-[1000px] mx-auto space-y-16">
        <header className="space-y-4 mb-16">
          <p className="font-display italic text-accent-tint text-sm uppercase tracking-[3px]">Spec Board</p>
          <h1 className="font-sans font-extrabold text-5xl tracking-[-1.5px] text-ink">Brand in Action</h1>
        </header>

        {/* OG Share Card */}
        <section className="space-y-6">
          <h2 className="font-mono text-muted text-sm uppercase tracking-wider">01. OG Share Card</h2>
          <div className="border-hairline rounded-[14px] p-8 bg-surface">
            <div className="relative w-full max-w-[800px] aspect-[1200/630] bg-[#000000] border-hairline rounded-[14px] overflow-hidden flex flex-col justify-between p-12">
              <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[80%] bg-[#ff3d52] opacity-20 blur-[120px] rounded-full pointer-events-none"></div>

              <div className="space-y-8 z-10">
                <p className="font-display italic text-accent-tint text-lg uppercase tracking-[3px]">CODECS · AWESOME VIDEO</p>
                <div className="w-16 h-[2px] bg-[#ff3d52]"></div>
                <h3 className="font-sans font-extrabold text-[56px] leading-[1.1] tracking-[-2px] text-ink max-w-[80%]">
                  FFmpeg filters for real-time encoding
                </h3>
                <p className="font-display italic text-[24px] text-muted max-w-[70%]">
                  Essential techniques for maintaining quality at low latencies.
                </p>
              </div>

              <div className="flex items-end justify-between w-full z-10">
                <div className="flex items-center gap-4">
                  <svg width="56" height="56" viewBox="0 0 76 76">
                    <rect x="2" y="2" width="72" height="72" rx="16" fill="#000" stroke="#ff3d52" strokeWidth="4"/>
                    <text x="38" y="51" textAnchor="middle" className="font-sans" fontWeight="800" fontSize="34" fill="#ff3d52" letterSpacing="-1">AV</text>
                  </svg>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-sans font-bold text-2xl tracking-[-0.5px] text-ink">awesome</span>
                    <span className="font-display italic font-semibold text-2xl text-accent">.video</span>
                  </div>
                </div>
                <div className="border border-[#ff3d52] text-[#f4f3ee] px-4 py-1.5 rounded-full font-mono text-sm">
                  2,600+ resources
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Resource Card */}
        <section className="space-y-6">
          <h2 className="font-mono text-muted text-sm uppercase tracking-wider">02. Resource Card (App UI)</h2>
          <div className="border-hairline rounded-[14px] p-8 bg-surface">
            <div className="bg-surface border-hairline rounded-[14px] p-6 max-w-[400px] hover:border-[rgba(244,243,238,0.24)] transition-colors cursor-pointer group">
              <div className="flex items-start justify-between mb-4">
                <span className="bg-accent-wash text-accent font-mono text-xs px-2.5 py-1 rounded-sm">Encoding</span>
                <span className="text-muted font-mono text-xs group-hover:text-ink transition-colors">↗</span>
              </div>
              <h4 className="font-sans font-bold text-xl text-ink tracking-[-0.5px] mb-2 leading-snug">
                Advanced FFmpeg Command Generator
              </h4>
              <p className="font-sans font-normal text-muted text-sm leading-relaxed mb-6 line-clamp-2">
                A visual tool for constructing complex filter graphs and encoding pipelines with hardware acceleration support.
              </p>
              <div className="flex items-center gap-4 font-mono text-xs text-muted">
                <span className="flex items-center gap-1.5">★ 1.2k</span>
                <span className="flex items-center gap-1.5">⏱ 4m read</span>
              </div>
            </div>
          </div>
        </section>

        {/* Hero Snippet */}
        <section className="space-y-6">
          <h2 className="font-mono text-muted text-sm uppercase tracking-wider">03. Hero Snippet</h2>
          <div className="border-hairline rounded-[14px] p-12 bg-surface flex flex-col items-start gap-8">
            <p className="font-display italic text-accent-tint text-sm uppercase tracking-[3px]">CURATED · 2,600+ RESOURCES</p>
            <h1 className="font-sans font-extrabold text-6xl tracking-[-2px] text-ink leading-tight">
              The index for people <br/>
              <span className="relative">
                who ship video.
                <span className="absolute -bottom-2 left-0 w-full h-[3px] bg-[#ff3d52] skew-x-[-15deg] origin-bottom-left scale-x-[0.95]"></span>
              </span>
            </h1>
            <div className="flex items-center gap-4 pt-4">
              <button className="bg-[#ff3d52] text-[#000000] font-sans font-semibold px-6 py-3 rounded-md hover:bg-[#ff5c7a] transition-colors">
                Explore Resources
              </button>
              <button className="border-hairline text-ink bg-transparent font-sans font-semibold px-6 py-3 rounded-md hover:bg-[rgba(244,243,238,0.05)] transition-colors">
                Submit a Tool
              </button>
            </div>
          </div>
        </section>

        {/* Social Avatars */}
        <section className="space-y-6">
          <h2 className="font-mono text-muted text-sm uppercase tracking-wider">04. Social Avatar Set</h2>
          <div className="border-hairline rounded-[14px] p-12 bg-surface">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">

              {/* GitHub */}
              <div className="flex flex-col items-center gap-6">
                <svg width="120" height="120" viewBox="0 0 76 76" className="rounded-full overflow-hidden border-hairline">
                  <rect width="76" height="76" fill="#000"/>
                  <rect x="4" y="4" width="68" height="68" rx="14" fill="#000" stroke="#ff3d52" strokeWidth="4"/>
                  <text x="38" y="52" textAnchor="middle" className="font-sans" fontWeight="800" fontSize="36" fill="#ff3d52" letterSpacing="-1">AV</text>
                </svg>
                <div className="text-center font-mono text-sm text-muted">
                  <span className="block text-ink">GitHub Org</span>
                  <span className="block">Circle mask, 120px</span>
                </div>
              </div>

              {/* X / Twitter */}
              <div className="flex flex-col items-center gap-6">
                <svg width="120" height="120" viewBox="0 0 76 76">
                  <rect width="76" height="76" fill="#000"/>
                  <rect x="2" y="2" width="72" height="72" rx="16" fill="#000" stroke="#ff3d52" strokeWidth="4"/>
                  <text x="38" y="51" textAnchor="middle" className="font-sans" fontWeight="800" fontSize="34" fill="#ff3d52" letterSpacing="-1">AV</text>
                </svg>
                <div className="text-center font-mono text-sm text-muted">
                  <span className="block text-ink">X / Twitter</span>
                  <span className="block">Native squircle, 400px</span>
                </div>
              </div>

              {/* YouTube */}
              <div className="flex flex-col items-center gap-6">
                <svg width="120" height="120" viewBox="0 0 76 76" className="rounded-full overflow-hidden">
                  <rect width="76" height="76" fill="#000"/>
                  <rect x="8" y="8" width="60" height="60" rx="12" fill="#000" stroke="#ff3d52" strokeWidth="5"/>
                  <text x="38" y="53" textAnchor="middle" className="font-sans" fontWeight="800" fontSize="32" fill="#ff3d52" letterSpacing="-1">AV</text>
                </svg>
                <div className="text-center font-mono text-sm text-muted">
                  <span className="block text-ink">YouTube</span>
                  <span className="block">Padded for circle crop, 800px</span>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Email Banner */}
        <section className="space-y-6">
          <h2 className="font-mono text-muted text-sm uppercase tracking-wider">05. Banner Strip (600×200)</h2>
          <div className="border-hairline rounded-[14px] p-8 bg-surface flex justify-center">
            <div className="w-[600px] h-[200px] bg-[#000000] border-hairline rounded-[8px] flex flex-col items-center justify-center gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#ff3d52] opacity-10 blur-[80px] pointer-events-none rounded-full"></div>
              <div className="flex items-center gap-3 z-10">
                <svg width="44" height="44" viewBox="0 0 76 76">
                  <rect x="2" y="2" width="72" height="72" rx="16" fill="#000" stroke="#ff3d52" strokeWidth="4"/>
                  <text x="38" y="51" textAnchor="middle" className="font-sans" fontWeight="800" fontSize="34" fill="#ff3d52" letterSpacing="-1">AV</text>
                </svg>
                <div className="flex items-baseline gap-1">
                  <span className="font-sans font-bold text-xl tracking-[-0.5px] text-ink">awesome</span>
                  <span className="font-display italic font-semibold text-xl text-accent">.video</span>
                </div>
              </div>
              <p className="font-mono text-muted text-xs z-10 tracking-wide uppercase">The index for people who ship video</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

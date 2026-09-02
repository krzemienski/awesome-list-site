import React from 'react';

export function ColorType() {
  return (
    <div className="min-h-screen bg-black text-[#f4f3ee] font-sans antialiased selection:bg-[#ff3d52] selection:text-white p-12 lg:p-24 pb-32">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Fraunces:ital,wght@1,500;1,600&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      <style dangerouslySetInnerHTML={{__html: `
        .font-sans { font-family: 'Inter', sans-serif; }
        .font-serif { font-family: 'Fraunces', serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
      `}} />

      <div className="max-w-[1000px] mx-auto space-y-32">
        <header className="space-y-4">
          <p className="font-serif italic font-medium uppercase tracking-[3px] text-[#ffb4be] text-sm">Brand Identity · Color & Typography</p>
          <h1 className="font-sans font-extrabold text-5xl md:text-7xl tracking-[-0.03em] leading-[1.1]">The Core System</h1>
        </header>

        <section className="space-y-12">
          <header>
            <h2 className="font-sans font-bold text-2xl tracking-[-0.01em]">Core Tokens</h2>
            <div className="h-px w-full bg-[#f4f3ee]/10 mt-6" />
          </header>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <ColorSwatch name="Background" hex="#000000" oklch="oklch(0 0 0)" color="#000000" border />
            <ColorSwatch name="Surface" hex="#0e0d0c" oklch="oklch(0.17 0.003 84)" color="#0e0d0c" border />
            <ColorSwatch name="Hairline" hex="rgba(244,243,238,0.12)" oklch="-" color="rgba(244,243,238,0.12)" bg="#000" border />
            <div />
            
            <ColorSwatch name="Ink (Primary)" hex="#f4f3ee" oklch="oklch(0.962 0.005 106)" color="#f4f3ee" textColor="#000" />
            <ColorSwatch name="Muted" hex="#a8a4a0" oklch="oklch(0.723 0.008 84)" color="#a8a4a0" textColor="#000" />
            <div />
            <div />

            <ColorSwatch name="Accent (Crimson)" hex="#ff3d52" oklch="oklch(0.65 0.23 18)" color="#ff3d52" textColor="#fff" />
            <ColorSwatch name="Crimson Tint" hex="#ffb4be" oklch="oklch(0.82 0.10 12)" color="#ffb4be" textColor="#000" />
            <ColorSwatch name="Crimson Wash" hex="rgba(255,61,82,0.08)" oklch="-" color="rgba(255,61,82,0.08)" bg="#000" border />
            <ColorSwatch name="Secondary Accent" hex="#b84dff" oklch="oklch(0.62 0.27 305)" color="#b84dff" textColor="#fff" />

            <ColorSwatch name="Status: OK" hex="#34d08c" oklch="oklch(0.75 0.15 163)" color="#34d08c" textColor="#000" />
            <ColorSwatch name="Status: Warn" hex="#ffb84d" oklch="oklch(0.82 0.14 74)" color="#ffb84d" textColor="#000" />
            <ColorSwatch name="Status: Bad" hex="#ff5c7a" oklch="oklch(0.68 0.21 12)" color="#ff5c7a" textColor="#000" />
            <ColorSwatch name="Status: Info" hex="#5eddf2" oklch="oklch(0.85 0.10 205)" color="#5eddf2" textColor="#000" />
          </div>
        </section>

        <section className="space-y-12">
          <header>
            <h2 className="font-sans font-bold text-2xl tracking-[-0.01em]">Crimson Ramp</h2>
            <div className="h-px w-full bg-[#f4f3ee]/10 mt-6" />
          </header>

          <div className="flex flex-col md:flex-row h-24 rounded-[14px] overflow-hidden border border-[#f4f3ee]/10">
            {['#33070c', '#660f18', '#991724', '#cc1e30', '#ff3d52', '#ff6675', '#ff8f99', '#ffb4be', '#ffe3e7'].map((hex) => (
              <div key={hex} className="flex-1 flex items-end p-3" style={{ backgroundColor: hex }}>
                <span className="font-mono text-[10px] opacity-70 mix-blend-difference text-white">{hex}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-12">
          <header>
            <h2 className="font-sans font-bold text-2xl tracking-[-0.01em]">Contrast (on #000)</h2>
            <div className="h-px w-full bg-[#f4f3ee]/10 mt-6" />
          </header>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <ContrastCard fg="#f4f3ee" ratio="19.9:1" rating="AAA" />
            <ContrastCard fg="#a8a4a0" ratio="9.4:1" rating="AAA" />
            <ContrastCard fg="#ff3d52" ratio="5.5:1" rating="AA (Large)" />
            <ContrastCard fg="#ffb4be" ratio="11.2:1" rating="AAA" />
            <ContrastCard fg="#b84dff" ratio="4.9:1" rating="AA (Large)" />
          </div>
          <p className="font-mono text-sm text-[#a8a4a0]">Note: Crimson #ff3d52 on black: AA for large text & UI components; use #ffb4be for small crimson text.</p>
        </section>

        <section className="space-y-12">
          <header>
            <h2 className="font-sans font-bold text-2xl tracking-[-0.01em]">Typography</h2>
            <div className="h-px w-full bg-[#f4f3ee]/10 mt-6" />
          </header>

          <div className="space-y-24">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="col-span-1">
                <p className="font-mono text-sm text-[#a8a4a0]">Inter 800<br/>Display, -2px tracking</p>
              </div>
              <div className="col-span-3">
                <h1 className="font-sans font-extrabold text-6xl tracking-[-0.03em] leading-tight">The index for people who ship video.</h1>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="col-span-1">
                <p className="font-mono text-sm text-[#a8a4a0]">Inter 400/500<br/>Body paragraph</p>
              </div>
              <div className="col-span-3">
                <p className="font-sans text-lg text-[#a8a4a0] leading-relaxed max-w-2xl">
                  awesome.video is a curated directory of tools, libraries, and resources for video engineers. We focus on modern infrastructure, encoding, and playback technologies.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="col-span-1">
                <p className="font-mono text-sm text-[#a8a4a0]">Fraunces italic 500/600<br/>Eyebrow, 3px tracking</p>
              </div>
              <div className="col-span-3">
                <p className="font-serif italic font-medium uppercase tracking-[3px] text-[#ffb4be]">CURATED · 2,600+ RESOURCES</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="col-span-1">
                <p className="font-mono text-sm text-[#a8a4a0]">JetBrains Mono<br/>Code & Data</p>
              </div>
              <div className="col-span-3 space-y-4 font-mono text-[#f4f3ee]">
                <div className="text-7xl">72px</div>
                <div className="text-5xl">48px</div>
                <div className="text-[32px]">32px</div>
                <div className="text-lg">18px</div>
                <div className="text-sm">14px</div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

function ColorSwatch({ name, hex, oklch, color, textColor = "#f4f3ee", bg, border }: any) {
  return (
    <div className="bg-[#0e0d0c] rounded-[14px] border border-[#f4f3ee]/10 overflow-hidden flex flex-col">
      <div 
        className="h-32 w-full p-4 flex items-end" 
        style={{ backgroundColor: bg || color, borderBottom: border ? '1px solid rgba(244,243,238,0.12)' : 'none' }}
      >
        <div className="w-8 h-8 rounded-full shadow-inner" style={{ backgroundColor: color, border: border ? '1px solid rgba(244,243,238,0.2)' : 'none' }} />
      </div>
      <div className="p-4 space-y-1 bg-[#0e0d0c]">
        <div className="font-sans font-semibold text-sm">{name}</div>
        <div className="font-mono text-xs text-[#a8a4a0]">{hex}</div>
        <div className="font-mono text-[10px] text-[#a8a4a0]/60">{oklch}</div>
      </div>
    </div>
  );
}

function ContrastCard({ fg, ratio, rating }: any) {
  return (
    <div className="bg-[#0e0d0c] rounded-[14px] border border-[#f4f3ee]/10 p-5 flex flex-col justify-between h-32">
      <div className="font-sans font-semibold" style={{ color: fg }}>Text Sample</div>
      <div className="flex justify-between items-baseline">
        <div className="font-mono text-sm text-[#a8a4a0]">{ratio}</div>
        <div className="font-mono text-[10px] bg-[#34d08c]/20 text-[#34d08c] px-2 py-0.5 rounded-full">{rating}</div>
      </div>
    </div>
  );
}

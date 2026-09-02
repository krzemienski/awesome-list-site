import React from 'react';

export function LogoSystem() {
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
          <p className="font-serif italic font-medium uppercase tracking-[3px] text-[#ffb4be] text-sm">Brand Identity · Logo System</p>
          <h1 className="font-sans font-extrabold text-5xl md:text-7xl tracking-[-0.03em] leading-[1.1]">The Inverted Monogram</h1>
        </header>

        <section className="space-y-12">
          <div className="bg-[#0e0d0c] rounded-[14px] border border-[#f4f3ee]/10 p-24 flex items-center justify-center gap-16 relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#f4f3ee 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
            
            <svg viewBox="0 0 76 76" className="w-[220px] h-[220px]">
              <rect x="2" y="2" width="72" height="72" rx="16" fill="#000" stroke="#ff3d52" strokeWidth="4"/>
              <text x="38" y="51" textAnchor="middle" fontFamily="Inter" fontWeight="800" fontSize="34" fill="#ff3d52" letterSpacing="-1">AV</text>
            </svg>

            <div className="flex items-baseline">
              <svg viewBox="0 0 76 76" className="w-[110px] h-[110px]">
                <rect x="2" y="2" width="72" height="72" rx="16" fill="#000" stroke="#ff3d52" strokeWidth="4"/>
                <text x="38" y="51" textAnchor="middle" fontFamily="Inter" fontWeight="800" fontSize="34" fill="#ff3d52" letterSpacing="-1">AV</text>
              </svg>
              <div className="ml-[38.5px] flex items-baseline">
                <span className="font-sans font-bold text-[#f4f3ee] text-[90px] tracking-[-0.02em] leading-none">awesome</span>
                <span className="font-serif italic font-semibold text-[#ff3d52] text-[90px] leading-none">.video</span>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <section className="space-y-8">
            <header>
              <h2 className="font-sans font-bold text-2xl tracking-[-0.01em]">Construction</h2>
              <div className="h-px w-full bg-[#f4f3ee]/10 mt-6" />
            </header>
            
            <div className="bg-[#0e0d0c] rounded-[14px] border border-[#f4f3ee]/10 p-12 flex justify-center relative">
              <div className="relative">
                <div className="absolute -inset-4 border border-[#5eddf2]/30 border-dashed" />
                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-[#5eddf2]/30" />
                <div className="absolute left-0 right-0 top-1/2 h-px bg-[#5eddf2]/30" />
                
                <svg viewBox="0 0 76 76" className="w-[160px] h-[160px] relative z-10">
                  <rect x="2" y="2" width="72" height="72" rx="16" fill="rgba(0,0,0,0.5)" stroke="#ff3d52" strokeWidth="4"/>
                  <text x="38" y="51" textAnchor="middle" fontFamily="Inter" fontWeight="800" fontSize="34" fill="#ff3d52" letterSpacing="-1">AV</text>
                </svg>
                
                <div className="absolute -left-12 top-1/2 -translate-y-1/2 font-mono text-xs text-[#5eddf2]">76</div>
                <div className="absolute left-1/2 -bottom-8 -translate-x-1/2 font-mono text-xs text-[#5eddf2]">76</div>
                <div className="absolute -right-24 top-4 font-mono text-xs text-[#5eddf2]">stroke: 4</div>
                <div className="absolute -right-24 top-12 font-mono text-xs text-[#5eddf2]">rx: 16</div>
              </div>
            </div>
          </section>

          <section className="space-y-8">
            <header>
              <h2 className="font-sans font-bold text-2xl tracking-[-0.01em]">Clearspace</h2>
              <div className="h-px w-full bg-[#f4f3ee]/10 mt-6" />
            </header>
            
            <div className="bg-[#0e0d0c] rounded-[14px] border border-[#f4f3ee]/10 p-12 flex justify-center items-center h-[282px]">
              <div className="relative p-12 border border-[#b84dff]/40 border-dashed">
                <svg viewBox="0 0 76 76" className="w-[100px] h-[100px]">
                  <rect x="2" y="2" width="72" height="72" rx="16" fill="#000" stroke="#ff3d52" strokeWidth="4"/>
                  <text x="38" y="51" textAnchor="middle" fontFamily="Inter" fontWeight="800" fontSize="34" fill="#ff3d52" letterSpacing="-1">AV</text>
                </svg>
                <div className="absolute top-4 left-1/2 -translate-x-1/2 font-mono text-xs text-[#b84dff]">0.5x</div>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-xs text-[#b84dff]">0.5x</div>
                <div className="absolute left-2 top-1/2 -translate-y-1/2 font-mono text-xs text-[#b84dff]">0.5x</div>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-xs text-[#b84dff]">0.5x</div>
              </div>
            </div>
          </section>
        </div>

        <section className="space-y-8">
          <header>
            <h2 className="font-sans font-bold text-2xl tracking-[-0.01em]">Minimum Sizes & Stroke Compensation</h2>
            <div className="h-px w-full bg-[#f4f3ee]/10 mt-6" />
          </header>

          <div className="grid grid-cols-4 gap-6">
            <div className="bg-[#0e0d0c] rounded-[14px] border border-[#f4f3ee]/10 p-8 flex flex-col items-center gap-6">
              <svg viewBox="0 0 76 76" className="w-[76px] h-[76px]">
                <rect x="2" y="2" width="72" height="72" rx="16" fill="#000" stroke="#ff3d52" strokeWidth="4"/>
                <text x="38" y="51" textAnchor="middle" fontFamily="Inter" fontWeight="800" fontSize="34" fill="#ff3d52" letterSpacing="-1">AV</text>
              </svg>
              <div className="text-center font-mono text-sm text-[#a8a4a0]">
                <div>76px</div>
                <div className="text-[#f4f3ee]/50 text-xs mt-1">stroke: 4</div>
              </div>
            </div>
            <div className="bg-[#0e0d0c] rounded-[14px] border border-[#f4f3ee]/10 p-8 flex flex-col items-center gap-6">
              <svg viewBox="0 0 76 76" className="w-[44px] h-[44px]">
                <rect x="2" y="2" width="72" height="72" rx="16" fill="#000" stroke="#ff3d52" strokeWidth="4"/>
                <text x="38" y="51" textAnchor="middle" fontFamily="Inter" fontWeight="800" fontSize="34" fill="#ff3d52" letterSpacing="-1">AV</text>
              </svg>
              <div className="text-center font-mono text-sm text-[#a8a4a0]">
                <div>44px</div>
                <div className="text-[#f4f3ee]/50 text-xs mt-1">stroke: 4</div>
              </div>
            </div>
            <div className="bg-[#0e0d0c] rounded-[14px] border border-[#f4f3ee]/10 p-8 flex flex-col items-center gap-6">
              <svg viewBox="0 0 76 76" className="w-[22px] h-[22px]">
                <rect x="2" y="2" width="72" height="72" rx="16" fill="#000" stroke="#ff3d52" strokeWidth="5"/>
                <text x="38" y="51" textAnchor="middle" fontFamily="Inter" fontWeight="800" fontSize="34" fill="#ff3d52" letterSpacing="-1">AV</text>
              </svg>
              <div className="text-center font-mono text-sm text-[#a8a4a0]">
                <div>22px</div>
                <div className="text-[#f4f3ee]/50 text-xs mt-1">stroke: 5</div>
              </div>
            </div>
            <div className="bg-[#0e0d0c] rounded-[14px] border border-[#f4f3ee]/10 p-8 flex flex-col items-center gap-6">
              <svg viewBox="0 0 76 76" className="w-[16px] h-[16px]">
                <rect x="2" y="2" width="72" height="72" rx="16" fill="#000" stroke="#ff3d52" strokeWidth="6"/>
                <text x="38" y="51" textAnchor="middle" fontFamily="Inter" fontWeight="800" fontSize="34" fill="#ff3d52" letterSpacing="-1">AV</text>
              </svg>
              <div className="text-center font-mono text-sm text-[#a8a4a0]">
                <div>16px</div>
                <div className="text-[#f4f3ee]/50 text-xs mt-1">stroke: 6</div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-8">
          <header>
            <h2 className="font-sans font-bold text-2xl tracking-[-0.01em]">Variants & Contexts</h2>
            <div className="h-px w-full bg-[#f4f3ee]/10 mt-6" />
          </header>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div className="bg-[#000] h-40 border border-[#f4f3ee]/10 rounded-[14px] flex items-center justify-center">
              <div className="flex items-baseline scale-[0.6]">
                <svg viewBox="0 0 76 76" className="w-[76px] h-[76px]">
                  <rect x="2" y="2" width="72" height="72" rx="16" fill="#000" stroke="#ff3d52" strokeWidth="4"/>
                  <text x="38" y="51" textAnchor="middle" fontFamily="Inter" fontWeight="800" fontSize="34" fill="#ff3d52" letterSpacing="-1">AV</text>
                </svg>
                <div className="ml-[26px] flex items-baseline">
                  <span className="font-sans font-bold text-[#f4f3ee] text-[62px] tracking-[-0.02em] leading-none">awesome</span>
                  <span className="font-serif italic font-semibold text-[#ff3d52] text-[62px] leading-none">.video</span>
                </div>
              </div>
            </div>
            
            <div className="bg-[#0e0d0c] h-40 border border-[#f4f3ee]/10 rounded-[14px] flex items-center justify-center">
              <div className="flex items-baseline scale-[0.6]">
                <svg viewBox="0 0 76 76" className="w-[76px] h-[76px]">
                  <rect x="2" y="2" width="72" height="72" rx="16" fill="#000" stroke="#ff3d52" strokeWidth="4"/>
                  <text x="38" y="51" textAnchor="middle" fontFamily="Inter" fontWeight="800" fontSize="34" fill="#ff3d52" letterSpacing="-1">AV</text>
                </svg>
                <div className="ml-[26px] flex items-baseline">
                  <span className="font-sans font-bold text-[#f4f3ee] text-[62px] tracking-[-0.02em] leading-none">awesome</span>
                  <span className="font-serif italic font-semibold text-[#ff3d52] text-[62px] leading-none">.video</span>
                </div>
              </div>
            </div>

            <div className="bg-[#f4f3ee] h-40 border border-[#f4f3ee]/10 rounded-[14px] flex items-center justify-center relative overflow-hidden">
              <div className="absolute top-2 left-3 font-mono text-[10px] text-[#a8a4a0]">Tile stays black</div>
              <div className="flex items-baseline scale-[0.6]">
                <svg viewBox="0 0 76 76" className="w-[76px] h-[76px]">
                  <rect x="2" y="2" width="72" height="72" rx="16" fill="#000" stroke="#ff3d52" strokeWidth="4"/>
                  <text x="38" y="51" textAnchor="middle" fontFamily="Inter" fontWeight="800" fontSize="34" fill="#ff3d52" letterSpacing="-1">AV</text>
                </svg>
                <div className="ml-[26px] flex items-baseline">
                  <span className="font-sans font-bold text-[#000] text-[62px] tracking-[-0.02em] leading-none">awesome</span>
                  <span className="font-serif italic font-semibold text-[#ff3d52] text-[62px] leading-none">.video</span>
                </div>
              </div>
            </div>

            <div className="bg-[#0e0d0c] h-40 border border-[#f4f3ee]/10 rounded-[14px] flex items-center justify-center relative">
              <div className="absolute top-2 left-3 font-mono text-[10px] text-[#a8a4a0]">Avatar crop</div>
              <div className="w-16 h-16 rounded-full overflow-hidden bg-[#000] flex items-center justify-center border border-[#ff3d52]/20">
                <svg viewBox="0 0 76 76" className="w-[64px] h-[64px] scale-[1.2]">
                  <rect x="2" y="2" width="72" height="72" rx="16" fill="#000" stroke="#ff3d52" strokeWidth="4"/>
                  <text x="38" y="51" textAnchor="middle" fontFamily="Inter" fontWeight="800" fontSize="34" fill="#ff3d52" letterSpacing="-1">AV</text>
                </svg>
              </div>
            </div>

            <div className="bg-[#1e1e1e] h-40 border border-[#f4f3ee]/10 rounded-[14px] flex items-start justify-start p-4 relative overflow-hidden">
               <div className="absolute top-2 left-3 font-mono text-[10px] text-[#a8a4a0]">Browser Tab</div>
               <div className="mt-6 flex items-center bg-[#2d2d2d] rounded-t-lg px-4 py-2 min-w-[200px] border-b-2 border-blue-500">
                 <svg viewBox="0 0 76 76" className="w-[16px] h-[16px] mr-2">
                    <rect x="2" y="2" width="72" height="72" rx="16" fill="#000" stroke="#ff3d52" strokeWidth="6"/>
                    <text x="38" y="51" textAnchor="middle" fontFamily="Inter" fontWeight="800" fontSize="34" fill="#ff3d52" letterSpacing="-1">AV</text>
                  </svg>
                  <span className="text-xs text-[#f4f3ee] font-sans">awesome.video</span>
               </div>
            </div>

          </div>
        </section>

        <section className="space-y-8">
          <header>
            <h2 className="font-sans font-bold text-2xl tracking-[-0.01em]">Do & Don't</h2>
            <div className="h-px w-full bg-[#f4f3ee]/10 mt-6" />
          </header>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <DoDont type="do" desc="DO keep crimson border">
              <svg viewBox="0 0 76 76" className="w-[76px] h-[76px]">
                <rect x="2" y="2" width="72" height="72" rx="16" fill="#000" stroke="#ff3d52" strokeWidth="4"/>
                <text x="38" y="51" textAnchor="middle" fontFamily="Inter" fontWeight="800" fontSize="34" fill="#ff3d52" letterSpacing="-1">AV</text>
              </svg>
            </DoDont>

            <DoDont type="dont" desc="DON'T recolor AV white">
              <svg viewBox="0 0 76 76" className="w-[76px] h-[76px]">
                <rect x="2" y="2" width="72" height="72" rx="16" fill="#000" stroke="#ff3d52" strokeWidth="4"/>
                <text x="38" y="51" textAnchor="middle" fontFamily="Inter" fontWeight="800" fontSize="34" fill="#fff" letterSpacing="-1">AV</text>
              </svg>
            </DoDont>

            <DoDont type="dont" desc="DON'T fill tile crimson (old style)">
              <svg viewBox="0 0 76 76" className="w-[76px] h-[76px]">
                <rect x="2" y="2" width="72" height="72" rx="16" fill="#ff3d52"/>
                <text x="38" y="51" textAnchor="middle" fontFamily="Inter" fontWeight="800" fontSize="34" fill="#fff" letterSpacing="-1">AV</text>
              </svg>
            </DoDont>

            <DoDont type="dont" desc="DON'T add shadows">
              <svg viewBox="0 0 76 76" className="w-[76px] h-[76px]" style={{ filter: 'drop-shadow(0 10px 15px rgba(255,61,82,0.3))' }}>
                <rect x="2" y="2" width="72" height="72" rx="16" fill="#000" stroke="#ff3d52" strokeWidth="4"/>
                <text x="38" y="51" textAnchor="middle" fontFamily="Inter" fontWeight="800" fontSize="34" fill="#ff3d52" letterSpacing="-1">AV</text>
              </svg>
            </DoDont>

            <DoDont type="dont" desc="DON'T rotate">
              <svg viewBox="0 0 76 76" className="w-[76px] h-[76px] rotate-12">
                <rect x="2" y="2" width="72" height="72" rx="16" fill="#000" stroke="#ff3d52" strokeWidth="4"/>
                <text x="38" y="51" textAnchor="middle" fontFamily="Inter" fontWeight="800" fontSize="34" fill="#ff3d52" letterSpacing="-1">AV</text>
              </svg>
            </DoDont>

            <DoDont type="dont" desc="DON'T use busy bg without scrim">
              <div className="relative w-full h-full flex items-center justify-center rounded-lg overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-[#34d08c] via-[#5eddf2] to-[#b84dff] opacity-80 mix-blend-color-burn" />
                <svg viewBox="0 0 76 76" className="w-[76px] h-[76px] relative z-10">
                  <rect x="2" y="2" width="72" height="72" rx="16" fill="#000" stroke="#ff3d52" strokeWidth="4"/>
                  <text x="38" y="51" textAnchor="middle" fontFamily="Inter" fontWeight="800" fontSize="34" fill="#ff3d52" letterSpacing="-1">AV</text>
                </svg>
              </div>
            </DoDont>
          </div>
        </section>

      </div>
    </div>
  );
}

function DoDont({ type, desc, children }: any) {
  const isDo = type === 'do';
  const color = isDo ? '#34d08c' : '#ff5c7a';
  return (
    <div className="bg-[#0e0d0c] rounded-[14px] border border-[#f4f3ee]/10 overflow-hidden flex flex-col h-[200px]">
      <div className="flex-1 flex items-center justify-center relative border-b border-[#f4f3ee]/10">
        <div className="absolute top-2 left-3 font-mono text-[10px]" style={{ color }}>{isDo ? 'DO' : "DON'T"}</div>
        {children}
      </div>
      <div className="p-3 bg-[#000] min-h-[48px] flex items-center">
        <p className="font-sans text-xs text-[#a8a4a0]">{desc}</p>
      </div>
    </div>
  );
}

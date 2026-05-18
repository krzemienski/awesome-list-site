/* =====================================================================
   FLOW DIAGRAM COMPONENTS
   Each system documents its chart/flow primitives:
   - Node (block)
   - Decision (diamond)
   - Arrow / connector
   - Edge label
   - Swim lane / group
   - Pipeline (linear flow)
   - State diagram (with branching)
   Rendered in the system's own visual language.
   ===================================================================== */

/* ─── Per-system primitive renderers ─── */

const SYSTEM_FLOW_STYLES = {
  editorial: {
    name: 'Editorial',
    nodeBg: 'rgba(244,243,238,0.04)',
    nodeBorder: 'rgba(244,243,238,0.18)',
    nodeRadius: 12,
    nodeBorderW: 1,
    nodeShadow: '0 6px 24px -8px rgba(0,0,0,0.5)',
    nodeFont: "'Inter', sans-serif",
    nodeWeight: 600,
    nodeCase: 'none',
    nodeLetterSpacing: '0',
    titleFont: "'Fraunces', serif",
    titleStyle: 'italic',
    arrowStyle: 'curve',
    arrowColor: 'rgba(244,243,238,0.4)',
    arrowDash: 'none',
    arrowHead: 'classic',
    edgeLabelBg: '#08080a',
    edgeLabelFont: "'JetBrains Mono', mono",
    edgeLabelCase: 'lowercase',
    decisionShape: 'diamond',
    laneStyle: 'soft',
    bg: '#08080a',
    text: '#f4f3ee',
    textMuted: 'rgba(244,243,238,0.6)',
    accentToken: '--accent',
  },
  terminal: {
    name: 'Terminal',
    nodeBg: 'transparent',
    nodeBorder: 'rgba(232,232,224,0.4)',
    nodeRadius: 0,
    nodeBorderW: 1,
    nodeShadow: 'none',
    nodeFont: "'IBM Plex Mono', monospace",
    nodeWeight: 500,
    nodeCase: 'uppercase',
    nodeLetterSpacing: '0.06em',
    titleFont: "'IBM Plex Mono', monospace",
    titleStyle: 'normal',
    arrowStyle: 'ascii',
    arrowColor: '__accent__',
    arrowDash: 'none',
    arrowHead: 'ascii',
    edgeLabelBg: '#000',
    edgeLabelFont: "'IBM Plex Mono', mono",
    edgeLabelCase: 'uppercase',
    decisionShape: 'bracketed',
    laneStyle: 'ascii',
    bg: '#000',
    text: '#e8e8e0',
    textMuted: 'rgba(232,232,224,0.6)',
    accentToken: '--accent',
  },
  geist: {
    name: 'Geist',
    nodeBg: 'rgba(255,255,255,0.04)',
    nodeBorder: 'rgba(255,255,255,0.14)',
    nodeRadius: 10,
    nodeBorderW: 1,
    nodeShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 8px 24px rgba(0,0,0,0.4)',
    nodeFont: "'Geist', 'Inter', sans-serif",
    nodeWeight: 500,
    nodeCase: 'none',
    nodeLetterSpacing: '-0.01em',
    titleFont: "'Geist', sans-serif",
    titleStyle: 'normal',
    arrowStyle: 'straight',
    arrowColor: 'rgba(255,255,255,0.5)',
    arrowDash: 'none',
    arrowHead: 'thin',
    edgeLabelBg: '#000',
    edgeLabelFont: "'JetBrains Mono', mono",
    edgeLabelCase: 'none',
    decisionShape: 'rounded',
    laneStyle: 'soft',
    bg: '#000',
    text: '#fafafa',
    textMuted: 'rgba(250,250,250,0.62)',
    accentToken: '--accent',
  },
  brutalist: {
    name: 'Brutalist',
    nodeBg: '#000',
    nodeBorder: '#f5f5f0',
    nodeRadius: 0,
    nodeBorderW: 2,
    nodeShadow: '4px 4px 0 0 #f5f5f0',
    nodeFont: "'Space Grotesk', sans-serif",
    nodeWeight: 600,
    nodeCase: 'uppercase',
    nodeLetterSpacing: '0.04em',
    titleFont: "'Instrument Serif', serif",
    titleStyle: 'normal',
    arrowStyle: 'thick',
    arrowColor: '#f5f5f0',
    arrowDash: 'none',
    arrowHead: 'block',
    edgeLabelBg: '__accent__',
    edgeLabelFont: "'JetBrains Mono', mono",
    edgeLabelCase: 'uppercase',
    decisionShape: 'square',
    laneStyle: 'hard',
    bg: '#000',
    text: '#f5f5f0',
    textMuted: 'rgba(245,245,240,0.7)',
    accentToken: '--accent',
  },
  swiss: {
    name: 'Swiss',
    nodeBg: 'rgba(250,250,248,0.018)',
    nodeBorder: 'rgba(250,250,248,0.32)',
    nodeRadius: 4,
    nodeBorderW: 0.5,
    nodeShadow: 'none',
    nodeFont: "'Manrope', sans-serif",
    nodeWeight: 600,
    nodeCase: 'none',
    nodeLetterSpacing: '-0.01em',
    titleFont: "'Manrope', sans-serif",
    titleStyle: 'normal',
    arrowStyle: 'hairline',
    arrowColor: 'rgba(250,250,248,0.5)',
    arrowDash: 'none',
    arrowHead: 'thin',
    edgeLabelBg: '#000',
    edgeLabelFont: "'IBM Plex Mono', mono",
    edgeLabelCase: 'none',
    decisionShape: 'minimal',
    laneStyle: 'hairline',
    bg: '#000',
    text: '#fafaf8',
    textMuted: 'rgba(250,250,248,0.62)',
    accentToken: '--accent',
  },
};

/* ─── Node ─── */
function FlowNode({ sysId, label, sublabel, x, y, w = 140, h = 56, accent, variant = 'default' }) {
  const s = SYSTEM_FLOW_STYLES[sysId];
  const isAccent = variant === 'accent';
  const border = isAccent ? accent : s.nodeBorder;
  const bg = sysId === 'brutalist' && isAccent ? accent
    : sysId === 'terminal' && isAccent ? `${accent}1f`
    : s.nodeBg;
  const txtColor = sysId === 'brutalist' && isAccent ? '#000'
    : sysId === 'terminal' && isAccent ? accent
    : s.text;
  return (
    <div style={{
      position: 'absolute', left: x, top: y, width: w, height: h,
      background: bg,
      border: `${s.nodeBorderW}px solid ${border}`,
      borderRadius: s.nodeRadius,
      boxShadow: isAccent && sysId === 'brutalist' ? `4px 4px 0 0 ${accent}` : s.nodeShadow,
      padding: '8px 12px',
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      fontFamily: s.nodeFont,
      fontWeight: s.nodeWeight,
      fontSize: 12,
      letterSpacing: s.nodeLetterSpacing,
      textTransform: s.nodeCase,
      color: txtColor,
    }}>
      {sysId === 'terminal' && <span style={{ color: accent, marginRight: 4 }}>[</span>}
      <span>
        {sysId === 'terminal' && <span style={{ color: accent, marginRight: 4 }}>{'>'}</span>}
        {label}
        {sysId === 'terminal' && <span style={{ color: accent, marginLeft: 4 }}>]</span>}
      </span>
      {sublabel && (
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, fontWeight: 400, marginTop: 3,
          color: sysId === 'brutalist' && isAccent ? 'rgba(0,0,0,0.7)' : s.textMuted,
          letterSpacing: '0.08em',
          textTransform: sysId === 'brutalist' || sysId === 'terminal' ? 'uppercase' : 'none',
        }}>
          {sublabel}
        </span>
      )}
    </div>
  );
}

/* ─── Decision (diamond/branched) ─── */
function FlowDecision({ sysId, label, x, y, w = 110, h = 110, accent }) {
  const s = SYSTEM_FLOW_STYLES[sysId];
  const cx = x + w/2, cy = y + h/2;
  const stroke = s.nodeBorder;

  if (s.decisionShape === 'bracketed') {
    /* terminal: angle brackets */
    return (
      <div style={{
        position: 'absolute', left: x, top: y, width: w, height: h,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: s.nodeFont, fontSize: 12, fontWeight: 500,
        textTransform: 'uppercase', letterSpacing: '0.08em',
        color: s.text,
      }}>
        <span style={{ color: accent, fontSize: 22, fontWeight: 400, marginRight: 6 }}>{'<'}</span>
        <span>{label}</span>
        <span style={{ color: accent, fontSize: 22, fontWeight: 400, marginLeft: 6 }}>{'?>'}</span>
      </div>
    );
  }

  if (s.decisionShape === 'square') {
    /* brutalist: rotated square = diamond, hard offset */
    return (
      <div style={{ position: 'absolute', left: x, top: y, width: w, height: h }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: '#000',
          border: '2px solid #f5f5f0',
          boxShadow: '4px 4px 0 0 #f5f5f0',
          transform: 'rotate(45deg)',
          transformOrigin: 'center',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: s.nodeFont, fontSize: 11, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.04em',
          color: s.text, textAlign: 'center', padding: 12,
        }}>{label}</div>
      </div>
    );
  }

  if (s.decisionShape === 'minimal') {
    /* swiss: hairline diamond, very thin */
    return (
      <div style={{ position: 'absolute', left: x, top: y, width: w, height: h }}>
        <svg width={w} height={h} style={{ position: 'absolute', inset: 0 }}>
          <polygon points={`${w/2},2 ${w-2},${h/2} ${w/2},${h-2} 2,${h/2}`}
            fill="rgba(250,250,248,0.018)" stroke={stroke} strokeWidth="0.5" />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: s.nodeFont, fontSize: 11, fontWeight: 600,
          color: s.text, textAlign: 'center', padding: 16,
          letterSpacing: '-0.01em',
        }}>{label}</div>
      </div>
    );
  }

  if (s.decisionShape === 'rounded') {
    /* geist: rounded diamond */
    return (
      <div style={{ position: 'absolute', left: x, top: y, width: w, height: h }}>
        <svg width={w} height={h} style={{ position: 'absolute', inset: 0 }}>
          <polygon points={`${w/2},6 ${w-6},${h/2} ${w/2},${h-6} 6,${h/2}`}
            fill="rgba(255,255,255,0.04)" stroke={stroke} strokeWidth="1" strokeLinejoin="round" />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: s.nodeFont, fontSize: 11, fontWeight: 500,
          color: s.text, textAlign: 'center', padding: 14,
          letterSpacing: '-0.01em',
        }}>{label}</div>
      </div>
    );
  }

  /* editorial: classic diamond */
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h }}>
      <svg width={w} height={h} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <polygon points={`${w/2},4 ${w-4},${h/2} ${w/2},${h-4} 4,${h/2}`}
          fill="rgba(244,243,238,0.04)" stroke={stroke} strokeWidth="1" />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: s.nodeFont, fontSize: 11, fontWeight: 600,
        color: s.text, textAlign: 'center', padding: 14,
      }}>{label}</div>
    </div>
  );
}

/* ─── Arrow connector (SVG) ─── */
function FlowArrow({ sysId, from, to, label, accent, curve = 0, dashed = false }) {
  const s = SYSTEM_FLOW_STYLES[sysId];
  const stroke = s.arrowColor === '__accent__' ? accent : s.arrowColor;
  const strokeW = sysId === 'brutalist' ? 2 : sysId === 'swiss' ? 0.5 : 1;
  const id = `arrow-${sysId}-${from.x}-${from.y}-${to.x}-${to.y}`.replace(/\./g,'_');

  /* curved or straight path */
  const dx = to.x - from.x, dy = to.y - from.y;
  let path;
  if (curve !== 0) {
    const mx = (from.x + to.x)/2, my = (from.y + to.y)/2;
    const nx = -dy, ny = dx;
    const len = Math.hypot(nx, ny) || 1;
    const cx = mx + (nx/len) * curve;
    const cy = my + (ny/len) * curve;
    path = `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;
  } else {
    path = `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  }

  /* arrowhead variants */
  let markerEl = null;
  if (s.arrowHead === 'classic') {
    markerEl = (
      <marker id={id} markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
        <path d="M 0 0 L 10 5 L 0 10 Z" fill={stroke} />
      </marker>
    );
  } else if (s.arrowHead === 'thin') {
    markerEl = (
      <marker id={id} markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
        <path d="M 1 1 L 9 5 L 1 9" fill="none" stroke={stroke} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      </marker>
    );
  } else if (s.arrowHead === 'block') {
    markerEl = (
      <marker id={id} markerWidth="14" markerHeight="14" refX="13" refY="7" orient="auto">
        <polygon points="0,0 14,7 0,14" fill={stroke} />
      </marker>
    );
  } else if (s.arrowHead === 'ascii') {
    markerEl = null; /* drawn as text below */
  }

  /* label position */
  const lx = (from.x + to.x) / 2;
  const ly = (from.y + to.y) / 2;

  /* ASCII arrow head as character */
  const asciiHead = s.arrowHead === 'ascii';

  return (
    <>
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
        <defs>{markerEl}</defs>
        <path d={path}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeW}
          strokeDasharray={dashed ? '4 4' : 'none'}
          markerEnd={markerEl ? `url(#${id})` : undefined}
        />
      </svg>
      {asciiHead && (
        <div style={{
          position: 'absolute',
          left: to.x - 8, top: to.y - 9,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 14, color: stroke, fontWeight: 600,
          pointerEvents: 'none', lineHeight: 1,
        }}>▶</div>
      )}
      {label && (
        <div style={{
          position: 'absolute',
          left: lx, top: ly,
          transform: 'translate(-50%, -50%)',
          background: s.edgeLabelBg === '__accent__' ? accent : s.edgeLabelBg,
          color: s.edgeLabelBg === '__accent__' ? '#000' : s.textMuted,
          padding: '2px 7px',
          fontFamily: s.edgeLabelFont,
          fontSize: 9.5,
          fontWeight: s.edgeLabelBg === '__accent__' ? 700 : 500,
          letterSpacing: '0.06em',
          textTransform: s.edgeLabelCase,
          border: sysId === 'brutalist' ? '1.5px solid #f5f5f0' : sysId === 'swiss' ? '0.5px solid rgba(250,250,248,0.18)' : 'none',
          borderRadius: sysId === 'brutalist' || sysId === 'terminal' ? 0 : 4,
          whiteSpace: 'nowrap',
        }}>
          {label}
        </div>
      )}
    </>
  );
}

/* ─── Swim lane / group container ─── */
function FlowLane({ sysId, label, x, y, w, h }) {
  const s = SYSTEM_FLOW_STYLES[sysId];
  if (sysId === 'terminal') {
    return (
      <div style={{
        position: 'absolute', left: x, top: y, width: w, height: h,
        pointerEvents: 'none',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 9, color: 'rgba(232,232,224,0.45)',
        letterSpacing: '0.14em',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, borderTop: '1px dashed rgba(232,232,224,0.18)', textAlign: 'center' }}>
          <span style={{ background: '#000', padding: '0 8px', position: 'relative', top: -7 }}>── {label} ──</span>
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, borderBottom: '1px dashed rgba(232,232,224,0.18)' }} />
      </div>
    );
  }
  if (sysId === 'brutalist') {
    return (
      <div style={{
        position: 'absolute', left: x, top: y, width: w, height: h,
        border: '2px solid #f5f5f0', pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute', top: -12, left: 12,
          background: '#000', padding: '0 8px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, fontWeight: 700, letterSpacing: '0.18em',
          textTransform: 'uppercase', color: '#f5f5f0',
        }}>{label}</div>
      </div>
    );
  }
  if (sysId === 'swiss') {
    return (
      <div style={{
        position: 'absolute', left: x, top: y, width: w, height: h,
        borderTop: '0.5px solid rgba(250,250,248,0.18)',
        borderBottom: '0.5px solid rgba(250,250,248,0.18)',
        pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute', top: 6, left: 8,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 9, letterSpacing: '0.14em',
          color: 'rgba(250,250,248,0.5)',
        }}>{label}</div>
      </div>
    );
  }
  /* editorial / geist: soft */
  return (
    <div style={{
      position: 'absolute', left: x, top: y, width: w, height: h,
      border: `1px ${sysId === 'editorial' ? 'solid' : 'dashed'} rgba(255,255,255,0.1)`,
      borderRadius: s.nodeRadius,
      background: sysId === 'editorial' ? 'rgba(244,243,238,0.012)' : 'transparent',
      pointerEvents: 'none',
    }}>
      <div style={{
        position: 'absolute', top: -9, left: 14,
        background: s.bg, padding: '0 8px',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9.5, letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: s.textMuted,
      }}>{label}</div>
    </div>
  );
}

/* ─── DIAGRAM CANVAS ─── */
function FlowCanvas({ sysId, accent, children, height = 360 }) {
  const s = SYSTEM_FLOW_STYLES[sysId];
  return (
    <div style={{
      position: 'relative',
      background: s.bg,
      border: sysId === 'brutalist' ? '2px solid #f5f5f0' : '1px solid var(--border)',
      borderRadius: s.nodeRadius === 0 ? 0 : 'var(--radius)',
      height,
      overflow: 'hidden',
    }}>
      {/* atmosphere per system */}
      {sysId === 'terminal' && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'repeating-linear-gradient(0deg, transparent 0, transparent 2px, rgba(255,255,255,0.025) 2px, rgba(255,255,255,0.025) 3px)',
        }} />
      )}
      {sysId === 'swiss' && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage:
            `linear-gradient(0deg, transparent calc(100% - 1px), rgba(250,250,248,0.04) calc(100% - 1px)),` +
            `linear-gradient(90deg, transparent calc(100% - 1px), rgba(250,250,248,0.04) calc(100% - 1px))`,
          backgroundSize: '32px 32px',
        }} />
      )}
      {sysId === 'editorial' && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(ellipse 500px 300px at 90% 10%, ${accent}14, transparent 60%)`,
        }} />
      )}
      <div style={{ position: 'absolute', inset: 0 }}>{children}</div>
    </div>
  );
}

/* ─── A consistent flow content for all systems ─── */
/* Pipeline: Source → Transcode → [Decision: HLS?] → Package(HLS) / Package(DASH) → CDN
   So we exercise: 5 nodes, 1 decision, 5 arrows w/ labels, swim lane label. */
function StandardFlow({ sysId, accent }) {
  /* Layout coordinates within a 720x340 canvas */
  const W = 700, H = 340;
  const nodes = {
    src:    { x: 20,  y: 50,  w: 130, h: 56, label: 'Source',      sub: 'mp4 / mov' },
    enc:    { x: 200, y: 50,  w: 130, h: 56, label: 'Transcode',   sub: 'ffmpeg' },
    dec:    { x: 380, y: 38,  w: 110, h: 80 },
    hls:    { x: 540, y: 14,  w: 140, h: 50, label: 'Package HLS', sub: 'fMP4' },
    dash:   { x: 540, y: 90,  w: 140, h: 50, label: 'Package DASH',sub: 'CMAF' },
    cdn:    { x: 280, y: 240, w: 160, h: 60, label: 'CDN Edge',    sub: 'global' },
  };

  /* edge points (anchors) */
  const E = {
    srcOut: { x: nodes.src.x + nodes.src.w, y: nodes.src.y + nodes.src.h/2 },
    encIn:  { x: nodes.enc.x, y: nodes.enc.y + nodes.enc.h/2 },
    encOut: { x: nodes.enc.x + nodes.enc.w, y: nodes.enc.y + nodes.enc.h/2 },
    decIn:  { x: nodes.dec.x, y: nodes.dec.y + nodes.dec.h/2 },
    decT:   { x: nodes.dec.x + nodes.dec.w, y: nodes.dec.y + 24 },
    decB:   { x: nodes.dec.x + nodes.dec.w, y: nodes.dec.y + nodes.dec.h - 24 },
    hlsIn:  { x: nodes.hls.x, y: nodes.hls.y + nodes.hls.h/2 },
    dashIn: { x: nodes.dash.x, y: nodes.dash.y + nodes.dash.h/2 },
    hlsOut: { x: nodes.hls.x + nodes.hls.w/2, y: nodes.hls.y + nodes.hls.h },
    dashOut:{ x: nodes.dash.x + nodes.dash.w/2, y: nodes.dash.y + nodes.dash.h },
    cdnInT: { x: nodes.cdn.x + nodes.cdn.w*0.7, y: nodes.cdn.y },
    cdnInB: { x: nodes.cdn.x + nodes.cdn.w*0.3, y: nodes.cdn.y },
  };

  return (
    <FlowCanvas sysId={sysId} accent={accent} height={H}>
      <FlowLane sysId={sysId} label="DELIVERY PIPELINE · v1" x={8} y={6} w={W - 16} h={H - 12} />

      <FlowNode sysId={sysId} {...nodes.src} accent={accent} />
      <FlowNode sysId={sysId} {...nodes.enc} accent={accent} variant="accent" />
      <FlowDecision sysId={sysId} label="Format?" {...nodes.dec} accent={accent} />
      <FlowNode sysId={sysId} {...nodes.hls} accent={accent} />
      <FlowNode sysId={sysId} {...nodes.dash} accent={accent} />
      <FlowNode sysId={sysId} {...nodes.cdn} accent={accent} variant="accent" />

      <FlowArrow sysId={sysId} from={E.srcOut} to={E.encIn}  accent={accent} label="ingest" />
      <FlowArrow sysId={sysId} from={E.encOut} to={E.decIn}  accent={accent} label="h.264" />
      <FlowArrow sysId={sysId} from={E.decT}   to={E.hlsIn}  accent={accent} label="apple" curve={-12} />
      <FlowArrow sysId={sysId} from={E.decB}   to={E.dashIn} accent={accent} label="other"  curve={12} />
      <FlowArrow sysId={sysId} from={E.hlsOut} to={E.cdnInT} accent={accent} curve={20} dashed={false} />
      <FlowArrow sysId={sysId} from={E.dashOut} to={E.cdnInB} accent={accent} curve={-20} />
    </FlowCanvas>
  );
}

/* ─── PRIMITIVE PALETTE (small showcase row of single primitives) ─── */
function PrimitivePalette({ sysId, accent }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 12,
      marginTop: 16,
    }}>
      {/* Node */}
      <div>
        <div style={{ position: 'relative', height: 70 }}>
          <FlowCanvas sysId={sysId} accent={accent} height={70}>
            <FlowNode sysId={sysId} label="Node" sublabel="block" x={20} y={9} w={120} h={48} accent={accent} />
          </FlowCanvas>
        </div>
        <div className="mono" style={{ fontSize: 9.5, letterSpacing: '0.14em', color: 'var(--text-3)', marginTop: 6 }}>NODE</div>
      </div>
      {/* Decision */}
      <div>
        <div style={{ position: 'relative', height: 70 }}>
          <FlowCanvas sysId={sysId} accent={accent} height={70}>
            <FlowDecision sysId={sysId} label="Branch?" x={30} y={-5} w={90} h={80} accent={accent} />
          </FlowCanvas>
        </div>
        <div className="mono" style={{ fontSize: 9.5, letterSpacing: '0.14em', color: 'var(--text-3)', marginTop: 6 }}>DECISION</div>
      </div>
      {/* Arrow */}
      <div>
        <div style={{ position: 'relative', height: 70 }}>
          <FlowCanvas sysId={sysId} accent={accent} height={70}>
            <FlowArrow sysId={sysId} from={{ x: 18, y: 35 }} to={{ x: 130, y: 35 }} accent={accent} label="emit" />
          </FlowCanvas>
        </div>
        <div className="mono" style={{ fontSize: 9.5, letterSpacing: '0.14em', color: 'var(--text-3)', marginTop: 6 }}>ARROW + LABEL</div>
      </div>
      {/* Accent node */}
      <div>
        <div style={{ position: 'relative', height: 70 }}>
          <FlowCanvas sysId={sysId} accent={accent} height={70}>
            <FlowNode sysId={sysId} label="Critical" sublabel="hot path" x={20} y={9} w={120} h={48} accent={accent} variant="accent" />
          </FlowCanvas>
        </div>
        <div className="mono" style={{ fontSize: 9.5, letterSpacing: '0.14em', color: 'var(--text-3)', marginTop: 6 }}>ACCENT NODE</div>
      </div>
    </div>
  );
}

/* ─── The Section ─── */
function FlowDiagramsSection({ accent }) {
  const accentHex = (window.ACCENTS.find(x => x.id === accent) || window.ACCENTS[0]).primary;
  const order = ['editorial', 'terminal', 'geist', 'brutalist', 'swiss'];

  return (
    <section className="ds-section">
      <SectionHead
        eyebrow="── 02b / FLOW DIAGRAMS"
        title={<>Charts &amp; flows, <em style={{ fontStyle: 'italic', color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>per system</em></>}
        sub="The same delivery pipeline rendered five ways. Each system supplies its own grammar of nodes, decisions, arrows, edge labels, and lane containers — so any chart you build inherits the personality automatically."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 64 }}>
        {order.map((sysId, i) => {
          const s = SYSTEM_FLOW_STYLES[sysId];
          return (
            <div key={sysId}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 240px',
                gap: 32, alignItems: 'flex-start',
                marginBottom: 16,
              }}>
                <div>
                  <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-3)', marginBottom: 8 }}>
                    0{i + 1} / {sysId.toUpperCase()} · FLOW GRAMMAR
                  </div>
                  <h3 className="ds-h" style={{ fontSize: 22, lineHeight: 1.2 }}>
                    {sysId === 'editorial'  && <>Soft cards, classic <em style={{ fontStyle: 'italic', fontFamily: 'var(--font-display)' }}>diamonds</em>, curved edges.</>}
                    {sysId === 'terminal'   && <>ASCII boxes, <code>&lt; ?&gt;</code> branches, <code>▶</code> heads.</>}
                    {sysId === 'geist'      && <>Soft 10px corners, thin straight arrows, quiet labels.</>}
                    {sysId === 'brutalist'  && <>Hard-shadow blocks, rotated diamonds, thick block heads.</>}
                    {sysId === 'swiss'      && <>0.5px hairlines on a 32px grid. No shadow. No noise.</>}
                  </h3>
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10.5,
                  color: 'var(--text-3)', lineHeight: 1.7,
                  borderLeft: '1px solid var(--border)', paddingLeft: 14,
                }}>
                  <div>node.radius&nbsp;&nbsp;<span style={{ color: 'var(--text-2)' }}>{s.nodeRadius}px</span></div>
                  <div>node.border&nbsp;<span style={{ color: 'var(--text-2)' }}>{s.nodeBorderW}px</span></div>
                  <div>arrow&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: 'var(--text-2)' }}>{s.arrowStyle}</span></div>
                  <div>head&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: 'var(--text-2)' }}>{s.arrowHead}</span></div>
                  <div>diamond&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: 'var(--text-2)' }}>{s.decisionShape}</span></div>
                  <div>lane&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: 'var(--text-2)' }}>{s.laneStyle}</span></div>
                </div>
              </div>

              <StandardFlow sysId={sysId} accent={accentHex} />
              <PrimitivePalette sysId={sysId} accent={accentHex} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

window.FlowDiagramsSection = FlowDiagramsSection;

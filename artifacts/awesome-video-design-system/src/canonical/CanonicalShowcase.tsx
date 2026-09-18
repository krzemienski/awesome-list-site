// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from "react";
import { ACCENTS, DESIGN_SYSTEMS as RUNTIME_SYSTEMS } from "../../../../client/src/lib/design-system";
import { Button, Card, Chip, Dot, Eyebrow, Kbd } from "./ShowcasePrimitives";
import { useShowcaseTheme } from "./useShowcaseTheme";
import { SkipLink } from "./SkipLink";
import tokenProjection from "../../tokens.json";
const DESIGN_SYSTEMS = Object.fromEntries(Object.entries(RUNTIME_SYSTEMS).map(([id, meta]) => [id, { ...meta, vars: tokenProjection.themes[id].tokens }]));
const TYPE_SCALE = [
  { name: 'display-xl', px: 72, label: 'Display XL', use: 'Hero, single-line' }, { name: 'display', px: 56, label: 'Display', use: 'Page hero' }, { name: 'h1', px: 40, label: 'H1', use: 'Section anchor' }, { name: 'h2', px: 28, label: 'H2', use: 'Subsection' }, { name: 'h3', px: 20, label: 'H3', use: 'Card heading' }, { name: 'h4', px: 16, label: 'H4', use: 'List item title' }, { name: 'body', px: 14, label: 'Body', use: 'Prose, default' }, { name: 'small', px: 13, label: 'Small', use: 'Meta, secondary' }, { name: 'caption', px: 11, label: 'Caption', use: 'Mono, eyebrow, kbd' }, ];
const SPACE_SCALE = [{name:'0',px:0},{name:'1',px:4},{name:'2',px:8},{name:'3',px:12},{name:'4',px:16},{name:'5',px:20},{name:'6',px:24},{name:'8',px:32},{name:'10',px:40},{name:'12',px:48},{name:'16',px:64},{name:'20',px:80}];
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
    // DS-OK: canonical per-system flow-diagram skin, ported verbatim from awesome-list-site-ds/design-system-anatomy.jsx; the anatomy view is pixel-gated against that source
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
    // DS-OK: canonical per-system flow-diagram skin, ported verbatim from awesome-list-site-ds/design-system-anatomy.jsx; the anatomy view is pixel-gated against that source
    arrowColor: 'rgba(244,243,238,0.4)',
    arrowDash: 'none',
    arrowHead: 'classic',
    edgeLabelBg: '#08080a',
    edgeLabelFont: "'JetBrains Mono', mono",
    edgeLabelCase: 'lowercase',
    decisionShape: 'diamond',
    laneStyle: 'soft',
    // DS-OK: canonical per-system flow-diagram skin, ported verbatim from awesome-list-site-ds/design-system-anatomy.jsx; the anatomy view is pixel-gated against that source
    bg: '#08080a',
    text: '#f4f3ee',
    textMuted: 'rgba(244,243,238,0.6)',
    accentToken: '--accent',
  },
  terminal: {
    name: 'Terminal',
    nodeBg: 'transparent',
    // DS-OK: canonical per-system flow-diagram skin, ported verbatim from awesome-list-site-ds/design-system-anatomy.jsx; the anatomy view is pixel-gated against that source
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
    // DS-OK: canonical per-system flow-diagram skin, ported verbatim from awesome-list-site-ds/design-system-anatomy.jsx; the anatomy view is pixel-gated against that source
    text: '#e8e8e0',
    textMuted: 'rgba(232,232,224,0.6)',
    accentToken: '--accent',
  },
  geist: {
    name: 'Geist',
    // DS-OK: canonical per-system flow-diagram skin, ported verbatim from awesome-list-site-ds/design-system-anatomy.jsx; the anatomy view is pixel-gated against that source
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
    // DS-OK: canonical per-system flow-diagram skin, ported verbatim from awesome-list-site-ds/design-system-anatomy.jsx; the anatomy view is pixel-gated against that source
    arrowColor: 'rgba(255,255,255,0.5)',
    arrowDash: 'none',
    arrowHead: 'thin',
    edgeLabelBg: '#000',
    edgeLabelFont: "'JetBrains Mono', mono",
    edgeLabelCase: 'none',
    decisionShape: 'rounded',
    laneStyle: 'soft',
    bg: '#000',
    // DS-OK: canonical per-system flow-diagram skin, ported verbatim from awesome-list-site-ds/design-system-anatomy.jsx; the anatomy view is pixel-gated against that source
    text: '#fafafa',
    textMuted: 'rgba(250,250,250,0.62)',
    accentToken: '--accent',
  },
  brutalist: {
    name: 'Brutalist',
    nodeBg: '#000',
    // DS-OK: canonical per-system flow-diagram skin, ported verbatim from awesome-list-site-ds/design-system-anatomy.jsx; the anatomy view is pixel-gated against that source
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
    // DS-OK: canonical per-system flow-diagram skin, ported verbatim from awesome-list-site-ds/design-system-anatomy.jsx; the anatomy view is pixel-gated against that source
    arrowColor: '#f5f5f0',
    arrowDash: 'none',
    arrowHead: 'block',
    edgeLabelBg: '__accent__',
    edgeLabelFont: "'JetBrains Mono', mono",
    edgeLabelCase: 'uppercase',
    decisionShape: 'square',
    laneStyle: 'hard',
    bg: '#000',
    // DS-OK: canonical per-system flow-diagram skin, ported verbatim from awesome-list-site-ds/design-system-anatomy.jsx; the anatomy view is pixel-gated against that source
    text: '#f5f5f0',
    textMuted: 'rgba(245,245,240,0.7)',
    accentToken: '--accent',
  },
  swiss: {
    name: 'Swiss',
    // DS-OK: canonical per-system flow-diagram skin, ported verbatim from awesome-list-site-ds/design-system-anatomy.jsx; the anatomy view is pixel-gated against that source
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
    // DS-OK: canonical per-system flow-diagram skin, ported verbatim from awesome-list-site-ds/design-system-anatomy.jsx; the anatomy view is pixel-gated against that source
    arrowColor: 'rgba(250,250,248,0.5)',
    arrowDash: 'none',
    arrowHead: 'thin',
    edgeLabelBg: '#000',
    edgeLabelFont: "'IBM Plex Mono', mono",
    edgeLabelCase: 'none',
    decisionShape: 'minimal',
    laneStyle: 'hairline',
    bg: '#000',
    // DS-OK: canonical per-system flow-diagram skin, ported verbatim from awesome-list-site-ds/design-system-anatomy.jsx; the anatomy view is pixel-gated against that source
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
          // DS-OK: canonical per-system anatomy renderer value from awesome-list-site-ds/design-system-anatomy.jsx; pixel-gated against that source
           color: sysId === 'brutalist' && isAccent ? txtColor : s.textMuted,
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
          // DS-OK: canonical per-system anatomy renderer value from awesome-list-site-ds/design-system-anatomy.jsx; pixel-gated against that source
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
        <svg aria-hidden="true" focusable="false" width={w} height={h} style={{ position: 'absolute', inset: 0 }}>
          <polygon points={`${w/2},2 ${w-2},${h/2} ${w/2},${h-2} 2,${h/2}`}
            /* DS-OK: canonical per-system anatomy renderer value from awesome-list-site-ds/design-system-anatomy.jsx; pixel-gated against that source */
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
        <svg aria-hidden="true" focusable="false" width={w} height={h} style={{ position: 'absolute', inset: 0 }}>
          <polygon points={`${w/2},6 ${w-6},${h/2} ${w/2},${h-6} 6,${h/2}`}
            /* DS-OK: canonical per-system anatomy renderer value from awesome-list-site-ds/design-system-anatomy.jsx; pixel-gated against that source */
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
      <svg aria-hidden="true" focusable="false" width={w} height={h} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <polygon points={`${w/2},4 ${w-4},${h/2} ${w/2},${h-4} 4,${h/2}`}
          /* DS-OK: canonical per-system anatomy renderer value from awesome-list-site-ds/design-system-anatomy.jsx; pixel-gated against that source */
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
      <svg aria-hidden="true" focusable="false" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
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
          // DS-OK: canonical per-system anatomy renderer value from awesome-list-site-ds/design-system-anatomy.jsx; pixel-gated against that source
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
        fontSize: 9, color: 'var(--text-3)',
        letterSpacing: '0.14em',
      }}>
        {/* DS-OK: canonical per-system anatomy renderer value from awesome-list-site-ds/design-system-anatomy.jsx; pixel-gated against that source */}
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
        // DS-OK: canonical per-system anatomy renderer value from awesome-list-site-ds/design-system-anatomy.jsx; pixel-gated against that source
        border: '2px solid #f5f5f0', pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute', top: -12, left: 12,
          background: '#000', padding: '0 8px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, fontWeight: 700, letterSpacing: '0.18em',
          // DS-OK: canonical per-system anatomy renderer value from awesome-list-site-ds/design-system-anatomy.jsx; pixel-gated against that source
          textTransform: 'uppercase', color: '#f5f5f0',
        }}>{label}</div>
      </div>
    );
  }
  if (sysId === 'swiss') {
    return (
      <div style={{
        position: 'absolute', left: x, top: y, width: w, height: h,
        // DS-OK: canonical per-system anatomy renderer value from awesome-list-site-ds/design-system-anatomy.jsx; pixel-gated against that source
        borderTop: '0.5px solid rgba(250,250,248,0.18)',
        borderBottom: '0.5px solid rgba(250,250,248,0.18)',
        pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute', top: 6, left: 8,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 9, letterSpacing: '0.14em',
          // DS-OK: canonical per-system anatomy renderer value from awesome-list-site-ds/design-system-anatomy.jsx; pixel-gated against that source
          color: 'rgba(250,250,248,0.5)',
        }}>{label}</div>
      </div>
    );
  }
  /* editorial / geist: soft */
  return (
    <div style={{
      position: 'absolute', left: x, top: y, width: w, height: h,
      // DS-OK: canonical per-system anatomy renderer value from awesome-list-site-ds/design-system-anatomy.jsx; pixel-gated against that source
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
function FlowCanvas({ sysId, accent, children, height = 360, scrollable = false, ariaLabel }) {
  const s = SYSTEM_FLOW_STYLES[sysId];
  const canvas = (
    <div className="ds-flow-canvas" style={{
      position: 'relative',
      background: s.bg,
      // DS-OK: canonical per-system anatomy renderer value from awesome-list-site-ds/design-system-anatomy.jsx; pixel-gated against that source
      border: sysId === 'brutalist' ? '2px solid #f5f5f0' : '1px solid var(--border)',
      borderRadius: s.nodeRadius === 0 ? 0 : 'var(--radius)',
      height,
      overflow: 'hidden',
    }}>
      {/* atmosphere per system */}
      {sysId === 'terminal' && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          // DS-OK: canonical per-system anatomy renderer value from awesome-list-site-ds/design-system-anatomy.jsx; pixel-gated against that source
          backgroundImage: 'repeating-linear-gradient(0deg, transparent 0, transparent 2px, rgba(255,255,255,0.025) 2px, rgba(255,255,255,0.025) 3px)',
        }} />
      )}
      {sysId === 'swiss' && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          // DS-OK: canonical per-system anatomy renderer value from awesome-list-site-ds/design-system-anatomy.jsx; pixel-gated against that source
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
  if (!scrollable) return canvas;
  return (
    <div className="ds-flow-clip">
      <div className="ds-flow-scroll" role="region" tabIndex={0} aria-label={ariaLabel}>
        {canvas}
      </div>
    </div>
  );
}

/* ─── A consistent flow content for all systems ─── */
/* Pipeline: Source → Transcode → [Decision: HLS?] → Package(HLS) / Package(DASH) → CDN
   So we exercise: 5 nodes, 1 decision, 5 arrows w/ labels, swim lane label. */
function StandardFlow({ sysId, accent, scrollable = false, ariaLabel }) {
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
    <FlowCanvas
      sysId={sysId}
      accent={accent}
      height={H}
      scrollable={scrollable}
      ariaLabel={ariaLabel}
    >
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
  const accentHex = (ACCENTS.find(x => x.id === accent) || ACCENTS[0]).primary;
  const order = ['editorial', 'terminal', 'geist', 'brutalist', 'swiss'];

  return (
    <section className="ds-section ds-flow-section" data-canonical-section="anatomy">
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
              <div className="ds-flow-system-header" style={{
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

              <StandardFlow
                sysId={sysId}
                accent={accentHex}
                scrollable
                ariaLabel={`${sysId} delivery pipeline flow diagram`}
              />
              <PrimitivePalette sysId={sysId} accent={accentHex} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

window.FlowDiagramsSection = FlowDiagramsSection;
/* =====================================================================
   DESIGN SYSTEM SHOWCASE
   Documents the 5 systems and their token contract, with live components.
   ===================================================================== */

/* ------------------------------------------------------------------ */
/* Reusable showcase primitives                                       */
/* ------------------------------------------------------------------ */

function SectionHead({ eyebrow, title, sub }) {
  return (
    <header style={{ marginBottom: 32 }}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="ds-h" style={{ fontSize: 'clamp(28px, 4vw, 44px)', marginBottom: 12 }}>
        {title}
      </h2>
      {sub && <p style={{ fontSize: 15, color: 'var(--text-2)', maxWidth: 640 }}>{sub}</p>}
    </header>
  );
}

function TokenRow({ name, swatch, value, note }) {
  return (
    <div className="ds-token-row">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {swatch}
        <code className="mono" style={{ fontSize: 12, color: 'var(--text)' }}>{name}</code>
      </div>
      <code className="mono" style={{ fontSize: 11, color: 'var(--text-3)', wordBreak: 'break-all' }}>{value}</code>
      <span style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'right' }}>{note}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SYSTEM SWITCHER — sticky bar                                       */
/* ------------------------------------------------------------------ */

function SystemSwitcher({ system, accent, onSystem, onAccent }) {
  return (
    <div className="ds-switcher" style={{
      position: 'sticky', top: 0, zIndex: 30,
      background: 'color-mix(in srgb, var(--bg) 86%, transparent)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      borderBottom: 'var(--hairline-w) solid var(--border)',
      padding: '14px 24px',
      display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 14,
    }}>
      <a href="#showcase" className="mono" style={{
        fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
        color: 'var(--text-2)', textDecoration: 'none',
      }}>← AWESOME.VIDEO</a>
      <span aria-hidden="true" style={{ color: 'var(--text-4)' }}>/</span>
      <span className="mono" style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
        Design System
      </span>
      <a href="#docs-overview" className="mono" style={{
        fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
        color: 'var(--text-2)', textDecoration: 'none', marginLeft: 8,
        padding: '4px 10px', border: 'var(--hairline-w) solid var(--border)',
        borderRadius: 'var(--radius-pill)',
      }}>Docs ↗</a>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {Object.entries(DESIGN_SYSTEMS).map(([k, sys]) => (
          <button key={k} className={'ds-system-pill' + (system === k ? ' active' : '')}
            aria-pressed={system === k} onClick={() => onSystem(k)}>
            <span style={{ fontWeight: 600 }}>{sys.name}</span>
            <span style={{ opacity: 0.65 }}>·</span>
            <span style={{ opacity: 0.7 }}>{sys.tag}</span>
          </button>
        ))}
      </div>

      <div className="ds-accent-grid" style={{ display: 'flex', gap: 4, alignItems: 'center', borderLeft: '1px solid var(--border)', paddingLeft: 12, marginLeft: 4 }}>
        {ACCENTS.map(a => (
          <button key={a.id} title={a.name} aria-label={`Use ${a.name} accent`} aria-pressed={accent === a.id}
            className="ds-accent-target" onClick={() => onAccent(a.id)}>
            <span aria-hidden="true" style={{
              width: 18, height: 18, display: 'block',
              borderRadius: 'var(--radius-pill)',
              border: accent === a.id ? '2px solid var(--text)' : '1px solid var(--border)',
              background: a.primary,
            }} />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* HERO                                                               */
/* ------------------------------------------------------------------ */

function Hero({ system }) {
  const sys = DESIGN_SYSTEMS[system];
  return (
    <section style={{ padding: '80px 0 48px', borderBottom: 'var(--hairline-w) solid var(--border)' }}>
      <div className="mono" style={{ fontSize: 11, letterSpacing: '0.2em', color: 'var(--accent)', marginBottom: 24 }}>
        ── DESIGN&nbsp;SYSTEM&nbsp;v1.0 / awesome.video
      </div>
      <h1 className="ds-h" style={{ fontSize: 'clamp(48px, 8vw, 96px)', marginBottom: 24 }}>
        Five systems.<br/>
        <span style={{ color: 'var(--accent)' }}>One taxonomy.</span>
      </h1>
      <p style={{
        fontSize: 19, color: 'var(--text-2)', maxWidth: 720, lineHeight: 1.55, marginBottom: 32,
      }}>
        A token contract that swaps the entire visual personality with one attribute change.
        Every system is dark, flat-black, and dense — but each commits to its own grammar of edges,
        type, surface, and rhythm.
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 48 }}>
        <span className="chip">Currently: {sys.name}</span>
        <span className="chip muted">{sys.tag}</span>
        <span className="chip muted">flat-black bg</span>
        <span className="chip muted">dense / reference</span>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 1, background: 'var(--border)',
        border: 'var(--hairline-w) solid var(--border)',
      }}>
        {[
          ['SYSTEMS', '5'],
          ['ACCENTS', '10'],
          ['TYPE STEPS', String(TYPE_SCALE.length)],
          ['SPACE STEPS', String(SPACE_SCALE.length)],
          ['TOKENS / SYS', '~36'],
        ].map(([k, v]) => (
          <div key={k} style={{ background: 'var(--bg)', padding: '20px 22px' }}>
            <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.18em', marginBottom: 8 }}>{k}</div>
            <div className="ds-h" style={{ fontSize: 32 }}>{v}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* SYSTEMS OVERVIEW — side-by-side cards                              */
/* ------------------------------------------------------------------ */

function SystemsOverview({ system, onSystem }) {
  return (
    <section className="ds-section">
      <SectionHead
        eyebrow="── 01 / SYSTEMS"
        title={<>Five distinct <em style={{ fontStyle: 'italic', color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>personalities</em></>}
        sub="Each system is more than a recolor — different edges, type stacks, surface treatments, and component grammars. Click to apply globally."
      />
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14,
      }}>
        {Object.entries(DESIGN_SYSTEMS).map(([k, sys]) => {
          const active = system === k;
          return (
            <button key={k} onClick={() => onSystem(k)} aria-pressed={active}
              className={'card hoverable' + (active ? ' glow' : '')}
              style={{
                padding: 22, textAlign: 'left', cursor: 'pointer',
                border: active ? '1px solid var(--accent)' : undefined,
                fontFamily: 'inherit', color: 'inherit',
                /* preview the system's font in its own card */
              }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: active ? 'var(--accent)' : 'var(--text-3)', marginBottom: 12 }}>
                0{Object.keys(DESIGN_SYSTEMS).indexOf(k) + 1} / {sys.tag.split(' · ')[0].toUpperCase()}
              </div>
              <div style={{
                fontFamily: sys.vars['--font-display'],
                fontSize: 28,
                fontWeight: sys.vars['--display-weight'] || 600,
                letterSpacing: sys.vars['--display-tracking'] || '-0.02em',
                lineHeight: 1.05,
                marginBottom: 8,
                fontStyle: k === 'editorial' ? 'italic' : 'normal',
              }}>{sys.name}</div>
              <p style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.55, marginBottom: 14 }}>
                {sys.desc}
              </p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span className="chip muted" style={{
                  fontFamily: sys.vars['--font-mono'],
                  borderRadius: sys.vars['--radius-pill'],
                  border: `${sys.vars['--hairline-w']} solid var(--border)`,
                }}>{sys.vars['--font-body'].split(',')[0].replace(/'/g, '')}</span>
                <span className="chip muted" style={{
                  fontFamily: sys.vars['--font-mono'],
                  borderRadius: sys.vars['--radius-pill'],
                }}>r:{sys.vars['--radius']}</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* TYPOGRAPHY                                                         */
/* ------------------------------------------------------------------ */

function Typography({ system }) {
  const sys = DESIGN_SYSTEMS[system];
  return (
    <section className="ds-section">
      <SectionHead
        eyebrow="── 02 / TYPOGRAPHY"
        title="Type scale & families"
        sub={`Display = ${sys.vars['--font-display'].split(',')[0].replace(/'/g, '')}, Body = ${sys.vars['--font-body'].split(',')[0].replace(/'/g, '')}, Mono = ${sys.vars['--font-mono'].split(',')[0].replace(/'/g, '')}.`}
      />

      {/* Stack samples */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 1,
        background: 'var(--border)', border: 'var(--hairline-w) solid var(--border)', marginBottom: 48,
      }}>
        {[
          { label: 'DISPLAY', font: 'var(--font-display)', sample: 'Hand-picked', w: sys.vars['--display-weight'], extra: { letterSpacing: sys.vars['--display-tracking'], fontStyle: system === 'editorial' ? 'italic' : 'normal' } },
          { label: 'BODY', font: 'var(--font-body)', sample: 'Indexed atlas', w: 500 },
          { label: 'MONO', font: 'var(--font-mono)', sample: '0123 / abc', w: 500 },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg)', padding: '24px 22px' }}>
            <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.18em', marginBottom: 14 }}>{s.label}</div>
            <div style={{ fontFamily: s.font, fontSize: 36, fontWeight: s.w, lineHeight: 1.1, ...(s.extra || {}) }}>
              {s.sample}
            </div>
          </div>
        ))}
      </div>

      {/* Scale */}
      <div>
        {TYPE_SCALE.map(t => (
          <div key={t.name} className="ds-type-scale-row" style={{
            display: 'grid', gridTemplateColumns: '120px 100px 1fr 160px', gap: 24,
            padding: '20px 0', borderTop: 'var(--hairline-w) solid var(--hairline)',
            alignItems: 'baseline',
          }}>
            <code className="mono" style={{ fontSize: 12, color: 'var(--text)' }}>{t.name}</code>
            <code className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{t.px}px</code>
            <div style={{
              fontFamily: t.px >= 28 ? 'var(--font-display)' : 'var(--font-body)',
              fontSize: t.px,
              fontWeight: t.px >= 28 ? sys.vars['--display-weight'] : (t.px >= 16 ? 600 : 400),
              letterSpacing: t.px >= 28 ? sys.vars['--display-tracking'] : 0,
              lineHeight: t.px >= 28 ? 1.05 : 1.4,
              color: 'var(--text)',
            }}>
              {t.label}
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'right' }}>{t.use}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* COLOR — surface, text, accent                                      */
/* ------------------------------------------------------------------ */

function Color({ system, accent }) {
  const sys = DESIGN_SYSTEMS[system];
  const groups = [
    { label: 'BACKGROUND', tokens: ['--bg', '--bg-2'] },
    { label: 'SURFACE',    tokens: ['--surface', '--surface-2', '--surface-3'] },
    { label: 'BORDER',     tokens: ['--border', '--border-strong', '--hairline'] },
    { label: 'TEXT',       tokens: ['--text', '--text-2', '--text-3', '--text-4'] },
  ];
  const a = ACCENTS.find(x => x.id === accent) || ACCENTS[0];

  return (
    <section className="ds-section">
      <SectionHead
        eyebrow="── 03 / COLOR"
        title="Surface, ink, & accent"
        /* DS-OK: documentation prose naming the canvas value, not a style */
        sub="Every system commits to flat #000000 backgrounds. Surfaces and borders are alpha overlays so the page atmosphere shines through. Accent is the single chromatic moment."
      />

      {/* Accent showcase */}
      <div style={{
        border: 'var(--hairline-w) solid var(--border)', borderRadius: 'var(--radius)',
        padding: 28, marginBottom: 40, background: 'var(--surface)',
      }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-3)', marginBottom: 20 }}>
          ACTIVE ACCENT — {a.name.toUpperCase()}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
          <div style={{ height: 96, background: a.primary, borderRadius: 'var(--radius-sm)', position: 'relative' }}>
            <code className="mono" style={{ position: 'absolute', bottom: 8, left: 10, fontSize: 10, color: '#000', fontWeight: 700 }}>{a.primary}</code>
          </div>
          <div style={{ height: 96, background: a.secondary, borderRadius: 'var(--radius-sm)', position: 'relative' }}>
            <code className="mono" style={{ position: 'absolute', bottom: 8, left: 10, fontSize: 10, color: '#000', fontWeight: 700 }}>{a.secondary}</code>
          </div>
          <div style={{
            height: 96, borderRadius: 'var(--radius-sm)',
            background: `linear-gradient(135deg, ${a.primary}, ${a.secondary})`,
            position: 'relative',
          }}>
            <code className="mono" style={{ position: 'absolute', bottom: 8, left: 10, fontSize: 10, color: '#000', fontWeight: 700 }}>gradient</code>
          </div>
          <div style={{
            height: 96, borderRadius: 'var(--radius-sm)',
            background: `color-mix(in srgb, ${a.primary} 14%, transparent)`,
            border: `1px solid color-mix(in srgb, ${a.primary} 35%, transparent)`,
            color: a.primary, fontFamily: 'var(--font-mono)', fontSize: 10,
            display: 'flex', alignItems: 'flex-end', padding: 10,
          }}>14% wash</div>
        </div>
      </div>

      {/* Token tables */}
      {groups.map(g => (
        <div key={g.label} style={{ marginBottom: 32 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-3)', marginBottom: 6 }}>
            {g.label}
          </div>
          {g.tokens.map(t => (
            <TokenRow key={t} name={t}
              swatch={
                <div style={{
                  width: 28, height: 28, borderRadius: 'var(--radius-sm)',
                  background: sys.vars[t] || 'var(--surface)',
                  border: '1px solid var(--border)',
                  flexShrink: 0,
                }} />
              }
              value={sys.vars[t]}
              note={t.includes('text') ? 'ink' : t.includes('border') ? 'edge' : t.includes('surface') ? 'overlay' : 'page'} />
          ))}
        </div>
      ))}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* SPACING + RADIUS + SHADOW                                          */
/* ------------------------------------------------------------------ */

function Geometry({ system }) {
  const sys = DESIGN_SYSTEMS[system];
  return (
    <section className="ds-section">
      <SectionHead
        eyebrow="── 04 / GEOMETRY"
        title="Spacing, radius, shadow"
        sub="A 4px base spacing scale, system-specific radii, and shadow tokens that range from soft falloff (Editorial) to hard offset (Brutalist) to none (Swiss)."
      />

      {/* Spacing */}
      <div style={{ marginBottom: 48 }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-3)', marginBottom: 16 }}>SPACE SCALE</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
          {SPACE_SCALE.map(s => (
            <div key={s.name} style={{ textAlign: 'center' }}>
              <div style={{
                width: Math.max(s.px, 8), height: Math.max(s.px, 8),
                background: 'var(--accent)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 8,
                opacity: s.px === 0 ? 0.3 : 1,
                border: s.px === 0 ? '1px dashed var(--accent)' : 'none',
              }} />
              <code className="mono" style={{ fontSize: 10, color: 'var(--text-2)' }}>s-{s.name}</code>
              <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)' }}>{s.px}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Radius */}
      <div style={{ marginBottom: 48 }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-3)', marginBottom: 16 }}>RADIUS</div>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          {[
            ['--radius-sm', sys.vars['--radius-sm']],
            ['--radius', sys.vars['--radius']],
            ['--radius-pill', sys.vars['--radius-pill']],
          ].map(([n, v]) => (
            <div key={n} style={{ flex: '1 1 200px' }}>
              <div style={{
                height: 80,
                borderRadius: v,
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
                marginBottom: 8,
              }} />
              <code className="mono" style={{ fontSize: 11, color: 'var(--text-2)' }}>{n}</code>
              <span className="mono" style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 8 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Shadow */}
      <div>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-3)', marginBottom: 16 }}>SHADOW</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, paddingBottom: 40 }}>
          {[
            ['--shadow-sm', sys.vars['--shadow-sm']],
            ['--shadow', sys.vars['--shadow']],
            ['--shadow-lg', sys.vars['--shadow-lg']],
            ['--shadow-accent', 'accent glow'],
          ].map(([n, label]) => (
            <div key={n} style={{
              height: 100,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              boxShadow: `var(${n})`,
              padding: 14, fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)',
            }}>{n}</div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* COMPONENTS — the actual UI primitives                              */
/* ------------------------------------------------------------------ */

function Components() {
  const tabs = [
    { label: 'Overview' },
    { label: 'Subcategories' },
    { label: 'Activity' },
    { label: 'Stats' },
  ];
  const [activeTab, setActiveTab] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectTab = (index: number, focus = false) => {
    setActiveTab(index);
    if (focus) tabRefs.current[index]?.focus();
  };
  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next === index) return;
    event.preventDefault();
    selectTab(next, true);
  };
  return (
    <section className="ds-section">
      <SectionHead
        eyebrow="── 05 / COMPONENTS"
        title="Primitives"
        sub="Every component reads from the token contract. Switch systems above to see them shape-shift live."
      />

      {/* Buttons */}
      <div style={{ marginBottom: 48 }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-3)', marginBottom: 14 }}>BUTTONS</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button variant="primary">Primary action</Button>
          <Button>Default</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="ghost" icon aria-label="search">
            <svg aria-hidden="true" focusable="false" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5"/><path d="M11 11 L14 14"/></svg>
          </Button>
        </div>
      </div>

      {/* Chips */}
      <div style={{ marginBottom: 48 }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-3)', marginBottom: 14 }}>CHIPS</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Chip>default</Chip>
          <Chip variant="accent">accent</Chip>
          <Chip variant="ok">ok · 12.4k</Chip>
          <Chip variant="warn">warn</Chip>
          <Chip variant="bad">bad</Chip>
          <Chip variant="muted">muted</Chip>
          <Kbd>⌘K</Kbd>
          <Kbd>esc</Kbd>
        </div>
      </div>

      {/* Form */}
      <div style={{ marginBottom: 48 }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-3)', marginBottom: 14 }}>FORM</div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16,
          maxWidth: 760,
        }}>
          <div className="field">
            <label htmlFor="showcase-resource-title">Resource title</label>
            <input id="showcase-resource-title" className="input" defaultValue="ffmpeg-libav" />
          </div>
          <div className="field">
            <label htmlFor="showcase-resource-category">Category</label>
            <select id="showcase-resource-category" className="select" defaultValue="encoding">
              <option value="encoding">Encoding</option>
              <option value="streaming">Streaming</option>
              <option value="ai">AI / ML</option>
            </select>
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="showcase-resource-description">Description</label>
            <textarea id="showcase-resource-description" className="textarea" defaultValue="A complete, cross-platform solution to record, convert and stream audio and video." />
          </div>
        </div>
      </div>

      {/* Cards */}
      <div style={{ marginBottom: 48 }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-3)', marginBottom: 14 }}>CARDS</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
          {[
            { i: '◢', t: 'Encoding', d: 'FFmpeg, x264, AV1 toolchains, transcoders, color pipelines.', n: 312 },
            { i: '⌬', t: 'Streaming', d: 'HLS, DASH, RTMP, WebRTC servers and edge delivery stacks.', n: 184 },
            { i: '◈', t: 'Players', d: 'HTML5, embeddable, native SDKs and adaptive bitrate clients.', n: 96 },
          ].map((c, i) => (
            <div key={i} className="card hoverable glow" style={{ padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--accent)', fontSize: 16,
                }}>{c.i}</div>
                <h3 className="ds-h" style={{ fontSize: 17, flex: 1 }}>{c.t}</h3>
                <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.n}</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55 }}>{c.d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Table — list pattern, the core unit */}
      <div style={{ marginBottom: 48 }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-3)', marginBottom: 14 }}>LIST PATTERN — the core unit of the site</div>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Resource</th>
                <th>Category</th>
                <th style={{ width: 120 }}>Stars</th>
                <th style={{ width: 80 }}>Health</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['01', 'FFmpeg', 'Encoding', '44.2k', 'ok'],
                ['02', 'Shaka Player', 'Players', '7.1k', 'ok'],
                ['03', 'Bento4', 'Packaging', '1.2k', 'warn'],
                ['04', 'OBS Studio', 'Capture', '63.8k', 'ok'],
                ['05', 'gst-plugins-bad', 'Pipelines', '512', 'bad'],
              ].map(([i, name, cat, stars, h]) => (
                <tr key={i}>
                  <td className="mono" style={{ color: 'var(--text-3)' }}>{i}</td>
                  <td style={{ color: 'var(--text)', fontWeight: 500 }}>{name}</td>
                  <td>{cat}</td>
                  <td className="mono" style={{ color: 'var(--text-2)' }}>{stars}</td>
                  <td><span className={'chip ' + h}>{h}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: 48 }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-3)', marginBottom: 14 }}>TABS</div>
        <div className="tabs" role="tablist" aria-label="Component example tabs">
          {tabs.map((tab, index) => (
            <button
              key={tab.label}
              ref={element => { tabRefs.current[index] = element; }}
              id={`showcase-tab-${index}`}
              className={`tab${activeTab === index ? ' active' : ''}`}
              role="tab"
              aria-selected={activeTab === index}
              tabIndex={activeTab === index ? 0 : -1}
              onClick={() => selectTab(index)}
              onKeyDown={event => handleTabKeyDown(event, index)}
            >
              {tab.label}{tab.label === 'Subcategories' && <span className="mono" style={{ color: 'var(--text-3)' }}>· 14</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Live signals */}
      <div>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-3)', marginBottom: 14 }}>LIVE SIGNALS</div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <span aria-label="indexed live" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-2)' }}>
            <span className="live-dot" />
            <span className="mono" style={{ letterSpacing: '0.08em' }}>indexed · live</span>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <Dot status="ok" />
            <span style={{ color: 'var(--text-2)' }}>up</span>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <Dot status="warn" />
            <span style={{ color: 'var(--text-2)' }}>stale</span>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <Dot status="bad" />
            <span style={{ color: 'var(--text-2)' }}>down</span>
          </span>
          <span className="caret" style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>type to search</span>
          <div className="shimmer-line" style={{ width: 200 }} />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* LIST ROW — the awesome-list unit                                   */
/* ------------------------------------------------------------------ */

function ListUnit() {
  const items = [
    { idx: '01', name: 'FFmpeg', tags: ['encoding', 'cli', 'cross-platform'], desc: 'A complete, cross-platform solution to record, convert and stream audio and video.', stars: '44.2k', updated: '2 days ago' },
    { idx: '02', name: 'Shaka Player', tags: ['players', 'js', 'dash', 'hls'], desc: 'Open-source JavaScript library that plays adaptive media in a browser.', stars: '7.1k', updated: '5 days ago' },
    { idx: '03', name: 'video.js', tags: ['players', 'web', 'plugins'], desc: 'Open source HTML5 video player. Battle-tested, framework-agnostic, plugin ecosystem.', stars: '38.4k', updated: '1 week ago' },
    { idx: '04', name: 'OBS Studio', tags: ['capture', 'streaming', 'desktop'], desc: 'Free and open source software for video recording and live streaming.', stars: '63.8k', updated: '3 days ago' },
    { idx: '05', name: 'Mux Video API', tags: ['saas', 'streaming', 'analytics'], desc: 'Video infrastructure for developers — encoding, delivery, real-time data.', stars: '—', updated: 'today' },
  ];
  return (
    <section className="ds-section">
      <SectionHead
        eyebrow="── 06 / LIST PATTERN"
        title="The core unit"
        sub="Awesome-list directories live and die on the resource row. Index, title, tags, description, signals — all aligned to the same baseline grid."
      />
      <div style={{ borderTop: 'var(--hairline-w) solid var(--border)' }}>
        {items.map(it => (
          <div key={it.idx} className="ds-list-row" style={{
            display: 'grid',
            gridTemplateColumns: '60px 1fr 140px 100px',
            gap: 24, padding: '20px 8px',
            borderBottom: 'var(--hairline-w) solid var(--hairline)',
            alignItems: 'baseline',
             transition: 'background 160ms ease',
           }}>
            <code className="mono" style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.1em' }}>{it.idx}</code>
            <div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 6, flexWrap: 'wrap' }}>
                <h4 style={{ fontSize: 16, fontWeight: 600 }}>{it.name}</h4>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {it.tags.map(t => <span key={t} className="chip muted" style={{ fontSize: 9.5, padding: '2px 7px' }}>{t}</span>)}
                </div>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5, maxWidth: 640 }}>{it.desc}</p>
            </div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>★ {it.stars}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'right' }}>{it.updated}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* PAGE TEMPLATES — thumbnails of how the system composes             */
/* ------------------------------------------------------------------ */

function PageTemplates() {
  const templates = [
    { name: 'Home · Featured', desc: 'Hero + featured grid + categories', sketch: 'home' },
    { name: 'Category', desc: 'Header + filter rail + list of resources', sketch: 'cat' },
    { name: 'Resource Detail', desc: 'Title, meta, description, related', sketch: 'detail' },
    { name: 'Submit', desc: 'Form-first — minimal chrome', sketch: 'submit' },
  ];
  return (
    <section className="ds-section">
      <SectionHead
        eyebrow="── 07 / TEMPLATES"
        title="Page compositions"
        sub="Four canonical layouts. All share a sticky header, an optional sidebar accordion, and a centered content column."
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
        {templates.map(t => (
          <div key={t.name} className="card" style={{ padding: 18 }}>
            {/* Mini wireframe */}
            <div style={{
              aspectRatio: '4/3',
              background: 'var(--bg-2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: 8,
              display: 'flex', flexDirection: 'column', gap: 4,
              marginBottom: 14,
            }}>
              <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: 2 }} />
              <div style={{ display: 'flex', gap: 4, flex: 1, marginTop: 4 }}>
                {t.sketch !== 'submit' && <div style={{ width: '22%', background: 'var(--surface)', borderRadius: 2 }} />}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {t.sketch === 'home' && <>
                    <div style={{ height: 16, background: 'var(--surface-2)', borderRadius: 2 }} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, flex: 1 }}>
                      {[1,2,3,4].map(i => <div key={i} style={{ background: 'var(--surface)', borderRadius: 2 }} />)}
                    </div>
                  </>}
                  {t.sketch === 'cat' && <>
                    <div style={{ height: 14, background: 'var(--surface-2)', borderRadius: 2 }} />
                    {[1,2,3,4,5].map(i => <div key={i} style={{ height: 6, background: 'var(--surface)', borderRadius: 1 }} />)}
                  </>}
                  {t.sketch === 'detail' && <>
                    <div style={{ height: 18, background: 'var(--surface-2)', borderRadius: 2 }} />
                    <div style={{ height: 4, background: 'var(--surface)', borderRadius: 1 }} />
                    <div style={{ height: 4, background: 'var(--surface)', borderRadius: 1, width: '70%' }} />
                    <div style={{ flex: 1, background: 'var(--surface)', borderRadius: 2, marginTop: 4 }} />
                  </>}
                  {t.sketch === 'submit' && <>
                    <div style={{ height: 12, background: 'var(--surface-2)', borderRadius: 2, width: '60%' }} />
                    {[1,2,3].map(i => <div key={i} style={{ height: 10, background: 'var(--surface)', borderRadius: 2 }} />)}
                    <div style={{ height: 14, background: 'var(--accent)', borderRadius: 2, marginTop: 4, opacity: 0.7 }} />
                  </>}
                </div>
              </div>
            </div>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{t.name}</h4>
            <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>{t.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* FOOTER                                                             */
/* ------------------------------------------------------------------ */

function Footer({ system }) {
  const sys = DESIGN_SYSTEMS[system];
  return (
    <footer style={{
      borderTop: 'var(--hairline-w) solid var(--border)',
      padding: '32px 0 24px',
      display: 'flex', justifyContent: 'space-between',
      alignItems: 'baseline', flexWrap: 'wrap', gap: 16,
      color: 'var(--text-3)', fontSize: 12, fontFamily: 'var(--font-mono)',
    }}>
      <span>awesome.video / design system v1.0</span>
      <span>{sys.name.toUpperCase()} · {Object.keys(sys.vars).length} tokens</span>
      <a href="#showcase" style={{ color: 'var(--text-2)', textDecoration: 'underline' }}>← back to site</a>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/* APP                                                                */
/* ------------------------------------------------------------------ */

export function CanonicalShowcase() {
  const { system, accent, setSystem: handleSystem, setAccent } = useShowcaseTheme();

  return (
    <div className="page">
      <SkipLink targetId="showcase-main" />
      <div className="grain" aria-hidden="true" />
      <SystemSwitcher
        system={system}
        accent={accent}
        onSystem={handleSystem}
        onAccent={setAccent}
      />
      <main id="showcase-main" className="ds-shell" tabIndex={-1}>
        <Hero system={system} />
        <SystemsOverview system={system} onSystem={handleSystem} />
        <FlowDiagramsSection accent={accent} />
        <Typography system={system} />
        <Color system={system} accent={accent} />
        <Geometry system={system} />
        <Components />
        <ListUnit />
        <PageTemplates />
        <Footer system={system} />
      </main>
    </div>
  );
}


export function CanonicalAnatomy() {
  const { system, accent, setSystem: handleSystem, setAccent } = useShowcaseTheme();
  return <div className="page"><SkipLink targetId="anatomy-main" /><div className="grain" aria-hidden="true" /><SystemSwitcher system={system} accent={accent} onSystem={handleSystem} onAccent={setAccent} /><main id="anatomy-main" className="ds-shell" tabIndex={-1}><FlowDiagramsSection accent={accent} /><Footer system={system} /></main></div>;
}

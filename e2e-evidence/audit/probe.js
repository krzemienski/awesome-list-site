// Reusable responsive + control-integrity probe for the VG-5 browser audit.
// Run via mcp__chrome-devtools__evaluate_script after emulate(width) + nav + hydration wait.
// Horizontal-clip + zero-size are real responsive defects; below-fold (r.top>vh) is NOT
// a defect on a scrolling page, so it is intentionally excluded (probe calibration).
() => {
  const de = document.documentElement;
  const vw = window.innerWidth;
  const overflow = de.scrollWidth - de.clientWidth;
  const bad = [];
  // An element is "hidden" if it OR any ancestor is display:none / visibility:hidden.
  // Breadcrumb <nav> is display:none on mobile, so its links are legitimately
  // zero-size — not a defect. Walk the ancestor chain before flagging.
  const isHidden = (el) => {
    let p = el;
    while (p && p !== document.body) {
      const cs = getComputedStyle(p);
      if (cs.display === 'none' || cs.visibility === 'hidden') return true;
      p = p.parentElement;
    }
    return false;
  };
  for (const el of document.querySelectorAll('button, a, input, select, textarea, [role="button"], [role="tab"]')) {
    const cs = getComputedStyle(el);
    if (cs.position === 'fixed' && (el.textContent || '').toLowerCase().includes('skip')) continue;
    if (isHidden(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) { bad.push('zero:' + (el.textContent || '').trim().slice(0, 25)); continue; }
    if (r.right < 0 || r.left > vw) bad.push('offh:' + (el.textContent || '').trim().slice(0, 25));
  }
  return { vw, overflow, sw: de.scrollWidth, cw: de.clientWidth, badCount: bad.length, bad: bad.slice(0, 12), pass: overflow <= 1 && bad.length === 0 };
}

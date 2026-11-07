async () => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const parse = c => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return { r: d[0], g: d[1], b: d[2], a: 1 }; };
  const raw = c => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 }; };
  const lum = ({ r, g, b }) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  const blend = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const bgOf = e => { const st = []; let img = false; for (let n = e; n; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.backgroundImage !== 'none') img = true; const c = raw(cs.backgroundColor); if (c.a > 0) st.push(c); if (c.a >= 1) break; } let base = (st.length && st[st.length - 1].a >= 1) ? st.pop() : { r: 0, g: 0, b: 0, a: 1 }; while (st.length) base = blend(st.pop(), base); base.img = img; return base; };
  const run = () => {
    const worst = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const seen = new Set(); let n;
    while (n = w.nextNode()) {
      const t = n.textContent.trim(); if (!t) continue; const e = n.parentElement; if (seen.has(e)) continue; seen.add(e);
      if (e.closest('.sr-only,[aria-hidden=true],script,style,[disabled]')) continue;
      const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); if (!r.width || cs.visibility === 'hidden') continue;
      let op = 1; for (let p = e; p; p = p.parentElement) op *= +getComputedStyle(p).opacity;
      if (op < 0.5) continue; const bg = bgOf(e); let fg = raw(cs.color); fg.a *= op; fg = blend(fg, bg);
      const L1 = lum(fg), L2 = lum(bg); const cr = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
      const fs = parseFloat(cs.fontSize); const big = fs >= 24 || (fs >= 18.66 && +cs.fontWeight >= 700);
      if (cr < (big ? 3 : 4.5)) worst.push([+cr.toFixed(2), t.slice(0, 28), cs.fontSize, e.tagName, bg.img ? 'IMG' : '']);
    }
    worst.sort((a, b) => a[0] - b[0]); return { n: seen.size, fail: worst.length, worst: worst.slice(0, 5) };
  };
  const out = {};
  for (const [sys, acc] of [['editorial', 'crimson'], ['editorial', 'violet'], ['geist', 'cyan'], ['geist', 'violet']]) {
    for (const th of ['dark', 'light']) {
      window.applyDesignSystem(sys, acc); document.documentElement.classList.remove('dark', 'light'); document.documentElement.classList.add(th); await new Promise(r => setTimeout(r, 600));
      out[sys + '/' + acc + '/' + th] = run();
    }
  }
  return out;
}

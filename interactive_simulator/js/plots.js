/* plots.js — the two small charts: linear stability vs μ, and Jacobi-constant error of the selected particle. */
(function (G) {
  'use strict';
  const P = G.Physics, css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const NAMES = ['L1', 'L2', 'L3', 'L4'], COLS = ['#e4572e', '#e0a100', '#2e9e6a', '#7a5ad8'];
  let curves = null;

  function prepare() {                                        // growth rate max Re λ for log-spaced μ
    const n = 240, mus = [], g = NAMES.map(() => []);
    for (let i = 0; i < n; i++) { const mu = 1e-4 * (0.5 / 1e-4) ** (i / (n - 1)), eq = P.equilibria(mu); mus.push(mu); NAMES.forEach((k, j) => g[j].push(P.linearize(eq[k], mu).growth)); }
    curves = { mus, g, ymax: Math.max(...g.flat()) * 1.05 };
  }
  function size(c) { const r = c.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2); c.width = r.width * d; c.height = r.height * d; return d; }

  function stability(c, S) {
    if (!curves) prepare(); const d = size(c), g = c.getContext('2d'), w = c.width, h = c.height, L = 34 * d, R = 8 * d, T = 8 * d, B = 22 * d;
    const X = m => L + Math.log(m / 1e-4) / Math.log(0.5 / 1e-4) * (w - L - R), Y = v => h - B - v / curves.ymax * (h - T - B);
    g.clearRect(0, 0, w, h); g.font = `${10 * d}px system-ui`; g.fillStyle = css('--muted'); g.strokeStyle = css('--line'); g.lineWidth = d;
    [1e-4, 1e-3, 1e-2, 1e-1, 0.5].forEach(m => { g.beginPath(); g.moveTo(X(m), T); g.lineTo(X(m), h - B); g.stroke(); g.fillText(m < 0.01 ? m.toExponential(0) : m, X(m) - 8 * d, h - 7 * d); });
    for (let v = 0; v <= Math.floor(curves.ymax); v++) { g.beginPath(); g.moveTo(L, Y(v)); g.lineTo(w - R, Y(v)); g.stroke(); g.fillText(v, 14 * d, Y(v) + 3 * d); }
    curves.g.forEach((ys, j) => { g.strokeStyle = COLS[j]; g.lineWidth = 2 * d; g.beginPath(); ys.forEach((v, i) => i ? g.lineTo(X(curves.mus[i]), Y(v)) : g.moveTo(X(curves.mus[i]), Y(v))); g.stroke(); });
    g.setLineDash([4 * d, 3 * d]); g.strokeStyle = css('--muted'); g.beginPath(); g.moveTo(X(P.ROUTH), T); g.lineTo(X(P.ROUTH), h - B); g.stroke(); g.setLineDash([]);
    g.fillStyle = css('--muted'); g.fillText('Routh limit', X(P.ROUTH) + 4 * d, T + 10 * d);
    g.strokeStyle = css('--fg'); g.lineWidth = 2 * d; g.beginPath(); g.moveTo(X(S.mu), T); g.lineTo(X(S.mu), h - B); g.stroke();
    NAMES.forEach((k, j) => { g.fillStyle = COLS[j]; g.beginPath(); g.arc(X(S.mu), Y(S.lin[k].growth), 4 * d, 0, 7); g.fill(); g.fillText(k === 'L4' ? 'L4/5' : k, L + 6 * d + j * 40 * d, T + 22 * d); });
  }

  function drift(c, p) {
    const d = size(c), g = c.getContext('2d'), w = c.width, h = c.height; g.clearRect(0, 0, w, h); g.font = `${11 * d}px system-ui`; g.fillStyle = css('--muted');
    if (!p || p.hist.length < 4) { g.fillText('launch a particle to see its Jacobi-constant error', 10 * d, h / 2); return; }
    const t = [], v = []; for (let i = 0; i < p.hist.length; i += 2) { t.push(p.hist[i]); v.push(p.hist[i + 1]); }
    const lo = Math.min(-16, Math.min(...v) - 0.3), hi = Math.max(-6, Math.max(...v) + 0.3), t0 = t[0], t1 = t[t.length - 1] || t0 + 1, L = 34 * d;
    const X = x => L + (x - t0) / (t1 - t0 || 1) * (w - L - 8 * d), Y = y => h - 18 * d - (y - lo) / (hi - lo) * (h - 26 * d);
    g.strokeStyle = css('--line'); for (let e = Math.ceil(lo); e <= hi; e += 2) { g.beginPath(); g.moveTo(L, Y(e)); g.lineTo(w, Y(e)); g.stroke(); g.fillText('1e' + e, 2 * d, Y(e) + 3 * d); }
    g.strokeStyle = `hsl(${p.hue},75%,55%)`; g.lineWidth = 1.8 * d; g.beginPath(); t.forEach((x, i) => i ? g.lineTo(X(x), Y(v[i])) : g.moveTo(X(x), Y(v[i]))); g.stroke();
    g.fillStyle = css('--muted'); g.fillText('|ΔC| vs time', L + 4 * d, 12 * d);
  }
  G.Plots = { stability, drift };
})(window);

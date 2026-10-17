/* scene.js — everything drawn on the main canvas. Reads the state, never changes it.
   Two layers: a cached "field" (potential, forbidden zone, zero-velocity curves) that only
   changes with μ / zoom / selection, and a per-frame layer (points, trails, particles). */
(function (G) {
  'use strict';
  const P = G.Physics, field = document.createElement('canvas');
  const LCOL = { L1: '#e4572e', L2: '#e0a100', L3: '#2e9e6a' };
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  // Marching squares: for each of the 16 corner patterns, which cell edges (0 top,1 right,2 bottom,3 left) a contour joins.
  const SEG = [[], [[3,2]], [[2,1]], [[3,1]], [[0,1]], [[0,3],[2,1]], [[0,2]], [[0,3]], [[0,3]], [[0,2]], [[0,1],[3,2]], [[0,1]], [[3,1]], [[2,1]], [[3,2]], []];

  const toPx = (S, W) => { const k = W / (2 * S.half); return (x, y) => [(x - S.cx) * k + W / 2, W / 2 - (y - S.cy) * k]; };
  const toWorld = (S, W) => { const k = W / (2 * S.half); return (a, b) => [(a - W / 2) / k + S.cx, -(b - W / 2) / k + S.cy]; };
  const spin = (S, x, y, t) => { if (S.frame !== 'inertial') return [x, y]; const c = Math.cos(t), s = Math.sin(t); return [x * c - y * s, x * s + y * c]; };

  function buildField(S, W, dpr) {
    field.width = field.height = W; const g = field.getContext('2d'), N = 180, M = N + 1, mu = S.mu, d = 2 * S.half / N;
    const x0 = S.cx - S.half, y0 = S.cy - S.half, px = toPx(S, W), Z = new Float32Array(M * M);
    for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) Z[j * M + i] = 2 * P.omega(x0 + i * d, y0 + j * d, mu);
    if (S.hill && S.sel) {                                   // forbidden zone for the selected particle: 2Ω < C
      g.fillStyle = css('--forbidden'); const c = Math.ceil(W / N) + 1;
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (Z[j * M + i] < S.sel.C0) { const [a, b] = px(x0 + i * d, y0 + (j + 1) * d); g.fillRect(a, b, c, c); }
    }
    const contour = (lv, col, lw, alpha) => {
      g.strokeStyle = col; g.lineWidth = lw * dpr; g.globalAlpha = alpha; g.beginPath();
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const a = Z[(j + 1) * M + i], b = Z[(j + 1) * M + i + 1], c = Z[j * M + i + 1], e = Z[j * M + i];
        for (const [p, q] of SEG[(a > lv) * 8 + (b > lv) * 4 + (c > lv) * 2 + (e > lv)]) {
          const pts = [p, q].map(k => { let t, x, y;
            if (k === 0) { t = (lv - a) / (b - a); x = x0 + (i + t) * d; y = y0 + (j + 1) * d; }
            else if (k === 1) { t = (lv - b) / (c - b); x = x0 + (i + 1) * d; y = y0 + (j + 1 - t) * d; }
            else if (k === 2) { t = (lv - e) / (c - e); x = x0 + (i + t) * d; y = y0 + j * d; }
            else { t = (lv - a) / (e - a); x = x0 + i * d; y = y0 + (j + 1 - t) * d; }
            return px(x, y); });
          g.moveTo(...pts[0]); g.lineTo(...pts[1]);
        }
      }
      g.stroke(); g.globalAlpha = 1;
    };
    for (let c = 2.8; c < 6; c += 0.25) contour(c, css('--muted'), 0.6, 0.5);
    ['L1', 'L2', 'L3'].forEach(k => contour(S.eq[k].C, LCOL[k], 1.8, 1));   // gateways: C at each saddle point
  }

  function arrow(g, x, y, dx, dy, col, w) {
    g.strokeStyle = col; g.fillStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx, y + dy); g.stroke();
    const a = Math.atan2(dy, dx), h = 5 * w; g.beginPath(); g.moveTo(x + dx, y + dy);
    g.lineTo(x + dx - h * Math.cos(a - 0.4), y + dy - h * Math.sin(a - 0.4)); g.lineTo(x + dx - h * Math.cos(a + 0.4), y + dy - h * Math.sin(a + 0.4)); g.fill();
  }

  function draw(canvas, S, drag) {
    const W = canvas.width, g = canvas.getContext('2d'), dpr = W / canvas.getBoundingClientRect().width, px = toPx(S, W), mu = S.mu;
    const key = [S.mu, S.half, S.cx, S.cy, S.hill, S.sel && S.sel.C0, W, document.documentElement.className].join('|');
    if (S.dirty || key !== S.fieldKey) { buildField(S, W, dpr); S.fieldKey = key; S.dirty = false; }
    g.clearRect(0, 0, W, W);
    g.save(); g.translate(W / 2, W / 2); if (S.frame === 'inertial') g.rotate(-S.t); g.drawImage(field, -W / 2, -W / 2); g.restore();
    g.font = `${12 * dpr}px system-ui`; g.lineCap = 'round';
    if (S.frame === 'inertial') {                             // orbits of the two stars about the barycentre
      g.strokeStyle = css('--muted'); g.globalAlpha = 0.5; g.setLineDash([4 * dpr, 4 * dpr]);
      for (const r of [mu, 1 - mu]) { const [cx, cy] = px(0, 0); g.beginPath(); g.arc(cx, cy, r * W / (2 * S.half), 0, 7); g.stroke(); }
      g.setLineDash([]); g.globalAlpha = 1;
    }
    for (const [name, p] of Object.entries(S.eq)) {            // equilibria; arrows show the real eigen-directions
      const [a, b] = px(...spin(S, p.x, p.y, S.t));
      if (S.frame === 'rotating' && S.modes && LCOL[name]) for (const m of S.lin[name].dirs) {
        const L = 42 * dpr, col = m.lambda > 0 ? '#e4572e' : '#2a7de1';       // red: unstable direction, blue: stable
        for (const sg of [1, -1]) arrow(g, a, b, sg * m.v[0] * L, -sg * m.v[1] * L, col, 1.6 * dpr);
      }
      g.fillStyle = css('--fg'); g.beginPath(); g.arc(a, b, 3.5 * dpr, 0, 7); g.fill(); g.fillText(name, a + 7 * dpr, b - 6 * dpr);
    }
    const [s1x, s1y] = px(...spin(S, -mu, 0, S.t)), [s2x, s2y] = px(...spin(S, 1 - mu, 0, S.t));
    g.fillStyle = css('--star1'); g.beginPath(); g.arc(s1x, s1y, 5 * dpr + 7 * dpr * (1 - mu) ** 0.33, 0, 7); g.fill();
    g.fillStyle = css('--star2'); g.beginPath(); g.arc(s2x, s2y, 3 * dpr + 6 * dpr * Math.cbrt(mu), 0, 7); g.fill();
    for (const p of S.parts) {                                 // trails fade towards the past
      const n = p.trail.length / 3, a = p.alive ? 1 : 0.4;
      for (let seg = 0; seg < 3; seg++) {
        const i0 = Math.floor(n * seg / 3), i1 = Math.min(n, Math.floor(n * (seg + 1) / 3) + 1); if (i1 - i0 < 2) continue;
        g.strokeStyle = `hsla(${p.hue},75%,55%,${a * (0.2 + 0.3 * seg)})`; g.lineWidth = 1.4 * dpr; g.beginPath();
        for (let i = i0; i < i1; i++) { const [a1, b1] = px(...spin(S, p.trail[3 * i], p.trail[3 * i + 1], p.trail[3 * i + 2])); i === i0 ? g.moveTo(a1, b1) : g.lineTo(a1, b1); }
        g.stroke();
      }
      const [hx, hy] = px(...spin(S, p.s[0], p.s[1], p.t)); g.fillStyle = `hsla(${p.hue},80%,55%,${a})`;
      g.beginPath(); g.arc(hx, hy, (p === S.sel ? 4.5 : 2.8) * dpr, 0, 7); g.fill();
      if (p === S.sel) { g.strokeStyle = css('--fg'); g.lineWidth = dpr; g.stroke(); }
    }
    if (drag) { const [a, b] = px(drag.x0, drag.y0), [c, d] = px(drag.x1, drag.y1); arrow(g, a, b, c - a, d - b, css('--accent'), 2 * dpr); }
  }
  G.Scene = { draw, toWorld };
})(window);

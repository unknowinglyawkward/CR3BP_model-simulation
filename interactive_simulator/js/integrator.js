/* integrator.js — adaptive Dormand–Prince 5(4) (the scheme behind MATLAB's ode45).
   Each step computes a 5th-order result and a 4th-order estimate; their difference is the error.
   Steps shrink automatically near a star, where the motion is fast. */
(function (G) {
  'use strict';
  const TOL = 1e-11, H_MAX = 0.02, TRAIL_DT = 0.015, HIST_DT = 0.1;
  const A = [[], [1/5], [3/40, 9/40], [44/45, -56/15, 32/9], [19372/6561, -25360/2187, 64448/6561, -212/729],
             [9017/3168, -355/33, 46732/5247, 49/176, -5103/18656], [35/384, 0, 500/1113, 125/192, -2187/6784, 11/84]];
  const E = [71/57600, 0, -71/16695, 71/1920, -17253/339200, 22/525, -1/40];   // 5th − 4th order weights
  const k = Array.from({ length: 7 }, () => new Float64Array(4)), tmp = new Float64Array(4);

  function step(s, h, mu) {
    G.Physics.derivative(s, mu, k[0]);
    for (let st = 1; st < 7; st++) {
      for (let i = 0; i < 4; i++) { let a = 0; for (let j = 0; j < st; j++) a += A[st][j] * k[j][i]; tmp[i] = s[i] + h * a; }
      G.Physics.derivative(tmp, mu, k[st]);
    }
    let err = 0;
    for (let i = 0; i < 4; i++) {
      let d = 0; for (let j = 0; j < 7; j++) d += E[j] * k[j][i];
      err = Math.max(err, Math.abs(h * d) / (TOL + TOL * Math.max(Math.abs(s[i]), Math.abs(tmp[i]))));
    }
    return { err, y: Float64Array.from(tmp) };
  }

  /* Advance particle p by time T. p = {s, t, h, C0, alive, status, trail:[x,y,t,…], hist:[t,log10|ΔC|,…]} */
  function advance(p, T, mu) {
    const s = p.s; let rem = T, guard = 0;
    while (rem > 1e-12 && guard++ < 5000) {
      const r = Math.min(Math.hypot(s[0] + mu, s[1]), Math.hypot(s[0] - 1 + mu, s[1]));
      if (r < 0.008) { p.alive = false; p.status = 'hit a star'; break; }
      if (s[0] * s[0] + s[1] * s[1] > 36) { p.alive = false; p.status = 'escaped'; break; }
      const h = Math.min(p.h, rem, H_MAX), q = step(s, h, mu);
      if (q.err > 1) { p.h = h * Math.max(0.2, 0.9 * q.err ** -0.2); continue; }   // reject, retry smaller
      s.set(q.y); rem -= h; p.t += h; p.acc += h; p.sinceHist += h;
      p.h = h * Math.min(5, 0.9 * Math.max(q.err, 1e-10) ** -0.2);
      if (p.acc >= TRAIL_DT) { p.acc = 0; p.trail.push(s[0], s[1], p.t); }
      if (p.sinceHist >= HIST_DT) { p.sinceHist = 0; p.hist.push(p.t, Math.log10(Math.abs(G.Physics.jacobi(s, mu) - p.C0) + 1e-17)); }
    }
  }
  G.Integrator = { advance, step };
})(window);

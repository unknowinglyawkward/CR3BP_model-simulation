/* physics.js — the mathematical model of the CR3BP. No DOM, no drawing.
   Units: G = 1, m1 + m2 = 1, primary separation = 1, rotation rate = 1.
   m1 (mass 1-mu) sits at (-mu, 0), m2 (mass mu) at (1-mu, 0) in the rotating frame. */
(function (G) {
  'use strict';
  const dists = (x, y, mu) => [Math.max(Math.hypot(x + mu, y), 1e-9), Math.max(Math.hypot(x - 1 + mu, y), 1e-9)];

  // Effective potential: Omega = (x²+y²)/2 + (1-mu)/r1 + mu/r2
  function omega(x, y, mu) { const [r1, r2] = dists(x, y, mu); return 0.5 * (x * x + y * y) + (1 - mu) / r1 + mu / r2; }
  // Jacobi constant C = 2·Omega − v², the one conserved quantity. Used as the accuracy meter.
  const jacobi = (s, mu) => 2 * omega(s[0], s[1], mu) - s[2] * s[2] - s[3] * s[3];

  // Equations of motion. State s = [x, y, vx, vy]; derivative written into `out`.
  //   x'' = 2y' + Ω_x,   y'' = −2x' + Ω_y      (2y', −2x' are the Coriolis terms)
  function derivative(s, mu, out) {
    const x = s[0], y = s[1], [r1, r2] = dists(x, y, mu), a = (1 - mu) / r1 ** 3, b = mu / r2 ** 3;
    out[0] = s[2]; out[1] = s[3];
    out[2] = 2 * s[3] + x - a * (x + mu) - b * (x - 1 + mu);
    out[3] = -2 * s[2] + y - (a + b) * y;
  }

  // Second derivatives of Omega (the Hessian), needed for linearisation.
  function hessian(x, y, mu) {
    const [r1, r2] = dists(x, y, mu), k1 = (1 - mu) / r1 ** 3, k2 = mu / r2 ** 3, d1 = x + mu, d2 = x - 1 + mu;
    return { xx: 1 - k1 - k2 + 3 * (k1 * d1 * d1 / r1 ** 2 + k2 * d2 * d2 / r2 ** 2),
             yy: 1 - k1 - k2 + 3 * y * y * (k1 / r1 ** 2 + k2 / r2 ** 2),
             xy: 3 * y * (k1 * d1 / r1 ** 2 + k2 * d2 / r2 ** 2) };
  }

  // Equilibria: grad(Omega) = 0. L1–L3 are roots of Omega_x(x,0) (one root per bracket, found by bisection);
  // L4/L5 are exact: r1 = r2 = 1.
  function equilibria(mu) {
    const f = x => x - (1 - mu) * (x + mu) / Math.abs(x + mu) ** 3 - mu * (x - 1 + mu) / Math.abs(x - 1 + mu) ** 3, e = 1e-9;
    const bisect = (a, b) => { let fa = f(a); for (let i = 0; i < 80; i++) { const m = (a + b) / 2, fm = f(m); if (fa * fm <= 0) b = m; else { a = m; fa = fm; } } return (a + b) / 2; };
    const xy = { L1: [bisect(-mu + e, 1 - mu - e), 0], L2: [bisect(1 - mu + e, 2), 0], L3: [bisect(-2, -mu - e), 0],
                 L4: [0.5 - mu, Math.sqrt(3) / 2], L5: [0.5 - mu, -Math.sqrt(3) / 2] };
    const out = {};
    for (const k in xy) out[k] = { x: xy[k][0], y: xy[k][1], C: 2 * omega(xy[k][0], xy[k][1], mu) };
    return out;
  }

  // Linearisation about an equilibrium: ζ' = Aζ. The characteristic polynomial is
  //   λ⁴ + (4 − Ωxx − Ωyy) λ² + (Ωxx Ωyy − Ωxy²) = 0   → solved in closed form for λ².
  function linearize(p, mu) {
    const H = hessian(p.x, p.y, mu), A = 4 - H.xx - H.yy, B = H.xx * H.yy - H.xy ** 2, D = A * A - 4 * B, ev = [];
    if (D >= 0) {
      for (const s of [(-A + Math.sqrt(D)) / 2, (-A - Math.sqrt(D)) / 2]) {
        if (s >= 0) { const l = Math.sqrt(s); ev.push({ re: l, im: 0 }, { re: -l, im: 0 }); }
        else { const w = Math.sqrt(-s); ev.push({ re: 0, im: w }, { re: 0, im: -w }); }
      }
    } else {                                   // complex λ²: a quartet ±a ± ib
      const m = Math.sqrt(B), re = Math.sqrt((m - A / 2) / 2), im = Math.sqrt((m + A / 2) / 2);
      ev.push({ re, im }, { re: -re, im: -im }, { re, im: -im }, { re: -re, im });
    }
    // Real eigenvalue λ → position part of its eigenvector: (1, (λ²−Ωxx)/(2λ+Ωxy)).
    const dirs = ev.filter(l => l.im === 0 && Math.abs(l.re) > 1e-9).map(l => {
      const v = [1, (l.re * l.re - H.xx) / (2 * l.re + H.xy)], n = Math.hypot(v[0], v[1]); return { lambda: l.re, v: [v[0] / n, v[1] / n] };
    });
    const growth = Math.max(...ev.map(l => l.re));
    return { ev, growth, stable: growth < 1e-9, dirs, H };
  }
  G.Physics = { omega, jacobi, derivative, hessian, equilibria, linearize, ROUTH: (1 - Math.sqrt(23 / 27)) / 2 };
})(window);

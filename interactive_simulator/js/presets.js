/* presets.js — loads systems/scenarios from data/presets.json and turns particle specs into states.
   fetch() is blocked on file:// pages, so there is also a file picker (and a tiny built-in fallback). */
(function (G) {
  'use strict';
  const FALLBACK = { systems: [{ name: 'Earth–Moon', mu: 0.01215 }], scenarios: [{ name: 'Tadpole around L4', mu: 0.01215, particles: [{ at: 'L4', dx: 0.04, dy: 0 }] }] };

  async function load(url) {
    try { const r = await fetch(url); if (!r.ok) throw new Error(r.status); return { data: await r.json(), ok: true }; }
    catch (e) { return { data: FALLBACK, ok: false }; }
  }
  const merge = (a, b) => ({ systems: [...a.systems, ...(b.systems || [])], scenarios: [...a.scenarios, ...(b.scenarios || [])] });

  // Turn one particle spec into [state, …] for the given equilibria / mu.
  function resolve(spec, eq, mu) {
    if (spec.swarm) {
      const c = eq[spec.swarm], out = [];
      for (let i = 0; i < (spec.count || 30); i++) { const a = Math.random() * 2 * Math.PI, r = spec.radius * Math.sqrt(Math.random()); out.push([c.x + r * Math.cos(a), c.y + r * Math.sin(a), 0, 0]); }
      return out;
    }
    if (spec.around === 'secondary') {            // prograde circular orbit of radius r about m2; rotating-frame vy = vc − (offset x)
      const r = spec.r; return [[1 - mu + r, 0, 0, Math.sqrt(mu / r) - r]];
    }
    if (spec.at) { const c = eq[spec.at]; return [[c.x + (spec.dx || 0), c.y + (spec.dy || 0), spec.vx || 0, spec.vy || 0]]; }
    return [[spec.x, spec.y, spec.vx || 0, spec.vy || 0]];
  }
  G.Presets = { load, merge, resolve };
})(window);

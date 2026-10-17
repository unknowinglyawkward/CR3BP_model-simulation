/* app.js — state, user interface and the animation loop. It wires the other files together:
   Presets → state → Integrator (advance) → Scene / Plots (draw). */
(function (G) {
  'use strict';
  const P = G.Physics, $ = id => document.getElementById(id), canvas = $('scene');
  const S = { mu: 0.01215, half: 1.2, cx: 0, cy: 0, center: 'bary', frame: 'rotating', play: true, speed: 1, trail: 1500,
              hill: true, modes: true, t: 0, parts: [], sel: null, eq: null, lin: null, dirty: true, presets: null };
  let hue = 0, drag = null;

  // ---- state changes ----
  function setMu(mu) {
    S.mu = mu; S.eq = P.equilibria(mu); S.lin = {}; for (const k in S.eq) S.lin[k] = P.linearize(S.eq[k], mu);
    for (const p of S.parts) { p.C0 = P.jacobi(p.s, mu); p.hist.length = 0; }       // new potential → new baseline
    $('mu').value = 1000 * Math.sqrt(mu / 0.5); $('muo').textContent = mu < 0.001 ? mu.toExponential(2) : mu.toFixed(4); updateCenter(); S.dirty = true;
  }
  function updateCenter() {
    if (S.frame === 'inertial') S.center = 'bary'; $('ctr').value = S.center; $('ctr').disabled = S.frame === 'inertial';
    const c = S.center === 'bary' ? { x: 0, y: 0 } : S.center === 'm2' ? { x: 1 - S.mu, y: 0 } : S.eq[S.center]; S.cx = c.x; S.cy = c.y; S.dirty = true;
  }
  function spawn(s0) {
    const s = Float64Array.from(s0);
    S.parts.push(S.sel = { s, t: S.t, h: 1e-3, acc: 0, sinceHist: 0, C0: P.jacobi(s, S.mu), alive: true, status: 'bounded', trail: [s[0], s[1], S.t], hist: [], hue: (hue += 47) % 360 });
    if (S.parts.length > 120) S.parts.shift(); S.dirty = true;
  }
  function runScenario(sc) {
    S.parts.length = 0; S.sel = null; setMu(sc.mu); S.half = sc.half || 1.2; S.frame = sc.frame || 'rotating'; S.center = sc.center || 'bary';
    $('zm').value = S.half; $('zmo').textContent = S.half.toFixed(2); $('frm').value = S.frame; updateCenter();
    for (const spec of sc.particles) for (const s0 of G.Presets.resolve(spec, S.eq, S.mu)) spawn(s0);
    $('note').textContent = sc.note || '';
  }

  // ---- UI ----
  function fillSelects() {
    $('sys').innerHTML = '<option value="">Binary system…</option>' + S.presets.systems.map((s, i) => `<option value="${i}">${s.name}  (μ=${s.mu})</option>`).join('');
    $('scn').innerHTML = '<option value="">Scenario…</option>' + S.presets.scenarios.map((s, i) => `<option value="${i}">${s.name}</option>`).join('');
  }
  function bind() {
    const num = (id, f) => $(id).addEventListener('input', e => f(+e.target.value));
    num('mu', v => setMu(0.5 * (v / 1000) ** 2)); num('spd', v => { S.speed = v; $('spdo').textContent = v.toFixed(2) + '×'; });
    num('trl', v => { S.trail = v; $('trlo').textContent = v; }); num('zm', v => { S.half = v; $('zmo').textContent = v.toFixed(2); S.dirty = true; });
    $('sys').onchange = e => { const s = S.presets.systems[e.target.value]; if (s) { setMu(s.mu); $('note').textContent = s.note || ''; } e.target.value = ''; };
    $('scn').onchange = e => { const s = S.presets.scenarios[e.target.value]; if (s) runScenario(s); e.target.value = ''; };
    $('ctr').onchange = e => { S.center = e.target.value; updateCenter(); }; $('frm').onchange = e => { S.frame = e.target.value; updateCenter(); };
    $('hill').onchange = e => { S.hill = e.target.checked; S.dirty = true; }; $('modes').onchange = e => S.modes = e.target.checked;
    $('pp').onclick = () => { S.play = !S.play; $('pp').textContent = S.play ? 'Pause' : 'Play'; };
    $('clr').onclick = () => { S.parts.length = 0; S.sel = null; S.dirty = true; };
    $('pfile').onchange = async e => { try { S.presets = G.Presets.merge(S.presets, JSON.parse(await e.target.files[0].text())); fillSelects(); $('note').textContent = 'Presets added.'; } catch (x) { $('note').textContent = 'Could not read that JSON file.'; } };
    const at = e => { const r = canvas.getBoundingClientRect(), k = canvas.width / r.width; return G.Scene.toWorld(S, canvas.width)((e.clientX - r.left) * k, (e.clientY - r.top) * k); };
    canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); const [x, y] = at(e); drag = { x0: x, y0: y, x1: x, y1: y }; });
    canvas.addEventListener('pointermove', e => { if (drag) [drag.x1, drag.y1] = at(e); });
    canvas.addEventListener('pointerup', () => { if (!drag) return; const k = 0.8; let [x, y] = [drag.x0, drag.y0];
      let vx = (drag.x1 - drag.x0) * k, vy = (drag.y1 - drag.y0) * k;
      if (S.frame === 'inertial') { const c = Math.cos(-S.t), s = Math.sin(-S.t); [x, y, vx, vy] = [x * c - y * s, x * s + y * c, vx * c - vy * s, vx * s + vy * c]; }   // screen → rotating coords
      spawn([x, y, vx, vy]); drag = null; });
    addEventListener('keydown', e => { if (/INPUT|SELECT/.test(e.target.tagName)) return; if (e.code === 'Space') { e.preventDefault(); $('pp').click(); } if (e.key === 'c') $('clr').click(); });
    new ResizeObserver(fit).observe(canvas); matchMedia('(prefers-color-scheme:dark)').addEventListener('change', () => { S.dirty = true; });
  }
  function fit() { const r = canvas.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2); canvas.width = canvas.height = Math.round(r.width * d); S.dirty = true; }

  function readout() {
    const l4 = S.lin.L4, p = S.sel, row = (a, b, c = '') => `<dt>${a}</dt><dd class="${c}">${b}</dd>`, maxd = p && p.hist.length ? Math.max(...p.hist.filter((_, i) => i % 2)) : null;
    $('ro').innerHTML = row('μ  /  m₁:m₂', `${S.mu.toPrecision(4)}  /  ${((1 - S.mu) / S.mu).toFixed(2)} : 1`) +
      row('L4 / L5', l4.stable ? `stable (μ < ${P.ROUTH.toFixed(4)})` : `unstable, Re λ = ${l4.growth.toFixed(3)}`, l4.stable ? 'ok' : 'bad') +
      row('L1 · L2 · L3  x', ['L1', 'L2', 'L3'].map(k => S.eq[k].x.toFixed(4)).join(' · ')) +
      row('C at L1 · L2 · L3 · L4', ['L1', 'L2', 'L3', 'L4'].map(k => S.eq[k].C.toFixed(3)).join(' · ')) +
      row('Particles alive', `${S.parts.filter(q => q.alive).length} / ${S.parts.length}`) +
      (p ? row('Selected: C', P.jacobi(p.s, S.mu).toFixed(6)) + row('Selected: max |ΔC|', maxd === null ? '—' : '1e' + maxd.toFixed(1)) + row('Selected: status', p.status, p.alive ? 'ok' : 'bad') : '');
  }

  // ---- loop ----
  let last = performance.now(), acc = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (S.play) { S.t += dt * S.speed; for (const p of S.parts) if (p.alive) { G.Integrator.advance(p, dt * S.speed, S.mu); const m = S.trail * 3; if (p.trail.length > m) p.trail.splice(0, p.trail.length - m); } }
    G.Scene.draw(canvas, S, drag);
    if ((acc += dt) > 0.15) { acc = 0; readout(); G.Plots.stability($('stab'), S); G.Plots.drift($('drift'), S.sel); }
    requestAnimationFrame(frame);
  }

  (async function start() {
    const { data, ok } = await G.Presets.load('data/presets.json'); S.presets = data; fillSelects(); bind(); fit(); setMu(S.mu);
    if (!ok) $('note').textContent = 'Could not fetch data/presets.json (page opened from disk?). Use “Add presets…” or serve the folder: python -m http.server';
    else runScenario(S.presets.scenarios[0]);
    requestAnimationFrame(frame);
  })();
})(window);

# CR3BP explorer

    index.html         page structure + the "How it works" text
    css/style.css      layout and light/dark theme (colours are CSS variables)
    data/presets.json  systems (μ values) and scenarios (μ + particles) — edit this to add presets
    js/physics.js      the model: potential, equations of motion, equilibria, linearisation
    js/integrator.js   adaptive Dormand–Prince 5(4)
    js/presets.js      loads presets.json, turns particle specs into initial states
    js/scene.js        main canvas: field, contours, points, trails
    js/plots.js        stability-vs-μ chart and Jacobi-error chart
    js/app.js          state, controls, animation loop

Run: `python -m http.server` in this folder, then open http://localhost:8000
(or double-click index.html and use "Add presets…" to load data/presets.json).
Scripts are plain (no modules/build step) so they also work from disk.

# Changelog

## 0.1.0 — 2026-11-07

First open-source split.

- Split the galaxy console into independent modules: data, tuning, scene, galaxy,
  black hole, project bodies, DOM stars, projection, target card, leader line,
  console view, tuning panel, signals, HUD.
- Removed the previous single-file `src.js` bundle and dead UI branches.
- Added a host-facing API: `openProject`, `closeProject`, `selectProject`,
  `setProjectState`, `pushSignal`, `setTune`, `getTune`, `setMotion`, `setDemo`,
  `resize`, `destroy`.
- Added fictional demo data (Orion / Lyra / Draco / Phoenix / HELIOS / Vega / Atlas).
- Added README, data-model, architecture, black-hole and tuning docs.
- Added headless smoke test (`npm run smoke`) and GitHub Pages workflow.
- Requires a mount point and a `projects` array; everything else is optional.

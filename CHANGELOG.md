# Changelog

## 0.2.0 — 2026-11-07

- Reworked accretion-disk flow: cloud density plus independent X/Y translation
  speeds, replacing the differential-rotation model that produced concentric
  rings at low speed.
- Added galaxy arm controls: `armInner`, `armOuter`, `armWidth`, applied in the
  vertex shader so they tune without rebuilding 140k point buffers.
- Added pluggable project-star and planet skins. Built-ins: `classic`, `sun`
  (granulated surface, corona particles, activity-driven flares), and `rock`,
  `ice`, `lava` planets.
- Added per-project star-skin selects and a global planet-skin select to the
  tuning panel; selections persist in localStorage.
- Project bodies now render inside the main scene, so the black hole occludes
  them physically; DOM labels fade with the same shadow circle.
- Smaller default project stars and opaque satellites, dimmer orbit rings and
  slower orbital speed, all exposed as tuning values.
- Added background controls: image on/off, image URL, and solid colour fallback.

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
- Added headless smoke test (`npm run smoke`) and a GitHub Pages workflow template (`docs/github-pages.yml`).
- Requires a mount point and a `projects` array; everything else is optional.

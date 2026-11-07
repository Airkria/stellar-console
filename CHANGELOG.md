# Changelog

## 0.4.0 — 2026-11-08

- Opened the disk flow ranges: X/Y speed now -5..5, tiling 0.5..40 / 0.1..8.
- Added `edgeBoost` and view-dependent `diskThickness()`: near edge-on views
  thicken the near side of the disk so the black-hole shadow no longer reads as
  a hard horizontal cut.
- Replaced the filled star glow sprites with a Fresnel `glow-shell`: bright on
  the silhouette, transparent in the centre. Added `starCloudDensity` and
  `starCloudDrag`; `starCloudInner` now only lifts the shell interior.
- Split the residual background glow into individual controls: `cssNebula`,
  `hazeAlpha`, `galaxyAura`, `nebulaClouds`, `lensedSky`, under the `spaceGlow`
  master.
- The outer star river is now independent of the galaxy rotation, and the deep
  star layer follows `riverSpeed`; added `galaxySpeed` for the main disk.

## 0.3.0 — 2026-11-07

- Added independent X/Y cloud tiling (`flowTilingX` / `flowTilingY`) on top of
  density and flow speed.
- Added `inflowSpeed` for the infalling particle stream and `riverSpeed` for the
  outer star-river rotation.
- Added `starCloudThickness`, `starCloudEdge` and `starCloudInner` controls for
  the star's glowing cloud (both classic and sun skins).
- Fixed black-hole occlusion: project bodies nearer than the hole are composited
  after the BH pass and cover it; bodies behind are occluded by it. DOM labels
  follow the same depth rule.
- Added `spaceGlow` master control. Setting it to 0 removes the CSS nebula,
  galaxy haze, distant stars and lensed sky, so a pure-black backdrop is actually
  black.

## 0.2.1 — 2026-11-07

- Flow textures are generated at 512² to reduce visible repetition at high speeds.
- Planet skins are selectable per project (not only globally), matching the
  per-project star-skin control.

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

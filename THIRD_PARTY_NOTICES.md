# Third-party notices

## three.js

- https://threejs.org/
- MIT License
- Used as the WebGL rendering library (`three`, including `OrbitControls`,
  `EffectComposer`, `RenderPass`, `ShaderPass`, `UnrealBloomPass`).

## Black hole rendering references

The geodesic integration and accretion-disk shading in
`src/stellar/blackhole-shader.js` were written for this project, following the
publicly documented Schwarzschild photon-orbit formulation. The implementation
approach was informed by:

- [rossning92/Blackhole](https://github.com/rossning92/Blackhole)
- The papers listed in that project's README and in `docs/black-hole.md`.

No source file from that project is vendored in this repository.

## Demo data

All project names, sections, decisions, signals and people in `src/demo/` are
fictional. They do not describe any real project or vault.

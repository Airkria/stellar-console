import * as THREE from 'three';
import { makeGlowTexture } from './textures.js';
import { getPlanetSkin, getStarSkin } from './skins/index.js';

const STATE_ALPHA = { run: 1, wait: 0.9, alert: 1, idle: 0.62, paused: 0.4, archived: 0.28 };
const STATE_ACTIVITY = { run: 1.2, wait: 0.75, alert: 1.5, idle: 0.5, paused: 0.22, archived: 0.1 };

/**
 * 3D project bodies. Each project is a star from a pluggable skin, with
 * satellites orbiting as opaque 3D planets from another skin registry.
 *
 * The group lives in the main galaxy scene (not an overlay pass), so the black
 * hole really occludes it and the DOM layer can fade in sync.
 */
export function createBodies(app, S, refs) {
  let glowTexture = null;

  function clear() {
    if (!refs.bodyGroup) return;
    for (const entry of refs.projectBodies) {
      entry.group.parent?.remove(entry.group);
      entry.star.dispose();
      for (const orbit of entry.orbits) {
        orbit.planet.dispose();
        orbit.ringGeometry.dispose();
        orbit.ringMaterial.dispose();
      }
    }
    refs.frontRoot?.clear?.();
    S.galaxyGroup?.remove(refs.backRoot);
    refs.backRoot = null;
    refs.bodyGroup = null;
    refs.projectBodies = [];
  }

  function build() {
    clear();
    if (!glowTexture) glowTexture = makeGlowTexture('rgba(255,255,255,1)', 'rgba(255,210,170,.55)');

    const backRoot = new THREE.Group();
    S.galaxyGroup.add(backRoot);
    refs.backRoot = backRoot;
    refs.bodyGroup = backRoot;
    refs.frontRoot?.clear?.();
    refs.projectBodies = [];

    for (const p of app.data.projects) {
      if (p.core) continue;

      const baseRadius = 0.05 + p.p * 0.009;
      const baseColor = new THREE.Color().setHSL(p.hue / 360, 0.85, 0.6);
      const group = new THREE.Group();
      group.position.set(p.x, 0.035, p.y);
      backRoot.add(group);

      // --- star ---------------------------------------------------------
      const starGroup = new THREE.Group();
      group.add(starGroup);
      const starSkin = getStarSkin(app.skinState.starFor(p));
      const star = starSkin.create({
        app,
        project: p,
        radius: baseRadius,
        color: baseColor,
        glowTexture,
      });
      starGroup.add(star.object3D);

      // --- satellites ---------------------------------------------------
      const orbits = [];
      p.satellites.slice(0, 4).forEach((_, i) => {
        const orbitRadius = (0.22 + i * 0.16) * (0.6 + p.p * 0.05);
        const orbit = new THREE.Group();
        orbit.rotation.x = 0.28 + i * 0.26;
        orbit.rotation.z = (i - 1) * 0.22;
        group.add(orbit);

        const ringGeometry = new THREE.RingGeometry(orbitRadius * 0.995, orbitRadius * 1.005, 96);
        const ringMaterial = new THREE.MeshBasicMaterial({
          color: baseColor.clone().lerp(new THREE.Color(0xffffff), 0.45),
          transparent: true,
          opacity: 0.07,
          side: THREE.DoubleSide,
          depthWrite: false,
          depthTest: false,
          toneMapped: false,
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = -Math.PI / 2;
        orbit.add(ring);

        const pivot = new THREE.Group();
        orbit.add(pivot);

        const planetColor = new THREE.Color().setHSL(((p.hue + 55 + i * 95) % 360) / 360, 0.55, 0.58);
        const planetGroup = new THREE.Group();
        planetGroup.position.x = orbitRadius;
        pivot.add(planetGroup);

        const planetSkin = getPlanetSkin(app.skinState.planetFor(p));
        const planet = planetSkin.create({ app, project: p, color: planetColor, index: i });
        planetGroup.add(planet.object3D);

        orbits.push({
          orbit,
          pivot,
          planetGroup,
          ringMaterial,
          ringGeometry,
          planet,
          basePlanetRadius: 0.022 + 0.007 * (i % 2) + p.p * 0.0012,
          speed: (0.16 + i * 0.08) * (i % 2 ? -1 : 1),
          phase: Math.random() * Math.PI * 2,
        });
      });

      refs.projectBodies.push({
        p,
        group,
        starGroup,
        star,
        baseRadius,
        orbits,
        inFront: false,
        worldPos: new THREE.Vector3(),
      });
    }
  }

  function update(now) {
    if (!refs.bodyGroup) return;
    const t = now * 0.001;
    const tune = app.tune;
    if (refs.frontRoot && S.galaxyGroup) refs.frontRoot.rotation.y = S.galaxyGroup.rotation.y;
    const holeDistance = S.camera ? S.camera.position.length() : 0;

    for (const entry of refs.projectBodies) {
      const p = entry.p;
      // Solid occlusion: move the project between the pre-BH scene and the
      // post-BH overlay depending on whether it is nearer than the hole.
      entry.group.getWorldPosition(entry.worldPos);
      const inFront = !!S.camera && S.camera.position.distanceTo(entry.worldPos) < holeDistance - 0.01;
      if (inFront !== entry.inFront) {
        const root = inFront ? refs.frontRoot : refs.backRoot;
        root?.add(entry.group);
        entry.group.position.set(p.x, 0.035, p.y);
        entry.inFront = inFront;
      }
      const halo = tune[`planetHalo_${p.id}`] ?? 1;
      const stateAlpha = STATE_ALPHA[p.state] ?? 1;
      const activity = STATE_ACTIVITY[p.state] ?? 1;
      const focused = app.state.hovered === p.id || app.state.selected === p.id;

      entry.starGroup.scale.setScalar(entry.baseRadius * tune.starScale * tune.planetCore * (focused ? 1.08 : 1));
      entry.star.update(t, {
        stateAlpha,
        focused,
        halo,
        glowStrength: tune.planetGlow,
        activity,
        cloudThickness: tune.starCloudThickness,
        cloudEdge: tune.starCloudEdge,
        cloudInner: tune.starCloudInner,
        cloudDensity: tune.starCloudDensity,
        cloudDrag: tune.starCloudDrag,
      });

      for (const orbit of entry.orbits) {
        orbit.orbit.scale.setScalar(tune.orbitScale);
        orbit.ringMaterial.opacity = 0.07 * tune.orbitAlpha * stateAlpha;
        orbit.pivot.rotation.y = t * orbit.speed * tune.orbitSpeed + orbit.phase;
        orbit.planetGroup.scale.setScalar(
          orbit.basePlanetRadius * tune.planetSize * (focused ? 1.1 : 1),
        );
        orbit.planet.update(t, { stateAlpha, focused });
      }
    }
  }

  function rebuild() {
    build();
    app.requestRender?.();
  }

  function dispose() {
    clear();
    glowTexture?.dispose();
    glowTexture = null;
  }

  return { build, update, rebuild, dispose };
}

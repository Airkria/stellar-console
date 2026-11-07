import * as THREE from 'three';
import { makeGlowTexture } from './textures.js';

/**
 * 3D project bodies: each project is a small emissive star, and its
 * satellites (plugins / extensions) orbit as coloured 3D spheres.
 *
 * These live in their own scene and are composited after the black-hole pass,
 * so project labels stay readable even in front of the lensing region.
 */
export function createBodies(app, S, refs) {
  function build() {
    refs.bodyScene = new THREE.Scene();
    refs.bodyGroup = new THREE.Group();
    refs.bodyScene.add(refs.bodyGroup);
    refs.projectBodies = [];

    const sphereGeo = new THREE.SphereGeometry(1, 32, 24);
    const satGeo = new THREE.SphereGeometry(1, 20, 14);
    const glowTex = makeGlowTexture('rgba(255,255,255,1)', 'rgba(200,230,255,.5)');

    for (const p of app.data.projects) {
      if (p.core) continue;
      const pos = new THREE.Vector3(p.x, 0.035, p.y);
      const baseR = 0.075 + p.p * 0.012;
      const baseColor = new THREE.Color().setHSL(p.hue / 360, 0.9, 0.62);

      const starMat = new THREE.ShaderMaterial({
        uniforms: { uColor: { value: baseColor }, uTime: { value: 0 }, uDim: { value: 1 } },
        vertexShader: /* glsl */ `
          varying vec3 vN;
          varying vec3 vV;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vN = normalize(normalMatrix * normal);
            vV = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          uniform float uTime;
          uniform float uDim;
          varying vec3 vN;
          varying vec3 vV;
          void main() {
            vec3 n = normalize(vN);
            vec3 v = normalize(vV);
            float fres = pow(1.0 - max(dot(n, v), 0.0), 2.0);
            float band = 0.5 + 0.5 * sin(n.y * 14.0 + uTime * 0.7 + n.x * 9.0);
            vec3 c = mix(uColor, vec3(1.0), 0.35 + 0.45 * fres);
            c += uColor * fres * 1.5;
            c *= 0.86 + 0.14 * band;
            gl_FragColor = vec4(c * uDim, 1.0);
          }`,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      });
      const star = new THREE.Mesh(sphereGeo, starMat);
      star.position.copy(pos);
      star.scale.setScalar(baseR);
      refs.bodyGroup.add(star);

      const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: baseColor,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          depthTest: false,
          opacity: 0.38,
          toneMapped: false,
        }),
      );
      const glowBase = baseR * 10;
      glow.position.copy(pos);
      glow.scale.setScalar(glowBase);
      refs.bodyGroup.add(glow);

      const orbits = [];
      p.satellites.slice(0, 4).forEach((_, i) => {
        const orbit = new THREE.Group();
        orbit.position.copy(pos);
        orbit.rotation.x = 0.28 + i * 0.26;
        orbit.rotation.z = (i - 1) * 0.22;
        refs.bodyGroup.add(orbit);

        const radius = baseR * (2.6 + i * 0.78);
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(radius * 0.992, radius * 1.008, 96),
          new THREE.MeshBasicMaterial({
            color: baseColor,
            transparent: true,
            opacity: 0.17,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: false,
            toneMapped: false,
          }),
        );
        ring.rotation.x = -Math.PI / 2;
        orbit.add(ring);

        const pivot = new THREE.Group();
        orbit.add(pivot);

        const satColor = new THREE.Color().setHSL(((p.hue + 55 + i * 95) % 360) / 360, 0.85, 0.66);
        const satMat = new THREE.ShaderMaterial({
          uniforms: { uColor: { value: satColor } },
          vertexShader: /* glsl */ `
            varying vec3 vN;
            varying vec3 vV;
            void main() {
              vec4 mv = modelViewMatrix * vec4(position, 1.0);
              vN = normalize(normalMatrix * normal);
              vV = normalize(-mv.xyz);
              gl_Position = projectionMatrix * mv;
            }`,
          fragmentShader: /* glsl */ `
            uniform vec3 uColor;
            varying vec3 vN;
            varying vec3 vV;
            void main() {
              vec3 n = normalize(vN);
              float l = 0.45 + 0.55 * max(dot(n, normalize(vec3(-0.4, 0.8, 0.6))), 0.0);
              vec3 c = uColor * l;
              c += uColor * pow(1.0 - max(dot(n, normalize(vV)), 0.0), 2.0) * 0.8;
              gl_FragColor = vec4(c, 1.0);
            }`,
          depthTest: false,
          depthWrite: false,
          toneMapped: false,
        });
        const sat = new THREE.Mesh(satGeo, satMat);
        sat.scale.setScalar(0.03 + 0.01 * (i % 2) + p.p * 0.0016);
        sat.position.x = radius;
        pivot.add(sat);

        const satGlow = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: glowTex,
            color: satColor,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: false,
            opacity: 0.18,
            toneMapped: false,
          }),
        );
        satGlow.scale.setScalar(5);
        sat.add(satGlow);

        orbits.push({
          orbit,
          pivot,
          speed: (0.35 + i * 0.18) * (i % 2 ? -1 : 1),
          phase: Math.random() * Math.PI * 2,
        });
      });

      refs.projectBodies.push({ p, star, starMat, glow, glowBase, baseR, baseGlow: 0.38, orbits });
    }
  }

  function update(now) {
    if (!refs.bodyGroup) return;
    if (S.galaxyGroup) refs.bodyGroup.rotation.y = S.galaxyGroup.rotation.y;
    const t = now * 0.001;
    const tune = app.tune;

    for (const entry of refs.projectBodies) {
      const p = entry.p;
      const halo = tune[`planetHalo_${p.id}`] ?? 1;
      const stateAlpha =
        { run: 1, wait: 0.9, alert: 1, idle: 0.62, paused: 0.4, archived: 0.28 }[p.state] ?? 1;
      const focused = app.state.hovered === p.id || app.state.selected === p.id;

      entry.star.scale.setScalar(entry.baseR * tune.planetCore * (focused ? 1.12 : 1));
      entry.star.rotation.y = t * 0.12;
      entry.starMat.uniforms.uTime.value = t;
      entry.starMat.uniforms.uDim.value = stateAlpha;

      const pulse = 1 + 0.05 * Math.sin(t * 1.25 + entry.baseR * 30);
      entry.glow.scale.setScalar(entry.glowBase * halo * pulse);
      entry.glow.material.opacity =
        entry.baseGlow * tune.planetGlow * stateAlpha * (0.92 + 0.08 * Math.sin(t * 1.25 + entry.baseR * 30));

      for (const o of entry.orbits) {
        o.orbit.scale.setScalar(tune.orbitScale);
        o.pivot.rotation.y = t * o.speed + o.phase;
      }
    }
  }

  return { build, update };
}

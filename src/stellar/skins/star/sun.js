import * as THREE from 'three';
import { NOISE_GLSL, SURFACE_VERTEX_GLSL } from '../glsl.js';

/**
 * Sun skin: granulated plasma surface, a hot corona particle shell and
 * occasional expanding flares. Activity follows the project state, so a
 * running project visibly breathes and erupts more than a paused one.
 */
export function createSunStar({ radius, glowTexture }) {
  const group = new THREE.Group();

  const geometry = new THREE.SphereGeometry(1, 48, 32);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDim: { value: 1 },
      uActivity: { value: 1 },
    },
    vertexShader: SURFACE_VERTEX_GLSL,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uDim;
      uniform float uActivity;
      varying vec3 vN;
      varying vec3 vPos;
      varying vec3 vV;
      ${NOISE_GLSL}
      void main() {
        vec3 n = normalize(vN);
        vec3 v = normalize(vV);
        vec3 p = normalize(vPos);
        float t = uTime * 0.12;
        float warp = fbm3(p * 2.2 + vec3(0.0, t, 0.0));
        float base = fbm3(p * 3.8 + vec3(t * 0.5, 0.0, t * 0.35) + warp * 1.4);
        float detail = fbm3(p * 9.0 + vec3(t * 1.6, 0.0, -t * 0.9));
        float heat = smoothstep(0.38, 0.70, base * 0.55 + detail * 0.45);
        float veins = smoothstep(0.50, 0.62, fbm3(p * 15.0 + vec3(0.0, t * 2.2, 0.0)));

        vec3 dark = vec3(0.18, 0.022, 0.003);
        vec3 lava = vec3(0.82, 0.13, 0.008);
        vec3 hot = vec3(1.0, 0.52, 0.08);
        vec3 col = mix(dark, lava, heat);
        col = mix(col, hot, veins * 0.9);

        float spots = smoothstep(0.62, 0.84, fbm3(p * 3.6 + vec3(t * 0.25, 0.0, 0.0)));
        col *= mix(1.0, 0.62, spots * 0.7);

        float mu = max(dot(n, v), 0.0);
        col *= 0.52 + 0.58 * pow(mu, 0.5);
        float rim = pow(1.0 - mu, 2.8);
        col += vec3(1.0, 0.32, 0.04) * rim * (0.30 + 0.45 * uActivity);

        col = max(col, vec3(0.22, 0.03, 0.004));
        gl_FragColor = vec4(col * uDim * 0.7, 1.0);
      }`,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const surface = new THREE.Mesh(geometry, material);
  group.add(surface);

  // Hot particle shell.
  const count = 520;
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const sizes = new Float32Array(count);
  const dir = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    dir.randomDirection();
    const r = 1.12 + Math.random() * 0.34;
    positions[i * 3] = dir.x * r;
    positions[i * 3 + 1] = dir.y * r;
    positions[i * 3 + 2] = dir.z * r;
    seeds[i] = Math.random();
    sizes[i] = 0.5 + Math.random() * 0.8;
  }
  const coronaGeo = new THREE.BufferGeometry();
  coronaGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  coronaGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  coronaGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  const coronaMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uActivity: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      attribute float aSize;
      varying float vA;
      uniform float uTime;
      uniform float uActivity;
      void main() {
        vec3 p = position * (1.0 + 0.035 * sin(uTime * 1.2 + aSeed * 6.2831));
        vA = (0.45 + 0.55 * sin(uTime * 2.4 + aSeed * 12.0)) * (0.5 + 0.5 * uActivity);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = aSize * (2.0 + 2.5 * fract(aSeed * 7.13)) * (40.0 / max(0.1, -mv.z));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main() {
        vec2 d = gl_PointCoord - 0.5;
        float r = length(d);
        if (r > 0.5) discard;
        float a = smoothstep(0.5, 0.0, r);
        vec3 col = mix(vec3(1.0, 0.20, 0.02), vec3(1.0, 0.72, 0.28), a);
        gl_FragColor = vec4(col, a * vA * 0.5);
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const corona = new THREE.Points(coronaGeo, coronaMat);
  group.add(corona);

  // Flares: expanding additive sprites with staggered, activity-scaled cycles.
  const flares = [];
  const flareDirs = [];
  for (let i = 0; i < 4; i++) {
    const d = new THREE.Vector3().randomDirection();
    flareDirs.push(d);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: new THREE.Color().setHSL(0.055 + i * 0.012, 1.0, 0.62),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        opacity: 0,
        toneMapped: false,
      }),
    );
    group.add(sprite);
    flares.push({ sprite, phase: Math.random(), speed: 0.085 + i * 0.018 });
  }

  function update(t, { stateAlpha = 1, focused = false, halo = 1, glowStrength = 1, activity = 1 } = {}) {
    material.uniforms.uTime.value = t;
    material.uniforms.uDim.value = stateAlpha;
    material.uniforms.uActivity.value = activity;
    coronaMat.uniforms.uTime.value = t;
    coronaMat.uniforms.uActivity.value = activity;
    surface.rotation.y = t * 0.06;

    for (let i = 0; i < flares.length; i++) {
      const flare = flares[i];
      const cycle = (t * flare.speed * (0.55 + activity * 0.9) + flare.phase) % 1;
      const burst = Math.max(0, 1 - Math.abs(cycle - 0.14) * 7.0);
      const reach = 1.10 + burst * 1.55;
      flare.sprite.position.copy(flareDirs[i]).multiplyScalar(reach);
      flare.sprite.scale.setScalar((1.2 + burst * 3.4) * (0.9 + halo * 0.1));
      flare.sprite.material.opacity = burst * 0.62 * (0.35 + activity) * stateAlpha * glowStrength;
      flare.sprite.material.rotation += 0.002;
    }
  }

  function dispose() {
    geometry.dispose();
    material.dispose();
    coronaGeo.dispose();
    coronaMat.dispose();
    for (const flare of flares) flare.sprite.material.dispose();
  }

  return { object3D: group, update, dispose };
}

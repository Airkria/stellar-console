import * as THREE from 'three';
import { NOISE_GLSL, SURFACE_VERTEX_GLSL } from '../glsl.js';
import { createGlowShell } from './glow-shell.js';

/**
 * Sun skin: granulated plasma surface, a Fresnel light shell and a glow-cloud
 * particle shell. Activity follows the project state, so a running project
 * emits more particles than a paused one.
 */
export function createSunStar() {
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

  // Fresnel light shield: bright on the silhouette, transparent in the centre.
  const shell = createGlowShell({ color: new THREE.Color(0xff5a12) });
  group.add(shell.object3D);

  // Glow-cloud particle shell: particles are born at the surface with an
  // outward velocity, then drag pulls them back as they fade.
  const MAX_PARTICLES = 1400;
  const positions = new Float32Array(MAX_PARTICLES * 3);
  const seeds = new Float32Array(MAX_PARTICLES);
  const sizes = new Float32Array(MAX_PARTICLES);
  const dir = new THREE.Vector3();
  for (let i = 0; i < MAX_PARTICLES; i++) {
    dir.randomDirection();
    const r = 1.02 + Math.random() * 0.07;
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
  coronaGeo.setDrawRange(0, 520);
  const coronaMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uActivity: { value: 1 },
      uSpeed: { value: 1 },
      uDrag: { value: 1 },
      uSize: { value: 1 },
      uBrightness: { value: 1 },
    },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      attribute float aSize;
      varying float vA;
      uniform float uTime;
      uniform float uActivity;
      uniform float uSpeed;
      uniform float uDrag;
      uniform float uSize;
      uniform float uBrightness;
      void main() {
        float life = fract(uTime * 0.11 * (0.5 + aSeed) + aSeed * 6.2831);
        float v0 = uSpeed * (0.4 + 0.6 * fract(aSeed * 13.7));
        float travel = v0 * life * (1.0 - 0.35 * uDrag * life);
        vec3 p = position * (1.0 + max(0.0, travel) * 0.55);
        float fade = smoothstep(0.0, 0.12, life) * (1.0 - smoothstep(0.72, 1.0, life));
        vA = fade * uBrightness * (0.5 + 0.5 * uActivity) * (0.4 + 0.6 * fract(aSeed * 7.0));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = aSize * uSize * (2.0 + 2.5 * fract(aSeed * 7.13)) * (40.0 / max(0.1, -mv.z));
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
        gl_FragColor = vec4(col, a * vA * 0.6);
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const corona = new THREE.Points(coronaGeo, coronaMat);
  group.add(corona);

  function update(
    t,
    {
      stateAlpha = 1,
      halo = 1,
      glowStrength = 1,
      activity = 1,
      shellEnabled = true,
      shellThickness = 1,
      shellEdge = 1,
      shellInner = 0.35,
      particleCount = 520,
      particleSpeed = 1,
      particleDrag = 1,
      particleSize = 1,
      particleBrightness = 1,
    } = {},
  ) {
    material.uniforms.uTime.value = t;
    material.uniforms.uDim.value = stateAlpha;
    material.uniforms.uActivity.value = activity;
    coronaMat.uniforms.uTime.value = t;
    coronaMat.uniforms.uActivity.value = activity;
    coronaMat.uniforms.uSpeed.value = particleSpeed;
    coronaMat.uniforms.uDrag.value = particleDrag;
    coronaMat.uniforms.uSize.value = particleSize;
    coronaMat.uniforms.uBrightness.value = particleBrightness * glowStrength;
    const active = Math.max(0, Math.min(MAX_PARTICLES, Math.round(particleCount)));
    coronaGeo.setDrawRange(0, active);
    shell.update(t, {
      stateAlpha,
      enabled: shellEnabled,
      edge: shellEdge * halo,
      inner: shellInner * halo,
      thickness: shellThickness,
      glowStrength,
    });
    surface.rotation.y = t * 0.06;

  }

  function dispose() {
    geometry.dispose();
    material.dispose();
    coronaGeo.dispose();
    coronaMat.dispose();
    shell.dispose();
  }

  return { object3D: group, update, dispose };
}

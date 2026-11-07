import * as THREE from 'three';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { blackHoleShader } from './blackhole-shader.js';
import { makeFlowTexture, makeGlowTexture } from './textures.js';

/**
 * Full-screen Schwarzschild ray tracer + a fallback billboard for WebGL1.
 * The shader is applied after the galaxy render, so the event horizon really
 * occludes stars instead of being pasted on top.
 */
export function createBlackHole(app, S, refs) {
  function buildPass() {
    if (!S.renderer) return;
    if (!S.renderer.capabilities.isWebGL2) {
      buildFallback();
      return;
    }
    const params = new URLSearchParams(location.search);
    if (params.get('nohole') === '1') return;

    const uniforms = blackHoleShader.uniforms;
    uniforms.uCamPos.value = new THREE.Vector3();
    uniforms.uCamRight.value = new THREE.Vector3(1, 0, 0);
    uniforms.uCamUp.value = new THREE.Vector3(0, 1, 0);
    uniforms.uCamFwd.value = new THREE.Vector3(0, 0, -1);
    uniforms.uFlowMap.value = makeFlowTexture(256);
    uniforms.uFlowMap2.value = makeFlowTexture(256);
    uniforms.uResolution.value = new THREE.Vector2(S.VW, S.VH);

    refs.bhPass = new ShaderPass(blackHoleShader);
    if (params.get('quality') === 'low') refs.bhPass.material.uniforms.uStrength.value = 0.85;
  }

  // WebGL1 fallback: a stylised screen-space disk, not physically traced.
  function buildFallback() {
    const geo = new THREE.PlaneGeometry(3.2, 3.2);
    refs.fallbackMaterial = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        uniform float uTime;
        float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
        float noise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
        }
        float fbm(vec2 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
        void main() {
          vec2 p = vUv * 2.0 - 1.0;
          float r = length(p);
          float ang = atan(p.y, p.x);
          float shadow = 1.0 - smoothstep(0.28, 0.33, r);
          float ring = exp(-pow((r - 0.345) / 0.010, 2.0));
          float re = length(vec2(p.x, p.y / 0.24));
          float disk = smoothstep(1.10, 0.38, re) * smoothstep(0.33, 0.40, re);
          float wide = smoothstep(1.35, 0.30, re) * smoothstep(0.29, 0.38, re);
          float rim = exp(-pow((re - 0.385) / 0.018, 2.0));
          float litTop = length(vec2(p.x * 1.18, (p.y - 0.42) / 0.55));
          float top = exp(-pow((litTop - 0.45) / 0.045, 2.0)) * smoothstep(-0.06, 0.18, p.y);
          float litBot = length(vec2(p.x * 1.18, (p.y + 0.40) / 0.55));
          float bot = exp(-pow((litBot - 0.45) / 0.045, 2.0)) * smoothstep(-0.18, 0.06, -p.y);
          float n = fbm(vec2(ang * 5.0 + re * 9.0 - uTime * 0.25, re * 13.0 - uTime * 0.08));
          float n2 = fbm(vec2(ang * 9.0 - uTime * 0.12, re * 20.0));
          float doppler = 0.55 + 0.45 * smoothstep(-0.9, 0.9, -p.x);
          float diskA = (disk * 1.35 + wide * 0.55 + rim * 1.1 + top * 1.55 + bot * 0.95) * (0.30 + 0.70 * n) * (0.55 + 0.45 * n2) * doppler;
          float glow = exp(-pow(r * 1.8, 2.0)) * 0.09;
          float a = max(shadow, max(ring, diskA * 1.35));
          a *= 1.0 - smoothstep(0.95, 1.0, r);
          vec3 silver = vec3(0.82, 0.90, 1.0);
          vec3 col = silver * (ring + diskA * 1.1 + glow);
          col = mix(vec3(0.0), col, 1.0 - shadow);
          gl_FragColor = vec4(col, a);
        }`,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, refs.fallbackMaterial);
    mesh.renderOrder = 20;
    mesh.frustumCulled = false;
    S.scene.add(mesh);

    refs.fallbackGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeGlowTexture('rgba(236,246,255,1)', 'rgba(150,185,255,.55)'),
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        opacity: 0.12,
      }),
    );
    refs.fallbackGlow.scale.set(3.9, 3.9, 1);
    refs.fallbackGlow.renderOrder = 19;
    S.scene.add(refs.fallbackGlow);
  }

  const camRight = new THREE.Vector3();
  const camUp = new THREE.Vector3();
  const camFwd = new THREE.Vector3();

  function update(now) {
    const scale = Number(app.tune.bhScale) || 0.19;
    if (refs.fallbackMaterial) {
      if (app.state.motion && !app.state.backgroundPaused) refs.fallbackMaterial.uniforms.uTime.value = now * 0.001;
      return;
    }
    if (!refs.bhPass || !S.camera) return;
    const u = refs.bhPass.material.uniforms;
    S.camera.updateMatrixWorld();
    camRight.setFromMatrixColumn(S.camera.matrixWorld, 0);
    camUp.setFromMatrixColumn(S.camera.matrixWorld, 1);
    camFwd.setFromMatrixColumn(S.camera.matrixWorld, 2).negate();
    u.uCamPos.value.copy(S.camera.position).multiplyScalar(1 / scale);
    u.uCamRight.value.copy(camRight);
    u.uCamUp.value.copy(camUp);
    u.uCamFwd.value.copy(camFwd);
    u.uTanHalfFov.value = Math.tan(THREE.MathUtils.degToRad(S.camera.fov * 0.5));
    u.uAspect.value = S.camera.aspect;
    u.uResolution.value.set(S.VW * S.DPR, S.VH * S.DPR);
    if (app.state.motion && !app.state.backgroundPaused) u.uTime.value = now * 0.001;
  }

  // Projected event-horizon shadow, used for DOM planet occlusion.
  function screenInfo() {
    const shadow = 2.6 * (Number(app.tune.bhScale) || 0.19);
    const v = new THREE.Vector3(0, 0, 0).project(S.camera);
    const dist = S.camera.position.length();
    const rPx = (shadow * (S.VH * 0.5)) / (Math.tan(THREE.MathUtils.degToRad(S.camera.fov * 0.5)) * Math.max(0.001, dist));
    return {
      x: (v.x * 0.5 + 0.5) * S.VW,
      y: (-v.y * 0.5 + 0.5) * S.VH,
      r: rPx,
      dist,
      visible: v.z > -1 && v.z < 1,
    };
  }

  return { buildPass, update, screenInfo };
}

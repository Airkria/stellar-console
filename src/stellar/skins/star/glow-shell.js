import * as THREE from 'three';
import { NOISE_GLSL, SURFACE_VERTEX_GLSL } from '../glsl.js';

/**
 * Fresnel glow shell: a thin additive atmosphere that is bright on the
 * silhouette and nearly transparent in the centre. This is the "light shield"
 * layer shared by the classic and sun skins.
 */
export function createGlowShell({ color }) {
  const geometry = new THREE.SphereGeometry(1, 40, 28);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: color.clone() },
      uTime: { value: 0 },
      uDim: { value: 1 },
      uEdge: { value: 1 },
      uInner: { value: 1 },
    },
    vertexShader: SURFACE_VERTEX_GLSL,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uTime;
      uniform float uDim;
      uniform float uEdge;
      uniform float uInner;
      varying vec3 vN;
      varying vec3 vPos;
      varying vec3 vV;
      ${NOISE_GLSL}
      void main() {
        vec3 n = normalize(vN);
        vec3 v = normalize(vV);
        float mu = abs(dot(n, v));
        float rim = pow(1.0 - mu, 2.4);
        float cloud = fbm3(normalize(vPos) * 5.0 + vec3(0.0, uTime * 0.08, 0.0));
        float alpha = (rim * uEdge * (0.55 + 0.45 * cloud) + uInner * 0.10) * uDim;
        vec3 col = mix(uColor * 0.55, uColor, rim);
        gl_FragColor = vec4(col * (0.70 + 0.80 * rim), alpha * 0.55);
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    side: THREE.FrontSide,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(geometry, material);

  function update(t, { stateAlpha = 1, enabled = true, edge = 1, inner = 0.35, thickness = 1, glowStrength = 1 } = {}) {
    mesh.visible = enabled;
    material.uniforms.uTime.value = t;
    material.uniforms.uDim.value = stateAlpha * glowStrength;
    material.uniforms.uEdge.value = edge;
    material.uniforms.uInner.value = inner;
    mesh.scale.setScalar(1.02 + thickness * 0.22);
  }

  function dispose() {
    geometry.dispose();
    material.dispose();
  }

  return { object3D: mesh, update, dispose };
}
